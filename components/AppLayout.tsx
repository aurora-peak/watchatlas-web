import { useRouter } from "next/router";
import { Home, Search, Settings, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import StatusBanner from "@/components/StatusBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentPath = router.pathname;
  const { user, preferences, updatePreferences } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize theme from preferences or localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    const darkMode = preferences?.darkMode ?? (savedTheme === null ? true : savedTheme === "true");
    setIsDarkMode(darkMode);
  }, [preferences]);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    updatePreferences({ darkMode: newDarkMode });
  };

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <StatusBanner />
      {/* Header */}
      <header
        className="px-4 py-3"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Empty spacer for balance */}
          <div className="flex-1" />

          {/* Center: Logo and Title */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <img
              src="/logo.svg"
              alt="WatchAtlas Logo"
              style={{
                height: "clamp(2.5rem, 8vw, 4.5rem)",
                width: "auto",
              }}
            />
            <div className="flex flex-col">
              <h1
                className="font-bold tracking-tight"
                style={{
                  fontFamily: "Showtime, sans-serif",
                  fontSize: "clamp(1.5rem, 6vw, 3rem)",
                  lineHeight: 1.1,
                }}
              >
                <span className="gradient-text">WATCH</span>
                <span style={{ color: "var(--foreground)" }}>ATLAS</span>
              </h1>
              <p
                className="tracking-widest uppercase"
                style={{
                  color: "var(--muted)",
                  fontSize: "clamp(0.4rem, 1.2vw, 0.65rem)",
                  letterSpacing: "0.2em",
                  marginTop: "6px",
                  lineHeight: 1,
                  textAlign: "center",
                }}
              >
                Global Streaming Guide
              </p>
            </div>
          </button>

          {/* Right: Controls */}
          <div className="flex-1 flex items-center justify-end gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full transition-colors"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <Sun size={18} style={{ color: "var(--muted)" }} />
              ) : (
                <Moon size={18} style={{ color: "var(--muted)" }} />
              )}
            </button>

            {user ? (
              <>
                {user.photoURL && (
                  <button onClick={() => router.push("/settings")}>
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      width={32}
                      height={32}
                      className="rounded-full border-2 hover:opacity-80 transition-opacity"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => router.push("/settings")}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pb-24">{children}</main>

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const isActive = currentPath === item.href ||
            (item.href === "/search" && currentPath.startsWith("/search")) ||
            (item.href === "/" && currentPath === "/");
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => router.push(item.href)}
            >
              <Icon size={24} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
