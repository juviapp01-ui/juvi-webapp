import { create } from 'zustand';

// Same toast store the app uses (frontend/src/store/uiStore.ts).
interface UIState {
  toast: { message: string; type: 'success' | 'error' | 'info'; id: number } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type, id: Date.now() } }),
  clearToast: () => set({ toast: null }),
}));
