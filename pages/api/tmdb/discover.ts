import type { NextApiRequest, NextApiResponse } from "next";
import { canonicalizeRegionSet, parseRegions } from "@/lib/providerCatalog";
import {
  MAX_DISCOVER_REGIONS,
  mergeDiscoverResults,
  parseProviderIds,
  type DiscoverItem,
} from "@/lib/discoverMerge";

const API_BASE = "https://api.themoviedb.org/3";
const MEDIA_TYPES: Array<"movie" | "tv"> = ["movie", "tv"];

// Matches project #2's definition of "available on your services": subscription,
// free, and ad-supported tiers only. Rent and buy are deliberately excluded.
const MONETIZATION = "flatrate|free|ads";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const allRegions = parseRegions(req.query.regions);
  const providers = parseProviderIds(req.query.providers);

  if (!allRegions) {
    return res.status(400).json({
      error: "regions is required as a comma-separated list of ISO-3166-1 alpha-2 codes, e.g. regions=US,GB",
    });
  }

  const canonicalRegions = canonicalizeRegionSet(allRegions);
  if (!canonicalRegions) {
    return res.status(400).json({ error: "Invalid regions" });
  }
  const regionParam = canonicalRegions.join(",");
  if (req.query.regions !== regionParam) {
    return res.status(400).json({
      error: "regions must be sorted, unique uppercase ISO-3166-1 alpha-2 codes",
    });
  }

  if (!providers) {
    return res.status(400).json({
      error: "providers is required as a pipe-separated list of TMDB provider ids, e.g. providers=8|337",
    });
  }

  // Canonical input collapses equivalent provider sets to one cache key. The
  // client emits this sorted, deduped form; rejecting variants prevents public
  // callers from bypassing the CDN with permutations that trigger identical
  // upstream work.
  const providerParam = providers.join("|");
  if (req.query.providers !== providerParam) {
    return res.status(400).json({
      error: "providers must be sorted, unique positive TMDB provider ids",
    });
  }

  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  // Bound the fan-out; the response reports what was actually queried so the UI
  // can be honest about coverage rather than implying it searched everywhere.
  const requestedRegions = canonicalRegions.slice(0, MAX_DISCOVER_REGIONS);

  const requests = requestedRegions.flatMap((region) =>
    MEDIA_TYPES.map(async (mediaType): Promise<{ region: string; items: DiscoverItem[] }> => {
      const url =
        `${API_BASE}/discover/${mediaType}` +
        `?api_key=${apiKey}` +
        `&with_watch_providers=${encodeURIComponent(providerParam)}` +
        `&watch_region=${region}` +
        `&with_watch_monetization_types=${encodeURIComponent(MONETIZATION)}` +
        `&sort_by=popularity.desc`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`discover ${mediaType} ${region} responded ${response.status}`);

      const data = await response.json();
      return {
        region,
        items: (data.results ?? []).map((item: any) => ({
          id: item.id,
          media_type: mediaType,
          title: item.title,
          name: item.name,
          poster_path: item.poster_path,
          popularity: item.popularity,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
        })),
      };
    })
  );

  const settled = await Promise.allSettled(requests);
  const succeeded = settled.filter(
    (result): result is PromiseFulfilledResult<{ region: string; items: DiscoverItem[] }> =>
      result.status === "fulfilled"
  );

  // Only a total failure is an error; otherwise merge whatever came back.
  if (succeeded.length === 0) {
    console.error("TMDB discover error: every upstream call failed");
    return res.status(502).json({ error: "Failed to fetch discover results" });
  }

  const results = mergeDiscoverResults(succeeded.map((result) => result.value.items));
  const successfulRegionSet = new Set(succeeded.map((result) => result.value.region));
  const regionsUsed = requestedRegions.filter((region) => successfulRegionSet.has(region));
  const complete = succeeded.length === requests.length;

  res.setHeader(
    "Cache-Control",
    complete ? "s-maxage=600, stale-while-revalidate" : "s-maxage=300, stale-while-revalidate"
  );
  return res.status(200).json({ results, regionsUsed });
}
