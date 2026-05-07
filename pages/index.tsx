import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Search, Sparkles, Film, Bot, Tv, ArrowRight } from "lucide-react";
import ShowCard from "@/components/ShowCard";
import { searchTMDBAll, TMDBResult, getPosterUrl } from "@/lib/tmdb";
import { AIRecommendation } from "@/lib/gemini";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();

  // --- Search Bar State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TMDBResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // --- AI Discovery State ---
  const [aiPrompt, setAiPrompt] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [aiResults, setAiResults] = useState<{ rec: AIRecommendation; tmdb: TMDBResult | null }[]>([]);
  const [hasDiscovered, setHasDiscovered] = useState(false);
  const [error, setError] = useState("");

  // Debounced search for floating bar suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchTMDBAll(searchQuery);
      setSuggestions(results.slice(0, 5));
      setShowSuggestions(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      router.push(`/browse?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleDiscover = async () => {
    if (!aiPrompt.trim()) return;

    setIsDiscovering(true);
    setHasDiscovered(true);
    setAiResults([]);
    setError("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "AI Request failed");
      }

      const recs: AIRecommendation[] = data.recommendations;

      // Hydrate with TMDB Data
      const hydratedResults = await Promise.all(
        recs.map(async (rec) => {
          // Search TMDB for the title and year to get the best match
          const tmdbSearch = await searchTMDBAll(`${rec.title} ${rec.year}`);
          
          // Filter to match media type, fallback to first result if no type match
          let bestMatch = tmdbSearch.find(r => r.media_type === rec.type);
          if (!bestMatch && tmdbSearch.length > 0) {
              bestMatch = tmdbSearch[0];
          }

          return { rec, tmdb: bestMatch || null };
        })
      );

      setAiResults(hydratedResults);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong getting recommendations.");
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div className="page-container relative min-h-screen pb-24">
      {/* Floating Search Bar (Fixed at Top) */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 px-4 pt-6 pb-4 pointer-events-none transition-all duration-300"
        style={{
          background: "linear-gradient(to bottom, var(--background) 40%, transparent 100%)",
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="search-input with-icon"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 24px -6px rgba(0,0,0,0.2)"
              }}
            />
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
                   onClick={() => router.push(`/browse?query=${encodeURIComponent(searchQuery)}`)}
                   className="w-full text-center text-sm py-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                 >
                   See all results
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Hero Section */}
      <div className="pt-32 px-6 flex flex-col items-center justify-center fade-in">
        <div className="max-w-3xl w-full text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium mb-6">
            <Sparkles size={16} />
            <span>AI Concierge Powered by Gemini</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight leading-tight">
            What are you in the <br/>
            <span className="gradient-text">mood for today?</span>
          </h1>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
            Describe what you want to watch in plain English, and our AI will curate the perfect streaming list for you.
          </p>

          {/* AI Input Area */}
          <div className="relative max-w-2xl mx-auto">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., A visually stunning sci-fi movie with a huge plot twist..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg min-h-[140px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
              style={{ color: "var(--foreground)" }}
            />
            <div className="absolute bottom-4 right-4">
              <button
                onClick={handleDiscover}
                disabled={isDiscovering || !aiPrompt.trim()}
                className="btn-primary rounded-xl px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {isDiscovering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Bot size={18} />
                    <span>Discover</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI Results Section */}
        {hasDiscovered && (
          <div className="w-full max-w-4xl mx-auto mt-8 slide-up">
            {isDiscovering ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 text-blue-400">
                  <Sparkles size={24} className="animate-pulse" />
                  <span className="text-lg font-medium">Curating your personalized list...</span>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            ) : aiResults.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="text-blue-400" />
                  Your Top Picks
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResults.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 hover:bg-white/10 transition-colors">
                      {item.tmdb ? (
                        <div className="flex-shrink-0 transform scale-90 -mt-2 -ml-2 origin-top-left">
                           <ShowCard result={item.tmdb} />
                        </div>
                      ) : (
                        <div className="w-[120px] h-[180px] bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Film className="text-white/20" size={32} />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0 py-2">
                        <h3 className="font-bold text-lg leading-tight mb-1">{item.rec.title}</h3>
                        <p className="text-sm text-blue-400/80 mb-3 font-medium flex items-center gap-2">
                          {item.rec.type === "movie" ? <Film size={14} /> : <Tv size={14} />}
                          {item.rec.year}
                        </p>
                        <p className="text-sm text-white/60 leading-relaxed line-clamp-4">
                          "{item.rec.reason}"
                        </p>
                        
                        {item.tmdb && (
                           <button 
                             onClick={() => router.push(`/details/${item.tmdb?.id}?type=${item.tmdb?.media_type}`)}
                             className="mt-4 text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white flex items-center gap-1 transition-colors"
                           >
                             View Details <ArrowRight size={12} />
                           </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
