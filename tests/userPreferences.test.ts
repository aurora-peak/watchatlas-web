import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildDiscoverQuery,
  normalizePreferences,
  removeFavoriteService,
  resolveActiveCountry,
  resolveHydrationAction,
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

  test("coerces a non-array favoriteCountries to empty", () => {
    assert.deepEqual(normalizePreferences({ favoriteCountries: "US" }).favoriteCountries, []);
    assert.deepEqual(normalizePreferences({ favoriteCountries: null }).favoriteCountries, []);
  });

  test("drops non-string entries from favoriteCountries", () => {
    const prefs = normalizePreferences({
      favoriteCountries: ["US", 42, null, undefined, { code: "GB" }, ["FR"], "JP"],
    });

    assert.deepEqual(prefs.favoriteCountries, ["US", "JP"]);
  });

  test("keeps every entry when favoriteCountries is already all strings", () => {
    const prefs = normalizePreferences({ favoriteCountries: ["US", "GB", ""] });

    assert.deepEqual(prefs.favoriteCountries, ["US", "GB", ""]);
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

describe("resolveHydrationAction", () => {
  const base = {
    userUid: "user-a" as string | null,
    preferencesUid: "user-a" as string | null,
    hasPreferences: true,
    hydratedForUid: undefined as string | null | undefined,
  };

  test("hydrates when the preferences belong to the signed-in user", () => {
    assert.equal(resolveHydrationAction(base), "hydrate");
  });

  test("skips once hydrated, so in-progress edits survive a preferences refresh", () => {
    assert.equal(
      resolveHydrationAction({ ...base, hydratedForUid: "user-a" }),
      "skip"
    );
  });

  // The data-loss case: AuthContext publishes `user` before awaiting the
  // preference load, so one render pairs a signed-in uid with the signed-out
  // preferences object the theme toggle left behind. Hydrating there would
  // latch empty arrays and Save would write them back to Firestore.
  test("refuses to hydrate a signed-in user from signed-out preferences", () => {
    assert.equal(
      resolveHydrationAction({ ...base, preferencesUid: null }),
      "reset"
    );
  });

  // The cross-user case: switching accounts must never let user A's stored
  // selections be written into user B's document.
  test("refuses to hydrate one user from another user's preferences", () => {
    assert.equal(
      resolveHydrationAction({ ...base, userUid: "user-b", preferencesUid: "user-a" }),
      "reset"
    );
  });

  test("resets when there are no preferences to hydrate from", () => {
    assert.equal(
      resolveHydrationAction({ ...base, hasPreferences: false }),
      "reset"
    );
  });

  test("re-hydrates after signing out and back in as the same user", () => {
    // Sign-out clears preferences, which resets the latch...
    assert.equal(
      resolveHydrationAction({
        ...base,
        userUid: null,
        preferencesUid: null,
        hasPreferences: false,
        hydratedForUid: "user-a",
      }),
      "reset"
    );
    // ...so the next matching preferences object hydrates again.
    assert.equal(
      resolveHydrationAction({ ...base, hydratedForUid: undefined }),
      "hydrate"
    );
  });

  test("hydrates signed-out preferences while genuinely signed out", () => {
    assert.equal(
      resolveHydrationAction({
        ...base,
        userUid: null,
        preferencesUid: null,
      }),
      "hydrate"
    );
  });
});
