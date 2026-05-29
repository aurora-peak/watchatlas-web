"use client";

import { useId } from "react";

/**
 * Watchatlas brand identity — "Worldplay" mark, wordmark, tagline and lockup.
 *
 * Implements the brand handoff spec:
 *  - Mark: 100×100 viewBox. Outer ring (r40, sw4.5) + globe grid (two ellipses,
 *    sw2.4, opacity .55) + play triangle, all painted with the brand gradient.
 *  - Each rendered instance gets a unique gradient id (via useId) so duplicate
 *    marks on one page don't reuse the first <linearGradient>.
 *  - Wordmark: Space Grotesk. "watch" muted (weight 500, opacity .5),
 *    "atlas" weight 700, gradient or solid.
 *  - Tagline: JetBrains Mono, uppercase, wide tracking.
 */

const BRAND_1 = "#4F7BF6";
const BRAND_2 = "#9B5CF6";

type MarkVariant = "color" | "mono";

export function Mark({
  size = 96,
  variant = "color",
  title,
}: {
  size?: number;
  variant?: MarkVariant;
  title?: string;
}) {
  // Unique, collision-free gradient id per instance.
  const rawId = useId();
  const gradId = `wa-grad-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const paint = variant === "mono" ? "currentColor" : `url(#${gradId})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{ display: "block" }}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {variant === "color" && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={BRAND_1} />
            <stop offset="1" stopColor={BRAND_2} />
          </linearGradient>
        </defs>
      )}
      <circle cx="50" cy="50" r="40" stroke={paint} strokeWidth="4.5" />
      <g stroke={paint} strokeWidth="2.4" opacity="0.55" fill="none">
        <ellipse cx="50" cy="50" rx="16" ry="40" />
        <ellipse cx="50" cy="50" rx="40" ry="16" />
      </g>
      <path d="M44 35 L44 65 L69 50 Z" fill={paint} />
    </svg>
  );
}

export function Wordmark({
  size = 30,
  mode = "lower",
  gradient = true,
}: {
  size?: number;
  mode?: "lower" | "upper";
  gradient?: boolean;
}) {
  const upper = mode === "upper";
  const watch = upper ? "WATCH" : "watch";
  const atlas = upper ? "ATLAS" : "atlas";

  const atlasStyle: React.CSSProperties = gradient
    ? {
        fontWeight: 700,
        background: `linear-gradient(120deg, ${BRAND_1}, ${BRAND_2})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }
    : { fontWeight: 700, color: "var(--foreground)" };

  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        lineHeight: 1,
        letterSpacing: upper ? "0.02em" : "-0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--foreground)", opacity: 0.5, fontWeight: 500 }}>
        {watch}
      </span>
      <span style={atlasStyle}>{atlas}</span>
    </span>
  );
}

export function Tagline({ size = 9 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: size,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--foreground)",
        opacity: 0.45,
        lineHeight: 1,
      }}
    >
      Global Streaming Guide
    </span>
  );
}

/**
 * Horizontal lockup: mark on the left, wordmark (+ optional tagline) on the
 * right. Gap = 0.28 × mark height; tagline sits 6px under the wordmark.
 */
export function Lockup({
  markSize = 34,
  wordSize = 21,
  tagline = false,
  mode = "lower",
  gradient = true,
}: {
  markSize?: number;
  wordSize?: number;
  tagline?: boolean;
  mode?: "lower" | "upper";
  gradient?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: markSize * 0.28 }}>
      <Mark size={markSize} title="Watchatlas" />
      <div style={{ display: "flex", flexDirection: "column", gap: tagline ? 6 : 0 }}>
        <Wordmark size={wordSize} mode={mode} gradient={gradient} />
        {tagline && <Tagline size={Math.max(8, wordSize * 0.3)} />}
      </div>
    </div>
  );
}

export default Lockup;
