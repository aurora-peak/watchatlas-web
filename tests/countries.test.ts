import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getCountryList, getCountryMeta } from "../lib/countries";
import { countryContinents } from "../lib/countryContinents";

describe("country list", () => {
  test("every entry has a code, name, and flag", () => {
    for (const country of getCountryList()) {
      assert.ok(country.code, `missing code: ${JSON.stringify(country)}`);
      assert.ok(country.name, `missing name for ${country.code}`);
      assert.ok(country.flag, `missing flag for ${country.code}`);
    }
  });

  test("codes are unique ISO-3166-1 alpha-2", () => {
    const codes = getCountryList().map((c) => c.code);

    assert.equal(new Set(codes).size, codes.length, "duplicate country codes");
    for (const code of codes) {
      assert.match(code, /^[A-Z]{2}$/, `not alpha-2: ${code}`);
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

describe("continent mapping", () => {
  test("maps a sample of countries to their expected continent", () => {
    assert.equal(countryContinents["US"], "North America");
    assert.equal(countryContinents["BR"], "South America");
    assert.equal(countryContinents["AU"], "Oceania");
    assert.equal(countryContinents["AO"], "Africa");
  });

  test("keys are alpha-2 and values are non-empty", () => {
    for (const [code, continent] of Object.entries(countryContinents)) {
      assert.match(code, /^[A-Z]{2}$/, `not alpha-2: ${code}`);
      assert.ok(continent, `empty continent for ${code}`);
    }
  });

  test("every country in the list has a continent, so none are dropped from grouping", () => {
    const missing = getCountryList()
      .map((c) => c.code)
      .filter((code) => !countryContinents[code]);

    assert.deepEqual(missing, [], `countries with no continent mapping: ${missing.join(", ")}`);
  });
});
