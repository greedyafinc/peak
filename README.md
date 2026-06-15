# Peak

**Peak** is an athletic progress tracker built as a [Tauri 2](https://tauri.app) app that targets
**desktop (macOS / Windows / Linux) and mobile (iOS / Android)** from one React + TypeScript codebase.

It is a faithful implementation of the `Peak.dc.html` prototype exported from
[Claude Design](https://claude.ai/design) — a sleek dark "performance-tech" aesthetic with lime/mint thermal
accents on near-black, Space Grotesk + JetBrains Mono type, and a blocky-anatomical muscle heat map as the
centerpiece.

> Unlike the other entries in this repo (which are `kind: node-service` marketplace bundles), Peak is a
> standalone, original Tauri application — there is no upstream to vendor.

## Features

Five surfaces, switched from the bottom nav (+ a center **+** action sheet):

- **Body** (centerpiece) — a **muscle heat map** where color encodes strength (cold teal → hot red).
  Front/back toggle, tap any muscle for its score, top lift, bodyweight ratio, percentile and the exercises
  that train it. Below: a six-axis **athleticism radar** (Strength, Power, Speed, Stamina, Mobility, Balance),
  Peak Score / symmetry / volume tiles, and a **Gaps & next moves** section that surfaces weak points with
  add-to-plan workouts.
- **Feed** — gym / cardio / sport / mobility sessions with filter chips, a **consistency** banner
  (14-day streak, weekly bar chart, on-plan rate), the primary-goal card, and a body-gap teaser. Gym cards
  preview up to 4 exercises with PR markers.
- **Coach** — **AI Chat** (smart canned replies keyed to goals like marathon / human flag / weak points),
  **Live Coach** with a camera viewport + skeleton tracking and real-time form metrics, and **Drills** by sport.
- **Goals** — milestone-based missions: a primary-goal hero with a large milestone ladder (completed steps
  check off, the current one glows, upcoming ones are dim numbered nodes) plus all goals with their own tracks.

The center **+** opens a "Start something" action sheet (gym / cardio / sport / ask the coach / set a goal).

All data is realistic authored sample content (`src/data.ts`) — easy to swap for a real backend.

## Stack

| Layer | Tech |
|-------|------|
| Shell | Tauri 2 (Rust), desktop + mobile (`mobile_entry_point` in `src-tauri/src/lib.rs`) |
| Frontend | React 18 + TypeScript + Vite |
| State | A small React context store (`src/store.tsx`) |
| Visualizations | Hand-built React/SVG: body heat map, radar, pose skeleton, milestone stepper (`src/viz/`) |

The UI is responsive: on a wide desktop window it floats inside an iPhone device frame (matching the prototype);
on a narrow / mobile viewport the frame drops away and the app fills the screen edge-to-edge (see `src/styles.css`).

## Develop

```bash
cd apps/peak
npm install

# Web only (fast iteration), opens http://localhost:1420
npm run dev

# Desktop app (Tauri dev window)
npm run tauri:dev

# Production build (frontend typecheck + bundle, then native build)
npm run build         # frontend only (tsc --noEmit && vite build)
npm run tauri:build   # full desktop bundle (.app/.dmg, .msi, .deb/.AppImage)
```

### Mobile

Tauri 2 generates the native iOS/Android projects on demand into `src-tauri/gen/` (git-ignored). Icons for both
platforms are already generated under `src-tauri/icons/{ios,android}`.

```bash
# iOS (requires Xcode — present on the build machine)
npm run ios:init      # one-time: scaffolds src-tauri/gen/apple
npm run ios:dev       # build + run on a simulator/device

# Android (requires Android SDK + NDK)
npm run android:init
npm run android:dev
```

## Layout

```
apps/peak/
├── index.html                 # Vite entry; loads Google Fonts
├── package.json               # scripts + deps (@tauri-apps/cli, react, vite)
├── vite.config.ts             # Tauri-aware Vite config (port 1420, mobile host)
├── src/
│   ├── main.tsx               # React root
│   ├── App.tsx                # device frame + screen router
│   ├── store.tsx              # React-context state store
│   ├── theme.ts               # color tokens + heat() ramp + fonts
│   ├── data.ts                # sample content (muscles, feed, goals, drills, coach replies)
│   ├── goals.ts               # goal → milestone decoration
│   ├── styles.css             # frame / responsive / keyframes
│   ├── components/            # StatusBar, BottomNav, ActionSheet
│   ├── screens/               # Feed, Body, Coach, Goals
│   └── viz/                   # BodyMap, Radar, Skeleton, Stepper
└── src-tauri/                 # Rust shell, tauri.conf.json, capabilities, icons
```

## Design provenance

The visual spec comes from the Claude Design handoff bundle (`Peak.dc.html`). The prototype's intent — captured
in its chat transcript — was a goal-centric athletic tracker with an obvious-milestone model and a muscle heat
map as the hero. This implementation recreates that output in React/Tauri rather than copying the prototype's
internal templating.
