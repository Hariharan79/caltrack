# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟢 Next action — Phase 15: Weight tracking + trend chart

Phase 11 shipped + runtime-verified on 2026-04-13 (`9bb1b8f` / `293a746` / `f5c873a`). **Phase 11.5 is parked** because Nutritionix pulled their free tier — user applied for a FatSecret key instead. See **D-25** for the new API plan; Phase 11.5 resumes when the key arrives (user will raise the topic).

### Why Phase 15 next (not 11.5 / 12 / 13)

Phase 15 is the one in-progress leaf that only depends on Phase 10 (✅ done) and has zero coupling to the food-library / Nutritionix chain that's currently blocked. It's also self-contained: new table already exists (`public.weight_entries` from Phase 7), no new deps (`react-native-svg` ships with Expo), no existing feature rewrites. High ship confidence in one session.

Pulled forward from Phase 15's ROADMAP entry:
- Store additions: `weightEntries: WeightEntry[]` state + `addWeight(input)` / `removeWeight(id)` async actions + `weightHistory` selector (most recent first). Load in `hydrate()` alongside entries/goals/foods.
- Type: `WeightEntry` in `types/index.ts` — camelCase mirror of `public.weight_entries` row. Fields: `id`, `weightKg`, `bodyFatPct` (nullable), `loggedAt`, `dayKey`.
- `lib/weight.ts` — validation helper like `lib/foodForm.ts`. Weight > 0, body fat % in [0, 100] or null.
- `components/WeightLogSheet.tsx` — modal sheet for logging kg + optional body-fat %. Pattern: copy `AddMealSheet.tsx` structure.
- `components/WeightChart.tsx` — minimal SVG line chart using `react-native-svg` (already in deps — verify with `grep react-native-svg package.json`). No new package. Simple line + dots, auto-ranged Y axis. Graceful empty state when < 2 entries.
- Entry point: new section on **Profile tab** above the Food library button. Shows latest weight + "Log weight" button that opens the sheet.
- Tests: weight store actions against the mocked-Supabase pattern in `__tests__/lib/store.test.ts`; `lib/weight.ts` validation; `WeightChart` renders with sample data (empty, 1 point, many points).
- **Runtime verification (N-11):** log 3 weights over simulated dates → see trend chart render → kill/reopen app → data persists → delete one → persists. Use Supabase MCP to pre-seed multi-day data if you need a wider chart range to look at.
- Commit: `feat(weight): log body weight and render trend chart`

### Unblocks

Phase 15 done → Phase 16 (meal planning) becomes reachable and only waits on Phase 12 for its own dependency. Phase 18 (calendar history) is also unblocked but independent.

### Known gotchas (carry forward, read before touching anything)

- **Metro restart + Expo Go bridge bug** — before (or between) any `npx expo start` invocation, run: `xcrun simctl terminate 9C4876FA-93CE-4EC1-B705-8F06C5A2E72E host.exp.Exponent` (UUID is this project's iPhone 17 Pro sim; may change on reset — find it with `xcrun simctl list devices booted`). Symptom if skipped: `NativeModule: AsyncStorage is null` on import of `lib/supabase.ts`. It's never a code bug.
- **expo-router typed routes** are on. Adding a new file-based route (new folder under `app/`) leaves `.expo/types/router.d.ts` stale, so `npx tsc --noEmit` rejects `router.push('/newroute')` with a huge union-type error. Fix: start Metro once in bg with `npx expo start --no-dev --minify`, watch `.expo/types/router.d.ts` mtime change, then kill Metro. Rerun tsc.
- **Supabase `.update(payload)`** rejects `Record<string, unknown>` — it wants `TablesUpdate<'tablename'>` from `types/db`. Build typed patches (see `updateFood` in `lib/store.ts:230`).
- **Modal nested-Stack dismiss** — the inner Stack's root screen has no back affordance. Any `app/<group>/index.tsx` presented as a modal needs an explicit `headerLeft` Close button that calls `router.back()` (see `app/foods/index.tsx:18`).
- **RLS silence**: queries without an active session return zero rows, not an error. Check `useAppStore.getState().error` first when data is missing.
- **day_key vs logged_at**: schema uses `day_key` (YYYY-MM-DD local) for bucketing. `lib/date.ts` already produces this.
- **`TablesUpdate<'foods'>` import** — when adding typed update payloads, pull from `../types/db` not `@/types` (different files; the former is the Supabase-generated db types, the latter is the hand-written app types).
- **Test supabase mocking pattern** — the chainable mock in `__tests__/lib/store.test.ts` uses a thenable `builder.then` so both `.single()` and bare `await supabase.from(...).select().eq(...)` both drain from the same `state.queue`. When adding a new test, enqueue results in the exact order the store will consume them. Also enqueue for the hydrate() parallel reads in goals / entries / foods / weight_entries order.

---

## Project facts the user won't repeat

- **Repo:** `/Users/hari7aran/Desktop/caltrack-autopilot-test`
- **Supabase project:** `gjzonxmvfaokjpgfykrn.supabase.co` (MCP connected)
- **Branch:** `main` (all work lives here; no feature branches this project)
- **Last commit:** `f5c873a` — `docs(state): phase 11 verified — next up phase 11.5 nutritionix` (followed by a D-25 commit that swaps Nutritionix for FatSecret and re-routes to Phase 15 next)
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
- [ ] Phase 12 — Food-first logging flow with stepper (wires FatSecret)
- [ ] Phase 13 — Bullshit detector (F-20)
- [ ] Phase 14 — Edit entries in place
- [ ] **Phase 15 — Weight tracking + trend chart** ← YOU ARE HERE (pulled forward because 11.5 is blocked)
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
