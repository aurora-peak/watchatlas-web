import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Search, X, Film, Tv, TrendingUp, Star, Clock, Play, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ShowCard from "@/components/ShowCard";
import { tmdbService, searchTMDBAll, TMDBResult, getPosterUrl } from "@/lib/tmdb";
import { useAuth } from "@/lib/AuthContext";
import { buildDiscoverQuery } from "@/lib/preferences";

export default function HomePage() {
  const router = useRouter();
  const { query, type } = router.query;

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<TMDBResult[] | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [suggestions, setSuggestions] = useState<TMDBResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterMovies, setFilterMovies] = useState(true);
  const [filterTV, setFilterTV] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  // Browse lists states
  const [trendingTV, setTrendingTV] = useState<TMDBResult[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBResult[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBResult[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBResult[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBResult[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<TMDBResult[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<TMDBResult[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<TMDBResult[]>([]);
  const [loadingBrowse, setLoadingBrowse] = useState(true);

  const { user, preferences } = useAuth();
  const [onMyServices, setOnMyServices] = useState<TMDBResult[]>([]);

  // Load browse lists on mount
  useEffect(() => {
    const loadBrowse = async () => {
      setLoadingBrowse(true);
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
      setLoadingBrowse(false);
    };
    loadBrowse();
  }, []);

  // Personalized row. Deliberately silent on every failure path: if the user is
  // signed out, has no services, or the request fails, the row simply does not
  // render — the home page never shows an error for it.
  useEffect(() => {
    const query = buildDiscoverQuery(user, preferences);

    if (!query) {
      setOnMyServices([]);
      return;
    }

    let cancelled = false;

    fetch(query)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: { results: TMDBResult[] }) => {
        if (!cancelled) setOnMyServices(data.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setOnMyServices([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user, preferences?.favoriteCountries, preferences?.favoriteServices]);

  // Initialize filters from URL
  useEffect(() => {
    if (type === "movie") {
      setFilterMovies(true);
      setFilterTV(false);
    } else if (type === "tv") {
      setFilterMovies(false);
      setFilterTV(true);
    } else {
      setFilterMovies(true);
      setFilterTV(true);
    }
  }, [type]);

  useEffect(() => {
    if (typeof query === "string") {
      setSearchInput(query);
      performSearch(query);
      setShowSuggestions(false);
    } else {
      setSearchInput("");
      setResults(null);
    }
  }, [query]);

  // Debounced search for suggestions
  useEffect(() => {
    if (!searchInput.trim() || searchInput.length < 2 || searchInput === query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchTMDBAll(searchInput);
      const filtered = results.filter((item) => {
        if (filterMovies && filterTV) return true;
        if (filterMovies && item.media_type === "movie") return true;
        if (filterTV && item.media_type === "tv") return true;
        return false;
      });
      setSuggestions(filtered.slice(0, 6));
      setShowSuggestions(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, query, filterMovies, filterTV]);

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
    setSearchInput("");
    router.push(`/details/${item.id}?type=${item.media_type}`);
  }, [router]);

  const performSearch = async (searchQuery: string, movies = filterMovies, tv = filterTV) => {
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    const data = await searchTMDBAll(searchQuery);
    const filtered = data.filter((item) => {
      if (movies && tv) return true;
      if (movies && item.media_type === "movie") return true;
      if (tv && item.media_type === "tv") return true;
      return false;
    });
    setResults(filtered);
    setLoadingSearch(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const params = new URLSearchParams();
      params.set("query", searchInput.trim());
      if (filterMovies && !filterTV) params.set("type", "movie");
      if (filterTV && !filterMovies) params.set("type", "tv");
      router.push(`/?${params.toString()}`, undefined, { shallow: true });
      performSearch(searchInput.trim());
      setShowSuggestions(false);
    } else {
      router.push('/', undefined, { shallow: true });
    }
  };

  // Re-run search when filters change
  const handleFilterChange = (movies: boolean, tv: boolean) => {
    setFilterMovies(movies);
    setFilterTV(tv);
    if (query && typeof query === "string") {
      performSearch(query, movies, tv);
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setResults(null);
    router.push('/', undefined, { shallow: true });
  };

  const SkeletonGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i}>
          <div className="skeleton w-full aspect-[2/3] rounded-xl" />
          <div className="skeleton h-4 w-3/4 mt-3" />
          <div className="skeleton h-3 w-1/2 mt-2" />
        </div>
      ))}
    </div>
  );

  const MediaRow = ({ title, icon, items }: { title: string; icon: React.ReactNode; items: TMDBResult[] }) => (
    <section className="mb-10 fade-in">
      <div className="mb-4">
        <h2 className="section-title">
          {icon}
          {title}
        </h2>
      </div>
      <div className="media-row">
        <div className="scroll-container flex gap-4 overflow-x-auto pb-4">
          {items.map((item) => (
            <ShowCard key={`${item.media_type}:${item.id}`} result={item} />
          ))}
        </div>
      </div>
    </section>
  );

  const SkeletonRow = () => (
    <section className="mb-10">
      <div className="mb-4">
        <div className="skeleton h-8 w-48" />
      </div>
      <div className="flex gap-4 overflow-hidden">
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
    <div className="page-container relative min-h-screen pb-12 fade-in">
      {/* Sticky Search Bar */}
      <div 
        className="sticky top-0 z-40 px-4 pt-6 pb-6 mb-8 pointer-events-none transition-all duration-300"
        style={{
          background: "linear-gradient(to bottom, var(--background) 80%, transparent 100%)",
        }}
      >
        <div ref={searchRef} className="max-w-2xl mx-auto relative pointer-events-auto">
          <form onSubmit={handleSearch} className="search-input-wrapper shadow-lg shadow-black/10">
            <Search className="search-icon" style={{ color: "var(--muted)" }} size={20} />
            <input
              type="text"
              placeholder="Search WatchAtlas..."
              aria-label="Search WatchAtlas"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="home-search-suggestions"
              role="combobox"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className={`search-input with-icon ${searchInput ? "with-clear" : ""}`}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 24px -6px rgba(0,0,0,0.2)"
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="clear-icon rounded-full z-10 transition-colors p-1"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--card-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <X size={20} style={{ color: "var(--muted)" }} />
              </button>
            )}
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              id="home-search-suggestions"
              role="listbox"
              className="absolute top-full left-0 right-0 mt-3 rounded-xl overflow-hidden z-50 shadow-2xl"
              style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "300px", overflowY: "auto" }}
            >
              {suggestions.map((item) => (
                <button
                  key={`${item.id}-${item.media_type}`}
                  role="option"
                  onClick={() => handleSuggestionClick(item)}
                  className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-white/5"
                >
                  {item.poster_path ? (
                    <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0">
                      <Image src={getPosterUrl(item.poster_path, "w92")} alt={item.title || item.name || ""} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-14 rounded flex-shrink-0 flex items-center justify-center bg-white/5">
                      <Film size={16} className="text-white/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title || item.name}</p>
                    <p className="text-xs text-white/40">
                      {item.media_type === "movie" ? "Movie" : "TV Show"}
                      {(item.release_date || item.first_air_date) && <> · {(item.release_date || item.first_air_date)?.split("-")[0]}</>}
                    </p>
                  </div>
                </button>
              ))}
              <div className="p-2">
                 <button 
                   onClick={() => {
                      router.push(`/?query=${encodeURIComponent(searchInput)}`);
                      setShowSuggestions(false);
                      performSearch(searchInput);
                   }}
                   className="w-full text-center text-sm py-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                 >
                   See all results
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 pt-6">
        {query ? (
          // Render Search Results
          <>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p style={{ color: "var(--muted)" }}>
                {loadingSearch ? (
                  "Searching..."
                ) : results ? (
                  <>Found <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{results.length}</span> results for <span style={{ color: "var(--foreground)", fontWeight: 600 }}>"{query}"</span></>
                ) : null}
              </p>
              
              {/* Filter checkboxes */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterMovies}
                    onChange={(e) => handleFilterChange(e.target.checked, filterTV)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <Film size={16} style={{ color: filterMovies ? "var(--accent)" : "var(--muted)" }} />
                  <span className="text-sm" style={{ color: filterMovies ? "var(--foreground)" : "var(--muted)" }}>Movies</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterTV}
                    onChange={(e) => handleFilterChange(filterMovies, e.target.checked)}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <Tv size={16} style={{ color: filterTV ? "#8b5cf6" : "var(--muted)" }} />
                  <span className="text-sm" style={{ color: filterTV ? "var(--foreground)" : "var(--muted)" }}>TV Shows</span>
                </label>
              </div>
            </div>

            {loadingSearch ? (
              <SkeletonGrid />
            ) : results && results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.map((r) => (
                  <ShowCard key={r.id} result={r} />
                ))}
              </div>
            ) : results && results.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "var(--card)" }}>
                  <Search size={32} style={{ color: "var(--muted)" }} />
                </div>
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p style={{ color: "var(--muted)" }}>Try searching for something else</p>
              </div>
            ) : null}
          </>
        ) : (
          // Render Browse Lists
          <>
            {loadingBrowse ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              <>
                {onMyServices.length > 0 && (
                  <MediaRow
                    title="On My Services"
                    icon={<Sparkles size={24} style={{ color: "var(--accent)" }} />}
                    items={onMyServices}
                  />
                )}
                <MediaRow title="Trending Movies" icon={<TrendingUp size={24} style={{ color: "var(--accent)" }} />} items={trendingMovies} />
                <MediaRow title="Trending TV Shows" icon={<TrendingUp size={24} style={{ color: "#8b5cf6" }} />} items={trendingTV} />
                <MediaRow title="Now Playing" icon={<Play size={24} style={{ color: "#10b981" }} />} items={nowPlayingMovies} />
                <MediaRow title="Popular Movies" icon={<Film size={24} style={{ color: "#ec4899" }} />} items={popularMovies} />
                <MediaRow title="Popular TV Shows" icon={<Tv size={24} style={{ color: "#f59e0b" }} />} items={popularTV} />
                <MediaRow title="Top Rated Movies" icon={<Star size={24} style={{ color: "#eab308" }} />} items={topRatedMovies} />
                <MediaRow title="Top Rated TV Shows" icon={<Star size={24} style={{ color: "#22d3ee" }} />} items={topRatedTV} />
                <MediaRow title="Upcoming Movies" icon={<Clock size={24} style={{ color: "#a855f7" }} />} items={upcomingMovies} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
