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
 * The subset of a TMDB watch/providers country entry that counts as
 * "streaming". `rent`/`buy` are deliberately absent: purchase tiers are never
 * fed through the preference split, because a "your services" framing on a
 * transaction reads as an endorsement of buying it there.
 */
export type CountryStreamingProviders<T extends WatchProvider = WatchProvider> = {
  flatrate?: T[] | null;
  free?: T[] | null;
  ads?: T[] | null;
};

const STREAMING_KEYS = ["flatrate", "free", "ads"] as const;

/**
 * Picks the canonical record for two entries that share a provider_id.
 *
 * Commutative up to WatchProvider-field equality: swapping the arguments picks
 * a record with the same provider_id, provider_name and effective logo_path, so
 * the result does not depend on which array TMDB happened to list the provider
 * in first. A first-seen-wins rule here would silently freeze whichever copy
 * arrived first — the exact defect that shipped once already on this branch.
 *
 * It returns one record whole rather than merging field-wise, so that guarantee
 * covers the WatchProvider fields only. A caller whose T carries extra fields
 * that differ between tiers would see one tier's values win arbitrarily. No
 * caller does today; revisit this if one starts to.
 */
function pickCanonical<T extends WatchProvider>(a: T, b: T): T {
  // Normalize first: logo_path is typed string | null, but a TMDB payload
  // missing the key yields undefined, and "" is a third falsy spelling of the
  // same thing. Comparing the raw values would let null/undefined/"" tie on the
  // Boolean check and then fall through to a strict !== that is true while the
  // normalized comparison is false — which always returned b, breaking symmetry.
  const aLogo = a.logo_path ?? "";
  const bLogo = b.logo_path ?? "";

  if (Boolean(aLogo) !== Boolean(bLogo)) return aLogo ? a : b;
  if (a.provider_name !== b.provider_name) {
    return a.provider_name < b.provider_name ? a : b;
  }
  if (aLogo !== bLogo) return aLogo < bLogo ? a : b;
  return a;
}

/**
 * Flattens the streaming-eligible tiers of a country entry into one list.
 *
 * TMDB splits subscription (`flatrate`), free (`free`) and ad-supported (`ads`)
 * availability into separate arrays, and the same provider can appear in more
 * than one. `pages/api/tmdb/discover.ts` queries all three, so the detail page
 * must read all three too — otherwise a title surfaced in the "On My Services"
 * row because it is free on Tubi shows no Tubi entry when opened, which both
 * breaks the feature for free/ad-supported subscribers and hides a provider
 * that is present in the payload.
 *
 * Output order is first appearance across flatrate → free → ads; duplicate
 * records are resolved by `pickCanonical`, which is order-independent.
 */
export function collectStreamingProviders<T extends WatchProvider>(
  country: CountryStreamingProviders<T> | null | undefined
): T[] {
  const order: number[] = [];
  const byId = new Map<number, T>();

  for (const key of STREAMING_KEYS) {
    const list = country?.[key];
    if (!Array.isArray(list)) continue;

    for (const provider of list) {
      const existing = byId.get(provider.provider_id);
      if (existing === undefined) {
        order.push(provider.provider_id);
        byId.set(provider.provider_id, provider);
      } else {
        byId.set(provider.provider_id, pickCanonical(existing, provider));
      }
    }
  }

  return order.map((id) => byId.get(id) as T);
}

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
  /**
   * True when `items` are the user's own services. Callers branch on this to
   * decide highlighting — never on `label`, which is display copy and can be
   * reworded without any type error or failing test.
   */
  preferred: boolean;
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
    return [{ label: "Stream", preferred: false, items: others }];
  }
  if (others.length === 0) {
    return [{ label: "Your services", preferred: true, items: preferred }];
  }
  return [
    { label: "Your services", preferred: true, items: preferred },
    { label: "Also available on", preferred: false, items: others },
  ];
}
