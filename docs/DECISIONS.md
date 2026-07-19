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

## 2026-07-19 — Roadmap order: services → watchlist/alerts → AI recs → UI redesign

- **Decision:** Build in this order: (1) preferred-services selection, (2) watchlist + leaving/coming-soon alerts, (3) proper AI recommendation engine, (4) complete UI redesign last.
- **Alternatives:** UI-first; AI-first.
- **Why:** Services preference is foundational and feeds both the watchlist alerts (scoped to your services/countries) and the recommender (subscription signals). Redesigning the UI last means every surface exists before restyling. Noted risk for watchlist alerts: TMDB exposes only *current* availability, so leaving/coming-soon needs snapshot-diffing or another source — to be resolved in that project's brainstorm.

## 2026-07-19 — Watchlist alerts via global snapshot-diffing, in-app only

- **Decision:** Detect availability changes by daily-diffing TMDB provider data per unique watchlisted title (global snapshots + append-only events), surfaced in-app on a dedicated `/watchlist` page as a badged grid with a 7-day badge window. Requires firebase-admin for the cron. No email; no predictive "leaving soon" in v1.
- **Alternatives:** third-party expiry API (paid vendor, patchy coverage — event schema leaves room to add it later as `changeType: "leaving"`); per-user diffing (cost scales with users instead of titles); email digests (own project later).
- **Why:** Free, TMDB-terms-safe, and honest about what the data supports; global diffing keeps cron cost proportional to unique titles. Full design: `docs/superpowers/specs/2026-07-19-watchlist-availability-design.md`.

## 2026-07-19 — Adopt standard project docs + GitHub backlog structure

- **Decision:** Onboard WatchAtlas to the standard workflow: `docs/ARCHITECTURE.md`, this decision log, `CLAUDE.md`, `GitHub-Project-Setup.md`, `type:` labels, and a "WatchAtlas Board" user-level GitHub Project.
- **Why:** Consistency with other projects (chronicle, trove, ledger); gives agents and Josh a shared map and a captured-work rule.
