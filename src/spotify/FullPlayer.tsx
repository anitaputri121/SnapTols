import React, { useEffect, useRef, useState } from 'react';
import { Track, fmt } from './catalog';
import { engine, engineStore, timeStore, currentTrack } from './engine';
import { fetchLyrics } from './lyrics';
import { useStore } from './store';
import { openQueueSheet, router, toast } from './uiStore';
import { openTrackMenu } from './menus';
import { Cover, HeartBtn, Icon, useExit } from './ui';

type Lyr = { synced: { t: number; text: string }[] | null; plain: string[] | null } | null;

function useLyrics(track: Track | undefined) {
  const [st, setSt] = useState<{ id?: string; loading: boolean; data: Lyr }>({ loading: false, data: null });
  useEffect(() => {
    if (!track) return;
    let dead = false;
    setSt({ id: track.id, loading: true, data: null });
    fetchLyrics(track)
      .then((d) => { if (!dead) setSt({ id: track.id, loading: false, data: d }); })
      .catch(() => { if (!dead) setSt({ id: track.id, loading: false, data: null }); });
    return () => { dead = true; };
  }, [track?.id]);
  return st;
}

function Seek() {
  const tm = useStore(timeStore);
  const [drag, setDrag] = useState<number | null>(null);
  const d = tm.d || 0;
  const v = drag ?? tm.t;
  const pct = d > 0 ? Math.min(100, (v / d) * 100) : 0;
  return (
    <div className="w-full">
      <input
        type="range" min={0} max={Math.max(1, d)} step={0.1} value={v} aria-label="Posisi lagu"
        onChange={(e) => setDrag(parseFloat(e.target.value))}
        onPointerUp={() => { if (drag != null) { engine.seek(drag); setDrag(null); } }}
        onKeyUp={() => { if (drag != null) { engine.seek(drag); setDrag(null); } }}
        onTouchEnd={() => { if (drag != null) { engine.seek(drag); setDrag(null); } }}
        className="sp-range w-full"
        style={{ ['--p' as any]: pct + '%' }}
      />
      <div className="mt-1 flex justify-between text-[11px] font-bold tabular-nums text-[#6a6455]">
        <span>{fmt(v)}</span><span>{fmt(d)}</span>
      </div>
    </div>
  );
}

function LyricsPane({ track }: { track: Track }) {
  const s = useStore(engineStore);
  const tm = useStore(timeStore);
  const L = useLyrics(track);
  const box = useRef<HTMLDivElement>(null);
  // Audio penuh yang durasinya jauh beda dari lagunya = versi lain, lirik bertanda waktu jadi meleset.
  const durOk = !track.dur || !tm.d || Math.abs(tm.d - track.dur) <= 8;
  const synced = s.mode === 'full' && durOk && L.data?.synced ? L.data.synced : null;
  let active = -1;
  if (synced) for (let i = 0; i < synced.length; i++) { if (synced[i].t <= tm.t + 0.25) active = i; else break; }

  useEffect(() => {
    if (!synced || active < 0 || !box.current) return;
    const el = box.current.querySelector<HTMLElement>(`[data-l="${active}"]`);
    if (el) box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [active, !!synced]);

  const lines: string[] | null = synced ? null : L.data?.plain || (L.data?.synced ? L.data.synced.map((x) => x.text) : null);

  return (
    <div ref={box} className="sp-lyrics h-full overflow-y-auto px-5 py-6 text-center" style={{ overscrollBehavior: 'contain' }}>
      {L.loading && <div className="flex flex-col gap-3 pt-10">{[70, 90, 55, 80, 65, 85].map((w, i) => <div key={i} className="sp-skel mx-auto h-5 rounded" style={{ width: w + '%' }} />)}</div>}
      {!L.loading && !L.data && (
        <div className="pt-16">
          <p className="font-cyber text-3xl">Lirik tidak ditemukan</p>
          <p className="mt-2 text-sm text-[#6a6455]">Lagu ini belum punya lirik di LRCLIB.</p>
        </div>
      )}
      {!L.loading && L.data && (
        <>
          {L.data.synced && s.mode === 'full' && !durOk && (
            <p className="mx-auto mb-4 max-w-[280px] rounded-xl border-2 border-[#141414] bg-[#ffd93d] px-3 py-1.5 text-[11px] font-bold">
              Durasi audio berbeda dari versi aslinya, jadi lirik ditampilkan tanpa sorotan otomatis.
            </p>
          )}
          {synced && synced.map((ln, i) => (
            <p key={i} data-l={i} onClick={() => engine.seek(ln.t)}
              className={`cursor-pointer py-1.5 font-cyber text-[26px] leading-tight transition-all duration-300 ${i === active ? 'scale-105 text-[#d62828]' : i < active ? 'text-[#141414]/35' : 'text-[#141414]/70'}`}>
              {ln.text || '♪'}
            </p>
          ))}
          {lines && lines.map((ln, i) => <p key={i} className="py-1 text-[17px] font-bold leading-snug text-[#141414]/85">{ln || ' '}</p>)}
          <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-[#6a6455]">Lirik: LRCLIB</p>
        </>
      )}
    </div>
  );
}

export function FullPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore(engineStore);
  const { render, closing } = useExit(open, 260);
  const [page, setPage] = useState(0);
  const pager = useRef<HTMLDivElement>(null);
  const t = s.queue[s.index];

  useEffect(() => { if (open) setPage(0); }, [open]);
  useEffect(() => { if (open && pager.current) pager.current.scrollTo({ left: 0 }); }, [open, t?.id]);

  if (!render || !t) return null;

  const goPage = (p: number) => {
    setPage(p);
    pager.current?.scrollTo({ left: p * (pager.current?.clientWidth || 0), behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = pager.current;
    if (!el) return;
    const p = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (p !== page) setPage(p);
  };

  return (
    <div className={`fixed inset-0 z-[80] flex flex-col bg-[#f5ecd7] ${closing ? 'sp-sheet-down' : 'sp-sheet-up'}`} style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <button type="button" aria-label="Tutup pemutar" onClick={onClose} className="sp-btn flex h-10 w-10 items-center justify-center"><Icon name="down" size={22} /></button>
        <div className="min-w-0 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#d62828]">Sedang diputar</p>
          <p className="truncate text-xs font-bold">{s.ctx}</p>
        </div>
        <button type="button" aria-label="Menu lagu" onClick={() => openTrackMenu(t)} className="sp-btn flex h-10 w-10 items-center justify-center"><Icon name="more" size={20} /></button>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        {['Sampul', 'Lirik'].map((l, i) => (
          <button key={l} type="button" onClick={() => goPage(i)} className={`sp-chip ${page === i ? 'on' : ''}`}>{l}</button>
        ))}
      </div>

      <div ref={pager} onScroll={onScroll} className="sp-pager mt-2 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden">
        <div className="flex h-full w-full shrink-0 snap-center items-center justify-center px-8">
          <div key={t.id} className="sp-pop w-full max-w-[340px] overflow-hidden rounded-3xl border-[3px] border-[#141414] bg-[#efe3c3] shadow-xl">
            <Cover src={t.cover} size={600} className="aspect-square w-full !rounded-none" />
          </div>
        </div>
        <div className="h-full w-full shrink-0 snap-center">
          <LyricsPane track={t} />
        </div>
      </div>

      <div className="flex justify-center gap-1.5 py-1.5" aria-hidden="true">
        {[0, 1].map((i) => <i key={i} className={`h-2 rounded-full border-2 border-[#141414] transition-all ${page === i ? 'w-6 bg-[#ffd93d]' : 'w-2 bg-transparent'}`} />)}
      </div>

      <div className="px-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-cyber text-[26px] leading-tight">{t.title}</p>
            <button type="button" onClick={() => { onClose(); if (t.artistId) router.go('artist', t.artistId, t.artist); }} className="max-w-full truncate text-left text-sm font-bold text-[#6a6455]">{t.artist}</button>
          </div>
          <HeartBtn track={t} size={26} className="h-10 w-10" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`rounded-full border-2 border-[#141414] px-2 text-[10px] font-extrabold ${!s.loading ? 'bg-[#4ade80]' : 'bg-[#ffd93d]'}`}>{s.loading ? 'Memuat audio…' : 'Audio penuh'}</span>
        </div>
        <div className="mt-2"><Seek /></div>
        <div className="mt-2 flex items-center justify-between">
          <button type="button" aria-label="Acak" onClick={() => { engine.toggleShuffle(); toast(engineStore.get().shuffle ? 'Acak: hidup' : 'Acak: mati'); }} className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.shuffle ? 'bg-[#ffd93d] border-2 border-[#141414]' : ''}`}><Icon name="shuffle" size={20} /></button>
          <button type="button" aria-label="Sebelumnya" onClick={() => engine.prev()} className="sp-btn flex h-12 w-12 items-center justify-center"><Icon name="prev" size={22} fill /></button>
          <button type="button" aria-label={s.playing ? 'Jeda' : 'Putar'} onClick={() => engine.toggle()} className="sp-btn sp-btn-green flex h-16 w-16 !rounded-full items-center justify-center"><Icon name={s.playing ? 'pause' : 'play'} size={28} fill /></button>
          <button type="button" aria-label="Berikutnya" onClick={() => engine.next(true)} className="sp-btn flex h-12 w-12 items-center justify-center"><Icon name="next" size={22} fill /></button>
          <button type="button" aria-label="Ulangi" onClick={() => engine.cycleRepeat()} className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.repeat ? 'bg-[#ffd93d] border-2 border-[#141414]' : ''}`}><Icon name={s.repeat === 2 ? 'repeat1' : 'repeat'} size={20} /></button>
        </div>
        <div className="mt-2 flex justify-center">
          <button type="button" onClick={openQueueSheet} className="sp-chip flex items-center gap-1.5"><Icon name="queue" size={14} />Antrean ({s.queue.length})</button>
        </div>
      </div>
    </div>
  );
}

export { currentTrack };
