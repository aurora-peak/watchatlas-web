import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";
import { loadUserPreferences, saveUserPreferences, UserPreferences } from "./firestore";

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.log("Auth state changed:", firebaseUser ? "User signed in" : "User signed out");
      setUser(firebaseUser);

      if (firebaseUser) {
        console.log("Loading preferences for user:", firebaseUser.uid);
        const prefs = await loadUserPreferences(firebaseUser.uid);
        setPreferences(prefs);

        // Apply dark mode preference from user prefs (default to true/dark)
        const darkMode = prefs?.darkMode ?? true;
        applyTheme(darkMode);
        localStorage.setItem("darkMode", String(darkMode));
      } else {
        setPreferences(null);
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
    setUser(null);
    setPreferences(null);
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
        ...prefs,
      }));
      return;
    }

    await saveUserPreferences(user.uid, prefs);

    // Update local state
    setPreferences((prev) => ({
      favoriteCountries: prev?.favoriteCountries ?? [],
      darkMode: prev?.darkMode ?? true,
      ...prefs,
    }));
  };

  const refreshPreferences = async () => {
    if (!user) return;
    const prefs = await loadUserPreferences(user.uid);
    setPreferences(prefs);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
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
