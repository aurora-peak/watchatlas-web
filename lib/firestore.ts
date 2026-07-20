// lib/firestore.ts
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

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

function isFavoriteService(value: unknown): value is { id: number; name: string; logoPath?: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "number" && typeof candidate.name === "string";
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// Save any part of the preferences (can be just favoriteCountries or just darkMode)
export async function saveUserPreferences(
  uid: string,
  preferences: Partial<UserPreferences>
) {
  try {
    const userRef = doc(db, "users", uid);
    await withTimeout(
      setDoc(userRef, preferences, { merge: true }),
      10000,
      "Firestore setDoc"
    );
  } catch (error) {
    console.error("Error saving preferences:", error);
    throw error;
  }
}

// Load preferences with sensible defaults if fields are missing
export async function loadUserPreferences(
  uid: string
): Promise<UserPreferences | null> {
  try {
    const userRef = doc(db, "users", uid);
    const snapshot = await withTimeout(
      getDoc(userRef),
      10000,
      "Firestore getDoc"
    );

    if (snapshot.exists()) {
      return normalizePreferences(snapshot.data());
    }

    return null;
  } catch (error) {
    console.error("Error loading preferences:", error);
    return null;
  }
}
