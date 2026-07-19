# Apple Platform Apps (iOS / iPadOS / macOS / tvOS) — Program Overview

**Date:** 2026-07-19 · **Status:** Program decomposition approved; sub-projects to be spec'd individually
**Project:** #5 in the roadmap — the largest work item; see `docs/DECISIONS.md`.

This is a **program, not a single project**. Each sub-project below gets its own brainstorm → spec → plan → build cycle when its turn comes. This document records the program-level decisions and decomposition so those cycles start from a settled foundation.

## Program-level decisions (made 2026-07-19)

1. **App stack: Swift + SwiftUI multiplatform.** One Swift codebase targeting all four platforms natively. Rejected: React Native (tvOS on a community fork, macOS rough) and Capacitor wrappers (no tvOS story, review risk). tvOS's focus-driven UI and macOS windowing are only first-class in SwiftUI.
2. **Backend architecture: hybrid.** Apps use Firebase's native Apple SDK for auth and user data (preferences, watchlist — same Firestore rules as web) and call the Next.js API routes for TMDB proxy, discover, and recommendations. Mirrors the web architecture; no client-side TMDB key (the thing the web just migrated away from). Rejected: full BFF (rewrites the web data layer too), Firebase-only (re-exposes the TMDB key).
3. **Sequencing: app requirements are an input to the UI redesign.** Roadmap remains 2 → 3 → 4 → 1 → 5-builds, but **sub-project 5a (requirements & API contract) is nailed down before/with #1**, so the redesign produces a design language that works across web and all four Apple platforms — not a web-only restyle that the apps then fight.

## Decomposition

### 5a. App requirements, API contract & auth hardening — *feeds the redesign*

The "architectural rejigging," and the piece that must be settled before #1 executes:

- **Design constraints for the redesign:** the design system must be expressible in SwiftUI as well as CSS — tokens (color/type/spacing) defined platform-neutrally; component inventory mapped to both web and SwiftUI equivalents; tvOS 10-foot UI (focus states, large type, minimal text entry) considered from the start; platform navigation idioms (tab bar / sidebar / focus grid) accounted for.
- **API contract:** treat the routes the apps consume (`/api/tmdb/*`, discover, recommend) as a versioned, documented contract — request/response shapes written down, auth requirements explicit (Firebase ID token on personalized endpoints), stable error shapes.
- **Auth:** add **Sign in with Apple** to Firebase Auth — an App Store requirement once Google sign-in is offered — landing on the web too. Review Firestore security rules for multi-client access.

### 5b. iOS / iPadOS app — *the bulk of the Swift work*

Core SwiftUI app: auth, browse/home, details + where-to-watch, watchlist, discover, settings; adaptive iPad layouts. Establishes the shared Swift packages (models, API client, Firebase layer, design tokens) the other targets reuse.

### 5c. tvOS app

Reuses the Swift core; genuinely different UX — focus-engine navigation, 10-foot layouts, QR/device-code sign-in instead of typed credentials.

### 5d. macOS app

Mostly falls out of SwiftUI multiplatform; window sizing, menu bar, keyboard shortcuts.

### 5e. Release operations

Apple Developer account, bundle IDs, signing, TestFlight, App Store listings, privacy manifests / nutrition labels, TMDB attribution compliance in-app.

## Order within the program

5a (with #1) → 5b → 5c and 5d (parallelizable once the shared core exists) → 5e (overlaps the first TestFlight build).

## Explicitly out of scope for the program

Android/Google TV, watchOS, widgets/App Intents, and offline-first sync beyond what Firestore's SDK provides — all revisitable after launch.
