import { useRouter } from "next/router";
import { Home, Search, Settings } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentPath = router.pathname;

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <main>{children}</main>

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
