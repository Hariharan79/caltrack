# caltrack — Project Context

> Created autonomously on 2026-04-13 during overnight unattended session.

## Snapshot

`caltrack` is an Expo (React Native) calorie-tracking app. The user cloned this repo into `caltrack-autopilot-test` as a sandbox to test autonomous agent workflows (`claude-code-autopilot` plugin and the GSD planning system).

The user explicitly authorized fully autonomous overnight work: scope decisions, planning, execution, and commits, with morning review.

## Why this matters

The user values workflow validation as much as the resulting code. This means:

- Every decision should be documented (this directory).
- Commits should be atomic and reviewable, not one giant "WIP" dump.
- The code should actually *work*, not just typecheck.
- A morning summary at repo root is mandatory so the user can review cold.

## Tech stack (locked by the existing skeleton)

- Expo SDK 54, React Native 0.81, React 19
- Expo Router (file-based routing under `app/`)
- TypeScript strict mode
- zustand for state (already in deps, currently a stub)
- `@react-native-async-storage/async-storage` for persistence (added during this session)
- Jest + `jest-expo` + `@testing-library/react-native` for tests
- phosphor-react-native icons, expo-blur for the tab bar

## Existing assets (pre-session)

- `app/_layout.tsx` — root Stack with SafeAreaProvider, dark StatusBar
- `app/(tabs)/_layout.tsx` — three-tab layout (Today / History / Profile)
- `app/(tabs)/{index,history,profile}.tsx` — placeholder screens, just centered headings
- `components/ui/TabBar.tsx` — custom blurred tab bar (iOS gets BlurView, Android gets dark fallback)
- `lib/store.ts` — empty zustand store stub (`_storeVersion: 1`)
- `types/index.ts` — `FoodEntry`, `UserProfile`, `DailyTotals` interfaces (will be adapted, see DECISIONS.md)
- `constants/theme.ts` — full dark theme with COLORS / SPACING / RADIUS / TYPOGRAPHY
- `__tests__/` — 26 passing baseline tests (theme + tab bar)

## Goal of this session

Build a working single-user calorie tracker MVP on top of the skeleton:

1. Persisted state for food entries and user goals
2. A way to log meals (entry sheet)
3. Today screen showing live totals vs. goal
4. History screen showing past days
5. Profile screen for editing goals
6. ≥80% test coverage, all tests + tsc + lint clean

## Out of scope (deferred)

- Auth / multi-user (skeleton has `userId` field — will be dropped)
- Backend API / nutrition database integration
- Barcode scanning, photo logging, food search
- Charts / visualizations beyond a simple progress ring
- E2E tests (no working device runtime in this environment)
