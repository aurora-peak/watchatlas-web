// lib/firestore.ts
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export type UserPreferences = {
  favoriteCountries: string[];
  darkMode: boolean;
};

export async function saveUserPreferences(
  uid: string,
  preferences: Partial<UserPreferences>
) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, preferences, { merge: true });
}

export async function loadUserPreferences(
  uid: string
): Promise<UserPreferences | null> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      favoriteCountries: data.favoriteCountries ?? [],
      darkMode: data.darkMode ?? false,
    };
  }
  return null;
}