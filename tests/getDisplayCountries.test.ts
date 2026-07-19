import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getDisplayCountries } from "../lib/getDisplayCountries";

// The where-to-watch view is built on this function: it decides which countries
// appear on a title's detail page, given TMDB's provider payload and the user's
// saved favorites.

describe("getDisplayCountries", () => {
  test("keeps only countries that have at least one provider", () => {
    const providers = {
      US: { flatrate: [{ provider_id: 8 }] },
      GB: { rent: [{ provider_id: 10 }] },
      DE: { buy: [{ provider_id: 3 }] },
      FR: {},
    };

    assert.deepEqual(getDisplayCountries(providers).sort(), ["DE", "GB", "US"]);
  });

  test("treats a present-but-empty provider list as no availability", () => {
    const providers = {
      US: { flatrate: [], rent: [], buy: [] },
      GB: { flatrate: [{ provider_id: 8 }] },
    };

    assert.deepEqual(getDisplayCountries(providers), ["GB"]);
  });

  test("returns every available country when the user has no favorites", () => {
    const providers = {
      US: { flatrate: [{ provider_id: 8 }] },
      IN: { flatrate: [{ provider_id: 119 }] },
    };

    // Signed out, undefined favorites, and an empty list must all behave alike.
    assert.deepEqual(getDisplayCountries(providers).sort(), ["IN", "US"]);
    assert.deepEqual(getDisplayCountries(providers, undefined).sort(), ["IN", "US"]);
    assert.deepEqual(getDisplayCountries(providers, []).sort(), ["IN", "US"]);
  });

  test("narrows to the user's favorites when they have some", () => {
    const providers = {
      US: { flatrate: [{ provider_id: 8 }] },
      GB: { flatrate: [{ provider_id: 9 }] },
      IN: { flatrate: [{ provider_id: 119 }] },
    };

    assert.deepEqual(getDisplayCountries(providers, ["US", "IN"]).sort(), ["IN", "US"]);
  });

  test("ignores favorites the title is not available in", () => {
    const providers = { US: { flatrate: [{ provider_id: 8 }] } };

    // JP is a favorite but has no availability, so it must not be offered.
    assert.deepEqual(getDisplayCountries(providers, ["US", "JP"]), ["US"]);
  });

  test("returns nothing when no favorite has availability", () => {
    const providers = { US: { flatrate: [{ provider_id: 8 }] } };

    assert.deepEqual(getDisplayCountries(providers, ["JP", "KR"]), []);
  });

  test("handles an empty provider payload", () => {
    assert.deepEqual(getDisplayCountries({}), []);
    assert.deepEqual(getDisplayCountries({}, ["US"]), []);
  });
});
