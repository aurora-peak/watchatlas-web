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
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY; // ✅ FIXED
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

  return combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

export function getPosterUrl(path: string | null, size: string = "w500"): string {
  return path
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : "/placeholder.png";
}

export async function getTMDBCategoryResults(endpoint: string): Promise<TMDBResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const url = `${API_BASE}/${endpoint}?api_key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.results || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    title: item.title,
    media_type: item.media_type || (endpoint.includes('movie') ? 'movie' : 'tv'),
    poster_path: item.poster_path,
    popularity: item.popularity,
  }));
}