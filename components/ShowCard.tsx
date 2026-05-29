"use client";

import { TMDBResult } from "@/lib/tmdb";
import { Film, Tv } from "lucide-react";
import PosterCard from "./PosterCard";

type Props = {
  result: TMDBResult;
};

export default function ShowCard({ result }: Props) {
  const title = result.name || result.title || "Untitled";
  const year = result.release_date?.split("-")[0] || result.first_air_date?.split("-")[0];
  const isMovie = result.media_type === "movie";

  const badge = (
    <span
      className="px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        color: "#ffffff",
      }}
    >
      {isMovie ? <Film size={12} /> : <Tv size={12} />}
      {isMovie ? "Movie" : "TV"}
    </span>
  );

  return (
    <PosterCard
      id={result.id}
      mediaType={result.media_type}
      title={title}
      posterPath={result.poster_path}
      year={year}
      badge={badge}
      variant="carousel"
    />
  );
}
