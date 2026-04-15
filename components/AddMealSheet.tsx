import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Barcode, MagnifyingGlass } from 'phosphor-react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { TextField } from './TextField';
import { PrimaryButton } from './PrimaryButton';
import { Stepper } from './Stepper';
import { Avatar } from './Avatar';
import {
  useAppStore,
  searchFoods,
  selectRecentFoods,
  selectTodayTotals,
} from '@/lib/store';
import { searchByText } from '@/lib/foodLookup';
import { dayKey } from '@/lib/date';
import type { NormalizedFood } from '@/lib/foodNormalizers';
import type { DailyTotals, Food, Goals, MealEntry, NewMealInput } from '@/types';

type Tab = 'recents' | 'search' | 'quick';
type Mode = 'now' | 'plan';

interface PlanDayChoice {
  key: string;
  label: string;
}

const UPCOMING_DAY_COUNT = 7;

function buildUpcomingDays(now: Date = new Date()): PlanDayChoice[] {
  const out: PlanDayChoice[] = [];
  for (let offset = 1; offset <= UPCOMING_DAY_COUNT; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = dayKey(d);
    let label: string;
    if (offset === 1) {
      label = COPY.log.sheet.planDayTomorrow;
    } else {
      label = d.toLocaleDateString(undefined, { weekday: 'short' });
    }
    out.push({ key, label });
  }
  return out;
}

type LogChoice =
  | { kind: 'lookup'; food: NormalizedFood }
  | { kind: 'local'; food: Food };

interface AddMealSheetProps {
  visible: boolean;
  onClose: () => void;
  initialEntry?: MealEntry | null;
  /**
   * When set, the sheet opens directly on the Log tab with this food already
   * selected and the servings-stepper view visible — bypasses the search.
   * Seeded by the Today screen after a barcode scan completes with
   * `destination: 'log'`.
   */
  initialScannedFood?: NormalizedFood | null;
  /**
   * Invoked when the user taps the Scan button in the Log tab search header.
   * The parent is expected to close the sheet and route to the scan screen
   * with `destination: 'log'`.
   */
  onRequestScan?: () => void;
}

interface DraftState {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY_DRAFT: DraftState = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
};

interface ValidationResult {
  errors: Partial<Record<keyof DraftState, string>>;
  parsed: NewMealInput | null;
}

export function validateDraft(draft: DraftState): ValidationResult {
  const errors: Partial<Record<keyof DraftState, string>> = {};

  const name = draft.name.trim();
  if (!name) errors.name = COPY.log.quickAdd.nameRequired;

  const calNum = Number(draft.calories);
  if (draft.calories.trim() === '') {
    errors.calories = COPY.log.quickAdd.caloriesRequired;
  } else if (!Number.isFinite(calNum) || calNum <= 0) {
    errors.calories = COPY.log.quickAdd.mustBePositive;
  }

  const parseOptional = (raw: string, key: keyof DraftState): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      errors[key] = COPY.log.quickAdd.mustBeNonNegative;
      return null;
    }
    return n;
  };

  const proteinG = parseOptional(draft.protein, 'protein');
  const carbsG = parseOptional(draft.carbs, 'carbs');
  const fatG = parseOptional(draft.fat, 'fat');

  if (Object.keys(errors).length > 0) {
    return { errors, parsed: null };
  }

  return {
    errors,
    parsed: {
      name,
      calories: calNum,
      proteinG,
      carbsG,
      fatG,
    },
  };
}

function scaleMacro(value: number | null, servings: number): number | null {
  if (value == null) return null;
  return Math.round(value * servings * 10) / 10;
}

function entryToDraft(entry: MealEntry): DraftState {
  return {
    name: entry.name,
    calories: String(entry.calories),
    protein: entry.proteinG == null ? '' : String(entry.proteinG),
    carbs: entry.carbsG == null ? '' : String(entry.carbsG),
    fat: entry.fatG == null ? '' : String(entry.fatG),
  };
}

export function AddMealSheet({
  visible,
  onClose,
  initialEntry = null,
  initialScannedFood = null,
  onRequestScan,
}: AddMealSheetProps) {
  const foods = useAppStore((s) => s.foods);
  const entries = useAppStore((s) => s.entries);
  const goals = useAppStore((s) => s.goals);
  const addEntry = useAppStore((s) => s.addEntry);
  const updateEntry = useAppStore((s) => s.updateEntry);
  const upsertFoodFromLookup = useAppStore((s) => s.upsertFoodFromLookup);

  const todayTotals = useMemo(() => selectTodayTotals(entries), [entries]);

  const isEdit = initialEntry != null;

  const [tab, setTab] = useState<Tab>(isEdit ? 'quick' : 'recents');
  const [mode, setMode] = useState<Mode>('now');
  // Upcoming 7-day chips. Rebuilt on each sheet open so the day labels stay
  // accurate if the app is left sitting across midnight.
  const [upcomingDays, setUpcomingDays] = useState<PlanDayChoice[]>(() =>
    buildUpcomingDays()
  );
  const [planDayKey, setPlanDayKey] = useState<string>(
    () => buildUpcomingDays()[0]?.key ?? ''
  );
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [usdaResults, setUsdaResults] = useState<NormalizedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<LogChoice | null>(
    initialScannedFood ? { kind: 'lookup', food: initialScannedFood } : null
  );
  const [servings, setServings] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState<DraftState>(
    initialEntry ? entryToDraft(initialEntry) : EMPTY_DRAFT
  );
  const [draftSubmitted, setDraftSubmitted] = useState(false);

  const reset = useCallback(() => {
    setTab(isEdit ? 'quick' : 'recents');
    setMode('now');
    const refreshedDays = buildUpcomingDays();
    setUpcomingDays(refreshedDays);
    setPlanDayKey(refreshedDays[0]?.key ?? '');
    setQuery('');
    setDebouncedQuery('');
    setUsdaResults([]);
    setSearching(false);
    setSearchError(null);
    setSelected(null);
    setServings(1);
    setSubmitting(false);
    setDraft(initialEntry ? entryToDraft(initialEntry) : EMPTY_DRAFT);
    setDraftSubmitted(false);
  }, [isEdit, initialEntry]);

  // Sync draft/tab when the entry we're editing changes (e.g. tapping a different row).
  useEffect(() => {
    if (!visible) return;
    if (initialEntry) {
      setTab('quick');
      setDraft(entryToDraft(initialEntry));
      setDraftSubmitted(false);
      setSelected(null);
    }
  }, [visible, initialEntry]);

  // Refresh upcoming-day chips whenever the sheet opens — prevents stale
  // labels if the app is left sitting across midnight.
  useEffect(() => {
    if (!visible) return;
    const refreshed = buildUpcomingDays();
    setUpcomingDays(refreshed);
    setPlanDayKey((prev) => {
      if (refreshed.some((d) => d.key === prev)) return prev;
      return refreshed[0]?.key ?? '';
    });
  }, [visible]);

  // When the parent seeds a scanned food (after returning from the scanner),
  // jump straight to the Log tab's servings-stepper view with that food
  // pre-selected. This fires whenever the sheet becomes visible OR the seed
  // value changes, so repeat scans work.
  useEffect(() => {
    if (!visible) return;
    if (!initialScannedFood) return;
    setTab('search');
    setSelected({ kind: 'lookup', food: initialScannedFood });
    setServings(1);
    setQuery('');
    setDebouncedQuery('');
  }, [visible, initialScannedFood]);

  // Debounce query → debouncedQuery
  useEffect(() => {
    if (!visible) return;
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query, visible]);

  // Trigger USDA search when debouncedQuery changes
  useEffect(() => {
    if (!visible) return;
    if (debouncedQuery === '') {
      setUsdaResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    searchByText(debouncedQuery)
      .then((results) => {
        if (cancelled) return;
        setUsdaResults(results);
        setSearching(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSearchError(err instanceof Error ? err.message : COPY.log.search.searchFailedFallback);
        setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, visible]);

  const localMatches = useMemo(
    () => searchFoods(foods, debouncedQuery),
    [foods, debouncedQuery]
  );

  const recentFoods = useMemo(
    () => selectRecentFoods(entries, foods),
    [entries, foods]
  );

  const draftValidation = useMemo(() => validateDraft(draft), [draft]);
  const draftErrors = draftSubmitted ? draftValidation.errors : {};

  const updateDraft = (key: keyof DraftState, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickLocal = (food: Food) => {
    setSelected({ kind: 'local', food });
    setServings(1);
  };

  const handlePickLookup = (food: NormalizedFood) => {
    setSelected({ kind: 'lookup', food });
    setServings(1);
  };

  const handleClearSelection = () => {
    setSelected(null);
    setServings(1);
  };

  const handleLogSave = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const isPlan = mode === 'plan';
    try {
      const food =
        selected.kind === 'lookup'
          ? await upsertFoodFromLookup(selected.food)
          : selected.food;
      await addEntry({
        name: food.name,
        calories: Math.round(food.kcalPerServing * servings),
        proteinG: scaleMacro(food.proteinGPerServing, servings),
        carbsG: scaleMacro(food.carbsGPerServing, servings),
        fatG: scaleMacro(food.fatGPerServing, servings),
        foodId: food.id,
        servings,
        status: isPlan ? 'planned' : 'eaten',
        plannedForDayKey: isPlan ? planDayKey : undefined,
      });
      reset();
      onClose();
    } catch (err) {
      Alert.alert(
        isPlan ? COPY.log.sheet.planSaveFailedTitle : COPY.log.sheet.saveFailedTitle,
        err instanceof Error ? err.message : COPY.errors.unknown
      );
      setSubmitting(false);
    }
  };

  const handleQuickSave = async () => {
    setDraftSubmitted(true);
    if (!draftValidation.parsed || submitting) return;
    setSubmitting(true);
    const isPlan = mode === 'plan';
    try {
      if (initialEntry) {
        await updateEntry(initialEntry.id, {
          name: draftValidation.parsed.name,
          calories: draftValidation.parsed.calories,
          proteinG: draftValidation.parsed.proteinG,
          carbsG: draftValidation.parsed.carbsG,
          fatG: draftValidation.parsed.fatG,
        });
      } else {
        await addEntry({
          ...draftValidation.parsed,
          status: isPlan ? 'planned' : 'eaten',
          plannedForDayKey: isPlan ? planDayKey : undefined,
        });
      }
      reset();
      onClose();
    } catch (err) {
      const failedTitle = initialEntry
        ? COPY.log.sheet.updateFailedTitle
        : isPlan
          ? COPY.log.sheet.planSaveFailedTitle
          : COPY.log.sheet.saveFailedTitle;
      Alert.alert(
        failedTitle,
        err instanceof Error ? err.message : COPY.errors.unknown
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'formSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={COPY.log.sheet.cancel}
            >
              <Text style={styles.headerAction}>{COPY.log.sheet.cancel}</Text>
            </Pressable>
            <Text style={styles.title}>{isEdit ? COPY.log.sheet.titleEdit : COPY.log.sheet.titleAdd}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {!isEdit ? (
            <>
              <DailyIntakeCard totals={todayTotals} goals={goals} />
              <View style={styles.modeToggle}>
                <ModeButton
                  label={COPY.log.sheet.modeNow}
                  active={mode === 'now'}
                  onPress={() => setMode('now')}
                  testID="mode-now"
                />
                <ModeButton
                  label={COPY.log.sheet.modePlan}
                  active={mode === 'plan'}
                  onPress={() => setMode('plan')}
                  testID="mode-plan"
                />
              </View>
              {mode === 'plan' ? (
                <PlanDayPicker
                  days={upcomingDays}
                  selected={planDayKey}
                  onSelect={setPlanDayKey}
                />
              ) : null}
              <View style={styles.tabsPill}>
                <PillTab
                  label={COPY.log.sheet.tabRecents}
                  active={tab === 'recents'}
                  onPress={() => setTab('recents')}
                  testID="tab-recents"
                />
                <PillTab
                  label={COPY.log.sheet.tabSearch}
                  active={tab === 'search'}
                  onPress={() => setTab('search')}
                  testID="tab-log"
                />
                <PillTab
                  label={COPY.log.sheet.tabQuick}
                  active={tab === 'quick'}
                  onPress={() => setTab('quick')}
                  testID="tab-quick"
                />
              </View>
            </>
          ) : null}

          {(tab === 'search' || tab === 'recents') && !isEdit ? (
            selected ? (
              <SelectedFoodView
                selected={selected}
                servings={servings}
                onChangeServings={setServings}
                onBack={handleClearSelection}
                onSave={handleLogSave}
                submitting={submitting}
                isPlan={mode === 'plan'}
              />
            ) : (
              <LogSearchView
                query={query}
                onQueryChange={setQuery}
                searching={searching}
                searchError={searchError}
                localMatches={localMatches}
                usdaResults={usdaResults}
                recentFoods={recentFoods}
                onPickLocal={handlePickLocal}
                onPickLookup={handlePickLookup}
                onRequestScan={onRequestScan}
              />
            )
          ) : (
            <QuickAddView
              draft={draft}
              errors={draftErrors}
              onUpdate={updateDraft}
              onSave={handleQuickSave}
              submitting={submitting}
              isEdit={isEdit}
              isPlan={mode === 'plan'}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface PillTabProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}

function PillTab({ label, active, onPress, testID }: PillTabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.pillTab, active && styles.pillTabActive]}
      testID={testID}
    >
      <Text style={[styles.pillTabLabel, active && styles.pillTabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface DailyIntakeCardProps {
  totals: DailyTotals;
  goals: Goals;
}

function DailyIntakeCard({ totals, goals }: DailyIntakeCardProps) {
  const goalCalories = goals.calorieGoal > 0 ? goals.calorieGoal : 0;
  const remaining = Math.max(0, goalCalories - totals.calories);
  const ratio = goalCalories > 0
    ? Math.min(1, Math.max(0, totals.calories / goalCalories))
    : 0;
  const overGoal = goalCalories > 0 && totals.calories > goalCalories;
  return (
    <View style={styles.intakeCard} testID="daily-intake">
      <View style={styles.intakeRow}>
        <Text style={styles.intakeLabel}>{COPY.log.sheet.dailyIntakeLabel}</Text>
        <Text style={styles.intakeValue}>
          {Math.round(totals.calories)} / {Math.round(goalCalories)} kcal
        </Text>
      </View>
      <View style={styles.intakeBarTrack}>
        <View
          style={[
            styles.intakeBarFill,
            { width: `${ratio * 100}%` },
            overGoal && styles.intakeBarFillOver,
          ]}
        />
      </View>
      <Text style={styles.intakeRemaining}>
        {overGoal
          ? COPY.totals.over(totals.calories - goalCalories)
          : COPY.totals.remaining(remaining)}
      </Text>
    </View>
  );
}

interface ModeButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}

function ModeButton({ label, active, onPress, testID }: ModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.modeButton, active && styles.modeButtonActive]}
      testID={testID}
    >
      <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
    </Pressable>
  );
}

interface PlanDayPickerProps {
  days: readonly PlanDayChoice[];
  selected: string;
  onSelect: (key: string) => void;
}

function PlanDayPicker({ days, selected, onSelect }: PlanDayPickerProps) {
  return (
    <View style={styles.planPickerWrap} testID="plan-day-picker">
      <Text style={styles.planPickerLabel}>{COPY.log.sheet.planFor}</Text>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.planPickerScroll}
      >
        {days.map((day) => {
          const active = day.key === selected;
          return (
            <Pressable
              key={day.key}
              onPress={() => onSelect(day.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={day.label}
              style={[styles.planChip, active && styles.planChipActive]}
              testID={`plan-day-${day.key}`}
            >
              <Text style={[styles.planChipLabel, active && styles.planChipLabelActive]}>
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface LogSearchViewProps {
  query: string;
  onQueryChange: (q: string) => void;
  searching: boolean;
  searchError: string | null;
  localMatches: Food[];
  usdaResults: NormalizedFood[];
  recentFoods: Food[];
  onPickLocal: (food: Food) => void;
  onPickLookup: (food: NormalizedFood) => void;
  onRequestScan?: () => void;
}

function LogSearchView({
  query,
  onQueryChange,
  searching,
  searchError,
  localMatches,
  usdaResults,
  recentFoods,
  onPickLocal,
  onPickLookup,
  onRequestScan,
}: LogSearchViewProps) {
  const showRecent = query.trim() === '';

  return (
    <View style={styles.flex}>
      <View style={styles.searchBox}>
        <View style={styles.searchPill}>
          <MagnifyingGlass color={COLORS.textSecondary} size={18} weight="bold" />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder={COPY.log.search.placeholder}
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
            accessibilityLabel={COPY.log.search.placeholder}
            testID="log-search"
          />
          {onRequestScan ? (
            <Pressable
              onPress={onRequestScan}
              accessibilityRole="button"
              accessibilityLabel={COPY.log.search.scanLabel}
              style={styles.searchScanButton}
              hitSlop={12}
              testID="log-scan"
            >
              <Barcode color={COLORS.text} size={20} weight="bold" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {showRecent ? (
          <>
            <Text style={styles.sectionTitle}>{COPY.log.search.sectionRecents}</Text>
            {recentFoods.length === 0 ? (
              <Text style={styles.empty}>{COPY.log.search.emptyRecents}</Text>
            ) : (
              recentFoods.map((food) => (
                <FoodResultRow
                  key={`recent-${food.id}`}
                  title={food.name}
                  subtitle={food.servingSize ?? COPY.log.search.oneServing}
                  kcal={food.kcalPerServing}
                  onPress={() => onPickLocal(food)}
                  testID={`result-recent-${food.id}`}
                />
              ))
            )}
          </>
        ) : (
          <>
            {localMatches.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{COPY.log.search.sectionLibrary}</Text>
                {localMatches.map((food) => (
                  <FoodResultRow
                    key={`local-${food.id}`}
                    title={food.name}
                    subtitle={food.servingSize ?? COPY.log.search.oneServing}
                    kcal={food.kcalPerServing}
                    onPress={() => onPickLocal(food)}
                    testID={`result-local-${food.id}`}
                  />
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>{COPY.log.search.sectionUsda}</Text>
            {searching && <ActivityIndicator color={COLORS.primary} style={styles.spinner} />}
            {searchError && <Text style={styles.error}>{searchError}</Text>}
            {!searching && !searchError && usdaResults.length === 0 && (
              <Text style={styles.empty}>{COPY.log.search.emptyUsda}</Text>
            )}
            {usdaResults.map((food) => (
              <FoodResultRow
                key={`usda-${food.sourceId}`}
                title={food.brand ? `${food.brand} — ${food.name}` : food.name}
                subtitle={food.servingSize ?? COPY.log.search.perServing}
                kcal={food.kcalPerServing}
                onPress={() => onPickLookup(food)}
                testID={`result-usda-${food.sourceId}`}
              />
            ))}
          </>
        )}
      </ScrollView>

      <Text style={styles.attribution}>{COPY.log.search.attribution}</Text>
    </View>
  );
}

interface FoodResultRowProps {
  title: string;
  subtitle: string;
  kcal: number;
  onPress: () => void;
  testID: string;
}

function FoodResultRow({ title, subtitle, kcal, onPress, testID }: FoodResultRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${kcal} calories`}
      testID={testID}
    >
      <Avatar name={title} size={36} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.rowKcal}>{Math.round(kcal)} kcal</Text>
    </Pressable>
  );
}

interface SelectedFoodViewProps {
  selected: LogChoice;
  servings: number;
  onChangeServings: (n: number) => void;
  onBack: () => void;
  onSave: () => void;
  submitting: boolean;
  isPlan: boolean;
}

function SelectedFoodView({
  selected,
  servings,
  onChangeServings,
  onBack,
  onSave,
  submitting,
  isPlan,
}: SelectedFoodViewProps) {
  const food = selected.food;
  const isLookup = selected.kind === 'lookup';
  const baseKcal = isLookup
    ? (food as NormalizedFood).kcalPerServing
    : (food as Food).kcalPerServing;
  const baseProtein = isLookup
    ? (food as NormalizedFood).proteinG
    : (food as Food).proteinGPerServing;
  const baseCarbs = isLookup
    ? (food as NormalizedFood).carbsG
    : (food as Food).carbsGPerServing;
  const baseFat = isLookup
    ? (food as NormalizedFood).fatG
    : (food as Food).fatGPerServing;
  const brand = isLookup ? (food as NormalizedFood).brand : null;
  const servingLabel = isLookup
    ? (food as NormalizedFood).servingSize
    : (food as Food).servingSize;

  const scaledKcal = Math.round(baseKcal * servings);
  const scaledProtein = scaleMacro(baseProtein, servings);
  const scaledCarbs = scaleMacro(baseCarbs, servings);
  const scaledFat = scaleMacro(baseFat, servings);

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={COPY.log.selected.backLabel}
          style={styles.backLink}
          testID="selected-back"
        >
          <Text style={styles.backLinkText}>{COPY.log.selected.back}</Text>
        </Pressable>

        <Text style={styles.selectedName}>{food.name}</Text>
        {brand && <Text style={styles.selectedBrand}>{brand}</Text>}
        {servingLabel && (
          <Text style={styles.selectedServing}>{COPY.log.selected.perServingPrefix} {servingLabel}</Text>
        )}

        <Text style={styles.sectionTitle}>{COPY.log.selected.servings}</Text>
        <Stepper value={servings} onChange={onChangeServings} testID="servings-stepper" />

        <Text style={styles.sectionTitle}>{COPY.log.selected.logging}</Text>
        <View style={styles.totalsCard}>
          <Text style={styles.totalKcal}>{scaledKcal} kcal</Text>
          <View style={styles.macroRow}>
            <MacroChip label="P" value={scaledProtein} />
            <MacroChip label="C" value={scaledCarbs} />
            <MacroChip label="F" value={scaledFat} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={
            submitting
              ? COPY.log.selected.saving
              : isPlan
                ? COPY.log.sheet.planSaveButton
                : COPY.log.selected.logButton
          }
          onPress={onSave}
          disabled={submitting}
          testID="log-save"
        />
      </View>
    </View>
  );
}

function MacroChip({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={styles.macroChip}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value == null ? '—' : `${value}g`}</Text>
    </View>
  );
}

interface QuickAddViewProps {
  draft: DraftState;
  errors: Partial<Record<keyof DraftState, string>>;
  onUpdate: (key: keyof DraftState, value: string) => void;
  onSave: () => void;
  submitting: boolean;
  isEdit: boolean;
  isPlan: boolean;
}

function QuickAddView({
  draft,
  errors,
  onUpdate,
  onSave,
  submitting,
  isEdit,
  isPlan,
}: QuickAddViewProps) {
  const defaultLabel = isEdit
    ? COPY.log.quickAdd.saveEdit
    : isPlan
      ? COPY.log.sheet.planSaveButton
      : COPY.log.quickAdd.saveNew;
  const busyLabel = COPY.log.quickAdd.saving;
  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        <TextField
          label={COPY.log.quickAdd.nameLabel}
          value={draft.name}
          onChangeText={(v) => onUpdate('name', v)}
          placeholder={COPY.log.quickAdd.namePlaceholder}
          autoCapitalize="words"
          error={errors.name}
          testID="meal-name"
        />
        <TextField
          label={COPY.log.quickAdd.caloriesLabel}
          value={draft.calories}
          onChangeText={(v) => onUpdate('calories', v)}
          placeholder={COPY.log.quickAdd.caloriesPlaceholder}
          keyboardType="number-pad"
          error={errors.calories}
          testID="meal-calories"
        />
        <View style={styles.row3}>
          <View style={styles.col}>
            <TextField
              label={COPY.log.quickAdd.proteinLabel}
              value={draft.protein}
              onChangeText={(v) => onUpdate('protein', v)}
              placeholder={COPY.log.quickAdd.macroPlaceholder}
              keyboardType="number-pad"
              error={errors.protein}
              testID="meal-protein"
            />
          </View>
          <View style={styles.col}>
            <TextField
              label={COPY.log.quickAdd.carbsLabel}
              value={draft.carbs}
              onChangeText={(v) => onUpdate('carbs', v)}
              placeholder={COPY.log.quickAdd.macroPlaceholder}
              keyboardType="number-pad"
              error={errors.carbs}
              testID="meal-carbs"
            />
          </View>
          <View style={styles.col}>
            <TextField
              label={COPY.log.quickAdd.fatLabel}
              value={draft.fat}
              onChangeText={(v) => onUpdate('fat', v)}
              placeholder={COPY.log.quickAdd.macroPlaceholder}
              keyboardType="number-pad"
              error={errors.fat}
              testID="meal-fat"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={submitting ? busyLabel : defaultLabel}
          onPress={onSave}
          disabled={submitting}
          testID="meal-save"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerAction: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    minWidth: 60,
  },
  headerSpacer: {
    minWidth: 60,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: COLORS.backgroundAlt,
  },
  modeLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  modeLabelActive: {
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  planPickerWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  planPickerLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
  },
  planPickerScroll: {
    gap: SPACING.xs,
    paddingRight: SPACING.lg,
  },
  planChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  planChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  planChipLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  planChipLabelActive: {
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  tabsPill: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderStrong,
    gap: 4,
  },
  pillTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  pillTabActive: {
    backgroundColor: COLORS.primary,
  },
  pillTabLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  pillTabLabelActive: {
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  intakeCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  intakeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  intakeLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  intakeValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  intakeBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.backgroundAlt,
    overflow: 'hidden',
  },
  intakeBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  intakeBarFillOver: {
    backgroundColor: COLORS.protein,
  },
  intakeRemaining: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: SPACING.xs,
  },
  searchBox: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderStrong,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    paddingVertical: SPACING.xs,
  },
  searchScanButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  empty: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    paddingVertical: SPACING.md,
  },
  error: {
    color: COLORS.protein,
    fontSize: TYPOGRAPHY.size.sm,
    paddingVertical: SPACING.sm,
  },
  spinner: {
    paddingVertical: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowText: {
    flex: 1,
    marginRight: SPACING.md,
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  rowSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: 2,
  },
  rowKcal: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  attribution: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.xs,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  backLink: {
    paddingVertical: SPACING.sm,
  },
  backLinkText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  selectedName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginTop: SPACING.sm,
  },
  selectedBrand: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    marginTop: 2,
  },
  selectedServing: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: SPACING.xs,
  },
  totalsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  totalKcal: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  macroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundAlt,
  },
  macroLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  macroValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  row3: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  col: {
    flex: 1,
  },
  footer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
});
