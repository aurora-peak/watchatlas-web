"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { getCountryList, getCountryMeta } from "@/lib/countries";
import { useRegion } from "@/lib/RegionContext";

/**
 * Flag + country pill that drives the active region. Appears in the nav, in
 * filters, and in the Detail header. By default it reads/writes the app's
 * active region (and thus the URL `?r=` param); pass `value`/`onChange` to use
 * it as a standalone region picker (e.g. Detail's "+ add region").
 */

export type RegionPillProps = {
  value?: string;
  onChange?: (code: string) => void;
  /** When false, renders a static, non-interactive pill (no picker). */
  interactive?: boolean;
  /** Compact variant for dense rows. */
  compact?: boolean;
  /** Override the label (e.g. "+ add region"); the trigger still opens the picker. */
  placeholder?: string;
  /** Exclude these codes from the picker (e.g. already-pinned regions). */
  exclude?: string[];
};

export default function RegionPill({
  value,
  onChange,
  interactive = true,
  compact = false,
  placeholder,
  exclude = [],
}: RegionPillProps) {
  const region = useRegion();
  const activeCode = value ?? region.region;
  const meta = getCountryMeta(activeCode);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return getCountryList()
      .filter((c) => !exclude.includes(c.code))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      .slice(0, 60);
  }, [query, exclude]);

  const select = (code: string) => {
    (onChange ?? region.setRegion)(code);
    setOpen(false);
    setQuery("");
  };

  const label = placeholder ?? meta?.name ?? activeCode;
  const flag = placeholder ? null : meta?.flag;

  const trigger = (
    <button
      type="button"
      onClick={interactive ? () => setOpen((o) => !o) : undefined}
      disabled={!interactive}
      className="region-pill"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: compact ? "3px 8px" : "6px 12px",
        borderRadius: 999,
        border: placeholder ? "1px dashed var(--border)" : "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--foreground)",
        fontSize: compact ? 12 : 13,
        fontWeight: 500,
        cursor: interactive ? "pointer" : "default",
        whiteSpace: "nowrap",
      }}
    >
      {flag && <span style={{ fontSize: compact ? 14 : 16 }}>{flag}</span>}
      <span>{label}</span>
      {interactive && <ChevronDown size={14} style={{ color: "var(--muted)" }} />}
    </button>
  );

  if (!interactive) return trigger;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {trigger}
      {open && (
        <div
          className="region-pop"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 60,
            width: 260,
            maxHeight: 320,
            display: "flex",
            flexDirection: "column",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", padding: 8, borderBottom: "1px solid var(--border)" }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 18, top: 18, color: "var(--muted)" }}
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search regions…"
              style={{
                width: "100%",
                padding: "8px 8px 8px 32px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--foreground)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            {options.map((c) => (
              <button
                key={c.code}
                onClick={() => select(c.code)}
                className="region-opt"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 12px",
                  background: c.code === activeCode ? "var(--card-hover)" : "transparent",
                  border: "none",
                  color: "var(--foreground)",
                  fontSize: 13,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 16 }}>{c.flag}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ color: "var(--muted)", fontSize: 11 }}>{c.code}</span>
              </button>
            ))}
            {options.length === 0 && (
              <div style={{ padding: 16, color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
                No regions found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
