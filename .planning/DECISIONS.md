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

## D-24 — Nutritionix Track API back in scope (**reverses D-03, D-09**)

2026-04-13 follow-up: with v2 sessions available (not the overnight budget), Nutritionix is cheap enough to justify. Free tier gives ~200 calls/day on the Track API — plenty for one user.

- **Phase 11.5** (new, inserted before food-first logging): `lib/nutritionix.ts` thin client + tests.
- **Phase 12** wires two endpoints into the logging sheet:
  - `GET /v2/search/instant?query=...` — typeahead for food names (common + branded).
  - `POST /v2/natural/nutrients` body `{query}` — NLP parse of "2 eggs and toast" into per-food kcal + macros.
- Env vars: `EXPO_PUBLIC_NUTRITIONIX_APP_ID`, `EXPO_PUBLIC_NUTRITIONIX_API_KEY`. User must sign up at developer.nutritionix.com and supply keys before Phase 11.5.
- Headers: `x-app-id`, `x-app-key`, `x-remote-user-id: 0`.
- Cache each NLP result into the user's `foods` table so repeat queries don't burn quota.
- Open Food Facts **stays** for Phase 17 barcodes (it's better at that, and free without keys).

Trade-off: adds a second external dependency. Mitigated by caching into `foods` table on first use — after a week of tracking, most logs go through the library without hitting the API.

## D-25 — FatSecret Platform API replaces Nutritionix (**supersedes D-24**)

2026-04-13: Nutritionix quietly removed their free tier — existing docs still mention "200 calls/day" but signup flows route everyone to paid plans. User applied for a **FatSecret Platform API** key instead (free Basic tier, OAuth 2.0 client-credentials flow, includes Search + Autocomplete + Food + NLP endpoints).

Impact on Phase 11.5:
- Rename `lib/nutritionix.ts` → `lib/fatsecret.ts`. Different shape:
  - Auth: OAuth 2.0 client-credentials. `POST https://oauth.fatsecret.com/connect/token` with `grant_type=client_credentials&scope=basic premier` → access token (expires in ~24h). Cache in memory + refresh on 401.
  - Endpoints are under `https://platform.fatsecret.com/rest/server.api` with `format=json`:
    - `method=foods.search` — text search → `{foods: {food: FatSecretFood[]}}`
    - `method=foods.autocomplete` — typeahead (Premier tier; check plan)
    - `method=food.get.v2&food_id=…` — full food details
    - `method=natural-language-processing.v1` — NLP (Premier; may not be in Basic)
  - Env vars: `EXPO_PUBLIC_FATSECRET_CLIENT_ID`, `EXPO_PUBLIC_FATSECRET_CLIENT_SECRET`. User must supply before Phase 11.5.
  - Response shape very different from Nutritionix — kcal is under `food_description` as a free-text string that needs parsing ("Per 100g - Calories: 165kcal | Fat: 3.57g | Carbs: 0g | Protein: 31g"). Mapping layer does the parse.

Phase 12 still consumes the client, but the Phase 12 plan needs a revisit once we know which endpoints are available on the Basic tier. If `natural-language-processing.v1` requires Premier, fall back to search-only UX (no "2 eggs and toast" parse).

Trade-off vs Nutritionix: FatSecret's OAuth + free-text nutrition field are more work. But Basic tier is genuinely free indefinitely, which is the whole point of this switch.

**Phase 11.5 is blocked** until the FatSecret key arrives. Moving forward with other phases in the meantime.

## D-26 — Phase 17 uses FatSecret barcode, not Open Food Facts (**amends Phase 17 ROADMAP entry**)

2026-04-13: User pointed out that FatSecret Platform API has a `food.find_id_for_barcode` endpoint. Since we're already adding a FatSecret client in Phase 11.5, Phase 17 should reuse that client rather than introduce Open Food Facts as a second food source.

Impact on Phase 17:
- `npx expo install expo-camera` still needed for the native barcode scan UI
- Barcode scan → `food.find_id_for_barcode` → `food.get.v2` → pre-fill existing `FoodForm` using the same shape normalizer Phase 11.5 builds
- Fallback on miss: open empty `FoodForm` (unchanged)
- **Phase 17 is now blocked on 11.5** — moving it out of the "unblocked leaves" bucket until FatSecret credentials land. This is a scope trade we accept to avoid maintaining two food APIs.

Phase 18 (calendar History) is now the only unblocked v2 leaf. Picking it up next.

## D-27 — USDA FoodData Central + Open Food Facts via edge function (**supersedes D-25, D-26**)

2026-04-13 (later, post-Phase 18): User reviewed FatSecret's terms of service and pushed back on the limitations:

- FatSecret's caching rule (24-hour expiry on everything except IDs from a tiny "storable" list) breaks the entire D-25 / Phase 12 plan to upsert into `public.foods`. Workaround would have been to store only `food_id` and re-fetch on every read — possible but adds latency and complexity for no upside.
- "Generally accessible to users" clause sits in a gray area for a strictly-personal app.
- The original D-25 plan to bundle credentials as `EXPO_PUBLIC_FATSECRET_*` is also at odds with FatSecret's "you are responsible for the secrecy of your Keys" clause, since `EXPO_PUBLIC_*` values get extracted by anyone who unzips the app bundle.

User opted to switch to a **two-source split** with **server-side credential handling**:

- **Open Food Facts** for barcode lookups — ODbL open data, no API key, biggest barcode database, no caching restrictions, attribution required ("Data from Open Food Facts")
- **USDA FoodData Central** for text search — free government API, ~2 minute signup at api.data.gov, 1000 req/hr per key, high-quality branded + foundation foods, no caching restrictions
- Both sources are reached through a **single Supabase Edge Function** `food-lookup` deployed via `mcp__supabase__deploy_edge_function`. The function accepts `{source: 'usda', query: '…'}` or `{source: 'off', barcode: '…'}` and returns a normalized shape so consumers don't care which source a result came from
- **Secrets** live in Supabase project secrets (`USDA_FDC_API_KEY`), set via the dashboard / CLI. Never in `.env`, never in `EXPO_PUBLIC_*`, never in git.
- Edge function requires the user's Supabase JWT (default Edge Function behavior) so anonymous traffic can't burn the rate limit.

### Normalized food shape

```ts
interface NormalizedFood {
  source: 'usda' | 'off';
  sourceId: string;          // fdcId for usda, barcode/code for off
  name: string;
  brand: string | null;
  servingSize: string | null;
  kcalPerServing: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  imageUrl: string | null;
}
```

### Impact on phases

- **Phase 11.5** now ships: the edge function (`supabase/functions/food-lookup/index.ts`), a thin `lib/foodLookup.ts` client wrapper around `supabase.functions.invoke`, response normalizers for both sources, and unit tests against fixtures from each API. No client-side credentials anywhere.
- **Phase 12** (food-first logging flow) consumes `lib/foodLookup.ts`. Since both sources allow caching, Phase 12 can upsert search results into `public.foods` for the recents list (the original D-25 plan, now legal). UX: debounced search-as-you-type (300ms) hitting USDA via the edge function. Display "Data from USDA FoodData Central" attribution on the search screen.
- **Phase 17** (barcode scan) becomes simpler: barcode scan → call `lib/foodLookup.ts` with `{source: 'off', barcode}` → pre-fill `FoodForm`. Same client wrapper as text search, just a different source. Display "Data from Open Food Facts" attribution on the scan result. Phase 17 is now **unblocked again** (depends only on Phase 11.5 + expo-camera install).

### History this is escaping

D-09 (original OFF-only plan) → D-24 (swap to Nutritionix, then their free tier vanished overnight) → D-25 (swap to FatSecret) → **D-27** (split into USDA for search + OFF for barcode, both behind an edge function). The lesson recorded for next time: pick the architecture that keeps the credentials server-side from day one, even for a personal app — the refactor cost when you change your mind is real.
