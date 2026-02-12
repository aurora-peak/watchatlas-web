export interface HealthCheckResponse {
  status: "healthy" | "degraded";
  tmdb: {
    reachable: boolean;
    responseTimeMs: number | null;
    lastChecked: string;
    error: string | null;
  };
  timestamp: string;
}

export interface CronHealthCheckResponse {
  checked: string;
  status: "healthy" | "degraded";
  consecutiveFailures: number;
}
