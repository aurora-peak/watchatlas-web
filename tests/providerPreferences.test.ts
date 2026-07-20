import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  splitProvidersByPreference,
  buildProviderDisplayTiers,
  collectStreamingProviders,
} from "../lib/providerPreferences";
import type { FavoriteService } from "../lib/firestore";

const provider = (id: number, name: string) => ({
  provider_id: id,
  provider_name: name,
  logo_path: `/${id}.jpg`,
});

const netflix = provider(8, "Netflix");
const prime = provider(9, "Prime Video");
const disney = provider(337, "Disney Plus");

const services: FavoriteService[] = [
  { id: 8, name: "Netflix", logoPath: "/8.jpg" },
  { id: 337, name: "Disney Plus", logoPath: "/337.jpg" },
];

describe("collectStreamingProviders", () => {
  const tubi = provider(73, "Tubi");
  const pluto = provider(300, "Pluto TV");

  test("combines flatrate, free and ads into one list", () => {
    const result = collectStreamingProviders({
      flatrate: [netflix],
      free: [tubi],
      ads: [pluto],
    });

    assert.deepEqual(result.map((p) => p.provider_id), [8, 73, 300]);
  });

  test("surfaces free-only availability, which flatrate alone would hide", () => {
    const result = collectStreamingProviders({ free: [tubi] });

    assert.deepEqual(result.map((p) => p.provider_name), ["Tubi"]);
  });

  test("surfaces ads-only availability", () => {
    const result = collectStreamingProviders({ ads: [pluto] });

    assert.deepEqual(result.map((p) => p.provider_name), ["Pluto TV"]);
  });

  test("dedupes a provider listed in more than one tier", () => {
    const result = collectStreamingProviders({
      flatrate: [netflix, tubi],
      free: [tubi],
      ads: [tubi, pluto],
    });

    assert.deepEqual(result.map((p) => p.provider_id), [8, 73, 300]);
  });

  test("resolves duplicate records identically regardless of which tier is listed first", () => {
    const withLogo = { provider_id: 73, provider_name: "Tubi", logo_path: "/73.jpg" };
    const withoutLogo = { provider_id: 73, provider_name: "Tubi", logo_path: null };

    const freeFirst = collectStreamingProviders({ free: [withoutLogo], ads: [withLogo] });
    const adsFirst = collectStreamingProviders({ flatrate: [withLogo], free: [withoutLogo] });

    assert.deepEqual(freeFirst, [withLogo]);
    assert.deepEqual(adsFirst, [withLogo]);
  });

  test("resolves conflicting names deterministically, not by encounter order", () => {
    const a = { provider_id: 73, provider_name: "Tubi", logo_path: "/a.jpg" };
    const b = { provider_id: 73, provider_name: "Tubi TV", logo_path: "/b.jpg" };

    assert.deepEqual(collectStreamingProviders({ flatrate: [a], free: [b] }), [a]);
    assert.deepEqual(collectStreamingProviders({ flatrate: [b], free: [a] }), [a]);
  });

  test("stays symmetric across the falsy logo_path spellings — null, undefined and empty string", () => {
    // logo_path is typed string | null, but a payload missing the key yields
    // undefined and "" is a third spelling of "no logo". All three are equally
    // logo-less, so swapping the tiers must not change the rendered record.
    const spellings = [
      { provider_id: 73, provider_name: "Tubi", logo_path: null },
      { provider_id: 73, provider_name: "Tubi", logo_path: undefined },
      { provider_id: 73, provider_name: "Tubi", logo_path: "" },
    ] as unknown as { provider_id: number; provider_name: string; logo_path: string | null }[];

    for (const a of spellings) {
      for (const b of spellings) {
        const forward = collectStreamingProviders({ flatrate: [a], free: [b] });
        const reversed = collectStreamingProviders({ flatrate: [b], free: [a] });

        assert.equal(forward.length, 1);
        assert.equal(reversed.length, 1);
        assert.equal(forward[0].provider_name, reversed[0].provider_name);
        assert.equal(forward[0].logo_path ?? "", reversed[0].logo_path ?? "");
      }
    }
  });

  test("ignores missing, null and non-array tiers", () => {
    assert.deepEqual(collectStreamingProviders(null), []);
    assert.deepEqual(collectStreamingProviders(undefined), []);
    assert.deepEqual(collectStreamingProviders({}), []);
    assert.deepEqual(collectStreamingProviders({ flatrate: null, free: undefined }), []);
  });

  test("ignores rent and buy — purchase tiers never enter the preference split", () => {
    // A raw TMDB country entry carries rent/buy alongside the streaming tiers.
    // They are not part of CountryStreamingProviders and must not leak into the
    // list that gets split into "Your services".
    const rawCountryEntry = {
      flatrate: [netflix],
      rent: [prime],
      buy: [disney],
    };

    const result = collectStreamingProviders(rawCountryEntry);

    assert.deepEqual(result.map((p) => p.provider_id), [8]);
  });
});

describe("splitProvidersByPreference", () => {
  test("splits into the user's services and everything else", () => {
    const { preferred, others } = splitProvidersByPreference([prime, netflix, disney], services);

    assert.deepEqual(preferred.map((p) => p.provider_id), [8, 337]);
    assert.deepEqual(others.map((p) => p.provider_id), [9]);
  });

  test("preserves the original ordering inside each tier", () => {
    const { preferred } = splitProvidersByPreference([disney, netflix], services);

    assert.deepEqual(preferred.map((p) => p.provider_id), [337, 8]);
  });

  test("puts everything in others when the user has no services", () => {
    const { preferred, others } = splitProvidersByPreference([netflix, prime], []);

    assert.deepEqual(preferred, []);
    assert.deepEqual(others.map((p) => p.provider_id), [8, 9]);
  });

  test("leaves the preferred tier empty when none of the user's services are present", () => {
    const { preferred, others } = splitProvidersByPreference([prime], services);

    assert.deepEqual(preferred, []);
    assert.deepEqual(others.map((p) => p.provider_id), [9]);
  });

  test("leaves the others tier empty when every provider is one of the user's", () => {
    const { preferred, others } = splitProvidersByPreference([netflix, disney], services);

    assert.deepEqual(preferred.map((p) => p.provider_id), [8, 337]);
    assert.deepEqual(others, []);
  });

  test("handles an empty provider list", () => {
    const { preferred, others } = splitProvidersByPreference([], services);

    assert.deepEqual(preferred, []);
    assert.deepEqual(others, []);
  });

  test("never drops a provider — the two tiers always account for all of them", () => {
    const all = [netflix, prime, disney];
    const { preferred, others } = splitProvidersByPreference(all, services);

    assert.equal(preferred.length + others.length, all.length);
  });
});

describe("buildProviderDisplayTiers", () => {
  test("renders a single flat 'Stream' tier when the user has no matching services", () => {
    const tiers = buildProviderDisplayTiers([], [netflix, prime]);

    assert.deepEqual(tiers, [{ label: "Stream", preferred: false, items: [netflix, prime] }]);
  });

  test("renders a single flat 'Stream' tier when signed out (preferred always empty)", () => {
    const tiers = buildProviderDisplayTiers([], [netflix]);

    assert.equal(tiers.length, 1);
    assert.equal(tiers[0].label, "Stream");
    assert.equal(tiers[0].preferred, false);
  });

  test("keeps the 'Your services' heading — not relabeled — when every provider is the user's", () => {
    const tiers = buildProviderDisplayTiers([netflix, disney], []);

    assert.deepEqual(tiers, [{ label: "Your services", preferred: true, items: [netflix, disney] }]);
  });

  test("renders both tiers, preferred first, when the split has both", () => {
    const tiers = buildProviderDisplayTiers([netflix], [prime]);

    assert.deepEqual(tiers, [
      { label: "Your services", preferred: true, items: [netflix] },
      { label: "Also available on", preferred: false, items: [prime] },
    ]);
  });

  // The `preferred` flag is what the detail page branches on for the accent
  // ring. Asserting it independently of the copy is the point: renaming a
  // label must not be able to silently drop the highlight.
  test("marks exactly the user's-services tier as preferred, whatever the copy says", () => {
    for (const tiers of [
      buildProviderDisplayTiers([], [prime]),
      buildProviderDisplayTiers([netflix], []),
      buildProviderDisplayTiers([netflix], [prime]),
    ]) {
      for (const tier of tiers) {
        assert.equal(tier.preferred, tier.items.some((p) => p.provider_id === 8));
      }
    }
  });

  test("never introduces an empty tier", () => {
    for (const tier of buildProviderDisplayTiers([netflix], [])) {
      assert.ok(tier.items.length > 0);
    }
    for (const tier of buildProviderDisplayTiers([], [prime])) {
      assert.ok(tier.items.length > 0);
    }
  });
});
