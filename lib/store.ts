import { create } from 'zustand';

interface AppState {
  _storeVersion: number;
}

export const useAppStore = create<AppState>(() => ({
  _storeVersion: 1,
}));
