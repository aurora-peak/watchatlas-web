import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizePreferences } from "../lib/firestore";

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
});
