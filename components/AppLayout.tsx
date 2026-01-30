import { useRouter } from "next/router";
import { useTheme } from "next-themes";
import { Home, Search, Settings } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  const navStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-around",
    borderTop: "1px solid",
    backgroundColor: resolvedTheme === "dark" ? "#111" : "#fff",
    color: resolvedTheme === "dark" ? "#fff" : "#000",
    borderColor: resolvedTheme === "dark" ? "#333" : "#ddd",
    zIndex: 1000,
  };

  const buttonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    color: resolvedTheme === "dark" ? "#ccc" : "#444",
  };

  return (
    <div className={`min-h-screen relative ${resolvedTheme === "dark" ? "bg-black text-white" : "bg-white text-black"}`}>
      <main>{children}</main>

      <nav style={navStyle}>
        <button style={buttonStyle} onClick={() => router.push("/")}>          
          <Home size={20} />
          <span>Home</span>
        </button>
        <button style={buttonStyle} onClick={() => router.push("/search")}>          
          <Search size={20} />
          <span>Search</span>
        </button>
        <button style={buttonStyle} onClick={() => router.push("/settings")}>          
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}