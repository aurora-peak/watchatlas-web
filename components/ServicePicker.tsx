import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Search, Tv2, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import type { FavoriteService } from "@/lib/preferences";
import {
  removeFavoriteService,
  resolveActiveCountry,
  toggleFavoriteService,
} from "@/lib/preferences";
import type { CatalogProvider } from "@/lib/providerCatalog";
import { getCountryMeta } from "@/lib/countries";

type LoadState = "idle" | "loading" | "ready" | "error";

type ServicePickerProps = {
  // The parent's *live* country selection, not the saved one, so a country
  // checked a moment ago gets a tab immediately instead of after a save.
  countries: string[];
  selected: FavoriteService[];
  onSelectedChange: (services: FavoriteService[]) => void;
};

export default function ServicePicker({
  countries,
  selected,
  onSelectedChange,
}: ServicePickerProps) {
  const { user } = useAuth();

  const [catalog, setCatalog] = useState<CatalogProvider[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Bumped by the retry affordance to re-run the catalogue fetch effect.
  const [reloadToken, setReloadToken] = useState(0);

  // The parent rebuilds this array on every toggle, so depend on its contents
  // rather than its identity to avoid refetching the catalogue needlessly.
  const countriesKey = countries.join(",");

  useEffect(() => {
    if (countries.length === 0) {
      setCatalog([]);
      setState("idle");
      setActiveCountry(null);
      return;
    }

    setActiveCountry((current) => resolveActiveCountry(countries, current));

    let cancelled = false;
    setState("loading");

    fetch(`/api/tmdb/providers-list?regions=${countriesKey}`)
      .then((response) => {
        if (!response.ok) throw new Error(`providers-list responded ${response.status}`);
        return response.json();
      })
      .then((data: { providers: CatalogProvider[] }) => {
        if (cancelled) return;
        setCatalog(data.providers ?? []);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countriesKey, reloadToken]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog
      .filter((provider) => (activeCountry ? provider.regions.includes(activeCountry) : false))
      .filter((provider) => (term === "" ? true : provider.name.toLowerCase().includes(term)));
  }, [catalog, activeCountry, search]);

  const isSelected = (id: number) => selected.some((service) => service.id === id);

  const toggle = (provider: CatalogProvider) =>
    onSelectedChange(
      toggleFavoriteService(selected, {
        id: provider.id,
        name: provider.name,
        logoPath: provider.logoPath,
      })
    );

  const remove = (id: number) => onSelectedChange(removeFavoriteService(selected, id));

  if (!user) return null;

  return (
    <section className="mt-10">
      <h2 className="section-title mb-2">
        <Tv2 size={22} style={{ color: "var(--accent)" }} />
        My Services
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Pick the services you subscribe to. Your choices apply across every country you follow.
      </p>

      {countries.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Choose at least one favorite country above first — the service catalogue depends on it.
        </p>
      ) : (
        <>
          {selected.length > 0 && (
            <div
              className="rounded-xl p-3 mb-4 flex flex-wrap gap-2"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              {selected.map((service) => (
                <span
                  key={service.id}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm"
                  style={{ background: "var(--accent-soft)" }}
                >
                  {service.name}
                  <button
                    onClick={() => remove(service.id)}
                    aria-label={`Remove ${service.name}`}
                    className="rounded"
                  >
                    <X size={14} style={{ color: "var(--muted)" }} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div role="group" aria-label="Countries" className="flex flex-wrap gap-2 mb-4">
            {countries.map((code) => {
              const meta = getCountryMeta(code);
              const active = code === activeCountry;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveCountry(code)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    // --accent-hover, not --accent: white on --accent is only
                    // 3.68:1 in the dark theme. --accent-hover gives 5.17:1
                    // (dark) and 6.70:1 (light), both clearing WCAG AA.
                    background: active ? "var(--accent-hover)" : "var(--card)",
                    color: active ? "white" : "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {meta?.flag} {meta?.name ?? code}
                </button>
              );
            })}
          </div>

          <div className="search-input-wrapper mb-4">
            <Search className="search-icon" size={18} style={{ color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="search-input with-icon"
              aria-label="Search services"
            />
          </div>

          {state === "loading" && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Loading services…</p>
          )}

          {state === "error" && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Could not load the service catalogue.{" "}
              <button onClick={() => setReloadToken((token) => token + 1)} className="underline">
                Retry
              </button>
            </p>
          )}

          {state === "ready" && visible.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No services match that search.</p>
          )}

          {state === "ready" && visible.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {visible.map((provider) => {
                const chosen = isSelected(provider.id);
                return (
                  <button
                    key={provider.id}
                    role="checkbox"
                    aria-checked={chosen}
                    onClick={() => toggle(provider)}
                    className="rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                    style={{
                      background: chosen ? "var(--accent-soft)" : "var(--card)",
                      border: `1px solid ${chosen ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    <span className="relative w-10 h-10 rounded-lg overflow-hidden">
                      {provider.logoPath ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${provider.logoPath}`}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="text-xs text-center">{provider.name}</span>
                    {chosen && <Check size={14} style={{ color: "var(--accent)" }} />}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
