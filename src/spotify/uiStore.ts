// Penghubung global kecil: navigasi, toast, menu bawah (sheet), dan kotak isian.
import { createStore } from './store';

// Diisi oleh SpotifyPage saat tampil.
export const router = {
  go: (_v: string, _a?: string, _n?: string) => {},
  back: () => {},
};

// ---- toast ----
export const toastStore = createStore<{ msg: string; k: number }>({ msg: '', k: 0 });
export const toast = (msg: string) => toastStore.set({ msg, k: toastStore.get().k + 1 });

// ---- sheet (menu dari bawah) ----
export type SheetItem =
  | 'sep'
  | { label: string; icon?: string; active?: boolean; danger?: boolean; onSelect: () => void };

export interface SheetState {
  open: boolean;
  kind: 'menu' | 'queue';
  title: string;
  sub: string;
  items: SheetItem[];
}
export const sheetStore = createStore<SheetState>({ open: false, kind: 'menu', title: '', sub: '', items: [] });
export const openSheet = (title: string, items: SheetItem[], sub = '') => sheetStore.set({ open: true, kind: 'menu', title, sub, items });
export const openQueueSheet = () => sheetStore.set({ open: true, kind: 'queue', title: 'Antrean', sub: '', items: [] });
export const closeSheet = () => sheetStore.set({ open: false });

// ---- prompt (isian teks) ----
interface PromptState {
  open: boolean;
  title: string;
  placeholder: string;
  value: string;
}
export const promptStore = createStore<PromptState>({ open: false, title: '', placeholder: '', value: '' });
let promptResolve: ((v: string | null) => void) | null = null;
export function openPrompt(title: string, placeholder: string, value = ''): Promise<string | null> {
  promptStore.set({ open: true, title, placeholder, value });
  return new Promise((res) => {
    promptResolve = res;
  });
}
export function closePrompt(v: string | null) {
  promptStore.set({ open: false });
  promptResolve?.(v);
  promptResolve = null;
}
