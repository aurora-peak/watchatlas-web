# AI Recommendation Engine — Design Spec

**Date:** 2026-07-19 · **Status:** Approved design, pending implementation plan
**Project:** #4 in the roadmap (services → watchlist/alerts → **AI recs** → UI redesign; see `docs/DECISIONS.md`)
**Depends on:** project #2 (preferred services + discover route) and project #3 (watchlist + firebase-admin). Build after both.

## Goal

A proper recommendation engine on a new `/discover` page: a personalized **For You** feed with explained picks, steerable by an optional **mood prompt** — grounded in real TMDB titles so hallucination is impossible by construction.

## Lessons from v1 (removed Gemini implementation, commits `60ab384`→`5df64da`)

1. It was mood search, not recommendations — no user signals existed to personalize with.
2. The LLM *generated* titles from thin air; string-matching them back to TMDB was fragile.
3. No availability grounding; recommendations could be unwatchable in the user's countries.
4. Operationally brittle: model-404 fallback chains, hand-parsed JSON.

The inversion that fixes all four: **TMDB generates candidates; the LLM only ranks and explains.**

## Decisions made during brainstorm

1. **Product shape: both** a passive For You feed and an optional mood-prompt steer.
2. **Surface: dedicated `/discover` page**; nav becomes Home / Discover / Watchlist / Settings.
3. **Provider: Claude API** (`@anthropic-ai/sdk`), model `claude-opus-4-8`, using **structured outputs** for schema-validated JSON. Rejected: Vercel AI Gateway (more moving parts than needed), Gemini (JSON reliability + model churn friction; exposed key needs rotating regardless).

## Design

### 1. Candidate generation (server-side, pure logic + TMDB calls)

Build ~50 real TMDB candidates per generation from three sources:

- **Watchlist-similar:** TMDB `/recommendations` + `/similar` for a sample (≤5) of the user's watchlisted titles — tagged with which title seeded them.
- **On your services:** the project-#2 Discover query (user's services × countries), candidates tagged `onYourServices: true`.
- **Trending filler** when the pool is thin (new users, empty watchlist).

Merged, deduped by `(mediaType, id)`, minus titles already on the watchlist. Each candidate: `{ id, mediaType, title, year, genres, overview (one line), popularity, onYourServices, seededBy? }`.

### 2. Curation — `POST /api/recommend`

1. Verify the caller's **Firebase ID token** with firebase-admin (from project #3); 401 otherwise.
2. Load the user's preferences and watchlist server-side (admin SDK).
3. Build the candidate pool (§1).
4. One Claude call: model `claude-opus-4-8`, `max_tokens` ~2000, **structured output** schema:

```ts
{ picks: { candidateId: number; mediaType: "movie" | "tv"; reason: string }[] }  // ~10 picks
```

   The prompt contains the candidate list, the user's taste signals (watchlist titles, services, countries), and — when present — the request's optional `mood` string ("something like Dark but lighter"), which re-ranks the same grounded candidates. The model selects only from the list; `reason` is one sentence tied to the user's signals.
5. Server-side validation: drop any pick whose ID isn't in the candidate set (belt-and-braces on top of the schema).
6. Response: hydrated picks (poster path etc. from candidate metadata) ready to render.

**Env:** `ANTHROPIC_API_KEY` (server-only, Vercel env). Remove the dead `GEMINI_API_KEY` from `.env.local.example` as part of this project.

### 3. Caching & cost control

- Feed cache: `users/{uid}/recommendations/current` in Firestore — `{ picks, generatedAt, signature }` where `signature` = hash of (watchlist IDs + favoriteServices IDs + favoriteCountries).
- Regenerate only when: signature changed, cache older than 24h, or explicit user refresh. Otherwise serve the cache — page loads cost zero LLM calls.
- Mood runs are on-demand, returned directly, and do not overwrite the signature cache.
- Per-user cap: 20 generations/day (counter on the cache doc); beyond it, serve cache + notice.
- Cost envelope: ~3K input / ~1K output tokens ≈ $0.04 per generation on Opus 4.8. Haiku 4.5 (~$0.008) is the documented fallback lever if cost ever matters — a config change, not a design change.

### 4. `/discover` page

- Nav (in `AppLayout.tsx`): **Home / Discover / Watchlist / Settings**.
- **For You** section: poster cards (existing `ShowCard` pattern) each showing its `reason` line ("Because you watchlisted Dune: Part Two…"). Served from cache on load; refresh affordance triggers regeneration.
- **"In the mood for…"** input at top; submit runs an on-demand curation with the mood woven in and replaces the displayed picks (with a way back to the plain For You set).
- Signed out, or signed in with no watchlist *and* no services: an explainer + sign-in / get-started prompt. No fake or generic feed.

### 5. Error handling

| Failure | Behavior |
| --- | --- |
| Invalid/missing ID token | 401 |
| Claude API error or `stop_reason: "refusal"` | Serve last cached feed with "from earlier" note; no cache → soft retry message, section otherwise hidden |
| One candidate source fails (TMDB partial outage) | Build pool from the sources that succeeded |
| Daily cap reached | Serve cache + notice |
| Schema-valid but unknown candidate IDs | Dropped server-side; if <3 picks survive, treat as API error path |

Errors are classified with the SDK's typed exception chain (rate-limit vs server error), never string matching.

### 6. Testing

Pure functions with node-runner tests: candidate merge/dedupe/watchlist-exclusion, pick validation against the candidate set, cache-signature computation, prompt assembly (mood included/omitted). The Claude client is a thin injected wrapper, mocked in route-level tests.

## Backlog mapping

`feat: AI recommendation engine` with three stories (sub-issues, on the WatchAtlas board):

1. `story: get grounded candidates and curated picks` (candidate pipeline + `/api/recommend` + caching)
2. `story: see a For You feed on /discover` (page, nav, cached-feed rendering)
3. `story: steer recommendations by mood` (mood input + on-demand runs)

Tasks get created during the coding sessions, per convention.
