"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../lib/firebase";

declare global {
    interface Window {
        google: any;
    }
}

export default function AuthInitializer() {
    const [user, setUser] = useState<{ name: string; picture: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
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
                            const result = await signInWithCredential(auth, credential);
                            const firebaseUser = result.user;

                            const userData = {
                                name: firebaseUser.displayName || "",
                                picture: firebaseUser.photoURL || "",
                            };

                            setUser(userData);
                            localStorage.setItem("user", JSON.stringify(userData));
                            window.location.href = "/settings";
                        } catch (err) {
                            console.error("🔥 Firebase Auth error:", err);
                        }
                    },
                });

                window.google.accounts.id.renderButton(document.getElementById("g_id_signin"), {
                    theme: "outline",
                    size: "medium",
                });
            }
        };

        const saved = localStorage.getItem("user");
        if (saved) {
            setUser(JSON.parse(saved));
        }
    }, []);

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
            <div id="g_id_signin" style={styles.googleSignIn} />
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
    heading: {
        margin: 0,
        fontSize: "1.5rem",
    },
    subheading: {
        margin: 0,
        fontSize: "1rem",
        color: "#666",
    },
    googleSignIn: {
        flex: "0 0 auto",
        display: "inline-block",
        maxWidth: 250,
    },
};