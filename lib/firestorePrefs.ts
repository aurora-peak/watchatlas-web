import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function saveUserPreferences(userId: string, countries: string[]) {
  try {
    await setDoc(doc(db, 'preferences', userId), { countries });
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
}

export async function loadUserPreferences(userId: string): Promise<string[]> {
  try {
    const docSnap = await getDoc(doc(db, 'preferences', userId));
    if (docSnap.exists()) {
      return docSnap.data().countries || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
    return [];
  }
}
