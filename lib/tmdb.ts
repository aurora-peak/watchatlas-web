export type TMDBResult = {
  id: number;
  name?: string;
  title?: string;
  media_type: "movie" | "tv";
  poster_path: string | null;
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
};

export async function searchTMDBAll(query: string): Promise<TMDBResult[]> {
  const encoded = encodeURIComponent(query);
  const response = await fetch(`/api/tmdb/search?query=${encoded}`);

  if (!response.ok) {
    console.error("Search API error:", response.status);
    return [];
  }

  const data = await response.json();
  return data.results || [];
}

export function getPosterUrl(path: string | null, size: string = "w500"): string {
  return path
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : "/placeholder.png";
}

export async function getTrendingMovies(period: "day" | "week"): Promise<TMDBResult[]> {
  const response = await fetch(`/api/tmdb/trending?type=movie&period=${period}`);

  if (!response.ok) {
    console.error("Trending movies API error:", response.status);
    return [];
  }

  const data = await response.json();
  return data.results || [];
}

export async function getTrendingTVShows(period: "day" | "week"): Promise<TMDBResult[]> {
  const response = await fetch(`/api/tmdb/trending?type=tv&period=${period}`);

  if (!response.ok) {
    console.error("Trending TV API error:", response.status);
    return [];
  }

  const data = await response.json();
  return data.results || [];
}

export async function getPopularMovies(): Promise<TMDBResult[]> {
  const response = await fetch(`/api/tmdb/popular?type=movie`);

  if (!response.ok) {
    console.error("Popular movies API error:", response.status);
    return [];
  }

  const data = await response.json();
  return data.results || [];
}

export const tmdbService = {
  searchAll: searchTMDBAll,
  getPosterUrl,
  getTrendingMovies,
  getTrendingTVShows,
  getPopularMovies,
};
