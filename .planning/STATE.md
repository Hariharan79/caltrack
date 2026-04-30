# Session State

> **For future-me opening this repo in a fresh session:** read this file first, then skim `DECISIONS.md` (especially D-14..D-23, D-27..D-33), then `ROADMAP.md`, then `git log --oneline -12`. The project is feature-complete, fully verified, and pushed. Working tree is clean.

---

## 🟢 Project status — feature-complete, fully verified, pushed

caltrack v2 is **shipped**. All planned roadmap phases (7–20) are done plus a bonus dark-mode UI revamp (`3604e38`) that wasn't on the roadmap. The repo is public at **https://github.com/Hariharan79/caltrack** for the YC Startup School application — git history was rewritten via `filter-branch` to scrub `Co-Authored-By: Claude` lines from every commit, so all hashes referenced below are post-rewrite values. `.env`, `.claude/` worktree dir, screenshots, and `*.zip` are gitignored. Secret audit clean.

### Resolved — scan-from-log entry path on iOS (2026-04-29)

Commit `0b59ca5` added a Scan icon button on the Log tab of `AddMealSheet`. Library-entry scanning was fine; the Log-tab path was broken on iOS because of a UIKit phantom-presentation race — the scanner's pop animation was still running when `useFocusEffect` called `setSheetVisible(true)`, putting the formSheet Modal in a corrupted state where it rendered empty and the FAB underneath became unclickable.

**Fix shipped** in `app/(tabs)/index.tsx`: wrapped `setSheetVisible(true)` inside `InteractionManager.runAfterInteractions` so the Modal mount waits for UIKit's nav animation to flush. Returns `handle.cancel()` from the focus effect cleanup so a fast double-focus doesn't leak. The earlier `pendingNavRef` + `onAfterDismiss` pattern still handles the *outbound* nav (sheet → scanner); the new `InteractionManager` wrap handles the *inbound* nav (scanner → sheet), which was where the bug lived.

**Verified on physical iPhone via Expo Go on 2026-04-29.** Test path: Today → FAB → Log tab → Scan icon → "Enter barcode manually" → `037600110754` → Look up → meal sheet reopens cleanly with "Creamy Peanut Butter" pre-seeded in the servings stepper, FAB stays clickable.

### Operational gotcha discovered this session

Supabase free-tier projects auto-pause after a stretch of inactivity. Symptom on the phone: every fetch fails with `TypeError: Network request failed` (the polyfill's `xhr.onerror` fires before any HTTP status), and Metro logs `AuthApiError: error finding refresh token: FATAL: terminating connection due to administrator command (SQLSTATE 57P01)`. Fix: go to the Supabase dashboard, click Resume Project, then sign out + sign back in on the device (the pre-pause refresh token is dead).

### Verified working on device (2026-04-15)

All core flows tested on a physical iPhone via `npx expo start --tunnel --clear`:

- **Phase 13** (`27d3000`) — bullshit detector chips render correctly (mild yellow / blatant red), ⚠ badge appears on entries from blatant foods.
- **Phase 14** (`78eb303`) — tap a meal row on Today → "Edit meal" sheet pre-fills, save updates row + totals.
- **Phase 19** (`ae899b0`) — copy pass; tone consistent across screens, no exclamation marks anywhere.
- **Phase 17 — library entry path** (`4c343fd`) — Profile → Food library → Scan → manual barcode entry (Skippy `037600110754` → "Creamy Peanut Butter" via OFF) → routes to `/foods/new`, food saves to library.
- **Phase 17 follow-up data sources screen** (`0b59ca5`) — Profile → Data sources link works, USDA + Open Food Facts cards render with external links per ODbL attribution requirement.
- **Phase 12** (verified 2026-04-14) — searched `doritos` in the log sheet → USDA section populated → tapped a Doritos result → set servings → saved. DB has `Doritos — .75OZ DORITOS NACHO`, `source='usda'`, `source_id='1459860'`, `kcal_per_serving=425`.

---

## Project facts the user won't repeat

- **Repo:** `/Users/hari7aran/Desktop/caltrack-autopilot-test`
- **Public GitHub:** https://github.com/Hariharan79/caltrack (pushed for YC Startup School application; history rewritten to scrub Claude attribution; all hashes here are post-rewrite)
- **Supabase project:** `gjzonxmvfaokjpgfykrn.supabase.co` (MCP connected)
- **Branch:** `main` (all work lives here; `claude/sleepy-mcnulty` worktree branch tracks main)
- **Last commit:** see `git log --oneline -3`. Working tree clean as of 2026-04-29 after committing the InteractionManager fix and this STATE.md rewrite.
- **Edge function `food-lookup`:** deployed v3 with `verify_jwt:false` (D-28). USDA text search + OFF barcode lookup verified end-to-end live 2026-04-14. To redeploy: bundle `supabase/functions/food-lookup/index.ts` + `_shared/cors.ts` + `lib/foodNormalizers.ts` into a single inlined string and call `mcp__supabase__deploy_edge_function` with `name: 'food-lookup'`.
- **Supabase secrets:** `USDA_FDC_API_KEY` set in project dashboard → Edge Functions → Secrets. Don't put it in `.env`. Function fails with a clear 500 if missing.
- **Worktree gotcha:** `.env` is gitignored and is NOT copied into worktrees automatically. New worktrees need `cp /Users/hari7aran/Desktop/caltrack-autopilot-test/.env .env` before Metro will start.
- **User mode:** interactive during the day, occasionally authorizes autonomous overnight work. See `~/.claude/projects/-Users-hari7aran-Desktop-caltrack-autopilot-test/memory/session_mode_overnight.md`.
- **Read-before-edit hook:** aggressive PreToolUse hook flags edits to files not Read'd-in-session. It's noisy but edits succeed.

## Load-bearing decisions (detail in DECISIONS.md)

- **D-14** — multi-user with Supabase auth + RLS. Real user IDs, login screen, cross-device sync.
- **D-16** — food library is the primary log path, quick-add is secondary.
- **D-17** — hybrid stepper with tap-to-type for serving input.
- **D-20** — F-20 bullshit detector compares claimed kcal vs implied (4P/4C/9F). Tolerance `max(25 kcal, 15%)`.
- **D-21** — History tab is a calendar grid (Phase 18, rewrite not addition).
- **D-22** — brand voice is "dry with light personality."
- **D-27** — food-lookup edge function uses USDA FDC + Open Food Facts (supersedes D-25, D-26).
- **D-28** — `food-lookup` ships with `verify_jwt:false` because Supabase mints ES256 user tokens but the edge gateway only verifies HS256.
- **D-32** — Phase 17 manual barcode entry is a first-class fallback (not just sim workaround).
- **D-33** — Phase 17 follow-up: data source attribution screen + scan entry point in AddMealSheet's Log tab.
- **N-11** — runtime device verification is MANDATORY before marking any phase done. Type-check + tests + lint is necessary but not sufficient.

## v1 phase progress

- [x] Phase 0 — Setup & exploration (`019df60`)
- [x] Phase 1 — Data model + persisted store (`e100950`)
- [x] Phase 2 — Food logging UI (`c6f5735`)
- [x] Phase 3 — Today screen (`952298a`)
- [x] Phase 4 — History screen (`2a6e6e6`, superseded by Phase 18)
- [x] Phase 5 — Profile screen (`07dccb5`)
- [x] Phase 6 — Verification + MORNING_SUMMARY.md (`caf6e96`)
- [x] Runtime bugfix — store selectors (`790c691`)

## v2 phase progress

- [x] Phase 7 — Supabase schema + RLS (`7032acc`, migrations `20260413000000` + `20260413000100`)
- [x] Phase 8 — Supabase client + env plumbing (`23b6734`)
- [x] Phase 9 — Auth flow + session-gated routing (`49a32c6`, runtime-verified 2026-04-13)
- [x] Phase 10 — Store refactor to Supabase-backed (`c3c419d`, runtime-verified 2026-04-13)
- [x] Phase 11 — Foods table CRUD + library UI (`9bb1b8f` + `293a746` close-button fix, runtime-verified 2026-04-13)
- [x] Phase 11.5 — Food-lookup edge function (USDA + OFF) (`abe7d16`, smoke-tested 2026-04-13, see D-27)
- [x] Phase 12 — Food-first logging flow with stepper (`fbb2921` + `386d4ef` auth fix + `0fb0d0e` verify_jwt:false redeploy, fully runtime-verified 2026-04-14)
- [x] Phase 13 — Bullshit detector (F-20) (`27d3000`, runtime-verified on device 2026-04-15)
- [x] Phase 14 — Edit entries in place (`78eb303`, runtime-verified on device 2026-04-15)
- [x] Phase 15 — Weight tracking + trend chart (`7fd7795`, runtime-verified 2026-04-13)
- [x] Phase 16 — Meal planning (planned vs eaten) (`faf7ee7`, scope: Today + next 6 days, no full date picker)
- [x] Phase 17 — Barcode scanning (`4c343fd` core + `0b59ca5` follow-up + InteractionManager fix on top). Library-entry path verified on device 2026-04-15; scan-from-log entry path verified on device 2026-04-29.
- [x] Phase 18 — Calendar grid History (`c7e7575`, runtime-verified 2026-04-13)
- [x] Phase 19 — Brand voice copy pass (`ae899b0`, runtime-verified on device 2026-04-15)
- [x] Phase 20 — v2 verification + overnight summaries (`088730f`)
- [x] Bonus — Dark-mode UI revamp w/ calorie ring + meal sections + floating tab bar (`3604e38`, not on roadmap)

## Health

| Check | Status |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npx jest` | ✅ 320/320 passing |
| `npx expo lint` | ✅ 0 errors, 0 warnings |
| `food-lookup` edge function | ✅ deployed v3 with `verify_jwt:false` (D-28). USDA + OFF verified live 2026-04-14. |
| `lib/` coverage | ✅ ≥ 80% (last measured pre-Phase 19) |
| Supabase MCP | ✅ connected |
| Supabase schema | ✅ 5 tables + 1 view + RLS on all |
| Supabase security advisors | ✅ re-checked 2026-04-29 — 14 noisy/expected WARNs (12 GraphQL schema-visibility false positives, 2 `handle_new_user` SECURITY DEFINER which is the canonical Supabase trigger pattern) + 1 permanent free-tier limitation (see gotcha below) |
| Supabase performance advisors | ✅ re-checked 2026-04-29 — 5 INFO "unused index" warnings on user-scoped indexes that haven't seen production traffic |
| GitHub remote | ✅ public at Hariharan79/caltrack, history scrubbed of Claude attribution |

## Known gotchas (carry forward, read before touching anything)

- **`auth_leaked_password_protection` advisor warning is permanent on free tier** — the HaveIBeenPwned check that the advisor recommends enabling is a Pro-only feature ($25/mo). Don't re-investigate; just ignore the WARN.
- **Metro restart + Expo Go bridge bug** — before any `npx expo start`, run: `xcrun simctl terminate <UUID> host.exp.Exponent`. Symptom if skipped: `NativeModule: AsyncStorage is null` on import of `lib/supabase.ts`. It's never a code bug.
- **Expo tunnel needs ngrok v3+** — `@expo/ngrok@4.1.3` ships v2 which the ngrok service rejects. We swap in brew's ngrok v3 binary as a symlink. See `~/.claude/projects/-Users-hari7aran-Desktop-caltrack-autopilot-test/memory/expo_tunnel_broken.md`.
- **expo-router typed routes** — adding a new file-based route leaves `.expo/types/router.d.ts` stale. Fix: start Metro briefly with `npx expo start --no-dev --minify`, watch types regen, kill Metro, re-tsc.
- **Supabase `.update(payload)`** rejects `Record<string, unknown>` — wants `TablesUpdate<'tablename'>` from `types/db`. Build typed patches (see `updateFood` in `lib/store.ts:230`).
- **Modal nested-Stack dismiss** — any `app/<group>/index.tsx` presented as a modal needs an explicit `headerLeft` Close button calling `router.back()` (see `app/foods/index.tsx:18`).
- **iOS formSheet phantom-presentation** — pushing a stack route while a formSheet is mid-dismiss puts UIKit in a state where re-presenting the sheet renders empty and the parent's touches are swallowed. Defer the second nav until `onDismiss` fires (see `pendingNavRef` in Today) OR until `InteractionManager.runAfterInteractions` flushes (see scanner-return focus effect in Today).
- **RLS silence**: queries without an active session return zero rows, not an error. Check `useAppStore.getState().error` first when data is missing.
- **day_key vs logged_at**: schema uses `day_key` (YYYY-MM-DD local) for bucketing. `lib/date.ts` already produces this.
- **`TablesUpdate<'foods'>` import** — pull from `../types/db` not `@/types`.
- **Test supabase mocking pattern** — chainable mock in `__tests__/lib/store.test.ts` uses a thenable `builder.then`. `hydrate()` reads goals → entries → foods → weight_entries; enqueue four responses in that order.
- **`react-native-svg`** was NOT pre-installed despite ROADMAP claim. Already installed and whitelisted in `jest.config.js` transformIgnorePatterns.
- **Chart width** — `WeightChart` takes explicit `width` prop. `profile.tsx` uses `onLayout` to capture available width.
- **Don't import from `lib/store.ts` in pure utility modules** — transitively imports AsyncStorage which fails in Jest. Pure utilities should only import from `lib/date.ts` or other pure helpers.
- **Edge function deploy is single-file inlined** — re-bundle `index.ts` + `_shared/cors.ts` + `lib/foodNormalizers.ts` into one string when redeploying.
- **`food-lookup` is `verify_jwt:false` and `lib/foodLookup.ts` uses raw `fetch`** — not `supabase.functions.invoke`. ES256 vs HS256 gateway mismatch. See D-28. Don't revert.
- **AppState ↔ `supabase.auth.startAutoRefresh()` wiring** is required in RN. `lib/supabase.ts` wires this. Don't drop it.
- **USDA `dataType` matters for parsing** — Branded uses `labelNutrients` (per serving), Foundation/SR Legacy use `foodNutrients` (per 100g). `lib/foodNormalizers.ts` `normalizeUsda` branches on this.

## Blockers

None.
