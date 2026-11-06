import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { engine, engineStore, timeStore } from './engine';
import { useStore } from './store';
import { router, sheetStore } from './uiStore';
import { Cover, Eq, Icon, PromptHost, SheetHost, SpToast } from './ui';
import { FullPlayer } from './FullPlayer';
import {
  AlbumView, ArtistView, CategoryView, ChartsView, HomeView, LibraryView, LikedView, PlaylistView, RecentView, SearchView,
} from './views';

type Root = 'home' | 'search' | 'charts' | 'library';
interface Entry { v: string; a?: string; n?: string }

const TABS: { id: Root; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Cari', icon: 'search' },
  { id: 'charts', label: 'Tangga', icon: 'chart' },
  { id: 'library', label: 'Koleksi', icon: 'lib' },
];

function QueueList() {
  const s = useStore(engineStore);
  if (!s.queue.length) return <p className="py-6 text-center text-sm text-[#6a6455]">Antrean kosong</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {s.queue.map((t, i) => (
        <div key={t.id + i} role="button" tabIndex={0} onClick={() => engine.jump(i)} className={`sp-row flex items-center gap-2.5 p-2 cursor-pointer ${i === s.index ? 'sp-row-on' : ''}`}>
          <Cover src={t.cover} size={120} className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[13px] font-bold ${i === s.index ? 'text-[#d62828]' : ''}`}>{t.title}</p>
            <p className="truncate text-[11px] text-[#6a6455]">{t.artist}</p>
          </div>
          {i === s.index ? <span className="text-[#16883c]"><Eq on={s.playing} /></span> : (
            <button type="button" aria-label="Hapus dari antrean" onClick={(e) => { e.stopPropagation(); engine.removeFromQueue(i); }} className="flex h-8 w-8 items-center justify-center text-[#6a6455]"><Icon name="close" size={16} /></button>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const s = useStore(engineStore);
  const tm = useStore(timeStore);
  const t = s.queue[s.index];
  if (!t) return null;
  const pct = tm.d > 0 ? Math.min(100, (tm.t / tm.d) * 100) : 0;
  return (
    <div className="sp-mini-in fixed left-0 right-0 z-[41] px-3" style={{ bottom: 'calc(92px + env(safe-area-inset-bottom))' }}>
      <div role="button" tabIndex={0} onClick={onOpen} className="sp-card relative mx-auto flex w-full max-w-none cursor-pointer items-center gap-2.5 overflow-hidden bg-[#ffd93d] p-2 pr-2 md:max-w-md">
        <Cover src={t.cover} size={120} round className={`h-11 w-11 shrink-0 !border-2 !border-[#141414] ${s.playing ? 'sp-spin' : 'sp-spin sp-spin-paused'}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold leading-tight">{t.title}</p>
          <p className="truncate text-[11px] font-semibold text-[#141414]/70">{t.artist}</p>
        </div>
        <button type="button" aria-label={s.playing ? 'Jeda' : 'Putar'} onClick={(e) => { e.stopPropagation(); engine.toggle(); }} className="sp-btn sp-btn-green flex h-10 w-10 !rounded-full items-center justify-center"><Icon name={s.playing ? 'pause' : 'play'} size={16} fill /></button>
        <button type="button" aria-label="Berikutnya" onClick={(e) => { e.stopPropagation(); engine.next(true); }} className="sp-btn flex h-10 w-10 !rounded-full items-center justify-center bg-[#fffdf5]"><Icon name="next" size={16} fill /></button>
        <span className="absolute bottom-0 left-0 h-[3px] bg-[#141414]" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

export function SpotifyPage({ active }: { active: boolean }) {
  const [root, setRoot] = useState<Root>('home');
  const [stack, setStack] = useState<Entry[]>([]);
  const [full, setFull] = useState(false);
  const [ccKey, setCcKey] = useState(0);
  const dir = useRef<'r' | 'l' | 'f'>('f');
  const scrolls = useRef<number[]>([]);
  const stackRef = useRef<Entry[]>([]);
  stackRef.current = stack;
  const sheet = useStore(sheetStore);

  const go = useCallback((v: string, a?: string, n?: string) => {
    scrolls.current.push(window.scrollY);
    dir.current = 'r';
    setFull(false);
    const next = [...stackRef.current, { v, a, n }];
    try { window.history.pushState({ ...(window.history.state || {}), sp: next.length }, '', '/spotify'); } catch { /* abaikan */ }
    setStack(next);
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => {
    if (stackRef.current.length) window.history.back();
  }, []);

  useEffect(() => { router.go = go; router.back = back; }, [go, back]);

  // tombol back perangkat
  useEffect(() => {
    const pop = () => {
      if (!/^\/spotify/i.test(window.location.pathname)) return;
      const d = (window.history.state && window.history.state.sp) || 0;
      if (d < stackRef.current.length) {
        dir.current = 'l';
        const y = scrolls.current[d] ?? 0;
        scrolls.current.length = d;
        setStack(stackRef.current.slice(0, d));
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  // keluar dari halaman: tutup pemutar penuh
  useEffect(() => { if (!active) setFull(false); }, [active]);

  // kunci scroll saat pemutar penuh terbuka
  useEffect(() => {
    if (!active || !full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active, full]);

  const [enterKey, setEnterKey] = useState(0);
  const wasActive = useRef(active);
  useLayoutEffect(() => {
    if (active && !wasActive.current) { dir.current = 'f'; setEnterKey((k) => k + 1); }
    wasActive.current = active;
  }, [active]);

  const switchRoot = (r: Root) => {
    if (r === root && !stack.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const n = stackRef.current.length;
    if (n) { scrolls.current.length = 0; try { window.history.go(-n); } catch { /* abaikan */ } }
    dir.current = TABS.findIndex((t) => t.id === r) >= TABS.findIndex((t) => t.id === root) ? 'r' : 'l';
    setStack([]);
    setRoot(r);
    window.scrollTo(0, 0);
  };

  const top = stack[stack.length - 1];
  const animCls = dir.current === 'r' ? 'sp-in-right' : dir.current === 'l' ? 'sp-in-left' : 'sp-fade';

  const renderEntry = (e: Entry) => {
    switch (e.v) {
      case 'artist': return <ArtistView id={e.a || ''} name={e.n || ''} />;
      case 'album': return <AlbumView id={e.a || ''} />;
      case 'cat': return <CategoryView term={e.a || ''} name={e.n || ''} />;
      case 'charts': return <ChartsView initial={e.a} />;
      case 'playlist': return <PlaylistView id={e.a || ''} />;
      case 'liked': return <LikedView />;
      case 'recent': return <RecentView />;
      default: return null;
    }
  };

  const rootView = () => {
    switch (root) {
      case 'search': return <SearchView key={ccKey} />;
      case 'charts': return <ChartsView key={ccKey} />;
      case 'library': return <LibraryView />;
      default: return <HomeView key={ccKey} onCountry={() => setCcKey((k) => k + 1)} />;
    }
  };

  const idx = TABS.findIndex((t) => t.id === root);

  return (
    <div className="w-full" style={{ display: active ? 'block' : 'none' }} aria-hidden={!active}>
      <div key={`${enterKey}-${root}-${stack.length}`} className={`${animCls} pb-52`}>
        {top && (
          <button type="button" onClick={back} className="sp-chip mb-2 mt-1 flex items-center gap-1 !pl-2" aria-label="Kembali">
            <Icon name="left" size={14} />Kembali
          </button>
        )}
        {top ? renderEntry(top) : rootView()}
      </div>

      <MiniPlayer onOpen={() => setFull(true)} />

      <nav className="sp-tabs-in fixed bottom-0 left-0 right-0 z-40 border-t-[3px] border-[#141414] bg-[#fffdf5] px-3 pb-2 pt-2.5 sm:px-4" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <div className="relative mx-auto grid w-full max-w-none grid-cols-4 items-start text-center md:max-w-md">
          <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 flex h-[46px] w-1/4 justify-center transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]" style={{ transform: `translateX(${idx * 100}%)` }}>
            <span className="h-full w-12 rounded-2xl border-[2.5px] border-[#141414] bg-[#ffd93d] shadow-md" />
          </span>
          {TABS.map((t) => {
            const on = t.id === root;
            return (
              <button key={t.id} type="button" aria-label={t.label} onClick={() => switchRoot(t.id)} className="relative flex flex-col items-center justify-start gap-1 rounded-xl">
                <span className={`flex h-[46px] w-12 items-center justify-center ${on ? 'animate-nav-bounce' : ''}`}>
                  <Icon name={t.icon} size={20} className={`transition-colors duration-200 ${on ? 'text-[#141414]' : 'text-[#6a6455]'}`} />
                </span>
                <span className={`font-cyber text-[11px] uppercase leading-none tracking-wide transition-colors duration-200 sm:text-xs ${on ? 'text-[#d62828]' : 'text-[#6a6455]'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <FullPlayer open={full && active} onClose={() => setFull(false)} />
      {active && <SheetHost>{sheet.kind === 'queue' ? <QueueList /> : null}</SheetHost>}
      {active && <PromptHost />}
      {active && <SpToast />}
    </div>
  );
}
