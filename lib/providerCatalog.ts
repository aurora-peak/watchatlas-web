// Pure logic behind GET /api/tmdb/providers-list. Kept free of Next.js and
// network concerns so it can be unit-tested directly.

export type CatalogProvider = {
  id: number;
  name: string;
  logoPath: string;
  displayPriority: number;
  regions: string[];
};

export type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
  display_priorities?: Record<string, number>;
};

export type TmdbProviderResponse = {
  results?: TmdbProvider[];
};

const ALPHA_2 = /^[A-Za-z]{2}$/;

/**
 * Parses the `regions` query param. Returns null for anything malformed so the
 * route can answer 400 rather than silently querying the wrong regions.
 */
export function parseRegions(raw: unknown): string[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

  if (parts.length === 0) return null;
  if (!parts.every((part) => ALPHA_2.test(part))) return null;

  return [...new Set(parts.map((part) => part.toUpperCase()))];
}

/**
 * Merges the movie and TV provider catalogs into one deduped list, keeping only
 * providers offered in at least one requested region.
 */
export function mergeProviderCatalog(
  responses: TmdbProviderResponse[],
  regions: string[]
): CatalogProvider[] {
  const byId = new Map<number, CatalogProvider>();

  for (const response of responses) {
    for (const provider of response.results ?? []) {
      const available = regionsFor(provider, regions);
      if (available.length === 0) continue;

      const existing = byId.get(provider.provider_id);
      if (existing) {
        // The same provider appears in both the movie and TV catalogues; union
        // their regions and take the best priority across both, so `regions`
        // and `displayPriority` do not depend on which catalogue was processed
        // first. `name` and `logoPath` are NOT merged — they keep the values
        // from whichever catalogue was seen first, so a provider whose
        // `logo_path` is null in one response and populated in the other still
        // renders order-dependently. Tracked separately; `pickCanonical` in
        // lib/providerPreferences.ts is the order-independent rule to follow
        // when fixing it.
        existing.regions = [...new Set([...existing.regions, ...available])];
        existing.displayPriority = Math.min(existing.displayPriority, priorityFor(provider, available));
        continue;
      }

      byId.set(provider.provider_id, {
        id: provider.provider_id,
        name: provider.provider_name,
        logoPath: provider.logo_path ?? "",
        displayPriority: priorityFor(provider, available),
        regions: available,
      });
    }
  }

  return [...byId.values()].sort(
    (a, b) => a.displayPriority - b.displayPriority || a.name.localeCompare(b.name)
  );
}

function regionsFor(provider: TmdbProvider, regions: string[]): string[] {
  const priorities = provider.display_priorities;

  // No per-region map means TMDB did not scope this provider; treat it as
  // available everywhere requested rather than dropping it from the catalog.
  if (!priorities) return [...regions];

  return regions.filter((region) => region in priorities);
}

function priorityFor(provider: TmdbProvider, available: string[]): number {
  const priorities = provider.display_priorities;
  if (priorities) {
    const scoped = available.map((region) => priorities[region]).filter((value) => typeof value === "number");
    if (scoped.length > 0) return Math.min(...scoped);
  }
  return provider.display_priority ?? Number.MAX_SAFE_INTEGER;
}
