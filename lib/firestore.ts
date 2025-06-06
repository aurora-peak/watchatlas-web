// lib/firestore.ts
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function saveUserPreferences(uid: string, favorites: string[]) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { favoriteCountries: favorites }, { merge: true });
}

export async function loadUserPreferences(uid: string): Promise<string[] | null> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    return data.favoriteCountries ?? null;
  }
  return null;
}