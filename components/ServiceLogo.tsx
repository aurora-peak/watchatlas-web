import { getPosterUrl } from "@/lib/tmdb";

/**
 * Square tile showing a streaming service's brand mark. Single source of truth
 * for service → logo across Detail cells, Search rows, Watchlist and Browse.
 * Falls back to initials when no logo is available.
 */

const SIZES = {
  sm: 28,
  md: 40,
  lg: 48,
} as const;

export type ServiceLogoProps = {
  name: string;
  logoPath?: string | null;
  size?: keyof typeof SIZES;
};

function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function ServiceLogo({ name, logoPath, size = "md" }: ServiceLogoProps) {
  const px = SIZES[size];

  if (logoPath) {
    return (
      <img
        src={getPosterUrl(logoPath, "w92")}
        alt={name}
        title={name}
        width={px}
        height={px}
        style={{
          width: px,
          height: px,
          borderRadius: Math.round(px * 0.22),
          objectFit: "cover",
          border: "1px solid var(--border)",
          flex: "0 0 auto",
        }}
      />
    );
  }

  return (
    <div
      title={name}
      aria-label={name}
      style={{
        width: px,
        height: px,
        borderRadius: Math.round(px * 0.22),
        background: "var(--card-hover)",
        border: "1px solid var(--border)",
        color: "var(--muted)",
        fontSize: Math.round(px * 0.34),
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      {initials(name) || "?"}
    </div>
  );
}
