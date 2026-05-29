/**
 * The shared concept of how a title is available in a region — streaming on a
 * subscription, rent/buy, free with ads, or explicitly unavailable. Used by the
 * Detail comparator (and, later, Search rows and Watchlist cards) so the
 * treatment — including the honest "unavailable" state — is consistent.
 */

export type AvailabilityKind = "stream" | "rentBuy" | "free" | "unavailable";

export const AVAILABILITY_META: Record<
  Exclude<AvailabilityKind, "unavailable">,
  { label: string; color: string }
> = {
  stream: { label: "Stream", color: "var(--brand-1)" },
  rentBuy: { label: "Rent / Buy", color: "var(--brand-2)" },
  free: { label: "Free w/ ads", color: "#2f9e6f" },
};

/**
 * Explicit empty cell — "honest negative space is a feature." Striped so an
 * unavailable region reads at a glance instead of looking like missing data.
 */
export function UnavailableCell({
  label = "not streaming",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <span
      className="availability-empty"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        color: "var(--muted)",
        padding: compact ? "2px 8px" : "6px 8px",
        borderRadius: 8,
        width: compact ? undefined : "100%",
        textAlign: "center",
      }}
    >
      {label}
    </span>
  );
}
