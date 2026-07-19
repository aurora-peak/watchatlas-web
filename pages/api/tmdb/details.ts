import type { NextApiRequest, NextApiResponse } from "next";

const API_BASE = "https://api.themoviedb.org/3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, type } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID is required" });
  }

  if (!type || (type !== "movie" && type !== "tv")) {
    return res.status(400).json({ error: "Type must be 'movie' or 'tv'" });
  }

  // Prefer server-only key, fallback to public key during transition
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  try {
    const url = `${API_BASE}/${type}/${id}?api_key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch details" });
    }

    const data = await response.json();

    // Cache for 1 hour (details don't change often)
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json(data);
  } catch (error) {
    console.error("TMDB details error:", error);
    return res.status(500).json({ error: "Failed to fetch details" });
  }
}
