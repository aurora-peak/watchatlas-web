import type { NextApiRequest, NextApiResponse } from "next";
import { mergeProviderCatalog, parseRegions, type TmdbProviderResponse } from "@/lib/providerCatalog";

const API_BASE = "https://api.themoviedb.org/3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const regions = parseRegions(req.query.regions);

  if (!regions) {
    return res.status(400).json({
      error: "regions is required as a comma-separated list of ISO-3166-1 alpha-2 codes, e.g. regions=US,GB",
    });
  }

  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(`${API_BASE}/watch/providers/movie?api_key=${apiKey}`),
      fetch(`${API_BASE}/watch/providers/tv?api_key=${apiKey}`),
    ]);

    // A partial outage still yields a usable catalog, so only fail when both die.
    if (!movieRes.ok && !tvRes.ok) {
      return res.status(502).json({ error: "Failed to fetch provider catalog" });
    }

    const payloads: TmdbProviderResponse[] = await Promise.all(
      [movieRes, tvRes].map(async (response) => (response.ok ? await response.json() : {}))
    );

    const providers = mergeProviderCatalog(payloads, regions);

    // The catalog changes rarely; cache it for a day.
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).json({ providers });
  } catch (error) {
    console.error("TMDB providers-list error:", error);
    return res.status(500).json({ error: "Failed to fetch provider catalog" });
  }
}
