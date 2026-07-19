# Preferred Streaming Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user pick the streaming services they subscribe to, then use those picks to add a personalized "On My Services" row to the home page and to surface their own services first on every title's where-to-watch view.

**Architecture:** Extends the existing preference model (`UserPreferences` in Firestore) with a flat, global `favoriteServices` array of TMDB provider IDs. Two new TMDB proxy routes follow the established `pages/api/tmdb/*` pattern — a provider catalog route and a Discover route — each delegating its merge/dedupe logic to pure functions in `lib/` that are unit-tested in isolation. UI changes are additive: a new Settings section, a new home row, and a regrouping (never a filtering) of the detail page's provider lists.

**Tech Stack:** Next.js 14 Pages Router, React 18, TypeScript 5, Firebase Firestore (named database `watchatlaspreference`), TMDB v3 API, Node built-in test runner via `tsx`.

**Spec:** `docs/superpowers/specs/2026-07-19-preferred-services-design.md`
**Issues:** Feature #3; stories #13 (settings picker), #14 (home row), #15 (two-tier where-to-watch)
**Branch:** `v2` — all work happens here. Each task commits to `v2`.

## Global Constraints

- **TMDB access only via internal proxy routes.** New routes read `process.env.TMDB_API_KEY` and nothing else. Never read or reintroduce `NEXT_PUBLIC_TMDB_API_KEY` (CLAUDE.md rule; PRD FR-34).
- **Firestore is a named database.** All access goes through the existing `db` export from `lib/firebase.ts`, which is `getFirestore(app, "watchatlaspreference")`. Never call `getFirestore(app)`.
- **Every API route sets a `Cache-Control` header.** Catalog route: `s-maxage=86400, stale-while-revalidate`. Discover route: `s-maxage=600, stale-while-revalidate`.
- **"Available" means `flatrate`, `free`, or `ads`.** Rent and buy are excluded from the Discover query and from the "Your services" tier. This definition must match project #4's, which depends on it.
- **Nothing is ever hidden.** Preferred services are ordered first; non-preferred providers always still render.
- **Styling uses the CSS variables in `styles/globals.css`** (`var(--card)`, `var(--border)`, `var(--accent)`, `var(--muted)`, `var(--foreground)`). No hardcoded colors. WCAG 2.1 AA contrast in both themes.
- **No PII in logs.** Never `console.log` a uid or email.
- **Path alias `@/*` maps to the repo root** (`tsconfig.json`), e.g. `@/lib/firestore`.
- **Test files live in `tests/` and are named `*.test.ts`.** Run the whole suite with `npm test`. Run one file with `node --import tsx --test tests/<name>.test.ts`.
- **Tests must be run unpiped** (`npm test`, not `npm test | tail`) — the shipping-gate hook only records a passing run from a clean invocation.

---

### Task 1: Add `favoriteServices` to the preference model

Adds the field to the type, the loader's defaults, and both places in `AuthContext` that rebuild the preferences object. Those spread blocks hardcode the preference shape, so missing them would silently drop the field on every update.

**Files:**
- Modify: `lib/firestore.ts:5-8` (type), `lib/firestore.ts:59-65` (loader defaults)
- Modify: `lib/AuthContext.tsx:80-84` and `lib/AuthContext.tsx:91-95` (state rebuilds)
- Test: `tests/userPreferences.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `type FavoriteService = { id: number; name: string; logoPath: string }` exported from `lib/firestore.ts`
  - `UserPreferences` gains `favoriteServices: FavoriteService[]`
  - `export function normalizePreferences(data: unknown): UserPreferences` in `lib/firestore.ts` — pure, used by the loader and by tests

- [ ] **Step 1: Write the failing test**

Create `tests/userPreferences.test.ts`:

```ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizePreferences } from "../lib/firestore";

describe("normalizePreferences", () => {
  test("defaults favoriteServices to an empty array when absent", () => {
    const prefs = normalizePreferences({ favoriteCountries: ["US"], darkMode: true });

    assert.deepEqual(prefs.favoriteServices, []);
  });

  test("keeps well-formed services", () => {
    const prefs = normalizePreferences({
      favoriteServices: [{ id: 8, name: "Netflix", logoPath: "/n.jpg" }],
    });

    assert.deepEqual(prefs.favoriteServices, [{ id: 8, name: "Netflix", logoPath: "/n.jpg" }]);
  });

  test("drops malformed service entries rather than trusting stored data", () => {
    const prefs = normalizePreferences({
      favoriteServices: [
        { id: 8, name: "Netflix", logoPath: "/n.jpg" },
        { id: "not-a-number", name: "Bad", logoPath: "/b.jpg" },
        { name: "No ID", logoPath: "/x.jpg" },
        null,
      ],
    });

    assert.deepEqual(prefs.favoriteServices, [{ id: 8, name: "Netflix", logoPath: "/n.jpg" }]);
  });

  test("coerces a non-array favoriteServices to empty", () => {
    assert.deepEqual(normalizePreferences({ favoriteServices: "nope" }).favoriteServices, []);
  });

  test("preserves the existing country and darkMode defaults", () => {
    const prefs = normalizePreferences({});

    assert.deepEqual(prefs.favoriteCountries, []);
    assert.equal(prefs.darkMode, true);
  });

  test("tolerates a missing logoPath by defaulting it to empty string", () => {
    const prefs = normalizePreferences({ favoriteServices: [{ id: 8, name: "Netflix" }] });

    assert.deepEqual(prefs.favoriteServices, [{ id: 8, name: "Netflix", logoPath: "" }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test tests/userPreferences.test.ts`
Expected: FAIL — `normalizePreferences` is not exported from `lib/firestore.ts`.

- [ ] **Step 3: Add the type and the normalizer**

In `lib/firestore.ts`, replace the `UserPreferences` type block (currently lines 5-8) with:

```ts
export type FavoriteService = {
  id: number;
  name: string;
  logoPath: string;
};

export type UserPreferences = {
  favoriteCountries: string[];
  darkMode: boolean;
  favoriteServices: FavoriteService[];
};

// Firestore documents are untrusted input: a partial write or an older client
// can leave any field missing or the wrong shape. Normalizing in one place keeps
// the defaults identical for the loader and for callers rebuilding local state.
export function normalizePreferences(data: unknown): UserPreferences {
  const record = (data ?? {}) as Record<string, unknown>;

  const favoriteServices = Array.isArray(record.favoriteServices)
    ? record.favoriteServices.filter(isFavoriteService).map((service) => ({
        id: service.id,
        name: service.name,
        logoPath: typeof service.logoPath === "string" ? service.logoPath : "",
      }))
    : [];

  return {
    favoriteCountries: Array.isArray(record.favoriteCountries) ? record.favoriteCountries : [],
    darkMode: typeof record.darkMode === "boolean" ? record.darkMode : true,
    favoriteServices,
  };
}

function isFavoriteService(value: unknown): value is { id: number; name: string; logoPath?: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "number" && typeof candidate.name === "string";
}
```

- [ ] **Step 4: Route the loader through the normalizer**

In `lib/firestore.ts`, replace the body of the `if (snapshot.exists())` block (currently lines 59-65) with:

```ts
    if (snapshot.exists()) {
      return normalizePreferences(snapshot.data());
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --import tsx --test tests/userPreferences.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Fix both preference rebuilds in AuthContext**

`lib/AuthContext.tsx` rebuilds the preferences object in two places, each hardcoding the field list. Both must learn the new field or it will be wiped from local state on every update.

Replace the signed-out branch (currently lines 79-85):

```tsx
    if (!user) {
      // For non-logged-in users, just update local state
      setPreferences((prev) => ({
        favoriteCountries: prev?.favoriteCountries ?? [],
        darkMode: prev?.darkMode ?? true,
        favoriteServices: prev?.favoriteServices ?? [],
        ...prefs,
      }));
      return;
    }
```

Replace the signed-in state update (currently lines 90-95):

```tsx
    // Update local state
    setPreferences((prev) => ({
      favoriteCountries: prev?.favoriteCountries ?? [],
      darkMode: prev?.darkMode ?? true,
      favoriteServices: prev?.favoriteServices ?? [],
      ...prefs,
    }));
```

- [ ] **Step 7: Remove the PII logging while you are in this file**

`lib/AuthContext.tsx:39` and `:43` log auth state and the user's uid. CLAUDE.md forbids logging PII in production paths. Delete both `console.log` calls:

```tsx
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const prefs = await loadUserPreferences(firebaseUser.uid);
```

- [ ] **Step 8: Verify the build typechecks**

Run: `npm run build`
Expected: succeeds. If it fails with a `favoriteServices` missing-property error, some other file constructs a `UserPreferences` literal — add `favoriteServices: []` there.

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS, 26 tests (20 existing + 6 new).

- [ ] **Step 10: Commit**

```bash
git add lib/firestore.ts lib/AuthContext.tsx tests/userPreferences.test.ts
git commit -m "feat: add favoriteServices to user preferences

Adds the field, a normalizePreferences helper that hardens untrusted
Firestore data, and updates both AuthContext state rebuilds so the field
survives updates. Also drops the uid/auth-state console logging.

Part of #13"
```

---

### Task 2: Provider-catalog merge logic

Pure functions only — no network, no Next.js. Task 3 wraps these in a route.

**Files:**
- Create: `lib/providerCatalog.ts`
- Test: `tests/providerCatalog.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type CatalogProvider = { id: number; name: string; logoPath: string; displayPriority: number; regions: string[] }`
  - `export function parseRegions(raw: unknown): string[] | null` — returns `null` when invalid/absent
  - `export function mergeProviderCatalog(responses: TmdbProviderResponse[], regions: string[]): CatalogProvider[]`
  - `type TmdbProviderResponse = { results?: TmdbProvider[] }`
  - `type TmdbProvider = { provider_id: number; provider_name: string; logo_path: string | null; display_priority?: number; display_priorities?: Record<string, number> }`

- [ ] **Step 1: Write the failing test**

Create `tests/providerCatalog.test.ts`:

```ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseRegions, mergeProviderCatalog } from "../lib/providerCatalog";

describe("parseRegions", () => {
  test("parses a comma-separated list and uppercases it", () => {
    assert.deepEqual(parseRegions("us,gb"), ["US", "GB"]);
  });

  test("trims whitespace and drops empty entries", () => {
    assert.deepEqual(parseRegions(" US , , GB "), ["US", "GB"]);
  });

  test("dedupes repeated regions", () => {
    assert.deepEqual(parseRegions("US,US,GB"), ["US", "GB"]);
  });

  test("rejects anything that is not alpha-2 shaped", () => {
    assert.equal(parseRegions("USA"), null);
    assert.equal(parseRegions("U1"), null);
    assert.equal(parseRegions("US,XYZ"), null);
  });

  test("rejects absent, empty, or non-string input", () => {
    assert.equal(parseRegions(undefined), null);
    assert.equal(parseRegions(""), null);
    assert.equal(parseRegions([]), null);
    assert.equal(parseRegions(42), null);
  });
});

describe("mergeProviderCatalog", () => {
  const netflix = {
    provider_id: 8,
    provider_name: "Netflix",
    logo_path: "/netflix.jpg",
    display_priority: 5,
    display_priorities: { US: 5, GB: 3 },
  };
  const hulu = {
    provider_id: 15,
    provider_name: "Hulu",
    logo_path: "/hulu.jpg",
    display_priority: 12,
    display_priorities: { US: 12 },
  };
  const nowTv = {
    provider_id: 39,
    provider_name: "Now TV",
    logo_path: "/now.jpg",
    display_priority: 2,
    display_priorities: { GB: 2 },
  };

  test("merges movie and TV responses, deduping by provider id", () => {
    const merged = mergeProviderCatalog([{ results: [netflix] }, { results: [netflix, hulu] }], ["US"]);

    assert.deepEqual(merged.map((p) => p.id), [8, 15]);
  });

  test("keeps only providers available in at least one requested region", () => {
    const merged = mergeProviderCatalog([{ results: [netflix, hulu, nowTv] }], ["GB"]);

    assert.deepEqual(merged.map((p) => p.id).sort(), [8, 39]);
  });

  test("reports each provider's availability across the requested regions only", () => {
    const merged = mergeProviderCatalog([{ results: [netflix] }], ["US", "GB", "DE"]);

    assert.deepEqual(merged[0].regions.sort(), ["GB", "US"]);
  });

  test("sorts by display priority ascending", () => {
    const merged = mergeProviderCatalog([{ results: [hulu, netflix, nowTv] }], ["US", "GB"]);

    assert.deepEqual(merged.map((p) => p.id), [39, 8, 15]);
  });

  test("maps logo_path to logoPath and null to an empty string", () => {
    const noLogo = { ...hulu, logo_path: null };
    const merged = mergeProviderCatalog([{ results: [noLogo] }], ["US"]);

    assert.equal(merged[0].logoPath, "");
  });

  test("tolerates a failed upstream call represented as an empty response", () => {
    const merged = mergeProviderCatalog([{ results: [netflix] }, {}], ["US"]);

    assert.deepEqual(merged.map((p) => p.id), [8]);
  });

  test("returns an empty list when nothing matches the requested regions", () => {
    assert.deepEqual(mergeProviderCatalog([{ results: [hulu] }], ["JP"]), []);
  });

  test("falls back to display_priority when display_priorities is absent", () => {
    // Some providers omit the per-region map; they are treated as available in
    // every requested region rather than silently dropped.
    const legacy = { provider_id: 99, provider_name: "Legacy", logo_path: "/l.jpg", display_priority: 1 };
    const merged = mergeProviderCatalog([{ results: [legacy] }], ["US"]);

    assert.deepEqual(merged[0].regions, ["US"]);
    assert.equal(merged[0].displayPriority, 1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test tests/providerCatalog.test.ts`
Expected: FAIL — cannot find module `../lib/providerCatalog`.

- [ ] **Step 3: Write the implementation**

Create `lib/providerCatalog.ts`:

```ts
// Pure logic behind GET /api/tmdb/providers-list. Kept free of Next.js and
// network concerns so it can be unit-tested directly.

export type CatalogProvider = {
  id: number;
  name: string;
  logoPath: string;
  displayPriority: number;
  regions: string[];
};

export type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
  display_priorities?: Record<string, number>;
};

export type TmdbProviderResponse = {
  results?: TmdbProvider[];
};

const ALPHA_2 = /^[A-Za-z]{2}$/;

/**
 * Parses the `regions` query param. Returns null for anything malformed so the
 * route can answer 400 rather than silently querying the wrong regions.
 */
export function parseRegions(raw: unknown): string[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

  if (parts.length === 0) return null;
  if (!parts.every((part) => ALPHA_2.test(part))) return null;

  return [...new Set(parts.map((part) => part.toUpperCase()))];
}

/**
 * Merges the movie and TV provider catalogs into one deduped list, keeping only
 * providers offered in at least one requested region.
 */
export function mergeProviderCatalog(
  responses: TmdbProviderResponse[],
  regions: string[]
): CatalogProvider[] {
  const byId = new Map<number, CatalogProvider>();

  for (const response of responses) {
    for (const provider of response.results ?? []) {
      const available = regionsFor(provider, regions);
      if (available.length === 0) continue;

      const existing = byId.get(provider.provider_id);
      if (existing) {
        // The same provider appears in both the movie and TV catalogs; union
        // their regions rather than letting whichever arrived last win.
        existing.regions = [...new Set([...existing.regions, ...available])];
        continue;
      }

      byId.set(provider.provider_id, {
        id: provider.provider_id,
        name: provider.provider_name,
        logoPath: provider.logo_path ?? "",
        displayPriority: priorityFor(provider, available),
        regions: available,
      });
    }
  }

  return [...byId.values()].sort(
    (a, b) => a.displayPriority - b.displayPriority || a.name.localeCompare(b.name)
  );
}

function regionsFor(provider: TmdbProvider, regions: string[]): string[] {
  const priorities = provider.display_priorities;

  // No per-region map means TMDB did not scope this provider; treat it as
  // available everywhere requested rather than dropping it from the catalog.
  if (!priorities) return [...regions];

  return regions.filter((region) => region in priorities);
}

function priorityFor(provider: TmdbProvider, available: string[]): number {
  const priorities = provider.display_priorities;
  if (priorities) {
    const scoped = available.map((region) => priorities[region]).filter((value) => typeof value === "number");
    if (scoped.length > 0) return Math.min(...scoped);
  }
  return provider.display_priority ?? Number.MAX_SAFE_INTEGER;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --import tsx --test tests/providerCatalog.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/providerCatalog.ts tests/providerCatalog.test.ts
git commit -m "feat: add provider catalog merge and region parsing

Pure logic for the providers-list route: alpha-2 region validation,
movie+TV dedupe by provider id, region filtering, and priority sort.

Part of #13"
```

---

### Task 3: `GET /api/tmdb/providers-list` route

**Files:**
- Create: `pages/api/tmdb/providers-list.ts`
- Test: manual (route smoke test via `curl`) — the merge logic is already covered by Task 2

**Interfaces:**
- Consumes: `parseRegions`, `mergeProviderCatalog`, `CatalogProvider` from `lib/providerCatalog`
- Produces: `GET /api/tmdb/providers-list?regions=US,GB` → `200 { providers: CatalogProvider[] }`

- [ ] **Step 1: Write the route**

Create `pages/api/tmdb/providers-list.ts`, following the shape of the sibling routes in the same directory:

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { mergeProviderCatalog, parseRegions, type TmdbProviderResponse } from "@/lib/providerCatalog";

const API_BASE = "https://api.themoviedb.org/3";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const regions = parseRegions(req.query.regions);

  if (!regions) {
    return res.status(400).json({
      error: "regions is required as a comma-separated list of ISO-3166-1 alpha-2 codes, e.g. regions=US,GB",
    });
  }

  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(`${API_BASE}/watch/providers/movie?api_key=${apiKey}`),
      fetch(`${API_BASE}/watch/providers/tv?api_key=${apiKey}`),
    ]);

    // A partial outage still yields a usable catalog, so only fail when both die.
    if (!movieRes.ok && !tvRes.ok) {
      return res.status(502).json({ error: "Failed to fetch provider catalog" });
    }

    const payloads: TmdbProviderResponse[] = await Promise.all(
      [movieRes, tvRes].map(async (response) => (response.ok ? await response.json() : {}))
    );

    const providers = mergeProviderCatalog(payloads, regions);

    // The catalog changes rarely; cache it for a day.
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).json({ providers });
  } catch (error) {
    console.error("TMDB providers-list error:", error);
    return res.status(500).json({ error: "Failed to fetch provider catalog" });
  }
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: succeeds, and the route list includes `/api/tmdb/providers-list`.

- [ ] **Step 3: Smoke-test the route manually**

Start the dev server in one terminal:

```bash
npm run dev
```

In another terminal:

```bash
curl -s "http://localhost:3000/api/tmdb/providers-list?regions=US,GB" | head -c 400
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/tmdb/providers-list?regions=USA"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/tmdb/providers-list"
```

Expected: a JSON object whose `providers` array contains entries like `{"id":8,"name":"Netflix",...,"regions":["US","GB"]}`; then `400`; then `400`.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add pages/api/tmdb/providers-list.ts
git commit -m "feat: add providers-list TMDB proxy route

Merged movie+TV provider catalog scoped to the requested regions,
cached for a day. Part of #13"
```

---

### Task 4: "My Services" picker in Settings

Delivers story #13. Country tabs, one global selection set, a summary strip so selections made under other tabs stay visible.

**Files:**
- Create: `components/ServicePicker.tsx`
- Modify: `pages/settings.tsx` (import and render the new section)
- Test: manual (interactive UI) — selection logic lives in the component's local state

**Interfaces:**
- Consumes: `CatalogProvider` from `lib/providerCatalog`; `FavoriteService`, `UserPreferences` from `lib/firestore`; `useAuth` from `lib/AuthContext`
- Produces: `export default function ServicePicker(): JSX.Element`

- [ ] **Step 1: Write the component**

Create `components/ServicePicker.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Search, Tv2, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import type { FavoriteService } from "@/lib/firestore";
import type { CatalogProvider } from "@/lib/providerCatalog";
import { getCountryMeta } from "@/lib/countries";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function ServicePicker() {
  const { user, preferences, updatePreferences } = useAuth();
  const favoriteCountries = useMemo(
    () => preferences?.favoriteCountries ?? [],
    [preferences?.favoriteCountries]
  );

  const [catalog, setCatalog] = useState<CatalogProvider[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [selected, setSelected] = useState<FavoriteService[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(preferences?.favoriteServices ?? []);
  }, [preferences?.favoriteServices]);

  useEffect(() => {
    if (favoriteCountries.length === 0) {
      setCatalog([]);
      setState("idle");
      return;
    }

    setActiveCountry((current) =>
      current && favoriteCountries.includes(current) ? current : favoriteCountries[0]
    );

    let cancelled = false;
    setState("loading");

    fetch(`/api/tmdb/providers-list?regions=${favoriteCountries.join(",")}`)
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
  }, [favoriteCountries]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog
      .filter((provider) => (activeCountry ? provider.regions.includes(activeCountry) : false))
      .filter((provider) => (term === "" ? true : provider.name.toLowerCase().includes(term)));
  }, [catalog, activeCountry, search]);

  const isSelected = (id: number) => selected.some((service) => service.id === id);

  const toggle = (provider: CatalogProvider) => {
    setSelected((current) =>
      current.some((service) => service.id === provider.id)
        ? current.filter((service) => service.id !== provider.id)
        : [...current, { id: provider.id, name: provider.name, logoPath: provider.logoPath }]
    );
  };

  const remove = (id: number) => setSelected((current) => current.filter((s) => s.id !== id));

  const save = async () => {
    setSaving(true);
    try {
      await updatePreferences({ favoriteServices: selected });
    } finally {
      setSaving(false);
    }
  };

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

      {favoriteCountries.length === 0 ? (
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
                  style={{ background: "rgba(59, 130, 246, 0.1)" }}
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

          <div role="tablist" aria-label="Countries" className="flex flex-wrap gap-2 mb-4">
            {favoriteCountries.map((code) => {
              const meta = getCountryMeta(code);
              const active = code === activeCountry;
              return (
                <button
                  key={code}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCountry(code)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: active ? "var(--accent)" : "var(--card)",
                    color: active ? "#fff" : "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {meta?.flag} {meta?.name ?? code}
                </button>
              );
            })}
          </div>

          <div className="search-wrapper mb-4">
            <Search size={18} className="search-icon" />
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
              <button onClick={() => setSearch((s) => s)} className="underline">Retry</button>
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
                      background: chosen ? "rgba(59, 130, 246, 0.1)" : "var(--card)",
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

          <button onClick={save} disabled={saving} className="btn-primary mt-6">
            {saving ? "Saving..." : `Save Services (${selected.length})`}
          </button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Render it in Settings**

In `pages/settings.tsx`, add the import beside the existing imports at the top:

```tsx
import ServicePicker from "@/components/ServicePicker";
```

Then render it directly after the closing `</div>` of the country grid and before the sticky Save button block (the `{user && (` block near the end of the file):

```tsx
        <ServicePicker />
      </div>

      {/* Save Button */}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Verify by hand**

Run `npm run dev`, sign in, and visit `/settings`. Check each of:

- With no favorite countries selected, "My Services" shows the "choose a country first" message.
- Selecting two countries makes two tabs appear; each tab lists that country's services.
- Selecting Netflix under the first tab leaves it selected when you switch to the second tab (if Netflix operates there) and shows it in the summary strip either way.
- The summary strip's remove button deselects.
- "Save Services" persists — reload the page and the selections survive.
- Toggle the theme; the selected state is legible in both.

- [ ] **Step 5: Run the anti-slop detector**

Run: `impeccable detect components/ServicePicker.tsx pages/settings.tsx`
Expected: exit 0. Fix any finding and re-run until clean.

- [ ] **Step 6: Run the full suite and commit**

```bash
npm test
git add components/ServicePicker.tsx pages/settings.tsx
git commit -m "feat: add My Services picker to settings

Country-tabbed provider picker with one global selection set and a
summary strip so choices made under other tabs stay visible.

Closes #13"
```

---

### Task 5: Discover merge logic

**Files:**
- Create: `lib/discoverMerge.ts`
- Test: `tests/discoverMerge.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type DiscoverItem = { id: number; media_type: "movie" | "tv"; title?: string; name?: string; poster_path: string | null; popularity?: number; release_date?: string; first_air_date?: string }`
  - `export const MAX_DISCOVER_REGIONS = 5`
  - `export const MAX_DISCOVER_RESULTS = 20`
  - `export function parseProviderIds(raw: unknown): number[] | null`
  - `export function mergeDiscoverResults(pages: DiscoverItem[][]): DiscoverItem[]`

- [ ] **Step 1: Write the failing test**

Create `tests/discoverMerge.test.ts`:

```ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseProviderIds,
  mergeDiscoverResults,
  MAX_DISCOVER_RESULTS,
  type DiscoverItem,
} from "../lib/discoverMerge";

const movie = (id: number, popularity: number): DiscoverItem => ({
  id,
  media_type: "movie",
  title: `Movie ${id}`,
  poster_path: `/${id}.jpg`,
  popularity,
});

const show = (id: number, popularity: number): DiscoverItem => ({
  id,
  media_type: "tv",
  name: `Show ${id}`,
  poster_path: `/${id}.jpg`,
  popularity,
});

describe("parseProviderIds", () => {
  test("parses a pipe-separated list", () => {
    assert.deepEqual(parseProviderIds("8|337"), [8, 337]);
  });

  test("parses a single id", () => {
    assert.deepEqual(parseProviderIds("8"), [8]);
  });

  test("dedupes and preserves first-seen order", () => {
    assert.deepEqual(parseProviderIds("8|337|8"), [8, 337]);
  });

  test("rejects non-numeric, negative, and malformed input", () => {
    assert.equal(parseProviderIds("8|abc"), null);
    assert.equal(parseProviderIds("-8"), null);
    assert.equal(parseProviderIds("8.5"), null);
    assert.equal(parseProviderIds("8||337"), null);
  });

  test("rejects absent, empty, or non-string input", () => {
    assert.equal(parseProviderIds(undefined), null);
    assert.equal(parseProviderIds(""), null);
    assert.equal(parseProviderIds(["8"]), null);
  });
});

describe("mergeDiscoverResults", () => {
  test("dedupes by media type and id across pages", () => {
    const merged = mergeDiscoverResults([[movie(1, 50)], [movie(1, 50), movie(2, 10)]]);

    assert.deepEqual(merged.map((item) => item.id), [1, 2]);
  });

  test("treats the same id in different media types as different titles", () => {
    const merged = mergeDiscoverResults([[movie(1, 10), show(1, 20)]]);

    assert.equal(merged.length, 2);
  });

  test("sorts by popularity descending", () => {
    const merged = mergeDiscoverResults([[movie(1, 5), movie(2, 90), movie(3, 40)]]);

    assert.deepEqual(merged.map((item) => item.id), [2, 3, 1]);
  });

  test("treats a missing popularity as zero rather than dropping the item", () => {
    const noPopularity = { id: 4, media_type: "movie" as const, title: "X", poster_path: null };
    const merged = mergeDiscoverResults([[noPopularity, movie(1, 10)]]);

    assert.deepEqual(merged.map((item) => item.id), [1, 4]);
  });

  test("caps the result at MAX_DISCOVER_RESULTS", () => {
    const many = Array.from({ length: 40 }, (_, i) => movie(i, i));
    const merged = mergeDiscoverResults([many]);

    assert.equal(merged.length, MAX_DISCOVER_RESULTS);
    // Highest popularity first, so the cap keeps the most popular.
    assert.equal(merged[0].id, 39);
  });

  test("tolerates empty pages from failed upstream calls", () => {
    const merged = mergeDiscoverResults([[], [movie(1, 10)], []]);

    assert.deepEqual(merged.map((item) => item.id), [1]);
  });

  test("returns an empty array when every page is empty", () => {
    assert.deepEqual(mergeDiscoverResults([[], []]), []);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test tests/discoverMerge.test.ts`
Expected: FAIL — cannot find module `../lib/discoverMerge`.

- [ ] **Step 3: Write the implementation**

Create `lib/discoverMerge.ts`:

```ts
// Pure logic behind GET /api/tmdb/discover.

export type DiscoverItem = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
};

/** TMDB is queried once per region per media type, so this bounds the fan-out at 10 calls. */
export const MAX_DISCOVER_REGIONS = 5;

export const MAX_DISCOVER_RESULTS = 20;

const POSITIVE_INT = /^\d+$/;

/**
 * Parses the `providers` query param, which is pipe-separated to match the
 * format TMDB's `with_watch_providers` expects. Returns null when malformed.
 */
export function parseProviderIds(raw: unknown): number[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  const parts = raw.split("|").map((part) => part.trim());

  if (parts.some((part) => !POSITIVE_INT.test(part))) return null;

  const ids = parts.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id))) return null;

  return [...new Set(ids)];
}

/**
 * Merges one results page per region per media type into a single ranked list.
 * Pages from failed calls arrive empty, so a partial outage degrades the list
 * rather than failing the request.
 */
export function mergeDiscoverResults(pages: DiscoverItem[][]): DiscoverItem[] {
  const byKey = new Map<string, DiscoverItem>();

  for (const page of pages) {
    for (const item of page) {
      const key = `${item.media_type}:${item.id}`;
      if (!byKey.has(key)) byKey.set(key, item);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, MAX_DISCOVER_RESULTS);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --import tsx --test tests/discoverMerge.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/discoverMerge.ts tests/discoverMerge.test.ts
git commit -m "feat: add discover merge and provider-id parsing

Cross-region dedupe by (media_type, id), popularity sort, top-20 cap,
and pipe-separated provider id validation.

Part of #14"
```

---

### Task 6: `GET /api/tmdb/discover` route

**Files:**
- Create: `pages/api/tmdb/discover.ts`
- Test: manual (`curl`)

**Interfaces:**
- Consumes: `parseProviderIds`, `mergeDiscoverResults`, `MAX_DISCOVER_REGIONS`, `DiscoverItem` from `lib/discoverMerge`; `parseRegions` from `lib/providerCatalog`
- Produces: `GET /api/tmdb/discover?regions=US,GB&providers=8|337` → `200 { results: DiscoverItem[], regionsUsed: string[] }`

- [ ] **Step 1: Write the route**

Create `pages/api/tmdb/discover.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parseRegions } from "@/lib/providerCatalog";
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

  if (!providers) {
    return res.status(400).json({
      error: "providers is required as a pipe-separated list of TMDB provider ids, e.g. providers=8|337",
    });
  }

  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "TMDB API key not configured" });
  }

  // Bound the fan-out; the response reports what was actually queried so the UI
  // can be honest about coverage rather than implying it searched everywhere.
  const regionsUsed = allRegions.slice(0, MAX_DISCOVER_REGIONS);
  const providerParam = providers.join("|");

  const requests = regionsUsed.flatMap((region) =>
    MEDIA_TYPES.map(async (mediaType): Promise<DiscoverItem[]> => {
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
      return (data.results ?? []).map((item: any) => ({
        id: item.id,
        media_type: mediaType,
        title: item.title,
        name: item.name,
        poster_path: item.poster_path,
        popularity: item.popularity,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
      }));
    })
  );

  const settled = await Promise.allSettled(requests);
  const succeeded = settled.filter(
    (result): result is PromiseFulfilledResult<DiscoverItem[]> => result.status === "fulfilled"
  );

  // Only a total failure is an error; otherwise merge whatever came back.
  if (succeeded.length === 0) {
    console.error("TMDB discover error: every upstream call failed");
    return res.status(502).json({ error: "Failed to fetch discover results" });
  }

  const results = mergeDiscoverResults(succeeded.map((result) => result.value));

  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
  return res.status(200).json({ results, regionsUsed });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: succeeds, and the route list includes `/api/tmdb/discover`.

- [ ] **Step 3: Smoke-test the route manually**

With `npm run dev` running:

```bash
curl -s "http://localhost:3000/api/tmdb/discover?regions=US&providers=8" | head -c 400
curl -s "http://localhost:3000/api/tmdb/discover?regions=US,GB,DE,FR,ES,IT,JP&providers=8" | python3 -c "import json,sys; print(json.load(sys.stdin)['regionsUsed'])"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/tmdb/discover?regions=US"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/tmdb/discover?providers=8"
```

Expected: a `results` array of Netflix US titles; then `['US', 'GB', 'DE', 'FR', 'ES']` (capped at five); then `400`; then `400`.

- [ ] **Step 4: Commit**

```bash
git add pages/api/tmdb/discover.ts
git commit -m "feat: add discover TMDB proxy route

Fans out one query per region per media type (capped at 5 regions),
tolerates partial upstream failure, reports regionsUsed.

Part of #14"
```

---

### Task 7: "On My Services" home row

Delivers story #14. The row renders first when it has something to show and is entirely absent otherwise — the home page never shows an error for it.

**Files:**
- Modify: `pages/index.tsx` (imports, new state, new effect, render the row first)
- Test: manual

**Interfaces:**
- Consumes: `DiscoverItem` from `lib/discoverMerge`; `useAuth` from `lib/AuthContext`; the existing local `MediaRow` component and `TMDBResult` type in `pages/index.tsx`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add the imports**

In `pages/index.tsx`, add `Sparkles` to the existing lucide named-import list on line 3:

```tsx
import { Search, X, Film, Tv, TrendingUp, Star, Clock, Play, Sparkles } from "lucide-react";
```

And add the auth import alongside the other `@/lib` imports:

```tsx
import { useAuth } from "@/lib/AuthContext";
```

- [ ] **Step 2: Add state and the fetch effect**

Inside the component, next to the other browse-row state declarations (around line 32), add:

```tsx
  const { user, preferences } = useAuth();
  const [onMyServices, setOnMyServices] = useState<TMDBResult[]>([]);
```

Then add this effect below the existing browse-fetch effect:

```tsx
  // Personalized row. Deliberately silent on every failure path: if the user is
  // signed out, has no services, or the request fails, the row simply does not
  // render — the home page never shows an error for it.
  useEffect(() => {
    const countries = preferences?.favoriteCountries ?? [];
    const services = preferences?.favoriteServices ?? [];

    if (!user || countries.length === 0 || services.length === 0) {
      setOnMyServices([]);
      return;
    }

    let cancelled = false;
    const regions = countries.join(",");
    const providers = services.map((service) => service.id).join("|");

    fetch(`/api/tmdb/discover?regions=${regions}&providers=${providers}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: { results: TMDBResult[] }) => {
        if (!cancelled) setOnMyServices(data.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setOnMyServices([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user, preferences?.favoriteCountries, preferences?.favoriteServices]);
```

- [ ] **Step 3: Render the row first**

In the browse-list branch (the `<>` that currently starts with `<MediaRow title="Trending Movies" ...`), add the personalized row as the first child:

```tsx
              <>
                {onMyServices.length > 0 && (
                  <MediaRow
                    title="On My Services"
                    icon={<Sparkles size={24} style={{ color: "var(--accent)" }} />}
                    items={onMyServices}
                  />
                )}
                <MediaRow title="Trending Movies" icon={<TrendingUp size={24} style={{ color: "var(--accent)" }} />} items={trendingMovies} />
```

Leave the rest of the rows unchanged.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Verify by hand**

Run `npm run dev` and check each of:

- Signed out: no "On My Services" row, no error, other rows render normally.
- Signed in with no services saved: row absent.
- Signed in with services and countries saved: the row renders first, above "Trending Movies", with real posters.
- Stop the dev server's network access (or temporarily point the fetch at a bad path) and reload: the row is absent and the page still renders. Restore the path afterwards.

- [ ] **Step 6: Run the anti-slop detector**

Run: `impeccable detect pages/index.tsx`
Expected: exit 0. Fix any finding and re-run until clean.

- [ ] **Step 7: Run the full suite and commit**

```bash
npm test
git add pages/index.tsx
git commit -m "feat: add On My Services row to home

Renders first when the user has services and results exist; absent on
every failure path so the home page never shows an error for it.

Closes #14"
```

---

### Task 8: Two-tier provider split logic

**Files:**
- Create: `lib/providerPreferences.ts`
- Test: `tests/providerPreferences.test.ts`

**Interfaces:**
- Consumes: `FavoriteService` from `lib/firestore`
- Produces:
  - `type WatchProvider = { provider_id: number; provider_name: string; logo_path: string | null }`
  - `type ProviderTiers<T> = { preferred: T[]; others: T[] }`
  - `export function splitProvidersByPreference<T extends WatchProvider>(providers: T[], favoriteServices: FavoriteService[]): ProviderTiers<T>`

- [ ] **Step 1: Write the failing test**

Create `tests/providerPreferences.test.ts`:

```ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { splitProvidersByPreference } from "../lib/providerPreferences";
import type { FavoriteService } from "../lib/firestore";

const provider = (id: number, name: string) => ({
  provider_id: id,
  provider_name: name,
  logo_path: `/${id}.jpg`,
});

const netflix = provider(8, "Netflix");
const prime = provider(9, "Prime Video");
const disney = provider(337, "Disney Plus");

const services: FavoriteService[] = [
  { id: 8, name: "Netflix", logoPath: "/8.jpg" },
  { id: 337, name: "Disney Plus", logoPath: "/337.jpg" },
];

describe("splitProvidersByPreference", () => {
  test("splits into the user's services and everything else", () => {
    const { preferred, others } = splitProvidersByPreference([prime, netflix, disney], services);

    assert.deepEqual(preferred.map((p) => p.provider_id), [8, 337]);
    assert.deepEqual(others.map((p) => p.provider_id), [9]);
  });

  test("preserves the original ordering inside each tier", () => {
    const { preferred } = splitProvidersByPreference([disney, netflix], services);

    assert.deepEqual(preferred.map((p) => p.provider_id), [337, 8]);
  });

  test("puts everything in others when the user has no services", () => {
    const { preferred, others } = splitProvidersByPreference([netflix, prime], []);

    assert.deepEqual(preferred, []);
    assert.deepEqual(others.map((p) => p.provider_id), [8, 9]);
  });

  test("leaves the preferred tier empty when none of the user's services are present", () => {
    const { preferred, others } = splitProvidersByPreference([prime], services);

    assert.deepEqual(preferred, []);
    assert.deepEqual(others.map((p) => p.provider_id), [9]);
  });

  test("leaves the others tier empty when every provider is one of the user's", () => {
    const { preferred, others } = splitProvidersByPreference([netflix, disney], services);

    assert.deepEqual(preferred.map((p) => p.provider_id), [8, 337]);
    assert.deepEqual(others, []);
  });

  test("handles an empty provider list", () => {
    const { preferred, others } = splitProvidersByPreference([], services);

    assert.deepEqual(preferred, []);
    assert.deepEqual(others, []);
  });

  test("never drops a provider — the two tiers always account for all of them", () => {
    const all = [netflix, prime, disney];
    const { preferred, others } = splitProvidersByPreference(all, services);

    assert.equal(preferred.length + others.length, all.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --test tests/providerPreferences.test.ts`
Expected: FAIL — cannot find module `../lib/providerPreferences`.

- [ ] **Step 3: Write the implementation**

Create `lib/providerPreferences.ts`:

```ts
import type { FavoriteService } from "./firestore";

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

export type ProviderTiers<T> = {
  preferred: T[];
  others: T[];
};

/**
 * Groups a country's providers into the user's own services first, then the
 * rest. This only ever reorders: every input provider appears in exactly one
 * tier, so nothing is hidden from the user.
 */
export function splitProvidersByPreference<T extends WatchProvider>(
  providers: T[],
  favoriteServices: FavoriteService[]
): ProviderTiers<T> {
  const preferredIds = new Set(favoriteServices.map((service) => service.id));

  const preferred: T[] = [];
  const others: T[] = [];

  for (const provider of providers) {
    if (preferredIds.has(provider.provider_id)) {
      preferred.push(provider);
    } else {
      others.push(provider);
    }
  }

  return { preferred, others };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --import tsx --test tests/providerPreferences.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/providerPreferences.ts tests/providerPreferences.test.ts
git commit -m "feat: add provider preference split

Pure two-tier grouping keyed by TMDB provider id; reorders only, never
hides. Part of #15"
```

---

### Task 9: Two-tier where-to-watch on the detail page

Delivers story #15. Applies the split within each country's **Stream** (`flatrate`) list only — rent and buy are outside the "available on your services" definition and stay as they are.

**Files:**
- Modify: `pages/details/[id].tsx` (imports, and the `flatrate` rendering block around lines 328-345)
- Test: manual

**Interfaces:**
- Consumes: `splitProvidersByPreference` from `lib/providerPreferences`; `useAuth` from `lib/AuthContext`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Add the imports and read the user's services**

In `pages/details/[id].tsx`, add to the imports:

```tsx
import { splitProvidersByPreference } from "@/lib/providerPreferences";
```

The page already destructures `preferences` from `useAuth()` at line 20 and derives `favoriteCountries` at line 36. Add a sibling derivation directly below line 36:

```tsx
  const favoriteServices = preferences?.favoriteServices ?? [];
```

The `Provider` type used by the cast in Step 2 is already declared at line 12 of this file — no import needed.

- [ ] **Step 2: Replace the flatrate rendering block**

Find the block that renders the Stream section (currently around lines 328-345), which looks like:

```tsx
                              {countryData?.flatrate?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--accent)" }}>
                                    Stream
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {countryData.flatrate.map((p: Provider) => (
```

Replace the whole `{countryData?.flatrate?.length > 0 && ( ... )}` expression with:

```tsx
                              {countryData?.flatrate?.length > 0 && (() => {
                                const { preferred, others } = splitProvidersByPreference(
                                  countryData.flatrate as Provider[],
                                  favoriteServices
                                );

                                // Degenerate cases render exactly as before: one
                                // flat "Stream" list with no sub-headings.
                                const tiers =
                                  preferred.length === 0 || others.length === 0
                                    ? [{ label: "Stream", items: preferred.length > 0 ? preferred : others }]
                                    : [
                                        { label: "Your services", items: preferred },
                                        { label: "Also available on", items: others },
                                      ];

                                return (
                                  <div className="space-y-3">
                                    {tiers.map((tier) => (
                                      <div key={tier.label}>
                                        <p
                                          className="text-xs font-semibold uppercase mb-2"
                                          style={{ color: "var(--accent)" }}
                                        >
                                          {tier.label}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {tier.items.map((p: Provider) => (
                                            <div
                                              key={p.provider_name}
                                              className="relative w-10 h-10 rounded-lg overflow-hidden"
                                              title={p.provider_name}
                                              style={
                                                tier.label === "Your services"
                                                  ? { boxShadow: "0 0 0 2px var(--accent)" }
                                                  : undefined
                                              }
                                            >
                                              <Image
                                                src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                                                alt={p.provider_name}
                                                fill
                                                sizes="40px"
                                                className="object-cover"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
```

If the existing `<Image>` props differ from the above (different `sizes`, `alt`, or class names), keep the existing ones — only the surrounding tier structure is changing.

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Verify by hand**

Run `npm run dev` and open a title with wide availability (for example `/details/693134?type=movie`). Check each of:

- Signed out: a single "Stream" heading, flat list, exactly as before this change.
- Signed in with no services: same flat rendering.
- Signed in with Netflix saved, viewing a country where Netflix carries the title: "Your services" appears first with Netflix ringed in the accent color, "Also available on" below.
- A country where none of your services carry the title: flat "Stream" list, no empty "Your services" heading.
- Rent and Buy sections are untouched.
- Toggle the theme; the accent ring is visible in both.

- [ ] **Step 5: Run the anti-slop detector**

Run: `impeccable detect pages/details/[id].tsx`
Expected: exit 0. Fix any finding and re-run until clean.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS, 59 tests (20 baseline + 6 + 13 + 13 + 7).

- [ ] **Step 7: Commit**

```bash
git add "pages/details/[id].tsx"
git commit -m "feat: group where-to-watch by preferred services

Within each country's Stream list, the user's own services render first
under 'Your services' with the rest under 'Also available on'. Falls
back to today's flat list when either tier would be empty.

Closes #15"
```

---

### Task 10: Update the docs and open the PR

**Files:**
- Modify: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `README.md`

- [ ] **Step 1: Update the architecture map**

In `docs/ARCHITECTURE.md`, add the two new routes to the directory map's `api/tmdb/` line (now 8 routes), add `providerCatalog.ts`, `discoverMerge.ts`, and `providerPreferences.ts` to the `lib/` list, and add `favoriteServices` to the preferences shape described under "Auth & preferences".

- [ ] **Step 2: Record the decision**

Append to `docs/DECISIONS.md`:

```markdown
## 2026-07-19 — Preferred services are one flat global set, and only reorder

- **Decision:** `favoriteServices` is a single flat list of TMDB provider IDs applied across every favorite country, not a per-country mapping. On detail pages the selection only ever reorders providers into "Your services" and "Also available on" — nothing is hidden.
- **Alternatives:** per-country service selections; a "my services only" filter toggle.
- **Why:** TMDB provider IDs are global (Netflix is 8 everywhere), so a flat set is coherent — a service simply never matches in a country where it does not operate. Reordering rather than filtering keeps the country-comparison view, which is the product's reason to exist, intact.
```

- [ ] **Step 3: Add the feature to the README**

Add a bullet under Features:

```markdown
- **Your services** — save the streaming services you subscribe to; they power a personalized home row and surface first on every title's where-to-watch.
```

- [ ] **Step 4: Run the full suite unpiped**

Run: `npm test`
Expected: PASS, 59 tests. This satisfies the push gate.

- [ ] **Step 5: Commit and push**

```bash
git add docs/ARCHITECTURE.md docs/DECISIONS.md README.md
git commit -m "docs: record preferred-services routes and decision

Part of #3"
git push -u origin v2
```

- [ ] **Step 6: Run the code review gate, then open the PR**

The repo's shipping gates require a code review before `gh pr create`. Run `/code-review`, address the findings, then:

```bash
gh pr create --repo aurora-peak/watchatlas-web --base main --head v2 \
  --title "feat: preferred streaming services" \
  --body "Implements feature #3 from docs/superpowers/specs/2026-07-19-preferred-services-design.md.

Closes #13
Closes #14
Closes #15

## What

- \`favoriteServices\` on user preferences, hardened by \`normalizePreferences\`
- \`GET /api/tmdb/providers-list\` — merged movie+TV catalogue scoped to the user's countries
- \`GET /api/tmdb/discover\` — titles available on the user's services, capped at 5 regions
- Country-tabbed service picker in Settings, with one global selection set
- \"On My Services\" row rendered first on home, silently absent on every failure path
- Two-tier where-to-watch on detail pages — reorders, never hides

## Testing

39 new unit tests over the pure logic (catalogue merge, region and provider parsing, discover merge, preference split, preference normalization). Manual verification steps are listed per task in docs/superpowers/plans/2026-07-19-preferred-services.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task: data model → Task 1; catalog route → Tasks 2-3; Settings UI → Task 4; discover route → Tasks 5-6; home row → Task 7; detail-page grouping → Tasks 8-9; pure logic and tests → Tasks 2, 5, 8 (and 1); error-handling table → covered by the route implementations in Tasks 3 and 6 and the silent-failure paths in Tasks 4 and 7.

**One deliberate deviation from the spec.** The spec put `splitProvidersByPreference` in `lib/discoverMerge.ts` "or a sibling". This plan puts it in its own `lib/providerPreferences.ts`, because it shares no logic with discover merging and the two files change for different reasons.

**One open assumption to verify during Task 3.** The catalog route derives per-region availability from TMDB's `display_priorities` map rather than issuing one `watch_region`-scoped call per region. This is what makes a single pair of upstream calls sufficient. If the smoke test in Task 3 Step 3 shows providers with an empty or obviously wrong `regions` array, fall back to one `?watch_region=` call per region per media type (bounded, like discover, at 5 regions) and re-run the Task 2 tests unchanged — `mergeProviderCatalog` accepts either shape.
