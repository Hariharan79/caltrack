# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟢 Next action — Phase 13: Bullshit detector (F-20)

Phase 18 shipped + runtime-verified on 2026-04-13 (`c7e7575`). 10 days of April entries pre-seeded via Supabase MCP covering under/hit/over states, user confirmed grid + dots + sheet + month nav all work. 169/169 tests, tsc + lint clean.

**Phase 11.5 remains parked** on the FatSecret API key. After folding Phase 17 into the FatSecret chain (see **D-26** — barcode uses `food.find_id_for_barcode`, not Open Food Facts), the dependency graph now looks like:

- Blocked on 11.5: Phase 12, 14, 16, 17
- Unblocked leaves: **Phase 13** (depends on 11 ✅), Phase 19 (brand voice copy pass — better done last, after 12/13/14/16/17 so it covers all surfaces)

Phase 13 is the only unblocked substantive phase. Spec per ROADMAP:

- `lib/nutrition.ts` — pure module:
  - `kcalFromMacros({proteinG, carbsG, fatG})` — 4P + 4C + 9F
  - `checkMacroSanity({calories, proteinG, carbsG, fatG})` → `{ok: boolean, severity: 'ok' | 'mild' | 'blatant', impliedKcal: number, deltaKcal: number}`
  - Tolerance: `max(25 kcal, 15% of claimed)`. Severity ratios — decide in tests.
- Inline warning UI: surface a short dry note on `FoodForm` when `checkMacroSanity` is not `ok` (D-22 voice applies — "These macros don't add up" or similar)
- ⚠ badge on `EntryRow` for entries derived from foods flagged `blatant`
- Tests: ≥ 15 unit tests covering null macros, fractional values, high-fiber edge cases, zero-cal/zero-macro, exactly at tolerance, just over, etc.
- **Runtime verification (N-11):** edit/create a food with mismatched macros → see the warning → save anyway → see the ⚠ badge appear on the log row
- **Commit:** `feat(nutrition): macro-vs-calories bullshit detector`

### Why this shape

- Phase 13 touches `FoodForm` and `EntryRow` — both already exist and are stable. No new routes, no migrations, no deps.
- The pure `lib/nutrition.ts` is easy to TDD. Most of the work is test coverage.
- Once 13 is done, the only remaining unblocked work is Phase 19 (copy pass), which should wait until 11.5 unblocks the rest of the chain so the copy pass covers everything at once.

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

---

## Project facts the user won't repeat

- **Repo:** `/Users/hari7aran/Desktop/caltrack-autopilot-test`
- **Supabase project:** `gjzonxmvfaokjpgfykrn.supabase.co` (MCP connected)
- **Branch:** `main` (all work lives here; no feature branches this project)
- **Last commit:** `c7e7575` — `feat(history): calendar grid with day detail sheet`
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
- [ ] Phase 11.5 — FatSecret API client (**D-25 supersedes D-24** — parked on user credentials)
- [ ] Phase 12 — Food-first logging flow with stepper (blocked: depends on 11.5)
- [ ] **Phase 13 — Bullshit detector (F-20)** ← YOU ARE HERE (depends on 11 ✅, only unblocked substantive leaf)
- [ ] Phase 14 — Edit entries in place (blocked: depends on 12 → 11.5)
- [x] Phase 15 — Weight tracking + trend chart (`7fd7795`, runtime-verified 2026-04-13)
- [ ] Phase 16 — Meal planning (blocked: depends on 12 → 11.5)
- [ ] Phase 17 — Barcode scanning (blocked: re-routed through FatSecret per **D-26**, so now depends on 11.5)
- [x] Phase 18 — Calendar grid History (`c7e7575`, runtime-verified 2026-04-13)
- [ ] Phase 19 — Brand voice copy pass
- [ ] Phase 20 — v2 verification + MORNING_SUMMARY_v2.md

## Health

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ clean (end of Phase 18) |
| `npx jest` | ✅ 169/169 passing (end of Phase 18; +18 new from `lib/calendar.test.ts`) |
| `npx expo lint` | ✅ 0 errors, 0 warnings |
| `lib/` coverage | ✅ (not re-measured this session — rerun `jest --coverage` if needed) |
| Supabase MCP | ✅ connected, 20 tools available |
| Supabase schema | ✅ 5 tables + 1 view + RLS on all, 0 rows |
| Supabase security advisors | ✅ 0 warnings |
| Supabase performance advisors | ✅ 0 fixable (7 unused-index INFOs expected on empty DB) |

## Blockers

None.
