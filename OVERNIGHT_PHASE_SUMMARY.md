# Overnight Phase Summary — 2026-04-14 → 2026-04-15

You went to sleep. I shipped the remaining v2 feature phases. Everything below is still **pending runtime verification per N-11** — read this before you touch the sim, then walk each section to confirm it behaves.

## Commits added overnight

```
28209c3 feat(ui): dark-mode revamp with calorie ring + meal sections + floating tab bar
aedf16a feat(planner): pre-log future meals and mark eaten
```

Both sit on top of `1855e11` (Phase 17 follow-up). Branch is clean, no uncommitted changes.

## Static verification ✅

- `npx tsc --noEmit` — clean
- `npx expo lint` — clean
- `npm test` — **320 / 320 passing** (up from 291 before Phase 16)

## Runtime verification ❌ — your job this morning

Four phases are now waiting on you at the same time. You already knew about Phase 17 and Phase 19. Phase 16 and Phase 20 (UI revamp) are also unverified. I kept the test suites green because I cannot walk a real iOS sim in a background session.

Check in this order (fast to slow):

1. **App boots & tab routing works** — the floating tab bar is a full redesign, so this is the biggest "did I break everything" gate. If tab routing is broken, nothing else matters.
2. **Today screen visual** — Phase 20 is almost all on this screen. See `OVERNIGHT_UI_REVAMP.md` for the per-element checklist.
3. **Phase 16: Mark eaten** — log a planned meal (see below for how), then see it move from the Planned section to the meal sections.
4. **Phase 17: manual barcode entry** — still open from before. Enter `3017620422003` (Nutella).
5. **Phase 19: copy voice pass** — eyeball every screen for stale strings. Should be dry-with-light-personality everywhere.

---

# Phase 16 — Meal planning (planned vs eaten)

**Commit:** `aedf16a`
**Covers:** F-19 (the original "planned vs eaten" requirement from the spec)
**Status:** code shipped, tests green, **unverified in sim**

## What it does

- `log_entries.status` (column already existed from the Phase 7 migration) now actually gets read and written from the app.
- `MealEntry` type grew a `status: 'planned' | 'eaten'` field.
- `addEntry` accepts an optional `{ status: 'planned', plannedForDayKey }` input and inserts a future-dated row.
- New store action `markEntryEaten(id)` updates the row; the DB trigger `log_entry_status_stamp` rewrites `logged_at` to `now()` so the re-fetched row reflects the actual eat time.
- Today screen has a new **Planned** section above the meal sections. Planned rows render a "Planned" pill and a "Mark eaten" button that doesn't conflict with the row's tap-to-edit target.
- Planned entries are **excluded from daily totals** and from the History calendar grid (we explicitly do not count them toward calories).
- `AddMealSheet` has a "Log now / Plan for later" toggle on the Log tab. In plan mode, a 7-day chip picker lets you target Tomorrow, Wed, Thu, etc. Today is intentionally excluded from the chip picker since "plan for later" implies future.

## How to verify in the sim

1. Open Today → tap FAB → sheet opens on "Log now" mode (default). Log a regular entry as usual — nothing should feel different versus yesterday.
2. Tap FAB again → tap "Plan for later" → a row of date chips appears (Tomorrow, Wed, Thu, ...) → pick Tomorrow → search a food or use Quick add → save.
3. Open History tab, tap tomorrow's cell on the calendar → the planned entry should **not** appear in tomorrow's totals (planned meals don't count).
4. **Exercising the Planned section on Today is trickier** because the chip picker excludes today. Easiest path: in Supabase Studio (`gjzonxmvfaokjpgfykrn.supabase.co`), SQL editor, run:
   ```sql
   update public.log_entries
     set status='planned'
     where id='<pick-any-id-from-today>';
   ```
   Then pull Today to refresh → the row should move from Meals into a new "Planned" section, with a Planned pill and a "Mark eaten" button.
5. Tap "Mark eaten" → the row should move back into the meal sections and the timestamp should update to roughly now.
6. Tap the planned row (not the button) → edit sheet opens pre-filled, but without the plan-mode toggle (it's hidden in edit mode — see "Decisions" below).

## Decisions I made on your behalf

### D-34 — Planned meals do not count toward daily totals, ever

**Chosen:** `selectTodayTotals`, `computeDailyTotals`, `selectHistory`, and `buildTotalsByDay` all filter out planned entries. Planned meals are a **forecast**, not a commitment.
**Alternative considered:** count planned meals toward a separate "projected" total shown as a dashed line next to the real total.
**Why this:** the simpler behavior is easier to understand and doesn't require a second UI concept. You can still see planned meals in the Planned section — they're not hidden, they're just not in the math. If you disagree, we flip one filter and add the dashed line later; the data is all there.

### D-35 — Edit sheet does not let you flip a row's status

**Chosen:** when you tap a planned row to edit it, the "Log now / Plan for later" toggle is hidden. Editing adjusts name/calories/macros/servings/date but keeps `status` untouched.
**Alternative considered:** show the toggle in edit mode so you could "promote" a planned meal by re-saving it as `status='eaten'`.
**Why this:** "promote" is already covered by the Mark eaten button, which also triggers the DB trigger to rewrite `logged_at`. Having two code paths for the same transition is a bug farm. Edit is for fixing the numbers; Mark eaten is for the state transition.

### D-36 — Plan-for-later date picker is a 7-day chip row, not a full calendar picker

**Chosen:** `Tomorrow`, `<day>`, `<day>`, …, 7 chips, no `@react-native-community/datetimepicker` dependency.
**Alternative considered:** DateTimePicker modal (requires install) for arbitrary future dates.
**Why this:** planning a meal 3 weeks out is a weird use case for a calorie tracker. A 7-day horizon covers meal prep + "I'm going out Friday, let me budget for it" which is the actual use case. Zero new deps. If you find yourself wanting to plan further out, we add a "More dates…" entry at the end of the chip row that opens a picker.

### D-37 — Selectors for planned/eaten live in `lib/store.ts`, not `lib/planner.ts`

**Chosen:** `selectPlannedForToday`, `selectPlannedUpcoming` live next to the existing `selectTodayEntries`, `selectTodayTotals`.
**Alternative considered:** a new `lib/planner.ts` module.
**Why this:** the selectors read the same `entries` shape and use the same `todayKey()` helper as the existing selectors. Splitting them into a new file would force callers to import from two places and add no clarity.

---

# Phase 20 — UI revamp

Detailed decisions are in `OVERNIGHT_UI_REVAMP.md`. Short version: big circular calorie ring replaces the flat progress bar, meals group into Breakfast/Lunch/Dinner/Snacks sections, floating pill tab bar, cleaner headers, avatar-circle food rows. **Kept dark mode, kept the green.**

**Commit:** `28209c3`
**Test count:** 291 → 320 (+29)

---

# Phase 21 — Final verification (NOT YET)

This phase (née "Phase 20" in the original ROADMAP) is a cross-cutting sim walkthrough + `MORNING_SUMMARY_v2.md`. It can only happen after you runtime-verify Phases 13, 14, 16, 17, 19, 20 on a real sim or device. I did not attempt it tonight — that's the whole point of N-11.

When you're done verifying, the todo for me in a future session is:

1. Tick off Phases 13, 14, 16, 17, 19, 20 in `.planning/ROADMAP.md`.
2. Update `.planning/STATE.md`'s "Next action" to point at Phase 21.
3. Write `MORNING_SUMMARY_v2.md` as the consolidated v2 shipping doc (mirrors the original v1 `MORNING_SUMMARY.md`).
4. Cut the v2 tag.

---

# Files changed overnight (for your git diff curiosity)

**Phase 16 (aedf16a):** `types/index.ts`, `lib/store.ts`, `lib/calendar.ts`, `lib/copy.ts`, `components/EntryRow.tsx`, `components/EntriesList.tsx`, `components/AddMealSheet.tsx`, `app/(tabs)/index.tsx`, plus 5 test files.

**Phase 20 (28209c3):** 6 new components (`CalorieRing`, `WeekStreak`, `AppHeader`, `MealSection`, `Avatar`, `SectionCard`), new `lib/mealType.ts`, 3 new test files, plus updates to `constants/theme.ts`, `lib/copy.ts`, `components/ui/TabBar.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/history.tsx`, `app/(tabs)/profile.tsx`, `app/foods/index.tsx`, `components/TotalsCard.tsx`, `components/EntriesList.tsx`, `components/EntryRow.tsx`, `components/FoodRow.tsx`, `components/AddMealSheet.tsx`, and a handful of tests.

# Things I didn't do

- **I did not touch `.planning/STATE.md` / `DECISIONS.md` / `ROADMAP.md`.** Those are single-source-of-truth docs and I didn't want to write to them from a sub-agent context and risk a stale merge. They'll need a small pass after you verify — the new decisions D-34..D-37 above are candidates for DECISIONS.md, and the Phase 16 + Phase 20 rows are candidates for ROADMAP.md's v2 progress table.
- **I did not runtime-verify anything.** N-11 is not negotiable and I don't have a sim. That's your 10 minutes tomorrow morning.
- **I did not redeploy the `food-lookup` edge function.** Phase 16 and Phase 20 are purely client-side; the edge function is untouched.
- **I did not touch auth screens.** Out of scope for this overnight batch. If the UI revamp makes sign-in look stale by comparison, that's a follow-up.

Sleep well.
