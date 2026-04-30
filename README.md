# caltrack

A multi-user, cloud-synced calorie and fitness tracker for iOS and Android. Built with Expo + Supabase. Most of the code was written by autonomous Claude Code agents during overnight sessions, with a hard rule that every phase had to ship as an atomic commit and be runtime-verified on a physical device before being marked done.

This repo doubles as a stress test of supervised autonomous coding workflows. Every decision is logged to `.planning/DECISIONS.md`. The full session transcripts are also preserved.

## What it does

- **Auth + cloud sync** — Supabase email/password auth with Row-Level Security on every user-scoped table. Sign up on one device, see your data on another.
- **Food-first logging** — search USDA's FoodData Central via a Supabase edge function, pick a food, dial a serving count with a hybrid stepper (0.5, 1, 1.37 — tap-to-type for fractional amounts), save.
- **Barcode scanning** — point your camera at a packaged food, hit Open Food Facts, get a pre-filled food entry. Manual fallback for sim testing. Works from both the food library and the meal-log sheet.
- **Bullshit detector** — when entering food macros, the app compares claimed calories against implied calories from the 4P/4C/9F rule. Mismatches outside tolerance (`max(25 kcal, 15%)`) get an inline warning on the form and a ⚠ badge on logged entries.
- **Meal planning** — pre-log meals up to 6 days out as "planned." Today screen surfaces planned-but-not-yet-eaten items separately. Mark eaten or adjust when the time comes.
- **Weight tracking + trend chart** — log body weight (+ optional body-fat %), see a minimal SVG line chart over time on the Profile tab.
- **Calendar-grid History** — month grid colored by goal adherence (gray / green / yellow / red). Tap a day for the full breakdown.
- **In-place editing** — tap any logged entry, edit it in the same sheet, totals recompute.
- **Brand voice pass** — every user-facing string flows through `lib/copy.ts` in a "dry with light personality" voice. Flagship empty state: *"An empty log. What a glorious, untouched canvas."*

## Stack

- **Mobile:** Expo SDK 54, React Native 0.81, React 19, Expo Router (file-based routing), TypeScript strict, zustand
- **Backend:** Supabase (Postgres + Auth + Edge Functions) with RLS on every user-scoped table
- **Edge function:** `food-lookup` (Deno) — combines USDA FoodData Central text search and Open Food Facts barcode lookup behind one endpoint, with normalizers that handle USDA's `labelNutrients` (branded) vs `foodNutrients` (Foundation/SR Legacy) split
- **Testing:** Jest + jest-expo + @testing-library/react-native — 320 passing tests, 92% coverage on `lib/`

## Run it locally

```bash
# 1. Install
npm install

# 2. Wire env (see .env.example)
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Boot Metro
npx expo start

# 4. Open on device or simulator
# - Physical iPhone: install Expo Go, sign into the same Expo account, app appears under Development servers
# - iOS simulator: press `i` in the Metro terminal
```

For the iPhone path, you'll also need a Supabase project with the schema in `supabase/migrations/` applied. The `food-lookup` edge function deploys from `supabase/functions/food-lookup/`. Set `USDA_FDC_API_KEY` in Supabase → Edge Functions → Secrets.

## Hard problems we hit (and solved)

- **JWT algorithm mismatch:** Supabase's auth mints ES256 user tokens but the Edge Function gateway only verifies HS256, 401-ing every real user request. Diagnosed by decoding the JWT `alg` field at runtime, documented as decision **D-28**, fixed by flipping `verify_jwt:false` and using raw `fetch` with manual `Authorization` headers — so when Supabase ships ES256 gateway support, we flip one flag without touching client code.
- **Background JS pause + token expiry:** wired AppState ↔ `supabase.auth.startAutoRefresh()` so backgrounded sessions don't silently expire.
- **USDA dataType handling:** branded foods report nutrition per serving in `labelNutrients`; Foundation/SR Legacy use `foodNutrients` per 100g. Single normalizer branches on `dataType`.
- **iOS formSheet phantom-presentation race:** pushing a stack route while a formSheet is mid-dismiss puts UIKit in a state where re-presenting the sheet renders empty and the FAB underneath becomes unclickable. Fixed by deferring the second nav until UIKit's animation flushes, via `InteractionManager.runAfterInteractions`.
- **Supabase free-tier auto-pause:** projects pause after a stretch of inactivity; symptom is `TypeError: Network request failed` on every fetch and `AuthApiError: error finding refresh token: FATAL: terminating connection due to administrator command (SQLSTATE 57P01)` in Metro. Resume the project in the dashboard, then sign out + back in on the device (the pre-pause refresh token is dead).

## Project artifacts

- **`.planning/ROADMAP.md`** — 20 numbered phases, each with its own plan, dependencies, and verification checklist.
- **`.planning/DECISIONS.md`** — every meaningful design call (D-01 through D-33) with the alternatives considered.
- **`.planning/STATE.md`** — single-source-of-truth status. New sessions read this first.
- **`MORNING_SUMMARY.md`** — the v1 (single-user, local-only) overnight summary.
- **`MORNING_SUMMARY_v2.md`** — the v2 (cloud, auth, food library, planner, barcode, charts) overnight summary.

## License

UNLICENSED — this is a portfolio/sandbox project, not a published library.
