/**
 * Lightweight in-memory handoff for barcode scan results.
 *
 * The barcode scanner screen (`app/foods/scan.tsx`) sets a draft here, then
 * routes back to its caller. Using a module singleton instead of route params
 * keeps typed-routes simple and avoids serializing the full scan payload
 * through URL state.
 *
 * A draft carries a `destination` so each consumer only picks up the drafts
 * meant for it:
 *
 * - `'library'` → consumed by `app/foods/new.tsx` to seed the FoodForm for a
 *   "save this to my library" flow.
 * - `'log'`     → consumed by the Today screen (`app/(tabs)/index.tsx`), which
 *   reopens `AddMealSheet` with the scanned food pre-selected in the Log tab's
 *   servings-stepper view.
 *
 * Drafts are consumed exactly once (`takeScanDraft` clears them). This avoids
 * a stale draft leaking into a subsequent non-scan "Add food" tap.
 */
import type { FoodDraft } from './foodForm';
import type { NormalizedFood } from './foodNormalizers';

export type ScanDestination = 'library' | 'log';

/**
 * Library destination — the user wants to save a new food definition. We ship
 * the already-coerced FoodForm shape so `foods/new.tsx` can drop it straight
 * into the form without reconverting.
 */
export interface LibraryScanDraft {
  readonly destination: 'library';
  readonly initial: FoodDraft;
  readonly source: 'off' | 'manual';
  readonly sourceId: string | null;
  readonly barcode: string | null;
}

/**
 * Log destination — the user wants to log the scanned food right now. We ship
 * the NormalizedFood the AddMealSheet already knows how to consume (same shape
 * the USDA search path produces).
 */
export interface LogScanDraft {
  readonly destination: 'log';
  readonly food: NormalizedFood;
  readonly barcode: string | null;
}

export type ScanDraft = LibraryScanDraft | LogScanDraft;

let pending: ScanDraft | null = null;

export function setScanDraft(draft: ScanDraft): void {
  pending = draft;
}

export function takeScanDraft(): ScanDraft | null {
  const next = pending;
  pending = null;
  return next;
}

export function peekScanDraft(): ScanDraft | null {
  return pending;
}

// Test helper — not used by production code paths.
export function clearScanDraft(): void {
  pending = null;
}
