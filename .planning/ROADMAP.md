# caltrack MVP — Roadmap

Six phases. Each ends with a commit. Tests written alongside implementation (TDD where it pays off — store + date utils especially).

## Phase 1 — Data model + persisted store

**Covers:** F-01, F-02, F-08, F-09, N-01, N-02, N-03

- Adapt `types/index.ts` to drop `userId` and add `MealEntry` shape that the store actually uses
- Write `lib/date.ts` (pure functions: `todayKey`, `dayKey(date)`, `groupByDay`)
- Replace `lib/store.ts` stub with a persisted zustand store:
  - state: `entries: MealEntry[]`, `goals: Goals`
  - actions: `addEntry`, `removeEntry`, `updateGoals`, `clearAll` (test helper)
  - selectors: `selectTodayEntries`, `selectDailyTotals(dateKey)`, `selectHistory()`
  - persist via `@react-native-async-storage/async-storage` with versioned migrate
- Tests: `__tests__/lib/date.test.ts`, `__tests__/lib/store.test.ts`
- Commit: `feat(store): persisted entries + goals with selectors and date utils`

## Phase 2 — Food logging UI

**Covers:** F-01, F-10, N-08

- `components/AddMealSheet.tsx` — controlled modal with name + calories + macro inputs and validation
- `components/PrimaryButton.tsx` and `components/TextField.tsx` — small reusable building blocks
- Wire `AddMealSheet` to `addEntry` action
- Tests: `__tests__/components/AddMealSheet.test.tsx`
- Commit: `feat(ui): add meal sheet with validation`

## Phase 3 — Today screen

**Covers:** F-03, F-04, F-05, F-10

- Rebuild `app/(tabs)/index.tsx`:
  - Header with greeting + date
  - `TotalsCard` showing kcal consumed / goal + progress bar + macro chips
  - `EntriesList` of today's entries with delete button
  - Floating "Log meal" button → opens `AddMealSheet`
- New `components/TotalsCard.tsx`, `components/EntriesList.tsx`, `components/EntryRow.tsx`
- Tests: `__tests__/components/TotalsCard.test.tsx`
- Commit: `feat(today): live totals card, entries list, log button`

## Phase 4 — History screen

**Covers:** F-06, F-07

- Rebuild `app/(tabs)/history.tsx`:
  - Section list of past days (excluding today), most recent first
  - Each day shows total kcal + entry count
  - Tap to expand and reveal entry rows
- Tests: `__tests__/components/HistoryDay.test.tsx`
- Commit: `feat(history): expandable past-day list`

## Phase 5 — Profile screen

**Covers:** F-08, F-09

- Rebuild `app/(tabs)/profile.tsx`:
  - Editable calorie goal (numeric input)
  - Optional macro goals (protein/carbs/fat in grams)
  - Save button → `updateGoals`
  - Reset button → `clearAll` (with confirm)
- Tests: `__tests__/components/ProfileScreen.test.tsx`
- Commit: `feat(profile): editable daily goals`

## Phase 6 — Verification

**Covers:** N-03..N-07

- Run `npx tsc --noEmit`
- Run `npx jest --coverage` and confirm `lib/` ≥ 80%
- Run `npx expo lint` (or `eslint .`)
- Fix any failures
- Write `MORNING_SUMMARY.md` at repo root
- Commit: `chore: final verification + morning summary`
