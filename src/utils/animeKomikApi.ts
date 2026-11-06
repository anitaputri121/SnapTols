/**
 * Anime & Komik streaming API service using anime and comic API endpoints
 * Private Master Key handled securely (never shown in UI)
 */

export const ANIME_API_HOST = 'https://apii.nexadev.my.id';

/**
 * Sanitizes any raw string or error message so the API key is never visible to users
 */
export function sanitizeApiError(msg: any): string {
  if (!msg) return 'Terjadi kendala saat memuat data.';
  const str = typeof msg === 'string' ? msg : msg.message || String(msg);
  return str
    .replace(/key=[^&\s]+/gi, 'key=***')
    .replace(/\bNexaDev\b/g, 'API');
}

/**
 * Semua permintaan lewat proxy same-origin (/anime-api). Kunci API ditambahkan oleh server,
 * jadi tidak ada lagi panggilan langsung ke API dari browser.
 */
async function fetchApii(pathWithQuery: string): Promise<any> {
  const res = await fetch(`/anime-api${pathWithQuery}`, {
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // Bukan JSON (mis. halaman galat): tampilkan penyebabnya, bukan "Unexpected token <".
    throw new Error(res.ok ? 'Server API mengirim respons yang tidak dikenali.' : `Server API gagal (HTTP ${res.status}).`);
  }
  const message = [data?.message, data?.error?.message, data?.error].find((v) => typeof v === 'string' && v.trim());
  // Tampilkan alasan asli bila server menolak (mis. kunci API salah / belum diatur).
  if (!res.ok || (message && /(api[ _-]?key|kunci|unauthori[sz]ed|forbidden)/i.test(message))) {
    throw new Error(message || `Server API gagal (HTTP ${res.status}).`);
  }
  return data;
}

/**
 * Search requests use the same API routes as the rest of the Anime section.
 * Read response text first to tolerate JSON envelopes with a BOM or harmless wrappers.
 */
function parseSearchResponseBody(raw: string): any {
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text) return {};

  const candidates = [text];
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  // Some gateways wrap JSON in a small text prefix/suffix.
  const objectStart = text.indexOf('{');
  const objectEnd = text.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(text.slice(objectStart, objectEnd + 1));
  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(text.slice(arrayStart, arrayEnd + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'string') {
        try { return JSON.parse(parsed); } catch { /* keep parsed string below */ }
      }
      return parsed;
    } catch {
      // Try the next candidate.
    }
  }

  return { __rawText: text };
}

async function fetchAnimeSearchApi(pathWithQuery: string): Promise<any> {
  // Sama seperti permintaan Anime lain: lewat proxy same-origin, kunci ditambahkan server.
  const target = `/anime-api${pathWithQuery}`;
  try {
    const response = await fetch(target, {
      headers: { Accept: 'application/json, text/plain, */*' },
      cache: 'no-store',
    });
    const raw = await response.text();
    const data = parseSearchResponseBody(raw);
    if (!response.ok) {
      const message = firstText(data?.message, data?.error, data?.detail, data?.msg);
      throw new Error(message || `Pencarian gagal (HTTP ${response.status}).`);
    }
    return data;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Gagal menghubungi API pencarian anime.');
  }
}

// ================= ANIMEKUINDO =================

export interface AnimeItem {
  title: string;
  link: string;
  image: string;
  status?: string;
  type?: string;
  latestEpisode?: string;
  rating?: string | null;
}

export interface AnimeEpisode {
  episode: string;
  title: string;
  episodeUrl: string;
  date?: string | null;
}

export interface AnimeDetailData {
  title: string;
  image: string;
  info?: Record<string, string>;
  genres?: string[];
  sinopsis?: string;
  rating?: string | null;
  totalEpisodes?: number | string;
  episodes: AnimeEpisode[];
  url?: string;
}

/**
 * Search results can have different response envelopes. Normalize common item
 * fields from the existing Animekuindo/Animasu search response; other API routes
 * and the separate Komik implementation remain unchanged.
 */
type ApiRecord = Record<string, any>;

function firstText(...values: any[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function normalizeAnimeItem(value: any): AnimeItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as ApiRecord;
  const title = firstText(
    item.title, item.name, item.judul, item.nama, item.animeTitle,
    item.anime_title, item.englishTitle, item.romaji, item.seriesTitle,
  );
  const link = firstText(
    item.link, item.url, item.href, item.detailUrl, item.detail_url,
    item.animeUrl, item.anime_url, item.slug, item.path, item.id,
  );
  if (!title || !link) return null;

  let latestEpisode = firstText(
    item.latestEpisode, item.latest_episode, item.episode, item.latest,
    item.episodeTitle, item.episode_title, item.lastEpisode,
  );
  if (!latestEpisode && item.episodeInfo && typeof item.episodeInfo === 'object') {
    latestEpisode = firstText(item.episodeInfo.title, item.episodeInfo.episode, item.episodeInfo.name);
  }

  return {
    title,
    link,
    image: firstText(
      item.image, item.img, item.cover, item.thumbnail, item.poster,
      item.imageUrl, item.image_url, item.coverUrl, item.cover_url,
      item.posterUrl, item.poster_url, item.thumbnailUrl, item.thumbnail_url,
    ),
    status: firstText(item.status, item.state) || undefined,
    type: firstText(item.type, item.format, item.category) || undefined,
    latestEpisode: latestEpisode || undefined,
    rating: firstText(item.rating, item.score, item.rate) || null,
  };
}

function extractAnimeItems(payload: any): AnimeItem[] {
  const preferredKeys = [
    'animeList', 'anime_list', 'anime', 'animes', 'results', 'result',
    'items', 'list', 'series', 'titles', 'searchResults', 'search_results',
    'records', 'data', 'response',
  ];
  const seen = new Set<any>();
  const visit = (value: any, depth: number): AnimeItem[] => {
    if (depth > 7 || value == null) return [];
    if (Array.isArray(value)) {
      const normalized = value.map(normalizeAnimeItem).filter((item): item is AnimeItem => Boolean(item));
      if (normalized.length) return normalized;
      for (const entry of value) {
        const nested = visit(entry, depth + 1);
        if (nested.length) return nested;
      }
      return [];
    }
    if (typeof value !== 'object' || seen.has(value)) return [];
    seen.add(value);
    const record = value as ApiRecord;
    for (const key of preferredKeys) {
      if (record[key] == null) continue;
      const nested = visit(record[key], depth + 1);
      if (nested.length) return nested;
    }
    for (const [key, child] of Object.entries(record)) {
      if (preferredKeys.includes(key)) continue;
      const nested = visit(child, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  };
  return visit(payload, 0);
}

async function searchAnimeEndpoint(endpoint: 'anime' | 'animasu', query: string): Promise<AnimeItem[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  // Use the same existing Animekuindo/Animasu API route as catalog, detail,
  // and stream requests. Search is only an extra query parameter, not a new API route.
  const data = await fetchAnimeSearchApi(`/${endpoint}?search=${encodeURIComponent(keyword)}`);
  const results = extractAnimeItems(data);
  if (results.length) return results;

  if (data?.success === false || data?.status === false || data?.ok === false) {
    throw new Error(firstText(data?.message, data?.error, data?.detail, data?.msg) || 'API menolak permintaan pencarian.');
  }
  if (typeof data?.__rawText === 'string') {
    throw new Error('Respons API pencarian tidak berisi data anime yang dapat dibaca.');
  }

  return [];
}

export async function getRecentAnimekuindo(page = 1) {
  const data = await fetchApii(`/anime?recent=1&page=${page}`);
  if (data?.success && data?.data?.animeList) {
    return {
      animeList: data.data.animeList as AnimeItem[],
      page: data.data.page || page,
      total: data.data.total || 0,
    };
  }
  throw new Error('Gagal memuat anime terbaru.');
}

export async function getCompletedAnimekuindo(page = 1) {
  const data = await fetchApii(`/anime?completed=1&page=${page}`);
  if (data?.success && data?.data?.animeList) {
    return {
      animeList: data.data.animeList as AnimeItem[],
      page: data.data.page || page,
      total: data.data.total || 0,
    };
  }
  throw new Error('Gagal memuat anime tamat.');
}

export async function searchAnimekuindo(query: string): Promise<AnimeItem[]> {
  return searchAnimeEndpoint('anime', query);
}

export async function getAnimekuindoDetails(detailsUrl: string): Promise<AnimeDetailData> {
  const data = await fetchApii(`/anime?details=${encodeURIComponent(detailsUrl.trim())}`);
  if (data?.success && data?.data) {
    return data.data as AnimeDetailData;
  }
  throw new Error('Gagal memuat rincian anime.');
}

export async function getAnimekuindoStream(streamUrl: string) {
  const data = await fetchApii(`/anime?stream=${encodeURIComponent(streamUrl.trim())}`);
  if (data?.success && data?.data?.streamUrl) {
    return {
      streamUrl: data.data.streamUrl as string,
      title: data.data.episodeInfo?.heading || data.data.episodeInfo?.title || 'Episode',
      alternativeLinks: data.data.alternativeLinks || [],
    };
  }
  throw new Error('Gagal mengambil tautan streaming video anime.');
}

// ================= ANIMASU =================

export async function getPopularAnimasu(page = 1) {
  const data = await fetchApii(`/animasu?popular=1&page=${page}`);
  if (data?.success && data?.data?.animeList) {
    return {
      animeList: data.data.animeList as AnimeItem[],
      page: data.data.page || page,
      total: data.data.total || 0,
    };
  }
  throw new Error('Gagal memuat anime populer Animasu.');
}

export async function getCompletedAnimasu(page = 1) {
  const data = await fetchApii(`/animasu?completed=1&page=${page}`);
  if (data?.success && data?.data?.animeList) {
    return {
      animeList: data.data.animeList as AnimeItem[],
      page: data.data.page || page,
      total: data.data.total || 0,
    };
  }
  throw new Error('Gagal memuat anime tamat Animasu.');
}

export async function searchAnimasu(query: string): Promise<AnimeItem[]> {
  return searchAnimeEndpoint('animasu', query);
}

export async function getAnimasuDetails(detailsUrl: string): Promise<AnimeDetailData> {
  const data = await fetchApii(`/animasu?details=${encodeURIComponent(detailsUrl.trim())}`);
  if (data?.success && data?.data) {
    return data.data as AnimeDetailData;
  }
  throw new Error('Gagal memuat rincian anime Animasu.');
}

export async function getAnimasuStream(streamUrl: string) {
  const data = await fetchApii(`/animasu?stream=${encodeURIComponent(streamUrl.trim())}`);
  if (data?.success && (data?.data?.streamUrl || data?.data?.url)) {
    return {
      streamUrl: (data.data.streamUrl || data.data.url) as string,
      title: data.data.episodeInfo?.heading || data.data.episodeInfo?.title || 'Episode',
      alternativeLinks: data.data.alternativeLinks || [],
    };
  }
  throw new Error('Gagal mengambil tautan streaming Animasu.');
}

// ================= KOMIK (MANGA / MANHWA) =================

export interface KomikItem {
  title: string;
  link: string;
  slug: string;
  cover: string;
  latestChapter?: string;
  type?: string;
  rating?: string;
}

export interface KomikChapter {
  title: string;
  slug: string;
  link: string;
  date?: string | null;
}

export interface KomikDetailData {
  title: string;
  slug: string;
  cover: string;
  type?: string;
  rating?: string | null;
  synopsis?: string;
  chapters: KomikChapter[];
}

export interface KomikPage {
  page: number;
  url: string;
}

export async function getKomikTerbaru(page = 1) {
  const data = await fetchApii(`/komik/update?page=${page}`);
  if (data?.success && data?.results) {
    return {
      results: data.results as KomikItem[],
      page: data.page || page,
      hasNext: data.hasNext || false,
    };
  }
  throw new Error('Gagal memuat komik terbaru.');
}

export async function getKomikDaftar(page = 1) {
  const data = await fetchApii(`/komik/daftar?page=${page}`);
  if (data?.success && data?.results) {
    return {
      results: data.results as KomikItem[],
      page: data.page || page,
      hasNext: data.hasNext || false,
    };
  }
  throw new Error('Gagal memuat daftar komik.');
}

export async function searchKomik(query: string) {
  const data = await fetchApii(`/komik?q=${encodeURIComponent(query.trim())}`);
  if (data?.success && data?.results) {
    return data.results as KomikItem[];
  }
  return [];
}

export async function getKomikDetail(slug: string): Promise<KomikDetailData> {
  const data = await fetchApii(`/komik/detail?slug=${encodeURIComponent(slug.trim())}`);
  if (data?.success) {
    return {
      title: data.title,
      slug: data.slug || slug,
      cover: data.cover,
      type: data.type,
      rating: data.rating,
      synopsis: data.synopsis,
      chapters: Array.isArray(data.chapters) ? data.chapters : [],
    };
  }
  throw new Error('Gagal memuat rincian komik.');
}

export async function getKomikStream(chapterSlug: string) {
  const data = await fetchApii(`/komik/stream?slug=${encodeURIComponent(chapterSlug.trim())}`);
  if (data?.success && Array.isArray(data?.pages)) {
    return {
      chapterSlug: data.chapterSlug || chapterSlug,
      chapterTitle: data.chapterTitle || 'Chapter',
      totalPages: data.totalPages || data.pages.length,
      pages: data.pages as KomikPage[],
      navigation: data.navigation || {},
    };
  }
  throw new Error('Gagal memuat halaman komik.');
}
