const API_BASE = "https://api.themoviedb.org/3";

export type TMDBResult = {
  id: number;
  name?: string;
  title?: string;
  media_type: "movie" | "tv";
  poster_path: string | null;
  popularity?: number;
};

export async function searchTMDBAll(query: string): Promise<TMDBResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  const encoded = encodeURIComponent(query);

  const tvUrl = `${API_BASE}/search/tv?api_key=${apiKey}&query=${encoded}`;
  const movieUrl = `${API_BASE}/search/movie?api_key=${apiKey}&query=${encoded}`;

  const [tvRes, movieRes] = await Promise.all([
    fetch(tvUrl),
    fetch(movieUrl),
  ]);

  const tvData = await tvRes.json();
  const movieData = await movieRes.json();

  const tvResults = (tvData.results || []).map((item: any) => ({
    ...item,
    media_type: "tv",
  }));

  const movieResults = (movieData.results || []).map((item: any) => ({
    ...item,
    media_type: "movie",
  }));

  const combined = [...tvResults, ...movieResults];

  // Sort by popularity descending
  return combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

export function getPosterUrl(path: string | null, size: string = "w500"): string {
  return path
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : "/placeholder.png"; // Fallback image
}