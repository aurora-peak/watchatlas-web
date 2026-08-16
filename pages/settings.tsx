import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/AuthContext";
import type { FavoriteService } from "@/lib/preferences";
import { resolveHydrationAction } from "@/lib/preferences";
import fullCountryList from "@/lib/full_country_list_with_flags.json";
import { Search, Check, Globe, LogOut, User, Home } from "lucide-react";
import Link from "next/link";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ServicePicker from "@/components/ServicePicker";

type Country = {
  code: string;
  name: string;
  flag: string;
  continent: string;
};

declare global {
  interface Window {
    google: any;
  }
}

export default function SettingsPage() {
  const { user, preferences, preferencesUid, updatePreferences, signOut } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<FavoriteService[]>([]);
  const [groupedByContinent, setGroupedByContinent] = useState<Record<string, Country[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  // Hydrate the editable copy from preferences once per signed-in user. A later
  // refresh of `preferences` (another tab, a background reload) must not
  // overwrite edits the user has in progress but has not saved yet — and
  // preferences belonging to a different identity must never be hydrated at
  // all, or Save writes them back under the wrong uid.
  const hydratedForUid = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const uid = user?.uid ?? null;
    const action = resolveHydrationAction({
      userUid: uid,
      preferencesUid,
      hasPreferences: Boolean(preferences),
      hydratedForUid: hydratedForUid.current,
    });

    if (action === "reset") {
      hydratedForUid.current = undefined;
      return;
    }
    if (action === "skip") return;

    hydratedForUid.current = uid;
    setSelected(preferences!.favoriteCountries ?? []);
    setSelectedServices(preferences!.favoriteServices ?? []);
  }, [preferences, preferencesUid, user]);

  // Group countries by continent
  useEffect(() => {
    const grouped = fullCountryList.reduce((acc: Record<string, Country[]>, country: Country) => {
      if (!acc[country.continent]) acc[country.continent] = [];
      acc[country.continent].push(country);
      return acc;
    }, {});

    for (const continent of Object.keys(grouped)) {
      grouped[continent].sort((a, b) => a.name.localeCompare(b.name));
    }

    setGroupedByContinent(grouped);
  }, []);

  // Load Google Sign-In for non-authenticated users
  useEffect(() => {
    if (user) {
      console.log("User already signed in:", user.email);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      initializeGoogleSignIn();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = initializeGoogleSignIn;

    function initializeGoogleSignIn() {
      if (!window.google) {
        console.error("Google Sign-In library not loaded");
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");
        return;
      }

      console.log("Initializing Google Sign-In with client ID:", clientId.substring(0, 20) + "...");

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          console.log("Google Sign-In callback triggered");
          if (!response.credential) {
            console.error("No credential in response");
            return;
          }

          try {
            console.log("Creating Firebase credential from Google token");
            const credential = GoogleAuthProvider.credential(response.credential);
            console.log("Signing in with Firebase...");
            const result = await signInWithCredential(auth, credential);
            console.log("Firebase sign-in successful:", result.user.email);
            // Force page reload to ensure UI updates
            window.location.reload();
          } catch (err: any) {
            console.error("Firebase Auth error:", err);
            console.error("Error code:", err?.code);
            console.error("Error message:", err?.message);
            alert(`Sign-in failed: ${err?.message || 'Unknown error'}`);
          }
        },
      });

      // Render the button after initialization
      setTimeout(() => {
        const buttonEl = document.getElementById("g_id_signin");
        if (buttonEl) {
          window.google.accounts.id.renderButton(buttonEl, {
            theme: "filled_black",
            size: "large",
            shape: "pill",
          });
          console.log("Google Sign-In button rendered");
        } else {
          console.error("g_id_signin element not found");
        }
      }, 100);
    }

    return () => {
      // Don't remove the script on cleanup as it might cause issues
    };
  }, [user]);

  // One save for both countries and services. Local state is left untouched on
  // failure so nothing the user picked is lost, and the error is rendered
  // inline rather than swallowed.
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updatePreferences({
        favoriteCountries: selected,
        favoriteServices: selectedServices,
      });
      router.push("/");
    } catch (error) {
      console.error("Error saving preferences:", error);
      setSaveError("Could not save your preferences. Your selections are still here — try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const toggleCountry = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="page-container px-6 pt-8 fade-in">
      {/* Back to Home Button */}
      <div className="mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105 w-fit shadow-lg shadow-black/20"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          <Home size={18} />
          Back to Home
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p style={{ color: "var(--muted)" }}>
          Customize your streaming preferences
        </p>
      </div>

      {/* User Profile Section */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  width={56}
                  height={56}
                  className="rounded-full"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "var(--border)" }}
                >
                  <User size={24} style={{ color: "var(--muted)" }} />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{user.displayName || "User"}</h3>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "var(--border)" }}
            >
              <User size={28} style={{ color: "var(--muted)" }} />
            </div>
            <h3 className="font-semibold text-lg mb-2">Sign in to save preferences</h3>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Your country preferences will be saved to your account
            </p>
            <div id="g_id_signin" className="flex justify-center" />
          </div>
        )}
      </div>

      {/* Country Selection */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} style={{ color: "var(--accent)" }} />
          <h2 className="text-lg font-semibold">Preferred Countries</h2>
          {selected.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {selected.length} selected
            </span>
          )}
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Choose countries to see their streaming availability on detail pages
        </p>

        {/* Search */}
        <div className="relative max-w-md mb-6 search-input-wrapper">
          <Search
            className="search-icon"
            size={20}
            style={{ color: "var(--muted)" }}
          />
          <input
            type="text"
            placeholder="Search countries..."
            aria-label="Search countries"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input with-icon"
          />
        </div>

        {/* Country Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedByContinent).map(([continent, countries]) => {
            const filtered = countries.filter((country) =>
              country.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filtered.length === 0) return null;

            return (
              <div
                key={continent}
                className="rounded-xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <h3 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                  {continent}
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filtered.map((country) => {
                    const isSelected = selected.includes(country.code);
                    return (
                      <button
                        key={country.code}
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() => toggleCountry(country.code)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors"
                        style={{
                          background: isSelected ? "var(--accent-soft)" : "transparent",
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span className="text-sm">{country.name}</span>
                        </span>
                        {isSelected && (
                          <Check size={16} style={{ color: "var(--accent)" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <ServicePicker
          countries={selected}
          selected={selectedServices}
          onSelectedChange={setSelectedServices}
        />
      </div>

      {/* Save Button */}
      {user && (
        <div className="sticky bottom-20 pt-4 pb-2" style={{ background: "var(--background)" }}>
          {saveError && (
            <p
              role="alert"
              className="max-w-md mx-auto mb-3 text-sm rounded-xl px-4 py-3"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {saveError}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full max-w-md mx-auto block"
          >
            {saving
              ? "Saving..."
              : `Save Preferences (${selected.length} countries, ${selectedServices.length} services)`}
          </button>
        </div>
      )}
    </div>
  );
}
