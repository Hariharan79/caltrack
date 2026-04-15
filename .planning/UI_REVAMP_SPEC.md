# UI Revamp Spec — Phase 20

Derived overnight from the 23 screenshots in `caltracker screens.zip` (Lifesum, Yazio, BitePal, timespent, Runna). Adapted to our dark-black background + #87A878 green brand — **we keep dark mode and we keep the green**.

## Design tokens (additions/changes to `constants/theme.ts`)

```ts
COLORS:
  background: '#000000'             // keep
  backgroundAlt: '#0A0A0A'          // keep
  surface: '#121214'                // darken slightly (was #1C1C1E)
  surfaceElevated: '#18181B'        // NEW — for hero cards
  text: '#FFFFFF'                   // keep
  textSecondary: '#8E8E93'          // keep
  textTertiary: '#6B6B72'           // NEW — weaker label tone
  primary: '#87A878'                // keep
  primaryMuted: 'rgba(135,168,120,0.18)'  // NEW — tinted backgrounds
  primaryDark: '#2E4A2A'            // adjust (was '#123524')
  protein: '#FF8A7A'                // slightly softer
  carbs: '#5EEAE0'                  // slightly brighter
  fat: '#FFD56B'                    // slightly warmer
  border: 'rgba(255,255,255,0.08)'  // slightly lighter
  borderStrong: 'rgba(255,255,255,0.16)'  // NEW
  overlay: 'rgba(0,0,0,0.72)'       // stronger

RADIUS:
  sm: 6
  md: 10
  lg: 14
  xl: 20
  xxl: 28                            // NEW — hero cards + ring container
  pill: 999                          // NEW — floating nav bar

SPACING: unchanged
```

## Screen-by-screen

### Today tab
- **New header block.** Greeting "Today" (display size) + weekday line + small profile-avatar button top-right (navigates to Profile).
- **New hero: `CalorieRing`.** SVG circular progress replacing the flat progress bar in TotalsCard. Center shows `<calories>` large, `of <goal> kcal` below. Ring arc is brand green; overflow tinting red-orange. Left and right mini-stats: **Remaining** / **Over** (over stays 0 until goal crossed).
- **Weekly streak strip.** 7 day dots above the ring: S M T W T F S, filled if any entry logged that day, current day highlighted with a ring. Purely visual, reads from `entries` via a new selector.
- **Macro rows.** Thin horizontal bars (not chips). Row layout: `label on left` — `bar` — `consumed/goal g` on right. Protein / Carbs / Fat stacked.
- **Meal sections.** Group today's entries by inferred meal type from `loggedAt` hour: Breakfast (4–10), Lunch (10–15), Dinner (15–21), Snacks (other). Each section has a small header with name + kcal subtotal. An empty section is hidden.
- **Empty state.** A subtle emoji/illustration + existing "An empty log. What a glorious, untouched canvas." copy.
- **Planned meals section** (from Phase 16) sits above eaten sections, with a subtle "Planned" pill on each row and a tap-to-mark-eaten affordance.

### History tab
- Calendar grid already exists (Phase 18). Add: mini 7-day streak strip at top (reused component), brighter "today" highlight on grid, day-detail sheet gets the new card treatment.

### Profile tab
- Regroup into visible cards: **Goals**, **Weight**, **Data sources**, **Account**. Each becomes a rounded surface card with a title row.
- Weight chart card gets the new radius + `surfaceElevated`.

### Foods library
- List rows get the new avatar-circle treatment (first letter of food name on a tinted primary background).
- Search field becomes a pill with a barcode icon on the right (routes to `/foods/scan` for library destination).

### AddMealSheet
- Top "Daily intake" mini-card showing today's running kcal and macro bars — mirrors Lifesum's pattern so you see the impact of the food you're about to log.
- Tabs row becomes a pill segmented control: **Recents** / **Search** / **Quick add**. (Was: Log / Quick add.) Recents tab is the new default.
- Food rows get the avatar-circle treatment.
- "Scan" button moves into the search-input trailing adornment (barcode glyph).

### Tab bar
- Floating pill-style container: rounded `RADIUS.pill`, `surfaceElevated` background, 1px `borderStrong`, horizontal margin, `bottom` ≈ `insets.bottom + 12`.
- 3 tab items (Today / History / Profile) flanking the center FAB; FAB grows slightly (68px) and gets a subtle green glow shadow.

## New shared components (to create)
- `components/CalorieRing.tsx` — SVG ring.
- `components/WeekStreak.tsx` — 7-day dot strip.
- `components/AppHeader.tsx` — shared header with title, subtitle, trailing avatar button.
- `components/MealSection.tsx` — section header + its rows.
- `components/Avatar.tsx` — initials circle with tinted bg.
- `components/SectionCard.tsx` — common rounded surface wrapper (title + children).

## Components to update
- `TotalsCard.tsx` — rebuilt around `CalorieRing` + horizontal macro bars.
- `EntryRow.tsx` — avatar circle leading, tighter typography, planned-pill support.
- `EntriesList.tsx` — grouping by meal section.
- `FoodRow.tsx` — avatar circle leading.
- `app/(tabs)/_layout.tsx` — floating pill tab bar.
- `app/(tabs)/index.tsx` — new header, week streak, new totals card, grouped entries.
- `app/(tabs)/history.tsx` — week streak + new card treatment.
- `app/(tabs)/profile.tsx` — regrouped section cards.
- `components/AddMealSheet.tsx` — daily-intake strip, new tab pill, search pill w/ barcode.

## Out of scope for this phase
- Auth screens (sign-in/sign-up).
- FoodForm internals (already functional).
- Scanner permission screen visuals.
- New icons beyond phosphor-react-native (already installed).

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint .` — clean.
- `npm test` — 266+ jest; add smoke tests for `CalorieRing` (progress math) and `WeekStreak` (day membership), update snapshot-style assertions where copy is unchanged.
- **Runtime verification deferred to morning (N-11)** — user will walk the app in the sim.
