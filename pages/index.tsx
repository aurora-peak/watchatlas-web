import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { tmdbService, TMDBResult } from "@/lib/tmdb";
import ShowCard from "@/components/ShowCard";
import { Search, TrendingUp, Film, Tv, Globe } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [trendingTV, setTrendingTV] = useState<TMDBResult[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBResult[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [tv, movies, popular] = await Promise.all([
        tmdbService.getTrendingTVShows("week"),
        tmdbService.getTrendingMovies("week"),
        tmdbService.getPopularMovies(),
      ]);
      setTrendingTV(tv.slice(0, 15));
      setTrendingMovies(movies.slice(0, 15));
      setPopularMovies(popular.slice(0, 15));
      setLoading(false);
    };
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
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
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(ellipse at top, rgba(59, 130, 246, 0.3) 0%, transparent 60%)",
          }}
        />

        <div className="relative px-6 pt-8 pb-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="WatchAtlas" width={48} height={48} className="rounded-lg" />
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ fontFamily: "Showtime, sans-serif" }}
                >
                  WatchAtlas
                </h1>
              </div>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-white/20"
                  />
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push("/settings")}
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                Sign In
              </button>
            )}
          </div>

          {/* Hero content */}
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Find where to{" "}
              <span className="gradient-text">stream anything</span>
            </h2>
            <p className="text-lg mb-6" style={{ color: "var(--muted)" }}>
              Search across all streaming platforms worldwide. Set your preferred countries and never miss where to watch.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted)" }}
                size={20}
              />
              <input
                type="text"
                placeholder="Search movies, TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input pl-14 pr-4"
              />
            </form>
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
              title="Popular Movies"
              icon={<Film size={24} style={{ color: "#ec4899" }} />}
              items={popularMovies}
            />
          </>
        )}
      </div>
    </div>
  );
}
