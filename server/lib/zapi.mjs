import { checkRate, clientIp, tooManyRequests } from './guard.mjs';
import { cleanKey } from './proxy.mjs';

// Perantara ke https://api.zapi.ink (downloader baru).
// Kunci HANYA dibaca dari variabel lingkungan server NITA_API_KEY (Vercel / Netlify > Environment Variables).
// Browser tidak pernah menerima atau mengirim kunci.

const UPSTREAM = 'https://api.zapi.ink';
const API_PREFIX = '/v1';
const SERVICES = 'youtube|dailymotion|snapchat|redditsave|okru|fuckingfast|vk|mega-nz|bilibili|google-drive|pixeldrain';

// Hanya endpoint downloader yang dikenal yang boleh dipanggil lewat kunci ini.
export const API_ALLOWED = [
  new RegExp(`^/downloader:(?:${SERVICES})/download/?$`),
  /^\/downloader:mangadex\/chapter\/[0-9a-fA-F-]{36}\/?$/,
];

const LIMIT_API = 40;    // permintaan downloader per menit per IP
const LIMIT_FILE = 300;  // berkas/media (pemutar memakai banyak permintaan Range)
const KEY_PARAMS = new Set(['key', 'apikey', 'api_key', 'token', 'access_token']);
const REQUEST_HEADERS = ['accept', 'range', 'content-type'];
const RESPONSE_HEADERS = [
  'content-type', 'content-disposition', 'content-length', 'accept-ranges',
  'content-range', 'cache-control', 'last-modified', 'etag',
];
const NO_STORE = { 'Cache-Control': 'no-store' };

export function readZapiKey() {
  return cleanKey(process.env.NITA_API_KEY || '');
}

function json(body, status, extra = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

function unsafePath(path) {
  return /[\\\u0000-\u001f]/.test(path) || path.split('/').some((part) => part === '..' || part === '.');
}

// Cara mengirim kunci ke zapi belum pasti (header atau parameter), jadi dicoba berurutan.
// Cara yang berhasil diingat selama instance fungsi masih hidup.
const AUTH_MODES = [
  (url, headers, key) => { headers.set('x-api-key', key); headers.set('authorization', `Bearer ${key}`); },
  (url, headers, key) => { url.searchParams.set('key', key); },
  (url, headers, key) => { url.searchParams.set('apikey', key); },
  (url, headers, key) => { url.searchParams.set('api_key', key); },
];
let preferredMode = 0;

const AUTH_WORDS = /(api[ _-]?key|unauthori[sz]ed|forbidden|invalid key|missing key|kunci|token)/i;

async function isAuthFailure(res) {
  if (res.status === 401 || res.status === 403) return true;
  if (res.status === 400 || res.status === 422) {
    const text = await res.clone().text().catch(() => '');
    return AUTH_WORDS.test(text.slice(0, 500));
  }
  return false;
}

async function callUpstream(url, init, key) {
  const order = [preferredMode, ...AUTH_MODES.map((_, i) => i).filter((i) => i !== preferredMode)];
  let last;
  for (const index of order) {
    const target = new URL(url);
    const headers = new Headers(init.headers);
    AUTH_MODES[index](target, headers, key);
    const res = await fetch(target, { ...init, headers });
    if (!(await isAuthFailure(res))) {
      preferredMode = index;
      return res;
    }
    if (!last) last = res;
  }
  return last;
}

function redact(text, key) {
  let out = text;
  if (key) out = out.split(key).join('[redacted]');
  return out.replace(/([?&](?:api_?)?key=)[^&\s"'<>]+/gi, '$1[redacted]');
}

/**
 * kind 'api'  : endpoint downloader (daftar putih), kunci ditambahkan server.
 * kind 'file' : berkas/media di api.zapi.ink (GET/HEAD saja), kunci ditambahkan server.
 */
export async function proxyZapi(request, { kind, functionName, routePrefixes }) {
  try {
    const method = request.method.toUpperCase();
    if (!['GET', 'HEAD'].includes(method)) {
      return json({ success: false, message: 'Metode tidak didukung.' }, 405, { Allow: 'GET, HEAD' });
    }

    const incoming = new URL(request.url);
    let suffix = null;
    // Jalur asli bisa dikirim lewat parameter _targetPath (dipakai rewrite Vercel).
    const targetPath = incoming.searchParams.get('_targetPath');
    if (targetPath) suffix = `/${targetPath.replace(/^\/+/, '')}`;
    for (const prefix of suffix === null ? routePrefixes : []) {
      if (incoming.pathname.startsWith(prefix)) { suffix = `/${incoming.pathname.slice(prefix.length).replace(/^\/+/, '')}`; break; }
    }
    if (suffix === null) {
      const marker = `/.netlify/functions/${functionName}`;
      const index = incoming.pathname.indexOf(marker);
      suffix = index >= 0 ? `/${incoming.pathname.slice(index + marker.length).replace(/^\/+/, '')}` : '/';
    }
    if (unsafePath(suffix)) return json({ success: false, message: 'Alamat tidak valid.' }, 400);

    if (kind === 'api' && !API_ALLOWED.some((pattern) => pattern.test(suffix))) {
      return json({ success: false, message: 'Endpoint tidak tersedia.' }, 404);
    }

    const rate = checkRate(`${functionName}:${clientIp(request)}`, kind === 'api' ? LIMIT_API : LIMIT_FILE);
    if (!rate.ok) return tooManyRequests(rate.retryAfter);

    const key = readZapiKey();
    if (!key) {
      return json({
        success: false,
        message: 'Kunci API belum diatur di server. Isi variabel NITA_API_KEY di Environment Variables hosting lalu deploy ulang.',
      }, 503);
    }

    const base = new URL(UPSTREAM);
    const upstream = new URL(kind === 'api' ? `${API_PREFIX}${suffix}` : suffix, base);
    if (upstream.origin !== base.origin) return json({ success: false, message: 'Alamat tidak valid.' }, 400);
    const query = new URLSearchParams();
    for (const [name, value] of incoming.searchParams) {
      if (name !== '_targetPath' && !KEY_PARAMS.has(name.toLowerCase())) query.append(name, value);
    }
    upstream.search = query.toString();

    const headers = new Headers();
    for (const name of REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');

    const res = await callUpstream(upstream, { method, headers, redirect: 'manual' }, key);

    // Pengalihan ke CDN: kembalikan sebagai tautan supaya berkas besar tidak lewat fungsi ini.
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) return json({ success: false, message: 'Layanan API mengalihkan tanpa tujuan.' }, 502);
      const target = new URL(location, upstream).href;
      if (key && target.includes(key)) return json({ success: false, message: 'Tautan unduhan tidak aman.' }, 502);
      if (kind === 'file') return new Response(null, { status: 302, headers: { Location: target, ...NO_STORE } });
      return json({ success: true, url: target }, 200);
    }

    const responseHeaders = new Headers();
    for (const name of RESPONSE_HEADERS) {
      const value = res.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set('Cache-Control', 'no-store');

    const contentType = res.headers.get('content-type') || '';
    if (/text\/html/i.test(contentType)) {
      return json({ success: false, message: 'Layanan API mengembalikan halaman HTML, bukan data API.' }, 502);
    }
    if (/json|text|xml|javascript/i.test(contentType)) {
      const text = redact(await res.text(), key);
      responseHeaders.delete('content-length');
      return new Response(text, { status: res.status, headers: responseHeaders });
    }
    return new Response(res.body, { status: res.status, headers: responseHeaders });
  } catch {
    return json({ success: false, message: 'Gagal menghubungi layanan API.' }, 502);
  }
}

/** Dipakai untuk tes saja. */
export function _resetZapiMode() {
  preferredMode = 0;
}
