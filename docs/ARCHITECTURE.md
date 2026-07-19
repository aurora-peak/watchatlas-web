# WatchAtlas — Architecture (Current State)

> Inferred from the codebase on 2026-07-19. Corrections welcome — this documents what *is*, not what *should be*.

## What it is

**WatchAtlas** is a global streaming availability guide for movies and TV shows. Users search/browse TMDB content; a title's detail page shows **where to watch it (stream/rent/buy) grouped by country and continent**. Signed-in users save "favorite countries" so availability filters to their regions. The country-centric where-to-watch view is the differentiator over a plain TMDB browser.

Originally started as an Expo/React Native mobile app (a gitignored `.expo/` remnant remains); the current codebase is a web rewrite.

## Stack

| Layer | Tooling |
| --- | --- |
| Framework | Next.js 14.1 (Pages Router), React 18.2, TypeScript 5.3 |
| UI | NextUI (`@nextui-org/react`), lucide-react + heroicons |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) + hand-written CSS-variable design system in `styles/globals.css` (dark default, `:root.light` overrides); "Showtime" logo font, "Cinzel" via Google Fonts |
| State | React Context (`lib/AuthContext.tsx`) + component `useState` — **no Zustand despite the dependency** (see Known Drift) |
| Auth/DB | Firebase Auth (Google sign-in only) + Firestore (named database `watchatlaspreference`) |
| Data source | TMDB v3 API, proxied through internal Next.js API routes |
| Hosting | Vercel (`vercel.json`), one daily cron |
| Testing | Node built-in test runner (`npm test` → `node --import tsx --test tests/**/*.test.ts`); covers the pure helpers in `lib/` |

## Directory map

```
pages/
  index.tsx            # Home: search + browse rows (browse was merged into home)
  details/[id].tsx     # Title detail + where-to-watch by country/continent
  settings.tsx         # Google sign-in + favorite-country preferences
  api/tmdb/            # 6 proxy routes: search, trending, popular, lists, details, providers
  api/health.ts        # TMDB health probe (60s module-level memo)
  api/cron/health-check.ts  # Daily cron monitor (see Monitoring)
components/
  AppLayout.tsx        # Header/footer/theme toggle (the live shell)
  ShowCard.tsx         # Poster card
  StatusBanner.tsx     # Polls /api/health every 60s
  NavBar.tsx           # DEAD CODE — superseded by AppLayout, never imported
lib/
  tmdb.ts              # Client fetch wrappers (tmdbService)
  firebase.ts / firestore.ts / AuthContext.tsx
  notifications.ts     # Discord + Slack + Resend email fan-out
  countries.ts / countryContinents.ts / getDisplayCountries.ts
  full_country_list_with_flags.json  # ~250 countries
theme/                 # EMPTY
types/                 # health.ts, global.d.ts (Window.google)
tests/                 # countries, getDisplayCountries, tmdb (node test runner)
```

## Data flow (TMDB)

The client never calls TMDB directly. `lib/tmdb.ts` → `/api/tmdb/*` → `api.themoviedb.org/3` server-side.

- **API key:** every route reads `process.env.TMDB_API_KEY` only. The migration away from the client-exposed `NEXT_PUBLIC_TMDB_API_KEY` completed in `d0b6451` (2026-07-02).
- **Caching:** `Cache-Control: s-maxage + stale-while-revalidate` per route — search 300s, trending/popular/lists 600s, details/providers 3600s (Vercel CDN caching).
- **Search** queries movie + TV endpoints in parallel and merges by `popularity`.
- **Quirk:** popular movies come from `/api/tmdb/popular`; popular TV from `/api/tmdb/lists?list=popular` — two overlapping routes for the same shape of data.

## Auth & preferences

- Google Identity Services (GSI) script loaded imperatively in `pages/settings.tsx`; credential exchanged via Firebase `signInWithCredential`.
- `lib/AuthContext.tsx` subscribes to `onAuthStateChanged`; exposes `user`, `preferences`, `signOut`, `updatePreferences`, `refreshPreferences`.
- Firestore stores `users/{uid}` → `{ favoriteCountries: string[], darkMode: boolean }` via `setDoc(..., { merge: true })` with a 10s timeout wrapper. Note the **named** Firestore database: `getFirestore(app, "watchatlaspreference")`.

## Monitoring (built-out, previously undocumented)

- `api/health.ts` — cached TMDB probe; `StatusBanner` polls it every 60s.
- `api/cron/health-check.ts` — Vercel cron daily at 09:00 UTC, `CRON_SECRET` bearer-auth, 2-failure debounce with state-transition detection.
- `lib/notifications.ts` — on transitions, fans out to Discord webhook, Slack webhook, and Resend email.
- **Caveat:** the cron tracks `lastKnownStatus`/`consecutiveFailures` in module-level variables, which do not reliably persist across serverless invocations — the debounce may not behave as designed in production.

## Environment variables

In `.env.local.example` (placeholders only since `d0b6451`): `TMDB_API_KEY`, `NEXT_PUBLIC_FIREBASE_*` (6 vars), `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

**Read by code but still missing from the example file:** `CRON_SECRET`, `DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL_TO`, `NEXT_PUBLIC_SITE_URL`.

## Known drift & issues (as of 2026-07-19)

> Items 1, 8 and 10 were first written against a stale checkout and have been corrected: commit `d0b6451` (2026-07-02) already fixed the example file, the `.gitignore`, and the key migration.

1. ~~**Security: `.env.local.example` contains real-looking secret values.**~~ **Fixed in `d0b6451`** — the file now holds placeholders and the dead `GEMINI_API_KEY` is gone. **Still outstanding:** the previously committed values remain in git history, so those keys must be rotated at TMDB, Firebase, and Google Cloud.
2. **Two competing theme systems:** `next-themes` (`localStorage("theme")`, `.dark`/`.light`) coexists with a custom toggle in `AuthContext`/`AppLayout` (`localStorage("darkMode")`, `.light` class). The custom one is what the UI toggle drives; they can disagree.
3. **Unused dependencies:** `zustand`, `framer-motion`, `@heroicons/react` (no imports found); `next-themes` half-used.
4. **Dead code:** `components/NavBar.tsx` (with duplicate GSI logic) and its orphaned `bottom-nav`/`nav-item` CSS in `globals.css`; **`lib/countryContinents.ts`**, which looks like the continent source but is imported by nothing — both `settings.tsx` and `details/[id].tsx` read the `continent` field from `full_country_list_with_flags.json` instead. The two disagree for 216 of 249 countries, so anyone "fixing" continents in the wrong file would see no effect.
5. **Thin test coverage.** The first tests landed 2026-07-19 (19 tests over `getDisplayCountries`, the country/continent data, and `getPosterUrl`). Everything else — components, pages, API routes — is still uncovered, and the Playwright E2E setup referenced in git history (`06495c1`) is absent from the tree.
6. **AI recommendations removed** (`5df64da`) — the Gemini code is gone, and `d0b6451` removed the stale `GEMINI_API_KEY` too. No trace remains outside `docs/`.
7. **Missing asset:** `getPosterUrl()` falls back to `/placeholder.png`, which doesn't exist in `public/` — every posterless title renders a broken image.
7b. **"Undefined" continent headings:** 42 of the 249 countries in `full_country_list_with_flags.json` carry `continent: "Undefined"`, which `settings.tsx` renders verbatim as a section heading.
8. ~~**Malformed `.gitignore` line.**~~ **Fixed in `d0b6451`** — `.DS_Store` and `tsconfig.tsbuildinfo` are separate entries again.
9. **Verbose auth debug logging** (uids, emails) left in `AuthContext.tsx` / `settings.tsx`.
10. ~~**TMDB server-key migration incomplete.**~~ **Fixed in `d0b6451`** — no route reads `NEXT_PUBLIC_TMDB_API_KEY` any more.
