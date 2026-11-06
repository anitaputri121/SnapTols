import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Search, Share2 } from 'lucide-react';

// ====== PENGATURAN ======
const API = 'https://api-faa.my.id/faa/youtube?q=';
const HOME_QUERY = 'musik indonesia terbaru';
const CATEGORIES: [string, string][] = [
  ['Semua', HOME_QUERY],
  ['Musik', 'lagu terbaru 2026'],
  ['DJ', 'dj remix terbaru'],
  ['Game', 'gameplay mobile legends'],
  ['Podcast', 'podcast indonesia'],
  ['Berita', 'berita terkini'],
  ['Film', 'trailer film terbaru'],
  ['Masak', 'resep masakan'],
  ['Teknologi', 'review hp terbaru'],
  ['Pemrograman', 'belajar pemrograman'],
  ['Olahraga', 'highlight sepak bola'],
  ['Komedi', 'stand up comedy indonesia'],
  ['Anime', 'anime terbaru sub indo'],
];
// Tinggi header SnapTools (px) — supaya pemutar menempel tepat di bawahnya
const HEADER_H = 58;
// ========================

interface Vid {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: string;
  img: string;
}

const COLORS = ['#c2185b', '#6a1b9a', '#283593', '#00695c', '#ef6c00', '#4e342e', '#455a64', '#2e7d32', '#ad1457', '#1565c0'];

function colorFor(name: string) {
  let h = 0;
  const s = name || '';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
function initial(name: string) {
  const m = (name || '?').match(/[A-Za-z0-9\u00C0-\uFFFF]/);
  return m ? m[0].toUpperCase() : '?';
}
function videoId(url: string) {
  const s = String(url || '');
  const m = s.match(/[?&]v=([\w-]{6,})/) || s.match(/youtu\.be\/([\w-]{6,})/) || s.match(/shorts\/([\w-]{6,})/);
  return m ? m[1] : null;
}

// ---- Data ----
function parseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // Antisipasi nilai status tanpa tanda kutip (mis. benar / salah)
    return JSON.parse(text.replace(/:\s*benar\b/g, ': true').replace(/:\s*salah\b/g, ': false'));
  }
}
function findList(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  const keys = Object.keys(d);
  for (const k of keys) {
    const x = d[k];
    if (Array.isArray(x) && x.length && typeof x[0] === 'object') return x;
  }
  for (const k of keys) {
    const y = d[k];
    if (y && typeof y === 'object' && !Array.isArray(y)) {
      const r = findList(y);
      if (r.length) return r;
    }
  }
  return [];
}
function norm(v: any): Vid | null {
  if (!v || typeof v !== 'object') return null;
  const url = v.tautan || v.link || v.url || v.videoUrl || v.href || '';
  const imgSrc = v.imageUrl || v.thumbnail || v.image || v.thumb || '';
  const id = videoId(url) || v.videoId || v.id || (String(imgSrc).match(/\/vi(?:_webp)?\/([\w-]{6,})\//) || [])[1];
  if (typeof id !== 'string' || !/^[\w-]{6,}$/.test(id)) return null;
  let ch = v.saluran || v.channel || v.author || v.channelName || '';
  if (ch && typeof ch === 'object') ch = ch.name || '';
  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: String(v.title || v.judul || ''),
    channel: String(ch || ''),
    duration: String(v.durasi || v.duration || v.timestamp || ''),
    img: imgSrc || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

// Disimpan di luar komponen supaya hasil tidak hilang saat pindah tab
const store: { home: Vid[]; chip: number; q: string; byId: Record<string, Vid> } = {
  home: [],
  chip: 0,
  q: HOME_QUERY,
  byId: {},
};
try {
  store.byId = JSON.parse(sessionStorage.getItem('snaptube_byId') || '{}');
} catch {
  /* abaikan */
}
function persistById() {
  try {
    const keys = Object.keys(store.byId);
    if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((k) => delete store.byId[k]);
    sessionStorage.setItem('snaptube_byId', JSON.stringify(store.byId));
  } catch {
    /* abaikan */
  }
}

function fetchList(query: string): Promise<Vid[]> {
  return fetch(API + encodeURIComponent(query))
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then((t) => {
      const list = findList(parseJson(t))
        .map(norm)
        .filter((x): x is Vid => !!x);
      list.forEach((v) => {
        store.byId[v.id] = v;
      });
      persistById();
      return list;
    });
}

function getV(): string | null {
  try {
    const v = new URLSearchParams(window.location.search).get('v');
    return v && /^[\w-]{6,}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ---- Potongan tampilan ----
const Avatar: React.FC<{ name: string; size?: string }> = ({ name, size = 'w-9 h-9 text-sm' }) => (
  <div
    className={`${size} rounded-full border-2 border-[#141414] shrink-0 flex items-center justify-center font-extrabold text-white`}
    style={{ background: colorFor(name) }}
  >
    {initial(name)}
  </div>
);

const Thumb: React.FC<{ v: Vid; className?: string }> = ({ v, className = '' }) => (
  <div className={`relative aspect-video bg-[#efe3c3] overflow-hidden ${className}`}>
    <img
      src={v.img}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => {
        const el = e.currentTarget;
        const fallback = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
        if (el.src !== fallback) el.src = fallback;
      }}
      className="w-full h-full object-cover block"
    />
    {v.duration && (
      <span className="absolute right-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md bg-[#141414] text-[#fffdf5] text-[11px] font-bold leading-none">
        {v.duration}
      </span>
    )}
  </div>
);

const onKeyActivate = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

const VideoCard: React.FC<{ v: Vid; onOpen: (v: Vid) => void }> = ({ v, onOpen }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onOpen(v)}
    onKeyDown={onKeyActivate(() => onOpen(v))}
    className="sp-card lift cursor-pointer overflow-hidden"
  >
    <Thumb v={v} className="border-b-[2.5px] border-[#141414]" />
    <div className="flex gap-2.5 p-3">
      <Avatar name={v.channel} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-snug line-clamp-2">{v.title}</p>
        <p className="text-xs text-[#6a6455] mt-1 truncate">{v.channel}</p>
      </div>
    </div>
  </div>
);

const VideoRow: React.FC<{ v: Vid; onOpen: (v: Vid) => void }> = ({ v, onOpen }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onOpen(v)}
    onKeyDown={onKeyActivate(() => onOpen(v))}
    className="sp-row lift flex gap-2.5 p-2 cursor-pointer"
  >
    <Thumb v={v} className="w-36 shrink-0 rounded-lg border-2 border-[#141414]" />
    <div className="min-w-0 flex-1 py-0.5">
      <p className="text-[13px] font-bold leading-snug line-clamp-2">{v.title}</p>
      <p className="text-[11px] text-[#6a6455] mt-1 truncate">{v.channel}</p>
    </div>
  </div>
);

const SkeletonCard: React.FC = () => (
  <div className="sp-card overflow-hidden">
    <div className="sp-skel aspect-video border-b-[2.5px] border-[#141414]" />
    <div className="flex gap-2.5 p-3">
      <div className="sp-skel w-9 h-9 rounded-full border-2 border-[#141414] shrink-0" />
      <div className="flex-1 pt-1">
        <div className="sp-skel h-3.5 rounded-md mb-2" />
        <div className="sp-skel h-3 w-1/2 rounded-md" />
      </div>
    </div>
  </div>
);

const SkeletonRow: React.FC = () => (
  <div className="sp-row flex gap-2.5 p-2">
    <div className="sp-skel w-36 aspect-video shrink-0 rounded-lg border-2 border-[#141414]" />
    <div className="flex-1 pt-1">
      <div className="sp-skel h-3 rounded-md mb-2" />
      <div className="sp-skel h-3 w-2/3 rounded-md" />
    </div>
  </div>
);

// ---- Halaman utama SnapTube ----
export const SnapTubePage: React.FC = () => {
  const [watchId, setWatchId] = useState<string | null>(getV);
  const [home, setHome] = useState<Vid[]>(store.home);
  const [chip, setChip] = useState<number>(store.chip);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(store.home.length ? 'ready' : 'loading');
  const [err, setErr] = useState('');
  const [related, setRelated] = useState<Vid[]>([]);
  const [relLoading, setRelLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const token = useRef(0);
  const depth = useRef<number>(Number((window.history.state && window.history.state.st) || 0));

  const load = useCallback((q: string) => {
    const my = ++token.current;
    store.q = q;
    setStatus('loading');
    setErr('');
    fetchList(q)
      .then((list) => {
        if (my !== token.current) return;
        store.home = list;
        setHome(list);
        setStatus('ready');
      })
      .catch((e: any) => {
        if (my !== token.current) return;
        store.home = [];
        setHome([]);
        setErr((e && e.message) || 'Tidak diketahui');
        setStatus('error');
      });
  }, []);

  // Muat beranda pertama kali
  useEffect(() => {
    if (!store.home.length) load(store.q || HOME_QUERY);
  }, [load]);

  // Tombol back perangkat: ikuti ?v=
  useEffect(() => {
    const onPop = () => {
      setWatchId(getV());
      depth.current = Number((window.history.state && window.history.state.st) || 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Video lainnya: hasil beranda dulu, lalu tambah dari pencarian judul
  useEffect(() => {
    if (!watchId) return;
    window.scrollTo(0, 0);
    const seen = new Set<string>([watchId]);
    const first = home.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
    setRelated(first);
    setRelLoading(true);
    let alive = true;
    const cur = store.byId[watchId];
    fetchList((cur && cur.title) || store.q || HOME_QUERY)
      .then((list) => {
        if (!alive) return;
        setRelated((prev) => {
          const s = new Set<string>([watchId, ...prev.map((p) => p.id)]);
          return [...prev, ...list.filter((v) => !s.has(v.id))];
        });
      })
      .catch(() => {})
      .then(() => {
        if (alive) setRelLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchId]);

  const openVideo = (v: Vid) => {
    store.byId[v.id] = v;
    persistById();
    const n = depth.current + 1;
    try {
      window.history.pushState({ ...(window.history.state || {}), st: n }, '', `${window.location.pathname}?v=${v.id}`);
      depth.current = n;
    } catch {
      /* abaikan */
    }
    setCopied(false);
    setWatchId(v.id);
  };

  // Kembali ke daftar video
  const goList = () => {
    if (depth.current > 0) {
      window.history.go(-depth.current); // popstate akan mengosongkan watchId
      return;
    }
    try {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    } catch {
      /* abaikan */
    }
    setWatchId(null);
  };

  // Keluar dari halaman tonton tanpa menambah riwayat (untuk pencarian / kategori)
  const resetToList = () => {
    if (!watchId) return;
    try {
      window.history.replaceState({ ...(window.history.state || {}), st: 0 }, '', window.location.pathname);
    } catch {
      /* abaikan */
    }
    depth.current = 0;
    setWatchId(null);
  };

  const pickChip = (i: number) => {
    setChip(i);
    store.chip = i;
    setQuery('');
    resetToList();
    load(CATEGORIES[i][1]);
    window.scrollTo(0, 0);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setChip(-1);
    store.chip = -1;
    resetToList();
    load(q);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  const current: Vid | null = watchId
    ? store.byId[watchId] || { id: watchId, url: `https://www.youtube.com/watch?v=${watchId}`, title: '', channel: '', duration: '', img: '' }
    : null;

  const share = async () => {
    if (!current) return;
    const link = `https://youtu.be/${current.id}`;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        ok = true;
      }
    } catch {
      /* lanjut ke cara lama */
    }
    if (!ok) ok = legacyCopy(link);
    if (!ok) {
      window.prompt('Salin tautan ini:', link);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  // ===== Halaman tonton =====
  if (current) {
    const origin = /^https?:/.test(window.location.origin) ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
    return (
      <div className="pb-8">
        {/* Pemutar menempel di bawah header supaya video tetap terlihat saat scroll */}
        <div
          className="sticky z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 pb-3 pt-1"
          style={{ top: HEADER_H, backgroundColor: 'var(--cream)' }}
        >
          <div className="aspect-video w-full overflow-hidden rounded-2xl border-[2.5px] border-[#141414] bg-black shadow-[4px_4px_0_#141414]">
            <iframe
              key={current.id}
              title={current.title || 'Pemutar video'}
              src={`https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0&playsinline=1${origin}`}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full border-0 block"
            />
          </div>
        </div>

        {/* Judul + akun + tombol */}
        <div className="sp-card p-3.5 mt-1">
          <h1 className="text-base font-extrabold leading-snug break-words">{current.title || 'Memutar video'}</h1>
          <div className="mt-3 flex items-center gap-2.5 min-w-0">
            <Avatar name={current.channel} />
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{current.channel || 'YouTube'}</p>
            <button
              type="button"
              onClick={share}
              className={`sp-btn inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-extrabold ${copied ? 'sp-btn-green' : 'sp-btn-yellow'}`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? 'Tersalin' : 'Bagikan'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={goList} className="sp-btn inline-flex h-9 items-center gap-1.5 px-3 text-xs font-extrabold">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </button>
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sp-btn inline-flex h-9 items-center gap-1.5 px-3 text-xs font-extrabold"
            >
              <ExternalLink className="h-4 w-4" />
              Buka di YouTube
            </a>
          </div>
        </div>

        {/* Video lainnya */}
        <p className="font-cyber mt-5 mb-2.5 text-sm tracking-wider text-[#6a6455]">VIDEO LAINNYA</p>
        <div className="flex flex-col gap-3">
          {related.map((v) => (
            <VideoRow key={v.id} v={v} onOpen={openVideo} />
          ))}
          {relLoading && !related.length && [0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          {!relLoading && !related.length && (
            <div className="sp-card p-5 text-center text-sm text-[#6a6455]">Belum ada video lainnya.</div>
          )}
        </div>
      </div>
    );
  }

  // ===== Beranda video =====
  return (
    <div className="pb-8">
      <form onSubmit={submit} className="flex items-center gap-2" role="search" autoComplete="off">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Telusuri video"
          aria-label="Telusuri video"
          className="h-11 min-w-0 flex-1 rounded-2xl border-[2.5px] border-[#141414] bg-[#fffdf5] px-4 text-sm font-semibold text-[#141414] shadow-[3px_3px_0_#141414] placeholder:text-[#6a6455]"
        />
        <button
          type="submit"
          aria-label="Telusuri"
          className="sp-btn sp-btn-yellow flex h-11 w-11 shrink-0 items-center justify-center !rounded-2xl"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>

      <div className="sp-scroll-x -mx-3 sm:-mx-4 mt-3 flex gap-2 overflow-x-auto px-3 sm:px-4 pb-2 pt-1">
        {CATEGORIES.map(([label], i) => (
          <button key={label} type="button" onClick={() => pickChip(i)} className={`sp-chip shrink-0 ${chip === i ? 'on' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {status === 'loading' && [0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}

        {status === 'error' && (
          <div className="sp-card p-6 text-center">
            <p className="text-base font-extrabold">Gagal memuat video</p>
            <p className="mt-1 text-xs text-[#6a6455]">Periksa koneksi internet kamu, lalu coba lagi. ({err})</p>
            <button
              type="button"
              onClick={() => load(store.q || HOME_QUERY)}
              className="sp-btn sp-btn-yellow mt-4 inline-flex h-9 items-center px-4 text-xs font-extrabold"
            >
              Coba lagi
            </button>
          </div>
        )}

        {status === 'ready' && !home.length && (
          <div className="sp-card p-6 text-center">
            <p className="text-base font-extrabold">Tidak ada hasil</p>
            <p className="mt-1 text-xs text-[#6a6455]">Coba kata kunci lain.</p>
          </div>
        )}

        {status === 'ready' && home.map((v) => <VideoCard key={v.id} v={v} onOpen={openVideo} />)}
      </div>
    </div>
  );
};

export default SnapTubePage;
