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
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { TextField } from './TextField';
import { PrimaryButton } from './PrimaryButton';
import { Stepper } from './Stepper';
import { useAppStore, searchFoods, selectRecentFoods } from '@/lib/store';
import { searchByText } from '@/lib/foodLookup';
import type { NormalizedFood } from '@/lib/foodNormalizers';
import type { Food, MealEntry, NewMealInput } from '@/types';

type Tab = 'log' | 'quick';

type LogChoice =
  | { kind: 'lookup'; food: NormalizedFood }
  | { kind: 'local'; food: Food };

interface AddMealSheetProps {
  visible: boolean;
  onClose: () => void;
  initialEntry?: MealEntry | null;
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

export function AddMealSheet({ visible, onClose, initialEntry = null }: AddMealSheetProps) {
  const foods = useAppStore((s) => s.foods);
  const entries = useAppStore((s) => s.entries);
  const addEntry = useAppStore((s) => s.addEntry);
  const updateEntry = useAppStore((s) => s.updateEntry);
  const upsertFoodFromLookup = useAppStore((s) => s.upsertFoodFromLookup);

  const isEdit = initialEntry != null;

  const [tab, setTab] = useState<Tab>(isEdit ? 'quick' : 'log');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [usdaResults, setUsdaResults] = useState<NormalizedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<LogChoice | null>(null);
  const [servings, setServings] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState<DraftState>(
    initialEntry ? entryToDraft(initialEntry) : EMPTY_DRAFT
  );
  const [draftSubmitted, setDraftSubmitted] = useState(false);

  const reset = useCallback(() => {
    setTab(isEdit ? 'quick' : 'log');
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
      });
      reset();
      onClose();
    } catch (err) {
      Alert.alert(
        COPY.log.sheet.saveFailedTitle,
        err instanceof Error ? err.message : COPY.errors.unknown
      );
      setSubmitting(false);
    }
  };

  const handleQuickSave = async () => {
    setDraftSubmitted(true);
    if (!draftValidation.parsed || submitting) return;
    setSubmitting(true);
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
        await addEntry(draftValidation.parsed);
      }
      reset();
      onClose();
    } catch (err) {
      Alert.alert(
        initialEntry ? COPY.log.sheet.updateFailedTitle : COPY.log.sheet.saveFailedTitle,
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
            <View style={styles.tabs}>
              <TabButton
                label={COPY.log.sheet.tabLog}
                active={tab === 'log'}
                onPress={() => setTab('log')}
                testID="tab-log"
              />
              <TabButton
                label={COPY.log.sheet.tabQuick}
                active={tab === 'quick'}
                onPress={() => setTab('quick')}
                testID="tab-quick"
              />
            </View>
          ) : null}

          {tab === 'log' && !isEdit ? (
            selected ? (
              <SelectedFoodView
                selected={selected}
                servings={servings}
                onChangeServings={setServings}
                onBack={handleClearSelection}
                onSave={handleLogSave}
                submitting={submitting}
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
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}

function TabButton({ label, active, onPress, testID }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.tab, active && styles.tabActive]}
      testID={testID}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
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
}: LogSearchViewProps) {
  const showRecent = query.trim() === '';

  return (
    <View style={styles.flex}>
      <View style={styles.searchBox}>
        <TextField
          label=""
          value={query}
          onChangeText={onQueryChange}
          placeholder={COPY.log.search.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          testID="log-search"
        />
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
}

function SelectedFoodView({
  selected,
  servings,
  onChangeServings,
  onBack,
  onSave,
  submitting,
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
          label={submitting ? COPY.log.selected.saving : COPY.log.selected.logButton}
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
}

function QuickAddView({ draft, errors, onUpdate, onSave, submitting, isEdit }: QuickAddViewProps) {
  const defaultLabel = isEdit ? COPY.log.quickAdd.saveEdit : COPY.log.quickAdd.saveNew;
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  tabLabelActive: {
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  searchBox: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
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
