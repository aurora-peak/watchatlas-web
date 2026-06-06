import type { NextApiRequest, NextApiResponse } from "next";

const API_BASE = "https://api.themoviedb.org/3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, period } = req.query;

  if (!type || (type !== "movie" && type !== "tv")) {
    return res.status(400).json({ error: "Type must be 'movie' or 'tv'" });
  }

  if (!period || (period !== "day" && period !== "week")) {
    return res.status(400).json({ error: "Period must be 'day' or 'week'" });
  }

  // Prefer server-only key, fallback to public key during transition
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  try {
    const url = `${API_BASE}/trending/${type}/${period}?api_key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch trending" });
    }

    const data = await response.json();

    const results = (data.results || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      title: item.title,
      media_type: type,
      poster_path: item.poster_path,
      popularity: item.popularity,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
    }));

    // Cache for 10 minutes
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
    return res.status(200).json({ results });
  } catch (error) {
    console.error("TMDB trending error:", error);
    return res.status(500).json({ error: "Failed to fetch trending" });
  }
}
