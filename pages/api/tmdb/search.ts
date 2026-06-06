import type { NextApiRequest, NextApiResponse } from "next";

const API_BASE = "https://api.themoviedb.org/3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.query;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  // Prefer server-only key, fallback to public key during transition
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  try {
    const encoded = encodeURIComponent(query);
    const tvUrl = `${API_BASE}/search/tv?api_key=${apiKey}&query=${encoded}`;
    const movieUrl = `${API_BASE}/search/movie?api_key=${apiKey}&query=${encoded}`;

    const [tvRes, movieRes] = await Promise.all([fetch(tvUrl), fetch(movieUrl)]);

    if (!tvRes.ok || !movieRes.ok) {
      const status = !tvRes.ok ? tvRes.status : movieRes.status;
      return res.status(status).json({ error: "Failed to search TMDB" });
    }

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

    const results = [...tvResults, ...movieResults].sort(
      (a, b) => (b.popularity || 0) - (a.popularity || 0)
    );

    // Cache for 5 minutes
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    return res.status(200).json({ results });
  } catch (error) {
    console.error("TMDB search error:", error);
    return res.status(500).json({ error: "Failed to search TMDB" });
  }
}
