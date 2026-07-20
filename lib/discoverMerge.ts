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
  if (ids.some((id) => !Number.isSafeInteger(id))) return null;

  return [...new Set(ids)];
}

/**
 * Merges one results page per region per media type into a single ranked list.
 * Pages from failed calls arrive empty, so a partial outage degrades the list
 * rather than failing the request.
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
