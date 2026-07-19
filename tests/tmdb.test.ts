import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getPosterUrl } from "../lib/tmdb";

describe("getPosterUrl", () => {
  test("builds a TMDB image URL at the default size", () => {
    assert.equal(getPosterUrl("/abc123.jpg"), "https://image.tmdb.org/t/p/w500/abc123.jpg");
  });

  test("honors an explicit size", () => {
    assert.equal(getPosterUrl("/abc123.jpg", "original"), "https://image.tmdb.org/t/p/original/abc123.jpg");
  });

  test("falls back to the local placeholder when a title has no poster", () => {
    // NOTE: public/placeholder.png does not exist yet — see ARCHITECTURE.md
    // "Known drift" item 7. This test pins the contract; the asset is the fix.
    assert.equal(getPosterUrl(null), "/placeholder.png");
  });

  test("treats an empty path as no poster rather than building a broken URL", () => {
    assert.equal(getPosterUrl(""), "/placeholder.png");
  });
});
