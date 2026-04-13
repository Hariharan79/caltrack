# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23), then `ROADMAP.md`, then `git log --oneline -8`. That's enough to resume without asking the user anything.

---

## 🟢 Next action — Phase 8: Supabase client + env plumbing

Everything for Phase 8 is set up and unblocked. Exact steps:

1. **Fetch the anon key.** Call `mcp__supabase__get_publishable_keys()` (Supabase MCP is already configured in this repo; if the tool isn't showing, run `/reload-plugins`).
2. **Write `.env.example`** — committed to git, placeholder values only:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://gjzonxmvfaokjpgfykrn.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. **Write `.env`** — gitignored (already in `.gitignore`), real values from step 1.
4. **Install the client:** `npx expo install @supabase/supabase-js`
5. **Generate DB types:** `mcp__supabase__generate_typescript_types()` → write output to `types/db.ts`
6. **Write `lib/supabase.ts`** — a singleton client that:
   - Reads URL + anon key from `process.env.EXPO_PUBLIC_*`
   - Throws on startup if either is missing (per N-12: fail fast, don't silently misbehave)
   - Uses `AsyncStorage` as the auth session store (already installed, v2.2.0)
   - Sets `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false` (the last is key for React Native — no URL handling)
7. **Commit** as `feat(supabase): client + env plumbing + generated types`. Conventional message format.

**Verification before marking Phase 8 done (per N-11):**
- `npx tsc --noEmit` clean
- `npx jest` 87+ passing (no existing test should break)
- Boot the simulator: `npx expo start --ios` — app should start normally. Metro should not complain about missing env vars. No runtime errors about the supabase client.

**Known gotchas for Phase 8:**
- Don't put the service role key anywhere. Only the anon key. (N-12)
- `detectSessionInUrl` must be false for React Native.
- The session persistence + AsyncStorage wiring is a common source of "stays logged out on reload" bugs. Double-check after booting.

After Phase 8 → next up is Phase 9 (auth screens + session-gated routing). See ROADMAP.md.

---

## Project facts the user won't repeat

- **Repo:** `/Users/hari7aran/Desktop/caltrack-autopilot-test`
- **Supabase project:** `gjzonxmvfaokjpgfykrn.supabase.co` (MCP connected)
- **Branch:** `main` (all work lives here; no feature branches this project)
- **Last commit:** `7032acc` — `feat(db): phase 7 — supabase schema with RLS, triggers, view`
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
- [ ] **Phase 8 — Supabase client + env plumbing** ← YOU ARE HERE
- [ ] Phase 9 — Auth flow + session-gated routing
- [ ] Phase 10 — Store refactor to Supabase-backed
- [ ] Phase 11 — Foods table CRUD + library UI
- [ ] Phase 12 — Food-first logging flow with stepper
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
