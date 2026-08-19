import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";
import { loadUserPreferences, saveUserPreferences } from "./firestore";
import { reconcilePreferencesWithThemeSelection } from "./preferences";
import type { PreferencesLoadStatus, ThemeSelection, UserPreferences } from "./preferences";

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  // Which identity `preferences` belongs to (null when signed out). Published
  // alongside the data because `user` changes before the load that follows it
  // resolves, so consumers cannot assume the two are in step. Anything that
  // copies preferences into its own state must check this first.
  preferencesUid: string | null;
  preferencesStatus: PreferencesLoadStatus;
  loading: boolean;
  signOut: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [preferencesUid, setPreferencesUid] = useState<string | null>(null);
  const [preferencesStatus, setPreferencesStatus] = useState<PreferencesLoadStatus>("idle");
  const [loading, setLoading] = useState(true);

  // The uid of the most recent auth event. Two sign-ins in quick succession can
  // resolve their loads out of order, so a load only publishes if its own uid is
  // still the current one.
  const latestUid = useRef<string | null>(null);
  const themeRevision = useRef(0);
  const latestThemeSelection = useRef<ThemeSelection | null>(null);

  // Apply theme based on darkMode preference (dark is default, light when darkMode is false)
  const applyTheme = (darkMode: boolean) => {
    if (darkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  };

  useEffect(() => {
    // Check localStorage for theme preference (for non-logged-in users)
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme !== null) {
      applyTheme(savedTheme === "true");
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const nextUid = firebaseUser?.uid ?? null;
      if (latestUid.current !== nextUid) latestThemeSelection.current = null;
      latestUid.current = nextUid;
      setUser(firebaseUser);

      // Drop the outgoing identity's preferences before awaiting the next
      // load, so no consumer can read them alongside the new user.
      setPreferences(null);
      setPreferencesUid(null);

      if (firebaseUser) {
        setPreferencesStatus("loading");
        try {
          const loadStartedAtThemeRevision = themeRevision.current;
          const loadedPreferences = await loadUserPreferences(firebaseUser.uid);

          // A newer auth event landed while this load was in flight — its result
          // is the current one, so discard ours rather than clobbering it.
          if (latestUid.current !== firebaseUser.uid) return;

          const prefs = reconcilePreferencesWithThemeSelection(
            loadedPreferences,
            firebaseUser.uid,
            loadStartedAtThemeRevision,
            latestThemeSelection.current
          );

          setPreferences(prefs);
          setPreferencesUid(firebaseUser.uid);
          setPreferencesStatus("ready");

          // Apply dark mode preference from user prefs (default to true/dark)
          applyTheme(prefs.darkMode);
          localStorage.setItem("darkMode", String(prefs.darkMode));
        } catch {
          if (latestUid.current !== firebaseUser.uid) return;
          // Keep the failed read visibly distinct from a valid new account's
          // empty defaults. Consumers must not enable persistence in this state.
          setPreferences(null);
          setPreferencesUid(null);
          setPreferencesStatus("error");
        }
      } else {
        setPreferencesStatus("idle");
        // For non-logged-in users, use localStorage or default to dark
        const savedTheme = localStorage.getItem("darkMode");
        applyTheme(savedTheme === null ? true : savedTheme === "true");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem("user");
    latestUid.current = null;
    latestThemeSelection.current = null;
    setUser(null);
    setPreferences(null);
    setPreferencesUid(null);
    setPreferencesStatus("idle");
  };

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    // Save to localStorage for non-logged-in users
    if (prefs.darkMode !== undefined) {
      themeRevision.current += 1;
      latestThemeSelection.current = {
        uid: user?.uid ?? null,
        darkMode: prefs.darkMode,
        revision: themeRevision.current,
      };
      localStorage.setItem("darkMode", String(prefs.darkMode));
      applyTheme(prefs.darkMode);
    }

    if (!user) {
      // For non-logged-in users, just update local state
      setPreferences((prev) => ({
        favoriteCountries: prev?.favoriteCountries ?? [],
        darkMode: prev?.darkMode ?? true,
        favoriteServices: prev?.favoriteServices ?? [],
        ...prefs,
      }));
      // Signed-out preferences belong to nobody. Stated rather than assumed, so
      // a stale uid can never outlive the identity it came from.
      setPreferencesUid(null);
      return;
    }

    await saveUserPreferences(user.uid, prefs);

    // Same ordering guard as onAuthStateChanged and refreshPreferences: if the
    // session ended while this write was in flight, publishing now would push
    // the previous identity's preferences into a signed-out context.
    if (latestUid.current !== user.uid) return;

    // A dark-mode write can happen while the initial read is still pending.
    // Persist that single field, but do not manufacture an empty preference
    // object or claim readiness before the authoritative read completes.
    if (preferencesStatus === "ready" && preferencesUid === user.uid) {
      setPreferences((prev) => prev ? { ...prev, ...prefs } : prev);
    }
  };

  const refreshPreferences = async () => {
    if (!user) return;
    setPreferencesStatus("loading");
    try {
      const loadStartedAtThemeRevision = themeRevision.current;
      const loadedPreferences = await loadUserPreferences(user.uid);
      if (latestUid.current !== user.uid) return;
      const prefs = reconcilePreferencesWithThemeSelection(
        loadedPreferences,
        user.uid,
        loadStartedAtThemeRevision,
        latestThemeSelection.current
      );
      setPreferences(prefs);
      setPreferencesUid(user.uid);
      setPreferencesStatus("ready");
    } catch {
      if (latestUid.current !== user.uid) return;
      setPreferencesStatus("error");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        preferencesUid,
        preferencesStatus,
        loading,
        signOut,
        updatePreferences,
        refreshPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
