# WatchAtlas

A global streaming availability guide — find where any movie or TV show is streaming, by country, worldwide.

## About

Streaming catalogs differ wildly between countries, and most guides only show your region. WatchAtlas searches TMDB and shows where a title can be streamed, rented, or bought **across every country, grouped by continent** — with sign-in to save your favorite countries so availability is filtered to the places you care about.

## Features

- **Search & browse** — trending, popular, and top-rated movies/TV from TMDB, merged movie+TV search.
- **Where to watch, globally** — per-title stream/rent/buy providers grouped by country and continent.
- **Favorite countries** — Google sign-in saves your countries; detail pages filter to them.
- **Status monitoring** — live TMDB health banner plus a daily cron that alerts Discord/Slack/email on outages.

## Tech Stack

| Layer | Tooling |
| --- | --- |
| Framework | Next.js 14 (Pages Router), React 18, TypeScript |
| UI | NextUI, Tailwind CSS v4, lucide/heroicons |
| Auth & data | Firebase Auth (Google) + Firestore; TMDB v3 API |
| Hosting | Vercel (incl. daily cron) |
| Testing | Node built-in test runner (`npm test`) |

## Getting Started

### Prerequisites

- Node.js 20+
- A TMDB API key, a Firebase project, and a Google OAuth client ID

### Setup

```bash
git clone https://github.com/aurora-peak/watchatlas-web.git
cd watchatlas-web
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

## Environment Variables

| Key | Required | Purpose |
| --- | --- | --- |
| `TMDB_API_KEY` | Yes | Server-side TMDB access (used by `/api/tmdb/*`) |
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Firebase client config (API key, auth domain, project ID, storage bucket, sender ID, app ID) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google Identity Services sign-in |
| `CRON_SECRET` | Prod | Bearer auth for `/api/cron/health-check` |
| `NEXT_PUBLIC_SITE_URL` | Prod | Base URL used by the cron health check |
| `DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL_TO` | Optional | Outage alert channels |

> **Never commit real secrets.** Keep env files gitignored; manage prod values in Vercel's environment settings.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run tests |

## Project Structure

```
watchatlas-web/
├── pages/         # Routes: index, details/[id], settings + /api proxy & cron routes
├── components/    # AppLayout, ShowCard, StatusBanner
├── lib/           # TMDB client, Firebase/Firestore, auth context, country data
├── styles/        # globals.css design system (dark default)
├── docs/          # ARCHITECTURE.md, DECISIONS.md, specs
└── tests/         # Node test runner suites
```

## Project Board & Workflow

Work is tracked on the **[WatchAtlas](https://github.com/orgs/aurora-peak/projects/2)** GitHub Project (repo → **Projects** tab) using a **Feature → Story → Task** issue hierarchy. Status flows **Backlog → Ready → In progress → In review → Done**; commits/PRs reference issues (`Fixes #12`) to auto-close on merge.
See [GitHub-Project-Setup.md](GitHub-Project-Setup.md) for the full setup and [CLAUDE.md](CLAUDE.md) for contributor/agent rules.

## Deployment

Push to `main` → Vercel deploys production. `vercel.json` also schedules the daily health-check cron (09:00 UTC).

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
