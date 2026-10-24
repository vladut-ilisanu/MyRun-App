# CLAUDE.md — Master Specification: "RunnaPulse"

A free, installable iOS PWA that replicates Runna-level marathon coaching, hosted on
GitHub Pages, backed by Supabase (free tier), fed by Strava → Apple Health → iOS Shortcut.

This spec is the improved version of the original Gemini blueprint. The 8 improvements
agreed with the user are folded in and marked **[IMPROVED]**.

## 1. Objective
Build **RunnaPulse**: a dark-mode, standalone iOS PWA that:
1. Feels like a native iOS app (standalone viewport, safe-area insets, fixed glass tab bar).
2. Generates a **documented**, sports-science marathon plan (Jack Daniels VDOT, Pfitzinger
   80/20, 3:1 deload periodization) that **adapts to the user's real race date and fitness**.
3. Ingests completed runs from Strava → Apple Health → iOS Shortcut → Supabase, matches
   them to the training week, and persists everything locally + in the cloud.

## 2. The 8 Improvements over the original blueprint
1. **[IMPROVED] Dynamic week count** — the plan length is computed from the selected race
   date (not hardcoded to 16). Phases scale proportionally; the 3:1 deload rhythm and the
   final taper are preserved for any length from 8–24 weeks.
2. **[IMPROVED] Supabase is backup/ingestion only** — `localStorage` is the source of truth,
   so the free-tier 7-day project pause never loses the plan.
3. **[IMPROVED] Keys never committed** — Supabase URL/anon key are entered in-app and stored
   in `localStorage` only; nothing secret is in the repo (repo can stay public for free Pages).
4. **[IMPROVED] Shared-secret guard (optional)** — documented optional column so random POSTs
   to the public anon endpoint can be rejected.
5. **[IMPROVED] Units** — user runs in **km**. Normalizer handles km, meters, and European
   comma decimals. (Miles detection documented but km is the default.)
6. **[IMPROVED] Service worker** — app shell is cached so it opens offline (e.g. airplane
   mode at the start line).
7. **[IMPROVED] True Daniels VDOT paces** — E/M/T/I/R paces are derived directly from VDOT
   via Daniels' oxygen-cost + %VO2max equations, not as offsets from marathon pace.
8. **[IMPROVED] Volume seeded from current fitness + per-workout rationale** — weekly volume
   starts from the user's current mileage and progresses ~8–10%/week; every workout carries a
   short "why" note citing the method, so the plan reads as coached, not random.

## 3. Tech Stack
- Vite + React 18 + TypeScript
- `HashRouter` (GitHub Pages: zero 404 on refresh)
- `base: './'` in `vite.config.ts`
- Tailwind CSS + `lucide-react`
- `@supabase/supabase-js` with dual-sync (localStorage primary + cloud backup)
- GitHub Actions deploy of `dist/` to Pages on push to `main`

## 4. Native iOS Standalone requirements
See `index.html`, `public/manifest.webmanifest`, `src/index.css`:
- viewport `viewport-fit=cover`, `apple-mobile-web-app-capable=yes`, black-translucent status bar.
- `overscroll-behavior-y: none`, no tap highlight, no user-select.
- Header `padding-top: max(env(safe-area-inset-top), 16px)`.
- Fixed bottom tab bar `padding-bottom: max(env(safe-area-inset-bottom), 12px)` + blur glass.
- Scroll container `padding-bottom` clears the tab bar (`pb-28`).

## 5. Sports-science engine
- `src/lib/vdot.ts` — Daniels/Gilbert VDOT from a recent race; E/M/T/I/R paces; equivalent
  race times (5K/10K/HM/M). Moving-pace rule: pace = `duration_seconds / (distance_meters/1000)`.
- `src/lib/planGenerator.ts` — deterministic, dynamic-length periodized plan with structured
  `WorkoutSegment[]` and a rationale per workout.

## 6. Ingestion & matcher
- `src/lib/workoutMatcher.ts` — `normalizeHealthPayload` (km/m/comma safety, deterministic
  `external_id = ${local_date}_${round(distance_meters)}_${round(duration_seconds)}`) and the
  multi-pass matcher (exact date → same-week swap ±30% → compliance scoring → unplanned run).

## 7. Supabase schema — `supabase/schema.sql` (also copyable in the Setup tab).

## 8. UI — 4 tabs
Today (dashboard), Plan (week timeline), Zones & Stats (VDOT + mileage chart),
Setup & Sync (plan config + Supabase form + iOS Shortcut generator + Simulate Run).

## 9. Mandatory QA & Self-Verification Checklist
1. `npx tsc --noEmit` and `npm run build` exit 0.
2. GitHub Pages relative paths: `base: './'`, `HashRouter`, relative asset/manifest paths.
3. iOS standalone & safe-area: viewport-fit=cover, capable=yes, bottom bar safe-area padding.
4. European decimal & unit: "15,4" km → 15400 m, 15.4 → 15400, 15400 → 15400.
5. Moving-pace accuracy: `duration/(distance/1000)`, formatted `m:ss/km` with leading zero.
6. Periodization & deload: deload weeks drop ~20–25%, peak before taper, taper to 42.2 km,
   every workout has segments. (Dynamic length from race date.)
7. Week-window matcher: Saturday run matches Sunday long run same week; duplicate
   `external_id` never duplicates.
8. GitHub Actions `deploy.yml` present and deploys `dist/` to Pages on push to `main`.
