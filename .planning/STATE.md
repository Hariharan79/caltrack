# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟢 Next action — Phase 9: Auth flow + session-gated routing

Phase 8 shipped as `23b6734`. Supabase client is wired (`lib/supabase.ts`), env vars load, Metro bundles clean. Types generated at `types/db.ts`.

Phase 9 outline (refer to ROADMAP.md for full scope):
1. **Sign-in / sign-up screens** — email+password via `supabase.auth.signInWithPassword` / `signUp`. Dry error messages, no flash.
2. **Session state hook** — subscribe to `supabase.auth.onAuthStateChange`, expose `useSession()`.
3. **Session-gated routing** — expo-router group for `(auth)` vs `(tabs)`. Redirect unauthenticated users to sign-in, authenticated users away from auth group.
4. **Sign-out action** — wire from profile tab.
5. **Verification (N-11):** `tsc`, `jest`, and a real simulator boot — sign up a throwaway user, confirm profile row is auto-created (trigger from Phase 7), sign out, sign back in, kill/reload app, session persists.

Known gotchas:
- `profiles` row is auto-created by the `handle_new_user()` trigger — don't insert manually, just read.
- RLS is on every table, so every query needs an authenticated session or it returns zero rows silently. Good: exposes auth bugs fast. Bad: easy to misdiagnose as a data issue.

---

## Project facts the user won't repeat

- **Repo:** `/Users/hari7aran/Desktop/caltrack-autopilot-test`
- **Supabase project:** `gjzonxmvfaokjpgfykrn.supabase.co` (MCP connected)
- **Branch:** `main` (all work lives here; no feature branches this project)
- **Last commit:** `23b6734` — `feat(supabase): phase 8 — client + env plumbing + generated types`
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
- [ ] **Phase 9 — Auth flow + session-gated routing** ← YOU ARE HERE
- [ ] Phase 10 — Store refactor to Supabase-backed
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
| `npx tsc --noEmit` | ✅ clean (last checked end of v1) |
| `npx jest` | ✅ 87/87 passing (last checked end of v1) |
| `npx expo lint` | ✅ 0 errors, 0 warnings |
| `lib/` coverage | ✅ 100% statements / 94% branches |
| Supabase MCP | ✅ connected, 20 tools available |
| Supabase schema | ✅ 5 tables + 1 view + RLS on all, 0 rows |
| Supabase security advisors | ✅ 0 warnings |
| Supabase performance advisors | ✅ 0 fixable (7 unused-index INFOs expected on empty DB) |

## Blockers

None.
