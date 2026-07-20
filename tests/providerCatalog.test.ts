import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseRegions, mergeProviderCatalog } from "../lib/providerCatalog";

describe("parseRegions", () => {
  test("parses a comma-separated list and uppercases it", () => {
    assert.deepEqual(parseRegions("us,gb"), ["US", "GB"]);
  });

  test("trims whitespace and drops empty entries", () => {
    assert.deepEqual(parseRegions(" US , , GB "), ["US", "GB"]);
  });

  test("dedupes repeated regions", () => {
    assert.deepEqual(parseRegions("US,US,GB"), ["US", "GB"]);
  });

  test("rejects anything that is not alpha-2 shaped", () => {
    assert.equal(parseRegions("USA"), null);
    assert.equal(parseRegions("U1"), null);
    assert.equal(parseRegions("US,XYZ"), null);
  });

  test("rejects absent, empty, or non-string input", () => {
    assert.equal(parseRegions(undefined), null);
    assert.equal(parseRegions(""), null);
    assert.equal(parseRegions([]), null);
    assert.equal(parseRegions(42), null);
  });
});

describe("mergeProviderCatalog", () => {
  const netflix = {
    provider_id: 8,
    provider_name: "Netflix",
    logo_path: "/netflix.jpg",
    display_priority: 5,
    display_priorities: { US: 5, GB: 3 },
  };
  const hulu = {
    provider_id: 15,
    provider_name: "Hulu",
    logo_path: "/hulu.jpg",
    display_priority: 12,
    display_priorities: { US: 12 },
  };
  const nowTv = {
    provider_id: 39,
    provider_name: "Now TV",
    logo_path: "/now.jpg",
    display_priority: 2,
    display_priorities: { GB: 2 },
  };

  test("merges movie and TV responses, deduping by provider id", () => {
    const merged = mergeProviderCatalog([{ results: [netflix] }, { results: [netflix, hulu] }], ["US"]);

    assert.deepEqual(merged.map((p) => p.id), [8, 15]);
  });

  test("keeps only providers available in at least one requested region", () => {
    const merged = mergeProviderCatalog([{ results: [netflix, hulu, nowTv] }], ["GB"]);

    assert.deepEqual(merged.map((p) => p.id).sort((a, b) => a - b), [8, 39]);
  });

  test("reports each provider's availability across the requested regions only", () => {
    const merged = mergeProviderCatalog([{ results: [netflix] }], ["US", "GB", "DE"]);

    assert.deepEqual(merged[0].regions.sort(), ["GB", "US"]);
  });

  test("sorts by display priority ascending", () => {
    const merged = mergeProviderCatalog([{ results: [hulu, netflix, nowTv] }], ["US", "GB"]);

    assert.deepEqual(merged.map((p) => p.id), [39, 8, 15]);
  });

  test("maps logo_path to logoPath and null to an empty string", () => {
    const noLogo = { ...hulu, logo_path: null };
    const merged = mergeProviderCatalog([{ results: [noLogo] }], ["US"]);

    assert.equal(merged[0].logoPath, "");
  });

  test("tolerates a failed upstream call represented as an empty response", () => {
    const merged = mergeProviderCatalog([{ results: [netflix] }, {}], ["US"]);

    assert.deepEqual(merged.map((p) => p.id), [8]);
  });

  test("returns an empty list when nothing matches the requested regions", () => {
    assert.deepEqual(mergeProviderCatalog([{ results: [hulu] }], ["JP"]), []);
  });

  test("falls back to display_priority when display_priorities is absent", () => {
    // Some providers omit the per-region map; they are treated as available in
    // every requested region rather than silently dropped.
    const legacy = { provider_id: 99, provider_name: "Legacy", logo_path: "/l.jpg", display_priority: 1 };
    const merged = mergeProviderCatalog([{ results: [legacy] }], ["US"]);

    assert.deepEqual(merged[0].regions, ["US"]);
    assert.equal(merged[0].displayPriority, 1);
  });

  test("takes the best priority across catalogues, regardless of their order", () => {
    // TMDB ranks the same provider independently for movies and TV.
    const movieNetflix = { ...netflix, display_priorities: { US: 50 } };
    const tvNetflix = { ...netflix, display_priorities: { US: 5, GB: 3 } };

    const movieFirst = mergeProviderCatalog(
      [{ results: [movieNetflix] }, { results: [tvNetflix] }],
      ["US", "GB"]
    );
    const tvFirst = mergeProviderCatalog(
      [{ results: [tvNetflix] }, { results: [movieNetflix] }],
      ["US", "GB"]
    );

    assert.equal(movieFirst[0].displayPriority, 3);
    assert.equal(tvFirst[0].displayPriority, 3);
    assert.deepEqual(movieFirst[0].regions.sort(), ["GB", "US"]);
    assert.deepEqual(tvFirst[0].regions.sort(), ["GB", "US"]);
  });
});
