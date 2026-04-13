# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟢 Next action — Phase 11.5: Nutritionix Track API client

Phase 11 shipped (`9bb1b8f` + close-button follow-up) and runtime-verified on 2026-04-13. User walked through: add Chicken Breast / Oats / Apple, search narrows by substring, edit a food, delete Apple → confirmed via MCP that Chicken Breast + Oats remain in `public.foods` for the user and Apple is gone. Initial modal had no dismiss affordance (the inner Stack's headerLeft is empty by default on the root screen) — fixed by adding an explicit "Close" button that calls `router.back()`.

What Phase 11 added (context for Phase 11.5+):
- `types/index.ts` — `Food`, `NewFoodInput`, `FoodUpdateInput` (camelCase mirror of `public.foods` row).
- `lib/store.ts` — `foods` state + `addFood`/`updateFood`/`deleteFood` async actions + `searchFoods(foods, query)` selector. `hydrate()` loads foods in parallel with goals + entries. `reset()` clears foods too. All actions follow the Phase-10 pattern: Supabase round-trip first, then local state update. Sort-by-name is enforced on every mutation via `sortFoodsByName`.
- `lib/foodForm.ts` — `FoodDraft` + `validateFoodDraft` + `foodToDraft` (parallel to `lib/goals.ts`). Trims name, requires positive kcal, rejects negative macros, normalizes empty serving size to null.
- `components/FoodForm.tsx` — shared create/edit form with optional `onDelete` prop.
- `components/FoodRow.tsx` — list row with name + optional serving / macros meta line + kcal rightmost.
- `app/foods/` — modal stack with `index` (search + list + Add + Close), `new` (create), `[id]` (edit + delete with confirm alert).
- `app/_layout.tsx` — registers `foods` as a modal route: `<Stack.Screen name="foods" options={{ presentation: 'modal' }} />`.
- `app/(tabs)/profile.tsx` — secondary-variant "Food library (N)" button above the goals that pushes `/foods`.

Phase 11.5 plan (from ROADMAP.md — D-24 reverses D-09 because Nutritionix Track has a free tier):
- **BLOCKER:** user must supply `EXPO_PUBLIC_NUTRITIONIX_APP_ID` + `EXPO_PUBLIC_NUTRITIONIX_API_KEY` from developer.nutritionix.com before work starts. Ask for them up front.
- `.env.example` additions for both keys. `lib/supabase.ts`-style fail-fast check in the new client.
- `lib/nutritionix.ts` — typed thin client:
  - `searchInstant(query)` → `{ common: NutritionixHit[]; branded: NutritionixHit[] }` via `GET /v2/search/instant`
  - `parseNaturalLanguage(query)` → `NutritionixFood[]` via `POST /v2/natural/nutrients`
  - Headers: `x-app-id`, `x-app-key`, `x-remote-user-id: 0`, `Content-Type: application/json`
  - Maps Nutritionix shape → our internal `Food` shape (kcal, protein_g, carbs_g, fat_g, serving_size).
  - Throws typed errors on non-200 (network, quota, 4xx).
- Tests (mocked `fetch`): happy path for both endpoints, quota mapping, malformed response, missing optional macro fields.
- No UI changes — Phase 12 wires this into the logging sheet.
- Commit: `feat(nutritionix): track api client + tests`

Known gotchas carrying forward:
- **Metro restart + Expo Go bridge bug** — always run `xcrun simctl terminate <uuid> host.exp.Exponent` before (or between) `npx expo start` invocations. Sim UUID for iPhone 17 Pro: `9C4876FA-93CE-4EC1-B705-8F06C5A2E72E` (may change on reset). Symptom: `NativeModule: AsyncStorage is null` on import. It's never a code bug.
- **expo-router typed routes** are on. Adding a new file-based route (e.g. a new folder under `app/`) leaves the generated `.expo/types/router.d.ts` stale, so `npx tsc --noEmit` will reject `router.push('/newroute')` with a cryptic type error listing all known routes. Fix: start Metro once (`npx expo start --no-dev --minify` in bg) until `.expo/types/router.d.ts` mtime changes, then kill it.
- **Supabase `.update(payload)`** rejects `Record<string, unknown>` — it wants `TablesUpdate<'tablename'>` from `types/db`. Build typed patches when constructing partial updates (see `updateFood` in `lib/store.ts`).
- **Modal nested-Stack dismiss** — the inner Stack's root screen has no back affordance. Always add an explicit `headerLeft` Close button on any `app/<group>/index.tsx` that's presented as a modal (see `app/foods/index.tsx`).
- **RLS silence**: queries without an active session return zero rows, not an error. Check `useAppStore.getState().error`.
- **day_key vs logged_at**: schema uses `day_key` (YYYY-MM-DD local) for bucketing. `lib/date.ts` already produces this.

---

## Project facts the user won't repeat

- **Repo:** `/Users/hari7aran/Desktop/caltrack-autopilot-test`
- **Supabase project:** `gjzonxmvfaokjpgfykrn.supabase.co` (MCP connected)
- **Branch:** `main` (all work lives here; no feature branches this project)
- **Last commit:** `9bb1b8f` — `feat(foods): library with search + create + edit` (plus close-button follow-up)
- **User mode:** interactive during the day, occasionally authorizes autonomous overnight work. See `~/.claude/projects/-Users-hari7aran-Desktop-caltrack-autopilot-test/memory/session_mode_overnight.md`.
- **Read-before-edit hook:** this project has an aggressive PreToolUse hook that flags edits to files not read-in-session. It's noisy but edits still succeed. Just re-read and retry if needed.

## Load-bearing decisions (detail in DECISIONS.md)

- **D-14** — multi-user with Supabase auth + RLS. Real user IDs, login screen, cross-device sync. This supersedes the overnight single-user decisions.
- **D-16** — food library is the primary log path, quick-add is secondary.
- **D-17** — hybrid stepper with tap-to-type for serving input.
- **D-20** — F-20 bullshit detector is a real feature: compares claimed kcal vs implied (4P/4C/9F). Tolerance `max(25 kcal, 15%)`. Phase 13.
- **D-21** — History tab becomes a calendar grid in Phase 18 (rewrite, not addition).
- **D-22** — brand voice is "dry with light personality." Phase 19 does a copy pass.
- **N-11** — runtime sim verification is MANDATORY before marking any phase done. Type-check + tests + lint is necessary but not sufficient. This rule exists because of the zustand selector infinite-loop bug fixed in `790c691` — it passed all static checks but crashed at first boot.

## v1 phase progress (shipped)

- [x] Phase 0 — Setup & exploration (`019df60`)
- [x] Phase 1 — Data model + persisted store (`e100950`)
- [x] Phase 2 — Food logging UI (`c6f5735`)
- [x] Phase 3 — Today screen (`952298a`)
- [x] Phase 4 — History screen (`2a6e6e6`)
- [x] Phase 5 — Profile screen (`07dccb5`)
- [x] Phase 6 — Verification + MORNING_SUMMARY.md (`caf6e96`)
- [x] Runtime bugfix — store selectors (`790c691`)

## v2 phase progress

- [x] Phase 7 — Supabase schema + RLS (`7032acc`, migrations `20260413000000` + `20260413000100`)
- [x] Phase 8 — Supabase client + env plumbing (`23b6734`)
- [x] Phase 9 — Auth flow + session-gated routing (`49a32c6`, runtime-verified 2026-04-13)
- [x] Phase 10 — Store refactor to Supabase-backed (`c3c419d`, runtime-verified 2026-04-13)
- [x] Phase 11 — Foods table CRUD + library UI (`9bb1b8f`, runtime-verified 2026-04-13)
- [ ] **Phase 11.5 — Nutritionix Track API client (D-24)** ← YOU ARE HERE
- [ ] Phase 12 — Food-first logging flow with stepper (wires Nutritionix)
- [ ] Phase 13 — Bullshit detector (F-20)
- [ ] Phase 14 — Edit entries in place
- [ ] Phase 15 — Weight tracking + trend chart
- [ ] Phase 16 — Meal planning
- [ ] Phase 17 — Barcode scanning
- [ ] Phase 18 — Calendar grid History
- [ ] Phase 19 — Brand voice copy pass
- [ ] Phase 20 — v2 verification + MORNING_SUMMARY_v2.md

## Health

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ clean (end of Phase 11) |
| `npx jest` | ✅ 128/128 passing (end of Phase 11) |
| `npx expo lint` | ✅ 0 errors, 0 warnings |
| `lib/` coverage | ✅ (not re-measured this session — rerun `jest --coverage` if needed) |
| Supabase MCP | ✅ connected, 20 tools available |
| Supabase schema | ✅ 5 tables + 1 view + RLS on all, 0 rows |
| Supabase security advisors | ✅ 0 warnings |
| Supabase performance advisors | ✅ 0 fixable (7 unused-index INFOs expected on empty DB) |

## Blockers

None.
