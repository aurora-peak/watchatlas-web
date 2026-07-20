// pages/details/[id].tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { getPosterUrl } from "@/lib/tmdb";
import { getCountryMeta } from "@/lib/countries";
import { getDisplayCountries } from "@/lib/getDisplayCountries";
import { splitProvidersByPreference, buildProviderDisplayTiers } from "@/lib/providerPreferences";
import { ArrowLeft, Star, Calendar, ExternalLink, ChevronDown } from "lucide-react";

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

export default function DetailsPage() {
  const router = useRouter();
  const { id, type } = router.query;
  const { preferences } = useAuth();

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
  const [error, setError] = useState("");
  const [expandedContinents, setExpandedContinents] = useState<Record<string, boolean>>({});

  const favoriteCountries = preferences?.favoriteCountries ?? null;
  const favoriteServices = preferences?.favoriteServices ?? [];

  useEffect(() => {
    if (!id || !type) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const [metaRes, provRes] = await Promise.all([
          fetch(`/api/tmdb/details?id=${id}&type=${type}`),
          fetch(`/api/tmdb/providers?id=${id}&type=${type}`),
        ]);

        if (!metaRes.ok) {
          throw new Error(`Details request failed with status ${metaRes.status}`);
        }

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

        if (provRes.ok) {
          const provData = await provRes.json();
          setProviders(provData.results || {});
        } else {
          setProviders({});
        }
      } catch (err) {
        console.error("Failed to load details:", err);
        setError("We couldn't load this title right now.");
        setProviders({});
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type]);

  const countriesToShow = favoriteCountries
    ? getDisplayCountries(providers, favoriteCountries)
    : Object.keys(providers);

  const groupedByContinent: Record<string, string[]> = {};
  countriesToShow.forEach((code) => {
    const meta = getCountryMeta(code);
    const continent = meta?.continent || "Other";
    if (!groupedByContinent[continent]) groupedByContinent[continent] = [];
    groupedByContinent[continent].push(code);
  });

  const toggleContinent = (continent: string) => {
    setExpandedContinents((prev) => ({
      ...prev,
      [continent]: prev[continent] === undefined ? false : !prev[continent],
    }));
  };

  const isContinentExpanded = (continent: string) => {
    return expandedContinents[continent] !== false;
  };

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

  if (error) {
    return (
      <div className="page-container flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3">Title unavailable</h1>
          <p className="mb-6" style={{ color: "var(--muted)" }}>{error}</p>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-105"
            style={{ background: "var(--foreground)", color: "var(--background)" }}
          >
            Back to Browse
          </button>
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

        {/* Streaming Availability */}
        <div>
          <h2 className="text-xl font-bold mb-6">Where to Watch</h2>

          {countriesToShow.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--muted)" }}>
                No streaming availability found for your selected countries.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByContinent)
                .sort(([a], [b]) => {
                  const isALast = a === "Other" || a === "Undefined";
                  const isBLast = b === "Other" || b === "Undefined";
                  if (isALast && !isBLast) return 1;
                  if (isBLast && !isALast) return -1;
                  return a.localeCompare(b);
                })
                .map(([continent, codes]) => (
                <div key={continent}>
                  <button
                    onClick={() => toggleContinent(continent)}
                    className="w-full flex items-center justify-between py-3 px-4 rounded-xl mb-3 transition-colors"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--card-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--card)"}
                  >
                    <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                      {continent}
                      <span className="ml-2 text-sm font-normal" style={{ color: "var(--muted)" }}>
                        ({codes.length} {codes.length === 1 ? "country" : "countries"})
                      </span>
                    </h3>
                    <ChevronDown
                      size={20}
                      style={{
                        color: "var(--muted)",
                        transform: isContinentExpanded(continent) ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </button>
                  <div
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: isContinentExpanded(continent) ? "2000px" : "0",
                      opacity: isContinentExpanded(continent) ? 1 : 0,
                      marginBottom: isContinentExpanded(continent) ? "1rem" : "0",
                    }}
                  >
                    {codes.map((code) => {
                      const countryData = providers[code];
                      const countryMeta = getCountryMeta(code);

                      return (
                        <div
                          key={code}
                          className="rounded-xl p-4"
                          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                        >
                          <h4 className="font-semibold mb-3">
                            {countryMeta?.flag} {countryMeta?.name || code}
                          </h4>

                          {!(countryData?.flatrate?.length || countryData?.rent?.length || countryData?.buy?.length) ? (
                            <p className="text-sm" style={{ color: "var(--muted)" }}>
                              No availability found.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {countryData?.flatrate?.length > 0 && (() => {
                                const { preferred, others } = splitProvidersByPreference(
                                  countryData.flatrate as Provider[],
                                  favoriteServices
                                );
                                const tiers = buildProviderDisplayTiers(preferred, others);

                                return (
                                  <div className="space-y-3">
                                    {tiers.map((tier) => (
                                      <div key={tier.label}>
                                        <h5
                                          className="text-xs font-semibold uppercase mb-2"
                                          style={{ color: "var(--accent)" }}
                                        >
                                          {tier.label}
                                        </h5>
                                        <div className="flex flex-wrap gap-2">
                                          {tier.items.map((p: Provider) => (
                                            <div
                                              key={p.provider_name}
                                              className="relative w-10 h-10 rounded-lg overflow-hidden"
                                              title={p.provider_name}
                                              style={
                                                tier.label === "Your services"
                                                  ? { boxShadow: "0 0 0 2px var(--accent)" }
                                                  : undefined
                                              }
                                            >
                                              <Image
                                                src={getPosterUrl(p.logo_path, "w92")}
                                                alt={p.provider_name}
                                                fill
                                                className="object-cover"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}

                              {countryData?.rent?.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--rent)" }}>
                                    Rent
                                  </h5>
                                  <div className="flex flex-wrap gap-2">
                                    {countryData.rent.map((p: Provider) => (
                                      <div
                                        key={p.provider_name}
                                        className="relative w-10 h-10 rounded-lg overflow-hidden"
                                        title={p.provider_name}
                                      >
                                        <Image
                                          src={getPosterUrl(p.logo_path, "w92")}
                                          alt={p.provider_name}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {countryData?.buy?.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--buy)" }}>
                                    Buy
                                  </h5>
                                  <div className="flex flex-wrap gap-2">
                                    {countryData.buy.map((p: Provider) => (
                                      <div
                                        key={p.provider_name}
                                        className="relative w-10 h-10 rounded-lg overflow-hidden"
                                        title={p.provider_name}
                                      >
                                        <Image
                                          src={getPosterUrl(p.logo_path, "w92")}
                                          alt={p.provider_name}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
