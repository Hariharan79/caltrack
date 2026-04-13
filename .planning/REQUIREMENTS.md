# caltrack MVP — Requirements

Each requirement has an ID. Phases reference these IDs.

## Functional

- **F-01** As a user, I can log a food entry with name, calories, and optional protein/carbs/fat grams.
- **F-02** Logged entries are persisted across app restarts (AsyncStorage).
- **F-03** The Today screen shows total calories and macros consumed today, plus progress vs. my daily calorie goal.
- **F-04** The Today screen lists today's entries in reverse-chronological order.
- **F-05** I can delete an entry from the Today screen.
- **F-06** The History screen shows past days (most recent first) with daily totals.
- **F-07** Tapping a history day expands to show that day's entries.
- **F-08** The Profile screen lets me set/edit my daily calorie goal and optional macro goals (protein/carbs/fat in grams).
- **F-09** Profile defaults are sensible on first launch (calorie goal = 2000, macros = null/unset).
- **F-10** A "Log meal" button on the Today screen opens a modal/sheet to add an entry without leaving the tab.

## Non-functional

- **N-01** Strict TypeScript, no `any` in app code.
- **N-02** Pure functions for date math and totals — easily unit-testable.
- **N-03** Test coverage ≥ 80% on `lib/`.
- **N-04** All existing 26 baseline tests continue to pass.
- **N-05** `npx tsc --noEmit` exits clean.
- **N-06** `npx jest` exits clean.
- **N-07** No `console.log` left in source.
- **N-08** Theme tokens used everywhere — no hardcoded colors/spacing in new components.
- **N-09** Atomic git commits per phase with descriptive messages.

## Quality bar

- A real human could pick up this app on an iPhone simulator, log a few meals, and have the totals + history + goal-progress all line up sensibly.
- The store is the single source of truth; UI components are dumb selectors.
