import React, { memo, useEffect, useRef, useState } from 'react';
import { Album, ArtistLite, Track, art, fmt, pastel } from './catalog';
import { engine, engineStore } from './engine';
import { library, libStore, isLiked } from './library';
import { useStore } from './store';
import { openTrackMenu } from './menus';
import {
  router, sheetStore, closeSheet, promptStore, closePrompt, toastStore, openSheet, SheetItem,
} from './uiStore';

/* ------------------------------------------------------------------ */
/* Ikon (gaya garis tebal, mirip ikon lucide yang dipakai SnapTools)    */
/* ------------------------------------------------------------------ */
const P: Record<string, React.ReactNode> = {
  home: <><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  chart: <><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>,
  lib: <><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></>,
  play: <polygon points="6 3 20 12 6 21 6 3" />,
  pause: <><rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" /></>,
  prev: <><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" x2="5" y1="19" y2="5" /></>,
  next: <><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" x2="19" y1="5" y2="19" /></>,
  shuffle: <><path d="m18 14 4 4-4 4" /><path d="m18 2 4 4-4 4" /><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" /><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" /><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" /></>,
  repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>,
  repeat1: <><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /><path d="M11 10h1v4" /></>,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  more: <><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /><circle cx="5" cy="12" r="1.3" /></>,
  queue: <><path d="M3 6h13" /><path d="M3 12h13" /><path d="M3 18h7" /><polygon points="15 15 21 19 15 23 15 15" /></>,
  list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
  down: <path d="m6 9 6 6 6-6" />,
  left: <path d="m15 18-6-6 6-6" />,
  close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></>,
  edit: <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />,
  user: <><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></>,
  disc: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="2" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  volume: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></>,
  lyrics: <><path d="M17 6H3" /><path d="M21 12H8" /><path d="M21 18H8" /><path d="M3 12v6" /></>,
};

export function Icon({ name, size = 20, fill = false, stroke = 2.4, className = '' }: { name: string; size?: number; fill?: boolean; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden="true">
      {P[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hook kecil                                                           */
/* ------------------------------------------------------------------ */
export function useExit(open: boolean, ms = 240) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      return;
    }
    if (!render) return;
    setClosing(true);
    const id = window.setTimeout(() => {
      setRender(false);
      setClosing(false);
    }, ms);
    return () => window.clearTimeout(id);
  }, [open]);
  return { render: render || open, closing: closing && !open };
}

export function useCurrentId() {
  const s = useStore(engineStore);
  return { id: s.queue[s.index]?.id, playing: s.playing };
}

/* ------------------------------------------------------------------ */
/* Cover                                                                */
/* ------------------------------------------------------------------ */
export function Cover({ src, size = 300, className = '', round = false, label }: { src?: string; size?: number; className?: string; round?: boolean; label?: string }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  const shape = round ? 'rounded-full' : 'rounded-xl';
  if (!src || bad) {
    return (
      <div className={`sp-cover ${shape} ${className} flex items-center justify-center text-[#141414]`} style={{ background: pastel(label || 'x') }}>
        {label ? <span className="font-cyber text-3xl">{label.slice(0, 1).toUpperCase()}</span> : <Icon name="music" size={22} />}
      </div>
    );
  }
  return <img src={art(src, size)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBad(true)} className={`sp-cover ${shape} object-cover bg-[#efe3c3] ${className}`} />;
}

export function Eq({ on }: { on: boolean }) {
  return (
    <span className={`sp-eq ${on ? 'on' : ''}`} aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

export function HeartBtn({ track, size = 18, className = '' }: { track: Track; size?: number; className?: string }) {
  useStore(libStore);
  const on = isLiked(track.id);
  return (
    <button
      type="button"
      aria-label={on ? 'Hapus dari suka' : 'Suka'}
      onClick={(e) => { e.stopPropagation(); library.toggleLike(track); }}
      className={`flex items-center justify-center ${on ? 'text-[#d62828] sp-pop' : 'text-[#6a6455]'} ${className}`}
      key={on ? 'on' : 'off'}
    >
      <Icon name="heart" size={size} fill={on} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Baris lagu & kartu                                                   */
/* ------------------------------------------------------------------ */
interface RowProps { t: Track; i: number; list: Track[]; ctx: string; playlistId?: string; rank?: boolean }

export const TrackRow = memo(function TrackRow({ t, i, list, ctx, playlistId, rank }: RowProps) {
  const { id, playing } = useCurrentId();
  const isCur = id === t.id;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => (isCur ? engine.toggle() : engine.playList(list, i, ctx))}
      onKeyDown={(e) => { if (e.key === 'Enter') (isCur ? engine.toggle() : engine.playList(list, i, ctx)); }}
      data-track={t.id}
      className={`sp-row lift flex items-center gap-2.5 p-2 pr-1.5 cursor-pointer ${isCur ? 'sp-row-on' : ''}`}
    >
      {rank && <span className={`w-6 shrink-0 text-center font-cyber text-lg ${i < 3 ? 'text-[#d62828]' : 'text-[#141414]'}`}>{i + 1}</span>}
      <div className="relative shrink-0">
        <Cover src={t.cover} size={120} className="w-12 h-12" />
        {isCur && (
          <span className="absolute inset-0 rounded-xl bg-[#141414]/55 flex items-center justify-center text-[#4ade80]">
            <Eq on={playing} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13.5px] font-bold leading-tight ${isCur ? 'text-[#d62828]' : 'text-[#141414]'}`}>
          {t.title}
          {t.exp && <span className="ml-1.5 align-[1px] rounded-[3px] border border-[#141414] bg-[#ffd93d] px-1 text-[9px] font-extrabold">E</span>}
        </p>
        <p className="truncate text-xs text-[#6a6455] mt-0.5">
          {t.artistId ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); router.go('artist', t.artistId, t.artist); }} className="underline-offset-2 hover:underline text-left">{t.artist}</button>
          ) : t.artist}
        </p>
      </div>
      {t.dur > 0 && <span className="hidden min-[380px]:block text-[11px] tabular-nums text-[#6a6455] shrink-0">{fmt(t.dur)}</span>}
      <HeartBtn track={t} className="w-8 h-8" />
      <button type="button" aria-label="Menu lagu" onClick={(e) => { e.stopPropagation(); openTrackMenu(t, { playlistId }); }} className="w-8 h-8 flex items-center justify-center text-[#141414]">
        <Icon name="more" size={20} />
      </button>
    </div>
  );
});

export function TrackList({ list, ctx, playlistId, rank }: { list: Track[]; ctx: string; playlistId?: string; rank?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {list.map((t, i) => <TrackRow key={t.id + i} t={t} i={i} list={list} ctx={ctx} playlistId={playlistId} rank={rank} />)}
    </div>
  );
}

export const TrackCard = memo(function TrackCard({ t, i, list, ctx, rank }: RowProps) {
  const { id, playing } = useCurrentId();
  const isCur = id === t.id;
  return (
    <div role="button" tabIndex={0} onClick={() => (isCur ? engine.toggle() : engine.playList(list, i, ctx))} data-track={t.id} className="sp-card lift w-[138px] shrink-0 snap-start p-2 cursor-pointer">
      <div className="relative">
        <Cover src={t.cover} size={300} className="w-full aspect-square" />
        {rank && <span className="absolute left-1.5 top-1.5 rounded-full border-2 border-[#141414] bg-[#ffd93d] px-2 font-cyber text-sm leading-5">#{i + 1}</span>}
        <span className={`absolute right-1.5 bottom-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#141414] bg-[#4ade80] text-[#141414] shadow-sm`}>
          {isCur && playing ? <Eq on /> : <Icon name={isCur ? 'pause' : 'play'} size={14} fill />}
        </span>
      </div>
      <p className={`mt-2 truncate text-[13px] font-bold ${isCur ? 'text-[#d62828]' : ''}`}>{t.title}</p>
      <p className="truncate text-[11.5px] text-[#6a6455]">{t.artist}</p>
    </div>
  );
});

export function AlbumCard({ a }: { a: Album }) {
  return (
    <div role="button" tabIndex={0} onClick={() => router.go('album', a.cid, a.title)} className="sp-card lift w-[138px] shrink-0 snap-start p-2 cursor-pointer">
      <Cover src={a.cover} size={300} className="w-full aspect-square" />
      <p className="mt-2 truncate text-[13px] font-bold">{a.title}</p>
      <p className="truncate text-[11.5px] text-[#6a6455]">{a.year ? a.year + ' • ' : ''}{a.artist}</p>
    </div>
  );
}

export function ArtistCard({ a }: { a: ArtistLite }) {
  return (
    <div role="button" tabIndex={0} onClick={() => router.go('artist', a.id, a.name)} className="sp-card lift w-[138px] shrink-0 snap-start p-2 pb-2.5 cursor-pointer text-center">
      <Cover src={a.cover} size={300} round label={a.name} className="w-full aspect-square" />
      <p className="mt-2 truncate text-[13px] font-bold">{a.name}</p>
      <p className="text-[11.5px] text-[#6a6455]">Artis</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Judul bagian, rak, rak malas-muat                                    */
/* ------------------------------------------------------------------ */
export function SectionHead({ title, onAll, allLabel = 'Semua' }: { title: string; onAll?: () => void; allLabel?: string }) {
  return (
    <div className="mt-6 mb-2.5 flex items-end justify-between gap-2">
      <h2 className="font-cyber text-[22px] leading-none text-[#141414] relative inline-block">
        <span className="relative z-10">{title}</span>
        <span className="absolute left-0 right-0 bottom-0 h-2 bg-[#ffd93d] -z-0 -skew-x-6" aria-hidden="true" />
      </h2>
      {onAll && (
        <button type="button" onClick={onAll} className="sp-chip !py-0.5 !px-2.5 text-[11px] font-bold shrink-0">{allLabel} ›</button>
      )}
    </div>
  );
}

export function Shelf({ children }: { children: React.ReactNode }) {
  return <div className="sp-scroll-x -mx-3 flex gap-3 overflow-x-auto snap-x px-3 pb-4 pt-1">{children}</div>;
}

export function SkeletonShelf({ n = 6 }: { n?: number }) {
  return (
    <div className="-mx-3 flex gap-3 overflow-hidden px-3 pb-4 pt-1">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sp-card w-[138px] shrink-0 p-2">
          <div className="sp-skel aspect-square rounded-xl" />
          <div className="sp-skel mt-2 h-3 w-4/5 rounded" />
          <div className="sp-skel mt-1.5 h-2.5 w-3/5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ n = 8 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: n }, (_, i) => <div key={i} className="sp-skel h-[64px] rounded-[14px] border-2 border-[#141414]/20" />)}
    </div>
  );
}

type LazyKind = 'songs' | 'albums' | 'artists';
interface LazyProps {
  id: string;
  title: string;
  kind: LazyKind;
  load: () => Promise<any[]>;
  ctx?: string;
  rank?: boolean;
  onAll?: () => void;
  eager?: boolean;
}

export function LazyShelf({ id, title, kind, load, ctx, rank, onAll, eager }: LazyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<any[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'empty'>('idle');

  useEffect(() => {
    let dead = false;
    const run = async () => {
      setState('loading');
      try {
        const list = await load();
        if (dead) return;
        if (!list || !list.length) setState('empty');
        else { setItems(list); setState('ready'); }
      } catch {
        if (!dead) setState('empty');
      }
    };
    if (eager || typeof IntersectionObserver === 'undefined') { void run(); return () => { dead = true; }; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); void run(); } }, { rootMargin: '600px 0px' });
    io.observe(el);
    return () => { dead = true; io.disconnect(); };
  }, [id]);

  if (state === 'empty') return null;
  return (
    <section ref={ref} data-shelf={id}>
      <SectionHead title={title} onAll={onAll} />
      {state !== 'ready' || !items ? (
        <SkeletonShelf />
      ) : (
        <Shelf>
          {kind === 'songs' && (items as Track[]).map((t, i) => <TrackCard key={t.id} t={t} i={i} list={items as Track[]} ctx={ctx || title} rank={rank} />)}
          {kind === 'albums' && (items as Album[]).map((a) => <AlbumCard key={a.id} a={a} />)}
          {kind === 'artists' && (items as ArtistLite[]).map((a) => <ArtistCard key={a.id} a={a} />)}
        </Shelf>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet, prompt, toast                                                 */
/* ------------------------------------------------------------------ */
export function SheetHost({ children }: { children?: React.ReactNode }) {
  const s = useStore(sheetStore);
  const { render, closing } = useExit(s.open, 240);
  if (!render) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <div className={`absolute inset-0 bg-[#141414]/70 ${closing ? 'sp-fade-out' : 'sp-fade'}`} onClick={closeSheet} />
      <div className={`relative w-full max-w-md max-h-[78vh] flex flex-col rounded-t-3xl border-[3px] border-b-0 border-[#141414] bg-[#fffdf5] ${closing ? 'sp-sheet-down' : 'sp-sheet-up'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-[#141414]/25 shrink-0" />
        <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 shrink-0">
          <div className="min-w-0">
            <p className="font-cyber text-xl leading-tight truncate">{s.title}</p>
            {s.sub && <p className="text-xs text-[#6a6455] truncate">{s.sub}</p>}
          </div>
          <button type="button" aria-label="Tutup" onClick={closeSheet} className="sp-btn w-8 h-8 !rounded-full flex items-center justify-center shrink-0"><Icon name="close" size={16} /></button>
        </div>
        <div className="overflow-y-auto px-3 pb-4 min-h-0">
          {s.kind === 'queue' ? children : (
            <div className="flex flex-col gap-1.5">
              {s.items.map((it: SheetItem, i) =>
                it === 'sep' ? <hr key={i} className="my-1 border-t-2 border-dashed border-[#141414]/20" /> : (
                  <button key={i} type="button" onClick={it.onSelect}
                    className={`sp-row lift flex items-center gap-3 px-3 py-2.5 text-left text-sm font-bold ${it.active ? '!bg-[#ffd93d]' : ''} ${it.danger ? 'text-[#d62828]' : ''}`}>
                    {it.icon && <Icon name={it.icon} size={18} />}
                    <span className="truncate">{it.label}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PromptHost() {
  const s = useStore(promptStore);
  const { render, closing } = useExit(s.open, 200);
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (s.open) { setVal(s.value); setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 60); }
  }, [s.open]);
  if (!render) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-5">
      <div className={`absolute inset-0 bg-[#141414]/75 ${closing ? 'sp-fade-out' : 'sp-fade'}`} onClick={() => closePrompt(null)} />
      <form onSubmit={(e) => { e.preventDefault(); closePrompt(val.trim() || null); }} className={`sp-card relative w-full max-w-sm p-5 ${closing ? 'sp-fade-out' : 'animate-pop-in'}`}>
        <h3 className="font-cyber text-2xl mb-3">{s.title}</h3>
        <input ref={ref} value={val} onChange={(e) => setVal(e.target.value)} maxLength={60} placeholder={s.placeholder} autoComplete="off"
          className="w-full rounded-xl border-[2.5px] border-[#141414] bg-white px-3 py-2.5 text-sm font-semibold outline-none" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => closePrompt(null)} className="sp-btn px-4 py-2 text-sm font-bold">Batal</button>
          <button type="submit" className="sp-btn sp-btn-green px-4 py-2 text-sm font-bold">Simpan</button>
        </div>
      </form>
    </div>
  );
}

export function SpToast() {
  const s = useStore(toastStore);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!s.msg) return;
    setShow(true);
    const id = window.setTimeout(() => setShow(false), 2300);
    return () => window.clearTimeout(id);
  }, [s.k]);
  if (!show) return null;
  return (
    <div key={s.k} className="fixed left-1/2 z-[120] max-w-[88vw] -translate-x-1/2 rounded-2xl border-[2.5px] border-[#141414] bg-[#ffd93d] px-4 py-2.5 text-center text-xs font-bold text-[#141414] shadow-lg animate-toast bottom-44 pointer-events-none">
      {s.msg}
    </div>
  );
}

export { openSheet };
