import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getCountryList, getCountryMeta } from "../lib/countries";

describe("country list", () => {
  test("every entry has a code, name, and flag", () => {
    for (const country of getCountryList()) {
      assert.ok(country.code, `missing code: ${JSON.stringify(country)}`);
      assert.ok(country.name, `missing name for ${country.code}`);
      assert.ok(country.flag, `missing flag for ${country.code}`);
    }
  });

  test("codes are unique and alpha-2 shaped", () => {
    // Shape only — this does not verify membership in the ISO-3166-1 registry.
    const codes = getCountryList().map((c) => c.code);

    assert.equal(new Set(codes).size, codes.length, "duplicate country codes");
    for (const code of codes) {
      assert.match(code, /^[A-Z]{2}$/, `not alpha-2 shaped: ${code}`);
    }
  });

  test("getCountryMeta finds a known country", () => {
    const us = getCountryMeta("US");

    assert.ok(us);
    assert.equal(us.code, "US");
    assert.ok(us.name.length > 0);
  });

  test("getCountryMeta returns undefined for an unknown code", () => {
    assert.equal(getCountryMeta("ZZ"), undefined);
    assert.equal(getCountryMeta(""), undefined);
  });

  test("lookup is case-sensitive on purpose — TMDB sends uppercase", () => {
    // Documents current behavior so a future change to case-insensitivity is deliberate.
    assert.equal(getCountryMeta("us"), undefined);
  });
});

// Continent grouping reads the `continent` field on each country in
// full_country_list_with_flags.json — see pages/settings.tsx:41 and
// pages/details/[id].tsx:91. lib/countryContinents.ts looks like it serves this
// purpose but is imported by nothing; these tests deliberately target the field
// the app actually renders from.
describe("continent grouping data", () => {
  test("maps a sample of countries to their expected continent", () => {
    const continentOf = (code: string) => getCountryMeta(code)?.continent;

    assert.equal(continentOf("US"), "North America");
    assert.equal(continentOf("BR"), "South America");
    assert.equal(continentOf("AU"), "Oceania");
    assert.equal(continentOf("AO"), "Africa");
    assert.equal(continentOf("DE"), "Europe");
    assert.equal(continentOf("JP"), "Asia");
  });

  test("every country carries a non-empty continent, so none are dropped from grouping", () => {
    const missing = getCountryList().filter((c) => !c.continent);

    assert.deepEqual(missing, [], `countries with no continent: ${missing.map((c) => c.code).join(", ")}`);
  });

  test("KNOWN BUG: 42 countries are grouped under the literal header 'Undefined'", () => {
    // settings.tsx renders the continent string straight into a section heading,
    // so these show the user a group titled "Undefined". Pinned here so the count
    // cannot silently grow; delete this test when the data is corrected.
    const undefinedContinent = getCountryList().filter((c) => c.continent === "Undefined");

    assert.equal(undefinedContinent.length, 42);
  });

  test("aside from the known bug, continents come from a small closed set", () => {
    const expected = new Set([
      "Africa",
      "Antarctica",
      "Asia",
      "Europe",
      "North America",
      "Oceania",
      "South America",
      "Undefined", // the known bug above
    ]);

    const unexpected = [...new Set(getCountryList().map((c) => c.continent))].filter((c) => !expected.has(c));

    assert.deepEqual(unexpected, [], `unexpected continent values: ${unexpected.join(", ")}`);
  });
});
