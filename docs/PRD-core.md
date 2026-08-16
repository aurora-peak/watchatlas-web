# WatchAtlas — Product Requirements (Core)

**Status:** Draft, pending approval · **Last revised:** 2026-07-22

This is a trimmed version of `docs/PRD.md`, scoped to core functionality only. It carries forward the v1.0 baseline and the three Phase 2 features that aren't about visual design — preferred services, watchlist availability alerts, and the AI recommendation engine — plus Phase 3 (the Apple platform apps) as a listed future feature.

**What's cut, and why:** the original PRD's §5.4 ("App requirements & API contract") and §5.5 ("Cross-platform UI redesign") are omitted here — those covered the design token system, the versioned API contract written to support it, Sign in with Apple, a Firestore rules review, tvOS/WCAG constraints, and the theme-system rebuild. None of that is dropped from the roadmap; it simply isn't *core functionality* and isn't needed to reason about what the product does. See the full `docs/PRD.md` when that work is picked back up — Phase 3 will need its own pass through that ground (API contract, sign-in method, design tokens) before it can start, since this document no longer defines it.

Detailed designs for the features below live in `docs/superpowers/specs/`; the reasoning behind each choice lives in `docs/DECISIONS.md`.

---

## 1. Overview & Goals

WatchAtlas answers "where can I watch this, anywhere in the world?" Today it answers that question for a title the user has already thought of. Phase 2 turns it from a lookup tool into a personal service: it learns which services you pay for and which countries you care about, then tells you what to watch and flags changes to titles you've saved — retrospectively now, predictively (before it happens) in a later phase.

**Goals**

- **G-1** — A signed-in user can describe their subscriptions once and have every surface reflect them (home row, detail pages, alerts, recommendations).
- **G-2** — A user finds out that a saved title arrived on or left one of their services within 24 hours of the change, without leaving the app.
- **G-3** — Recommendations are always real, watchable titles: zero hallucinated or unavailable picks, by construction rather than by filtering.
- **G-4** — No secrets in the repository, and no client-side exposure of the TMDB key.

## 2. Non-Goals

Explicitly out of scope:

- Android and Google TV apps; watchOS; widgets and App Intents.
- Email, push, or any out-of-app notification. Alerts are in-app only.
- Preferences for signed-out users (no localStorage-backed identity).
- Per-country service selections — service choices are one global set.
- Hiding or filtering out providers the user doesn't subscribe to. Nothing is ever hidden; preferred services are ordered first.
- Offline-first sync beyond what the Firestore SDK provides.
- Rent/buy availability in alerts and recommendations — "available" means flatrate, free, or ad-supported.
- Social features: sharing, following, public watchlists, reviews, ratings.

## 3. Users & Use Cases

**Primary user:** someone who pays for two to five streaming services, and who cares about more than one country — an expat, a frequent traveler, someone in a household split across regions, or someone deciding whether a VPN-worthy title exists elsewhere. Anyone else — no account, no subscriptions on file — is still a fully served user for the core lookup.

**1. Core functionality (no account required)** — any visitor searches for a movie or TV show and sees where it's available to watch, in any country.

**2. Account-gated functionality** — creating an account unlocks:

1. *"I subscribe to Netflix and Disney+ in the US and Prime in the UK."* **Preferred countries**, saved once in Settings, honored on every title's detail page.
2. *Preferred streaming services* — selectable from a list filtered to just the user's preferred countries (a service only appears as an option if it's actually offered in one of them).
3. *"Is this on anything I have?"* On a title's detail page, the user's preferred services are listed first and visually highlighted, followed by everything else. Nothing is ever hidden.
4. *"Don't let me miss this."* From the detail page, save a title to the **Watchlist**. A saved title's poster can carry a status banner:
   - **Coming soon in X days** — for an unreleased title with a known release date. Ships now (§5.2, FR-37) — TMDB already gives us the release date, no new data source needed.
   - **Leaving in X days** — for a released title about to leave one of the user's services. Needs a predictive data source TMDB doesn't have; **deferred to a later phase** alongside Trakt (§5.2).
   - In the meantime, an *already changed* badge (arrived / left, detected after the fact by the daily cron) covers the gap — see FR-9–FR-13.
5. *"I want this on my TV."* The same account, watchlist, and recommendations on an Apple TV, navigable by remote. (Phase 3 — see §5.4.)

**3. Deferred — later phase:** predictive leaving-soon banners and Trakt watchlist sync travel together, since both change how the watchlist is sourced and kept in sync. See §5.2 and the open questions in §8 (R-1, R-9).

## 4. Current State (v1.0 baseline)

Summarized from `docs/ARCHITECTURE.md`; that document is authoritative for detail.

- **Stack:** Next.js 14.1 (Pages Router), React 18.2, TypeScript 5.3, NextUI, Tailwind v4 with a hand-rolled CSS-variable theme (dark default). Deployed on Vercel.
- **Data:** TMDB v3, reached only through internal `/api/tmdb/*` proxy routes with per-route `Cache-Control: s-maxage` CDN caching. The client never calls TMDB.
- **Identity:** Firebase Auth, Google sign-in only. Preferences in a *named* Firestore database `watchatlaspreference`, at `users/{uid}` → `{ favoriteCountries, darkMode }`.
- **Surfaces:** Home (search + browse rows), title detail (where-to-watch grouped by country and continent), Settings (sign-in + favorite countries).
- **Operations:** a TMDB health probe, a status banner, and a daily Vercel cron that fans out Discord/Slack/email alerts on status transitions.
- **Gaps carried forward:** test coverage reaches only the pure helpers in `lib/` (components, pages, and API routes are uncovered); two competing theme systems coexist; `components/NavBar.tsx` and `lib/countryContinents.ts` are dead code; 42 countries are grouped under a literal "Undefined" heading; `public/placeholder.png` is referenced but missing. The secrets and TMDB-key issues that appeared in earlier drafts were resolved in `d0b6451` — only key rotation remains.

## 5. Functional Requirements

Each requirement is testable. Design detail for each block is in the linked spec. Numbering is preserved from the full PRD for traceability back to specs and GitHub issues; FR-21–FR-27 (design tokens, API contract, redesign) are intentionally not part of this document.

### 5.1 Preferred streaming services — *spec: `2026-07-19-preferred-services-design.md`, issue #3*

- **FR-1** — `UserPreferences` gains `favoriteServices: { id, name, logoPath }[]`, defaulting to `[]`, persisted through the existing merge-write path. An absent field reads as empty; no migration is required.
- **FR-2** — `GET /api/tmdb/providers-list?regions=` returns the merged movie+TV provider catalog for the requested regions, deduped by provider ID, each entry carrying the regions it is available in, sorted by TMDB display priority. Invalid or missing regions → 400. Cached at `s-maxage=86400`.
- **FR-3** — Settings shows a "My Services" section with one tab per favorite country. Selections are a single global set: a service selected in one tab renders selected in every tab that offers it, and a summary strip shows all current selections regardless of active tab. With no favorite countries saved, the section prompts the user to pick countries first.
- **FR-4** — `GET /api/tmdb/discover?regions=&providers=` returns up to 20 popular titles available on the given providers in the given regions (flatrate, free, or ad-supported only), deduped across regions, with `regionsUsed` reported. At most 5 regions are queried. If some upstream calls fail the successful ones are still merged; 502 only when all fail. Cached at `s-maxage=600`.
- **FR-5** — Home renders an "On My Services" row first when the user is signed in with at least one service and results exist. In every other case — signed out, no services, fetch failure, empty results — the row is absent, and no error state is shown on the home page.
- **FR-6** — On a title's detail page, each country's providers are grouped "Your services" first (visually highlighted — e.g. a border or accent treatment distinct from the plain provider tiles below), then "Also available on". When the user has no matching services in that country, or is signed out, the country renders the current flat list with no headings. Nothing is ever hidden.

### 5.2 Watchlist & availability alerts — *spec: `2026-07-19-watchlist-availability-design.md`, issue #4*

- **FR-7** — A signed-in user can add and remove a title from a bookmark control on its detail page. Storage is `users/{uid}/watchlist/{mediaType_tmdbId}` holding media type, TMDB ID, title, poster path, and added-at. Signed out, the control prompts sign-in instead of toggling.
- **FR-8** — A daily cron (`/api/cron/availability-diff`, `CRON_SECRET`-authenticated) enumerates every distinct watchlisted title across all users via a collection-group query and refreshes one global snapshot per title — not per user.
- **FR-9** — For each title, the cron diffs current TMDB availability against the stored snapshot per country and provider, and appends `arrived` / `left` events. **A title seen for the first time seeds its snapshot and emits no events.**
- **FR-10** — A failed TMDB fetch never produces a `left` event: a single title's failure skips that title with its snapshot untouched, and a total TMDB outage aborts the run without writing anything.
- **FR-11** — `/watchlist` shows the user's saved titles as a poster grid. Titles with a change in the last 7 days wear a badge (`NEW · Netflix UK`, `LEFT · Prime US`), filtered client-side to the user's own services and countries — a badge means *this changed on a service you have, in a country you care about*.
- **FR-12** — Filter chips (All / Newly available / Left) with counts filter the grid, and always agree with the badges shown. The 7-day window is stateless: events age out of the query rather than being marked read.
- **FR-13** — The Watchlist nav item shows a subtle indicator when the user has unexpired, relevant changes. If the events query fails, the grid renders unbadged with no error banner.
- **FR-37** — A watchlisted title with a known future release date (TMDB `release_date` / `first_air_date` in the future) wears a **"Coming soon in X days"** poster banner, computed at render time — no cron, snapshot, or new data source required. This is independent of the arrived/left badge system above, which only applies to titles that have already released.

**Deferred to a later phase — predictive "leaving soon" + Trakt**

Two pieces of watchlist scope are intentionally not specified yet, because they change how the watchlist is sourced and kept in sync rather than being simple additions:

- **Predictive "Leaving in X days" banner.** TMDB has no forward-looking expiry data — only the current-availability snapshot the FR-8–FR-10 cron already diffs retrospectively. Getting a real countdown means integrating a paid vendor; Movie of the Night's Streaming Availability API is the leading candidate (it exposes `expiresOn` / `expiresSoon` fields), but its paid-tier pricing needs confirming before this is scoped further. Until this lands, the retrospective "LEFT" badge (FR-11) is the interim signal. See R-1.
- **Trakt integration — confirmed two-way sync**, not a one-time import. That's a real architecture commitment: Trakt has no public webhook/push mechanism (integrations poll), so keeping both sides current means a recurring poll in both directions, plus conflict handling (an item removed on one side while added on the other) and a decision about which store — Firestore or Trakt — is authoritative when they disagree.

  It also raises a scope question that isn't resolved yet: **which Trakt list(s) does WatchAtlas sync against?** Trakt has two distinct list concepts — its single built-in watchlist (accessed via `sync/watchlist`, which auto-removes a title once it's marked watched anywhere Trakt-connected, e.g. Plex/Kodi scrobbling) and separate, plural custom "personal lists" (user-created, non-auto-removing, capped at 5–10 lists and 500–10,000 items depending on account tier). Syncing only the built-in watchlist is the closer match to WatchAtlas's current single-list model — FR-7's mixed movies/TV watchlist was chosen in part because Trakt's built-in watchlist already mixes types the same way — but the auto-remove-on-watched behavior needs to be treated as a normal, expected removal rather than something to reconcile as conflicting. Supporting custom lists instead (or in addition) is a bigger step: it would mean WatchAtlas growing a multi-list concept of its own and a list-picker UI, not just wiring up sync. **Left open for now — decide when this phase is scoped.** See R-9.

### 5.3 AI recommendation engine — *spec: `2026-07-19-ai-recommendations-design.md`, issue #5*

- **FR-14** — Each generation builds roughly 50 candidate titles server-side from TMDB: recommendations and similar titles seeded by up to 5 watchlist entries, titles available on the user's services, and trending filler when the pool is thin. Candidates are deduped and exclude anything already on the watchlist.
- **FR-15** — `POST /api/recommend` verifies a Firebase ID token (401 otherwise), then makes one Claude call (`claude-opus-4-8`, structured output) that **selects and explains from the candidate list only** — it never generates titles. Every returned pick is re-validated server-side against the candidate set; fewer than 3 surviving picks is treated as a failure.
- **FR-16** — Each pick carries a one-sentence reason tied to the user's own signals ("Because you watchlisted Dune: Part Two…").
- **FR-17** — The feed is cached at `users/{uid}/recommendations/current` with a signature over watchlist IDs, services, and countries. It regenerates only on signature change, age over 24 hours, or explicit refresh; ordinary page loads cost zero model calls. Generation is capped at 20 per user per day.
- **FR-18** — `/discover` shows the For You feed plus an optional mood input. A mood run re-ranks the same grounded candidates on demand and does not overwrite the cached feed.
- **FR-19** — On a model or API failure the last cached feed is served with a "from earlier" note; with no cache, a soft retry message. Signed-out users, and signed-in users with neither watchlist nor services, see an explainer and a get-started prompt — never a fake or generic feed.
- **FR-20** — Navigation becomes Home / Discover / Watchlist / Settings.

### 5.4 Apple platform apps — Phase 3 — *issues #8–#11*

Kept here as a listed future feature. It is **not fully specified** in this document: the design token system, the versioned API contract, and the Sign in with Apple requirement that the full PRD's §5.4 defined as prerequisites have been cut from this version (see the note at the top of this document). Before Phase 3 work starts, that ground needs to be re-covered — either by pulling §5.4/§5.5 back in from `docs/PRD.md` or by re-scoping it.

- **FR-28** — A SwiftUI multiplatform codebase provides auth, home/browse, detail with where-to-watch, watchlist, discover, and settings on iOS and iPadOS, with adaptive iPad layouts. Shared Swift packages (models, API client, Firebase layer) are established here for reuse.
- **FR-29** — Apps use the native Firebase SDK for auth and user data, and the existing Next.js API routes for everything TMDB-derived. **No app embeds a TMDB key.**
- **FR-30** — The tvOS app reuses the shared core with focus-engine navigation and a device-code or QR sign-in flow rather than typed credentials.
- **FR-31** — The macOS app ships with correct window sizing, menu bar, and keyboard shortcuts.
- **FR-32** — Release operations cover signing, TestFlight, App Store listings, privacy manifests and nutrition labels, and in-app TMDB attribution compliance.

### 5.5 Security & hygiene — *issue #12 and carried drift*

- **FR-33** — *(Partly delivered in `d0b6451`, 2026-07-02.)* `.env.local.example` contains placeholders only, and every variable the code reads is listed there — the six operational vars (`CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, and the four alert-channel vars) still need adding. **Outstanding regardless of the file:** the values previously committed remain in git history and must be rotated at TMDB, Firebase, and Google Cloud.
- **FR-34** — *(Delivered in `d0b6451`.)* No code reads `NEXT_PUBLIC_TMDB_API_KEY`; the server-only migration is complete. Phase 2 must not reintroduce it.
- **FR-35** — Pure logic added in Phase 2 (catalog and discover merges, availability diffing, user-event filtering, pick validation, cache signatures) is covered by tests on the existing runner, extending the v1 baseline suite added 2026-07-19.
- **FR-36** — No uid or email is logged in production paths.

## 6. Tech Stack & Platform

| Concern | Choice | Why |
| --- | --- | --- |
| Web framework | Next.js 14 Pages Router on Vercel | Existing; no reason to migrate mid-roadmap |
| Content data | TMDB v3 via internal proxy routes | Hides the key, centralizes errors, enables CDN caching (`DECISIONS.md`, inferred) |
| Identity | Firebase Auth — Google today | Existing |
| User data | Firestore, named database `watchatlaspreference` | Existing; the default database is empty and must stay unused |
| Server-side data access | `firebase-admin` + service-account credential | The availability cron has no signed-in user, so client rules don't apply |
| Recommendations | Claude API (`@anthropic-ai/sdk`), `claude-opus-4-8`, structured outputs | Schema-validated JSON without hand-parsing; Haiku is the documented cost lever. Gemini was tried and removed |
| Apps (Phase 3) | Swift + SwiftUI multiplatform | The only stack treating tvOS and macOS as first-class |
| App backend (Phase 3) | Hybrid — native Firebase SDK + existing API routes | Mirrors the web architecture without re-exposing the TMDB key |
| Testing | Node built-in test runner | Already wired up; pure functions are the testable surface |

## 7. Data Model Sketch

```
users/{uid}
  favoriteCountries: string[]
  favoriteServices:  { id, name, logoPath }[]     # NEW — FR-1
  darkMode:          boolean

users/{uid}/watchlist/{mediaType_tmdbId}          # NEW — FR-7
  mediaType, tmdbId, title, posterPath, addedAt

users/{uid}/recommendations/current               # NEW — FR-17
  picks[], generatedAt, signature, dailyCount

availabilitySnapshots/{mediaType_tmdbId}          # NEW, global — FR-8
  providersByCountry: { [countryCode]: number[] }
  title, updatedAt

availabilityEvents/{autoId}                       # NEW, global, append-only — FR-9
  tmdbId, mediaType, title, country,
  providerId, providerName,
  changeType: "arrived" | "left",                 # "leaving" reserved for a future predictive source
  detectedAt
```

Provider IDs are TMDB's and are global (Netflix is 8 everywhere), which is what makes a single flat service set coherent across countries. The two global collections hold no PII: they are facts about the world, shared across all users who watchlist the same title.

## 8. Risks & Open Questions

| # | Risk / question | What unblocks it |
| --- | --- | --- |
| R-1 | Predictive "leaving in X days" needs a paid data vendor TMDB doesn't have. Movie of the Night's Streaming Availability API looks like the best self-serve candidate (`expiresOn` / `expiresSoon` fields, free tier to start), but paid pricing isn't confirmed. | Confirm pricing, then build in the deferred later phase alongside Trakt (§5.2). Event schema already reserves `changeType: "leaving"` for this. |
| R-2 | Cron cost and runtime grow with distinct watchlisted titles. Global (not per-user) diffing bounds it, but a popular catalog could still push past a Vercel function's limits. | Measure actual title count after the watchlist ships; batch or shard the run if it approaches the timeout. |
| R-3 | Recommendation cost is roughly $0.04 per generation on Opus 4.8. Caching and a 20/day cap bound it, but a large signed-in base changes the arithmetic. | Real usage numbers. Switching to Haiku is a config change, not a redesign. |
| R-4 | Phase 3 (§5.4) has no defined API contract, design token system, or non-Google sign-in method in this document — those lived in the full PRD's §5.4/§5.5, which are out of scope here. | Re-specify before Phase 3 implementation starts, either by restoring those sections or writing a lighter-weight version. |
| R-5 | Phase 3 needs an Apple Developer account, and App Store review is an external dependency with its own timeline. | Enroll before Phase 3 starts so signing and TestFlight aren't on the critical path. |
| R-6 | The existing health-check cron keeps debounce state in module-level variables, which serverless does not reliably persist — so its alerting may already misbehave. | Not scoped here. Worth its own bug issue; move the state to Firestore when touched. |
| R-7 | Whether a "my services only" filter toggle is wanted on detail pages. Deliberately excluded now (nothing hidden). | User feedback after FR-6 ships. |
| R-8 | Firestore composite indexes will be needed for the events query (title set + `detectedAt` window). Not yet specified. | Surfaces during FR-11 implementation; create indexes from the emulator's error output. |
| R-9 | Trakt sync is confirmed two-way, which raises several unresolved questions: (a) which list to sync against — the built-in watchlist (auto-removes on "watched," singular) vs. custom personal lists (plural, user-created, capped at 5–10 lists / 500–10,000 items depending on tier); (b) no public Trakt webhooks means polling both directions, so a cadence and conflict-resolution rule (which side wins) still need defining; (c) Trakt's 2026 free-tier watchlist cap of 250 items (5,000 VIP) could be hit mid-sync. | Decide the list-scope question, define the poll cadence and conflict rule, and confirm current Trakt API terms/rate limits before building the deferred later-phase sync (§5.2). |

## 9. Success Criteria

- **SC-1** (G-1) — A user sets services once and sees them reflected in the home row, detail-page ordering, alert filtering, and recommendation candidates, with no second place to configure them.
- **SC-2** (G-2) — For a title known to have changed availability, the corresponding badge appears on `/watchlist` within one cron cycle (24 hours), scoped to the user's own services and countries.
- **SC-3** (G-3) — Across a sample of generated feeds, every pick resolves to a real TMDB title present in that generation's candidate set. Server-side validation makes any other outcome an error, not a bad recommendation.
- **SC-4** (G-3) — A repeat visit within 24 hours with unchanged preferences makes zero model calls.
- **SC-5** (G-4) — No secret values in the repository or its history's current tip; no client bundle contains a TMDB key.
- **SC-6** — The test suite is non-empty and covers every pure function listed in FR-35.

## 10. Revision History

| Date | Change |
| --- | --- |
| 2026-07-19 | Initial delta-PRD. Baselines v1.0, defines Phase 2 (services, watchlist alerts, recommendations, redesign) and Phase 3 (Apple apps) from four approved specs and GitHub issues #3–#12. |
| 2026-07-22 | Trimmed to a core-functionality version: removed §5.4 (app requirements/API contract) and §5.5 (cross-platform UI redesign) from the original PRD, along with G-4 and SC-5 (which were about the redesign). Phase 2's remaining feature FRs (1–20), Phase 3 (28–32), and security/hygiene (33–36) are unchanged. Full redesign scope remains in `docs/PRD.md`. |
| 2026-07-22 | Clarified use cases (§3) into core (no-account search) vs. account-gated (countries, services, highlighted detail page, watchlist) tiers. Added FR-37 (coming-soon banner, buildable now from TMDB release dates). Split off predictive "leaving soon" + Trakt sync as an explicitly deferred later-phase scope (§5.2), replacing the old blanket non-goal on predictive leaving data. Added R-9 (Trakt's 2026 free-tier watchlist cap). |
| 2026-07-22 | Confirmed the deferred Trakt integration is a two-way sync, not a one-time import. Flagged the unresolved built-in-watchlist-vs-custom-lists scope question, the lack of Trakt webhooks (polling required both directions), and conflict-resolution as open items in §5.2 and R-9. |
