// Semua handler server dipakai bersama oleh Vercel (api/gateway.js) dan Netlify (netlify/functions/*).
// Tiap handler menerima Request standar dan mengembalikan Response standar.
// Kunci API HANYA dibaca dari Environment Variables server:
//   ANITA_API_KEY -> API nexadev (Downloader, Anime, Komik, DramaBox, Tools, Spotify, chat Snaping)
//   NITA_API_KEY  -> downloader baru (api.zapi.ink)
import { checkRate, clientIp, tooManyRequests } from './lib/guard.mjs';
import { proxyNexa, readServerKey } from './lib/proxy.mjs';
import { proxyZapi } from './lib/zapi.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Rute /tools-api/* (dan /nexadev/*) -> https://api.nexadev.my.id/*
export const nexadev = (request) => proxyNexa(request, {
  functionName: 'nexadev',
  routePrefixes: ['/nexadev/', '/tools-api/'],
  upstreamBase: 'https://api.nexadev.my.id',
  passthrough: true,
  // Endpoint yang rawan disalahgunakan (menambah view/like/vote, kirim email): dibatasi ketat per IP.
  strictPaths: [
    /^\/am\/send\/?$/,
    /^\/api\/(?:tiktokview|instagramview|tiktoklike|vote|rch|channelmem)\/?$/,
  ],
  keyedPaths: [
    /^\/am\/(?:send|verif)\/?$/,
    /^\/api\/(?:tiktokview|instagramview|tiktoklike|wink|upscale|ampreset|bypass|vote|rch|channelmem)\/?$/,
    /^\/tools\/(?:hd|remove)\/?$/,
  ],
});

// Rute /media-api/* (dan /api/nexadev/*) -> https://api.nexadev.my.id/api/*
export const apiNexadev = (request) => proxyNexa(request, {
  functionName: 'api-nexadev',
  routePrefixes: ['/api/nexadev/', '/media-api/'],
  upstreamBase: 'https://api.nexadev.my.id',
  upstreamPrefix: '/api',
  passthrough: true,
  keyedPaths: [
    /^\/aio\/?$/,
    /^\/ytmp4\/?$/,
    /^\/ytmp3\/?$/,
    /^\/fb\/?$/,
    /^\/ig\/?$/,
    /^\/capcut\/?$/,
    /^\/mediafire\/?$/,
    /^\/pin\/?$/,
    /^\/twitter\/?$/,
    /^\/threads\/?$/,
    /^\/tiktok\/?$/,
    /^\/spotifyplay\/?$/,
    /^\/spotifypl\/?$/,
    /^\/dramabox\/(?:home|categories|browse|search|detail|video)\/?$/,
  ],
});

// Rute /anime-api/* (dan /apii/*) -> https://apii.nexadev.my.id/*. Jalur lain ditolak.
export const apii = (request) => proxyNexa(request, {
  functionName: 'apii',
  routePrefixes: ['/apii/', '/anime-api/'],
  upstreamBase: 'https://apii.nexadev.my.id',
  passthrough: false,
  keyedPaths: [
    /^\/anime\/?$/,
    /^\/animasu\/?$/,
    /^\/komik(?:\/(?:update|daftar|detail|stream))?\/?$/,
  ],
});

// Rute /zapi-api/* -> https://api.zapi.ink/v1/* (endpoint downloader saja), kunci NITA_API_KEY.
export const zapi = (request) =>
  proxyZapi(request, { kind: 'api', functionName: 'zapi', routePrefixes: ['/zapi-api/'] });

// Rute /zapi-file/* -> https://api.zapi.ink/* (berkas/media hasil unduhan). GET/HEAD saja.
export const zapiFile = (request) =>
  proxyZapi(request, { kind: 'file', functionName: 'zapi-file', routePrefixes: ['/zapi-file/'] });

// Mencari audio penuh lewat API nexadev (spotifyplay), kunci ANITA_API_KEY.
export async function spotify(request) {
  const q = new URL(request.url).searchParams.get('q') || '';
  if (!q.trim() || q.length > 200) {
    return Response.json({ success: false, message: 'Parameter q wajib diisi.' }, { status: 400 });
  }
  const rate = checkRate(`spotify:${clientIp(request)}`, 40);
  if (!rate.ok) return tooManyRequests(rate.retryAfter);
  const key = readServerKey();
  if (!key) {
    return Response.json({ success: false, message: 'Kunci API belum diatur di server.' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
  for (const name of ['key', 'apikey', 'apiKey']) {
    try {
      const u = new URL('https://api.nexadev.my.id/api/spotifyplay');
      u.searchParams.set('q', q);
      u.searchParams.set(name, key);
      const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'application/json' }, redirect: 'follow' });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || /text\/html/i.test(type)) continue;
      let text = await r.text();
      text = text.split(key).join('[redacted]');
      return new Response(text, {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=1800' },
      });
    } catch {
      /* coba nama parameter berikutnya */
    }
  }
  return Response.json({ success: false, message: 'Audio penuh tidak tersedia.' }, { status: 502, headers: { 'cache-control': 'no-store' } });
}

// Penerus (proxy) untuk LRCLIB bila browser tidak bisa menghubunginya langsung.
export async function lyrics(request) {
  const params = new URL(request.url).searchParams;
  const path = params.get('path');
  if (path !== 'get' && path !== 'search') {
    return Response.json({ message: 'path tidak valid' }, { status: 400 });
  }
  params.delete('path');
  params.delete('_svc');
  try {
    const r = await fetch(`https://lrclib.net/api/${path}?${params.toString()}`, {
      headers: { 'user-agent': 'SnapTools (https://snaptools.netlify.app)' },
    });
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  } catch {
    return Response.json({ message: 'LRCLIB tidak dapat dihubungi' }, { status: 502 });
  }
}

function isTikTokUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      (url.hostname === 'tiktok.com' || url.hostname.endsWith('.tiktok.com'));
  } catch { return false; }
}

export async function tikwm(request) {
  if (request.method !== 'GET') {
    return Response.json({ code: -1, msg: 'Gagal' }, { status: 405, headers: { Allow: 'GET' } });
  }
  const incoming = new URL(request.url);
  const targetUrl = incoming.searchParams.get('url');
  if (!targetUrl || !isTikTokUrl(targetUrl)) {
    return Response.json({ code: -1, msg: 'Gagal' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const upstreamUrl = new URL('https://www.tikwm.com/api/');
    upstreamUrl.searchParams.set('url', targetUrl);
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; AnitaDownloader/1.0)' },
      redirect: 'follow',
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ code: -1, msg: 'Gagal' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

/** CleanURI di sisi server untuk alat Skip Link (menghindari CORS browser). */
export async function cleanuri(request) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
  }
  try {
    const body = await request.text();
    const upstream = await fetch('https://cleanuri.com/api/v1/replace', {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AnitaDownloader/1.0)',
      },
      body,
      redirect: 'follow',
    });
    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    return new Response(text, { status: upstream.status, headers: { 'content-type': contentType, 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Gagal menghubungi layanan tautan.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}

// ---- Uploader gambar dengan cadangan beberapa penyedia (menghindari CORS browser) ----
const noStore = { 'Cache-Control': 'no-store' };
const jsonResponse = (body, status = 200) => Response.json(body, { status, headers: noStore });

function fileFrom(formData) {
  const file = formData.get('files[]') || formData.get('file') || formData.get('files');
  return file && typeof file === 'object' && typeof file.arrayBuffer === 'function' ? file : null;
}
function fileForm(field, file) {
  const form = new FormData();
  form.append(field, file, file.name || 'upload.bin');
  return form;
}
function normalizeUrl(value) {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : null;
}
async function tryJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return null; }
}

export async function clooud(request) {
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed.' }, 405);
  }
  let file;
  try {
    file = fileFrom(await request.formData());
  } catch {
    return jsonResponse({ success: false, message: 'Format unggahan tidak valid.' }, 400);
  }
  if (!file) return jsonResponse({ success: false, message: 'File gambar tidak ditemukan.' }, 400);

  // 1. Uploader asli dari proyek sumber.
  try {
    const upstream = await fetch('https://clooud.my.id/uploder/', {
      method: 'POST',
      headers: { Accept: 'application/json, text/plain, */*', 'User-Agent': 'Mozilla/5.0 (compatible; AnitaDownloader/1.0)' },
      body: fileForm('files[]', file),
      redirect: 'follow',
    });
    const data = await tryJson(upstream);
    const url = normalizeUrl(data?.files?.[0]?.url || data?.url || data?.data?.url);
    if (upstream.ok && url) return jsonResponse({ success: true, files: [{ url }] });
  } catch {}

  // 2. Cadangan Uguu.
  try {
    const upstream = await fetch('https://uguu.se/upload', {
      method: 'POST',
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; AnitaDownloader/1.0)' },
      body: fileForm('files[]', file),
      redirect: 'follow',
    });
    const data = await tryJson(upstream);
    const url = normalizeUrl(data?.files?.[0]?.url || data?.files?.[0]?.url_full || data?.url);
    if (upstream.ok && url) return jsonResponse({ success: true, files: [{ url }] });
  } catch {}

  // 3. Cadangan tmpfiles.org, disesuaikan ke skema yang dipakai UI web.
  try {
    const upstream = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; AnitaDownloader/1.0)' },
      body: fileForm('file', file),
      redirect: 'follow',
    });
    const data = await tryJson(upstream);
    let url = normalizeUrl(data?.data?.url || data?.url);
    if (upstream.ok && url) {
      url = url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
      return jsonResponse({ success: true, files: [{ url }] });
    }
  } catch {}

  return jsonResponse({ success: false, message: 'Gagal mengunggah gambar ke layanan pemrosesan.' }, 502);
}

// Chat Snaping lewat API nexadev GPT-4 (https://api.nexadev.my.id/ai/gpt4?q=), kunci ANITA_API_KEY.
// Kontrak dengan frontend tidak berubah: POST { message, systemInstruction } -> { reply }.
// GET ?message=... juga diterima (untuk uji cepat).
const CHAT_UPSTREAM = 'https://api.nexadev.my.id/ai/gpt4/';
const CHAT_MAX_MESSAGE = 1000;
const CHAT_MAX_SYSTEM = 4000;
const CHAT_TIMEOUT_MS = 28_000;
const REPLY_FIELDS = ['result', 'response', 'answer', 'reply', 'message', 'text', 'content', 'data'];

function extractReply(data, depth = 0) {
  if (typeof data === 'string') return data.trim() || null;
  if (!data || typeof data !== 'object' || depth > 2) return null;
  if (data.status === false || data.success === false) return null;
  for (const field of REPLY_FIELDS) {
    const found = extractReply(data[field], depth + 1);
    if (found) return found;
  }
  return null;
}

export async function chat(request) {
  const method = request.method.toUpperCase();
  if (method !== 'POST' && method !== 'GET') {
    return Response.json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET, POST' } });
  }
  let message = '';
  let systemInstruction = '';
  try {
    if (method === 'POST') {
      const body = (await request.json()) || {};
      message = String(body.message ?? '');
      systemInstruction = String(body.systemInstruction ?? '');
    } else {
      message = new URL(request.url).searchParams.get('message') || '';
    }
  } catch {
    return Response.json({ error: 'Permintaan tidak valid' }, { status: 400 });
  }
  message = message.trim().slice(0, CHAT_MAX_MESSAGE);
  if (!message) return Response.json({ error: 'Message is required' }, { status: 400 });

  const rate = checkRate(`chat:${clientIp(request)}`, 20);
  if (!rate.ok) return tooManyRequests(rate.retryAfter);
  const key = readServerKey();
  if (!key) {
    return Response.json({ error: 'Kunci API belum diatur di server (ANITA_API_KEY).' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }

  // API ini hanya menerima satu parameter q, jadi instruksi sistem digabung ke dalam pertanyaan.
  const system = systemInstruction.trim().slice(0, CHAT_MAX_SYSTEM);
  const prompt = system
    ? `${system}\n\nPesan dari pengguna: ${message}\n\nJawab sebagai snaping:`
    : message;

  try {
    const u = new URL(CHAT_UPSTREAM);
    u.searchParams.set('q', prompt);
    u.searchParams.set('key', key);
    const r = await fetch(u, {
      headers: { 'user-agent': UA, accept: 'application/json, text/plain, */*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || /text\/html/i.test(type)) {
      return Response.json({ error: 'Layanan chat tidak tersedia.' }, { status: 502, headers: { 'cache-control': 'no-store' } });
    }
    let raw = (await r.text()).split(key).join('[redacted]');
    let data = raw;
    try { data = JSON.parse(raw); } catch { /* balasan teks biasa */ }
    const reply = extractReply(data);
    if (!reply) {
      return Response.json({ error: 'Layanan chat tidak memberi jawaban.' }, { status: 502, headers: { 'cache-control': 'no-store' } });
    }
    return Response.json({ reply }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Gagal menghubungi layanan chat.' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
