import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseProviderIds,
  mergeDiscoverResults,
  MAX_DISCOVER_RESULTS,
  type DiscoverItem,
} from "../lib/discoverMerge";

const movie = (id: number, popularity: number): DiscoverItem => ({
  id,
  media_type: "movie",
  title: `Movie ${id}`,
  poster_path: `/${id}.jpg`,
  popularity,
});

const show = (id: number, popularity: number): DiscoverItem => ({
  id,
  media_type: "tv",
  name: `Show ${id}`,
  poster_path: `/${id}.jpg`,
  popularity,
});

describe("parseProviderIds", () => {
  test("parses a pipe-separated list", () => {
    assert.deepEqual(parseProviderIds("8|337"), [8, 337]);
  });

  test("parses a single id", () => {
    assert.deepEqual(parseProviderIds("8"), [8]);
  });

  test("dedupes and preserves first-seen order", () => {
    assert.deepEqual(parseProviderIds("8|337|8"), [8, 337]);
  });

  test("rejects non-numeric, negative, and malformed input", () => {
    assert.equal(parseProviderIds("8|abc"), null);
    assert.equal(parseProviderIds("-8"), null);
    assert.equal(parseProviderIds("8.5"), null);
    assert.equal(parseProviderIds("8||337"), null);
  });

  test("rejects absent, empty, or non-string input", () => {
    assert.equal(parseProviderIds(undefined), null);
    assert.equal(parseProviderIds(""), null);
    assert.equal(parseProviderIds(["8"]), null);
  });
});

describe("mergeDiscoverResults", () => {
  test("dedupes by media type and id across pages", () => {
    const merged = mergeDiscoverResults([[movie(1, 50)], [movie(1, 50), movie(2, 10)]]);

    assert.deepEqual(merged.map((item) => item.id), [1, 2]);
  });

  test("treats the same id in different media types as different titles", () => {
    const merged = mergeDiscoverResults([[movie(1, 10), show(1, 20)]]);

    assert.equal(merged.length, 2);
  });

  test("sorts by popularity descending", () => {
    const merged = mergeDiscoverResults([[movie(1, 5), movie(2, 90), movie(3, 40)]]);

    assert.deepEqual(merged.map((item) => item.id), [2, 3, 1]);
  });

  test("treats a missing popularity as zero rather than dropping the item", () => {
    const noPopularity = { id: 4, media_type: "movie" as const, title: "X", poster_path: null };
    const merged = mergeDiscoverResults([[noPopularity, movie(1, 10)]]);

    assert.deepEqual(merged.map((item) => item.id), [1, 4]);
  });

  test("caps the result at MAX_DISCOVER_RESULTS", () => {
    const many = Array.from({ length: 40 }, (_, i) => movie(i, i));
    const merged = mergeDiscoverResults([many]);

    assert.equal(merged.length, MAX_DISCOVER_RESULTS);
    // Highest popularity first, so the cap keeps the most popular.
    assert.equal(merged[0].id, 39);
  });

  test("tolerates empty pages from failed upstream calls", () => {
    const merged = mergeDiscoverResults([[], [movie(1, 10)], []]);

    assert.deepEqual(merged.map((item) => item.id), [1]);
  });

  test("returns an empty array when every page is empty", () => {
    assert.deepEqual(mergeDiscoverResults([[], []]), []);
  });
});
