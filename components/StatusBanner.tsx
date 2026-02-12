import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";

interface HealthStatus {
  status: "healthy" | "degraded";
  tmdb: {
    reachable: boolean;
    lastChecked: string;
  };
}

const POLL_INTERVAL = 60_000; // 60 seconds
const DISMISSED_KEY = "status-banner-dismissed";

export default function StatusBanner() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const data: HealthStatus = await res.json();
      setHealth(data);

      // If service recovers, clear dismissal
      if (data.tmdb.reachable) {
        setDismissed(false);
        sessionStorage.removeItem(DISMISSED_KEY);
      }
    } catch {
      // Fetch itself failed — our own server is down, banner won't help
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true);
    }

    checkHealth();
    const interval = setInterval(checkHealth, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  };

  if (!health || health.tmdb.reachable || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className="status-banner flex items-center justify-between px-4 py-2.5 text-sm"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="status-banner-icon flex-shrink-0" />
        <span>
          Some content may be unavailable right now. We&apos;re aware and working on it.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-full transition-opacity hover:opacity-70"
        aria-label="Dismiss status message"
      >
        <X size={16} />
      </button>
    </div>
  );
}
