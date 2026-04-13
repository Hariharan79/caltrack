# caltrack MVP — Requirements

Each requirement has an ID. Phases reference these IDs.

**Revised 2026-04-13 (morning)** — F-11 through F-20 added after walkthrough with user. Scope is no longer "single-user local MVP" — this is a multi-user cloud-synced fitness tracker.

## Functional — core logging (v1, shipped)

- **F-01** As a user, I can log a food entry with name, calories, and optional protein/carbs/fat grams.
- **F-02** Logged entries are persisted across app restarts (currently AsyncStorage; migrating to Supabase in Phase 10).
- **F-03** The Today screen shows total calories and macros consumed today, plus progress vs. my daily calorie goal.
- **F-04** The Today screen lists today's entries in reverse-chronological order.
- **F-05** I can delete an entry from the Today screen.
- **F-06** The History screen shows past days (being rewritten as calendar grid in Phase 18).
- **F-07** Tapping a history day reveals that day's entries.
- **F-08** The Profile screen lets me set/edit my daily calorie goal and optional macro goals.
- **F-09** Profile defaults are sensible on first launch (calorie goal = 2000).
- **F-10** A "Log meal" button on Today opens a modal without leaving the tab.

## Functional — cloud + auth (v2, new)

- **F-11** I can sign up and log in with email + password via Supabase auth.
- **F-12** All my data (entries, goals, weight, planned meals, profile) syncs across devices via Supabase with Row-Level Security scoped to my user id.
- **F-13** I can log out. Session is cleared from local storage.

## Functional — deeper logging UX (v2, new)

- **F-14** I can edit an existing log entry in place (tap a row to open an edit sheet pre-filled with its values).
- **F-15** I can log my body weight (and optional body-fat %) and view past weigh-ins.
- **F-16** The Profile (or History) screen shows a simple weight trend chart over time.
- **F-17** I can scan a food barcode with the camera to auto-populate a food definition from Open Food Facts (or equivalent).
- **F-18** Foods are stored as reusable definitions (name + calories-per-serving + macros-per-serving). Logging an entry picks a food and selects a serving count (stepper with tap-to-type for fractional amounts like 0.5, 1, 1.37).
- **F-19** I can pre-log future meals as "planned." When the day arrives I can mark them "eaten" or adjust them. Today screen surfaces planned-but-not-yet-eaten items separately.
- **F-20** "Bullshit detector" — when entering or viewing food macros, the app compares claimed calories against implied calories using the 4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat rule. If the mismatch exceeds tolerance it flags the food (inline warning on the food form and a ⚠ badge on entry rows). Tolerance + severity levels decided at build time for Phase 13.

## Non-functional

- **N-01** Strict TypeScript, no `any` in app code.
- **N-02** Pure functions for date math, totals, bs-detector, stepper logic — unit-testable without a store.
- **N-03** Test coverage ≥ 80% on `lib/`.
- **N-04** All baseline tests continue to pass.
- **N-05** `npx tsc --noEmit` exits clean.
- **N-06** `npx jest` exits clean.
- **N-07** No `console.log` in source.
- **N-08** Theme tokens used everywhere — no hardcoded colors/spacing in new components.
- **N-09** Atomic git commits per phase with descriptive messages.
- **N-10** Supabase RLS policies verified via `mcp__supabase__get_advisors({type: 'security'})` before any user-facing auth ships.
- **N-11** Before marking any phase complete, **actually run the app in a simulator** and verify the feature works at runtime. Unit tests + typecheck + lint are necessary but not sufficient (see the infinite-loop bug fixed in commit `790c691`).
- **N-12** Supabase service role key and Postgres password are never committed; only the anon key lives in `.env` / `EXPO_PUBLIC_*` vars.

## Brand voice (new)

- **V-01** All user-facing copy — empty states, error messages, alerts, notifications, confirmations — follows the "dry with light personality" voice chosen in the morning walkthrough (Q9 in `DECISIONS.md`).

## Quality bar

- A real user can sign up on one device, log meals and weight, and see the same data on a second device.
- Every feature has been run end-to-end in a simulator, not just unit-tested.
- The store is a single source of truth; UI components are dumb selectors.
- Supabase schema has RLS on every user-scoped table with no security advisor warnings.
