import type { NextApiRequest, NextApiResponse } from "next";
import { mergeProviderCatalog, parseRegions, type TmdbProviderResponse } from "@/lib/providerCatalog";

const API_BASE = "https://api.themoviedb.org/3";

type ProviderSource = {
  ok: boolean;
  payload: TmdbProviderResponse;
};

async function fetchProviderSource(url: string): Promise<ProviderSource> {
  try {
    const response = await fetch(url);
    if (!response.ok) return { ok: false, payload: {} };

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !Array.isArray((payload as TmdbProviderResponse).results)
    ) {
      return { ok: false, payload: {} };
    }

    return { ok: true, payload: payload as TmdbProviderResponse };
  } catch {
    return { ok: false, payload: {} };
  }
}

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
    const sources = await Promise.all([
      fetchProviderSource(`${API_BASE}/watch/providers/movie?api_key=${apiKey}`),
      fetchProviderSource(`${API_BASE}/watch/providers/tv?api_key=${apiKey}`),
    ]);
    const usable = sources.filter((source) => source.ok);

    // A partial outage still yields a usable catalog, so only fail when both die.
    if (usable.length === 0) {
      return res.status(502).json({ error: "Failed to fetch provider catalog" });
    }

    const providers = mergeProviderCatalog(
      usable.map((source) => source.payload),
      regions
    );

    // A complete catalogue changes rarely, so cache it for a day. A degraded one
    // is missing whichever providers were unique to the failed source, so cache
    // it briefly instead — otherwise a transient upstream blip hides services
    // from the picker for 24 hours with no way to bust it.
    const complete = usable.length === sources.length;
    res.setHeader(
      "Cache-Control",
      complete ? "s-maxage=86400, stale-while-revalidate" : "s-maxage=300, stale-while-revalidate"
    );
    return res.status(200).json({ providers });
  } catch (error) {
    console.error("TMDB providers-list error:", error);
    return res.status(500).json({ error: "Failed to fetch provider catalog" });
  }
}
