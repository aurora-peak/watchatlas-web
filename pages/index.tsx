import { useEffect, useState } from "react";
import { tmdbService, TMDBResult } from "@/lib/tmdb";
import ShowCard from "@/components/ShowCard";
import Image from "next/image";
import { BarChart2, TrendingUp } from "lucide-react";
import AuthInitializer from "@/components/NavBar";

export default function LandingPage() {
  const [trendingTV, setTrendingTV] = useState<TMDBResult[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [tv, popular] = await Promise.all([
        tmdbService.getTrendingTVShows("week"),
        tmdbService.getPopularMovies(),
      ]);
      setTrendingTV(tv.slice(0, 10));
      setPopularMovies(popular.slice(0, 10));
      setLoading(false);
    };
    load();
  }, []);

  const MediaRow = ({
    title,
    icon,
    items,
  }: {
    title: string;
    icon: React.ReactNode;
    items: TMDBResult[];
  }) => (
    <section className="px-4 mb-10">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
        {icon} {title}
      </h2>
      <div
        className="scroll-container"
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 8,
          paddingLeft: 16,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              flexShrink: 0,
              width: 180,
              height: 270,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ShowCard result={item} />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="grid grid-cols-[120px_1fr_120px] items-center px-4 pt-4 mb-6 h-28 w-full">
        {/* Left: Logo */}




        {/* Right: Google Sign-In */}
        <div className="flex justify-end items-center w-[120px]">
          <AuthInitializer />
        </div>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <p className="text-center">Loading...</p>
        ) : (
          <>
            <MediaRow
              title="Trending Movies"
              icon={<TrendingUp className="text-blue-400 ml-4" style={{ marginLeft: 16 }} />}
              items={popularMovies}
            />
            <MediaRow
              title="Trending TV Shows"
              icon={<TrendingUp className="text-blue-400 ml-4" style={{ marginLeft: 16 }} />}
              items={trendingTV}
            />
          </>
        )}
      </div>
    </div>
  );
}