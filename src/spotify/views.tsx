import React, { useEffect, useRef, useState } from 'react';
import {
  Album, ArtistLite, Track, ccName, flag, getAlbum, getAlbumChart, getArtist, getCC, getChart, pastel,
  searchAlbums, searchArtists, searchSongs, setCC, COUNTRIES,
} from './catalog';
import { engine, engineStore } from './engine';
import { library, libStore } from './library';
import { useStore } from './store';
import { createPlaylistFlow, openCountryMenu } from './menus';
import { router, openPrompt, toast } from './uiStore';
import {
  AlbumCard, ArtistCard, Cover, Icon, LazyShelf, SectionHead, Shelf, SkeletonRows, SkeletonShelf, TrackCard, TrackList,
} from './ui';

/* ---------------- util ---------------- */
function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [s, setS] = useState<{ data: T | null; err: string | null; loading: boolean }>({ data: null, err: null, loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let dead = false;
    setS({ data: null, err: null, loading: true });
    fn().then((d) => { if (!dead) setS({ data: d, err: null, loading: false }); })
      .catch((e) => { if (!dead) setS({ data: null, err: (e && e.message) || 'Gagal memuat', loading: false }); });
    return () => { dead = true; };
  }, [...deps, n]);
  return { ...s, retry: () => setN((x) => x + 1) };
}

function playAll(list: Track[], ctx: string, shuffle = false) {
  if (!list.length) return;
  if (shuffle) {
    if (!engineStore.get().shuffle) engine.toggleShuffle();
    engine.playList(list, Math.floor(Math.random() * list.length), ctx);
  } else {
    if (engineStore.get().shuffle) engine.toggleShuffle();
    engine.playList(list, 0, ctx);
  }
}

function ErrorBox({ msg, onRetry }: { msg?: string | null; onRetry?: () => void }) {
  return (
    <div className="sp-card mt-6 p-6 text-center">
      <p className="font-cyber text-2xl">Gagal memuat</p>
      <p className="mt-1 text-sm text-[#6a6455]">{msg || 'Periksa koneksi internet kamu.'}</p>
      {onRetry && <button type="button" onClick={onRetry} className="sp-btn sp-btn-yellow mt-4 px-5 py-2 text-sm font-bold">Coba lagi</button>}
    </div>
  );
}

function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="sp-card mt-4 p-6 text-center">
      <p className="font-cyber text-2xl">{title}</p>
      {text && <p className="mt-1 text-sm text-[#6a6455]">{text}</p>}
    </div>
  );
}

function PlayButtons({ list, ctx }: { list: Track[]; ctx: string }) {
  if (!list.length) return null;
  return (
    <div className="mt-3 flex items-center gap-2.5">
      <button type="button" onClick={() => playAll(list, ctx)} className="sp-btn sp-btn-green flex h-12 items-center gap-2 px-5 text-sm font-extrabold">
        <Icon name="play" size={18} fill /> PUTAR
      </button>
      <button type="button" onClick={() => playAll(list, ctx, true)} className="sp-btn sp-btn-yellow flex h-12 items-center gap-2 px-4 text-sm font-extrabold">
        <Icon name="shuffle" size={18} /> ACAK
      </button>
    </div>
  );
}

function Hero({ kicker, title, sub, cover, round, label, children, tint }: {
  kicker: string; title: string; sub?: React.ReactNode; cover?: React.ReactNode; round?: boolean; label?: string; children?: React.ReactNode; tint?: string;
}) {
  return (
    <div className="sp-card sp-in-pop mt-1 flex items-center gap-4 p-4" style={{ background: tint ? `linear-gradient(135deg, ${tint} 0%, #fffdf5 78%)` : undefined }}>
      {cover !== undefined && (
        <div className={`h-[104px] w-[104px] shrink-0 overflow-hidden border-[2.5px] border-[#141414] bg-[#efe3c3] shadow-md ${round ? 'rounded-full' : 'rounded-2xl'}`}>
          {cover}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#d62828]">{kicker}</p>
        <h1 className="font-cyber text-[30px] leading-[1.02] break-words">{title}</h1>
        {sub && <p className="mt-1 text-xs text-[#6a6455] truncate">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

const mosaic = (tracks: Track[]) =>
  tracks.length >= 4 ? (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2">
      {tracks.slice(0, 4).map((t, i) => <Cover key={i} src={t.cover} size={120} className="!rounded-none !border-0 h-full w-full" />)}
    </div>
  ) : tracks[0] ? <Cover src={tracks[0].cover} size={300} className="!rounded-none !border-0 h-full w-full" /> : (
    <div className="flex h-full w-full items-center justify-center bg-[#ffd93d]"><Icon name="music" size={36} /></div>
  );

/* ---------------- HOME ---------------- */
const GENRE_SHELVES: [string, string][] = [
  ['lagu galau indonesia', 'Galau Malam Ini'], ['pop indonesia terbaik', 'Pop Indonesia'], ['dangdut koplo', 'Dangdut & Koplo'],
  ['indie indonesia', 'Indie Senja'], ['hip hop', 'Hip-Hop Pilihan'], ['k-pop', 'K-Pop Hits'], ['j-pop anime', 'Anime & J-Pop'],
  ['lofi chill', 'Lo-Fi untuk Fokus'], ['edm party', 'Pesta EDM'], ['acoustic', 'Akustik Santai'], ['rock klasik', 'Rock Klasik'],
  ['rnb soul', 'R&B & Soul'], ['latin hits', 'Latin Hits'], ['country', 'Country Roads'], ['jazz', 'Jazz Malam'],
  ['90s hits', 'Nostalgia 90an'], ['2000s hits', 'Hits 2000an'], ['workout', 'Semangat Olahraga'], ['sleep', 'Pengantar Tidur'], ['reggae', 'Reggae Vibes'],
];

export function HomeView({ onCountry }: { onCountry: () => void }) {
  const lib = useStore(libStore);
  const cc = getCC();
  const chart = useAsync(() => getChart(cc), [cc]);
  const h = new Date().getHours();
  const greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';
  const list = chart.data || [];
  const quick = (lib.recent.length >= 6 ? lib.recent : lib.liked.length >= 6 ? lib.liked : list).slice(0, 8);
  const artists: ArtistLite[] = [];
  const seen = new Set<string>();
  list.forEach((t) => { if (t.artistId && !seen.has(t.artistId)) { seen.add(t.artistId); artists.push({ id: t.artistId, name: t.artist, cover: t.cover }); } });

  return (
    <div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <h1 className="font-cyber text-[32px] leading-none">{greet}</h1>
        <button type="button" onClick={() => openCountryMenu(onCountry)} className="sp-btn flex h-9 items-center gap-1.5 px-3 text-xs font-extrabold" aria-label="Ganti negara katalog">
          <span className="text-base leading-none">{flag(cc)}</span>{cc}<Icon name="down" size={14} />
        </button>
      </div>

      {quick.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {quick.map((t, i) => (
            <div key={t.id} role="button" tabIndex={0} onClick={() => engine.playList(quick, i, 'SnapTools Music')} className="sp-row lift flex items-center gap-2 overflow-hidden p-1.5 cursor-pointer" data-track={t.id}>
              <Cover src={t.cover} size={120} className="h-11 w-11 shrink-0" />
              <span className="line-clamp-2 text-[12.5px] font-bold leading-tight">{t.title}</span>
            </div>
          ))}
        </div>
      )}
      {chart.loading && quick.length === 0 && <div className="mt-4 grid grid-cols-2 gap-2.5">{Array.from({ length: 6 }, (_, i) => <div key={i} className="sp-skel h-14 rounded-[14px]" />)}</div>}

      {lib.recent.length > 0 && (<><SectionHead title="Terakhir diputar" onAll={() => router.go('recent')} /><Shelf>{lib.recent.slice(0, 20).map((t, i) => <TrackCard key={t.id} t={t} i={i} list={lib.recent} ctx="Terakhir Diputar" />)}</Shelf></>)}
      {lib.liked.length > 0 && (<><SectionHead title="Lagu yang kamu suka" onAll={() => router.go('liked')} /><Shelf>{lib.liked.slice(0, 20).map((t, i) => <TrackCard key={t.id} t={t} i={i} list={lib.liked} ctx="Lagu yang Disukai" />)}</Shelf></>)}

      <SectionHead title={`Lagu Trending • ${ccName(cc)}`} onAll={() => router.go('charts', cc)} />
      {chart.loading && <SkeletonShelf />}
      {chart.err && list.length === 0 && quick.length === 0 && <ErrorBox msg={chart.err} onRetry={chart.retry} />}
      {list.length > 0 && <Shelf>{list.slice(0, 30).map((t, i) => <TrackCard key={t.id} t={t} i={i} list={list} ctx={`Trending ${ccName(cc)}`} rank />)}</Shelf>}

      {artists.length > 0 && (<><SectionHead title="Artis Populer" /><Shelf>{artists.slice(0, 24).map((a) => <ArtistCard key={a.id} a={a} />)}</Shelf></>)}

      <LazyShelf id={'alb' + cc} title="Album Populer" kind="albums" load={() => getAlbumChart(cc)} />
      {cc !== 'US' && <LazyShelf id="chart-us" title="Tangga Lagu Amerika" kind="songs" rank ctx="Top Amerika" load={() => getChart('US').then((l) => l.slice(0, 30))} onAll={() => router.go('charts', 'US')} />}
      {cc !== 'KR' && <LazyShelf id="chart-kr" title="Tangga Lagu Korea" kind="songs" rank ctx="Top Korea" load={() => getChart('KR').then((l) => l.slice(0, 30))} onAll={() => router.go('charts', 'KR')} />}
      {cc !== 'JP' && <LazyShelf id="chart-jp" title="Tangga Lagu Jepang" kind="songs" rank ctx="Top Jepang" load={() => getChart('JP').then((l) => l.slice(0, 30))} onAll={() => router.go('charts', 'JP')} />}
      {GENRE_SHELVES.map(([term, title], i) => (
        <LazyShelf key={cc + term} id={'g' + cc + i} title={title} kind="songs" ctx={title} load={() => searchSongs(term, 30)} onAll={() => router.go('cat', term, title)} />
      ))}
    </div>
  );
}

/* ---------------- CARI ---------------- */
const CATS: [string, string][] = [
  ['Pop', 'pop hits'], ['Indonesia', 'lagu indonesia'], ['Galau', 'lagu galau'], ['Hip-Hop', 'hip hop'], ['K-Pop', 'k-pop'], ['Rock', 'rock'],
  ['Dangdut', 'dangdut'], ['Lo-Fi', 'lofi'], ['EDM', 'edm'], ['Jazz', 'jazz'], ['R&B', 'r&b'], ['Akustik', 'acoustic'],
  ['Anime', 'anime opening'], ['J-Pop', 'j-pop'], ['Latin', 'latin'], ['Country', 'country'], ['Reggae', 'reggae'], ['Klasik', 'classical'],
  ['Metal', 'metal'], ['Indie', 'indie'], ['Religi', 'religi islam sholawat'], ['Nostalgia 90an', '90s hits'], ['Workout', 'workout'], ['Tidur', 'sleep'],
];

interface SearchData { q: string; songs: Track[]; albums: Album[]; artists: ArtistLite[] }

export function SearchView({ initial }: { initial?: string }) {
  const lib = useStore(libStore);
  const [q, setQ] = useState(initial || '');
  const [tab, setTab] = useState<'all' | 'songs' | 'artists' | 'albums'>('all');
  const [data, setData] = useState<SearchData | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const tok = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setState('idle'); setData(null); return; }
    const my = ++tok.current;
    setState('loading');
    const id = window.setTimeout(async () => {
      const [s, al, ar] = await Promise.allSettled([searchSongs(term, 40), searchAlbums(term, 14), searchArtists(term, 8)]);
      if (my !== tok.current) return;
      if (s.status === 'rejected' && al.status === 'rejected' && ar.status === 'rejected') { setState('error'); return; }
      setData({ q: term, songs: s.status === 'fulfilled' ? s.value : [], albums: al.status === 'fulfilled' ? al.value : [], artists: ar.status === 'fulfilled' ? ar.value : [] });
      setState('ready');
    }, 380);
    return () => window.clearTimeout(id);
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    input.current?.blur();
    if (q.trim().length >= 2) library.pushSearch(q.trim());
  };

  const artists: ArtistLite[] = (data?.artists || []).map((a) => {
    const t = data?.songs.find((x) => x.artistId === a.id);
    return { ...a, cover: t?.cover };
  });

  return (
    <div>
      <h1 className="font-cyber mt-1 text-[32px] leading-none">Cari</h1>
      <form onSubmit={submit} className="mt-3 flex items-center gap-2.5 rounded-2xl border-[2.5px] border-[#141414] bg-white px-3 shadow-md">
        <Icon name="search" size={20} />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lagu, artis, atau album" autoComplete="off" enterKeyHint="search"
          className="sp-plain h-12 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#6a6455]/70" />
        {q && <button type="button" aria-label="Hapus" onClick={() => { setQ(''); input.current?.focus(); }} className="text-[#6a6455]"><Icon name="close" size={18} /></button>}
      </form>

      {state === 'idle' && (
        <>
          {lib.searches.length > 0 && (
            <>
              <SectionHead title="Pencarian terakhir" onAll={() => library.clearSearches()} allLabel="Hapus" />
              <div className="flex flex-wrap gap-2">
                {lib.searches.map((s) => <button key={s} type="button" onClick={() => setQ(s)} className="sp-chip">{s}</button>)}
              </div>
            </>
          )}
          <SectionHead title="Jelajahi semua" />
          <div className="grid grid-cols-2 gap-3">
            {CATS.map(([name, term]) => (
              <button key={name} type="button" onClick={() => router.go('cat', term, name)} className="sp-card lift relative h-[88px] overflow-hidden p-3 text-left" style={{ background: pastel(name) }}>
                <span className="font-cyber text-[22px] leading-none">{name}</span>
                <span className="absolute -bottom-3 -right-3 h-14 w-14 rotate-12 rounded-xl border-2 border-[#141414] bg-[#fffdf5]/55" />
              </button>
            ))}
          </div>
        </>
      )}

      {state === 'loading' && <div className="mt-5"><SkeletonRows n={6} /></div>}
      {state === 'error' && <ErrorBox onRetry={() => setQ(q + ' ')} />}

      {state === 'ready' && data && (
        <>
          <div className="sp-scroll-x mt-4 flex gap-2 overflow-x-auto pb-1">
            {([['all', 'Semua'], ['songs', 'Lagu'], ['artists', 'Artis'], ['albums', 'Album']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`sp-chip ${tab === k ? 'on' : ''}`}>{l}</button>
            ))}
          </div>
          {!data.songs.length && !data.albums.length && !artists.length && <Empty title={`Tidak ada hasil untuk “${data.q}”`} text="Coba kata kunci lain atau ejaan yang berbeda." />}
          {tab === 'all' && (
            <>
              {data.songs[0] && (
                <>
                  <SectionHead title="Hasil teratas" />
                  <div role="button" tabIndex={0} onClick={() => engine.playList(data.songs, 0, 'Hasil pencarian')} className="sp-card lift relative flex items-center gap-4 p-4 cursor-pointer" style={{ background: pastel(data.songs[0].title) }}>
                    <Cover src={data.songs[0].cover} size={300} className="h-24 w-24 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-cyber text-[26px] leading-none truncate">{data.songs[0].title}</p>
                      <p className="mt-1 text-sm font-bold truncate">{data.songs[0].artist}</p>
                      <span className="mt-2 inline-block rounded-full border-2 border-[#141414] bg-[#fffdf5] px-2.5 text-[11px] font-extrabold">Lagu</span>
                    </div>
                    <span className="absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#141414] bg-[#4ade80] shadow-sm"><Icon name="play" size={16} fill /></span>
                  </div>
                  <SectionHead title="Lagu" onAll={() => setTab('songs')} />
                  <TrackList list={data.songs.slice(0, 6)} ctx="Hasil pencarian" />
                </>
              )}
              {artists.length > 0 && (<><SectionHead title="Artis" onAll={() => setTab('artists')} /><Shelf>{artists.map((a) => <ArtistCard key={a.id} a={a} />)}</Shelf></>)}
              {data.albums.length > 0 && (<><SectionHead title="Album" onAll={() => setTab('albums')} /><Shelf>{data.albums.map((a) => <AlbumCard key={a.id} a={a} />)}</Shelf></>)}
            </>
          )}
          {tab === 'songs' && <div className="mt-3"><TrackList list={data.songs} ctx="Hasil pencarian" /></div>}
          {tab === 'artists' && <div className="mt-3 flex flex-wrap gap-3">{artists.map((a) => <ArtistCard key={a.id} a={a} />)}</div>}
          {tab === 'albums' && <div className="mt-3 flex flex-wrap gap-3">{data.albums.map((a) => <AlbumCard key={a.id} a={a} />)}</div>}
        </>
      )}
    </div>
  );
}

/* ---------------- KATEGORI ---------------- */
export function CategoryView({ term, name }: { term: string; name: string }) {
  const r = useAsync(() => searchSongs(term, 50), [term]);
  return (
    <div>
      <Hero kicker="Kategori" title={name || term} tint={pastel(name || term)} sub={r.data ? `${r.data.length} lagu` : 'Memuat…'}
        cover={r.data ? mosaic(r.data) : <div className="sp-skel h-full w-full" />}>
        {r.data && <PlayButtons list={r.data} ctx={name || term} />}
      </Hero>
      <div className="mt-4">
        {r.loading && <SkeletonRows n={8} />}
        {r.err && <ErrorBox msg={r.err} onRetry={r.retry} />}
        {r.data && (r.data.length ? <TrackList list={r.data} ctx={name || term} /> : <Empty title="Belum ada lagu" text="Coba kategori lain." />)}
      </div>
    </div>
  );
}

/* ---------------- TANGGA LAGU ---------------- */
export function ChartsView({ initial }: { initial?: string }) {
  const [cc, setLocalCC] = useState(initial || getCC());
  const r = useAsync(() => getChart(cc), [cc]);
  return (
    <div>
      <Hero kicker="Tangga lagu resmi" title={`Top 50 ${ccName(cc)}`} tint="#8be28b" sub={r.data ? `${r.data.length} lagu • Apple Music ${flag(cc)}` : 'Memuat…'}
        cover={r.data ? mosaic(r.data) : <div className="sp-skel h-full w-full" />}>
        {r.data && <PlayButtons list={r.data} ctx={`Top 50 ${ccName(cc)}`} />}
      </Hero>
      <div className="sp-scroll-x -mx-3 mt-4 flex gap-2 overflow-x-auto px-3 pb-2">
        {COUNTRIES.map(([c, n]) => (
          <button key={c} type="button" onClick={() => setLocalCC(c)} className={`sp-chip shrink-0 ${c === cc ? 'on' : ''}`}>{flag(c)} {n}</button>
        ))}
      </div>
      <div className="mt-2">
        {r.loading && <SkeletonRows n={10} />}
        {r.err && <ErrorBox msg={r.err} onRetry={r.retry} />}
        {r.data && (r.data.length ? <TrackList list={r.data} ctx={`Top 50 ${ccName(cc)}`} rank /> : <Empty title="Tangga lagu belum tersedia" text="Coba negara lain." />)}
      </div>
    </div>
  );
}

/* ---------------- ARTIS ---------------- */
export function ArtistView({ id, name }: { id: string; name: string }) {
  const lib = useStore(libStore);
  const r = useAsync(() => getArtist(id), [id]);
  const d = r.data;
  const following = lib.follow.some((f) => f.id === id);
  return (
    <div>
      <Hero kicker="Artis" title={d?.name || name} round tint={pastel(d?.name || name)} sub={d?.genre}
        cover={d ? <Cover src={d.songs[0]?.cover} size={300} round label={d.name} className="!border-0 h-full w-full" /> : <div className="sp-skel h-full w-full" />}>
        {d && (
          <div className="mt-3 flex items-center gap-2">
            {d.songs.length > 0 && <button type="button" onClick={() => playAll(d.songs, d.name)} className="sp-btn sp-btn-green flex h-11 items-center gap-1.5 px-4 text-sm font-extrabold"><Icon name="play" size={16} fill />PUTAR</button>}
            <button type="button" onClick={() => toast(library.toggleFollow({ id, name: d.name, cover: d.songs[0]?.cover }) ? 'Mengikuti ' + d.name : 'Berhenti mengikuti')} className={`sp-btn h-11 px-4 text-sm font-extrabold ${following ? 'sp-btn-yellow' : ''}`}>
              {following ? 'Mengikuti' : 'Ikuti'}
            </button>
          </div>
        )}
      </Hero>
      {r.loading && <div className="mt-5"><SkeletonRows n={6} /></div>}
      {r.err && <ErrorBox msg={r.err} onRetry={r.retry} />}
      {d && (
        <>
          {d.songs.length ? (<><SectionHead title="Populer" /><TrackList list={d.songs} ctx={d.name} /></>) : <Empty title="Belum ada lagu yang bisa diputar" />}
          {d.albums.length > 0 && (<><SectionHead title="Diskografi" /><Shelf>{d.albums.map((a) => <AlbumCard key={a.id} a={a} />)}</Shelf></>)}
        </>
      )}
    </div>
  );
}

/* ---------------- ALBUM ---------------- */
export function AlbumView({ id }: { id: string }) {
  const r = useAsync(() => getAlbum(id), [id]);
  const d = r.data;
  return (
    <div>
      <Hero kicker="Album" title={d?.info.title || '…'} tint={pastel(d?.info.title || id)}
        sub={d ? <>{d.info.artist}{d.info.year ? ` • ${d.info.year}` : ''} • {d.songs.length} lagu</> : undefined}
        cover={d ? <Cover src={d.info.cover} size={300} className="!border-0 h-full w-full" /> : <div className="sp-skel h-full w-full" />}>
        {d && <PlayButtons list={d.songs} ctx={d.info.title} />}
      </Hero>
      <div className="mt-4">
        {r.loading && <SkeletonRows n={8} />}
        {r.err && <ErrorBox msg={r.err} onRetry={r.retry} />}
        {d && (d.songs.length ? <TrackList list={d.songs} ctx={d.info.title} /> : <Empty title="Tidak ada pratinjau untuk album ini" />)}
      </div>
    </div>
  );
}

/* ---------------- KOLEKSI ---------------- */
function LibRow({ cover, title, sub, onClick, round }: { cover: React.ReactNode; title: string; sub: string; onClick: () => void; round?: boolean }) {
  return (
    <div role="button" tabIndex={0} onClick={onClick} className="sp-row lift flex items-center gap-3 p-2 cursor-pointer">
      <div className={`h-14 w-14 shrink-0 overflow-hidden border-2 border-[#141414] bg-[#efe3c3] ${round ? 'rounded-full' : 'rounded-xl'}`}>{cover}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-[#6a6455]">{sub}</p>
      </div>
      <Icon name="left" size={18} className="rotate-180 text-[#6a6455]" />
    </div>
  );
}

export function LibraryView() {
  const lib = useStore(libStore);
  return (
    <div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <h1 className="font-cyber text-[32px] leading-none">Koleksi</h1>
        <button type="button" onClick={() => createPlaylistFlow((id) => router.go('playlist', id))} className="sp-btn sp-btn-yellow flex h-9 items-center gap-1.5 px-3 text-xs font-extrabold">
          <Icon name="plus" size={14} />PLAYLIST
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        <LibRow title="Lagu yang Disukai" sub={`Playlist • ${lib.liked.length} lagu`} onClick={() => router.go('liked')}
          cover={<div className="flex h-full w-full items-center justify-center bg-[#ff9a8b]"><Icon name="heart" size={24} fill /></div>} />
        <LibRow title="Terakhir Diputar" sub={`Riwayat • ${lib.recent.length} lagu`} onClick={() => router.go('recent')}
          cover={<div className="flex h-full w-full items-center justify-center bg-[#8ab4ff]"><Icon name="clock" size={24} /></div>} />
        {lib.playlists.map((p) => (
          <LibRow key={p.id} title={p.name} sub={`Playlist • ${p.tracks.length} lagu`} onClick={() => router.go('playlist', p.id)} cover={mosaic(p.tracks)} />
        ))}
      </div>
      {lib.follow.length > 0 && (
        <>
          <SectionHead title="Artis diikuti" />
          <div className="flex flex-col gap-2.5">
            {lib.follow.map((a) => <LibRow key={a.id} round title={a.name} sub="Artis" onClick={() => router.go('artist', a.id, a.name)} cover={<Cover src={a.cover} size={120} round label={a.name} className="!border-0 h-full w-full" />} />)}
          </div>
        </>
      )}
      {!lib.playlists.length && !lib.follow.length && <Empty title="Mulai koleksimu" text="Buat playlist atau ikuti artis favoritmu." />}
    </div>
  );
}

export function LikedView() {
  const lib = useStore(libStore);
  return (
    <div>
      <Hero kicker="Playlist" title="Lagu yang Disukai" tint="#ff9a8b" sub={`${lib.liked.length} lagu`}
        cover={<div className="flex h-full w-full items-center justify-center bg-[#ff9a8b]"><Icon name="heart" size={44} fill /></div>}>
        <PlayButtons list={lib.liked} ctx="Lagu yang Disukai" />
      </Hero>
      <div className="mt-4">
        {lib.liked.length ? <TrackList list={lib.liked} ctx="Lagu yang Disukai" /> : <Empty title="Belum ada lagu favorit" text="Tekan ikon hati pada lagu untuk menyimpannya di sini." />}
      </div>
    </div>
  );
}

export function RecentView() {
  const lib = useStore(libStore);
  return (
    <div>
      <Hero kicker="Riwayat" title="Terakhir Diputar" tint="#8ab4ff" sub={`${lib.recent.length} lagu`}
        cover={<div className="flex h-full w-full items-center justify-center bg-[#8ab4ff]"><Icon name="clock" size={44} /></div>}>
        <PlayButtons list={lib.recent} ctx="Terakhir Diputar" />
      </Hero>
      <div className="mt-4">
        {lib.recent.length ? <TrackList list={lib.recent} ctx="Terakhir Diputar" /> : <Empty title="Belum ada riwayat" text="Lagu yang kamu putar akan muncul di sini." />}
      </div>
    </div>
  );
}

export function PlaylistView({ id }: { id: string }) {
  const lib = useStore(libStore);
  const p = lib.playlists.find((x) => x.id === id);
  useEffect(() => { if (!p) router.back(); }, [!!p]);
  if (!p) return null;
  return (
    <div>
      <Hero kicker="Playlist" title={p.name} tint={pastel(p.name)} sub={`${p.tracks.length} lagu`} cover={mosaic(p.tracks)}>
        <div className="mt-3 flex items-center gap-2">
          {p.tracks.length > 0 && <button type="button" onClick={() => playAll(p.tracks, p.name)} className="sp-btn sp-btn-green flex h-11 items-center gap-1.5 px-4 text-sm font-extrabold"><Icon name="play" size={16} fill />PUTAR</button>}
          <button type="button" aria-label="Ubah nama" onClick={async () => { const n = await openPrompt('Ubah nama playlist', 'Nama playlist', p.name); if (n) library.renamePlaylist(p.id, n); }} className="sp-btn flex h-11 w-11 items-center justify-center"><Icon name="edit" size={18} /></button>
          <button type="button" aria-label="Hapus playlist" onClick={() => { if (window.confirm('Hapus playlist “' + p.name + '”?')) { library.deletePlaylist(p.id); toast('Playlist dihapus'); } }} className="sp-btn flex h-11 w-11 items-center justify-center text-[#d62828]"><Icon name="trash" size={18} /></button>
        </div>
      </Hero>
      <div className="mt-4">
        {p.tracks.length ? <TrackList list={p.tracks} ctx={p.name} playlistId={p.id} /> : <Empty title="Playlist ini masih kosong" text="Cari lagu lalu pilih “Tambah ke playlist” di menu ⋯" />}
      </div>
    </div>
  );
}
