// Katalog musik: Apple iTunes Search API + Apple Music RSS (gratis, tanpa key).
// Audio yang diputar hanya audio penuh dari API nexadev (proxy server); tidak ada preview 30 detik.
import { ls } from './store';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  cover: string;
  preview: string;
  dur: number;
  exp?: boolean;
  year?: string;
}

export interface Album {
  id: string;
  cid: string;
  title: string;
  artist: string;
  artistId: string;
  cover: string;
  year: string;
  count: number;
}

export interface ArtistLite {
  id: string;
  name: string;
  cover?: string;
  genre?: string;
}

const IT = 'https://itunes.apple.com';
const enc = encodeURIComponent;

export const COUNTRIES: [string, string][] = [
  ['ID', 'Indonesia'], ['US', 'Amerika Serikat'], ['JP', 'Jepang'], ['KR', 'Korea Selatan'], ['GB', 'Inggris'],
  ['MY', 'Malaysia'], ['SG', 'Singapura'], ['AU', 'Australia'], ['DE', 'Jerman'], ['FR', 'Prancis'],
  ['BR', 'Brasil'], ['IN', 'India'], ['TH', 'Thailand'], ['PH', 'Filipina'], ['MX', 'Meksiko'],
];
export const flag = (cc: string) => String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
export const ccName = (cc: string) => (COUNTRIES.find((c) => c[0] === cc) || [cc, cc])[1];

let CC: string = ls.get('cc', 'ID');
export const getCC = () => CC;
export const setCC = (cc: string) => {
  CC = cc;
  ls.set('cc', cc);
  mem.clear();
};

// ---------- util ----------
export const fmt = (s: number) => {
  s = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
export const art = (u: string | undefined, s: number) => (u ? u.replace(/\d+x\d+(bb)?\.(jpg|png|webp)/i, `${s}x${s}bb.jpg`) : '');
export const hash = (s: string) => {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};
const PASTELS = ['#ffd93d', '#ff9a8b', '#8be28b', '#8ab4ff', '#ffb870', '#d7a8ff', '#7fe0d4', '#ffc2e2'];
export const pastel = (seed: string) => PASTELS[hash(seed) % PASTELS.length];

// ---------- jaringan ----------
const mem = new Map<string, Promise<any>>();

function jsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const name = '_sp' + Math.random().toString(36).slice(2);
    const s = document.createElement('script');
    const w = window as any;
    const done = () => {
      clearTimeout(timer);
      delete w[name];
      s.remove();
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error('timeout'));
    }, 15000);
    w[name] = (d: unknown) => {
      done();
      resolve(d);
    };
    s.onerror = () => {
      done();
      reject(new Error('jsonp'));
    };
    s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + name;
    document.head.appendChild(s);
  });
}

function jget(url: string, allowJsonp = true): Promise<any> {
  const hit = mem.get(url);
  if (hit) return hit;
  const p = (async () => {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } catch (e) {
      if (allowJsonp && url.startsWith(IT)) return await jsonp(url);
      throw e;
    }
  })();
  mem.set(url, p);
  p.catch(() => mem.delete(url));
  return p;
}

// ---------- model ----------
const registry = new Map<string, Track>();
export const regTrack = (t: Track) => {
  registry.set(t.id, t);
  return t;
};
export const getTrack = (id: string) => registry.get(id);

function mapSong(o: any): Track | null {
  if (!o || !o.trackId) return null;
  if (o.kind && o.kind !== 'song') return null;
  return regTrack({
    id: 't' + o.trackId,
    title: o.trackName || 'Tanpa judul',
    artist: o.artistName || '',
    artistId: String(o.artistId || ''),
    album: o.collectionName || 'Single',
    albumId: String(o.collectionId || ''),
    cover: o.artworkUrl100 || '',
    preview: o.previewUrl || '',
    dur: (o.trackTimeMillis || 0) / 1000,
    exp: o.trackExplicitness === 'explicit',
    year: (o.releaseDate || '').slice(0, 4),
  });
}

function mapAlbum(o: any): Album {
  const cid = String(o.collectionId || o.id);
  return {
    id: 'a' + cid,
    cid,
    title: o.collectionName || o.name || 'Album',
    artist: o.artistName || '',
    artistId: String(o.artistId || ''),
    cover: o.artworkUrl100 || '',
    year: (o.releaseDate || '').slice(0, 4),
    count: o.trackCount || 0,
  };
}

function dedupe(list: Track[]) {
  const seen = new Set<string>();
  return list.filter((t) => {
    const k = (t.title + '|' + t.artist).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- pencarian & tangga lagu ----------
export async function searchSongs(term: string, limit = 30, cc = CC): Promise<Track[]> {
  const j = await jget(`${IT}/search?term=${enc(term)}&media=music&entity=song&limit=${limit}&country=${cc}`);
  return dedupe((j.results || []).map(mapSong).filter(Boolean) as Track[]);
}
export async function searchAlbums(term: string, limit = 15, cc = CC): Promise<Album[]> {
  const j = await jget(`${IT}/search?term=${enc(term)}&media=music&entity=album&limit=${limit}&country=${cc}`);
  return (j.results || []).filter((o: any) => o.collectionId).map(mapAlbum);
}
export async function searchArtists(term: string, limit = 8, cc = CC): Promise<ArtistLite[]> {
  const j = await jget(`${IT}/search?term=${enc(term)}&media=music&entity=musicArtist&limit=${limit}&country=${cc}`);
  return (j.results || [])
    .filter((o: any) => o.artistId)
    .map((o: any) => ({ id: String(o.artistId), name: o.artistName, genre: o.primaryGenreName || '' }));
}

async function lookupSongs(ids: (string | number)[], cc = CC): Promise<Track[]> {
  const out = new Map<string, Track>();
  for (let i = 0; i < ids.length; i += 50) {
    const j = await jget(`${IT}/lookup?id=${ids.slice(i, i + 50).join(',')}&country=${cc}`);
    (j.results || []).forEach((o: any) => {
      const t = mapSong(o);
      if (t) out.set(String(o.trackId), t);
    });
  }
  return ids.map((i) => out.get(String(i))).filter(Boolean) as Track[];
}

export async function getChart(cc = CC): Promise<Track[]> {
  let ids: (string | number)[] = [];
  try {
    const j = await jget(`https://rss.applemarketingtools.com/api/v2/${cc.toLowerCase()}/music/most-played/50/songs.json`, false);
    ids = (j.feed.results || []).map((r: any) => r.id);
  } catch {
    /* coba sumber cadangan */
  }
  if (!ids.length) {
    try {
      const j = await jget(`${IT}/${cc.toLowerCase()}/rss/topsongs/limit=50/json`);
      ids = (j.feed.entry || []).map((e: any) => e.id.attributes['im:id']);
    } catch {
      /* lanjut */
    }
  }
  let list: Track[] = [];
  if (ids.length) {
    try {
      list = await lookupSongs(ids, cc);
    } catch {
      /* lanjut */
    }
  }
  if (list.length < 8) {
    try {
      list = dedupe(list.concat(await searchSongs('top hits ' + ccName(cc), 50, cc)));
    } catch {
      /* biarkan */
    }
  }
  return list;
}

export async function getAlbumChart(cc = CC): Promise<Album[]> {
  try {
    const j = await jget(`https://rss.applemarketingtools.com/api/v2/${cc.toLowerCase()}/music/most-played/25/albums.json`, false);
    return (j.feed.results || []).map((r: any) =>
      mapAlbum({ id: r.id, name: r.name, artistName: r.artistName, artistId: r.artistId, artworkUrl100: r.artworkUrl100, releaseDate: r.releaseDate }),
    );
  } catch {
    return searchAlbums('top albums', 20, cc);
  }
}

export interface ArtistPage {
  id: string;
  name: string;
  genre: string;
  songs: Track[];
  albums: Album[];
}
export async function getArtist(id: string): Promise<ArtistPage> {
  const [s, a] = await Promise.all([
    jget(`${IT}/lookup?id=${id}&entity=song&limit=30&country=${CC}`),
    jget(`${IT}/lookup?id=${id}&entity=album&limit=40&country=${CC}`).catch(() => ({ results: [] })),
  ]);
  const info = (s.results || []).find((o: any) => o.wrapperType === 'artist') || {};
  const songs = dedupe((s.results || []).map(mapSong).filter(Boolean) as Track[]);
  const albums = (a.results || []).filter((o: any) => o.wrapperType === 'collection').map(mapAlbum);
  return { id, name: info.artistName || songs[0]?.artist || 'Artis', genre: info.primaryGenreName || '', songs, albums };
}

export interface AlbumPage {
  info: Album;
  songs: Track[];
}
export async function getAlbum(id: string): Promise<AlbumPage> {
  const j = await jget(`${IT}/lookup?id=${id}&entity=song&country=${CC}`);
  const info = (j.results || []).find((o: any) => o.wrapperType === 'collection');
  const songs = (j.results || []).map(mapSong).filter(Boolean) as Track[];
  const first = songs[0];
  return {
    info: info
      ? mapAlbum(info)
      : { id: 'a' + id, cid: id, title: first?.album || 'Album', artist: first?.artist || '', artistId: first?.artistId || '', cover: first?.cover || '', year: first?.year || '', count: songs.length },
    songs,
  };
}

// ---------- audio penuh via API nexadev ----------
// Urutan: fungsi server milik sendiri (key tersembunyi) -> proxy lama /media-api.
const KA = ['audio', 'audio_url', 'audioUrl', 'mp3_url', 'mp3Url', 'download_url', 'downloadUrl', 'play_url', 'playUrl', 'url_download', 'download', 'dl', 'mp3', 'stream', 'stream_url', 'media', 'url', 'link', 'play', 'src'];
const KT = ['title', 'name', 'judul', 'track', 'trackName', 'songName', 'song'];

const isHttp = (s: unknown): s is string => typeof s === 'string' && /^https?:\/\//i.test(s.trim());
const looksAudio = (s: string) => /\.(mp3|m4a|ogg|wav|aac|opus|webm)(\?|#|$)/i.test(s) || /audio|download|stream|mp3/i.test(s);

function deepFind(o: any, test: (s: string) => boolean, depth = 0): string {
  if (depth > 4 || o == null) return '';
  if (typeof o === 'string') return test(o) ? o : '';
  if (Array.isArray(o)) {
    for (const v of o) {
      const r = deepFind(v, test, depth + 1);
      if (r) return r;
    }
    return '';
  }
  if (typeof o === 'object') {
    for (const k of Object.keys(o)) {
      const r = deepFind(o[k], test, depth + 1);
      if (r) return r;
    }
  }
  return '';
}

function apiList(j: any, depth = 0): any[] {
  if (depth > 4 || j == null) return [];
  if (Array.isArray(j)) return j.filter((x) => x && typeof x === 'object');
  if (typeof j !== 'object') return [];
  for (const k of ['result', 'results', 'data', 'items', 'tracks', 'songs', 'response', 'search', 'list']) {
    if (j[k] != null) {
      const r = apiList(j[k], depth + 1);
      if (r.length) return r;
    }
  }
  if (KT.some((k) => j[k]) || KA.some((k) => j[k])) return [j];
  for (const v of Object.values(j)) {
    const r = apiList(v, depth + 1);
    if (r.length) return r;
  }
  return [];
}

function apiAudio(o: any): string {
  for (const k of KA) {
    const v = o[k];
    if (isHttp(v)) return v.trim();
    if (v && typeof v === 'object') {
      const x = deepFind(v, (s) => isHttp(s));
      if (x) return x;
    }
  }
  return deepFind(o, (s) => isHttp(s) && looksAudio(s));
}

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// Kunci umum untuk artis & durasi di respons API (nama pasti bisa berbeda-beda)
const AK = ['artist', 'artists', 'artistName', 'artist_name', 'singer', 'author', 'channel'];
const DK = ['duration', 'durationMs', 'duration_ms', 'length', 'durasi'];
// Kata penanda versi lain (slowed, remix, dst.) — dihindari kalau judul asli tidak memuatnya
const VERSION_WORDS = ['slowed', 'reverb', 'sped up', 'speed up', 'nightcore', 'remix', 'cover', 'karaoke', 'instrumental', 'acoustic', 'live', 'bootleg'];

function asText(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(asText).join(' ');
  if (typeof v === 'object') return asText(v.name ?? v.title ?? '');
  return '';
}
function asSeconds(v: any): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'string' && v.includes(':')) {
    const p = v.split(':').map(Number);
    if (p.some((n) => Number.isNaN(n))) return 0;
    return p.reduce((a, n) => a * 60 + n, 0);
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 10000 ? n / 1000 : n; // angka besar dianggap milidetik
}
const pickKey = (o: any, keys: string[]) => {
  for (const k of keys) if (o && o[k] != null && o[k] !== '') return o[k];
  return undefined;
};
const hasWord = (text: string, w: string) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(text);

const fullCache = new Map<string, Promise<string | null>>();

export const forgetFullAudio = (id: string) => {
  fullCache.delete(id);
};

export function resolveFullAudio(t: Track): Promise<string | null> {
  const hit = fullCache.get(t.id);
  if (hit) return hit;
  const q = enc(`${t.title} ${t.artist}`);
  const urls = [`/api/spotify?q=${q}`, `/media-api/spotifyplay?q=${q}`];
  const p = (async () => {
    for (const u of urls) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 14000);
        const r = await fetch(u, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) continue;
        const type = (r.headers.get('content-type') || '').toLowerCase();
        if (type.includes('text/html')) continue;
        const j = JSON.parse(await r.text());
        const list = apiList(j)
          .map((o) => ({
            title: String(o.title || o.name || o.judul || o.trackName || o.songName || ''),
            artist: asText(pickKey(o, AK)),
            dur: asSeconds(pickKey(o, DK)),
            audio: apiAudio(o),
          }))
          .filter((x) => x.audio);
        // Nilai tiap kandidat: judul, artis, durasi, dan versi harus cocok dengan lagu aslinya.
        // Sebelumnya hasil pertama selalu dipakai walau lagunya beda, sehingga lirik tidak sesuai.
        const nt = norm(t.title.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').replace(/\s+-\s+.*$/, '')) || norm(t.title);
        const na = norm(t.artist.split(/\s*(?:,|&|\bx\b|feat\.?|ft\.?|dan|and)\s*/i)[0]);
        const scored = list
          .map((x) => {
            let sc = 0;
            const xt = norm(x.title);
            if (nt && (xt.includes(nt) || (xt.length > 2 && nt.includes(xt)))) sc += 5;
            const xa = norm(x.artist);
            if (na && xa) sc += xa.includes(na) || na.includes(xa) ? 4 : -3;
            if (x.dur && t.dur) {
              const diff = Math.abs(x.dur - t.dur);
              if (diff <= 6) sc += 3;
              else if (diff > 20) sc -= 5;
            }
            for (const w of VERSION_WORDS) if (hasWord(x.title, w) && !hasWord(t.title, w)) sc -= 6;
            return { x, sc };
          })
          .sort((a, b) => b.sc - a.sc);
        const best = scored[0];
        if (best && best.sc >= 4) {
          return best.x.audio;
        }
      } catch {
        /* coba alamat berikutnya */
      }
    }
    return null;
  })();
  fullCache.set(t.id, p);
  // Hasil kosong tidak disimpan, supaya bisa dicoba lagi nanti
  p.then((u) => {
    if (!u) fullCache.delete(t.id);
  });
  return p;
}
