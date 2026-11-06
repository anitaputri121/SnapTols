export type PlatformId =
  | 'tiktok'
  | 'ytmp4'
  | 'ytmp3'
  | 'instagram'
  | 'twitter'
  | 'facebook'
  | 'capcut'
  | 'threads'
  | 'mediafire'
  | 'pinterest'
  | 'dailymotion'
  | 'snapchat'
  | 'mangadex'
  | 'reddit'
  | 'okru'
  | 'fuckingfast'
  | 'vk'
  | 'mega'
  | 'bilibili'
  | 'gdrive'
  | 'pixeldrain';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  category: 'video' | 'audio' | 'social' | 'file' | 'manga';
  icon: string;
  badge: string;
  color: string;
  placeholder: string;
  endpoint: string;
  /** Label kecil di kartu platform (default: id dalam huruf besar). */
  tag?: string;
  /** 'zapi' = downloader baru (api.zapi.ink, kunci NITA_API_KEY di server). Kosong = nexadev. */
  provider?: 'zapi';
  /** Nama layanan di api.zapi.ink, mis. 'youtube' -> downloader:youtube. */
  zapiService?: string;
  /** Tampilkan pilihan kualitas video (1080p sampai 144p). */
  supportsQuality?: boolean;
  /** Tampilkan pilihan Video MP4 / Audio MP3. */
  supportsAudioToggle?: boolean;
  /** Pilihan kualitas boleh "Otomatis" (mis. Bilibili). */
  autoQuality?: boolean;
  /** Hanya audio (audioOnly=true). */
  audioOnly?: boolean;
  /** Endpoint lama (nexadev) yang dicoba bila endpoint baru gagal. */
  legacyEndpoint?: string;
}

/** Pilihan kualitas video, dari HD sampai paling rendah. */
export const QUALITY_OPTIONS: { value: string; label: string }[] = [
  { value: '1080p', label: '1080p HD' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' },
  { value: '240p', label: '240p' },
  { value: '144p', label: '144p' },
];

// Kunci API TIDAK disimpan di sini. Server (fungsi server) menambahkannya dari ANITA_API_KEY.
export const DOWNLOADER_API_BASE = 'https://api.nexadev.my.id/api';
// Downloader baru. Kunci TIDAK ada di sini: server (fungsi server) memakai NITA_API_KEY.
export const ZAPI_API_BASE = 'https://api.zapi.ink/v1';
const zapiEndpoint = (service: string) => `${ZAPI_API_BASE}/downloader:${service}/download`;

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Downloader',
    category: 'video',
    icon: 'Music2',
    badge: 'Video MP4 & Audio MP3',
    color: '#ff0050',
    placeholder: 'https://www.tiktok.com/@user/video/... atau https://vt.tiktok.com/...',
    endpoint: `${DOWNLOADER_API_BASE}/aio/`,
  },
  ytmp4: {
    id: 'ytmp4',
    name: 'YouTube MP4 Video',
    category: 'video',
    icon: 'Youtube',
    badge: 'HD/FHD Video',
    color: '#ff0000',
    placeholder: 'https://www.youtube.com/watch?v=... atau https://youtu.be/...',
    endpoint: zapiEndpoint('youtube'),
    provider: 'zapi',
    zapiService: 'youtube',
    supportsQuality: true,
    legacyEndpoint: `${DOWNLOADER_API_BASE}/ytmp4`,
  },
  ytmp3: {
    id: 'ytmp3',
    name: 'YouTube MP3 Audio',
    category: 'audio',
    icon: 'Headphones',
    badge: 'High Bitrate MP3',
    color: '#ef4444',
    placeholder: 'https://www.youtube.com/watch?v=... atau https://youtu.be/...',
    endpoint: zapiEndpoint('youtube'),
    provider: 'zapi',
    zapiService: 'youtube',
    audioOnly: true,
    legacyEndpoint: `${DOWNLOADER_API_BASE}/ytmp3`,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram Reel/Post',
    category: 'video',
    icon: 'Instagram',
    badge: 'Reels, Story & Post',
    color: '#e1306c',
    placeholder: 'https://www.instagram.com/reel/... atau https://www.instagram.com/p/...',
    endpoint: `${DOWNLOADER_API_BASE}/aio/`,
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter / X Media',
    category: 'social',
    icon: 'Twitter',
    badge: 'Video & GIF',
    color: '#1da1f2',
    placeholder: 'https://twitter.com/user/status/... atau https://x.com/...',
    endpoint: `${DOWNLOADER_API_BASE}/aio/`,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook Video',
    category: 'video',
    icon: 'Facebook',
    badge: 'HD Reel / Watch',
    color: '#1877f2',
    placeholder: 'https://www.facebook.com/watch/?v=... atau https://fb.watch/...',
    endpoint: `${DOWNLOADER_API_BASE}/fb`,
  },
  capcut: {
    id: 'capcut',
    name: 'CapCut Template & Video',
    category: 'video',
    icon: 'Scissors',
    badge: 'No Watermark',
    color: '#ffffff',
    placeholder: 'https://www.capcut.com/template-detail/...',
    endpoint: `${DOWNLOADER_API_BASE}/capcut`,
  },
  threads: {
    id: 'threads',
    name: 'Threads Downloader',
    category: 'social',
    icon: 'AtSign',
    badge: 'Threads Post/Video',
    color: '#a855f7',
    placeholder: 'https://www.threads.net/@user/post/...',
    endpoint: `${DOWNLOADER_API_BASE}/aio/`,
  },
  mediafire: {
    id: 'mediafire',
    name: 'MediaFire ZIP & File DL',
    category: 'file',
    icon: 'FolderArchive',
    badge: 'Direct ZIP Archive / File',
    color: '#0070f3',
    placeholder: 'https://www.mediafire.com/file/.../archive.zip',
    endpoint: `${DOWNLOADER_API_BASE}/mediafire/`,
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest Media',
    category: 'social',
    icon: 'Pin',
    badge: 'Image & Video',
    color: '#bd081c',
    placeholder: 'https://pin.it/... atau https://www.pinterest.com/pin/...',
    endpoint: `${DOWNLOADER_API_BASE}/pin`,
  },
  dailymotion: {
    id: 'dailymotion',
    name: 'Dailymotion Video',
    category: 'video',
    icon: 'Play',
    badge: 'Video & Audio MP3',
    color: '#0066dc',
    placeholder: 'https://www.dailymotion.com/video/...',
    endpoint: zapiEndpoint('dailymotion'),
    tag: 'DAILYMOTION',
    provider: 'zapi',
    zapiService: 'dailymotion',
    supportsQuality: true,
    supportsAudioToggle: true,
  },
  snapchat: {
    id: 'snapchat',
    name: 'Snapchat Spotlight',
    category: 'social',
    icon: 'Ghost',
    badge: 'Spotlight Video',
    color: '#d4b800',
    placeholder: 'https://www.snapchat.com/spotlight/...',
    endpoint: zapiEndpoint('snapchat'),
    tag: 'SNAPCHAT',
    provider: 'zapi',
    zapiService: 'snapchat',
  },
  mangadex: {
    id: 'mangadex',
    name: 'MangaDex Chapter',
    category: 'manga',
    icon: 'BookOpen',
    badge: 'Halaman Komik / ZIP',
    color: '#e8590c',
    placeholder: 'https://mangadex.org/chapter/... (tautan chapter)',
    endpoint: `${ZAPI_API_BASE}/downloader:mangadex/chapter`,
    tag: 'MANGADEX',
    provider: 'zapi',
    zapiService: 'mangadex',
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit Media',
    category: 'social',
    icon: 'MessageCircle',
    badge: 'Video & Gambar',
    color: '#ff4500',
    placeholder: 'https://www.reddit.com/r/.../comments/...',
    endpoint: zapiEndpoint('redditsave'),
    tag: 'REDDIT',
    provider: 'zapi',
    zapiService: 'redditsave',
  },
  okru: {
    id: 'okru',
    name: 'OK.ru Video',
    category: 'video',
    icon: 'Play',
    badge: 'Video & Audio MP3',
    color: '#ee8208',
    placeholder: 'https://ok.ru/video/...',
    endpoint: zapiEndpoint('okru'),
    tag: 'OK.RU',
    provider: 'zapi',
    zapiService: 'okru',
    supportsQuality: true,
    supportsAudioToggle: true,
  },
  fuckingfast: {
    id: 'fuckingfast',
    name: 'FastFile Download',
    category: 'file',
    icon: 'FolderArchive',
    badge: 'Unduh Berkas (FF)',
    color: '#0ea5a4',
    placeholder: 'Tautan berkas FF (fuckingfast.co/...)',
    endpoint: zapiEndpoint('fuckingfast'),
    tag: 'FF',
    provider: 'zapi',
    zapiService: 'fuckingfast',
  },
  vk: {
    id: 'vk',
    name: 'VK Video',
    category: 'video',
    icon: 'Play',
    badge: 'Video & Audio MP3',
    color: '#2787f5',
    placeholder: 'https://vk.com/video-...',
    endpoint: zapiEndpoint('vk'),
    tag: 'VK',
    provider: 'zapi',
    zapiService: 'vk',
    supportsQuality: true,
    supportsAudioToggle: true,
  },
  mega: {
    id: 'mega',
    name: 'Mega.nz File',
    category: 'file',
    icon: 'FolderArchive',
    badge: 'Unduh Berkas Mega',
    color: '#d9272e',
    placeholder: 'https://mega.nz/file/...#...',
    endpoint: zapiEndpoint('mega-nz'),
    tag: 'MEGA',
    provider: 'zapi',
    zapiService: 'mega-nz',
  },
  bilibili: {
    id: 'bilibili',
    name: 'Bilibili Video',
    category: 'video',
    icon: 'Play',
    badge: 'Video & Audio MP3',
    color: '#00a1d6',
    placeholder: 'https://www.bilibili.tv/id/video/...',
    endpoint: zapiEndpoint('bilibili'),
    tag: 'BILIBILI',
    provider: 'zapi',
    zapiService: 'bilibili',
    supportsQuality: true,
    supportsAudioToggle: true,
    autoQuality: true,
  },
  gdrive: {
    id: 'gdrive',
    name: 'Google Drive File',
    category: 'file',
    icon: 'FolderArchive',
    badge: 'Unduh Berkas Drive',
    color: '#1a9d5a',
    placeholder: 'https://drive.google.com/file/d/.../view',
    endpoint: zapiEndpoint('google-drive'),
    tag: 'G-DRIVE',
    provider: 'zapi',
    zapiService: 'google-drive',
  },
  pixeldrain: {
    id: 'pixeldrain',
    name: 'Pixeldrain File',
    category: 'file',
    icon: 'FolderArchive',
    badge: 'Unduh Berkas Pixeldrain',
    color: '#7c5cff',
    placeholder: 'https://pixeldrain.com/u/...',
    endpoint: zapiEndpoint('pixeldrain'),
    tag: 'PIXELDRAIN',
    provider: 'zapi',
    zapiService: 'pixeldrain',
  },
};

/**
 * Automatically detects which platform a given URL belongs to.
 */
function hostOf(input: string): string {
  try {
    const raw = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
}

const hostIs = (host: string, domains: string[]) => domains.some((d) => host === d || host.endsWith(`.${d}`));

/** Platform baru dikenali dari nama host (tepat), supaya tidak salah tebak. */
const HOST_RULES: { id: PlatformId; domains: string[] }[] = [
  { id: 'dailymotion', domains: ['dailymotion.com', 'dai.ly'] },
  { id: 'snapchat', domains: ['snapchat.com'] },
  { id: 'mangadex', domains: ['mangadex.org'] },
  { id: 'reddit', domains: ['reddit.com', 'redd.it'] },
  { id: 'okru', domains: ['ok.ru'] },
  { id: 'fuckingfast', domains: ['fuckingfast.co'] },
  { id: 'vk', domains: ['vk.com', 'vk.ru', 'vkvideo.ru'] },
  { id: 'mega', domains: ['mega.nz', 'mega.io', 'mega.co.nz'] },
  { id: 'bilibili', domains: ['bilibili.com', 'bilibili.tv', 'b23.tv'] },
  { id: 'gdrive', domains: ['drive.google.com'] },
  { id: 'pixeldrain', domains: ['pixeldrain.com', 'pixeldrain.net'] },
];

/**
 * Automatically detects which platform a given URL belongs to.
 */
export function detectPlatform(inputUrl: string): PlatformId | null {
  if (!inputUrl) return null;
  const url = inputUrl.trim().toLowerCase();

  const host = hostOf(url);
  if (host) {
    const rule = HOST_RULES.find((r) => hostIs(host, r.domains));
    if (rule) return rule.id;
  }

  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'ytmp4';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) return 'facebook';
  if (url.includes('capcut.com')) return 'capcut';
  if (url.includes('threads.net')) return 'threads';
  if (url.includes('mediafire.com')) return 'mediafire';
  if (url.includes('pinterest.com') || url.includes('pin.it')) return 'pinterest';

  return null;
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Mengambil ID chapter MangaDex dari tautan (atau ID mentah). */
export function extractMangadexChapterId(input: string): string | null {
  const text = input.trim();
  if (/\/title\//i.test(text) && !/\/chapter\//i.test(text)) return null;
  const match = text.match(UUID_RE);
  return match ? match[0].toLowerCase() : null;
}

/** Angka kualitas untuk zapi: "1080p" -> "1080". Kosong/"auto" -> "" (otomatis). */
function zapiQuality(quality: string): string {
  const digits = String(quality || '').match(/\d{3,4}/);
  return digits ? digits[0] : '';
}

/**
 * Builds the final API query URL
 */
export function buildApiUrl(platform: PlatformId, targetUrl: string, quality: string = '1080p'): string {
  const config = PLATFORMS[platform];
  const raw = targetUrl.trim();

  if (config.provider === 'zapi') {
    if (platform === 'mangadex') {
      const chapterId = extractMangadexChapterId(raw);
      if (!chapterId) {
        throw new Error('Tempel tautan CHAPTER MangaDex (https://mangadex.org/chapter/...), bukan halaman judul.');
      }
      return `${config.endpoint}/${chapterId}`;
    }
    const params = [`url=${encodeURIComponent(raw)}`];
    if (config.supportsQuality || config.audioOnly) {
      const audio = Boolean(config.audioOnly) || String(quality).toLowerCase() === 'mp3';
      const q = audio ? '1080' : config.autoQuality && !zapiQuality(quality) ? '' : zapiQuality(quality) || '1080';
      params.push(`quality=${q}`, `audioOnly=${audio ? 'true' : 'false'}`, 'audioFormat=mp3');
    }
    return `${config.endpoint}?${params.join('&')}`;
  }

  const encoded = encodeURIComponent(raw);
  const separator = config.endpoint.includes('?') ? '&' : '?';
  return `${config.endpoint}${separator}url=${encoded}`;
}

/** URL endpoint lama (nexadev) untuk cadangan, bila ada. */
export function buildLegacyApiUrl(platform: PlatformId, targetUrl: string): string | null {
  const config = PLATFORMS[platform];
  if (!config.legacyEndpoint) return null;
  return `${config.legacyEndpoint}?url=${encodeURIComponent(targetUrl.trim())}`;
}

/**
 * Detects client device name from User Agent
 */
export function detectDevice(ua: string): string {
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Web Device';
}
