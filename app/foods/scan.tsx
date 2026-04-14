import { useState, useCallback, useLayoutEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { COPY } from '@/lib/copy';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getByBarcode, type NormalizedFood } from '@/lib/foodLookup';
import { setScanDraft, type ScanDestination } from '@/lib/scanDraft';
import type { FoodDraft } from '@/lib/foodForm';

type Mode = 'camera' | 'manual';

function parseDestination(raw: string | string[] | undefined): ScanDestination {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'log' ? 'log' : 'library';
}

type LookupState =
  | { kind: 'idle' }
  | { kind: 'looking-up'; code: string }
  | { kind: 'no-match'; code: string }
  | { kind: 'error'; message: string; code: string };

const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e'];
const BARCODE_PATTERN = /^[0-9]{8,14}$/;

function normalizedFoodToDraft(food: NormalizedFood): FoodDraft {
  const name = food.brand ? `${food.brand} — ${food.name}` : food.name;
  return {
    name,
    servingSize: food.servingSize ?? '',
    kcalPerServing: String(food.kcalPerServing),
    proteinGPerServing: food.proteinG == null ? '' : String(food.proteinG),
    carbsGPerServing: food.carbsG == null ? '' : String(food.carbsG),
    fatGPerServing: food.fatG == null ? '' : String(food.fatG),
  };
}

function blankDraftWithBarcode(): FoodDraft {
  return {
    name: '',
    servingSize: '',
    kcalPerServing: '',
    proteinGPerServing: '',
    carbsGPerServing: '',
    fatGPerServing: '',
  };
}

export default function ScanFoodScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ destination?: string }>();
  const destination = useMemo(() => parseDestination(params.destination), [params.destination]);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('camera');
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupState>({ kind: 'idle' });
  // Once a barcode has fired, we ignore subsequent onBarcodeScanned events
  // until the user explicitly retries. Using a ref so the camera callback
  // sees the latest value without forcing a re-render.
  const consumedRef = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={COPY.barcode.closeLabel}
          hitSlop={12}
          testID="scan-close"
        >
          <Text style={styles.headerAction}>{COPY.foods.library.closeAction}</Text>
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const performLookup = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (trimmed === '') return;
      setLookup({ kind: 'looking-up', code: trimmed });
      try {
        const food = await getByBarcode(trimmed);
        if (food) {
          if (destination === 'log') {
            setScanDraft({
              destination: 'log',
              food,
              barcode: trimmed,
            });
            router.back();
          } else {
            setScanDraft({
              destination: 'library',
              initial: normalizedFoodToDraft(food),
              source: 'off',
              sourceId: food.sourceId,
              barcode: trimmed,
            });
            router.replace('/foods/new');
          }
          return;
        }
        setLookup({ kind: 'no-match', code: trimmed });
      } catch (err) {
        const message = err instanceof Error ? err.message : COPY.barcode.lookupFailed;
        setLookup({ kind: 'error', message, code: trimmed });
      }
    },
    [destination, router]
  );

  const handleCameraScan = useCallback(
    ({ data }: { data: string }) => {
      if (consumedRef.current) return;
      consumedRef.current = true;
      void performLookup(data);
    },
    [performLookup]
  );

  const resetScanner = useCallback(() => {
    consumedRef.current = false;
    setLookup({ kind: 'idle' });
    setManualValue('');
    setManualError(null);
  }, []);

  const handleManualSubmit = useCallback(() => {
    const trimmed = manualValue.trim();
    if (!BARCODE_PATTERN.test(trimmed)) {
      setManualError(COPY.barcode.manualInvalid);
      return;
    }
    setManualError(null);
    void performLookup(trimmed);
  }, [manualValue, performLookup]);

  const goToManualEntry = useCallback(() => {
    // "Enter macros by hand" only makes sense for the library destination —
    // it seeds a blank FoodForm the user will fill out manually. For the log
    // destination the natural fallback is to bounce back to the meal sheet,
    // where the Quick add tab already exists for by-hand entry. We keep this
    // path simple: close the scanner and let the user tap Quick add.
    if (destination === 'log') {
      router.back();
      return;
    }
    setScanDraft({
      destination: 'library',
      initial: blankDraftWithBarcode(),
      source: 'manual',
      sourceId: null,
      barcode: lookup.kind === 'no-match' || lookup.kind === 'error' ? lookup.code : null,
    });
    router.replace('/foods/new');
  }, [destination, lookup, router]);

  // ---------- Lookup overlay states (cover both camera and manual modes) ----------

  if (lookup.kind === 'looking-up') {
    return (
      <View style={styles.centered} testID="scan-looking-up">
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.statusText}>{COPY.barcode.lookingUp(lookup.code)}</Text>
      </View>
    );
  }

  if (lookup.kind === 'no-match') {
    return (
      <View style={styles.centered} testID="scan-no-match">
        <Text style={styles.statusText}>{COPY.barcode.noMatch}</Text>
        <PrimaryButton
          label={COPY.barcode.fallbackToManual}
          onPress={goToManualEntry}
          style={styles.actionButton}
          testID="scan-fallback-manual"
        />
        <Pressable onPress={resetScanner} hitSlop={12} testID="scan-retry">
          <Text style={styles.linkText}>{COPY.barcode.retry}</Text>
        </Pressable>
      </View>
    );
  }

  if (lookup.kind === 'error') {
    return (
      <View style={styles.centered} testID="scan-error">
        <Text style={styles.statusText}>{COPY.barcode.lookupFailed}</Text>
        <PrimaryButton
          label={COPY.barcode.retry}
          onPress={resetScanner}
          style={styles.actionButton}
          testID="scan-error-retry"
        />
      </View>
    );
  }

  // ---------- Manual entry mode ----------

  if (mode === 'manual') {
    return (
      <View style={styles.manualContainer} testID="scan-manual">
        <Text style={styles.manualTitle}>{COPY.barcode.manualTitle}</Text>
        <TextField
          label={COPY.barcode.manualTitle}
          value={manualValue}
          onChangeText={(v) => {
            setManualValue(v);
            if (manualError) setManualError(null);
          }}
          placeholder={COPY.barcode.manualPlaceholder}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          error={manualError ?? undefined}
          testID="scan-manual-input"
        />
        <PrimaryButton
          label={COPY.barcode.manualSubmit}
          onPress={handleManualSubmit}
          style={styles.actionButton}
          testID="scan-manual-submit"
        />
        <Pressable
          onPress={() => {
            setMode('camera');
            setManualError(null);
          }}
          hitSlop={12}
          testID="scan-manual-back"
        >
          <Text style={styles.linkText}>{COPY.barcode.retry}</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- Camera mode ----------

  if (!permission) {
    return (
      <View style={styles.centered} testID="scan-permission-pending">
        <Text style={styles.statusText}>{COPY.barcode.permissionPending}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered} testID="scan-permission-denied">
        <Text style={styles.statusText}>
          {permission.canAskAgain
            ? COPY.barcode.permissionPending
            : COPY.barcode.permissionDenied}
        </Text>
        <PrimaryButton
          label={COPY.barcode.grantButton}
          onPress={() => void requestPermission()}
          style={styles.actionButton}
          testID="scan-grant-permission"
        />
        <Pressable
          onPress={() => setMode('manual')}
          hitSlop={12}
          testID="scan-open-manual"
        >
          <Text style={styles.linkText}>{COPY.barcode.manualLink}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer} testID="scan-camera">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={handleCameraScan}
      />
      <View style={styles.overlayTop}>
        <Text style={styles.overlayHint}>{COPY.barcode.overlayHint}</Text>
      </View>
      <View style={styles.overlayBottom}>
        <Pressable
          onPress={() => setMode('manual')}
          hitSlop={12}
          testID="scan-overlay-manual"
        >
          <Text style={styles.linkText}>{COPY.barcode.manualLink}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayTop: {
    position: 'absolute',
    top: SPACING.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayHint: {
    color: '#fff',
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: SPACING.xxxl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  statusText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  actionButton: {
    marginTop: SPACING.md,
    minWidth: 200,
  },
  linkText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  manualContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  manualTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginBottom: SPACING.md,
  },
  headerAction: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    paddingHorizontal: SPACING.sm,
  },
});
