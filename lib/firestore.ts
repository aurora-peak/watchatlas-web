// lib/firestore.ts
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export type UserPreferences = {
  favoriteCountries: string[];
  darkMode: boolean;
};

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
      const data = snapshot.data();
      return {
        favoriteCountries: Array.isArray(data.favoriteCountries) ? data.favoriteCountries : [],
        darkMode: typeof data.darkMode === "boolean" ? data.darkMode : true,
      };
    }

    return null;
  } catch (error) {
    console.error("Error loading preferences:", error);
    return null;
  }
}
