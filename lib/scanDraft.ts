/**
 * Lightweight in-memory handoff for barcode scan results.
 *
 * The barcode scanner screen (`app/foods/scan.tsx`) sets a draft here, then
 * routes to `app/foods/new.tsx`, which consumes it on mount. Using a module
 * singleton instead of route params keeps typed-routes simple and avoids
 * serializing the full `NormalizedFood` through URL state.
 *
 * Drafts are consumed exactly once (`takeScanDraft` clears them). This avoids
 * a stale draft leaking into a subsequent non-scan "Add food" tap.
 */
import type { FoodDraft } from './foodForm';

export interface ScanDraft {
  readonly initial: FoodDraft;
  readonly source: 'off' | 'manual';
  readonly sourceId: string | null;
  readonly barcode: string | null;
}

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
