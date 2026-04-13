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
