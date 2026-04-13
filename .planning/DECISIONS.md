# Autonomous Decisions Log

Every non-obvious choice I made on the user's behalf during the overnight session.

## D-01 — Single-user, no auth

The skeleton's `FoodEntry` type has a `userId: string` field, hinting at multi-user. I'm dropping it. The app has no auth, no backend, no sync — adding userId now would just be cargo-culted complexity. Easy to add later if the user wants it.

## D-02 — Local-only persistence (AsyncStorage)

No backend, no sync. Entries live in zustand-persist on the device. The user can wipe via Profile > Reset. Trade-off: no cross-device, no recovery if storage clears, but matches "MVP overnight build" scope.

## D-03 — Drop the `nutritionix`/`local_db` source enum

Skeleton's `FoodEntry.source` field implies an external food database. Out of scope tonight. New `MealEntry` type doesn't carry `source`; can be added later when a food search exists.

## D-04 — Date keys are `YYYY-MM-DD` local-time strings

Not ISO timestamps. Easy to bucket by day, no timezone gymnastics. Tradeoff: a meal logged at 11:55pm and another at 12:05am sit on different days even if they feel like the same meal — that's correct behavior for a calorie tracker.

## D-05 — zustand-persist over a custom AsyncStorage layer

zustand has built-in persistence middleware. No reason to write a custom repo layer. If the requirements grow (sync, conflict resolution), revisit.

## D-06 — Tests focus on `lib/` (store + date utils), light component tests

Component tests in React Native are flaky and slow to write well. The hard logic — totals, day grouping, persistence — lives in `lib/`. That's where ≥80% coverage matters. Components get smoke tests + interaction tests for the critical flows (add meal, delete meal).

## D-07 — Use `expo install` not raw `npm install` for native deps

Expo SDK pins compatible versions. AsyncStorage was installed via `npx expo install @react-native-async-storage/async-storage` to get version 2.2.0 (the one Expo 54 expects).

## D-08 — Modal sheet for "Log meal", not a separate route

A modal keeps the user in context on the Today screen and matches iOS conventions. Implemented as a `Modal` from React Native (presentationStyle="formSheet" on iOS, default on Android), not Expo Router's `presentation: 'modal'`, because state lives in the parent and the parent controls open/close.

## D-09 — No nutrition database / food search

Manual entry only. Adding a food DB (Open Food Facts, Nutritionix, USDA) requires API keys, network stubs, and meaningful UI design — not an overnight task.

## D-10 — Charts deferred, simple progress bar instead

A `<View>`-based progress bar on the Today card communicates "how much of your goal" clearly. No charting library, no SVG, no deps added. If the user wants charts in the morning, that's its own phase.

## D-11 — Test files extend the existing `__tests__/` convention

The skeleton already has `__tests__/constants/...` and `__tests__/navigation/...`. New tests follow the same pattern: `__tests__/lib/...` and `__tests__/components/...`. Not co-located. Keeps a clean separation from app code.

## D-12 — Date utils as pure functions, not a class

`lib/date.ts` exports plain functions (`todayKey()`, `dayKey(d)`, etc.). Easier to test, no instance state. Matches the rest of the codebase's functional style.

## D-13 — Reset action is destructive but discoverable

Profile > Reset wipes entries and goals. Required for testing during development. Hidden behind a confirm dialog so it's not a footgun.

---

# Morning Walkthrough Decisions — 2026-04-13

User reviewed the overnight build and answered 10 questions on scope. The decisions below **supersede** or extend the overnight ones.

## D-14 — Full multi-user with Supabase auth + RLS (**supersedes D-01, D-02, D-05**)

The caltrack sandbox has an attached Supabase project (`gjzonxmvfaokjpgfykrn.supabase.co`). Dropping the local-only stance:

- Real `user_id` foreign keys on every user-scoped table.
- Supabase email/password auth with a sign-in + sign-up screen gate.
- Row-Level Security on every table; each user sees only their own rows.
- zustand remains as the in-memory state layer, but the *canonical* state lives in Postgres. AsyncStorage becomes an offline read cache, not the source of truth.
- The existing `Profile > Reset` flow becomes "Reset my data" scoped to the authenticated user, not a wipe of the device.

Trade-off: more moving parts (network, offline, conflict), but the user explicitly asked for cross-device sync. The `.planning/REQUIREMENTS.md` now lists F-11 (auth), F-12 (sync), F-13 (logout) as v2 requirements.

## D-15 — Scope explosion is intentional (**extends D-09, D-10**)

Overnight build deferred everything that wasn't trivial. The walkthrough brought 7 of those deferrals back in:

- F-14 — edit entries in place
- F-15 — weight tracking
- F-16 — weight trend chart
- F-17 — barcode scanning
- F-18 — serving sizes + reusable food library (reverses D-09)
- F-19 — meal planning (plan future meals as "planned", mark "eaten")
- F-20 — bullshit detector (see D-20)

`ROADMAP.md` phases 7-20 sequence these.

## D-16 — Food library is the primary log path, quick-add is secondary (Q3)

Tapping `+` on Today opens a food picker (search + recents) with a "Quick add" tab for raw-calorie entry. Most users will repeat-log the same 20 foods, so optimize for that. Quick-add stays one tap away for one-off meals at restaurants / events.

## D-17 — Servings stepper is a hybrid (Q4)

`[−] 1.0 servings [+]` with tap-to-type. Steppers for common fractions (0.5, 1, 2), tap the number to open a numeric keyboard for exact amounts (`1.37`). Same UX on both Goals and Log forms for consistency.

## D-18 — Floating `+` stays (Q5, **reaffirms D-08**)

FAB on Today only, no top-bar `+`, no cross-tab global log action. Simpler navigation model.

## D-19 — Keep four text fields on Profile goals (Q6)

Rejected sliders, steppers, and preset-based macro derivation. Text fields are fastest to build, most flexible, least opinionated about diet style.

## D-20 — Bullshit detector is a real feature, not a nice-to-have (Q6 bonus → F-20)

Pure-function sanity check: implied_kcal = 4·protein + 4·carbs + 9·fat. Tolerance and severity are build-time decisions for Phase 13:

- **Tolerance (tentative):** `max(25 kcal, 15% of claimed)`. Below → ok. Above → flag.
- **Severity (tentative):** `ok | mild | blatant` based on magnitude of mismatch. Mild = yellow chip. Blatant = red ⚠ on the row.
- **Placement:** (a) inline warning when saving a food definition, (b) ⚠ badge on `EntryRow` for suspect entries so users can spot lying labels.

These numbers are stub guesses. We'll tune once we have real data.

## D-21 — History becomes a calendar grid (Q7, **supersedes Phase 4's flat list**)

Phase 18 rewrites `app/(tabs)/history.tsx` from the current expandable list to a month grid. Each cell = one day, colored dot = goal hit/miss/over. Tap a cell → existing expanded-day detail view. Needs month navigation (arrows + "today" jump button).

The existing `HistoryDay` component can be repurposed for the tap-to-expand detail panel; the grid itself is new.

## D-22 — Brand voice: "dry with light personality" (Q9)

Applies to every user-facing string. Examples the user liked:

- Today empty: *"An empty log. What a glorious, untouched canvas."*
- History empty: *"Zero calories tracked. Zero judgement."*

Guidelines for writing in this voice:

- Short. One sentence is almost always enough.
- Dry observation + a single turn of personality. Not jokes, not hype.
- Never exclamation marks unless ironic. Never emoji.
- Never "let's", never "you got this", never coach-speak.

Phase 19 is a dedicated copy pass across the whole app.

## D-23 — Keep current date labels (Q10, **reaffirms D-04 with spec**)

`formatDayLabel` output stays as-is: `Today` / `Yesterday` / `Mon, Apr 12`. No relative ("2 days ago") formatting. With the calendar grid landing in Phase 18, relative labels would be redundant — the grid is the date UI.
