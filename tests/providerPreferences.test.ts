import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { splitProvidersByPreference } from "../lib/providerPreferences";
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
