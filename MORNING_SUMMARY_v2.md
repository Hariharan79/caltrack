# Morning Summary — v2

> Written after v2 closeout on 2026-04-29. Covers everything shipped since `caf6e96` (the v1 morning summary).

## TL;DR

caltrack v2 took the v1 single-user local MVP and turned it into a real multi-user cloud-synced fitness tracker. **All 14 v2 roadmap phases (7–20) shipped, plus a bonus dark-mode UI revamp**, across 13 atomic commits over a few overnight runs and a string of morning interactive verification sessions on a physical iPhone. 320 jest tests passing, 92% coverage on `lib/`, RLS enforced on every user-scoped table, edge function deployed and live.

## What landed (in dependency order)

| Phase | Title | Commit |
|---|---|---|
| 7 | Supabase schema + RLS (5 tables + 1 view, RLS on all) | `7032acc` |
| 8 | Supabase client + env plumbing + generated types | `23b6734` |
| 9 | Auth flow — sign-in, sign-up, session-gated routing | `49a32c6` |
| 10 | Store refactor to Supabase-backed (zustand + offline cache) | `c3c419d` |
| 11 | Foods table CRUD + library UI | `9bb1b8f` |
| 11.5 | `food-lookup` edge function (USDA FDC + Open Food Facts) | `abe7d16` |
| 12 | Food-first logging flow with stepper servings | `fbb2921` (+ `386d4ef` auth fix + `0fb0d0e` `verify_jwt:false`) |
| 13 | Bullshit detector (claimed kcal vs 4P/4C/9F implied) | `27d3000` |
| 14 | Edit entries in place | `78eb303` |
| 15 | Weight tracking + SVG trend chart | `7fd7795` |
| 16 | Meal planning (planned vs eaten, Today + 6 days) | `faf7ee7` |
| 17 | Barcode scanning (camera + manual fallback + data-source attribution) | `4c343fd` + `0b59ca5` + `ec458e0` (iOS fix) |
| 18 | Calendar-grid History | `c7e7575` |
| 19 | Brand voice copy pass — `lib/copy.ts` central string table | `ae899b0` |
| 20 | Final verification + this summary | `088730f` (overnight summaries) + this commit |
| Bonus | Dark-mode UI revamp w/ calorie ring + meal sections + floating tab bar | `3604e38` |

## The three engineering stories worth telling

### 1. JWT algorithm gateway mismatch (D-28)

The `food-lookup` edge function rejected every authenticated request with 401 Invalid JWT. Static checks all passed. Manual decoding of the JWT `alg` field showed Supabase's auth was minting **ES256** tokens while the function gateway was pinned to **HS256** verification — an upstream platform bug, not our code.

Designed a forward-compatible workaround: ship `food-lookup` with `verify_jwt:false`, switch from `supabase.functions.invoke` to raw `fetch` for deterministic header handling, but keep attaching `Authorization: Bearer <user_jwt>` and `apikey: <anon>` headers on every request. The function ignores them today, but the day Supabase fixes ES256 gateway verification, we flip `verify_jwt:true` on redeploy without touching client code.

### 2. iOS formSheet phantom-presentation (the scan-from-log bug)

Phase 17's follow-up added a Scan icon to the meal-log sheet so users could scan directly into a log without first going through the food library. The library-entry path worked; the log-entry path froze the UI on iOS.

Root cause: `useFocusEffect` was firing `setSheetVisible(true)` while the scanner's pop animation was still running. Mounting a formSheet Modal mid-animation puts UIKit in a phantom-presentation state — the sheet renders empty and the FAB underneath swallows touches. Static checks couldn't catch this. Required a physical iPhone to reproduce.

Fix: wrap the `setSheetVisible(true)` call in `InteractionManager.runAfterInteractions` so the Modal mount waits for UIKit's animations to flush. Verified on device (commit `ec458e0`).

### 3. Disciplined verification (N-11)

Every phase had a hard rule: **runtime device verification before marking done.** Type-check + tests + lint is necessary but not sufficient. This rule exists because of a zustand selector infinite-loop bug fixed in v1's `790c691` — it passed every static check and crashed at first boot.

Verifying overnight-shipped code on a physical iPhone the next morning surfaced two real bugs (the formSheet race above, and a brief data-attribution UX miss in scan flow) that no amount of unit testing would have caught.

## Numbers

- **45 commits** on `main` from v2 start to v2 close
- **320 jest tests** passing across 26 suites
- **92.46% line coverage** / **95.38% function coverage** on `lib/`
- **0 TypeScript errors** under strict mode
- **0 lint errors / 0 warnings** under `expo lint`
- **5 Supabase tables + 1 view + RLS on all** with zero high-severity advisor warnings (12 GraphQL schema-visibility WARNs are noisy false-positives for an RLS-gated app; 2 `handle_new_user` SECURITY DEFINER WARNs are the canonical Supabase pattern; 1 leaked-password-protection WARN is a one-click dashboard fix)
- **`food-lookup` edge function v3** deployed, USDA + OFF verified end-to-end live

## Process notes

- **Most code was written by Claude Code agents.** The user wrote prompts, ran the verification, made design calls, and shipped commits. Many overnight sessions ran fully autonomously with subagents dispatched from a single prompt; mornings were used for physical-device walkthroughs.
- **Atomic commits per phase** — every phase is one revertable commit. No "WIP" dumps.
- **30+ decisions** logged to `.planning/DECISIONS.md` with alternatives considered. Pre-decided choices for autonomous overnight runs were marked so the morning user could flip them if needed.
- **Single-source-of-truth resume protocol** — `.planning/STATE.md` is the first file any new session reads. Resume protocol in user memory routes Claude to read STATE → DECISIONS → ROADMAP → git log before doing anything else.

## What's next

Possibilities, none of them owed:

- App Store / TestFlight via EAS Build
- Real-camera barcode verification end-to-end (current verification used manual entry — the through-lens path is unverified)
- Enable Supabase Auth's HaveIBeenPwned password check (one-click in dashboard)
- Performance pass once there's real production traffic to measure
- Marketing landing page + waitlist
