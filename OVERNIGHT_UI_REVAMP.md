# UI Revamp — Overnight Decision Log

You wanted the UI to feel more like the screenshots in `caltracker screens.zip`. You also explicitly said: **keep dark mode, keep the green**. This file walks every design decision I made while implementing Phase 20, what I looked at, what I considered, and what I ruled out. Read it before running the sim — you'll know what to look for, and you'll know what to push back on.

**Commit:** `28209c3 feat(ui): dark-mode revamp with calorie ring + meal sections + floating tab bar`
**Spec I worked from:** `.planning/UI_REVAMP_SPEC.md` (also committed).

## The screenshots

The zip had 23 PNGs. Sources I could identify from the "curated by Mobbin" footers:
- **Lifesum** (the majority) — light theme with a cloudy gradient backdrop, circular calorie ring, meal sections (Breakfast / Lunch / Dinner / Snack), search-driven food picker with tabs, "day rating" card with emoji, water tracker, floating bottom nav with center FAB.
- **Yazio** — diary screen with circular progress around each meal row, light theme, black FABs.
- **BitePal** — skeleton/loading state, floating pill nav bar, minimal dark-accent cards.
- **timespent** — habit tracker, weekly dot calendar (S M T W T F S).
- **Runna** — week picker with activity dots, avatar + notification header.

The strongest single pattern across all of them is **the big circular calorie ring** on the daily screen. The second strongest is the **floating pill bottom nav**. The third is **grouping entries into meal sections** instead of one flat list.

I adopted all three. Everything else I cherry-picked.

## What I kept from today's caltrack UI

- Pure black background.
- `#87A878` brand green.
- Dry-with-light-personality copy voice (Phase 19).
- The overall tab structure: Today / History / Profile + center FAB.
- The weight chart (unchanged internals, just wrapped in a new card).
- Phase 16's Planned section on Today — it sits above the meal sections untouched.

## What I changed, and why

### 1. Design tokens (additive, no breaking renames)

Added to `constants/theme.ts`:

- `COLORS.surfaceElevated: '#18181B'` for hero cards — gives a two-level dark surface ladder (background → surface → surfaceElevated) so hero elements like the calorie ring card read as "more important" without resorting to color.
- `COLORS.primaryMuted: 'rgba(135,168,120,0.18)'` — tinted green backgrounds for Avatar circles, the pill segmented control active state, and the "Planned" pill.
- `COLORS.primaryDark: '#2E4A2A'` — replaced the previous `#123524` because the old one read black on a black background. New value gives the calorie ring track a visible dim green.
- `COLORS.textTertiary: '#6B6B72'` — for de-emphasized labels.
- `COLORS.borderStrong: 'rgba(255,255,255,0.16)'` — for the floating tab bar's outline, which needs to be visible on pure black.
- `RADIUS.xxl: 28` — hero card radius. The whole app now has a subtle radius ladder: `sm(6) / md(10) / lg(14) / xl(20) / xxl(28) / pill(999)`.
- `RADIUS.pill: 999` — the floating tab bar and segmented controls.

**Macro colors tweaked:** protein `#FF6B6B → #FF8A7A` (softer), carbs `#4ECDC4 → #5EEAE0` (brighter on dark), fat `#FFE66D → #FFD56B` (warmer). All three were reading slightly washed-out against the old `#1C1C1E` surface. If you disagree, revert any single value in `constants/theme.ts` — the whole app re-reads that file.

**I did NOT rename any existing token.** Old call sites keep working. This was deliberate — a rename across 30+ files from a sub-agent is a merge-conflict accident waiting to happen.

### 2. CalorieRing (new hero on Today)

A 220px circular SVG ring with the kcal number large and centered, `of 2000 kcal` below. Arc color is brand green, track is `primaryDark`. At >100% goal the arc turns warm-orange to signal "you've gone over" without panicking. Alternatives considered:

- **Keep the flat bar.** Cleaner code, but it's the single element the screenshots most obviously shared, and visually flat bars read as "form field" in our current styling.
- **Three-number Lifesum layout (eaten / left / burned).** We don't track burned calories, so the "burned" slot would be empty or fake. Rejected as dishonest. I reduced it to two mini stats: **Remaining** (big in the corner, green) and **Protein so far** (for a glanceable macro signal) — but on review that felt noisy so I cut the protein mini-stat and left just the ring + center label + the macro bars below. You can see what I mean on Today; if the card feels empty, we add the mini stats back.
- **Animated ring-fill on mount.** Ruled out to keep the commit scoped. The ring renders with the correct arc on every render. Adding `react-native-reanimated` for one transition is a deferred call.

### 3. Meal sections (Breakfast / Lunch / Dinner / Snacks)

Entries on Today now group by inferred meal type from `loggedAt` hour. Logic lives in the pure helper `lib/mealType.ts`:

```
breakfast  04:00 ≤ h < 10:00
lunch      10:00 ≤ h < 15:00
dinner     15:00 ≤ h < 21:00
snacks     everything else
```

Each section renders a `MealSection` header (name + kcal subtotal) and its rows. Empty sections are hidden. The three key decisions here:

#### D-38 — meal type is inferred, not stored

**Chosen:** bucket by hour at read time. Zero DB changes.
**Alternative considered:** add `meal_type` column to `log_entries`, let users pick at log time.
**Why this:** adds friction to every log action (you'd have to tap "Breakfast/Lunch/Dinner/Snack" every time), and you never actually disagree with the clock more than once a week. When you do, you can still tap-edit the row and change the time — the section re-groups automatically. The DB is untouched, the migration story stays clean, and `Stepper` / `AddMealSheet` don't grow a new required field.

If you hate this, we flip to a stored column in one phase: `alter table log_entries add meal_type text`, backfill via a stored function that runs `inferMealType(logged_at)`, add a picker to `AddMealSheet`.

#### D-39 — hour boundaries are the typical "American dinner" shape

**Chosen:** 4am / 10am / 3pm / 9pm.
**Alternative considered:** 6am / 11am / 2pm / 7pm (tighter, more continental).
**Why this:** gives late dinners up to 9pm a "dinner" home and early snacks (4am post-workout smoothie) their own bucket. If your schedule is different, we move the numbers in `lib/mealType.ts` — it's one file and 10 tests.

#### D-40 — the section names and icons (or lack thereof)

**Chosen:** text-only section headers. No emoji, no illustrations.
**Alternative considered:** breakfast 🍳, lunch 🥗, etc. like Lifesum's hand-painted meal icons.
**Why this:** the Lifesum meal icons are copyrighted cartoon illustrations. Using stock emoji would look cheap next to the rest of the app. A clean text header with the kcal subtotal is more honest, reads faster, and keeps the dark minimalist aesthetic consistent.

### 4. Week streak strip (the 7-day dot row)

Taken directly from timespent. 7 dots labeled M–S across the top of Today and History, filled if **any** entry exists for that day, hollow if not. The current day has a subtle ring highlight. Reads from the same `entries` state via a pure selector.

**Not a "streak" in the gamified sense** — no badges, no "10 days in a row!" micro-rewards. Just a glanceable "did I log today? did I log yesterday?" strip. The spec file calls it WeekStreak but it's more of a recency indicator.

If you want it to actually mean "hit your calorie goal" instead of "logged at least one meal", the selector in `components/WeekStreak.tsx` is three lines. Flip `entries.length > 0` to `totals.calories >= goals.calorieGoal`.

### 5. Macro bars (replacing the chips)

The old `MacroChip` layout was three small colored chips at the bottom of `TotalsCard`. It worked but it was tight and felt like metadata, not a headline.

New layout: three stacked rows, each `label on left — bar in middle — consumed/goal on right`. The bars are thin (4px) and use the new softer macro colors. Immediate benefit: you can tell at a glance whether you're over/under on protein without reading the numbers.

**Alternative considered:** horizontal grouped bar chart (SVG). Ruled out as too dense for a 3-data-point case.

### 6. Floating pill tab bar

The most aggressive visual change. The old tab bar was a standard bottom row. The new one is a rounded pill floating `insets.bottom + 12` above the edge, with `RADIUS.pill`, `surfaceElevated` background, and a 1px `borderStrong` outline.

The center FAB stays where it was (anchored to Today screen) — it's not part of the tab bar. So on Today you see the pill + the FAB floating above it; on History and Profile you just see the pill.

#### D-41 — solid pill, not BlurView

**Chosen:** solid `surfaceElevated` background.
**Alternative considered:** iOS `BlurView` with `intensity={30}`.
**Why this:** blur over pure black has almost no visible effect and it introduces a native dependency + Android compatibility footnotes. The solid pill reads exactly the same visually, renders on Android for free, and avoids the `expo-blur` install.

#### D-42 — keep the center FAB on Today screen only

**Chosen:** FAB is a Today-screen element, not a tab bar element.
**Alternative considered:** move the FAB into the tab bar's center slot, always visible.
**Why this:** on History and Profile the FAB would either need to do something different (opening the log sheet from a screen that isn't about today is confusing) or navigate to Today first, which is a two-tap operation masquerading as one. The current design — FAB on Today, hidden elsewhere — is the honest one.

The agent's report flagged that the new 68px FAB and the new pill may visually crowd on a small device (SE class). Flag this during sim verification.

### 7. AppHeader (shared header component)

Every tab now uses `<AppHeader title="Today" subtitle="Monday, April 14" trailing={…} />`. The trailing slot on Today holds a placeholder avatar button ("Y") that navigates to Profile. On History and Profile the trailing slot is empty for now.

**Alternative considered:** unique custom header per tab.
**Why this:** the spec called for a unified treatment and the DRY refactor is one small component. Headers are the most remix-prone element across the app — a shared component keeps them in sync automatically.

### 8. Avatar circles on food rows

Both `EntryRow` (Today's meal list) and `FoodRow` (Foods library + AddMealSheet results) now show a leading 36px circle with `primaryMuted` background and the first letter of the food name in green. Inspired by Lifesum's colored food-icon chips, but without the licensed artwork.

**Alternative considered:** fetch food images from Open Food Facts. Ruled out — network-dependent UI for a one-glance list is a latency + failure mode accident.

### 9. AddMealSheet pill tab control + search pill

- Tab row is now a pill segmented control: **Recents / Search / Quick add**. The "Log" tab is renamed to "Search" and Recents becomes its own pill (though the sub-agent report notes both Recents and Search currently route to the same view — see deviations below).
- The search input is a pill with a magnifying glass on the left and a barcode icon on the right that routes to `/foods/scan`. This replaces the old "Scan" header button.

### 10. Profile screen section cards

The old Profile screen was a long list. Now it's four `SectionCard`s: Goals / Weight / Data sources / Account. Each card has a title row, a subtle border, and a `surfaceElevated` fill. The existing form internals (goal inputs, weight log sheet, danger zone buttons) are unchanged.

### 11. History screen

Mostly untouched visually — the calendar grid from Phase 18 is wrapped in a `SectionCard` with a `WeekStreak` strip on top. This is the one tab where I showed the most restraint because the calendar is already its own dense artifact that doesn't need competition.

## Deviations the sub-agent flagged

Copied from the sub-agent's report for visibility:

1. **Recents vs Search tabs in AddMealSheet** — both pills route to the same `LogSearchView` which already handles empty-query-shows-recents. Functionally identical to the spec's requirement but the pills don't actually gate different views. If you want distinct subtrees, it's a 20-minute follow-up.
2. **Tab bar uses solid pill, not BlurView** — see D-41 above.
3. **Today header avatar shows a placeholder "Y"** — the spec said "navigates to Profile" which works. Deriving initials from the auth session's email/display_name is a follow-up (one selector + passing through AppHeader).

## Things I want you to eyeball in the morning sim run

The sub-agent flagged these and I'm repeating them here so you don't miss them:

1. **Tab bar ↔ FAB overlap.** The FAB sits at `bottom = TAB_BAR_PADDING(110) + insets.bottom - 34` with the new 68px FAB. On a small device the FAB glow and the tab pill's top edge may crowd. If they touch, bump `TAB_BAR_PADDING` to 120 in `app/(tabs)/index.tsx`.
2. **CalorieRing fits inside the 220 diameter on iPhone SE widths.** If it overflows the card edges, drop `diameter` to 200 in `TotalsCard.tsx`.
3. **Profile's Goals card may feel tight** now that each field has a border. If it reads cramped, tighten `paddingVertical` on the form rows.
4. **Landscape iPad** stretches the tab pill edge-to-edge. Acceptable — the app is portrait-only.
5. **Daily-intake card in AddMealSheet** — it reads `selectTodayTotals` synchronously on modal mount. Watch for a flash of zero totals during hydration.

## What I ruled out entirely

These came up while reviewing the screenshots. I thought about them, rejected them, and didn't build them. Telling you so you don't wonder whether you missed an option.

- **Light theme toggle.** You said keep dark mode. Not building a switcher.
- **Cloud gradient backgrounds** like Lifesum's. Off-brand for a minimalist dark app.
- **"Day rating" emoji card** ("Eat more carbs to boost your day rating!"). Would require a nutrition-opinion engine that doesn't exist and you haven't asked for. Smells judgmental in a way that doesn't match D-22 voice.
- **Water tracker tiles, exercise tracker, step counter.** Not in the product. They exist in Lifesum because Lifesum is a generalist health app. We're a calorie tracker.
- **Recipes tab.** Same reason.
- **Gamification / streaks / badges.** The week streak strip is recency, not reward.
- **Onboarding carousel.** Auth is the gate. No onboarding needed for a single-user repo tool.
- **AI food suggestions** (Yazio's "AI Cappuccino" icon). Not in scope and not free.

## How to undo any of this

Every change lives in one commit: `28209c3`. To roll it all back:

```bash
git revert 28209c3
```

To roll back selectively, the biggest targets are `components/TotalsCard.tsx` (calorie ring), `app/(tabs)/_layout.tsx` + `components/ui/TabBar.tsx` (floating pill), `components/EntriesList.tsx` + `lib/mealType.ts` (meal sections). Reverting any one of those files from `1855e11` gets you that specific regression.

## Summary of the decisions in this file (quick-grep)

| Decision | What I chose | Main alternative |
|---|---|---|
| Calorie ring | 220px SVG ring, green arc, warm orange at >100% | Keep flat bar |
| Meal sections | Inferred from `loggedAt` hour | Stored `meal_type` column |
| Hour boundaries | 4 / 10 / 15 / 21 | 6 / 11 / 14 / 19 |
| Section header style | Text-only | Emoji/illustrations |
| Week streak | Entry-count based | Goal-completion based |
| Macro display | Horizontal stacked bars | Chip row |
| Tab bar | Solid pill, floating, borderStrong outline | BlurView |
| FAB | Today-only | Always-visible in tab bar |
| AppHeader | Shared component | Per-tab bespoke |
| Avatar circles | Initials on `primaryMuted` | OFF food images |
| AddMealSheet tabs | Pill segmented control | Keep existing tabs |
| Search scan entry | Barcode glyph in search pill | Standalone Scan button |
| Profile layout | Section cards | Flat list |
| History visual | Calendar wrapped in one card | Full redesign |
| Color ladder | Additive tokens, no renames | Full theme rewrite |
| Animation | None added | Reanimated ring fill |
| Blur | None | iOS BlurView tab bar |

If any row reads "wrong" to you, ping me and we'll revisit that specific decision. Everything is one small commit away from reversible.
