// lib/preferences.ts
//
// Pure data-shaping logic for user preferences, deliberately kept free of any
// Firebase import. lib/firestore.ts imports lib/firebase.ts, which calls
// initializeApp()/getAuth() at module load — importing that module just to
// test normalizePreferences() boots live Firebase and throws without env
// vars. Keeping this file dependency-free lets it be unit tested standalone.

export type FavoriteService = {
  id: number;
  name: string;
  logoPath: string;
};

export type UserPreferences = {
  favoriteCountries: string[];
  darkMode: boolean;
  favoriteServices: FavoriteService[];
};

// Firestore documents are untrusted input: a partial write or an older client
// can leave any field missing or the wrong shape. Normalizing in one place keeps
// the defaults identical for the loader and for callers rebuilding local state.
export function normalizePreferences(data: unknown): UserPreferences {
  const record = (data ?? {}) as Record<string, unknown>;

  const favoriteServices = Array.isArray(record.favoriteServices)
    ? record.favoriteServices.filter(isFavoriteService).map((service) => ({
        id: service.id,
        name: service.name,
        logoPath: typeof service.logoPath === "string" ? service.logoPath : "",
      }))
    : [];

  return {
    favoriteCountries: Array.isArray(record.favoriteCountries) ? record.favoriteCountries : [],
    darkMode: typeof record.darkMode === "boolean" ? record.darkMode : true,
    favoriteServices,
  };
}

// Selection helpers. ServicePicker is a controlled component, so the list of
// chosen services lives in the parent page; keeping the transitions pure here
// means they can be unit tested without rendering React.

export function toggleFavoriteService(
  services: FavoriteService[],
  service: FavoriteService
): FavoriteService[] {
  return services.some((entry) => entry.id === service.id)
    ? services.filter((entry) => entry.id !== service.id)
    : [...services, service];
}

export function removeFavoriteService(services: FavoriteService[], id: number): FavoriteService[] {
  return services.filter((entry) => entry.id !== id);
}

// Keeps the active tab pinned to the user's current choice while it remains
// valid, and falls back to the first country otherwise, so unchecking the
// active country does not leave the picker pointing at nothing.
export function resolveActiveCountry(countries: string[], current: string | null): string | null {
  if (current && countries.includes(current)) return current;
  return countries[0] ?? null;
}

function isFavoriteService(value: unknown): value is { id: number; name: string; logoPath?: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return Number.isFinite(candidate.id) && typeof candidate.name === "string";
}

// Eligibility + query construction for the "On My Services" home row. Pure so
// it is unit-testable without booting Firebase or React. `user` is typed
// structurally (just enough to know "signed in or not") rather than importing
// Firebase's `User` type, keeping this module dependency-free; a real
// firebase/auth `User` satisfies this shape.
//
// `favoriteCountries` is not content-validated by normalizePreferences (it
// only checks Array.isArray), so a malformed Firestore value containing "&"
// or "#" must not be allowed to mangle the query string — hence
// encodeURIComponent around the joined region/provider lists rather than
// around each element (the delimiter itself needs to survive being embedded
// in the query value and round-trip through Next's automatic query decoding).
//
// Does not cap the region count: pages/api/tmdb/discover.ts already caps at
// MAX_DISCOVER_REGIONS server-side, so duplicating the cap here would just be
// two sources of truth for the same limit.
export function buildDiscoverQuery(
  user: { uid: string } | null | undefined,
  preferences: Pick<UserPreferences, "favoriteCountries" | "favoriteServices"> | null | undefined
): string | null {
  if (!user) return null;

  const countries = preferences?.favoriteCountries ?? [];
  const services = preferences?.favoriteServices ?? [];

  if (countries.length === 0 || services.length === 0) return null;

  const regions = encodeURIComponent(countries.join(","));
  const providers = encodeURIComponent(services.map((service) => service.id).join("|"));

  return `/api/tmdb/discover?regions=${regions}&providers=${providers}`;
}
