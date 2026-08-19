// lib/preferences.ts
//
// Pure data-shaping logic for user preferences, deliberately kept free of any
// Firebase import. lib/firestore.ts imports lib/firebase.ts, which calls
// initializeApp()/getAuth() at module load — importing that module just to
// test normalizePreferences() boots live Firebase and throws without env
// vars. Keeping this file free of Firebase lets it be unit tested standalone.

import { MAX_DISCOVER_PROVIDERS } from "./discoverMerge";
import { canonicalizeRegionSet } from "./providerCatalog";

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

export type PreferencesLoadStatus = "idle" | "loading" | "ready" | "error";

export type ThemeSelection = {
  uid: string | null;
  darkMode: boolean;
  revision: number;
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
    favoriteCountries: Array.isArray(record.favoriteCountries)
      ? record.favoriteCountries.filter((code): code is string => typeof code === "string")
      : [],
    darkMode: typeof record.darkMode === "boolean" ? record.darkMode : true,
    favoriteServices,
  };
}

// Deciding whether an editable copy of the preferences may be hydrated from the
// context. `preferences` alone can't answer this: AuthContext publishes the new
// `user` before it finishes awaiting the preference load, so there is always a
// render where a signed-in uid is paired with the *previous* identity's
// preferences — the signed-out object the theme toggle leaves behind, or the
// account that was signed in a moment ago. Hydrating there latches the wrong
// data and Save writes it back to Firestore under the new uid.
//
// The guard is therefore on identity, not presence: only hydrate when the
// preferences are known to belong to the current uid.
export type HydrationAction = "hydrate" | "reset" | "skip";

export function resolveHydrationAction(input: {
  userUid: string | null;
  preferencesUid: string | null;
  hasPreferences: boolean;
  hydratedForUid: string | null | undefined;
}): HydrationAction {
  const { userUid, preferencesUid, hasPreferences, hydratedForUid } = input;

  // Nothing trustworthy to read. "reset" rather than "skip" so the latch drops:
  // signing out and back in as the same user must hydrate afresh instead of
  // being mistaken for an already-hydrated session.
  if (!hasPreferences || preferencesUid !== userUid) return "reset";

  // Already hydrated for this identity — leave unsaved edits alone.
  if (hydratedForUid === userUid) return "skip";

  return "hydrate";
}

// A signed-in identity is not enough to make Save safe. The editable copy may
// only be persisted after that identity's Firestore read completed
// successfully; otherwise its initial empty arrays could overwrite stored
// selections after a slow or failed load.
export function canSavePreferences(input: {
  userUid: string | null;
  preferencesUid: string | null;
  status: PreferencesLoadStatus;
}): boolean {
  return (
    input.status === "ready" &&
    input.userUid !== null &&
    input.preferencesUid === input.userUid
  );
}

// A Firestore read can start before a theme toggle and resolve after it. Only a
// selection made after that read began may override its snapshot; older local
// selections must not mask a genuinely newer server read.
export function reconcilePreferencesWithThemeSelection(
  preferences: UserPreferences,
  userUid: string,
  loadStartedAtThemeRevision: number,
  selection: ThemeSelection | null
): UserPreferences {
  if (
    !selection ||
    selection.uid !== userUid ||
    selection.revision <= loadStartedAtThemeRevision
  ) {
    return preferences;
  }

  return { ...preferences, darkMode: selection.darkMode };
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
  return (
    typeof candidate.id === "number" &&
    Number.isSafeInteger(candidate.id) &&
    candidate.id > 0 &&
    typeof candidate.name === "string"
  );
}

// Eligibility + query construction for the "On My Services" home row. Pure so
// it is unit-testable without booting Firebase or React. `user` is typed
// structurally (just enough to know "signed in or not") rather than importing
// Firebase's `User` type, keeping this module dependency-free; a real
// firebase/auth `User` satisfies this shape.
//
// `favoriteCountries` comes from an untrusted Firestore document, so validate
// it with the API's parser and canonicalize its set before building the URL.
// This keeps equivalent selections on one CDN cache key. encodeURIComponent
// then ensures the delimiters round-trip through Next's query decoding.
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

  const regionCodes = canonicalizeRegionSet(countries);
  if (!regionCodes) return null;

  const providerIds = [...new Set(
    services
      .map((service) => service.id)
      .filter((id) => Number.isSafeInteger(id) && id > 0)
  )].sort((a, b) => a - b);

  if (providerIds.length === 0 || providerIds.length > MAX_DISCOVER_PROVIDERS) return null;

  const regions = encodeURIComponent(regionCodes.join(","));
  const providers = encodeURIComponent(providerIds.join("|"));

  return `/api/tmdb/discover?regions=${regions}&providers=${providers}`;
}
