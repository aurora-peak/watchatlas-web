import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildDiscoverQuery,
  normalizePreferences,
  removeFavoriteService,
  resolveActiveCountry,
  toggleFavoriteService,
} from "../lib/preferences";

describe("normalizePreferences", () => {
  test("defaults favoriteServices to an empty array when absent", () => {
    const prefs = normalizePreferences({ favoriteCountries: ["US"], darkMode: true });

    assert.deepEqual(prefs.favoriteServices, []);
  });

  test("keeps well-formed services", () => {
    const prefs = normalizePreferences({
      favoriteServices: [{ id: 8, name: "Netflix", logoPath: "/n.jpg" }],
    });

    assert.deepEqual(prefs.favoriteServices, [{ id: 8, name: "Netflix", logoPath: "/n.jpg" }]);
  });

  test("drops malformed service entries rather than trusting stored data", () => {
    const prefs = normalizePreferences({
      favoriteServices: [
        { id: 8, name: "Netflix", logoPath: "/n.jpg" },
        { id: "not-a-number", name: "Bad", logoPath: "/b.jpg" },
        { name: "No ID", logoPath: "/x.jpg" },
        null,
      ],
    });

    assert.deepEqual(prefs.favoriteServices, [{ id: 8, name: "Netflix", logoPath: "/n.jpg" }]);
  });

  test("coerces a non-array favoriteServices to empty", () => {
    assert.deepEqual(normalizePreferences({ favoriteServices: "nope" }).favoriteServices, []);
  });

  test("preserves the existing country and darkMode defaults", () => {
    const prefs = normalizePreferences({});

    assert.deepEqual(prefs.favoriteCountries, []);
    assert.equal(prefs.darkMode, true);
  });

  test("tolerates a missing logoPath by defaulting it to empty string", () => {
    const prefs = normalizePreferences({ favoriteServices: [{ id: 8, name: "Netflix" }] });

    assert.deepEqual(prefs.favoriteServices, [{ id: 8, name: "Netflix", logoPath: "" }]);
  });

  test("rejects a non-finite id", () => {
    const prefs = normalizePreferences({
      favoriteServices: [{ id: NaN, name: "Broken", logoPath: "/b.jpg" }],
    });

    assert.deepEqual(prefs.favoriteServices, []);
  });
});

const NETFLIX = { id: 8, name: "Netflix", logoPath: "/n.jpg" };
const DISNEY = { id: 337, name: "Disney Plus", logoPath: "/d.jpg" };

describe("toggleFavoriteService", () => {
  test("adds a service that is not selected yet", () => {
    assert.deepEqual(toggleFavoriteService([], NETFLIX), [NETFLIX]);
  });

  test("removes a service that is already selected", () => {
    assert.deepEqual(toggleFavoriteService([NETFLIX, DISNEY], NETFLIX), [DISNEY]);
  });

  test("matches on id, so the same service under another country tab deselects", () => {
    const sameIdDifferentLogo = { id: 8, name: "Netflix", logoPath: "/gb-variant.jpg" };

    assert.deepEqual(toggleFavoriteService([NETFLIX], sameIdDifferentLogo), []);
  });

  test("does not mutate the input array", () => {
    const services = [NETFLIX];
    toggleFavoriteService(services, DISNEY);

    assert.deepEqual(services, [NETFLIX]);
  });
});

describe("removeFavoriteService", () => {
  test("drops the matching service", () => {
    assert.deepEqual(removeFavoriteService([NETFLIX, DISNEY], 8), [DISNEY]);
  });

  test("is a no-op for an unknown id", () => {
    assert.deepEqual(removeFavoriteService([NETFLIX], 999), [NETFLIX]);
  });
});

describe("resolveActiveCountry", () => {
  test("keeps the current country while it is still selected", () => {
    assert.equal(resolveActiveCountry(["US", "GB"], "GB"), "GB");
  });

  test("falls back to the first country when the current one was unchecked", () => {
    assert.equal(resolveActiveCountry(["US", "GB"], "FR"), "US");
  });

  test("picks the first country when there is no current one", () => {
    assert.equal(resolveActiveCountry(["US", "GB"], null), "US");
  });

  test("returns null when nothing is selected", () => {
    assert.equal(resolveActiveCountry([], "US"), null);
  });

  test("a newly added country is immediately selectable as a tab", () => {
    // The picker derives tabs from live local state, so a country checked a
    // moment ago must resolve without waiting for a save round trip.
    assert.equal(resolveActiveCountry(["US", "JP"], "JP"), "JP");
  });
});

const SIGNED_IN_USER = { uid: "user-123" };

describe("buildDiscoverQuery", () => {
  test("returns null when signed out, regardless of preferences", () => {
    assert.equal(
      buildDiscoverQuery(null, { favoriteCountries: ["US"], favoriteServices: [NETFLIX] }),
      null
    );
  });

  test("returns null when there are no favorite countries", () => {
    assert.equal(
      buildDiscoverQuery(SIGNED_IN_USER, { favoriteCountries: [], favoriteServices: [NETFLIX] }),
      null
    );
  });

  test("returns null when there are no favorite services", () => {
    assert.equal(
      buildDiscoverQuery(SIGNED_IN_USER, { favoriteCountries: ["US"], favoriteServices: [] }),
      null
    );
  });

  test("builds the discover path for the happy path", () => {
    const query = buildDiscoverQuery(SIGNED_IN_USER, {
      favoriteCountries: ["US", "GB"],
      favoriteServices: [NETFLIX, DISNEY],
    });

    assert.equal(query, "/api/tmdb/discover?regions=US%2CGB&providers=8%7C337");
  });

  test("encodes a country value containing an ampersand rather than letting it mangle the query string", () => {
    const query = buildDiscoverQuery(SIGNED_IN_USER, {
      favoriteCountries: ["US&evil=1"],
      favoriteServices: [NETFLIX],
    });

    assert.equal(query, "/api/tmdb/discover?regions=US%26evil%3D1&providers=8");
  });

  test("does not cap the region count client-side (the discover API caps server-side)", () => {
    const manyCountries = ["US", "GB", "CA", "AU", "DE", "FR"];
    const query = buildDiscoverQuery(SIGNED_IN_USER, {
      favoriteCountries: manyCountries,
      favoriteServices: [NETFLIX],
    });

    assert.equal(query, `/api/tmdb/discover?regions=${encodeURIComponent(manyCountries.join(","))}&providers=8`);
  });
});
