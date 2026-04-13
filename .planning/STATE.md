# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟢 Next action — Phase 11: Foods table CRUD + library UI

Phase 10 shipped as `c3c419d` and was runtime-verified on 2026-04-13 in iOS sim. User walked through: log a meal → kill/reopen → persists; delete → persists; change calorie goal → persists; SQL-inserted row on the server appears on reload. Store is now Supabase-backed, all actions async, hydration + sign-out-reset wired into `app/_layout.tsx`, v1→v2 AsyncStorage migration helper in place.

One gotcha surfaced during runtime verification:
- **Expo Go + Metro restart** breaks the AsyncStorage native bridge (`NativeModule: AsyncStorage is null` on import). Symptom: on fresh `expo start`, sign-in screen errors immediately. Fix: `xcrun simctl terminate <sim-uuid> host.exp.Exponent` then `xcrun simctl openurl <sim-uuid> exp://127.0.0.1:8081`. Sim UUID for this project's iPhone 17 Pro is `9C4876FA-93CE-4EC1-B705-8F06C5A2E72E` (may change on sim reset). Just killing + reopening Expo Go on the sim also works. Don't debug in code — it's a Metro/Expo Go bridge refresh issue, not a real bug.

What Phase 10 added (context for Phase 11):
- `lib/store.ts` — all store actions round-trip through Supabase first; new `hydrate(userId)` + `reset()` + `hydrated`/`hydrating`/`error` fields. `updateGoals` inserts a log-style row (D-14 schema — goals are history, current goal is `ORDER BY set_at DESC LIMIT 1`).
- `lib/migrateLocal.ts` — one-shot v1→v2 AsyncStorage uploader, idempotent.
- `app/_layout.tsx` — on session-resolve runs migration then hydrate; on sign-out calls reset. All happens inside `SessionGate`.
- `jest.setup.js` — stubs `EXPO_PUBLIC_SUPABASE_*` so test suites that transitively import `lib/supabase.ts` don't blow up. Any new test that imports through `lib/*` inherits this automatically.
- `app/(tabs)/index.tsx` + `profile.tsx` — async handlers with `Alert.alert` on failure, `loading` prop on Save goals button.

Phase 11 plan (from ROADMAP.md):
- Modal route `app/foods/` with list + create + edit screens. Use `expo-router` group navigation — similar pattern to `(auth)/`.
- Components: `components/FoodRow.tsx`, `components/FoodForm.tsx`.
- Store additions: `foods` slice with `addFood`/`updateFood`/`deleteFood`/`searchFoods(query)`. Re-use the async-Supabase pattern from Phase 10 (throw-on-error, update local after server confirms). Add `foods: Food[]` to `AppState` and load in `hydrate()`.
- New type: `Food` in `types/index.ts` mapping to the `foods` table row (user-scoped, RLS on). Convert snake_case columns to camelCase the same way `rowToEntry` does in Phase 10.
- UI surface: new section on Today or Profile that links to the library? Check ROADMAP — Phase 12 is when it's wired into logging; Phase 11 is just the library screen itself. For Phase 11, add an entry point on the Profile tab or a new tab — revisit.
- **Runtime verification (N-11):** create 3 foods, edit one, delete one, confirm they round-trip to Supabase via MCP `execute_sql`.

Known gotchas carrying forward:
- **RLS silence**: queries without an active session return zero rows, not an error. Check `useAppStore.getState().error`.
- **day_key vs logged_at**: schema uses `day_key` (YYYY-MM-DD local) for bucketing. `lib/date.ts` already produces this.
- **Metro restart bridge bug**: see above. Always terminate + reopen Expo Go when switching Metro sessions.

---

## Project facts the user won't repeat

- **Repo:** `/Users/hari7aran/Desktop/caltrack-autopilot-test`
- **Supabase project:** `gjzonxmvfaokjpgfykrn.supabase.co` (MCP connected)
- **Branch:** `main` (all work lives here; no feature branches this project)
- **Last commit:** `49a32c6` — `feat(auth): phase 9 — sign-in, sign-up, session-gated routing`
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
- [ ] **Phase 11 — Foods table CRUD + library UI** ← YOU ARE HERE
- [ ] Phase 11.5 — Nutritionix Track API client (D-24)
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
| `npx tsc --noEmit` | ✅ clean (end of Phase 10 code) |
| `npx jest` | ✅ 110/110 passing (end of Phase 10 code) |
| `npx expo lint` | ✅ 0 errors, 0 warnings |
| `lib/` coverage | ✅ (not re-measured this session — rerun `jest --coverage` if needed) |
| Supabase MCP | ✅ connected, 20 tools available |
| Supabase schema | ✅ 5 tables + 1 view + RLS on all, 0 rows |
| Supabase security advisors | ✅ 0 warnings |
| Supabase performance advisors | ✅ 0 fixable (7 unused-index INFOs expected on empty DB) |

## Blockers

None.
