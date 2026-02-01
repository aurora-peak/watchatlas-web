import { useRouter } from "next/router";
import { useEffect, useState, useRef, useCallback } from "react";
import { searchTMDBAll, TMDBResult, getPosterUrl } from "@/lib/tmdb";
import ShowCard from "@/components/ShowCard";
import { Search, X, Film, Tv } from "lucide-react";
import Image from "next/image";

export default function SearchPage() {
  const router = useRouter();
  const { query, type } = router.query;

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<TMDBResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TMDBResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterMovies, setFilterMovies] = useState(true);
  const [filterTV, setFilterTV] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

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
    setLoading(true);
    const data = await searchTMDBAll(searchQuery);
    const filtered = data.filter((item) => {
      if (movies && tv) return true;
      if (movies && item.media_type === "movie") return true;
      if (tv && item.media_type === "tv") return true;
      return false;
    });
    setResults(filtered);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const params = new URLSearchParams();
      params.set("query", searchInput.trim());
      if (filterMovies && !filterTV) params.set("type", "movie");
      if (filterTV && !filterMovies) params.set("type", "tv");
      router.push(`/search?${params.toString()}`, undefined, { shallow: true });
      performSearch(searchInput.trim());
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

  return (
    <div className="page-container px-6 pt-8 fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Search</h1>
        <p style={{ color: "var(--muted)" }}>
          Find movies and TV shows across all streaming platforms
        </p>
      </div>

      {/* Search bar */}
      <div ref={searchRef} className="relative max-w-2xl mb-8">
        <form onSubmit={handleSearch} className="search-input-wrapper">
          <Search
            className="search-icon"
            style={{ color: "var(--muted)" }}
            size={20}
          />
          <input
            type="text"
            placeholder="Search movies, TV shows..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className={`search-input with-icon ${searchInput ? "with-clear" : ""}`}
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-icon rounded-full z-10 transition-colors p-1"
              style={{ background: "transparent" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--card-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <X size={20} style={{ color: "var(--muted)" }} />
            </button>
          )}
        </form>

        {/* Filter checkboxes */}
        <div className="flex gap-6 mt-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterMovies}
              onChange={(e) => handleFilterChange(e.target.checked, filterTV)}
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
              onChange={(e) => handleFilterChange(filterMovies, e.target.checked)}
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

      {/* Results */}
      {query && (
        <div className="mb-6">
          <p style={{ color: "var(--muted)" }}>
            {loading ? (
              "Searching..."
            ) : results ? (
              <>
                Found <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{results.length}</span> results for{" "}
                <span style={{ color: "var(--foreground)", fontWeight: 600 }}>"{query}"</span>
              </>
            ) : null}
          </p>
        </div>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : results && results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {results.map((r) => (
            <ShowCard key={r.id} result={r} />
          ))}
        </div>
      ) : results && results.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "var(--card)" }}
          >
            <Search size={32} style={{ color: "var(--muted)" }} />
          </div>
          <h3 className="text-xl font-semibold mb-2">No results found</h3>
          <p style={{ color: "var(--muted)" }}>
            Try searching for something else
          </p>
        </div>
      ) : !query ? (
        <div className="text-center py-16">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: "var(--card)" }}
          >
            <Search size={32} style={{ color: "var(--muted)" }} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Start searching</h3>
          <p style={{ color: "var(--muted)" }}>
            Enter a movie or TV show name above
          </p>
        </div>
      ) : null}
    </div>
  );
}
