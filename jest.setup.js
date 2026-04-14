process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// expo-camera is a native module — not usable in Jest. Tests override
// useCameraPermissions per-test via jest.mock to exercise permission states.
jest.mock('expo-camera', () => ({
  __esModule: true,
  CameraView: () => null,
  useCameraPermissions: () => [
    { granted: false, canAskAgain: true },
    jest.fn(async () => ({ granted: false, canAskAgain: true })),
  ],
}));
