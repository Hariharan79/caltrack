import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockGetByBarcode = jest.fn();
jest.mock('@/lib/foodLookup', () => ({
  getByBarcode: (...args: unknown[]) => mockGetByBarcode(...args),
  searchByText: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};
const mockNavigation = { setOptions: jest.fn() };
let mockParams: Record<string, string | string[] | undefined> = {};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => mockParams,
}));

interface MockPermission {
  granted: boolean;
  canAskAgain: boolean;
}
interface MockCameraState {
  permission: MockPermission;
  request: jest.Mock<Promise<MockPermission>, []>;
}
const mockCameraState: MockCameraState = {
  permission: { granted: false, canAskAgain: true },
  request: jest.fn<Promise<MockPermission>, []>(async () => {
    mockCameraState.permission = { granted: true, canAskAgain: true };
    return mockCameraState.permission;
  }),
};

jest.mock('expo-camera', () => ({
  __esModule: true,
  CameraView: () => null,
  useCameraPermissions: () => [
    mockCameraState.permission,
    mockCameraState.request,
  ],
}));

import ScanFoodScreen from '@/app/foods/scan';
import { clearScanDraft, peekScanDraft } from '@/lib/scanDraft';

beforeEach(() => {
  mockGetByBarcode.mockReset();
  mockRouter.push.mockReset();
  mockRouter.replace.mockReset();
  mockRouter.back.mockReset();
  mockNavigation.setOptions.mockReset();
  mockParams = {};
  mockCameraState.permission = { granted: false, canAskAgain: true };
  mockCameraState.request.mockClear();
  clearScanDraft();
});

describe('ScanFoodScreen', () => {
  it('renders the permission-denied state with a manual entry link', () => {
    mockCameraState.permission = { granted: false, canAskAgain: false };
    const { getByTestId } = render(<ScanFoodScreen />);
    expect(getByTestId('scan-permission-denied')).toBeTruthy();
    expect(getByTestId('scan-grant-permission')).toBeTruthy();
    expect(getByTestId('scan-open-manual')).toBeTruthy();
  });

  it('opens the manual entry form from the permission-denied state', () => {
    mockCameraState.permission = { granted: false, canAskAgain: false };
    const { getByTestId } = render(<ScanFoodScreen />);
    fireEvent.press(getByTestId('scan-open-manual'));
    expect(getByTestId('scan-manual')).toBeTruthy();
    expect(getByTestId('scan-manual-input')).toBeTruthy();
    expect(getByTestId('scan-manual-submit')).toBeTruthy();
  });

  it('rejects a non-numeric manual barcode without calling lookup', () => {
    mockCameraState.permission = { granted: false, canAskAgain: false };
    const { getByTestId, queryByTestId } = render(<ScanFoodScreen />);
    fireEvent.press(getByTestId('scan-open-manual'));
    fireEvent.changeText(getByTestId('scan-manual-input'), 'abc');
    fireEvent.press(getByTestId('scan-manual-submit'));
    expect(mockGetByBarcode).not.toHaveBeenCalled();
    // No loading/no-match screen; still in manual mode.
    expect(queryByTestId('scan-manual')).toBeTruthy();
  });

  it('submits a valid EAN-13 manual barcode, seeds the scan draft, and routes on hit', async () => {
    mockCameraState.permission = { granted: false, canAskAgain: false };
    mockGetByBarcode.mockResolvedValueOnce({
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
    });

    const { getByTestId } = render(<ScanFoodScreen />);
    fireEvent.press(getByTestId('scan-open-manual'));
    fireEvent.changeText(getByTestId('scan-manual-input'), '3017620422003');

    await act(async () => {
      fireEvent.press(getByTestId('scan-manual-submit'));
    });

    await waitFor(() => {
      expect(mockGetByBarcode).toHaveBeenCalledWith('3017620422003');
      expect(mockRouter.replace).toHaveBeenCalledWith('/foods/new');
    });

    const draft = peekScanDraft();
    expect(draft).not.toBeNull();
    expect(draft?.destination).toBe('library');
    if (draft?.destination !== 'library') throw new Error('expected library draft');
    expect(draft.barcode).toBe('3017620422003');
    expect(draft.source).toBe('off');
    expect(draft.initial.name).toBe('Ferrero — Nutella');
    expect(draft.initial.kcalPerServing).toBe('81');
  });

  it("routes back with a 'log' draft when destination is log and lookup hits", async () => {
    mockParams = { destination: 'log' };
    mockCameraState.permission = { granted: false, canAskAgain: false };
    mockGetByBarcode.mockResolvedValueOnce({
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
    });

    const { getByTestId } = render(<ScanFoodScreen />);
    fireEvent.press(getByTestId('scan-open-manual'));
    fireEvent.changeText(getByTestId('scan-manual-input'), '3017620422003');

    await act(async () => {
      fireEvent.press(getByTestId('scan-manual-submit'));
    });

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalled();
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();

    const draft = peekScanDraft();
    expect(draft).not.toBeNull();
    expect(draft?.destination).toBe('log');
    if (draft?.destination !== 'log') throw new Error('expected log draft');
    expect(draft.food.name).toBe('Nutella');
    expect(draft.food.kcalPerServing).toBe(81);
    expect(draft.barcode).toBe('3017620422003');
  });

  it("closes the scanner via router.back when the user taps 'enter macros by hand' in log destination", async () => {
    mockParams = { destination: 'log' };
    mockCameraState.permission = { granted: false, canAskAgain: false };
    mockGetByBarcode.mockResolvedValueOnce(null);

    const { getByTestId } = render(<ScanFoodScreen />);
    fireEvent.press(getByTestId('scan-open-manual'));
    fireEvent.changeText(getByTestId('scan-manual-input'), '0000000000000');

    await act(async () => {
      fireEvent.press(getByTestId('scan-manual-submit'));
    });

    await waitFor(() => expect(getByTestId('scan-no-match')).toBeTruthy());

    fireEvent.press(getByTestId('scan-fallback-manual'));
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(peekScanDraft()).toBeNull();
  });

  it('shows the no-match state when lookup returns null', async () => {
    mockCameraState.permission = { granted: false, canAskAgain: false };
    mockGetByBarcode.mockResolvedValueOnce(null);

    const { getByTestId } = render(<ScanFoodScreen />);
    fireEvent.press(getByTestId('scan-open-manual'));
    fireEvent.changeText(getByTestId('scan-manual-input'), '0000000000000');

    await act(async () => {
      fireEvent.press(getByTestId('scan-manual-submit'));
    });

    await waitFor(() => {
      expect(getByTestId('scan-no-match')).toBeTruthy();
    });
    expect(getByTestId('scan-fallback-manual')).toBeTruthy();
  });

  it('shows the error state when lookup throws', async () => {
    mockCameraState.permission = { granted: false, canAskAgain: false };
    mockGetByBarcode.mockRejectedValueOnce(new Error('network down'));

    const { getByTestId } = render(<ScanFoodScreen />);
    fireEvent.press(getByTestId('scan-open-manual'));
    fireEvent.changeText(getByTestId('scan-manual-input'), '3017620422003');

    await act(async () => {
      fireEvent.press(getByTestId('scan-manual-submit'));
    });

    await waitFor(() => {
      expect(getByTestId('scan-error')).toBeTruthy();
    });
    expect(getByTestId('scan-error-retry')).toBeTruthy();
  });
});
