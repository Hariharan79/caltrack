# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟢 Next action — Phase 10: Store refactor to Supabase-backed

Phase 9 shipped as `49a32c6`. User verified the full auth flow in iOS sim on 2026-04-13: sign-up (with real email, Supabase had Confirm email on — user liked keeping it), redirect to tabs, sign out, sign in, kill/reopen app — session persists.

Important context carried forward from Phase 9:
- Supabase project has **email confirmation ON**. User explicitly liked this. Don't disable it.
- User is running the app in **Expo Go** on iPhone 17 Pro sim (not a dev client). Cmd-R doesn't work for reloads; test by killing and reopening the app.
- `supabase.auth.signUp` already works; `profiles` row is auto-created by the Phase 7 trigger.
- Sign-out button lives in Profile tab, replacing the old "Reset all data" button. `clearAll` store action is still defined in `lib/store.ts` but has no UI caller — it'll become the per-user Supabase wipe later.

Phase 10 outline (refer to ROADMAP.md for full scope):
1. **Replace zustand-persist AsyncStorage adapter** with Supabase-queried state. AsyncStorage becomes an offline read cache only.
2. **`hydrate()` action** — called on auth state change (from `useSession` effect), loads `goals` + today's `log_entries` from Supabase for the current user.
3. **Async store actions** — `addEntry`, `deleteEntry`, `updateGoals` all become async and await Supabase writes before updating local state. Rollback on failure.
4. **v1 → v2 migration helper** — on first boot of v2 for a user who already has local AsyncStorage v1 data, upload those entries to Supabase then clear the local store. One-shot.
5. **Tests** — store actions against a mocked Supabase client (reuse the mock style from `__tests__/hooks/useSession.test.ts`); hydration; migration path happy + empty + conflict.
6. **Runtime verification (N-11):** log an entry on the sim, refresh the app, entry still there. Then delete it. Then log on Supabase dashboard directly and see it appear after reload. User ping expected.

Known gotchas:
- **RLS silence**: queries without an active session return zero rows, not an error. If something "doesn't work" in Phase 10, first check the session exists before debugging data logic.
- **Race on auth change**: don't hydrate before `useSession` resolves — wait for `loading=false` and a non-null `session`.
- **day_key vs logged_at**: schema uses `day_key` (YYYY-MM-DD local string) for bucketing. The existing `lib/date.ts` already produces this format (D-04). Use it.
- **Store currently uses zustand-persist middleware**. Removing the middleware changes the shape of the default export — update all imports and `__tests__/lib/store.test.ts` accordingly.

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
- [ ] **Phase 10 — Store refactor to Supabase-backed** ← YOU ARE HERE
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
| `npx tsc --noEmit` | ✅ clean (end of Phase 9) |
| `npx jest` | ✅ 98/98 passing (end of Phase 9) |
| `npx expo lint` | ✅ 0 errors, 0 warnings |
| `lib/` coverage | ✅ 100% statements / 94% branches |
| Supabase MCP | ✅ connected, 20 tools available |
| Supabase schema | ✅ 5 tables + 1 view + RLS on all, 0 rows |
| Supabase security advisors | ✅ 0 warnings |
| Supabase performance advisors | ✅ 0 fixable (7 unused-index INFOs expected on empty DB) |

## Blockers

None.
