import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  message: string;
  onConfirm: (() => void) | null;
}

interface UIState {
  confirm: ConfirmState;
  showConfirm: (message: string, onConfirm: () => void) => void;
  hideConfirm: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  confirm: { isOpen: false, message: '', onConfirm: null },
  showConfirm: (message, onConfirm) =>
    set({ confirm: { isOpen: true, message, onConfirm } }),
  hideConfirm: () =>
    set({ confirm: { isOpen: false, message: '', onConfirm: null } }),
}));
