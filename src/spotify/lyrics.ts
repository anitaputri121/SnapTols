// Lirik diambil dari LRCLIB (layanan lirik komunitas, gratis) saat lagu dibuka.
// Aplikasi tidak menyimpan atau menulis lirik sendiri; hanya menampilkan hasil dari layanan.
import { Track } from './catalog';

export interface LyricLine {
  t: number;
  text: string;
}
export interface Lyrics {
  synced: LyricLine[] | null;
  plain: string[] | null;
}

const cache = new Map<string, Promise<Lyrics | null>>();

function parseLrc(src: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of src.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of stamps) out.push({ t: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text });
  }
  return out.sort((a, b) => a.t - b.t);
}

function toLyrics(o: any): Lyrics | null {
  if (!o || typeof o !== 'object') return null;
  const synced = typeof o.syncedLyrics === 'string' && o.syncedLyrics.trim() ? parseLrc(o.syncedLyrics) : null;
  const plain = typeof o.plainLyrics === 'string' && o.plainLyrics.trim() ? o.plainLyrics.split(/\r?\n/) : null;
  if ((!synced || !synced.length) && !plain) return null;
  return { synced: synced && synced.length ? synced : null, plain: plain || (synced ? synced.map((l) => l.text) : null) };
}

async function callLrc(path: 'get' | 'search', params: Record<string, string>): Promise<any | null> {
  const qs = new URLSearchParams(params).toString();
  const urls = [`https://lrclib.net/api/${path}?${qs}`, `/api/lyrics?path=${path}&${qs}`];
  for (const u of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(u, { signal: ctrl.signal });
      clearTimeout(timer);
      if (r.status === 404) return null;
      if (!r.ok) continue;
      return await r.json();
    } catch {
      /* jaringan/CORS gagal: coba jalur cadangan */
    }
  }
  return null;
}

const clean = (s: string) =>
  s.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').replace(/\s+-\s+.*$/, '').replace(/\s+(feat|ft)\.?\s.*$/i, '').replace(/\s+/g, ' ').trim();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const firstArtist = (s: string) => s.split(/\s*(?:,|&|\bx\b|feat\.?|ft\.?|dan|and)\s*/i)[0].trim();

function pick(list: any, t: Track): any | null {
  if (!Array.isArray(list) || !list.length) return null;
  const nt = norm(clean(t.title));
  const na = norm(firstArtist(t.artist));
  const score = (x: any) => {
    let sc = 0;
    if (x.syncedLyrics) sc += 3;
    else if (x.plainLyrics) sc += 1;
    else return -1;
    const xt = norm(clean(x.trackName || ''));
    const xa = norm(x.artistName || '');
    if (xt && (xt === nt || xt.includes(nt) || nt.includes(xt))) sc += 5;
    else sc -= 4;
    if (na && xa) sc += xa.includes(na) || na.includes(xa) ? 4 : -6; // artis beda = lagu lain berjudul sama
    if (t.dur && x.duration && Math.abs(x.duration - t.dur) < 6) sc += 2;
    return sc;
  };
  const best = list.map((x) => ({ x, sc: score(x) })).sort((a, b) => b.sc - a.sc)[0];
  return best && best.sc >= 5 ? best.x : null;
}

export function fetchLyrics(t: Track): Promise<Lyrics | null> {
  const hit = cache.get(t.id);
  if (hit) return hit;
  const p = (async () => {
    const ct = clean(t.title) || t.title;
    const ca = firstArtist(t.artist) || t.artist;
    const params: Record<string, string> = { track_name: t.title, artist_name: t.artist };
    if (t.album && t.album !== 'Single') params.album_name = t.album;
    if (t.dur) params.duration = String(Math.round(t.dur));
    const direct = toLyrics(await callLrc('get', params));
    if (direct) return direct;
    const tries: Record<string, string>[] = [
      { track_name: ct, artist_name: ca },
      { q: `${ct} ${ca}` },
      { q: `${t.title} ${t.artist}` },
      { track_name: ct },
    ];
    for (const q of tries) {
      const res = toLyrics(pick(await callLrc('search', q), t));
      if (res) return res;
    }
    return null;
  })();
  cache.set(t.id, p);
  return p;
}
