"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Search, Sun, Moon, Settings } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useRegion } from "@/lib/RegionContext";
import { Lockup } from "@/components/Logo";
import RegionPill from "@/components/RegionPill";

/**
 * Persistent top navigation on every screen (per the wireframe handoff):
 *  - logo top-left (not centered) + primary links with an active state
 *  - search field with a ⌘K affordance
 *  - the always-visible region pill (drives the URL ?r= param)
 *  - sign-in / avatar, settings and the theme toggle
 *  - an optional genre sub-nav strip on browse-style routes
 */

const GENRES = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Thriller", "Documentary", "Animation"];

export default function TopNav({ subnav = false }: { subnav?: boolean }) {
  const router = useRouter();
  const { user, preferences, updatePreferences } = useAuth();
  const { region } = useRegion();

  const [searchInput, setSearchInput] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    const dark = preferences?.darkMode ?? (saved === null ? true : saved === "true");
    setIsDarkMode(dark);
  }, [preferences]);

  // ⌘K / Ctrl+K focuses the search field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    updatePreferences({ darkMode: next });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    router.push(`/?query=${encodeURIComponent(q)}&r=${region}`);
  };

  const isHome = router.pathname === "/";
  const activeType = typeof router.query.type === "string" ? router.query.type : null;
  const links = [
    { label: "Movies", href: `/?type=movie&r=${region}`, active: isHome && activeType === "movie" },
    { label: "TV", href: `/?type=tv&r=${region}`, active: isHome && activeType === "tv" },
    { label: "Services", href: "/services", active: router.pathname.startsWith("/services") },
    { label: "Genres", href: "/genres", active: router.pathname.startsWith("/genres") },
    { label: "Watchlist", href: "/watchlist", active: router.pathname.startsWith("/watchlist") },
  ];

  return (
    <div style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
      <div
        className="flex items-center gap-4 px-4 md:px-6 py-3"
        style={{ maxWidth: 1280, margin: "0 auto" }}
      >
        {/* Left: logo + primary links */}
        <Link href="/" aria-label="Watchatlas home" className="flex-shrink-0">
          <Lockup markSize={32} wordSize={20} />
        </Link>

        <nav className="hidden md:flex items-center gap-5 ml-2">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm transition-colors"
              style={{
                color: l.active ? "var(--foreground)" : "var(--muted)",
                fontWeight: l.active ? 700 : 500,
                borderBottom: l.active ? "2px solid var(--brand-1)" : "2px solid transparent",
                paddingBottom: 2,
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Right: search + region + account */}
        <form onSubmit={submitSearch} className="hidden sm:block relative">
          <Search
            size={15}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
          />
          <input
            ref={searchRef}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search…"
            aria-label="Search titles or services"
            style={{
              width: 200,
              padding: "7px 36px 7px 30px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: 13,
              outline: "none",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10,
              color: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "1px 5px",
            }}
          >
            ⌘K
          </span>
        </form>

        <RegionPill />

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full transition-colors"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? <Sun size={16} style={{ color: "var(--muted)" }} /> : <Moon size={16} style={{ color: "var(--muted)" }} />}
        </button>

        {user ? (
          <button onClick={() => router.push("/settings")} aria-label="Account">
            <img
              src={user.photoURL || ""}
              alt={user.displayName || "User"}
              width={32}
              height={32}
              className="rounded-full border-2 hover:opacity-80 transition-opacity"
              style={{ borderColor: "var(--border)" }}
            />
          </button>
        ) : (
          <button
            onClick={() => router.push("/settings")}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors hidden sm:block"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            Sign In
          </button>
        )}

        <button
          onClick={() => router.push("/settings")}
          className="p-2 rounded-full transition-colors"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={16} style={{ color: "var(--muted)" }} />
        </button>
      </div>

      {/* Optional genre sub-nav strip */}
      {subnav && (
        <div
          className="hidden md:flex items-center gap-4 px-6 py-2 scroll-container overflow-x-auto"
          style={{ borderTop: "1px solid var(--border)", maxWidth: 1280, margin: "0 auto" }}
        >
          <span className="lbl-mono" style={{ fontSize: 10, color: "var(--muted)" }}>
            GENRES
          </span>
          {GENRES.map((g) => (
            <Link
              key={g}
              href="/genres"
              className="text-xs whitespace-nowrap transition-colors"
              style={{ color: "var(--muted)" }}
            >
              {g}
            </Link>
          ))}
          <div className="flex-1" />
          <Link href="/services" className="text-xs whitespace-nowrap" style={{ color: "var(--brand-1)" }}>
            browse by platform →
          </Link>
        </div>
      )}
    </div>
  );
}
