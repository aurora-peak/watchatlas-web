import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";
import { loadUserPreferences, saveUserPreferences, UserPreferences } from "./firestore";

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  // Which identity `preferences` belongs to (null when signed out). Published
  // alongside the data because `user` changes before the load that follows it
  // resolves, so consumers cannot assume the two are in step. Anything that
  // copies preferences into its own state must check this first.
  preferencesUid: string | null;
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
  const [loading, setLoading] = useState(true);

  // The uid of the most recent auth event. Two sign-ins in quick succession can
  // resolve their loads out of order, so a load only publishes if its own uid is
  // still the current one.
  const latestUid = useRef<string | null>(null);

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
      latestUid.current = firebaseUser?.uid ?? null;
      setUser(firebaseUser);

      // Drop the outgoing identity's preferences before awaiting the next
      // load, so no consumer can read them alongside the new user.
      setPreferences(null);
      setPreferencesUid(null);

      if (firebaseUser) {
        const prefs = await loadUserPreferences(firebaseUser.uid);

        // A newer auth event landed while this load was in flight — its result
        // is the current one, so discard ours rather than clobbering it.
        if (latestUid.current !== firebaseUser.uid) return;

        setPreferences(prefs);
        setPreferencesUid(firebaseUser.uid);

        // Apply dark mode preference from user prefs (default to true/dark)
        const darkMode = prefs?.darkMode ?? true;
        applyTheme(darkMode);
        localStorage.setItem("darkMode", String(darkMode));
      } else {
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
    setUser(null);
    setPreferences(null);
    setPreferencesUid(null);
  };

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    // Save to localStorage for non-logged-in users
    if (prefs.darkMode !== undefined) {
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
      return;
    }

    await saveUserPreferences(user.uid, prefs);

    // Update local state
    setPreferences((prev) => ({
      favoriteCountries: prev?.favoriteCountries ?? [],
      darkMode: prev?.darkMode ?? true,
      favoriteServices: prev?.favoriteServices ?? [],
      ...prefs,
    }));
    // The merged object is this user's now, whether or not the load that would
    // have claimed it has resolved.
    setPreferencesUid(user.uid);
  };

  const refreshPreferences = async () => {
    if (!user) return;
    const prefs = await loadUserPreferences(user.uid);
    if (latestUid.current !== user.uid) return;
    setPreferences(prefs);
    setPreferencesUid(user.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        preferencesUid,
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
