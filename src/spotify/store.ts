// Penyimpanan kecil berbasis "external store" supaya state musik tetap hidup
// walau halaman Spotify ditutup (musik lanjut saat pindah ke Tools / Beranda).
import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface Store<T> {
  get: () => T;
  set: (patch: Partial<T>) => void;
  sub: (l: Listener) => () => void;
}

export function createStore<T extends object>(init: T): Store<T> {
  let state = init;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    sub: (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export function useStore<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(store.sub, store.get, store.get);
}

// ---- localStorage aman (bisa gagal di mode privat) ----
export const ls = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem('snap_sp_' + key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem('snap_sp_' + key, JSON.stringify(value));
    } catch {
      /* abaikan */
    }
  },
};
