# Preferred Services + "On My Services" Row — Design Spec

**Date:** 2026-07-19 · **Status:** Approved design, pending implementation plan
**Project:** #2 in the roadmap (services → watchlist/alerts → AI recs → UI redesign; see `docs/DECISIONS.md`)

## Goal

Let signed-in users pick the streaming services they subscribe to, and use that to power a personalized **"On My Services"** row on the home page. This is the foundation for watchlist leaving/coming-soon alerts (project #3) and the recommendation engine (project #4), both of which consume the user's service selections by TMDB provider ID.

## Scope

**In:** service selection UI in Settings, `favoriteServices` in Firestore preferences, two new TMDB proxy routes (provider catalog, discover), one new home-page row, two-tier grouping of the detail page's where-to-watch view, unit tests for the pure logic.

**Out (deliberate):** hiding/filtering providers on detail pages (a "my services only" toggle), signed-out/localStorage preferences, per-country service lists, any watchlist or recommendation behavior.

## Decisions made during brainstorm

1. **Flat service list, not per-country.** One global set of selections applied across all favorite countries. TMDB provider IDs are global (Netflix = 8 everywhere), so a flat set is coherent; a service simply never matches in a country where it doesn't operate.
2. **Services power the home row and detail-page grouping.** (Revised during spec review — originally home row only.) Detail pages group each country's providers into "Your services" first, then "Also available on"; nothing is ever hidden.
3. **Approach A:** extend the existing preference model and proxy-route architecture (vs. localStorage-first preferences, or a hardcoded curated service list — both rejected).
4. **Picker UX: country tabs.** One tab per favorite country; each tab shows that country's catalog; selections are global, so a service chosen in one tab appears selected in every tab that offers it.

## Design

### 1. Data model

`UserPreferences` in `lib/firestore.ts` gains:

```ts
favoriteServices: { id: number; name: string; logoPath: string }[]   // default []
```

- `id` is the TMDB provider ID — the canonical key used by Discover and watch-provider payloads.
- `name`/`logoPath` are denormalized for instant rendering without a catalog fetch.
- Persisted with the existing `setDoc(..., { merge: true })` + 10s-timeout wrapper. No migration needed: absent field reads as `[]` via the existing defaults pattern.

### 2. Provider catalog route — `GET /api/tmdb/providers-list?regions=IN,US`

- Server-side calls TMDB `/watch/providers/movie` and `/watch/providers/tv` (in parallel), merges and dedupes by `provider_id`.
- Keeps only providers available in ≥1 requested region; response includes per-provider region availability so the client can build country tabs from one call:

```ts
{ providers: { id: number; name: string; logoPath: string; displayPriority: number; regions: string[] }[] }
```

- Sorted by `display_priority`. Regions param validated against ISO-3166-1 alpha-2 shape; 400 on invalid/missing.
- `Cache-Control: s-maxage=86400, stale-while-revalidate` (catalog changes rarely).
- Uses **`TMDB_API_KEY` only** — new routes never read `NEXT_PUBLIC_TMDB_API_KEY` (CLAUDE.md rule).

### 3. Settings UI — "My Services"

- New section on `pages/settings.tsx`, directly below favorite countries; same signed-in gate.
- **Country tabs:** one tab per favorite country (in the user's saved order). Each tab renders that country's providers (filtered client-side from the single catalog response) as a logo grid sorted by display priority, with a search box filtering the active tab.
- **Selections are global:** toggling a provider updates one flat set; a selected provider shows as selected in every tab that lists it. A summary strip above the tabs shows all currently selected services (with remove affordance) so selections from other tabs stay visible.
- Empty states: no favorite countries yet → prompt to pick countries first (the catalog needs regions); catalog fetch failure → inline retry message, never a crash.
- Saves through the existing `updatePreferences`; logos served from `image.tmdb.org` (already whitelisted in `next.config.js`).

### 4. Discover route — `GET /api/tmdb/discover?regions=IN,US&providers=8|337`

- Server-side fans out one TMDB Discover query per region **for movies and one for TV** (`with_watch_providers=8|337` pipe-joined, `watch_region`, `with_watch_monetization_types=flatrate|free|ads`, `sort_by=popularity.desc`).
- Fan-out bound: first **5** regions max (10 TMDB calls worst case). Regions beyond 5 are ignored, and the response notes `regionsUsed` so the UI is honest about coverage.
- Merges the first results page from each call (no pagination), dedupes by `(media_type, id)`, sorts by popularity, returns top 20 with `media_type` stamped on each item.
- Partial failure tolerated: merge whatever succeeded; 502 only if *every* upstream call fails. Param validation as in the catalog route.
- `Cache-Control: s-maxage=600, stale-while-revalidate` (matches other list routes).

### 5. Home row — "On My Services"

- Rendered on `pages/index.tsx` as the **first** row (it's the personalized one), reusing the existing row + `ShowCard` pattern.
- Fetches `/api/tmdb/discover` with the user's favorite countries and service IDs on mount (client-side, like other rows).
- The row does not render at all when: signed out, `favoriteServices` empty, fetch fails, or results empty. The home page never shows an error state for this row.
- Reflects preference changes on next page load (no live re-fetch plumbing).

### 6. Detail page — two-tier where-to-watch

- In `pages/details/[id].tsx`, within each country's provider list, providers whose ID is in `favoriteServices` render first under a **"Your services"** heading, visually distinct (e.g., accent border/badge per the existing CSS-variable system); all remaining providers follow under **"Also available on"**.
- The split is applied per country via a pure helper (`splitProvidersByPreference` in `lib/discoverMerge.ts` or a sibling), keyed by TMDB provider ID.
- Degenerate cases: signed out or no services → today's flat rendering, no headings; none of the user's services present in a given country → that country renders the flat list, no empty "Your services" tier; all providers are the user's → "Also available on" tier omitted.
- Existing stream/rent/buy semantics within the list are unchanged — this project only reorders and groups.

### 7. Pure logic + tests

- Merge/dedupe/sort for both routes lives in pure functions in `lib/discoverMerge.ts` (and a small catalog-merge helper), imported by the API routes.
- **First real tests in the repo**, using the already-wired node test runner (`npm test`):
  - catalog merge: movie+TV dedupe, region filtering, priority sort;
  - discover merge: cross-region dedupe by `(media_type, id)`, popularity sort, top-20 cap, partial-failure input;
  - param validation helpers (regions/providers parsing);
  - `splitProvidersByPreference`: preferred-first ordering, empty-tier omission, signed-out passthrough.

## Error handling summary

| Failure | Behavior |
| --- | --- |
| Invalid query params | 400 with message |
| TMDB partially down (some regions fail) | Merge successful responses; row still renders |
| TMDB fully down | Route 502; Settings shows retry message; home row hidden |
| Signed out / no services | Settings section gated; home row absent; detail page renders today's flat list |

## Backlog mapping

One `feat: preferred streaming services` issue with stories, linked as sub-issues on the WatchAtlas board:

1. `story: pick my services in settings` (data model + catalog route + tabbed picker)
2. `story: see an "On My Services" row on home` (discover route + row)
3. `story: see my services first on a title's where-to-watch` (two-tier grouping on detail pages)

Tasks get created during the coding sessions, per convention.
