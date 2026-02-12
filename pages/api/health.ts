import type { NextApiRequest, NextApiResponse } from "next";
import type { HealthCheckResponse } from "@/types/health";

const TMDB_BASE = "https://api.themoviedb.org/3";
const CACHE_TTL_MS = 60_000; // 60 seconds

// Module-level cache (persists across warm invocations on Vercel)
let cachedResult: HealthCheckResponse | null = null;
let cachedAt = 0;

async function checkTMDB(): Promise<HealthCheckResponse> {
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;

  if (!apiKey) {
    return {
      status: "degraded",
      tmdb: { reachable: false, responseTimeMs: null, lastChecked: new Date().toISOString(), error: "API key not configured" },
      timestamp: new Date().toISOString(),
    };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${TMDB_BASE}/configuration?api_key=${apiKey}`, {
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Date.now() - start;

    if (!res.ok) {
      return {
        status: "degraded",
        tmdb: { reachable: false, responseTimeMs: elapsed, lastChecked: new Date().toISOString(), error: `HTTP ${res.status}` },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: "healthy",
      tmdb: { reachable: true, responseTimeMs: elapsed, lastChecked: new Date().toISOString(), error: null },
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: "degraded",
      tmdb: { reachable: false, responseTimeMs: Date.now() - start, lastChecked: new Date().toISOString(), error: String(err) },
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  const forceRefresh = req.query.force === "true";

  if (!forceRefresh && cachedResult && (now - cachedAt) < CACHE_TTL_MS) {
    const httpStatus = cachedResult.tmdb.reachable ? 200 : 503;
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
    return res.status(httpStatus).json(cachedResult);
  }

  const result = await checkTMDB();
  cachedResult = result;
  cachedAt = now;

  const httpStatus = result.tmdb.reachable ? 200 : 503;
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
  return res.status(httpStatus).json(result);
}
