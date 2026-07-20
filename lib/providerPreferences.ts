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
