import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { tmdbService, TMDBResult, searchTMDBAll, getPosterUrl } from "@/lib/tmdb";
import ShowCard from "@/components/ShowCard";
import { Search, TrendingUp, Film, Tv, Globe, Star, Clock, Play } from "lucide-react";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();
  const [trendingTV, setTrendingTV] = useState<TMDBResult[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBResult[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBResult[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBResult[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBResult[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<TMDBResult[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<TMDBResult[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TMDBResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingFor, setSearchingFor] = useState("");
  const [filterMovies, setFilterMovies] = useState(true);
  const [filterTV, setFilterTV] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [tv, movies, popular, popTV, topMovies, topTV, upcoming, nowPlaying] = await Promise.all([
        tmdbService.getTrendingTVShows("week"),
        tmdbService.getTrendingMovies("week"),
        tmdbService.getPopularMovies(),
        tmdbService.getPopularTV(),
        tmdbService.getTopRatedMovies(),
        tmdbService.getTopRatedTV(),
        tmdbService.getUpcomingMovies(),
        tmdbService.getNowPlayingMovies(),
      ]);
      setTrendingTV(tv.slice(0, 15));
      setTrendingMovies(movies.slice(0, 15));
      setPopularMovies(popular.slice(0, 15));
      setPopularTV(popTV.slice(0, 15));
      setTopRatedMovies(topMovies.slice(0, 15));
      setTopRatedTV(topTV.slice(0, 15));
      setUpcomingMovies(upcoming.slice(0, 15));
      setNowPlayingMovies(nowPlaying.slice(0, 15));
      setLoading(false);
    };
    load();
  }, []);

  // Debounced search for suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingFor(searchQuery);
      const results = await searchTMDBAll(searchQuery);
      if (searchQuery === searchingFor || results.length > 0) {
        const filtered = results.filter((item) => {
          if (filterMovies && filterTV) return true;
          if (filterMovies && item.media_type === "movie") return true;
          if (filterTV && item.media_type === "tv") return true;
          return false;
        });
        setSuggestions(filtered.slice(0, 6));
        setShowSuggestions(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filterMovies, filterTV]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = useCallback((item: TMDBResult) => {
    setShowSuggestions(false);
    setSearchQuery("");
    router.push(`/details/${item.id}?type=${item.media_type}`);
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams();
      params.set("query", searchQuery.trim());
      if (filterMovies && !filterTV) params.set("type", "movie");
      if (filterTV && !filterMovies) params.set("type", "tv");
      router.push(`/search?${params.toString()}`);
    }
  };

  const MediaRow = ({
    title,
    icon,
    items,
  }: {
    title: string;
    icon: React.ReactNode;
    items: TMDBResult[];
  }) => (
    <section className="mb-10 fade-in">
      <div className="px-6 mb-4">
        <h2 className="section-title">
          {icon}
          {title}
        </h2>
      </div>
      <div className="media-row">
        <div
          className="scroll-container flex gap-4 overflow-x-auto px-6 pb-4"
        >
          {items.map((item) => (
            <ShowCard key={item.id} result={item} />
          ))}
        </div>
      </div>
    </section>
  );

  const SkeletonRow = () => (
    <section className="mb-10">
      <div className="px-6 mb-4">
        <div className="skeleton h-8 w-48" />
      </div>
      <div className="flex gap-4 overflow-hidden px-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0">
            <div className="skeleton w-[160px] h-[240px] rounded-xl" />
            <div className="skeleton h-4 w-32 mt-3" />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="page-container">
      {/* Hero Section */}
      <div className="relative overflow-x-clip overflow-y-visible">
        {/* Background gradient */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(ellipse at top, rgba(59, 130, 246, 0.3) 0%, transparent 60%)",
          }}
        />

        <div className="relative px-6 pt-6 pb-12">
          {/* Hero content */}
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Find where to{" "}
              <span className="gradient-text">stream anything</span>
            </h2>
            <p className="text-base mb-6" style={{ color: "var(--muted)" }}>
              Search across all streaming platforms worldwide. Set your preferred countries and never miss where to watch.
            </p>

            {/* Search bar */}
            <div ref={searchRef} className="relative max-w-xl mx-auto">
              <form onSubmit={handleSearch} className="search-input-wrapper">
                <Search
                  className="search-icon"
                  style={{ color: "var(--muted)" }}
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search movies, TV shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="search-input with-icon"
                />
              </form>

              {/* Filter checkboxes */}
              <div className="flex justify-center gap-6 mt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterMovies}
                    onChange={(e) => setFilterMovies(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <Film size={16} style={{ color: filterMovies ? "var(--accent)" : "var(--muted)" }} />
                  <span className="text-sm" style={{ color: filterMovies ? "var(--foreground)" : "var(--muted)" }}>
                    Movies
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterTV}
                    onChange={(e) => setFilterTV(e.target.checked)}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <Tv size={16} style={{ color: filterTV ? "#8b5cf6" : "var(--muted)" }} />
                  <span className="text-sm" style={{ color: filterTV ? "var(--foreground)" : "var(--muted)" }}>
                    TV Shows
                  </span>
                </label>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden overflow-y-auto z-50 shadow-2xl"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "400px" }}
                >
                  {suggestions.map((item) => (
                    <button
                      key={`${item.id}-${item.media_type}`}
                      onClick={() => handleSuggestionClick(item)}
                      className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                      style={{ background: "transparent" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--card-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {item.poster_path ? (
                        <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={getPosterUrl(item.poster_path, "w92")}
                            alt={item.title || item.name || ""}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-10 h-14 rounded flex-shrink-0 flex items-center justify-center"
                          style={{ background: "var(--border)" }}
                        >
                          <Film size={16} style={{ color: "var(--muted)" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.title || item.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {item.media_type === "movie" ? "Movie" : "TV Show"}
                          {(item.release_date || item.first_air_date) && (
                            <> · {(item.release_date || item.first_air_date)?.split("-")[0]}</>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Globe size={18} style={{ color: "var(--accent)" }} />
                <span className="text-2xl font-bold">190+</span>
              </div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Countries</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Film size={18} style={{ color: "var(--accent)" }} />
                <span className="text-2xl font-bold">500K+</span>
              </div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Movies</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Tv size={18} style={{ color: "var(--accent)" }} />
                <span className="text-2xl font-bold">150K+</span>
              </div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>TV Shows</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <>
            <MediaRow
              title="Trending Movies"
              icon={<TrendingUp size={24} style={{ color: "var(--accent)" }} />}
              items={trendingMovies}
            />
            <MediaRow
              title="Trending TV Shows"
              icon={<TrendingUp size={24} style={{ color: "#8b5cf6" }} />}
              items={trendingTV}
            />
            <MediaRow
              title="Now Playing"
              icon={<Play size={24} style={{ color: "#10b981" }} />}
              items={nowPlayingMovies}
            />
            <MediaRow
              title="Popular Movies"
              icon={<Film size={24} style={{ color: "#ec4899" }} />}
              items={popularMovies}
            />
            <MediaRow
              title="Popular TV Shows"
              icon={<Tv size={24} style={{ color: "#f59e0b" }} />}
              items={popularTV}
            />
            <MediaRow
              title="Top Rated Movies"
              icon={<Star size={24} style={{ color: "#eab308" }} />}
              items={topRatedMovies}
            />
            <MediaRow
              title="Top Rated TV Shows"
              icon={<Star size={24} style={{ color: "#22d3ee" }} />}
              items={topRatedTV}
            />
            <MediaRow
              title="Upcoming Movies"
              icon={<Clock size={24} style={{ color: "#a855f7" }} />}
              items={upcomingMovies}
            />
          </>
        )}
      </div>
    </div>
  );
}
