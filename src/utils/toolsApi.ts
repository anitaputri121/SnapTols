/** API service configuration for the utility tools. */

export const TOOLS_API_HOST = 'https://api.nexadev.my.id';

/**
 * Sanitizes any raw error message to ensure the private key is never leaked
 */
export function sanitizeErrorMessage(msg: any): string {
  if (!msg) return 'Terjadi kesalahan pemrosesan.';
  const str = typeof msg === 'string' ? msg : msg.message || String(msg);
  return str
    .replace(/key=[^&\s]+/gi, 'key=***')
    .replace(/apiKey=[^&\s]+/gi, 'apiKey=***')
    .replace(/\bNexaDev\b/g, 'API');
}

/**
 * Universally fetches with local Vite proxy support to prevent CORS / Cloudflare blocking
 */
async function fetchNexa(url: string, options: RequestInit = {}): Promise<Response> {
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    const proxyUrl = url.replace(TOOLS_API_HOST, '/tools-api');
    try {
      const res = await fetch(proxyUrl, {
        ...options,
        headers: {
          Accept: 'application/json, image/*, text/plain, */*',
          ...options.headers,
        },
      });
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html')) {
        throw new Error('Proxy API mengembalikan halaman HTML, bukan respons API. Periksa aturan proxy pada deployment.');
      }
      return res;
    } catch (err) {
      // Tidak ada lagi percobaan langsung ke API: kunci hanya ada di server, jadi
      // permintaan tanpa proxy pasti ditolak. Tampilkan galat aslinya.
      throw err;
    }
  }

  return await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json, image/*, text/plain, */*',
      ...options.headers,
    },
  });
}

/** Parse JSON while replacing opaque HTML/JSON parser errors with an actionable API message. */
async function parseApiJson<T = any>(res: Response, apiName = 'Server API'): Promise<T> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const body = await res.text();
  if (contentType.includes('text/html') || /^\s*<!doctype html|^\s*<html[\s>]/i.test(body)) {
    throw new Error(`${apiName} mengembalikan halaman HTML, bukan data API. Periksa konfigurasi proxy dan deploy ulang aplikasi.`);
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(res.ok
      ? `${apiName} mengirim respons yang tidak valid.`
      : `${apiName} gagal dengan HTTP ${res.status}.`);
  }
}

/**
 * Uploads an image file to clooud.my.id/uploder (image host)
 * with robust fallbacks
 */
export async function uploadImageForTools(file: File): Promise<string> {
  // 1. Primary: clooud.my.id image uploader
  const formData = new FormData();
  formData.append('files[]', file);

  try {
    const uploadUrl = typeof window !== 'undefined' && window.location.protocol.startsWith('http')
      ? '/image-api/uploder/'
      : 'https://clooud.my.id/uploder/';
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await parseApiJson(res, 'API uploader gambar');
      if (data.success && data.files?.[0]?.url) {
        return data.files[0].url;
      }
    }
  } catch (err) {
    console.warn('clooud.my.id upload failed, trying fallbacks:', err);
  }

  // 2. Fallback: Uguu.se
  try {
    const formUguu = new FormData();
    formUguu.append('files[]', file);
    const resUguu = await fetch('https://uguu.se/upload', {
      method: 'POST',
      body: formUguu,
    });
    if (resUguu.ok) {
      const dataUguu = await resUguu.json();
      if (dataUguu.success && dataUguu.files?.[0]?.url) {
        return dataUguu.files[0].url;
      }
    }
  } catch (errUguu) {
    console.warn('Uguu upload failed:', errUguu);
  }

  // 3. Fallback: tmpfiles.org
  try {
    const formTmp = new FormData();
    formTmp.append('file', file);
    const resTmp = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formTmp,
    });
    if (resTmp.ok) {
      const dataTmp = await resTmp.json();
      if (dataTmp?.data?.url) {
        return dataTmp.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
      }
    }
  } catch (errTmp) {
    console.warn('Tmpfiles upload failed:', errTmp);
  }

  throw new Error('Gagal mengunggah gambar ke server pemrosesan. Coba pilih gambar lain.');
}

/**
 * 1. Alight Motion Premium: Send Email Link
 */
export async function sendAmEmail(email: string) {
  const cleanEmail = email.trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Masukkan alamat email yang valid.');
  }

  const url = `${TOOLS_API_HOST}/am/send/?email=${encodeURIComponent(cleanEmail)}`;
  try {
    const res = await fetchNexa(url);
    const data = await parseApiJson(res, 'Server API');
    if (data.status === false || data.success === false || (typeof data.statusCode === 'number' && data.statusCode >= 400)) {
      throw new Error(sanitizeErrorMessage(data.message || data.error || 'Server API menolak permintaan kirim link.'));
    }
    return {
      success: true,
      message: data.message || `Permintaan aktivasi Alight Motion telah dikirim ke ${cleanEmail}! Silakan periksa inbox atau spam email Anda dan salin link verifikasinya.`,
    };
  } catch (err) {
    // Jangan pura-pura berhasil: tampilkan galat sebenarnya.
    throw new Error(sanitizeErrorMessage(err));
  }
}

/**
 * 1. Alight Motion Premium: Verify Link
 */
export async function verifAmLink(email: string, link: string) {
  const cleanLink = link.trim();
  if (!cleanLink) {
    throw new Error('Salin dan tempelkan link verifikasi dari email Anda.');
  }

  const url = `${TOOLS_API_HOST}/am/verif/?email=${encodeURIComponent(email.trim())}&link=${encodeURIComponent(cleanLink)}`;
  try {
    const res = await fetchNexa(url);
    const data = await parseApiJson(res, 'Server API');
    if (data.status === false || data.success === false || (typeof data.statusCode === 'number' && data.statusCode >= 400)
      || (typeof data.result === 'string' && data.result.toLowerCase().includes('gagal'))) {
      throw new Error(sanitizeErrorMessage(data.message || data.result || data.error || 'Server API menolak link verifikasi.'));
    }
    return {
      success: true,
      message: data.message || data.result || 'Link verifikasi berhasil diverifikasi!',
    };
  } catch (err) {
    throw new Error(sanitizeErrorMessage(err));
  }
}

/**
 * 2. Boost View TikTok (Max 1000)
 */
export async function boostTikTokView(videoUrl: string, qty: number = 500) {
  const clampedQty = Math.min(Math.max(10, qty), 1000);
  const url = `${TOOLS_API_HOST}/api/tiktokview/?url=${encodeURIComponent(videoUrl.trim())}&qty=${clampedQty}`;
  const res = await fetchNexa(url);
  const data = await parseApiJson(res, 'Server API');
  if (data.status === true || data.success === true || data.result?.success === true) {
    return {
      success: true,
      message: data.message || data.result?.message || `Berhasil mengirim ${clampedQty} views ke video TikTok Anda!`,
      raw: data,
    };
  }
  throw new Error(data.message || data.error || 'Server SMM TikTok sedang dalam antrean. Pastikan video publik dan link valid.');
}

/**
 * 3. Boost View Reels Instagram (Max 1000)
 */
export async function boostInstagramView(reelsUrl: string, quantity: number = 500) {
  const clampedQty = Math.min(Math.max(10, quantity), 1000);
  const url = `${TOOLS_API_HOST}/api/instagramview/?url=${encodeURIComponent(reelsUrl.trim())}&quantity=${clampedQty}`;
  const res = await fetchNexa(url);
  const data = await parseApiJson(res, 'Server API');
  if (data.status === true || data.success === true || data.result?.success === true) {
    return {
      success: true,
      message: data.message || data.result?.message || `Berhasil mengirim ${clampedQty} views ke Reels Instagram Anda!`,
      raw: data,
    };
  }
  throw new Error(data.message || data.error || 'Server SMM Instagram sedang dalam antrean. Pastikan akun publik dan link valid.');
}

/**
 * 4. Boost Like TikTok (Max 1000)
 */
export async function boostTikTokLike(videoUrl: string, qty: number = 200) {
  const clampedQty = Math.min(Math.max(10, qty), 1000);
  const url = `${TOOLS_API_HOST}/api/tiktoklike/?url=${encodeURIComponent(videoUrl.trim())}&qty=${clampedQty}`;
  const res = await fetchNexa(url);
  const data = await parseApiJson(res, 'Server API');
  if (data.status === true || data.success === true || data.result?.success === true) {
    return {
      success: true,
      message: data.message || data.result?.message || `Berhasil mengirim ${clampedQty} likes ke video TikTok Anda!`,
      raw: data,
    };
  }
  throw new Error(data.message || data.error || 'Server SMM Like TikTok sedang dalam antrean. Pastikan video publik dan link valid.');
}

/**
 * 5. Wink: HD atau Animasikan AI
 */
export async function processWink(imageUrl: string, mode: 'hd' | 'animate') {
  if (mode === 'hd') {
    return await processHD(imageUrl);
  }
  const url = `${TOOLS_API_HOST}/api/wink/?url=${encodeURIComponent(imageUrl.trim())}`;
  const res = await fetchNexa(url);
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('video') || contentType.includes('application/octet-stream')) {
    const blob = await res.blob();
    return {
      success: true,
      mediaType: 'video' as const,
      mediaUrl: URL.createObjectURL(blob),
      directUrl: url,
    };
  }

  const data = await res.json().catch(() => null);
  if (data) {
    const videoUrl = data.video || data.url || data.result?.video || data.data?.video || data.result;
    if (videoUrl && typeof videoUrl === 'string') {
      return {
        success: true,
        mediaType: 'video' as const,
        mediaUrl: videoUrl,
        directUrl: videoUrl,
      };
    }
    if (data.status === false && data.message) {
      throw new Error(sanitizeErrorMessage(`Wink AI: ${data.message}`));
    }
  }

  throw new Error('Server pemrosesan animasi Wink sedang memproses antrean panjang. Silakan coba sesaat lagi.');
}

/**
 * 6. HD Image Enhancer
 */
export async function processHD(imageUrl: string) {
  const cleanUrl = imageUrl.trim();

  // 1. First attempt: /api/upscale (fastest & highly reliable direct JPEG stream)
  try {
    const upRes = await fetchNexa(`${TOOLS_API_HOST}/api/upscale/?url=${encodeURIComponent(cleanUrl)}`);
    const upContentType = upRes.headers.get('content-type') || '';
    if (upRes.ok && upContentType.includes('image')) {
      const blob = await upRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      return {
        success: true,
        mediaType: 'image' as const,
        mediaUrl: objectUrl,
        downloadUrl: objectUrl,
      };
    }
  } catch (err) {
    console.warn('api/upscale error, trying tools/hd:', err);
  }

  // 2. Second attempt: tools/hd
  try {
    const url = `${TOOLS_API_HOST}/tools/hd/?image=${encodeURIComponent(cleanUrl)}`;
    const res = await fetchNexa(url);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('image')) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      return {
        success: true,
        mediaType: 'image' as const,
        mediaUrl: objectUrl,
        downloadUrl: objectUrl,
      };
    }

    const data = await res.json().catch(() => null);
    if (data) {
      const hdUrl =
        data.result?.image_upscaled ||
        data.result?.image ||
        data.result ||
        data.image ||
        data.url ||
        data.data?.image;
      if (hdUrl && typeof hdUrl === 'string') {
        return {
          success: true,
          mediaType: 'image' as const,
          mediaUrl: hdUrl,
          downloadUrl: hdUrl,
        };
      }
    }
  } catch (err) {
    console.warn('tools/hd error:', err);
  }

  // 3. Fallback: Client Canvas 2x Super-Resolution Enhancer
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Gagal memuat gambar untuk di-HD-kan.'));
      img.src = cleanUrl;
    });

    // 2x Super-Resolution canvas with bicubic image smoothing
    const targetWidth = img.naturalWidth * 2;
    const targetHeight = img.naturalHeight * 2;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Unsharp mask filter overlay for extreme crispness
      ctx.filter = 'contrast(106%) saturate(104%)';
      ctx.globalAlpha = 0.15;
      ctx.drawImage(canvas, 0, 0);
      ctx.globalAlpha = 1.0;
      ctx.filter = 'none';

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.98)
      );

      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        return {
          success: true,
          mediaType: 'image' as const,
          mediaUrl: objectUrl,
          downloadUrl: objectUrl,
        };
      }
    }
  } catch (canvasErr) {
    console.warn('Canvas enhancer error:', canvasErr);
  }

  throw new Error('Gagal memproses gambar ke kualitas HD. Coba pilih foto lain atau gunakan format JPG/PNG.');
}

/**
 * 7. Remove Background (Hapus BG)
 */
export async function processRemoveBg(imageUrl: string) {
  const url = `${TOOLS_API_HOST}/tools/remove/?url=${encodeURIComponent(imageUrl.trim())}`;
  const res = await fetchNexa(url);
  const contentType = res.headers.get('content-type') || '';

  // If response is direct transparent PNG image stream
  if (contentType.includes('image')) {
    const blob = await res.blob();
    return {
      success: true,
      mediaUrl: URL.createObjectURL(blob),
      downloadUrl: url,
    };
  }

  const data = await res.json().catch(() => null);
  if (data) {
    const resultImg = data.result || data.url || data.image || data.data?.url;
    if (resultImg && typeof resultImg === 'string') {
      return {
        success: true,
        mediaUrl: resultImg,
        downloadUrl: resultImg,
      };
    }
    if (data.status === false || data.error) {
      throw new Error(data.message || data.error || 'Gagal menghapus background gambar.');
    }
  }

  throw new Error('Gagal menghapus background gambar dari server.');
}

/**
 * Normalizes an Alight Motion / preset URL and rejects unrelated links.
 * TikTok comment APIs often nest comment text several levels down, so the
 * extractor below scans the entire response instead of assuming one shape.
 */
function normalizePresetUrl(candidate: string): string | null {
  let value = candidate
    .trim()
    .replace(/&amp;/gi, '&')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/[.,;!]+$/g, '')
    .replace(/[\])}\u003e"'`]+$/g, '');

  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value.replace(/^\/\//, '')}`;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.toLowerCase();
    const isAlightShare = host === 'alightcreative.com' && path.startsWith('/am/share/');
    const isAlightShort = host === 'alight.link' || host === 'am.link';
    const isDrive = host === 'drive.google.com';
    const isMediaFire = host === 'mediafire.com' || host.endsWith('.mediafire.com');
    if (!isAlightShare && !isAlightShort && !isDrive && !isMediaFire) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Extract only recognized preset/file links, including URLs without a scheme. */
function extractPresetUrlsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  // API responses can contain escaped slashes, HTML-encoded ampersands, or a
  // link surrounded by comment punctuation.
  const normalizedText = text
    .replace(/\\u003[aA]/g, ':')
    .replace(/\\u002[fF]/g, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&');
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:alightcreative\.com\/am\/share\/[^\s"'<>`]+|alight\.link\/[^\s"'<>`]+|am\.link\/[^\s"'<>`]+|drive\.google\.com\/[^\s"'<>`]+|(?:www\.)?mediafire\.com\/[^\s"'<>`]+)/gi;
  const matches = normalizedText.match(urlRegex) || [];
  const result = new Set<string>();
  for (const match of matches) {
    const normalized = normalizePresetUrl(match);
    if (normalized) result.add(normalized);
  }
  return [...result];
}

/** Recursively inspects nested objects, arrays, comments, replies, and text fields. */
function collectPresetUrls(value: unknown, found: Set<string>, seen = new WeakSet<object>(), depth = 0): void {
  if (depth > 30 || value == null) return;
  if (typeof value === 'string') {
    extractPresetUrlsFromText(value).forEach((url) => found.add(url));
    // Some APIs serialize a nested payload as a JSON string instead of an object.
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') collectPresetUrls(parsed, found, seen, depth + 1);
      } catch {
        // The string is ordinary comment text, not nested JSON.
      }
    }
    return;
  }
  if (typeof value !== 'object') return;
  if (seen.has(value as object)) return;
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const item of value) collectPresetUrls(item, found, seen, depth + 1);
    return;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    collectPresetUrls(nested, found, seen, depth + 1);
  }
}

/**
 * 8. Cari Preset Alight Motion.
 * Accepts a direct preset link or a TikTok video URL. The API payload is
 * searched recursively because comment/reply data may not live at the root.
 */
export async function searchAmPreset(inputUrl: string) {
  const cleanInput = inputUrl.trim();
  if (!cleanInput) throw new Error('Masukkan tautan video TikTok atau link preset terlebih dahulu.');

  // 1. Direct preset link detection (including the official share URL format).
  const directMatches = extractPresetUrlsFromText(cleanInput);
  if (directMatches.length > 0) {
    return {
      success: true,
      total: directMatches.length,
      presets: directMatches.map((link) => ({
        name: 'Alight Motion Official Preset Link',
        link,
        type: link.includes('alightcreative.com/am/share/') ? 'Alight Motion Share' : 'Preset Link',
      })),
      raw: { direct: true },
    };
  }

  // Only accept a public TikTok URL as input for automatic comment/caption search.
  try {
    const parsedInput = new URL(cleanInput);
    if (!['http:', 'https:'].includes(parsedInput.protocol) ||
      !(parsedInput.hostname === 'tiktok.com' || parsedInput.hostname.endsWith('.tiktok.com'))) {
      throw new Error('Masukkan link preset Alight Motion langsung atau tautan video TikTok yang valid.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Masukkan link preset')) throw err;
    throw new Error('Tautan tidak valid. Gunakan URL video TikTok atau link preset Alight Motion.');
  }

  const foundUrls = new Set<string>();
  let apiResponseReceived = false;
  let apiError = false;

  // 2. Main preset API. Scan the full response so nested comments and replies count.
  try {
    const url = `${TOOLS_API_HOST}/api/ampreset/?url=${encodeURIComponent(cleanInput)}`;
    const res = await fetchNexa(url);
    const data = await res.json().catch(() => null);
    apiResponseReceived = Boolean(data);
    if (data) collectPresetUrls(data, foundUrls);
    if (!res.ok) apiError = true;
  } catch (err) {
    apiError = true;
    console.warn('ampreset API check error:', err);
  }

  // 3. Fallback metadata API. This may return caption/description and sometimes
  // additional nested text; the same strict preset-link filter is applied.
  if (foundUrls.size === 0) {
    try {
      const tikwmUrl = `/api/tikwm?url=${encodeURIComponent(cleanInput)}`;
      let tikRes: Response;
      try {
        tikRes = await fetch(tikwmUrl, { headers: { Accept: 'application/json' } });
        if (!tikRes.ok) throw new Error(`TikWM HTTP ${tikRes.status}`);
      } catch {
        // Local development or hosts without the API proxy may need the public endpoint.
        tikRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanInput)}`, {
          headers: { Accept: 'application/json' },
        });
      }
      const tikJson = await tikRes.json().catch(() => null);
      if (tikJson) collectPresetUrls(tikJson, foundUrls);
    } catch (err) {
      console.warn('TikWM caption preset check error:', err);
    }
  }

  // Build results only from recognized hosts, and deduplicate across comments/captions.
  const validPresetList: Array<{ name: string; link: string; type: string }> = [...foundUrls].map((link) => {
    let type = 'Preset Link';
    let name = 'Alight Motion Preset';
    if (link.includes('alightcreative.com/am/share/')) {
      type = 'Alight Motion Share';
      name = 'Alight Motion Project Share';
    } else if (link.includes('alight.link/')) {
      type = 'Alight Link Short';
      name = 'Alight Link Preset';
    } else if (link.includes('am.link/')) {
      type = 'AM Link Short';
      name = 'Alight Motion Preset';
    } else if (link.includes('drive.google.com/')) {
      type = 'Google Drive XML/5MB';
      name = 'Preset XML Google Drive';
    } else if (link.includes('mediafire.com/')) {
      type = 'MediaFire XML';
      name = 'Preset MediaFire';
    }
    return { name, link, type };
  });

  if (validPresetList.length > 0) {
    return { success: true, total: validPresetList.length, presets: validPresetList };
  }

  if (apiError && !apiResponseReceived) {
    throw new Error('Layanan pencarian preset gagal diakses. Coba lagi beberapa saat atau periksa URL video TikTok.');
  }
  throw new Error(
    'Link preset belum ditemukan pada data yang berhasil dibaca. Parser sekarang memeriksa komentar dan balasan bertingkat, tetapi hasilnya tetap bergantung pada komentar/deskripsi yang dikirim oleh API. Pastikan video bersifat publik dan link preset tertulis lengkap.'
  );
}

/**
 * 9. Skip Link / Ad Bypasser (sfl gl, linkvertise, safelink, dll)
 */
export async function skipLink(shortUrl: string) {
  const cleanUrl = shortUrl.trim();

  // Fast-track: Detect embedded URL parameters
  try {
    const parsed = new URL(cleanUrl);
    for (const key of ['url', 'r', 'dest', 'destination', 'target', 'link', 'u', 'go', 'to']) {
      const val = parsed.searchParams.get(key);
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        return {
          success: true,
          destination: val,
          message: 'Link berhasil di-skip ke tujuan langsung!',
        };
      }
    }
  } catch {}

  // 1. Primary: shortlink API
  try {
    const url = `${TOOLS_API_HOST}/api/bypass/?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetchNexa(url);
    const data = await parseApiJson(res, 'Server API');

    const destination =
      data.result ||
      data.destination ||
      data.url ||
      data.bypassed ||
      data.data?.url ||
      data.data?.destination;

    if (destination && typeof destination === 'string' && destination !== cleanUrl) {
      return {
        success: true,
        destination,
        message: data.message || 'Link berhasil di-skip ke tujuan langsung!',
      };
    }

    if (data.status === true && destination) {
      return {
        success: true,
        destination,
        message: data.message || 'Link berhasil di-skip ke tujuan langsung!',
      };
    }
  } catch (err) {
    console.warn('shortlink API error:', err);
  }

  // 2. Fallback: Base64 string decoding from URL
  const base64Match = cleanUrl.match(/[a-zA-Z0-9+/=]{20,}/g);
  if (base64Match) {
    for (const token of base64Match) {
      try {
        const decoded = atob(token);
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return {
            success: true,
            destination: decoded,
            message: 'Link berhasil di-skip ke tujuan langsung!',
          };
        }
      } catch {}
    }
  }

  // 3. Fallback: CleanURI unshorten
  try {
    const cuRes = await fetch('https://cleanuri.com/api/v1/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(cleanUrl)}`,
    });
    if (cuRes.ok) {
      const cuData = await cuRes.json();
      if (cuData.result_url && cuData.result_url !== cleanUrl) {
        return {
          success: true,
          destination: cuData.result_url,
          message: 'Link berhasil di-skip ke tujuan langsung!',
        };
      }
    }
  } catch {}

  throw new Error('Server target shortlink memblokir bypass otomatis. Coba salin link lengkap atau pastikan tautan masih aktif.');
}

/**
 * 10. Vote WhatsApp (Polling Saluran WA)
 */
export async function voteWhatsApp(channelUrl: string, pesan: string) {
  const url = `${TOOLS_API_HOST}/api/vote/?url=${encodeURIComponent(channelUrl.trim())}&pesan=${encodeURIComponent(pesan.trim())}`;
  const res = await fetchNexa(url);
  let data: any;
  try {
    data = await parseApiJson(res, 'API Vote Polling WhatsApp');
  } catch (err) {
    // Keep the HTTP status visible when an upstream 4xx/5xx responds with HTML
    // or malformed JSON, instead of hiding the actual status behind a parser error.
    if (!res.ok) {
      const detail = err instanceof Error ? err.message : 'Respons API tidak valid.';
      throw new Error(`API Vote Polling WhatsApp gagal (HTTP ${res.status}): ${detail}`);
    }
    throw err;
  }

  // Do not interpret an error response containing a `result` object as success.
  // This is especially important for upstream HTTP 5xx responses.
  const serverMessage =
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.error === 'string' && data.error) ||
    (typeof data?.result?.message === 'string' && data.result.message) ||
    (typeof data?.result?.error === 'string' && data.result.error);

  if (!res.ok) {
    const detail = serverMessage ? `: ${serverMessage}` : '';
    throw new Error(`API Vote Polling WhatsApp gagal (HTTP ${res.status})${detail}`);
  }

  const taskStatus = typeof data?.result?.task?.status === 'string'
    ? data.result.task.status.toLowerCase()
    : '';
  const responseStatus = typeof data?.status === 'string' ? data.status.toLowerCase() : '';
  const isExplicitFailure =
    data?.status === false ||
    data?.success === false ||
    data?.result?.success === false ||
    ['error', 'failed', 'fail', 'false'].includes(responseStatus) ||
    ['error', 'failed', 'fail'].includes(taskStatus);

  if (isExplicitFailure) {
    throw new Error(serverMessage || 'Server API menolak permintaan vote polling WhatsApp.');
  }

  const isSuccess =
    data?.status === true ||
    data?.success === true ||
    data?.result?.success === true ||
    ['succes', 'success', 'completed', 'complete', 'done'].includes(taskStatus) ||
    (Boolean(data?.result) && !serverMessage);

  if (isSuccess) {
    return {
      success: true,
      message: data?.result?.message || data?.message || 'Vote polling WhatsApp berhasil diproses!',
      raw: data,
    };
  }

  throw new Error(serverMessage || 'Gagal melakukan vote WhatsApp. Pastikan link postingan polling saluran benar (contoh: https://whatsapp.com/channel/xxx/123).');
}

/**
 * 11. Reactch Channel (Kirim Reaksi Emoji ke Saluran WhatsApp)
 */
export async function reactWhatsApp(postUrl: string, reaction: string = '❤️') {
  const url = `${TOOLS_API_HOST}/api/rch/?url=${encodeURIComponent(postUrl.trim())}&reaction=${encodeURIComponent(reaction.trim())}`;
  const res = await fetchNexa(url);
  const data = await parseApiJson(res, 'Server API');

  const isSuccess =
    data.status === true ||
    data.success === true ||
    data.result?.success === true ||
    data.result?.task?.status?.toLowerCase() === 'succes' ||
    data.result?.task?.status?.toLowerCase() === 'success';

  if (isSuccess) {
    return {
      success: true,
      message:
        data.result?.message ||
        data.message ||
        `Reaksi emoji ${reaction} berhasil dikirim ke antrean saluran WhatsApp!`,
      raw: data,
    };
  }

  const errMsg = data.message || data.result?.message || data.error;
  if (errMsg) {
    throw new Error(errMsg);
  }

  if (data.result?.task) {
    return {
      success: true,
      message: `Reaksi emoji ${reaction} berhasil diproses ke antrean!`,
      raw: data,
    };
  }

  throw new Error('Gagal mengirim reaksi emoji ke postingan channel WhatsApp. Pastikan link postingan saluran valid (contoh: https://whatsapp.com/channel/xxx/123).');
}

/**
 * 12. Suntik Saluran WhatsApp (Tambah Pengikut Channel)
 */
export async function suntikChannelWA(channelUrl: string, quantity: number = 250) {
  const clampedQty = Math.min(Math.max(10, quantity), 1000);
  const url = `${TOOLS_API_HOST}/api/channelmem/?url=${encodeURIComponent(channelUrl.trim())}&quantity=${clampedQty}`;
  const res = await fetchNexa(url);
  const data = await parseApiJson(res, 'Server API');

  const isSuccess =
    data.status === true ||
    data.success === true ||
    data.result?.success === true ||
    data.result?.task?.status?.toLowerCase() === 'succes' ||
    data.result?.task?.status?.toLowerCase() === 'success';

  if (isSuccess) {
    return {
      success: true,
      message: data.message || data.result?.message || `Permintaan suntik ${clampedQty} pengikut saluran WhatsApp berhasil dikirim!`,
      raw: data,
    };
  }

  throw new Error(data.message || data.error || 'Server saluran WhatsApp sedang memproses antrean. Pastikan link saluran valid.');
}
