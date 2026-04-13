# caltrack — Roadmap

Two tranches: **v1** (shipped overnight, autonomous) and **v2** (planned after morning walkthrough).

Each phase ends with an atomic commit. Tests go alongside implementation (TDD where it pays off — pure functions especially).

---

# v1 — Overnight MVP (complete)

Six phases. Single-user local build. All merged on `main`.

| # | Phase | Covers | Commit |
|---|---|---|---|
| 1 | Data model + persisted store | F-01, F-02, F-08, F-09 | `e100950` |
| 2 | Food logging UI | F-01, F-10 | `c6f5735` |
| 3 | Today screen (totals + entries + FAB) | F-03, F-04, F-05, F-10 | `952298a` |
| 4 | History screen (expandable list) | F-06, F-07 | `2a6e6e6` |
| 5 | Profile screen (editable goals) | F-08, F-09 | `07dccb5` |
| 6 | Verification + MORNING_SUMMARY.md | N-03..N-07 | `caf6e96` |
| — | Runtime bugfix (store selectors) | — | `790c691` |

---

# v2 — Cloud, auth, food library, planner (in progress)

14 phases. Critical path: 7 → 8 → 9 → 10. After Phase 10 most phases parallelize.

Dependency chain:

```
7 ─→ 8 ─→ 9 ─→ 10 ─┬─→ 11 ─→ 11.5 ─→ 12 ─→ 13
                   │                   ├─→ 14
                   │                   ├─→ 16
                   │                   └─→ 17
                   ├─→ 15
                   └─→ 18
                                       ↓
                                  all ─→ 19 ─→ 20
```

## Phase 7 — Supabase schema + RLS

**Covers:** F-11, F-12, N-10, N-12
**Depends on:** —

- Design tables via `mcp__supabase__apply_migration`:
  - `profiles` — one row per auth.users row, stores display name + timezone
  - `foods` — reusable food definitions (name, kcal_per_serving, protein_g, carbs_g, fat_g, barcode, user_id)
  - `log_entries` — actual consumption (user_id, food_id nullable, name, kcal, macros, servings, logged_at, day_key, status `planned | eaten`)
  - `goals` — per-user row with calorie + macro targets
  - `weight_entries` — user_id, kg, body_fat_pct, logged_at
- RLS policies: every user-scoped table has `user_id = auth.uid()` on select/insert/update/delete.
- Run `mcp__supabase__get_advisors({type: 'security'})` — zero warnings required.
- Verify via `mcp__supabase__list_tables({verbose: true})`.
- **No code changes this phase** — just database.
- Commit: `chore(db): initial schema + RLS policies`

## Phase 8 — Supabase client + env plumbing

**Covers:** F-11, F-12
**Depends on:** Phase 7

- `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage` (latter already present)
- `.env.example` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` placeholders
- `lib/supabase.ts` — singleton client, session storage bound to AsyncStorage
- `types/db.ts` — generated via `mcp__supabase__generate_typescript_types`
- Commit: `chore(supabase): client + env plumbing + generated types`

## Phase 9 — Auth flow + session-gated routing

**Covers:** F-11, F-13, V-01
**Depends on:** Phase 8

- New route group `app/(auth)/`:
  - `_layout.tsx` — Stack screen options, dark theme
  - `sign-in.tsx`
  - `sign-up.tsx`
- Root `_layout.tsx` routes to `(auth)` if no session, `(tabs)` if session
- `hooks/useSession.ts` — wraps `supabase.auth.onAuthStateChange`
- Logout button added to Profile tab Danger zone (replaces "Reset all data", which becomes per-user later)
- Tests: sign-in form validation, useSession hook (mocked Supabase client)
- Copy pass: empty states in sign-in/sign-up per V-01 brand voice
- **Runtime verification (N-11):** sign up a test user in the simulator, confirm routing works
- Commit: `feat(auth): sign-in, sign-up, session-gated routing`

## Phase 10 — Store refactor to Supabase-backed

**Covers:** F-12
**Depends on:** Phase 9

- Replace `persist(zustand, AsyncStorage)` with Supabase-queried state
- Keep zustand for in-memory; AsyncStorage becomes an offline read cache only
- Actions become `async` and awaits `supabase.from(...).insert/update/delete(...)` before updating local state
- Add `hydrate()` action called on auth change
- One-time migration helper: if local AsyncStorage has v1 entries, upload them to Supabase and clear local
- Tests: store actions against mocked Supabase client; hydration; migration path
- **Runtime verification (N-11):** log an entry on one device, see it appear on another (or on Supabase dashboard)
- Commit: `refactor(store): supabase-backed with offline cache`

## Phase 11 — Foods table CRUD + library UI

**Covers:** F-18
**Depends on:** Phase 10

- Modal route `app/foods/` with list + create + edit screens
- `components/FoodRow.tsx`, `components/FoodForm.tsx`
- Store actions: `addFood`, `updateFood`, `deleteFood`, `searchFoods(query)`
- Recents + search in the browse list
- **Runtime verification (N-11):** create 3 foods, edit one, delete one, confirm they round-trip to Supabase
- Commit: `feat(foods): library with search + create + edit`

## Phase 11.5 — Nutritionix Track API client

**Covers:** D-24 (reverses D-09)
**Depends on:** Phase 11

- Sign-up at developer.nutritionix.com → provides `app_id` + `api_key` (free tier, ~200 calls/day on Track API). **User must supply these before work starts.**
- `.env` / `.env.example`: add `EXPO_PUBLIC_NUTRITIONIX_APP_ID` + `EXPO_PUBLIC_NUTRITIONIX_API_KEY`.
- `lib/nutritionix.ts` — typed thin client:
  - `searchInstant(query: string)` → `{common: NutritionixHit[], branded: NutritionixHit[]}` via `GET /v2/search/instant`
  - `parseNaturalLanguage(query: string)` → `NutritionixFood[]` via `POST /v2/natural/nutrients`
  - Headers: `x-app-id`, `x-app-key`, `x-remote-user-id: 0`, `Content-Type: application/json`
  - Maps Nutritionix response shape → our internal `Food` shape (kcal, protein_g, carbs_g, fat_g, serving_size)
  - Throws typed errors on non-200 (network, quota, 4xx)
  - Fail fast on missing env vars at module load (same pattern as `lib/supabase.ts`)
- Tests (mocked `fetch`): happy path for both endpoints, quota-exceeded mapping, malformed response, missing optional macro fields.
- No UI changes yet — Phase 12 wires this into the logging sheet.
- Commit: `feat(nutritionix): track api client + tests`

## Phase 12 — Food-first logging flow with stepper servings

**Covers:** F-10 (rewrite), F-18, F-01 (evolution), D-24
**Depends on:** Phase 11.5

- Rewrite `AddMealSheet` as a tabbed sheet:
  - **Log** tab (primary, opens by default):
    - Search input wired to `nutritionix.searchInstant` (debounced 300ms) + local `foods` table search, merged
    - Recent foods list above search results when query is empty
    - Tap a result → stepper for servings → save
    - Long-press / "Use exact amount" → `nutritionix.parseNaturalLanguage(query)` → pre-filled FoodForm
    - On save, upsert into the user's `foods` table so repeat queries don't hit the API
  - **Quick add** tab (secondary): the v1 form (name + raw kcal + macros)
- New `components/Stepper.tsx` — hybrid stepper with tap-to-type (per D-17)
- Tests: `__tests__/components/Stepper.test.tsx`, updated AddMealSheet tests (mock Nutritionix client)
- **Runtime verification (N-11):** log via food library with 0.5 and 2.5 servings; search "chicken breast" and confirm typeahead; NLP "2 eggs and toast"
- Commit: `feat(log): food-first logging with stepper servings`

## Phase 13 — Bullshit detector

**Covers:** F-20
**Depends on:** Phase 11

- `lib/nutrition.ts`:
  - `kcalFromMacros({proteinG, carbsG, fatG})` — pure
  - `checkMacroSanity({calories, proteinG, carbsG, fatG})` → `{ok, severity, impliedKcal, deltaKcal}`
  - Tolerance: `max(25 kcal, 15% of claimed)`
  - Severity buckets: `ok | mild | blatant` (delta ratios TBD in tests)
- Inline warning on `FoodForm` when `checkMacroSanity` is not `ok`
- ⚠ badge on `EntryRow` for entries from foods flagged `blatant`
- Tests: ≥ 15 unit tests covering edge cases (null macros, fractional, exact, high-fiber, zero cals, etc.)
- Commit: `feat(nutrition): macro-vs-calories bullshit detector`

## Phase 14 — Edit entries in place

**Covers:** F-14
**Depends on:** Phase 12

- Tap a row in `EntriesList` → opens `AddMealSheet` pre-filled with that entry's data
- New store action: `updateEntry(id, patch)`
- Sheet handles both add and edit modes via an `initialEntry?: MealEntry` prop
- Tests: update flow, cancel preserves original
- **Runtime verification (N-11):** edit a logged entry, see the today totals recompute
- Commit: `feat(log): edit entries in place`

## Phase 15 — Weight tracking + trend chart

**Covers:** F-15, F-16
**Depends on:** Phase 10

- Store: `addWeight`, `removeWeight`, `weightHistory` selector
- `components/WeightLogSheet.tsx` — modal for logging kg + optional body-fat %
- `components/WeightChart.tsx` — minimal SVG line chart (no new deps; use `react-native-svg` which ships with Expo)
- Entry point: new section on Profile tab
- Tests: weight store actions, chart rendering with sample data
- Commit: `feat(weight): log body weight and render trend chart`

## Phase 16 — Meal planning (planned vs eaten)

**Covers:** F-19
**Depends on:** Phase 12

- `log_entries.status` column: `planned` (default for planned) vs `eaten` (default for regular log)
- New sheet flow: "Plan meal for future date"
- Today screen surfaces planned-but-not-yet-eaten as a separate section above eaten meals
- Tap planned entry → "Mark eaten" or "Adjust"
- New selector: `selectPlannedForToday`
- Commit: `feat(planner): pre-log future meals and mark eaten`

## Phase 17 — Barcode scanning

**Covers:** F-17
**Depends on:** Phase 11

- `npx expo install expo-camera` (expo-barcode-scanner is deprecated)
- Camera permission flow with graceful denial path
- Barcode → Open Food Facts API lookup → pre-fill `FoodForm`
- Fallback: "couldn't find, enter manually" → opens empty FoodForm
- Cache scanned foods in the user's food library
- **Runtime verification (N-11):** scan an actual barcode on a real package via the sim camera input
- Commit: `feat(barcode): scan to auto-populate foods`

## Phase 18 — Calendar grid History

**Covers:** F-06, F-07 (rewrite)
**Depends on:** Phase 10

- Replace flat list with month-grid view:
  - Header: month name + arrow navigation + "Today" jump button
  - 7-column grid, each cell = one day in the month
  - Cell color: gray (no data) / green (at goal ±10%) / yellow (under) / red (over)
- Tap a cell → existing `HistoryDay` component as a bottom sheet with that day's entries
- Respect user's timezone from `profiles.timezone`
- Tests: cell coloring logic, month navigation, sheet open/close
- Commit: `feat(history): calendar grid with day detail sheet`

## Phase 19 — Brand voice copy pass

**Covers:** V-01
**Depends on:** Phases 7–18

- Audit every user-facing string: empty states, button labels, alert titles, form placeholders, error messages, notification bodies
- Rewrite to "dry with light personality" (D-22)
- Pattern file: `lib/copy.ts` — central string table so future features have a reference
- No logic changes
- Commit: `chore(copy): dry-personality voice pass across the app`

## Phase 20 — Final verification + morning summary 2

**Covers:** N-01..N-12
**Depends on:** all above

- `npx tsc --noEmit` — clean
- `npx jest --coverage` — lib/ ≥ 80%
- `npx expo lint` — zero warnings
- `mcp__supabase__get_advisors({type: 'security'})` — zero warnings
- `mcp__supabase__get_advisors({type: 'performance'})` — zero warnings
- **Full runtime walkthrough in simulator** covering every user story (sign up, log food, plan meal, scan barcode, edit, log weight, view calendar)
- Rewrite `MORNING_SUMMARY.md` → `MORNING_SUMMARY_v2.md` covering everything since `caf6e96`
- Commit: `chore: v2 final verification + summary`
