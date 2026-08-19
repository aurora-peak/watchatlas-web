// Pure logic behind GET /api/tmdb/discover.

export type DiscoverItem = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
};

/** TMDB is queried once per region per media type, so this bounds the fan-out at 10 calls. */
export const MAX_DISCOVER_REGIONS = 5;

/** Keeps the public discover route's provider fan-out and cache-key surface bounded. */
export const MAX_DISCOVER_PROVIDERS = 50;

export const MAX_DISCOVER_RESULTS = 20;

const POSITIVE_INT = /^\d+$/;

/**
 * Parses the `providers` query param, which is pipe-separated to match the
 * format TMDB's `with_watch_providers` expects. Returns null when malformed.
 */
export function parseProviderIds(raw: unknown): number[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  const parts = raw.split("|").map((part) => part.trim());

  if (parts.some((part) => !POSITIVE_INT.test(part))) return null;

  const ids = parts.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) return null;

  const canonical = [...new Set(ids)].sort((a, b) => a - b);
  if (canonical.length > MAX_DISCOVER_PROVIDERS) return null;

  return canonical;
}

/**
 * Merges one results page per region per media type into a single ranked list.
 * Pages from failed calls arrive empty, so a partial outage degrades the list
 * rather than failing the request.
 *
 * INVARIANT: cross-page duplicates are resolved first-seen-wins, keeping one
 * page's copy of the item wholesale. That is only correct while every page is
 * fetched with request params that cannot change an item's own field values —
 * today `pages/api/tmdb/discover.ts` varies only `watch_region` and the media
 * type, both of which change *which* items come back, not what each one says.
 *
 * Adding TMDB's `region` or `language` params to those calls would break this:
 * `region` changes `release_date` per page and `language` changes `title` /
 * `name` / `overview`, so first-seen-wins would silently pin whichever region
 * or locale happened to be fetched first. If either param is ever added, this
 * function must merge fields deterministically instead of keeping the first
 * copy. Nothing enforces the invariant mechanically — it lives here and in the
 * discover route.
 */
export function mergeDiscoverResults(pages: DiscoverItem[][]): DiscoverItem[] {
  const byKey = new Map<string, DiscoverItem>();

  for (const page of pages) {
    for (const item of page) {
      const key = `${item.media_type}:${item.id}`;
      if (!byKey.has(key)) byKey.set(key, item);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, MAX_DISCOVER_RESULTS);
}
