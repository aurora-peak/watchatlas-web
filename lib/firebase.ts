// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableNetwork } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Log Firebase config (without sensitive parts)
console.log("Firebase config loaded:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
  hasApiKey: !!firebaseConfig.apiKey,
  hasAppId: !!firebaseConfig.appId,
});

const app = initializeApp(firebaseConfig);
console.log("Firebase app initialized:", app.name);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
// Connect to the named database "watchatlaspreference" (not the default)
export const db = getFirestore(app, "watchatlaspreference");

// Test Firestore connection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    console.log("Testing Firestore connection...");
    // Try to enable network (this will fail fast if there's a config issue)
    await enableNetwork(db);
    console.log("Firestore network enabled successfully");
    return true;
  } catch (error) {
    console.error("Firestore connection test failed:", error);
    return false;
  }
}

console.log("Firestore initialized for project:", firebaseConfig.projectId);