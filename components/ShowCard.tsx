"use client";

import Link from "next/link";
import Image from "next/image";
import { TMDBResult, getPosterUrl } from "@/lib/tmdb";
import { Film, Tv } from "lucide-react";

type Props = {
  result: TMDBResult;
};

export default function ShowCard({ result }: Props) {
  const title = result.name || result.title || "Untitled";
  const year = result.release_date?.split("-")[0] || result.first_air_date?.split("-")[0];
  const isMovie = result.media_type === "movie";

  return (
    <Link href={`/details/${result.id}?type=${result.media_type}`}>
      <div className="card-hover group flex-shrink-0 w-[160px] cursor-pointer">
        {/* Poster */}
        <div
          className="relative w-[160px] h-[240px] rounded-xl overflow-hidden"
          style={{ background: "var(--card)" }}
        >
          <Image
            src={getPosterUrl(result.poster_path)}
            alt={title}
            fill
            sizes="160px"
            className="object-cover"
            priority={false}
          />

          {/* Overlay gradient on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)",
            }}
          />

          {/* Media type badge */}
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(4px)",
              color: "#ffffff",
            }}
          >
            {isMovie ? (
              <>
                <Film size={12} />
                Movie
              </>
            ) : (
              <>
                <Tv size={12} />
                TV
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-3 px-1">
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
        </div>
      </div>
    </Link>
  );
}
