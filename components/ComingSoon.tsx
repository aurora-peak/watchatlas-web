import Link from "next/link";
import { Mark } from "@/components/Logo";

/**
 * Placeholder for routes whose data/build is scheduled for a later phase
 * (Browse-by-service, Watchlist, Genres). Keeps the nav links live without
 * shipping half-built screens.
 */
export default function ComingSoon({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="page-container flex items-center justify-center px-6">
      <div className="text-center max-w-md fade-in" style={{ paddingTop: "8vh" }}>
        <div className="mx-auto mb-6" style={{ width: 64 }}>
          <Mark size={64} />
        </div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          {blurb}
        </p>
        <span
          className="lbl-mono inline-block mb-8"
          style={{ fontSize: 11, color: "var(--brand-1)" }}
        >
          Coming soon
        </span>
        <div>
          <Link
            href="/"
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
