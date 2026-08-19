# Graph Report - watchatlas-web  (2026-08-15)

## Corpus Check
- 69 files · ~67,232 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 297 nodes · 391 edges · 42 communities (19 shown, 23 thin omitted)
- Extraction: 85% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Layout & Components
- Country & Location Data
- TypeScript Types
- Build System & Dependencies
- Auth & User Preferences
- External Frameworks
- Streaming Discovery Logic
- Show Card Component
- Architecture & Caching
- Notification System
- Health Monitoring
- TMDB List API
- CSS Styling System
- Document Pages
- Vercel Deployment
- Provider Preferences
- API Routes
- TMDB Search API
- Trending Data
- Popular Media
- Project Documentation
- TMDB Provider Data
- TMDB Details API
- Firestore Configuration
- Feature Phases
- WatchAtlas Core
- Design Specs
- Component Library
- Production Monitoring
- Theme Configuration
- User Features
- Project Setup
- Roadmap Planning
- Dashboard System
- Support Infrastructure

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `useAuth()` - 13 edges
3. `getPosterUrl()` - 8 edges
4. `DetailsPage()` - 8 edges
5. `Preferred Streaming Services (FR-1 to FR-6)` - 8 edges
6. `ServicePicker()` - 7 edges
7. `getCountryMeta()` - 6 edges
8. `sendAllNotifications()` - 6 edges
9. `FavoriteService` - 6 edges
10. `parseRegions()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `WatchAtlas Banner Image` --describes--> `WatchAtlas`  [1.0]
  public/watchatlas-banner.png → README.md
- `WatchAtlas Logo` --describes--> `WatchAtlas`  [1.0]
  public/logo.png → README.md
- `TMDB Logo` --related_to--> `TMDB Data Flow`  [1.0]
  public/tmdb-logo.png → ARCHITECTURE.md
- `NavBar()` --calls--> `useAuth()`  [EXTRACTED]
  components/NavBar.tsx → lib/AuthContext.tsx
- `ServicePicker()` --calls--> `getCountryMeta()`  [EXTRACTED]
  components/ServicePicker.tsx → lib/countries.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **** — prd:preferredServices, prd:watchlist, prd:recommendations, prd:redesign [INFERRED]
- **** — architecture:dataFlow, lib:tmdb, rule:tmdbProxy, security:migrationComplete [INFERRED]
- **** — architecture:authPreferences, lib:authContext, lib:firestore, architecture:firebaseStructure [INFERRED]
- **** — workflow:boardHierarchy, workflow:commits, rule:tmdbProxy, rule:firestoreDatabase [INFERRED]
- **** — prd:watchlist, architecture:firebaseStructure, lib:notifications, decisions:monitoring [INFERRED]
- **** — prd:recommendations, claude:opus48, testing:node, architecture:dataFlow [INFERRED]
- **** — prd:appleApps, architecture:authPreferences, architecture:dataFlow, prd:redesign [INFERRED]

## Communities (42 total, 23 thin omitted)

### Community 0 - "UI Layout & Components"
Cohesion: 0.09
Nodes (34): AppLayout(), NavBar(), styles, Window, LoadState, ServicePicker(), ServicePickerProps, HealthStatus (+26 more)

### Community 1 - "Country & Location Data"
Cohesion: 0.12
Nodes (20): Country, getCountryList(), getCountryMeta(), getDisplayCountries(), ProviderEntry, buildProviderDisplayTiers(), collectStreamingProviders(), CountryStreamingProviders (+12 more)

### Community 2 - "TypeScript Types"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, node_modules, **/*.ts, **/*.tsx, compilerOptions (+18 more)

### Community 3 - "Build System & Dependencies"
Cohesion: 0.08
Nodes (25): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @tailwindcss/postcss, tsx, tw-animate-css (+17 more)

### Community 4 - "Auth & User Preferences"
Cohesion: 0.11
Nodes (23): Auth & User Preferences, Firestore Data Structure, Claude API (claude-opus-4-8), ShowCard Component, StatusBanner Component, Uptime Monitoring with Multi-Channel Alerting, Roadmap: Phase 2 + Phase 3, AuthContext (lib/AuthContext.tsx) (+15 more)

### Community 5 - "External Frameworks"
Cohesion: 0.09
Nodes (23): firebase, framer-motion, @heroicons/react, lucide-react, next-themes, @nextui-org/react, dependencies, firebase (+15 more)

### Community 6 - "Streaming Discovery Logic"
Cohesion: 0.17
Nodes (15): DiscoverItem, MAX_DISCOVER_REGIONS, MAX_DISCOVER_RESULTS, mergeDiscoverResults(), parseProviderIds(), CatalogProvider, mergeProviderCatalog(), parseRegions() (+7 more)

### Community 7 - "Show Card Component"
Cohesion: 0.15
Nodes (9): Props, ShowCard(), buildDiscoverQuery(), getPosterUrl(), searchTMDBAll(), TMDBResult, tmdbService, HomePage() (+1 more)

### Community 8 - "Architecture & Caching"
Cohesion: 0.20
Nodes (10): TMDB Data Flow, Tech Stack, Vercel CDN Caching, Vercel Deployment, TMDB Logo, WatchAtlas Banner Image, WatchAtlas Logo, TMDB Client Library (lib/tmdb.ts) (+2 more)

### Community 9 - "Notification System"
Cohesion: 0.43
Nodes (6): NotificationPayload, sendAllNotifications(), sendDiscordNotification(), sendEmailNotification(), sendSlackNotification(), handler()

### Community 10 - "Health Monitoring"
Cohesion: 0.47
Nodes (4): checkTMDB(), handler(), CronHealthCheckResponse, HealthCheckResponse

### Community 12 - "CSS Styling System"
Cohesion: 0.67
Nodes (3): CSS Variable Design System, Dual Theme Systems (Drift), Architecture Rule: Tailwind + CSS Variables

## Knowledge Gaps
- **126 isolated node(s):** `Window`, `styles`, `LoadState`, `ServicePickerProps`, `Props` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `UI Layout & Components` to `Country & Location Data`, `Show Card Component`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `dependencies` connect `External Frameworks` to `Build System & Dependencies`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `Window`, `styles`, `LoadState` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Layout & Components` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Country & Location Data` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._
- **Should `TypeScript Types` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Build System & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._