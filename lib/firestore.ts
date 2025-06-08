// lib/firestore.ts
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export type UserPreferences = {
  favoriteCountries: string[];
  darkMode: boolean;
};

// Save any part of the preferences (can be just favoriteCountries or just darkMode)
export async function saveUserPreferences(
  uid: string,
  preferences: Partial<UserPreferences>
) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, preferences, { merge: true });
}

// Load preferences with sensible defaults if fields are missing
export async function loadUserPreferences(
  uid: string
): Promise<UserPreferences | null> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      favoriteCountries: Array.isArray(data.favoriteCountries) ? data.favoriteCountries : [],
      darkMode: typeof data.darkMode === "boolean" ? data.darkMode : false,
    };
  }

  return null;
}