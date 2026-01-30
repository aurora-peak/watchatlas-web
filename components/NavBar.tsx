"use client";

import { useEffect } from "react";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

declare global {
  interface Window {
    google: any;
  }
}

export default function NavBar() {
  const { user } = useAuth();

  useEffect(() => {
    // Don't load Google sign-in if user is already authenticated
    if (user) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: async (response: any) => {
            try {
              const credential = GoogleAuthProvider.credential(response.credential);
              await signInWithCredential(auth, credential);
              // Auth context will handle the state update
              window.location.href = "/settings";
            } catch (err) {
              console.error("Firebase Auth error:", err);
            }
          },
        });

        const buttonEl = document.getElementById("g_id_signin");
        if (buttonEl) {
          window.google.accounts.id.renderButton(buttonEl, {
            theme: "outline",
            size: "medium",
          });
        }
      }
    };

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [user]);

  return (
    <nav style={styles.navbar}>
      <div style={styles.logo}>
        <img src="/logo.png" alt="WatchAtlas Logo" width={72} height={72} />
      </div>
      <div style={styles.center}>
        <h1 style={{ fontFamily: "Showtime, sans-serif" }} className="text-2xl font-bold">
          WatchAtlas
        </h1>
        <p style={styles.subheading}>Find where to watch your favorite content</p>
      </div>
      <div style={styles.rightSection}>
        {user ? (
          <div style={styles.userInfo}>
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                width={36}
                height={36}
                style={{ borderRadius: "50%" }}
              />
            )}
          </div>
        ) : (
          <div id="g_id_signin" style={styles.googleSignIn} />
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    borderBottom: "1px solid #ccc",
  },
  logo: {
    flex: "0 0 auto",
  },
  center: {
    flex: "1 1 auto",
    textAlign: "center" as "center",
  },
  subheading: {
    margin: 0,
    fontSize: "1rem",
    color: "#666",
  },
  rightSection: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    minWidth: 120,
    justifyContent: "flex-end",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  googleSignIn: {
    display: "inline-block",
    maxWidth: 250,
  },
};
