import { useRouter } from "next/router";
import StatusBanner from "@/components/StatusBanner";
import TopNav from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Show the genre sub-nav strip on browse-style routes, hide it on dense pages.
  const showSubnav = router.pathname === "/" || router.pathname.startsWith("/services");

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <StatusBanner />
      <TopNav subnav={showSubnav} />

      <main className="pb-24">{children}</main>

      {/* Footer / Disclaimers */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: "1px solid var(--border)", background: "var(--background)", color: "var(--muted)" }}>
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-3 text-xs">
          <div className="flex flex-col items-center gap-2">
            <p>Movie metadata and streaming details provided by</p>
            <img 
              src="/tmdb-logo.png" 
              alt="TMDB Logo" 
              className="w-16 h-auto mt-1"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
