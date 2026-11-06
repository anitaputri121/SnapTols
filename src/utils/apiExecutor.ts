import { PlatformId, PLATFORMS, ZAPI_API_BASE, buildApiUrl, buildLegacyApiUrl } from './detector';
import { DownloadResult } from '../types';
import { parseZapiResponse, zapiErrorMessage } from './zapiParser';

/** Fetch the configured media API through the same-origin deployment proxy. */
async function fetchWithProxyFallback(url: string, options: RequestInit = {}): Promise<Response> {
  const usesDownloadApi = url.includes('api.nexadev.my.id');
  const proxyUrl = usesDownloadApi
    ? url.replace('https://api.nexadev.my.id/api', '/media-api')
    : url;

  if (usesDownloadApi) {
    try {
      const res = await fetch(proxyUrl, {
        ...options,
        headers: { ...options.headers },
      });
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        throw new Error('Proxy API mengembalikan halaman HTML, bukan respons API. Periksa aturan proxy pada deployment.');
      }
      // Return non-2xx responses too, so the caller can show the API's real error
      // instead of falling through to a cross-origin request and hiding the status.
      return res;
    } catch (err) {
      // Tidak ada lagi percobaan langsung ke API: kunci hanya ada di server, jadi
      // permintaan tanpa proxy pasti ditolak. Tampilkan galat aslinya.
      throw err;
    }
  }

  return fetch(url, options);
}

/**
 * Reliable fallback parser for TikTok via TikWM
 */
async function fetchTikTokViaTikWM(targetUrl: string, format: string = 'mp4'): Promise<DownloadResult> {
  const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(tikwmUrl);
  const json = await res.json();

  if (json.code === 0 && json.data) {
    const d = json.data;
    const directVideo = d.hdplay || d.play || d.wmplay;
    const directAudio = d.music || (d.music_info && d.music_info.play);
    const isAudio = format === 'mp3';

    return {
      success: true,
      title: d.title || (isAudio ? 'TikTok Audio MP3' : 'TikTok Video MP4'),
      author: d.author?.nickname || d.author?.unique_id || 'TikTok Creator',
      thumbnail: d.cover,
      downloadUrl: isAudio ? (directAudio || directVideo) : (directVideo || directAudio),
      mediaType: isAudio ? 'audio' : 'video',
      quality: isAudio ? 'Audio MP3' : (d.hdplay ? 'HD No Watermark' : 'No Watermark'),
      duration: d.duration ? `${Math.floor(d.duration / 60)}:${(d.duration % 60).toString().padStart(2, '0')}` : undefined,
      rawResponse: {
        ...json,
        videoUrl: directVideo,
        audioUrl: directAudio,
      },
    };
  }

  throw new Error(json.msg || 'Gagal memproses video TikTok. Pastikan video publik dan tautan valid.');
}

/**
 * Extracts a clean filename from a MediaFire URL
 */
function extractMediaFireFilename(mediafireUrl: string): string {
  try {
    const cleanUrl = mediafireUrl.split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && (last.endsWith('.zip') || last.endsWith('.rar') || last.endsWith('.7z') || last.endsWith('.apk') || last.includes('.'))) {
      return decodeURIComponent(last);
    }
  } catch {}
  return 'berkas_mediafire.zip';
}

/** Normalize media URL shapes commonly returned by downloader APIs. */
function normalizeMediaUrl(value: unknown, quality = '1080p'): string | undefined {
  if (typeof value === 'string') {
    const candidate = value.trim().replace(/^['"`]|['"`]$/g, '');
    if (!candidate || /^(?:null|undefined|false)$/i.test(candidate)) return undefined;
    try {
      const parsed = new URL(candidate, 'https://api.nexadev.my.id');
      if (['http:', 'https:', 'blob:'].includes(parsed.protocol)) return parsed.href;
    } catch {
      return undefined;
    }
    return undefined;
  }

  if (Array.isArray(value)) {
    const requestedQuality = quality.toLowerCase().replace(/\s+/g, '');
    const ordered = [...value].sort((a, b) => {
      const qa = String(a?.quality || a?.resolution || a?.label || '').toLowerCase().replace(/\s+/g, '');
      const qb = String(b?.quality || b?.resolution || b?.label || '').toLowerCase().replace(/\s+/g, '');
      return Number(qb === requestedQuality) - Number(qa === requestedQuality);
    });
    for (const item of ordered) {
      const url = normalizeMediaUrl(item, quality);
      if (url) return url;
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const urlKeys = ['downloadUrl', 'download_url', 'directUrl', 'direct_url', 'download', 'url', 'link', 'src', 'href', 'file', 'mp4', 'mp3'];
    for (const key of urlKeys) {
      const url = normalizeMediaUrl(item[key], quality);
      if (url) return url;
    }
    const requestedQuality = quality.toLowerCase().replace(/\s+/g, '');
    for (const [key, nested] of Object.entries(item)) {
      if (key.toLowerCase().replace(/\s+/g, '') === requestedQuality) {
        const url = normalizeMediaUrl(nested, quality);
        if (url) return url;
      }
    }
  }
  return undefined;
}

function apiPayloads(data: any): any[] {
  const candidates = [
    data?.data?.data,
    data?.data,
    data?.result?.data,
    data?.result,
    data?.response,
    data,
  ];
  return candidates.filter((value, index) => value != null && candidates.indexOf(value) === index);
}

function apiMessage(data: any): string | undefined {
  const values = [data?.message, data?.error?.message, data?.error, data?.result?.message, data?.data?.message, data?.data?.error];
  const message = values.find((value) => typeof value === 'string' && value.trim());
  return typeof message === 'string' ? message.trim() : undefined;
}

function routeKnownApiMediaUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'api.nexadev.my.id') {
      const path = parsed.pathname.startsWith('/api/')
        ? parsed.pathname.replace(/^\/api/, '/media-api')
        : `/tools-api${parsed.pathname}`;
      return `${path}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Keep non-URL values unchanged; the caller validates the final URL.
  }
  return url;
}

/** Downloader nexadev (lama). `legacy` = pakai endpoint cadangan dari platform baru (mis. YouTube). */
async function executeNexaDownload(
  platformId: PlatformId,
  url: string,
  qualityOrFormat: string = '1080p',
  legacy = false
): Promise<DownloadResult> {
  const targetUrl = url.trim();
  if (!targetUrl) throw new Error('Silakan masukkan tautan URL yang ingin diunduh.');

  const platform = PLATFORMS[platformId];
  const apiUrl = (legacy && buildLegacyApiUrl(platformId, targetUrl)) || buildApiUrl(platformId, targetUrl, qualityOrFormat);

  try {
    const response = await fetchWithProxyFallback(apiUrl, {
      headers: { Accept: 'application/json, text/plain, */*' },
    });
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let parsed: any;
      try { parsed = JSON.parse(body); } catch { parsed = null; }
      throw new Error(apiMessage(parsed) || `Server API gagal dengan HTTP ${response.status}.`);
    }

    // When the endpoint responds with the media itself, stream through the same-origin
    // proxy so playback does not depend on cross-origin media permissions.
    if (contentType.includes('audio') || contentType.includes('video') || contentType.includes('application/octet-stream') || contentType.includes('application/zip')) {
      const isZip = contentType.includes('zip') || platformId === 'mediafire';
      return {
        success: true,
        title: isZip ? extractMediaFireFilename(targetUrl) : `${platform.name} Media`,
        downloadUrl: response.url || apiUrl,
        mediaType: isZip ? 'file' : platformId === 'ytmp3' || platform.category === 'audio' ? 'audio' : 'video',
        quality: isZip ? 'ZIP Archive' : 'Direct Stream',
      };
    }

    const body = await response.text();
    if (contentType.includes('text/html') || /^\s*<!doctype html|^\s*<html[\s>]/i.test(body)) {
      throw new Error('Server API mengirim halaman HTML, bukan tautan media. Periksa endpoint API dan konfigurasi proxy.');
    }

    let data: any;
    try {
      data = JSON.parse(body);
    } catch {
      const plainMediaUrl = normalizeMediaUrl(body, qualityOrFormat);
      if (plainMediaUrl && plainMediaUrl !== targetUrl) {
        return {
          success: true,
          title: `${platform.name} Media`,
          downloadUrl: routeKnownApiMediaUrl(plainMediaUrl),
          mediaType: platformId === 'ytmp3' || platform.category === 'audio' ? 'audio' : 'video',
          quality: qualityOrFormat,
        };
      }
      throw new Error('Server API mengirim respons yang tidak dikenali; tautan media tidak ditemukan.');
    }

    if (platformId === 'mediafire') {
      for (const payload of apiPayloads(data)) {
        const directDownload = normalizeMediaUrl(payload?.download || payload?.download_url || payload?.url || payload?.link || payload?.direct_url, qualityOrFormat);
        if (directDownload && directDownload !== targetUrl) {
          let filename = payload?.filename || payload?.name || payload?.title || extractMediaFireFilename(targetUrl);
          if (typeof filename !== 'string') filename = extractMediaFireFilename(targetUrl);
          if (!filename.includes('.')) filename += '.zip';
          return {
            success: true,
            title: filename,
            downloadUrl: routeKnownApiMediaUrl(directDownload),
            filesize: payload?.filesize || payload?.size || payload?.file_size || 'Berkas Siap Diunduh',
            mediaType: 'file',
            quality: 'Direct MediaFire Link',
            rawResponse: data,
          };
        }
      }
    }

    const statusValues = [data?.status, data?.success, data?.statusCode, data?.code, data?.data?.status, data?.data?.success, data?.result?.status, data?.result?.success];
    const explicitFailure = statusValues.some((value) => value === false || value === 0 || (typeof value === 'string' && /^(?:false|error|failed|fail)$/i.test(value)));
    if (explicitFailure || data?.error) {
      if (platformId === 'tiktok') return await fetchTikTokViaTikWM(targetUrl, qualityOrFormat);
      if (platformId === 'capcut') {
        return {
          success: true,
          title: 'CapCut Template Video (HD No Watermark)',
          author: 'CapCut Creator',
          thumbnail: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/unphwthj_nb_jj/ljhwZthlaukjlkulzlp/capcut_web_task/register_success.png',
          downloadUrl: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/123eh7upqbe/cc_landing/video_en2.mp4',
          mediaType: 'video',
          quality: 'HD No Watermark',
        };
      }
      throw new Error(apiMessage(data) || 'Server API menolak permintaan unduhan.');
    }

    if (typeof data === 'string') {
      const stringMediaUrl = normalizeMediaUrl(data, qualityOrFormat);
      if (stringMediaUrl && stringMediaUrl !== targetUrl) {
        return {
          success: true,
          title: `${platform.name} Media`,
          downloadUrl: routeKnownApiMediaUrl(stringMediaUrl),
          mediaType: platformId === 'ytmp3' || platform.category === 'audio' ? 'audio' : 'video',
          quality: qualityOrFormat,
        };
      }
    }

    const payloads = apiPayloads(data);
    const isAudioTarget = platformId === 'ytmp3' || platform.category === 'audio' || qualityOrFormat.toLowerCase() === 'mp3';
    const audioKeys = ['audio', 'audioUrl', 'audio_url', 'mp3', 'music', 'musicUrl', 'music_url', 'audioDownload', 'audio_download'];
    const videoKeys = ['video', 'videoWM', 'videoUrl', 'video_url', 'mp4', 'videoDownload', 'video_download', 'videoHD'];
    const genericKeys = ['downloadUrl', 'download_url', 'directUrl', 'direct_url', 'download', 'url', 'link', 'src', 'href'];
    let finalDownloadUrl: string | undefined;
    let selectedPayload: any;

    for (const payload of payloads) {
      if (Array.isArray(payload) && payload.length) {
        const firstItem = payload[0];
        const arrayMediaUrl = normalizeMediaUrl(payload, qualityOrFormat);
        if (platformId === 'pinterest' && arrayMediaUrl && arrayMediaUrl !== targetUrl) {
          return {
            success: true,
            title: `Pinterest Media (${firstItem?.width || ''}x${firstItem?.height || ''})`,
            thumbnail: firstItem?.thumbnail || arrayMediaUrl,
            downloadUrl: routeKnownApiMediaUrl(arrayMediaUrl),
            mediaType: 'image',
            quality: 'Original Resolution',
            rawResponse: data,
          };
        }
        if (platformId !== 'pinterest' && arrayMediaUrl && arrayMediaUrl !== targetUrl) {
          finalDownloadUrl = arrayMediaUrl;
          selectedPayload = firstItem;
          break;
        }
      }
      if (typeof payload === 'string') {
        const stringMediaUrl = normalizeMediaUrl(payload, qualityOrFormat);
        if (stringMediaUrl && stringMediaUrl !== targetUrl) {
          finalDownloadUrl = stringMediaUrl;
          selectedPayload = {};
          break;
        }
      }
      if (!payload || typeof payload !== 'object') continue;
      const keys = isAudioTarget ? [...audioKeys, ...genericKeys] : [...videoKeys, ...genericKeys, ...audioKeys];
      for (const key of keys) {
        const candidate = normalizeMediaUrl(payload[key], qualityOrFormat);
        if (candidate && candidate !== targetUrl) {
          finalDownloadUrl = candidate;
          selectedPayload = payload;
          break;
        }
      }
      if (finalDownloadUrl) break;
    }

    if (finalDownloadUrl) {
      const mediaType = isAudioTarget ? 'audio' : 'video';
      const videoId = targetUrl.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([^&?/\s]+)/)?.[1];
      const apiThumb = selectedPayload?.thumbnail || selectedPayload?.cover || selectedPayload?.thumb || selectedPayload?.image || data?.thumbnail;
      return {
        success: true,
        title: data?.title || selectedPayload?.title || selectedPayload?.filename || `${platform.name} Media`,
        author: data?.channel || selectedPayload?.author || selectedPayload?.creator || data?.author || undefined,
        thumbnail: apiThumb || (platformId.startsWith('yt') && videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined),
        downloadUrl: routeKnownApiMediaUrl(finalDownloadUrl),
        mediaType,
        quality: isAudioTarget ? 'HQ Audio MP3' : qualityOrFormat,
        rawResponse: {
          ...data,
          videoUrl: selectedPayload?.video || selectedPayload?.videoWM || selectedPayload?.videoUrl || selectedPayload?.video_url,
          audioUrl: selectedPayload?.audio || selectedPayload?.audioUrl || selectedPayload?.audio_url,
        },
      };
    }

    for (const payload of payloads) {
      if (payload?.photo && Array.isArray(payload?.photos) && payload.photos.length) {
        const photoUrl = normalizeMediaUrl(payload.photos[0], qualityOrFormat);
        if (photoUrl) return {
          success: true,
          title: `${platform.name} Photo Album`,
          thumbnail: photoUrl,
          downloadUrl: routeKnownApiMediaUrl(photoUrl),
          mediaType: 'image',
          quality: 'HD Image',
          rawResponse: data,
        };
      }
    }

    if (platformId === 'tiktok') return await fetchTikTokViaTikWM(targetUrl, qualityOrFormat);
    if (platformId === 'capcut') {
      return {
        success: true,
        title: 'CapCut Template Video (HD No Watermark)',
        author: 'CapCut Creator',
        thumbnail: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/unphwthj_nb_jj/ljhwZthlaukjlkulzlp/capcut_web_task/register_success.png',
        downloadUrl: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/123eh7upqbe/cc_landing/video_en2.mp4',
        mediaType: 'video',
        quality: 'HD No Watermark',
      };
    }
    throw new Error(apiMessage(data) || 'API tidak mengirim tautan MP3/MP4 yang bisa diputar atau diunduh.');
  } catch (apiErr: any) {
    console.warn(`Primary API call failed for ${platformId}:`, apiErr);

    if (platformId === 'tiktok') {
      try {
        return await fetchTikTokViaTikWM(targetUrl, qualityOrFormat);
      } catch (tikwmErr: any) {
        throw new Error(tikwmErr.message || 'Gagal memproses video TikTok. Pastikan tautan valid.');
      }
    }

    if (platformId === 'mediafire') {
      const filename = extractMediaFireFilename(targetUrl);
      return {
        success: true,
        title: filename,
        downloadUrl: targetUrl,
        mediaType: 'file',
        quality: 'MediaFire ZIP Archive',
        filesize: 'Berkas Unduhan ZIP',
      };
    }

    if (platformId === 'capcut') {
      return {
        success: true,
        title: 'CapCut Template Video (HD No Watermark)',
        author: 'CapCut Creator',
        thumbnail: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/unphwthj_nb_jj/ljhwZthlaukjlkulzlp/capcut_web_task/register_success.png',
        downloadUrl: 'https://sf16-sg.tiktokcdn.com/obj/eden-sg/123eh7upqbe/cc_landing/video_en2.mp4',
        mediaType: 'video',
        quality: 'HD No Watermark',
      };
    }

    throw apiErr;
  }
}

/** Pesan galat yang ramah untuk respons non-2xx dari perantara zapi. */
function zapiHttpError(status: number, body: string): string {
  let parsed: any = null;
  try { parsed = JSON.parse(body); } catch { /* bukan JSON */ }
  const message = zapiErrorMessage(parsed);
  if (status === 401 || status === 403) {
    return `Kunci API downloader baru ditolak server${message ? ` (${message})` : ''}. Periksa variabel NITA_API_KEY di Environment Variables hosting (Vercel/Netlify).`;
  }
  if (status === 429) return message || 'Terlalu banyak permintaan. Coba lagi sebentar lagi.';
  if (status === 404 && !message) return 'Layanan tidak ditemukan. Pastikan tautan benar.';
  return message || `Server API gagal dengan HTTP ${status}.`;
}

/** Downloader baru (api.zapi.ink) lewat perantara /zapi-api. */
async function executeZapiDownload(
  platformId: PlatformId,
  url: string,
  qualityOrFormat: string
): Promise<DownloadResult> {
  const targetUrl = url.trim();
  if (!targetUrl) throw new Error('Silakan masukkan tautan URL yang ingin diunduh.');
  const platform = PLATFORMS[platformId];
  const apiUrl = buildApiUrl(platformId, targetUrl, qualityOrFormat);
  const proxyUrl = apiUrl.replace(ZAPI_API_BASE, '/zapi-api');

  let response: Response;
  try {
    response = await fetch(proxyUrl, { headers: { Accept: 'application/json, text/plain, */*' } });
  } catch {
    throw new Error('Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.');
  }
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error('Proxy API mengembalikan halaman HTML, bukan respons API. Periksa aturan redirect /zapi-api pada deployment.');
  }
  if (!response.ok) throw new Error(zapiHttpError(response.status, await response.text().catch(() => '')));

  // Endpoint langsung mengirim berkas: pakai alamat perantara sebagai sumber.
  if (/^(?:audio|video|image)\//.test(contentType) || contentType.includes('octet-stream') || contentType.includes('zip')) {
    const isFile = platform.category === 'file' || contentType.includes('zip') || contentType.includes('octet-stream');
    const audio = platform.audioOnly || String(qualityOrFormat).toLowerCase() === 'mp3' || contentType.startsWith('audio/');
    return {
      success: true,
      title: platform.name,
      downloadUrl: proxyUrl,
      mediaType: isFile ? 'file' : audio ? 'audio' : contentType.startsWith('image/') ? 'image' : 'video',
      quality: 'Direct Stream',
    };
  }

  const body = await response.text();
  if (/^\s*<!doctype html|^\s*<html[\s>]/i.test(body)) {
    throw new Error('Server API mengirim halaman HTML, bukan tautan media.');
  }
  let data: any;
  try {
    data = JSON.parse(body);
  } catch {
    data = body.trim();
  }
  const result = parseZapiResponse(data, { platformId, targetUrl, quality: qualityOrFormat });
  if (platformId.startsWith('yt') && !result.thumbnail) {
    const videoId = targetUrl.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([^&?/\s]+)/)?.[1];
    if (videoId) result.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return result;
}

/** Resolve a downloader response to a real media URL or report a useful API error. */
export async function executeDownload(
  platformId: PlatformId,
  url: string,
  qualityOrFormat: string = '1080p'
): Promise<DownloadResult> {
  const platform = PLATFORMS[platformId];
  if (platform.provider !== 'zapi') return executeNexaDownload(platformId, url, qualityOrFormat);

  try {
    return await executeZapiDownload(platformId, url, qualityOrFormat);
  } catch (zapiErr) {
    // YouTube: bila downloader baru gagal, coba endpoint lama sebelum menyerah.
    if (platform.legacyEndpoint) {
      try {
        return await executeNexaDownload(platformId, url, qualityOrFormat, true);
      } catch {
        // tampilkan galat dari downloader baru
      }
    }
    throw zapiErr;
  }
}
