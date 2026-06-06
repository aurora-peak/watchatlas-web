import type { NextApiRequest, NextApiResponse } from "next";
import { sendAllNotifications } from "@/lib/notifications";

const TMDB_BASE = "https://api.themoviedb.org/3";

// Track last known state to detect transitions
let lastKnownStatus: "healthy" | "degraded" | null = null;
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 2;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify Vercel cron secret (prevents unauthorized invocations)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return res.status(500).json({ error: "Cron secret not configured" });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  let currentStatus: "healthy" | "degraded";

  try {
    const response = await fetch(`${TMDB_BASE}/configuration?api_key=${apiKey}`, {
      signal: AbortSignal.timeout(10000),
    });
    currentStatus = response.ok ? "healthy" : "degraded";
  } catch {
    currentStatus = "degraded";
  }

  if (currentStatus === "degraded") {
    consecutiveFailures++;
  } else {
    consecutiveFailures = 0;
  }

  const now = new Date().toISOString();
  let notified = false;

  // Detect state transitions (with debounce for failures)
  if (lastKnownStatus !== null && lastKnownStatus !== currentStatus) {
    if (currentStatus === "degraded" && consecutiveFailures >= FAILURE_THRESHOLD) {
      await sendAllNotifications({
        title: "TMDB API is DOWN",
        message: "WatchAtlas cannot reach the TMDB API. The site is showing empty content to visitors.",
        severity: "critical",
        timestamp: now,
        details: {
          "Consecutive Failures": consecutiveFailures,
          "Site URL": process.env.NEXT_PUBLIC_SITE_URL || "N/A",
        },
      });
      lastKnownStatus = currentStatus;
      notified = true;
    } else if (currentStatus === "healthy") {
      await sendAllNotifications({
        title: "TMDB API RECOVERED",
        message: "WatchAtlas has reconnected to the TMDB API. The site is functioning normally.",
        severity: "recovery",
        timestamp: now,
      });
      lastKnownStatus = currentStatus;
      notified = true;
    }
  } else {
    lastKnownStatus = currentStatus;
  }

  return res.status(200).json({
    checked: now,
    status: currentStatus,
    consecutiveFailures,
    notified,
  });
}
