# CLAUDE.md — WatchAtlas

Rules of the road for AI agents (and humans) working in this repo.

## What this is

WatchAtlas is a global streaming availability guide (Next.js 14 Pages Router + TMDB + Firebase, deployed on Vercel). Read `docs/ARCHITECTURE.md` for the current-state map and `docs/DECISIONS.md` for why things are the way they are. Append new significant decisions to `docs/DECISIONS.md` as they happen.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Node built-in test runner over `tests/**/*.test.ts` |

## Workflow — no uncaptured work

Work is tracked on the **[WatchAtlas](https://github.com/orgs/aurora-peak/projects/2)** GitHub Project (org-level, aurora-peak) with a **Feature → Story → Task** hierarchy (see `GitHub-Project-Setup.md` for the full playbook).

- Every change maps to a GitHub issue. Find or create one before coding.
- Exactly **one** `type:` label per issue: `type: feature` / `type: story` / `type: task` / `type: bug`.
- Titles prefixed `feat:` / `story:` / `task:` / `bug:`; children linked as native sub-issues.
- Don't pre-create Tasks — break Stories into Tasks during the coding session and link them then.
- Every issue goes on the board. Status flows **Backlog → Ready → In progress → In review → Done** (this board's convention, richer than the playbook's Todo/In Progress/Done); the board also has Priority and Size fields.
- Commits/PRs reference the issue (`Fixes #12`) so it auto-links and auto-closes.

**Issue quality:** titles are clear and imperative; bodies state what and why, acceptance criteria, and a link to the parent Feature/Story. Keep sub-issue checklists current so parent progress bars stay accurate.

## Architecture ground rules

- **TMDB access only via the internal proxy routes** (`pages/api/tmdb/*`). Never call TMDB from the client or expose the key; the server-only `TMDB_API_KEY` is the target — don't add new uses of `NEXT_PUBLIC_TMDB_API_KEY`.
- **Firestore is a named database**: `getFirestore(app, "watchatlaspreference")`. Keep using it; the default database is empty.
- API routes set `Cache-Control: s-maxage` headers — preserve or consciously adjust them when touching routes.
- Styling: Tailwind v4 + the CSS-variable system in `styles/globals.css` (dark default, `.light` overrides). Follow existing variables rather than hardcoding colors.
- `components/NavBar.tsx` is dead code — don't extend it; `AppLayout.tsx` is the live shell.

## Guardrails

- **Never commit secrets.** `.env*` files stay gitignored; example files get placeholders only. Prod values live in Vercel env settings.
- Target **WCAG 2.1 AA** for anything user-facing.
- Security-check changes before opening a PR (no leaked keys, no client-side secrets, auth-gated writes).
- Don't log PII (uids, emails) to the console in production paths.
