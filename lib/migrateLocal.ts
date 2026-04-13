import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

const LEGACY_KEY = 'caltrack-store';
const MIGRATION_DONE_KEY = 'caltrack-v2-migrated';

interface LegacyEntry {
  id?: unknown;
  name?: unknown;
  calories?: unknown;
  proteinG?: unknown;
  carbsG?: unknown;
  fatG?: unknown;
  loggedAt?: unknown;
  dayKey?: unknown;
}

interface NormalizedEntry {
  name: string;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string;
  day_key: string;
}

export interface MigrateResult {
  migrated: number;
  skipped: 'already-done' | 'no-legacy' | 'empty' | 'malformed' | null;
}

function normalizeEntry(raw: LegacyEntry): NormalizedEntry | null {
  if (
    typeof raw.name !== 'string' ||
    typeof raw.calories !== 'number' ||
    typeof raw.loggedAt !== 'string' ||
    typeof raw.dayKey !== 'string'
  ) {
    return null;
  }
  const nullableNumber = (v: unknown): number | null =>
    typeof v === 'number' ? v : null;
  return {
    name: raw.name.trim(),
    kcal: raw.calories,
    protein_g: nullableNumber(raw.proteinG),
    carbs_g: nullableNumber(raw.carbsG),
    fat_g: nullableNumber(raw.fatG),
    logged_at: raw.loggedAt,
    day_key: raw.dayKey,
  };
}

async function markDone(): Promise<void> {
  await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
  await AsyncStorage.removeItem(LEGACY_KEY);
}

export async function migrateLegacyEntries(userId: string): Promise<MigrateResult> {
  const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
  if (done === 'true') {
    return { migrated: 0, skipped: 'already-done' };
  }

  const raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) {
    await markDone();
    return { migrated: 0, skipped: 'no-legacy' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await markDone();
    return { migrated: 0, skipped: 'malformed' };
  }

  const legacyState = (parsed as { state?: { entries?: unknown } } | null)?.state;
  const legacyEntries = Array.isArray(legacyState?.entries)
    ? (legacyState!.entries as LegacyEntry[])
    : [];

  if (legacyEntries.length === 0) {
    await markDone();
    return { migrated: 0, skipped: 'empty' };
  }

  const normalized = legacyEntries
    .map(normalizeEntry)
    .filter((e): e is NormalizedEntry => e !== null)
    .map((e) => ({ ...e, user_id: userId }));

  if (normalized.length === 0) {
    await markDone();
    return { migrated: 0, skipped: 'malformed' };
  }

  const { error } = await supabase.from('log_entries').insert(normalized);
  if (error) {
    throw new Error(`Legacy migration failed: ${error.message}`);
  }

  await markDone();
  return { migrated: normalized.length, skipped: null };
}
