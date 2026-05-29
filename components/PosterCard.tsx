"use client";

import Link from "next/link";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";

/**
 * Poster + title + optional status line. The recurring card primitive used in
 * list / grid / carousel contexts (browse rows, search results, watchlist).
 */

const WIDTHS = {
  carousel: 160,
  grid: undefined, // fills its grid cell
  list: 160,
} as const;

export type PosterCardProps = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  year?: string;
  /** Extra status content under the title (service logos, "leaves May 31", etc.). */
  statusLine?: React.ReactNode;
  /** Overlay badge in the poster's top-left (e.g. media-type chip). */
  badge?: React.ReactNode;
  variant?: keyof typeof WIDTHS;
  /** Accent border — used for "expiring" watchlist cards. */
  accent?: boolean;
  /** Striped/dimmed treatment — used for "hunting"/unavailable cards. */
  striped?: boolean;
};

export default function PosterCard({
  id,
  mediaType,
  title,
  posterPath,
  year,
  statusLine,
  badge,
  variant = "carousel",
  accent = false,
  striped = false,
}: PosterCardProps) {
  const width = WIDTHS[variant];

  return (
    <Link href={`/details/${id}?type=${mediaType}`}>
      <div
        className="card-hover group cursor-pointer"
        style={{
          width,
          flex: width ? "0 0 auto" : undefined,
          borderRadius: 12,
          ...(accent
            ? { border: "1px solid var(--brand-2)", padding: 8, background: "var(--card)" }
            : {}),
        }}
      >
        <div
          className={`relative rounded-xl overflow-hidden ${striped ? "availability-empty" : ""}`}
          style={{
            width: "100%",
            aspectRatio: "2 / 3",
            background: "var(--card)",
            opacity: striped ? 0.85 : 1,
          }}
        >
          <Image
            src={getPosterUrl(posterPath ?? null)}
            alt={title}
            fill
            sizes="(max-width: 768px) 40vw, 160px"
            className="object-cover"
          />
          {badge && <div className="absolute top-2 left-2">{badge}</div>}
        </div>

        <div className="mt-2 px-0.5">
          <h3
            className="text-sm font-semibold leading-tight"
            style={{
              color: "var(--foreground)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </h3>
          {year && (
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {year}
            </p>
          )}
          {statusLine && <div className="mt-1.5">{statusLine}</div>}
        </div>
      </div>
    </Link>
  );
}
