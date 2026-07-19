<p align="center">
  <img src="public/watchatlas-banner.png" alt="WatchAtlas" width="640">
</p>

<p align="center">
  <em>Your atlas for what to watch next.</em>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-11-FFCA28?logo=firebase&logoColor=black">
  <img alt="TMDB" src="https://img.shields.io/badge/Data-TMDB-01B4E4?logo=themoviedatabase&logoColor=white">
  <img alt="Vercel" src="https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white">
</p>

---

## About

Streaming catalogs differ wildly between countries, and most guides only show your own region. **WatchAtlas** searches TMDB and shows where a title can be streamed, rented, or bought **across every country, grouped by continent** — with sign-in to save the countries you care about so availability filters to them.

Built and maintained by [Aurora Peak](https://github.com/aurora-peak).

## Features

- **Search & browse** — trending, popular, and top-rated movies and TV from TMDB, with merged movie+TV search.
- **Where to watch, globally** — per-title stream/rent/buy providers grouped by country and continent.
- **Favorite countries** — Google sign-in saves your countries; detail pages filter to them.
- **Light & dark themes** — the whole app adapts to your preference.
- **Status monitoring** — a live TMDB health banner plus a daily cron that alerts Discord, Slack, and email on outages.

## Tech Stack

| Layer | Tooling |
| --- | --- |
| Framework | Next.js 14 (Pages Router), React 18, TypeScript 5 |
| UI | NextUI, Tailwind CSS v4, lucide-react / heroicons |
| Auth & data | Firebase Auth (Google) + Firestore (named database `watchatlaspreference`) |
| Content | TMDB v3 API, proxied server-side through `/api/tmdb/*` |
| Hosting | Vercel, including a daily cron |
| Testing | Node built-in test runner (`npm test`) |

## Getting Started

### Prerequisites

- Node.js 20 or newer
- A [TMDB API key](https://www.themoviedb.org/settings/api)
- A [Firebase project](https://console.firebase.google.com/) with Authentication enabled, and a Google OAuth client ID

### Setup

```bash
git clone https://github.com/aurora-peak/watchatlas-web.git
cd watchatlas-web
npm install
cp .env.local.example .env.local   # then fill in your own values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

| Key | Required | Purpose |
| --- | --- | --- |
| `TMDB_API_KEY` | Yes | Server-side TMDB access (used by `/api/tmdb/*`). Never exposed to the client. |
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Firebase client config — API key, auth domain, project ID, storage bucket, sender ID, app ID |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google Identity Services sign-in |
| `CRON_SECRET` | Prod | Bearer auth for `/api/cron/health-check` |
| `NEXT_PUBLIC_SITE_URL` | Prod | Base URL used by the cron health check |
| `DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL_TO` | Optional | Outage alert channels |

> **Never commit real secrets.** `.env.local` is gitignored and `.env.local.example` holds placeholders only. Production values live in Vercel's environment settings.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build locally |
| `npm test` | Run the test suite |

## Project Structure

```
watchatlas-web/
├── pages/         # Routes: index, details/[id], settings + /api proxy & cron routes
├── components/    # AppLayout, ShowCard, StatusBanner
├── lib/           # TMDB client, Firebase/Firestore, auth context, country data
├── styles/        # globals.css design system (dark default)
├── docs/          # PRD, ARCHITECTURE, DECISIONS, and design specs
├── types/         # Shared TypeScript types
└── public/        # Static assets
```

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | Product requirements — current state plus Phase 2 and Phase 3 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Current-state map of the codebase |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Running decision log — why things are the way they are |
| [CLAUDE.md](CLAUDE.md) | Rules of the road for contributors and AI agents |
| [GitHub-Project-Setup.md](GitHub-Project-Setup.md) | The board and issue-hierarchy playbook |

## Project Board & Workflow

Work is tracked on the **[WatchAtlas](https://github.com/orgs/aurora-peak/projects/2)** GitHub Project using a **Feature → Story → Task** issue hierarchy. Status flows **Backlog → Ready → In progress → In review → Done**, and commits and PRs reference their issue (`Fixes #12`) so it auto-closes on merge.

## Deployment

Deployed on **Vercel** — every push to `main` ships to production, and every other branch gets its own preview deployment. `vercel.json` also schedules the daily health-check cron at 09:00 UTC.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

---

<p align="center"><sub>An <a href="https://github.com/aurora-peak">Aurora Peak</a> product · Proudly built in the PNW.</sub></p>
