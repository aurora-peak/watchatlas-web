# WatchAtlas — Decision Log

Running log of significant decisions: date, decision, alternatives considered, why.
Entries marked `[inferred]` were reconstructed from code and git history during onboarding (2026-07-19) — the rationale is a best guess, not a commitment. Entries without the marker were decided together and are authoritative.

---

## [inferred] Pivot from Expo/React Native to a Next.js web app

- **Date:** pre–git history of this repo (a `.expo/` remnant remains)
- **Decision:** Rebuild WatchAtlas as a web app on Next.js 14 (Pages Router) instead of continuing the Expo mobile app.
- **Why (guess):** Faster iteration, single deploy target (Vercel), no app-store friction for a content-discovery product.

## [inferred] Proxy all TMDB calls through internal API routes

- **Date:** early in repo history
- **Decision:** The browser never calls TMDB directly; `lib/tmdb.ts` hits `/api/tmdb/*`, which call TMDB server-side with `Cache-Control: s-maxage` CDN caching.
- **Alternatives:** direct client calls with `NEXT_PUBLIC_TMDB_API_KEY`.
- **Why (guess):** Hide the API key, centralize error handling, and get Vercel CDN caching for free. The key migration (`TMDB_API_KEY` server-only, dropping the `NEXT_PUBLIC_` fallback) is still in flight.

## [inferred] Firebase (Google-only auth + Firestore) for user preferences

- **Date:** early in repo history
- **Decision:** Google sign-in via GSI + Firebase Auth; preferences (`favoriteCountries`, `darkMode`) in a **named** Firestore database `watchatlaspreference` under `users/{uid}`.
- **Alternatives:** no accounts (localStorage only), NextAuth, Supabase.
- **Why (guess):** Minimal-friction single-provider auth; Firestore free tier fits a tiny per-user document. The named (non-default) database looks deliberate but its reason is undocumented — possibly region or project-organization related.

## [inferred] Country-centric "where to watch" as the core differentiator

- **Date:** ongoing
- **Decision:** Detail pages group TMDB watch-provider data by country and continent (`lib/getDisplayCountries.ts`, `lib/countryContinents.ts`), filterable by the user's favorite countries.
- **Why (guess):** Global availability comparison is the product's reason to exist versus TMDB itself or JustWatch's single-country view.

## [inferred] Remove AI recommendations (Gemini)

- **Date:** 2026 (commits `60ab384` → `5df64da` "remove AI tech debt")
- **Decision:** After iterating on Gemini-powered recommendations (model updates, 1.5-flash, fallback chain), rip the feature out entirely and simplify the UI (merge browse into home).
- **Why (guess):** Maintenance cost and quality didn't justify the feature; simplification preferred. A stale `GEMINI_API_KEY` env entry remains.

## [inferred] Uptime monitoring with multi-channel alerting

- **Date:** recent (commits `e8108a4` and earlier)
- **Decision:** `/api/health` TMDB probe + `StatusBanner` polling + daily Vercel cron (`/api/cron/health-check`, `CRON_SECRET`-protected) that fans out Discord/Slack/Resend-email alerts on status transitions with a 2-failure debounce.
- **Why (guess):** TMDB is a hard dependency; surface outages to users (banner) and to the operator (alerts). Note: debounce state lives in module-level variables, which serverless doesn't reliably persist.

## [inferred] Dark-first hand-rolled design system on Tailwind v4

- **Date:** ongoing
- **Decision:** CSS-variable design system in `styles/globals.css` with dark as default and a `.light` override class; NextUI for components.
- **Why (guess):** Media-browsing apps read better dark; variables allow theming without a framework. Two theme mechanisms (next-themes vs. the custom `darkMode` toggle) currently coexist — likely unintentional drift, not a decision.

---

## 2026-07-19 — Apple platform apps: SwiftUI multiplatform, hybrid backend, app-aware redesign

- **Decision:** Launch iOS/iPadOS/macOS/tvOS apps as a program of sub-projects (see `docs/superpowers/specs/2026-07-19-apple-apps-program.md`). Stack: Swift + SwiftUI multiplatform. Backend: hybrid — native Firebase SDK for auth/user data, existing Next.js API routes for TMDB/discover/recommendations. Sequencing: app requirements + API contract (5a, incl. Sign in with Apple) are nailed down as an **input to the UI redesign**, so #1 produces one cross-platform design language.
- **Alternatives:** React Native / Capacitor (weak tvOS+macOS); full BFF or Firebase-only backends; apps entirely before or entirely after the redesign.
- **Why:** Only SwiftUI treats all four targets as first-class; hybrid mirrors the proven web architecture without re-exposing the TMDB key; an app-aware redesign avoids restyling the apps right after launch.

## 2026-07-19 — Roadmap order: services → watchlist/alerts → AI recs → UI redesign

- **Decision:** Build in this order: (1) preferred-services selection, (2) watchlist + leaving/coming-soon alerts, (3) proper AI recommendation engine, (4) complete UI redesign last — with the redesign now taking the Apple-apps requirements (5a) as an input, and the app builds following it.
- **Alternatives:** UI-first; AI-first.
- **Why:** Services preference is foundational and feeds both the watchlist alerts (scoped to your services/countries) and the recommender (subscription signals). Redesigning the UI last means every surface exists before restyling. Noted risk for watchlist alerts: TMDB exposes only *current* availability, so leaving/coming-soon needs snapshot-diffing or another source — to be resolved in that project's brainstorm.

## 2026-07-19 — Watchlist alerts via global snapshot-diffing, in-app only

- **Decision:** Detect availability changes by daily-diffing TMDB provider data per unique watchlisted title (global snapshots + append-only events), surfaced in-app on a dedicated `/watchlist` page as a badged grid with a 7-day badge window. Requires firebase-admin for the cron. No email; no predictive "leaving soon" in v1.
- **Alternatives:** third-party expiry API (paid vendor, patchy coverage — event schema leaves room to add it later as `changeType: "leaving"`); per-user diffing (cost scales with users instead of titles); email digests (own project later).
- **Why:** Free, TMDB-terms-safe, and honest about what the data supports; global diffing keeps cron cost proportional to unique titles. Full design: `docs/superpowers/specs/2026-07-19-watchlist-availability-design.md`.

## 2026-07-19 — Ship the roadmap as two releases: Phase 2 (v2.0) and Phase 3 (v3.0)

- **Decision:** The PRD (`docs/PRD.md`) frames the roadmap as two releases against the shipped v1.0 web app. **Phase 2** = preferred services, watchlist + availability alerts, AI recommendations, and the cross-platform UI redesign (with app requirements 5a as a gating input). **Phase 3** = the Apple app builds themselves (5b–5e) plus App Store release operations.
- **Alternatives:** one undifferentiated backlog; a release per feature; putting the redesign in Phase 3 alongside the apps.
- **Why:** Phase 2 is everything that ships on the existing web stack and can go out as one coherent product update; Phase 3 introduces a genuinely new platform, toolchain, and external dependency (App Store review) and shouldn't gate web releases. Keeping the redesign in Phase 2 — but after 5a — means the apps start against a finished design language instead of driving one.

## 2026-07-19 — Adopt standard project docs + GitHub backlog structure

- **Decision:** Onboard WatchAtlas to the standard workflow: `docs/ARCHITECTURE.md`, this decision log, `CLAUDE.md`, `GitHub-Project-Setup.md`, `type:` labels, and a "WatchAtlas Board" user-level GitHub Project.
- **Why:** Consistency with other projects (chronicle, trove, ledger); gives agents and Josh a shared map and a captured-work rule.

## 2026-07-19 — Preferred services are one flat global set, and only reorder

- **Decision:** `favoriteServices` is a single flat list of TMDB provider IDs applied across every favorite country, not a per-country mapping. On detail pages the selection only ever reorders providers into "Your services" and "Also available on" — nothing is hidden.
- **Alternatives:** per-country service selections; a "my services only" filter toggle.
- **Why:** TMDB provider IDs are global (Netflix is 8 everywhere), so a flat set is coherent — a service simply never matches in a country where it does not operate. Reordering rather than filtering keeps the country-comparison view, which is the product's reason to exist, intact.
- **Scope note:** the split applies to the three streaming tiers — `flatrate`, `free` and `ads` — matching `STREAMING_KEYS` in `lib/providerPreferences.ts` and the `with_watch_monetization_types` set that `pages/api/tmdb/discover.ts` queries. `rent` and `buy` are excluded and keep their existing flat rendering — a "your services" framing on purchase tiers would read as endorsement.
