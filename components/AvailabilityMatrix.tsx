"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { getCountryMeta } from "@/lib/countries";
import ServiceLogo from "@/components/ServiceLogo";
import RegionPill from "@/components/RegionPill";
import { AVAILABILITY_META, UnavailableCell } from "@/components/AvailabilityState";

/**
 * The signature Watchatlas feature: compare where a title is available across
 * many regions at once. Columns = pinned regions, rows grouped by availability
 * type (Stream / Rent-Buy / Free). Empty cells are explicit, never blank.
 */

type Provider = { provider_id?: number; provider_name: string; logo_path: string };

type CountryProviders = {
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
  free?: Provider[];
  ads?: Provider[];
};

export type AvailabilityMatrixProps = {
  providers: Record<string, CountryProviders>;
  pinnedRegions: string[];
  onAddRegion: (code: string) => void;
  onRemoveRegion: (code: string) => void;
};

function dedupe(list: Provider[]): Provider[] {
  const seen = new Set<string>();
  const out: Provider[] = [];
  for (const p of list) {
    const key = String(p.provider_id ?? p.provider_name);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function regionBuckets(data: CountryProviders | undefined) {
  const stream = dedupe(data?.flatrate ?? []);
  const rentBuy = dedupe([...(data?.rent ?? []), ...(data?.buy ?? [])]);
  const free = dedupe([...(data?.free ?? []), ...(data?.ads ?? [])]);
  return {
    stream,
    rentBuy,
    free,
    total: stream.length + rentBuy.length + free.length,
  };
}

const MIN_COL = 150;

export default function AvailabilityMatrix({
  providers,
  pinnedRegions,
  onAddRegion,
  onRemoveRegion,
}: AvailabilityMatrixProps) {
  const [sortByMost, setSortByMost] = useState(false);

  const columns = useMemo(() => {
    const cols = pinnedRegions.map((code) => ({
      code,
      meta: getCountryMeta(code),
      buckets: regionBuckets(providers[code]),
    }));
    return sortByMost ? [...cols].sort((a, b) => b.buckets.total - a.buckets.total) : cols;
  }, [pinnedRegions, providers, sortByMost]);

  const gridCols = `repeat(${columns.length}, minmax(${MIN_COL}px, 1fr))`;
  const minWidth = columns.length * MIN_COL;

  const groups: { key: "stream" | "rentBuy" | "free"; label: string }[] = [
    { key: "stream", label: AVAILABILITY_META.stream.label },
    { key: "rentBuy", label: AVAILABILITY_META.rentBuy.label },
    { key: "free", label: AVAILABILITY_META.free.label },
  ];

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="px-3 py-1.5 rounded-full text-sm font-medium"
          style={{ background: "var(--brand-gradient)", color: "#fff" }}
        >
          Pinned: {pinnedRegions.length}
        </span>
        <RegionPill placeholder="+ add region" exclude={pinnedRegions} onChange={onAddRegion} />
        <div className="flex-1" />
        <button
          onClick={() => setSortByMost((s) => !s)}
          className="text-sm"
          style={{ color: sortByMost ? "var(--foreground)" : "var(--muted)" }}
        >
          sort: most services {sortByMost ? "↓" : "→"}
        </button>
      </div>

      {/* Matrix */}
      <div
        className="rounded-xl overflow-x-auto scroll-container"
        style={{ border: "1px solid var(--border)", background: "var(--card)" }}
      >
        <div style={{ minWidth }}>
          {/* Region header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              borderBottom: "1px solid var(--border)",
            }}
          >
            {columns.map((col) => (
              <div
                key={col.code}
                style={{ padding: 12, borderRight: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 16 }}>{col.meta?.flag}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{col.meta?.name || col.code}</span>
                  {pinnedRegions.length > 1 && (
                    <button
                      onClick={() => onRemoveRegion(col.code)}
                      aria-label={`Remove ${col.meta?.name || col.code}`}
                      className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <X size={13} style={{ color: "var(--muted)" }} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {col.buckets.total} {col.buckets.total === 1 ? "option" : "options"}
                </div>
              </div>
            ))}
          </div>

          {/* Availability groups */}
          {groups.map((g) => (
            <div key={g.key} style={{ borderBottom: "1px solid var(--border)" }}>
              <div
                className="lbl-mono"
                style={{
                  fontSize: 10,
                  padding: "6px 12px",
                  color: "var(--muted)",
                  background: "var(--background)",
                }}
              >
                {g.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: gridCols }}>
                {columns.map((col) => {
                  const list = col.buckets[g.key];
                  return (
                    <div
                      key={col.code}
                      style={{
                        padding: 12,
                        borderRight: "1px solid var(--border)",
                        minHeight: 60,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        alignItems: "flex-start",
                      }}
                    >
                      {list.length === 0 ? (
                        <UnavailableCell label="—" />
                      ) : (
                        list.map((p) => (
                          <ServiceLogo
                            key={p.provider_id ?? p.provider_name}
                            name={p.provider_name}
                            logoPath={p.logo_path}
                            size="sm"
                          />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
