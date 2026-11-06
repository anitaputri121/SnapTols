import { PLATFORMS, PlatformId } from './detector';
import { DownloadResult } from '../types';

/**
 * Pembaca respons api.zapi.ink. Format respons belum pasti, jadi pembacanya sengaja longgar:
 * ia mencari tautan media, judul, thumbnail, dan daftar kualitas di bentuk JSON yang umum.
 * Tautan yang menunjuk ke api.zapi.ink diarahkan lewat /zapi-file (kunci ditambahkan server).
 */

const ZAPI_HOST = 'api.zapi.ink';

export function routeZapiMediaUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === ZAPI_HOST) return `/zapi-file${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // bukan URL mutlak: dibiarkan
  }
  return url;
}

function toHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const candidate = value.trim().replace(/^['"`]|['"`]$/g, '');
  if (!candidate || /^(?:null|undefined|false|true)$/i.test(candidate)) return undefined;
  if (candidate.startsWith('//')) return `https:${candidate}`;
  if (candidate.startsWith('/')) return `https://${ZAPI_HOST}${candidate}`;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

const IMAGE_EXT = /\.(?:jpe?g|png|webp|gif|avif|bmp)(?:$|[?#])/i;
const AUDIO_EXT = /\.(?:mp3|m4a|aac|ogg|opus|wav|flac)(?:$|[?#])/i;
const VIDEO_EXT = /\.(?:mp4|webm|mov|mkv|m4v|3gp)(?:$|[?#])/i;
const FILE_EXT = /\.(?:zip|rar|7z|apk|pdf|exe|iso|tar|gz|xapk|obb|rpm|deb|msi|dmg)(?:$|[?#])/i;

const URL_KEYS_AUDIO = ['audio', 'audioUrl', 'audio_url', 'mp3', 'audioDownload', 'audio_download'];
const URL_KEYS_VIDEO = ['video', 'videoUrl', 'video_url', 'mp4', 'videoHD', 'videoDownload', 'video_download', 'hd'];
const URL_KEYS_GENERIC = [
  'downloadUrl', 'download_url', 'directUrl', 'direct_url', 'direct', 'download', 'url', 'link', 'src', 'href',
  'file', 'fileUrl', 'file_url', 'stream', 'streamUrl', 'media', 'mediaUrl', 'media_url',
];
const LIST_KEYS = ['formats', 'links', 'downloads', 'medias', 'media', 'qualities', 'sources', 'streams', 'videos', 'results', 'items', 'files'];
const PAGE_KEYS = ['pages', 'images', 'imageUrls', 'image_urls', 'urls', 'chapterImages', 'files', 'data'];
const THUMB_KEYS = ['thumbnail', 'thumb', 'thumbnailUrl', 'thumbnail_url', 'cover', 'image', 'poster', 'preview', 'picture'];
const TITLE_KEYS = ['title', 'name', 'filename', 'fileName', 'file_name', 'caption'];

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Objek-objek tempat data hasil mungkin berada (paling dalam dulu). */
function roots(data: any): Record<string, any>[] {
  const list: any[] = [data?.data?.data, data?.data?.result, data?.data, data?.result?.data, data?.result, data?.response, data];
  const out: Record<string, any>[] = [];
  for (const item of list) {
    if (isObj(item) && !out.includes(item)) out.push(item);
    if (Array.isArray(item) && item.length && isObj(item[0]) && !out.includes(item[0])) out.push(item[0]);
  }
  return out;
}

function firstString(rootsList: Record<string, any>[], keys: string[]): string | undefined {
  for (const root of rootsList) {
    for (const key of keys) {
      const v = root[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (isObj(v)) {
        const nested = v.name || v.title || v.username;
        if (typeof nested === 'string' && nested.trim()) return nested.trim();
      }
    }
  }
  return undefined;
}

function heightOf(item: any): number {
  const raw = [item?.quality, item?.resolution, item?.height, item?.label, item?.format, item?.name]
    .find((v) => v !== undefined && v !== null && /\d{3,4}/.test(String(v)));
  const digits = String(raw ?? '').match(/\d{3,4}/);
  return digits ? Number(digits[0]) : 0;
}

function looksAudioOnly(item: any): boolean {
  const kind = String(item?.type ?? item?.mime ?? item?.mimeType ?? item?.mime_type ?? '').toLowerCase();
  if (item?.hasVideo === false || item?.audioOnly === true || item?.audio_only === true) return true;
  return kind.startsWith('audio') || AUDIO_EXT.test(String(item?.url ?? item?.link ?? ''));
}

function urlOfItem(item: any): string | undefined {
  if (typeof item === 'string') return toHttpUrl(item);
  if (!isObj(item)) return undefined;
  for (const key of [...URL_KEYS_GENERIC, ...URL_KEYS_VIDEO, ...URL_KEYS_AUDIO]) {
    const url = toHttpUrl(item[key]);
    if (url) return url;
  }
  return undefined;
}

/** Memilih satu dari daftar format: kualitas yang diminta, atau terdekat di bawahnya. */
function pickFromList(list: any[], wantHeight: number, wantAudio: boolean): { url: string; item: any } | undefined {
  const entries = list
    .map((item) => ({ item, url: urlOfItem(item) }))
    .filter((e): e is { item: any; url: string } => !!e.url)
    .filter((e) => (wantAudio ? true : !looksAudioOnly(e.item)) || list.every((x) => looksAudioOnly(x)));
  if (!entries.length) return undefined;
  if (wantAudio) {
    return entries.find((e) => looksAudioOnly(e.item)) || entries[0];
  }
  if (!wantHeight) {
    return [...entries].sort((a, b) => heightOf(b.item) - heightOf(a.item))[0];
  }
  const withH = entries.filter((e) => heightOf(e.item) > 0);
  if (!withH.length) return entries[0];
  const atOrBelow = withH.filter((e) => heightOf(e.item) <= wantHeight).sort((a, b) => heightOf(b.item) - heightOf(a.item));
  if (atOrBelow.length) return atOrBelow[0];
  return [...withH].sort((a, b) => heightOf(a.item) - heightOf(b.item))[0];
}

/** Cadangan terakhir: tautan http pertama di mana pun dalam JSON (bukan thumbnail / tautan asal). */
function deepFindUrl(value: unknown, skip: string, depth = 0, key = ''): string | undefined {
  if (depth > 6) return undefined;
  if (typeof value === 'string') {
    if (THUMB_KEYS.includes(key)) return undefined;
    const url = toHttpUrl(value);
    return url && url !== skip ? url : undefined;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = deepFindUrl(v, skip, depth + 1, key);
      if (found) return found;
    }
    return undefined;
  }
  if (isObj(value)) {
    for (const [k, v] of Object.entries(value)) {
      const found = deepFindUrl(v, skip, depth + 1, k);
      if (found) return found;
    }
  }
  return undefined;
}

function formatDuration(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return /^\d+$/.test(value.trim()) ? formatDuration(Number(value)) : value.trim();
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const total = value > 100000 ? Math.round(value / 1000) : Math.round(value);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = String(total % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  }
  return undefined;
}

function formatSize(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() && !/^\d+$/.test(value.trim())) return value.trim();
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = n;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function zapiErrorMessage(data: any): string | undefined {
  const values = [data?.message, data?.error?.message, data?.error, data?.detail, data?.msg, data?.result?.message, data?.data?.message];
  const found = values.find((v) => typeof v === 'string' && v.trim());
  return typeof found === 'string' ? found.trim() : undefined;
}

function isFailure(data: any): boolean {
  if (!isObj(data)) return false;
  const flags = [data.success, data.status, data.ok, data.data?.success, data.result?.success];
  if (flags.some((v) => v === false || (typeof v === 'string' && /^(?:false|error|failed|fail)$/i.test(v)))) return true;
  const code = data.statusCode ?? data.code;
  if (typeof code === 'number' && code >= 400) return true;
  return Boolean(data.error) && !(data.url || data.data || data.result);
}

/** Daftar halaman gambar (MangaDex). */
export function extractPages(data: any): string[] {
  for (const root of roots(data)) {
    // Bentuk asli MangaDex: { baseUrl, chapter: { hash, data: ["x.png", ...] } }
    const base = typeof root.baseUrl === 'string' ? root.baseUrl.replace(/\/+$/, '') : '';
    const chapter = isObj(root.chapter) ? root.chapter : null;
    if (base && chapter && typeof chapter.hash === 'string' && Array.isArray(chapter.data) && chapter.data.length) {
      return chapter.data
        .filter((f: unknown) => typeof f === 'string')
        .map((f: string) => routeZapiMediaUrl(`${base}/data/${chapter.hash}/${f}`));
    }
    for (const key of PAGE_KEYS) {
      const list = root[key];
      if (!Array.isArray(list) || list.length < 1) continue;
      const urls = list.map((item: any) => urlOfItem(item)).filter((u): u is string => !!u);
      if (urls.length === list.length) return urls.map(routeZapiMediaUrl);
    }
  }
  return [];
}

export function parseZapiResponse(
  data: any,
  opts: { platformId: PlatformId; targetUrl: string; quality?: string }
): DownloadResult {
  const { platformId, targetUrl } = opts;
  const platform = PLATFORMS[platformId];
  const quality = String(opts.quality || '');
  const wantAudio = Boolean(platform.audioOnly) || quality.toLowerCase() === 'mp3';
  const wantHeight = Number(quality.match(/\d{3,4}/)?.[0] || 0);

  if (typeof data === 'string') {
    const url = toHttpUrl(data);
    if (url && url !== targetUrl) data = { url };
  }
  if (isFailure(data)) throw new Error(zapiErrorMessage(data) || 'Server API menolak permintaan unduhan.');

  const rootList = roots(data);
  const title = firstString(rootList, TITLE_KEYS);
  const author = firstString(rootList, ['author', 'uploader', 'channel', 'creator', 'owner', 'username', 'user']);
  const thumbRaw = firstString(rootList, THUMB_KEYS);
  const thumbnail = thumbRaw ? toHttpUrl(thumbRaw) : undefined;
  const duration = formatDuration(rootList.map((r) => r.duration ?? r.length ?? r.lengthSeconds).find((v) => v != null));
  const filesize = formatSize(rootList.map((r) => r.filesize ?? r.fileSize ?? r.size ?? r.file_size).find((v) => v != null));

  // 1) Komik: banyak halaman gambar
  if (platform.category === 'manga') {
    const pages = extractPages(data);
    if (!pages.length) throw new Error(zapiErrorMessage(data) || 'Chapter tidak berisi halaman gambar yang bisa dibaca.');
    return {
      success: true,
      title: title || 'Chapter MangaDex',
      author,
      thumbnail: pages[0],
      downloadUrl: pages[0],
      mediaType: 'image',
      quality: `${pages.length} halaman`,
      pages,
      rawResponse: data,
    };
  }

  // 2) Cari tautan media
  let chosenUrl: string | undefined;
  let chosenItem: any;

  for (const root of rootList) {
    for (const key of LIST_KEYS) {
      const list = root[key];
      if (Array.isArray(list) && list.length) {
        const pick = pickFromList(list, wantHeight, wantAudio);
        if (pick && pick.url !== targetUrl) { chosenUrl = pick.url; chosenItem = pick.item; break; }
      }
    }
    if (chosenUrl) break;
    const keys = wantAudio
      ? [...URL_KEYS_AUDIO, ...URL_KEYS_GENERIC, ...URL_KEYS_VIDEO]
      : [...URL_KEYS_VIDEO, ...URL_KEYS_GENERIC, ...URL_KEYS_AUDIO];
    for (const key of keys) {
      const value = root[key];
      const url = Array.isArray(value)
        ? pickFromList(value, wantHeight, wantAudio)?.url
        : isObj(value) ? urlOfItem(value) : toHttpUrl(value);
      if (url && url !== targetUrl) { chosenUrl = url; chosenItem = root; break; }
    }
    if (chosenUrl) break;
  }
  if (!chosenUrl) {
    const deep = deepFindUrl(data, targetUrl);
    if (deep) chosenUrl = deep;
  }
  if (!chosenUrl) throw new Error(zapiErrorMessage(data) || 'API tidak mengirim tautan media yang bisa diputar atau diunduh.');

  // 3) Jenis media
  const isFileHost = platform.category === 'file';
  let mediaType: DownloadResult['mediaType'];
  if (wantAudio) mediaType = 'audio';
  else if (isFileHost) mediaType = 'file';
  else if (AUDIO_EXT.test(chosenUrl)) mediaType = 'audio';
  else if (IMAGE_EXT.test(chosenUrl)) mediaType = 'image';
  else if (FILE_EXT.test(chosenUrl) && !VIDEO_EXT.test(chosenUrl)) mediaType = 'file';
  else mediaType = 'video';

  const height = heightOf(chosenItem);
  const qualityLabel = mediaType === 'audio'
    ? 'Audio MP3'
    : mediaType === 'file'
      ? 'Direct Download'
      : height ? `${height}p` : wantHeight ? `${wantHeight}p` : 'Terbaik';

  return {
    success: true,
    title: title || `${platform.name}`,
    author,
    thumbnail,
    downloadUrl: routeZapiMediaUrl(chosenUrl),
    mediaType,
    filesize,
    duration,
    quality: qualityLabel,
    rawResponse: data,
  };
}
