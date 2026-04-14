import {
  setScanDraft,
  takeScanDraft,
  peekScanDraft,
  clearScanDraft,
  type LibraryScanDraft,
  type LogScanDraft,
} from '@/lib/scanDraft';

const libraryDraft: LibraryScanDraft = {
  destination: 'library',
  initial: {
    name: 'Ferrero — Nutella',
    servingSize: '15 g',
    kcalPerServing: '81',
    proteinGPerServing: '1',
    carbsGPerServing: '8.6',
    fatGPerServing: '4.7',
  },
  source: 'off',
  sourceId: '3017620422003',
  barcode: '3017620422003',
};

const logDraft: LogScanDraft = {
  destination: 'log',
  food: {
    source: 'off',
    sourceId: '3017620422003',
    name: 'Nutella',
    brand: 'Ferrero',
    servingSize: '15 g',
    kcalPerServing: 81,
    proteinG: 1,
    carbsG: 8.6,
    fatG: 4.7,
    imageUrl: null,
  },
  barcode: '3017620422003',
};

beforeEach(() => {
  clearScanDraft();
});

describe('scanDraft', () => {
  it('round-trips a library draft through set/take', () => {
    setScanDraft(libraryDraft);
    const taken = takeScanDraft();
    expect(taken).toEqual(libraryDraft);
    // consumed exactly once
    expect(peekScanDraft()).toBeNull();
    expect(takeScanDraft()).toBeNull();
  });

  it('round-trips a log draft through set/take', () => {
    setScanDraft(logDraft);
    const taken = takeScanDraft();
    expect(taken).not.toBeNull();
    if (taken?.destination !== 'log') throw new Error('expected log destination');
    expect(taken.food.kcalPerServing).toBe(81);
    expect(taken.barcode).toBe('3017620422003');
    expect(takeScanDraft()).toBeNull();
  });

  it('peek does not consume the pending draft', () => {
    setScanDraft(libraryDraft);
    expect(peekScanDraft()).toEqual(libraryDraft);
    expect(peekScanDraft()).toEqual(libraryDraft);
    expect(takeScanDraft()).toEqual(libraryDraft);
  });

  it('clear wipes a pending draft', () => {
    setScanDraft(libraryDraft);
    clearScanDraft();
    expect(peekScanDraft()).toBeNull();
    expect(takeScanDraft()).toBeNull();
  });

  it('overwrites an existing pending draft when set twice', () => {
    setScanDraft(libraryDraft);
    setScanDraft(logDraft);
    const taken = takeScanDraft();
    expect(taken?.destination).toBe('log');
  });
});
