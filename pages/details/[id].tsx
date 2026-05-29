// pages/details/[id].tsx

import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { useRegion } from "@/lib/RegionContext";
import { getPosterUrl } from "@/lib/tmdb";
import { ArrowLeft, Star, Calendar, ExternalLink } from "lucide-react";
import AvailabilityMatrix from "@/components/AvailabilityMatrix";

function regionOptionCount(d: { flatrate?: any[]; rent?: any[]; buy?: any[]; free?: any[]; ads?: any[] }): number {
  return (
    (d.flatrate?.length ?? 0) +
    (d.rent?.length ?? 0) +
    (d.buy?.length ?? 0) +
    (d.free?.length ?? 0) +
    (d.ads?.length ?? 0)
  );
}

export default function DetailsPage() {
  const router = useRouter();
  const { id, type } = router.query;
  const { user, preferences, updatePreferences } = useAuth();
  const { region } = useRegion();

  const [title, setTitle] = useState("");
  const [poster, setPoster] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const [overview, setOverview] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [homepage, setHomepage] = useState("");
  const [tagline, setTagline] = useState("");
  const [providers, setProviders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Pinned regions for the availability comparator.
  const [pinned, setPinned] = useState<string[]>([]);
  const pinnedInitialized = useRef(false);

  useEffect(() => {
    if (!id || !type) return;

    const fetchDetails = async () => {
      setLoading(true);
      pinnedInitialized.current = false;

      const [metaRes, provRes] = await Promise.all([
        fetch(`/api/tmdb/details?id=${id}&type=${type}`),
        fetch(`/api/tmdb/providers?id=${id}&type=${type}`),
      ]);

      if (metaRes.ok) {
        const meta = await metaRes.json();
        setTitle(meta.name || meta.title || "Untitled");
        setPoster(meta.poster_path);
        setBackdrop(meta.backdrop_path);
        setOverview(meta.overview || "");
        setReleaseDate(meta.first_air_date || meta.release_date || "");
        setRating(meta.vote_average || null);
        setGenres(meta.genres?.map((g: { name: string }) => g.name) || []);
        setHomepage(meta.homepage || "");
        setTagline(meta.tagline || "");
      }

      if (provRes.ok) {
        const provData = await provRes.json();
        setProviders(provData.results || {});
      }

      setLoading(false);
    };

    fetchDetails();
  }, [id, type]);

  // Seed the pinned-region set once per title: prefer the user's saved set,
  // else the active region + their favorite countries, else the regions with
  // the most availability for this title. Always include the active region.
  useEffect(() => {
    if (loading || pinnedInitialized.current) return;

    let seed: string[] = [];
    if (preferences?.pinnedRegions?.length) {
      seed = [...preferences.pinnedRegions];
    } else if (preferences?.favoriteCountries?.length) {
      seed = [region, ...preferences.favoriteCountries];
    }

    let result = Array.from(new Set(seed.map((c) => c.toUpperCase()).filter(Boolean)));

    if (result.length === 0) {
      result = Object.entries(providers)
        .map(([code, d]) => [code, regionOptionCount(d)] as const)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code]) => code);
    }

    if (region && !result.includes(region.toUpperCase())) {
      result.unshift(region.toUpperCase());
    }
    if (result.length === 0) result = ["US"];

    setPinned(result.slice(0, 8));
    pinnedInitialized.current = true;
  }, [loading, providers, preferences, region]);

  const persistPinned = (next: string[]) => {
    setPinned(next);
    updatePreferences({ pinnedRegions: next });
  };
  const addRegion = (code: string) => {
    const c = code.toUpperCase();
    if (!pinned.includes(c)) persistPinned([...pinned, c]);
  };
  const removeRegion = (code: string) => persistPinned(pinned.filter((c) => c !== code));

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="skeleton w-16 h-16 rounded-full mx-auto mb-4" />
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      {/* Backdrop */}
      {backdrop && (
        <div
          className="fixed inset-0 -z-10"
          style={{
            backgroundImage: `url(${getPosterUrl(backdrop, "w1280")})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px) brightness(0.3)",
          }}
        />
      )}

      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-105 w-fit shadow-xl shadow-black/30"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          <ArrowLeft size={18} />
          Back to Browse
        </button>
      </div>

      {/* Content */}
      <div className="px-6 pb-8 pt-2">
        {/* Hero section with poster and info */}
        <div className="flex flex-col md:flex-row gap-8 mb-10">
          {/* Poster */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            {poster ? (
              <div className="relative w-[200px] h-[300px] rounded-xl overflow-hidden shadow-2xl">
                <Image
                  src={getPosterUrl(poster)}
                  alt={title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div
                className="w-[200px] h-[300px] rounded-xl flex items-center justify-center"
                style={{ background: "var(--card)" }}
              >
                <span style={{ color: "var(--muted)" }}>No Poster</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>

            {tagline && (
              <p className="text-lg italic mb-4" style={{ color: "var(--muted)" }}>
                "{tagline}"
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
              {releaseDate && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} style={{ color: "var(--accent)" }} />
                  <span className="text-sm">{releaseDate}</span>
                </div>
              )}
              {rating !== null && (
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm">{rating.toFixed(1)}/10</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {overview && (
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
                {overview}
              </p>
            )}

            {/* Homepage link */}
            {homepage && (
              <a
                href={homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium"
                style={{ color: "var(--accent)" }}
              >
                <ExternalLink size={16} />
                Official Website
              </a>
            )}
          </div>
        </div>

        {/* Where to watch — multi-region comparator */}
        <div>
          <h2 className="text-xl font-bold mb-1">Where to watch</h2>
          <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
            Compare availability across regions
          </p>

          {Object.keys(providers).length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--muted)" }}>
                No streaming availability data found for this title.
              </p>
            </div>
          ) : (
            <AvailabilityMatrix
              providers={providers}
              pinnedRegions={pinned}
              onAddRegion={addRegion}
              onRemoveRegion={removeRegion}
            />
          )}
        </div>
      </div>
    </div>
  );
}
