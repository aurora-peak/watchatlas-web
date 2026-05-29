"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "./AuthContext";

/**
 * Region is first-class in Watchatlas: the active country drives every
 * availability lookup and is encoded in the URL (?r=US) so results and detail
 * pages are shareable and indexable per country.
 *
 * Resolution order for the active region:
 *   1. the `r` query param (shareable / explicit)
 *   2. the signed-in user's first favorite country
 *   3. fallback default ("US")
 */

const DEFAULT_REGION = "US";

type RegionContextType = {
  region: string;
  setRegion: (code: string) => void;
};

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { preferences } = useAuth();
  const [region, setRegionState] = useState(DEFAULT_REGION);

  // Sync active region from the URL (or fall back to the user's preference).
  useEffect(() => {
    if (!router.isReady) return;
    const fromUrl = typeof router.query.r === "string" ? router.query.r.toUpperCase() : null;
    if (fromUrl) {
      setRegionState(fromUrl);
      return;
    }
    const fromPrefs = preferences?.favoriteCountries?.[0];
    if (fromPrefs) setRegionState(fromPrefs.toUpperCase());
  }, [router.isReady, router.query.r, preferences?.favoriteCountries]);

  const setRegion = useCallback(
    (code: string) => {
      const next = code.toUpperCase();
      setRegionState(next);
      // Persist the choice in the URL without scrolling or refetching the page.
      const query = { ...router.query, r: next };
      router.replace({ pathname: router.pathname, query }, undefined, {
        shallow: true,
        scroll: false,
      });
    },
    [router]
  );

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (ctx === undefined) {
    throw new Error("useRegion must be used within a RegionProvider");
  }
  return ctx;
}
