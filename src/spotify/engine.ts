// Mesin pemutar: satu elemen <audio> yang hidup di luar React, jadi musik terus
// berjalan walau halaman Spotify ditutup. Hanya memutar audio penuh dari API nexadev
// (tanpa preview 30 detik). Kalau lagunya tidak ditemukan, pemutar berhenti dan memberi tahu.
import { Track, resolveFullAudio, forgetFullAudio, art } from './catalog';
import { createStore, ls } from './store';
import { library } from './library';
import { toast } from './uiStore';

export type Mode = 'full';
export interface EngineState {
  queue: Track[];
  index: number;
  playing: boolean;
  mode: Mode;
  shuffle: boolean;
  repeat: 0 | 1 | 2; // 0 mati, 1 ulangi antrean, 2 ulangi satu lagu
  ctx: string;
  loading: boolean;
}

export const engineStore = createStore<EngineState>({
  queue: [],
  index: -1,
  playing: false,
  mode: 'full',
  shuffle: false,
  repeat: 0,
  ctx: 'SnapTools Music',
  loading: false,
});
export const timeStore = createStore({ t: 0, d: 0 });

const au: HTMLAudioElement | null = typeof Audio !== 'undefined' ? new Audio() : null;
if (au) {
  au.preload = 'auto';
  au.volume = Math.min(1, Math.max(0, ls.get('vol', 0.85)));
}

let played = new Set<number>();
let backStack: number[] = [];

export const currentTrack = (): Track | undefined => {
  const s = engineStore.get();
  return s.queue[s.index];
};

function setMediaSession(t: Track) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: t.album,
      artwork: t.cover ? [{ src: art(t.cover, 512), sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', () => void au?.play());
    navigator.mediaSession.setActionHandler('pause', () => au?.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => engine.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => engine.next(true));
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d.seekTime != null) engine.seek(d.seekTime);
    });
  } catch {
    /* tidak didukung browser ini */
  }
}

let token = 0;
let needsReload = false; // true bila lagu sekarang gagal dimuat: ketuk putar = coba lagi

// Hentikan audio dan lepaskan sumbernya supaya tidak memutar sisa lagu sebelumnya
function clearSource() {
  if (!au) return;
  au.pause();
  au.removeAttribute('src');
  au.load();
}

function load() {
  const t = currentTrack();
  if (!t || !au) return;
  const tk = ++token;
  needsReload = false;
  engineStore.set({ mode: 'full', loading: true, playing: true });
  timeStore.set({ t: 0, d: t.dur });
  clearSource();
  played.add(engineStore.get().index);
  library.pushRecent(t);
  setMediaSession(t);
  void (async () => {
    // Hanya audio penuh. Tunggu sampai API menjawab (ada batas waktu di resolveFullAudio).
    const url = await resolveFullAudio(t);
    if (tk !== token || !au) return;
    if (!url) {
      needsReload = true;
      engineStore.set({ loading: false, playing: false });
      toast('Audio lagu ini tidak ditemukan. Ketuk putar untuk coba lagi, atau pilih lagu lain.');
      return;
    }
    engineStore.set({ mode: 'full', loading: false });
    au.src = url;
    void au.play().catch(() => engineStore.set({ playing: false }));
  })();
}

function pickNext(manual: boolean): number {
  const { queue, index, shuffle, repeat } = engineStore.get();
  if (!queue.length) return -1;
  if (shuffle && queue.length > 1) {
    const left = queue.map((_, i) => i).filter((i) => !played.has(i) && i !== index);
    if (left.length) return left[Math.floor(Math.random() * left.length)];
    if (repeat === 1 || manual) {
      played = new Set([index]);
      const all = queue.map((_, i) => i).filter((i) => i !== index);
      return all[Math.floor(Math.random() * all.length)];
    }
    return -1;
  }
  if (index < queue.length - 1) return index + 1;
  return repeat === 1 || manual ? 0 : -1;
}

export const engine = {
  playList(list: Track[], i: number, ctx?: string) {
    if (!list[i]) return;
    played = new Set();
    backStack = [];
    engineStore.set({ queue: list.slice(), index: i, ctx: ctx || engineStore.get().ctx });
    load();
  },
  toggle() {
    if (!au || !currentTrack()) return;
    if (engineStore.get().loading) return;
    if (needsReload) {
      load();
      return;
    }
    if (au.paused) void au.play().catch(() => {});
    else au.pause();
  },
  next(manual = false) {
    const n = pickNext(manual);
    if (n < 0) {
      au?.pause();
      if (au) au.currentTime = 0;
      engineStore.set({ playing: false });
      return;
    }
    backStack.push(engineStore.get().index);
    engineStore.set({ index: n });
    load();
  },
  prev() {
    if (!au) return;
    if (au.currentTime > 3) {
      au.currentTime = 0;
      return;
    }
    const s = engineStore.get();
    if (backStack.length) {
      engineStore.set({ index: backStack.pop() as number });
      load();
    } else if (s.index > 0) {
      engineStore.set({ index: s.index - 1 });
      load();
    } else au.currentTime = 0;
  },
  seek(sec: number) {
    if (!au) return;
    try {
      au.currentTime = Math.max(0, sec);
    } catch {
      /* abaikan */
    }
    timeStore.set({ t: au.currentTime });
  },
  jump(i: number) {
    const s = engineStore.get();
    if (!s.queue[i]) return;
    if (i === s.index) {
      engine.toggle();
      return;
    }
    backStack.push(s.index);
    engineStore.set({ index: i });
    load();
  },
  addToQueue(t: Track, nextUp: boolean): 'started' | 'queued' {
    const s = engineStore.get();
    if (!s.queue.length || s.index < 0) {
      engine.playList([t], 0);
      return 'started';
    }
    const q = s.queue.slice();
    if (nextUp) q.splice(s.index + 1, 0, t);
    else q.push(t);
    played = new Set([s.index]);
    engineStore.set({ queue: q });
    return 'queued';
  },
  removeFromQueue(i: number) {
    const s = engineStore.get();
    if (i === s.index || !s.queue[i]) return;
    const q = s.queue.slice();
    q.splice(i, 1);
    played = new Set([i < s.index ? s.index - 1 : s.index]);
    engineStore.set({ queue: q, index: i < s.index ? s.index - 1 : s.index });
  },
  toggleShuffle() {
    played = new Set(engineStore.get().index >= 0 ? [engineStore.get().index] : []);
    engineStore.set({ shuffle: !engineStore.get().shuffle });
  },
  cycleRepeat(): number {
    const r = ((engineStore.get().repeat + 1) % 3) as 0 | 1 | 2;
    engineStore.set({ repeat: r });
    return r;
  },
  setVolume(v: number) {
    if (au) au.volume = v;
    ls.set('vol', v);
  },
  volume: () => (au ? au.volume : 1),
};

if (au) {
  au.addEventListener('play', () => engineStore.set({ playing: true }));
  au.addEventListener('pause', () => { if (!engineStore.get().loading) engineStore.set({ playing: false }); });
  au.addEventListener('ended', () => {
    if (engineStore.get().repeat === 2) {
      au.currentTime = 0;
      void au.play().catch(() => {});
    } else engine.next(false);
  });
  au.addEventListener('timeupdate', () => {
    const t = currentTrack();
    const d = Number.isFinite(au.duration) && au.duration > 0 ? au.duration : t ? t.dur : 0;
    timeStore.set({ t: au.currentTime, d });
  });
  au.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(au.duration) && au.duration > 0) timeStore.set({ d: au.duration });
  });
  au.addEventListener('error', () => {
    const t = currentTrack();
    if (!t || !au.getAttribute('src')) return;
    // Audio gagal dimuat: berhenti di lagu ini (tidak loncat ke lagu lain), ketuk putar untuk coba lagi
    forgetFullAudio(t.id);
    needsReload = true;
    engineStore.set({ loading: false, playing: false });
    toast('Gagal memutar audio. Ketuk putar untuk coba lagi.');
  });
}
