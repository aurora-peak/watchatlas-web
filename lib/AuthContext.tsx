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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const prefs = await loadUserPreferences(firebaseUser.uid);
        setPreferences(prefs);

        // Apply dark mode preference
        if (prefs?.darkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        setPreferences(null);
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
    if (!user) return;

    await saveUserPreferences(user.uid, prefs);

    // Update local state
    setPreferences((prev) => ({
      favoriteCountries: prev?.favoriteCountries ?? [],
      darkMode: prev?.darkMode ?? false,
      ...prefs,
    }));

    // Apply dark mode if it changed
    if (prefs.darkMode !== undefined) {
      document.documentElement.classList.toggle("dark", prefs.darkMode);
    }
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
