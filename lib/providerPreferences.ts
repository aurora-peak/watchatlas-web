import type { FavoriteService } from "./firestore";

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

export type ProviderTiers<T> = {
  preferred: T[];
  others: T[];
};

/**
 * Groups a country's providers into the user's own services first, then the
 * rest. This only ever reorders: every input provider appears in exactly one
 * tier, so nothing is hidden from the user.
 */
export function splitProvidersByPreference<T extends WatchProvider>(
  providers: T[],
  favoriteServices: FavoriteService[]
): ProviderTiers<T> {
  const preferredIds = new Set(favoriteServices.map((service) => service.id));

  const preferred: T[] = [];
  const others: T[] = [];

  for (const provider of providers) {
    if (preferredIds.has(provider.provider_id)) {
      preferred.push(provider);
    } else {
      others.push(provider);
    }
  }

  return { preferred, others };
}

export type ProviderDisplayTier<T> = {
  label: string;
  items: T[];
};

/**
 * Turns a preferred/others split into the tiers a page should render.
 * Falls back to a single flat "Stream" tier when none of the user's
 * services are present (including signed-out and no-favorites), and
 * collapses to a single "Your services" tier — never relabeled — when
 * every provider is one of the user's. Never introduces an empty tier.
 */
export function buildProviderDisplayTiers<T extends WatchProvider>(
  preferred: T[],
  others: T[]
): ProviderDisplayTier<T>[] {
  if (preferred.length === 0) {
    return [{ label: "Stream", items: others }];
  }
  if (others.length === 0) {
    return [{ label: "Your services", items: preferred }];
  }
  return [
    { label: "Your services", items: preferred },
    { label: "Also available on", items: others },
  ];
}
