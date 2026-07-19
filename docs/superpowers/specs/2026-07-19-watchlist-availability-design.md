# Watchlist + Availability Changes — Design Spec

**Date:** 2026-07-19 · **Status:** Approved design, pending implementation plan
**Project:** #3 in the roadmap (services → **watchlist/alerts** → AI recs → UI redesign; see `docs/DECISIONS.md`)
**Depends on:** project #2 (preferred services) — badges are filtered by the user's services and countries.

## Goal

Let signed-in users save titles to a watchlist and find out, in-app, when a watchlisted title **arrives on** or **leaves** one of their preferred services in one of their favorite countries.

## Scope

**In:** watchlist add/remove from detail pages, a dedicated `/watchlist` page (badged-grid layout), a daily snapshot-diff pipeline over TMDB availability, in-app change badges with a 7-day window, nav entry with change indicator, firebase-admin introduction, unit tests for the diff and filter logic.

**Out (deliberate):** predictive "leaving soon" (needs a third-party expiry API — the event model leaves room for it), email/push notifications, quick-add from poster cards, watchlist sorting/reordering, any recommendation behavior.

## Decisions made during brainstorm

1. **Snapshot-diffing now; expiry API later.** TMDB exposes only current availability, so v1 detects changes retrospectively ("newly arrived" / "just left"). The event schema is designed so a predictive source can later emit `changeType: "leaving"` events with a date, without schema change.
2. **Dedicated `/watchlist` page** (not a home row) — room for the change treatment and the future recommendation surface.
3. **In-app only** — no email digests; that can be its own later project.
4. **Visualization: badged grid** (chosen from mockups) — one poster grid, per-title NEW/LEFT badges, filter chips All / Newly available / Left with counts.
5. **Badge life: fixed 7-day window** — stateless, no per-user read-tracking; chips always match badges.

## Design

### 1. Watchlist storage

Firestore subcollection: `users/{uid}/watchlist/{mediaType_tmdbId}` →

```ts
{ mediaType: "movie" | "tv"; tmdbId: number; title: string; posterPath: string | null; addedAt: Timestamp }
```

- Subcollection (not an array on the prefs doc): atomic per-title writes, no 1MB doc ceiling, and the cron can enumerate all watchlisted titles via a **collection-group query**.
- Doc ID `mediaType_tmdbId` makes add/remove idempotent and membership checks a direct `getDoc`.
- **Add/remove UI:** bookmark toggle on `pages/details/[id].tsx` near the title. Signed out → the button prompts sign-in instead of toggling.
- Same client-side Firestore access pattern (and named database `watchatlaspreference`) as preferences; security rules restrict the subcollection to its owner.

### 2. Snapshot + diff pipeline

Diffing is **global per title, not per user** — cron cost scales with unique watchlisted titles, not user count, and N users watching the same title share one snapshot.

- `availabilitySnapshots/{mediaType_tmdbId}` — one doc per watchlisted title: `{ providersByCountry: { [countryCode]: number[] }, title, updatedAt }` — provider IDs drawn from TMDB's flatrate + free + ads sets, matching project #2's definition of "available on your services" (rent/buy excluded).
- `availabilityEvents/{autoId}` — append-only change log:

```ts
{ tmdbId: number; mediaType: "movie" | "tv"; title: string; country: string;
  providerId: number; providerName: string; changeType: "arrived" | "left"; detectedAt: Timestamp }
```

- **Daily cron** `GET /api/cron/availability-diff` (added to `vercel.json`, `CRON_SECRET` bearer auth like the existing health-check cron):
  1. Collection-group query for unique `(mediaType, tmdbId)` across all watchlists.
  2. For each title, fetch current TMDB watch providers (server-side, `TMDB_API_KEY`).
  3. Diff against the snapshot per country/provider → write `arrived`/`left` events.
  4. Update the snapshot. **First sighting seeds the snapshot and emits no events.**
  5. Titles no longer on any watchlist: snapshot removed (housekeeping).
- **New infrastructure:** `firebase-admin` dependency + `FIREBASE_SERVICE_ACCOUNT_KEY` env var (JSON service account, Vercel env), initialized against the named database. The cron has no signed-in user, so client SDK rules don't apply to it.

### 3. Read path

On `/watchlist`, the client:

1. Reads the user's watchlist subcollection.
2. Queries `availabilityEvents` for those titles with `detectedAt >= now − 7 days`.
3. Intersects events client-side with the user's **favorite countries** and **preferred services** (`favoriteServices` from project #2) — a badge means *this changed on one of your services in one of your countries*.
4. Events older than 7 days age out of the query — badges expire statelessly.

`availabilityEvents` and `availabilitySnapshots` contain no PII (global availability facts); rules allow authenticated reads, writes only via admin SDK.

### 4. `/watchlist` page UI (Option B — badged grid)

- New page + **Watchlist** nav item in `AppLayout.tsx`, with a subtle dot indicator when the user has unexpired, relevant changes.
- Single poster grid (existing `ShowCard` pattern) of all watchlisted titles.
- Filter chips with counts: **All / Newly available / Left**. Chips filter the grid.
- Changed titles wear a compact badge: green `NEW · Netflix UK`, red `LEFT · Prime US`. A title with multiple recent changes shows the most recent; full detail lives on its detail page.
- Badge colors come from the existing CSS-variable system and must meet WCAG AA contrast in both themes.
- Empty states: empty watchlist → prompt to browse titles; signed out → sign-in prompt; events fetch failure → grid renders unbadged (no error banner).

### 5. Error handling

| Failure | Behavior |
| --- | --- |
| One title's TMDB fetch fails during cron | Log, skip title, snapshot untouched — **a failed fetch must never read as "left"** |
| TMDB fully down during cron | Abort run; no snapshots touched, no events written |
| Events query fails on page | Grid renders without badges; no error state |
| Signed out | Nav item hidden; `/watchlist` shows sign-in prompt; detail-page bookmark prompts sign-in |
| Cron called without valid `CRON_SECRET` | 401 (same as existing cron) |

### 6. Pure logic + tests

Pure functions with node-runner tests (extending the suite started in project #2):

- `computeAvailabilityDiff(snapshot, currentProviders)` → events: arrived/left detection per country, no events on first sighting, unchanged → empty.
- `filterEventsForUser(events, favoriteCountries, favoriteServices)`: country and service intersection, empty-preference behavior.
- 7-day windowing boundary and badge selection (most-recent-wins) helpers.

## Backlog mapping

`feat: watchlist with availability alerts` with three stories (sub-issues, on the WatchAtlas board):

1. `story: save titles to my watchlist` (subcollection + detail-page bookmark + `/watchlist` page grid without badges)
2. `story: get arrived/left changes detected daily` (firebase-admin, snapshots, events, cron)
3. `story: see changes badged on my watchlist` (read path, chips, badges, nav indicator)

Tasks get created during the coding sessions, per convention.
