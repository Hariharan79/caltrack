# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟡 Next action — runtime-verify Phase 10, then Phase 11

Phase 10 code shipped in this session on 2026-04-13. Static checks all green (tsc clean, 110/110 jest, expo lint 0/0). **Runtime verification (N-11) still pending** — user ping required before marking complete.

What changed in Phase 10:
- `lib/store.ts` — removed zustand-persist middleware; all actions now round-trip through Supabase before updating local state. New state fields: `hydrated`, `hydrating`, `error`. New actions: `hydrate(userId)` and `reset()`. `addEntry`/`removeEntry`/`updateGoals` are now async and throw on error (no local state change until Supabase write succeeds).
- `updateGoals` inserts a new log-style row in the `goals` table (preserves history — D-14 alignment with schema).
- `hydrate()` loads current goals (`order set_at desc limit 1`) + all `log_entries` for the user. Runs on session-resolve from `app/_layout.tsx`. Sign-out triggers `reset()`.
- `lib/migrateLocal.ts` — one-shot v1→v2 AsyncStorage uploader. Reads the legacy `caltrack-store` JSON blob, normalizes entries, bulk-inserts into `log_entries`, then sets `caltrack-v2-migrated=true`. Safe on empty/malformed/already-done. Surfaces errors but does NOT mark done so it'll retry next boot.
- `app/(tabs)/index.tsx` + `profile.tsx` — async handlers, `Alert.alert` on failure, `loading` prop on the Save goals button.
- `jest.setup.js` — stubs `EXPO_PUBLIC_SUPABASE_*` env vars so test suites that transitively import `lib/supabase.ts` don't blow up at import time.

**Runtime script for the sim (user walks through these):**
1. App already signed in from Phase 9. Open Today — should be empty (fresh Supabase data for this account). If there's stale local data from earlier v1 runs, it should be uploaded by the migration helper on first boot.
2. Tap + → log a meal → save. Entry should appear in Today.
3. Kill + reopen app (or sign out / sign in). Entry should still appear (it's in Supabase now, not AsyncStorage).
4. Go to Profile → change calorie goal → Save → should show "Goals saved". Reopen app → goal persists.
5. Delete an entry from Today (swipe or tap). Reopen → still gone.
6. On the Supabase dashboard, manually insert a `log_entries` row for your user_id → reload the app → should appear in Today. (This proves hydrate pulls fresh data.)
7. Sign out → data should disappear from the tabs (reset called). Sign back in → data reappears.

If any step fails, likely culprits:
- **RLS silence**: queries without an active session return zero rows, not an error. `useAppStore.getState().error` should surface anything the supabase client did return.
- **Hydration race**: the `_layout.tsx` effect runs migration → hydrate sequentially; if hydrate fires before the session token is on the client, it'll look like empty data. Check `hydrated` flag.
- **Missing migration commit**: if a legacy v1 entry appears after sign-in, the migration worked; if not and there was local v1 data, `caltrack-v2-migrated` may have been set prematurely.

Once verified, move to Phase 11 (Foods table CRUD + library UI). The store now has a clean pattern for Supabase-backed async actions — reuse it for `addFood`/`updateFood`/`deleteFood`.

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
- [~] **Phase 10 — Store refactor to Supabase-backed** (code shipped 2026-04-13, runtime verification pending) ← YOU ARE HERE
- [ ] Phase 11 — Foods table CRUD + library UI
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
