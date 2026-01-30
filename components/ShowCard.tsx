"use client";

import Link from "next/link";
import Image from "next/image";
import { TMDBResult, getPosterUrl } from "@/lib/tmdb";

type Props = {
  result: TMDBResult;
};

export default function ShowCard({ result }: Props) {
  const title = result.name || result.title || "Untitled";

  return (
    <div
      style={{
        width: 150,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#111",
        transition: "transform 0.2s",
      }}
      className="hover:scale-105"
    >
      <Link href={`/details/${result.id}?type=${result.media_type}`}>
        <div style={{ width: 150, height: 225, overflow: "hidden" }}>
          <Image
            src={getPosterUrl(result.poster_path)}
            alt={title}
            width={150}
            height={225}
            style={{
              objectFit: "cover",
              display: "block",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </Link>
      <div style={{ padding: "8px 10px" }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{title}</p>
      </div>
    </div>
  );
}