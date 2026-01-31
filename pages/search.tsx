import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { searchTMDBAll, TMDBResult } from "@/lib/tmdb";
import ShowCard from "@/components/ShowCard";
import { Search, X } from "lucide-react";

export default function SearchPage() {
  const router = useRouter();
  const { query } = router.query;

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<TMDBResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof query === "string") {
      setSearchInput(query);
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const data = await searchTMDBAll(searchQuery);
    setResults(data);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchInput.trim())}`, undefined, { shallow: true });
      performSearch(searchInput.trim());
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
      <form onSubmit={handleSearch} className="relative max-w-2xl mb-8">
        <Search
          className="absolute left-5 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted)" }}
          size={20}
        />
        <input
          type="text"
          placeholder="Search movies, TV shows..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-input pl-14 pr-12"
        />
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
          >
            <X size={18} style={{ color: "var(--muted)" }} />
          </button>
        )}
      </form>

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
