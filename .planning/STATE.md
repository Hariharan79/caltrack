# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟢 Next action — Phase 13 (bullshit detector, F-20) or Phase 17 (barcode scan)

Phase 12 verified end-to-end on 2026-04-14 after a JWT-algorithm triage that produced **D-28** (see DECISIONS.md). `food-lookup` now ships with `verify_jwt:false` because the project's auth mints ES256 user tokens while the function gateway's JWT verification is still pinned to HS256 and 401s every real user token. `lib/foodLookup.ts` also switched from `supabase.functions.invoke` to raw `fetch` for deterministic header handling. 229/229 jest, tsc + lint clean.

### Confirmed working (2026-04-14)

Searched `doritos` in the log sheet → USDA section populated → tapped a Doritos result → set servings → saved. DB now has:

- `public.foods` row: `Doritos — .75OZ DORITOS NACHO`, `source='usda'`, `source_id='1459860'`, `kcal_per_serving=425`.
- `public.log_entries` row: 1 serving, 425 kcal, `food_id` pointing at the new USDA food.

All four Phase 12 runtime checks now pass: (1) stepper save 0.5/2.5, (2) USDA upsert into foods, (3) recents list, (4) Quick add regression clean.

### Pick next

- **Phase 13** (F-20 bullshit detector) — independently unblocked since Phase 11. Pure lib + UI work, no new edge function, no new migration. Probably 1–2 sessions.
- **Phase 17** (barcode scan) — needs `expo-camera` install. One-screen feature. Feeds directly into the Phase 12 pre-fill UX we just verified, so it's the natural follow-up if you want to close out the food-lookup surface area in one arc.

Phase 14 (edit entries in place) and Phase 16 (meal planning) are still blocked on Phase 12 dependencies being stable — they are now unblocked, but lower priority than 13/17.

### Known gotchas (carry forward, read before touching anything)

- **Metro restart + Expo Go bridge bug** — before (or between) any `npx expo start` invocation, run: `xcrun simctl terminate 9C4876FA-93CE-4EC1-B705-8F06C5A2E72E host.exp.Exponent` (UUID is this project's iPhone 17 Pro sim; may change on reset — find it with `xcrun simctl list devices booted`). Symptom if skipped: `NativeModule: AsyncStorage is null` on import of `lib/supabase.ts`. It's never a code bug.
- **expo-router typed routes** are on. Adding a new file-based route (new folder under `app/`) leaves `.expo/types/router.d.ts` stale, so `npx tsc --noEmit` rejects `router.push('/newroute')` with a huge union-type error. Fix: start Metro once in bg with `npx expo start --no-dev --minify`, watch `.expo/types/router.d.ts` mtime change, then kill Metro. Rerun tsc.
- **Supabase `.update(payload)`** rejects `Record<string, unknown>` — it wants `TablesUpdate<'tablename'>` from `types/db`. Build typed patches (see `updateFood` in `lib/store.ts:230`).
- **Modal nested-Stack dismiss** — the inner Stack's root screen has no back affordance. Any `app/<group>/index.tsx` presented as a modal needs an explicit `headerLeft` Close button that calls `router.back()` (see `app/foods/index.tsx:18`).
- **RLS silence**: queries without an active session return zero rows, not an error. Check `useAppStore.getState().error` first when data is missing.
- **day_key vs logged_at**: schema uses `day_key` (YYYY-MM-DD local) for bucketing. `lib/date.ts` already produces this.
- **`TablesUpdate<'foods'>` import** — when adding typed update payloads, pull from `../types/db` not `@/types` (different files; the former is the Supabase-generated db types, the latter is the hand-written app types).
- **Test supabase mocking pattern** — the chainable mock in `__tests__/lib/store.test.ts` uses a thenable `builder.then` so both `.single()` and bare `await supabase.from(...).select().eq(...)` both drain from the same `state.queue`. When adding a new test, enqueue results in the exact order the store will consume them. `hydrate()` now reads **goals / entries / foods / weight_entries** in that order — enqueue four responses (existing 2-response hydrate tests still pass because the mock falls back to `{ data: null, error: null }`, which maps safely to `[]`).
- **`react-native-svg` was NOT pre-installed** despite the ROADMAP claiming "ships with Expo" — I installed it via `npx expo install react-native-svg` during Phase 15. Already whitelisted in `jest.config.js` transformIgnorePatterns, so component tests Just Work.
- **Chart width** — `WeightChart` takes an explicit `width` prop because `<Svg>` needs numeric width. `profile.tsx` uses `onLayout` on the card to capture the available width, stored in state, and only renders the chart once width > 0.
- **Don't import from `lib/store.ts` in pure utility modules** — `lib/store.ts` transitively imports `@react-native-async-storage/async-storage` via `lib/supabase.ts`, which fails in Jest without the `store.test.ts`-style manual `jest.mock('@/lib/supabase', ...)`. Phase 18's `lib/calendar.ts` originally called `store.computeDailyTotals` and blew up at test time; the fix was to inline the aggregation in `buildTotalsByDay`. Rule of thumb: pure utility modules should only import from `lib/date.ts` or other pure helpers, never from `store.ts` / `supabase.ts` / `auth.ts`.
- **Edge function deploy is single-file inlined** — `mcp__supabase__deploy_edge_function` accepts multiple files but Deno's relative TypeScript imports in the deploy bundle don't always resolve cleanly across folders. Workaround used in Phase 11.5: keep source files split for editing (`supabase/functions/food-lookup/index.ts`, `_shared/cors.ts`, `lib/foodNormalizers.ts`) but pass a single inlined string to the deploy tool. After editing any of the split files, re-bundle by hand. tsconfig.json + eslint.config.js exclude `supabase/functions/**` so the Deno-only code doesn't get type-checked or linted by the Node toolchain.
- **`food-lookup` is `verify_jwt:false` and `lib/foodLookup.ts` uses raw `fetch`** — not `supabase.functions.invoke`. This is because the project's auth mints ES256 user tokens but the edge-function gateway rejects them as `Invalid JWT` (it only accepts HS256-signed anon keys). See **D-28** for the full triage. `lib/foodLookup.ts` still attaches `Authorization: Bearer <user_jwt>` and `apikey: <anon>` headers on every request — the function ignores them today, but the day Supabase fixes ES256 gateway verification we can flip `verify_jwt:true` on redeploy without touching client code. Do NOT revert to `supabase.functions.invoke`; the FunctionsClient's per-invoke header merging added debugging friction with zero upside.
- **AppState ↔ `supabase.auth.startAutoRefresh()` wiring is required in RN** — without it the JS runtime pauses while the app is backgrounded and the auto-refresh timer drifts, so tokens silently expire even while the app appears active. `lib/supabase.ts` now wires this. Don't drop it.
- **USDA `dataType` matters for parsing** — Branded foods report nutrition in `labelNutrients` (per serving), while Foundation / SR Legacy use `foodNutrients` (per 100g). `lib/foodNormalizers.ts` `normalizeUsda` branches on this. When extending: never assume a single field path works for both.

---

## Project facts the user won't repeat

- **Repo:** `/Users/hari7aran/Desktop/caltrack-autopilot-test`
- **Supabase project:** `gjzonxmvfaokjpgfykrn.supabase.co` (MCP connected)
- **Branch:** `main` (all work lives here; no feature branches this project)
- **Last commit:** `386d4ef` — `fix(auth): attach bearer to functions.invoke and wire appstate auto-refresh`
- **Edge function `food-lookup`** is deployed (version 1, JWT verification on). To redeploy after editing source files: re-bundle the inlined contents of `supabase/functions/food-lookup/index.ts` + `_shared/cors.ts` + `lib/foodNormalizers.ts` into a single string and call `mcp__supabase__deploy_edge_function` with `name: 'food-lookup'`. The split source files exist for editing/testing; the deployed bundle is one file to dodge cross-directory import resolution in the Edge runtime.
- **Supabase secrets** has `USDA_FDC_API_KEY` set (project dashboard → Edge Functions → Secrets). Don't put it in `.env`. Function fails with a clear 500 if it's missing.
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
- [x] Phase 11.5 — Food-lookup edge function (USDA + OFF) (`abe7d16`, smoke-tested 2026-04-13, see **D-27**)
- [x] Phase 12 — Food-first logging flow with stepper (`fbb2921` + `386d4ef` auth fix + D-28 verify_jwt:false redeploy, fully runtime-verified 2026-04-14)
- [ ] Phase 13 — Bullshit detector (F-20) (independently unblocked since Phase 11)
- [ ] Phase 14 — Edit entries in place (blocked: depends on 12)
- [x] Phase 15 — Weight tracking + trend chart (`7fd7795`, runtime-verified 2026-04-13)
- [ ] Phase 16 — Meal planning (blocked: depends on 12)
- [ ] Phase 17 — Barcode scanning (unblocked — depends only on `lib/foodLookup.ts` ✅ + `expo-camera` install)
- [x] Phase 18 — Calendar grid History (`c7e7575`, runtime-verified 2026-04-13)
- [ ] Phase 19 — Brand voice copy pass
- [ ] Phase 20 — v2 verification + MORNING_SUMMARY_v2.md

## Health

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ clean (end of Phase 12 verification) |
| `npx jest` | ✅ 229/229 passing (foodLookup suite rewritten to mock `fetch` instead of `functions.invoke`, +4 session-refresh tests) |
| `npx expo lint` | ✅ 0 errors, 0 warnings |
| `food-lookup` edge function | ✅ deployed v3 with `verify_jwt:false` (D-28). USDA text search + OFF barcode lookup verified end-to-end live 2026-04-14. |
| `lib/` coverage | ✅ (not re-measured this session — rerun `jest --coverage` if needed) |
| Supabase MCP | ✅ connected, 20 tools available |
| Supabase schema | ✅ 5 tables + 1 view + RLS on all, foods has 2 manual rows from sim testing |
| Supabase security advisors | not re-checked since Phase 11.5 — rerun after Phase 12 verified |
| Supabase performance advisors | not re-checked since Phase 11.5 |

## Blockers

None.
