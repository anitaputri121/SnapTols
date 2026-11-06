import { checkRate, clientIp, tooManyRequests } from './guard.mjs';

const ALLOWED_REQUEST_HEADERS = ['accept', 'content-type', 'range'];
const ALLOWED_RESPONSE_HEADERS = [
  'content-type', 'content-disposition', 'content-length', 'accept-ranges',
  'content-range', 'cache-control', 'last-modified', 'etag',
];
const KEY_PARAMS = new Set(['key', 'apikey']);
const NO_STORE = { 'Cache-Control': 'no-store' };

// Batas permintaan per menit untuk tiap IP.
const LIMIT_STRICT = 8;     // endpoint rawan disalahgunakan (tambah view/like, kirim email, dll.)
const LIMIT_KEYED = 120;    // endpoint API biasa yang memakai kunci
const LIMIT_PASS = 300;     // berkas/media (player memakai banyak permintaan Range)

/**
 * Kunci API HANYA dibaca dari variabel lingkungan server (Vercel / Netlify > Environment Variables).
 * Tidak ada kunci cadangan di dalam kode.
 */
export function cleanKey(raw) {
  // Bersihkan salah tempel yang umum: spasi/baris baru, tanda kutip, atau awalan "key=".
  return String(raw || '')
    .replace(/\s+/g, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(?:ANITA_API_KEY|NITA_API_KEY|NEXA_KEY|api_?key|key)=/i, '');
}

export function readServerKey() {
  return cleanKey(process.env.ANITA_API_KEY || process.env.NEXA_KEY || '');
}

function json(body, status, extra = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

function extractPath(pathname, routePrefixes, functionName) {
  for (const prefix of routePrefixes) {
    if (pathname.startsWith(prefix)) return `/${pathname.slice(prefix.length).replace(/^\/+/, '')}`;
  }
  const marker = `/.netlify/functions/${functionName}`;
  const index = pathname.indexOf(marker);
  if (index >= 0) return `/${pathname.slice(index + marker.length).replace(/^\/+/, '')}`;
  return '/';
}

function unsafePath(path) {
  return /[\\\u0000-\u001f]/.test(path) || path.split('/').some((part) => part === '..' || part === '.');
}

/**
 * Perantara ke API nexadev.
 *  - keyedPaths  : endpoint API yang dikenal. Kunci server ditambahkan di sini.
 *  - strictPaths : bagian dari keyedPaths yang dibatasi lebih ketat.
 *  - passthrough : true = jalur lain (mis. berkas media) tetap diteruskan TANPA kunci,
 *                  sama seperti perilaku proxy lama. false = jalur lain ditolak (404).
 */
export async function proxyNexa(request, {
  functionName,
  routePrefixes = [],
  upstreamBase,
  upstreamPrefix = '',
  keyedPaths = [],
  strictPaths = [],
  passthrough = false,
}) {
  try {
    const method = request.method.toUpperCase();
    if (!['GET', 'HEAD', 'POST'].includes(method)) {
      return json({ success: false, message: 'Metode tidak didukung.' }, 405, { Allow: 'GET, HEAD, POST' });
    }

    const incoming = new URL(request.url);
    const targetPath = incoming.searchParams.get('_targetPath');
    const suffix = targetPath
      ? `/${targetPath.replace(/^\/+/, '')}`
      : extractPath(incoming.pathname, routePrefixes, functionName);
    if (unsafePath(suffix)) {
      return json({ success: false, message: 'Alamat tidak valid.' }, 400);
    }

    const keyed = keyedPaths.some((pattern) => pattern.test(suffix));
    if (!keyed && !passthrough) {
      return json({ success: false, message: 'Endpoint tidak tersedia.' }, 404);
    }
    if (!keyed && method === 'POST') {
      return json({ success: false, message: 'Metode tidak didukung.' }, 405, { Allow: 'GET, HEAD' });
    }

    const strict = keyed && strictPaths.some((pattern) => pattern.test(suffix));
    const tier = strict ? 'strict' : keyed ? 'keyed' : 'pass';
    const limit = strict ? LIMIT_STRICT : keyed ? LIMIT_KEYED : LIMIT_PASS;
    const rate = checkRate(`${functionName}:${tier}:${clientIp(request)}`, limit);
    if (!rate.ok) return tooManyRequests(rate.retryAfter);

    const key = readServerKey();
    if (keyed && !key) {
      return json({
        success: false,
        message: 'Kunci API belum diatur di server. Isi variabel ANITA_API_KEY di Environment Variables hosting lalu deploy ulang.',
      }, 503);
    }

    const base = new URL(upstreamBase);
    const upstream = new URL(`${upstreamPrefix}${suffix}`, base);
    if (upstream.origin !== base.origin) {
      return json({ success: false, message: 'Alamat tidak valid.' }, 400);
    }

    // Parameter kunci dari browser TIDAK dipercaya. Di endpoint API, kunci server selalu
    // menggantikannya. Di jalur lain, hanya penanda "[redacted]" (hasil penyamaran kunci
    // oleh proxy ini sendiri) yang dikembalikan menjadi kunci asli.
    const query = new URLSearchParams();
    let restoreKey = false;
    for (const [name, value] of incoming.searchParams) {
      if (name === '_targetPath') continue;
      if (KEY_PARAMS.has(name.toLowerCase())) {
        if (value === '[redacted]') restoreKey = true;
        continue;
      }
      query.append(name, value);
    }
    if (keyed || (restoreKey && key)) query.set('key', key);
    upstream.search = query.toString();

    const headers = new Headers();
    for (const name of ALLOWED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');

    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
    const upstreamResponse = await fetch(upstream, { method, headers, body, redirect: 'follow' });
    const responseHeaders = new Headers();
    for (const name of ALLOWED_RESPONSE_HEADERS) {
      const value = upstreamResponse.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set('Cache-Control', 'no-store');

    const contentType = upstreamResponse.headers.get('content-type') || '';
    // Endpoint ini seharusnya mengembalikan JSON atau media. Halaman HTML dari upstream
    // tidak diteruskan ke browser (di sana response.json() akan jadi galat yang membingungkan).
    if (/text\/html/i.test(contentType)) {
      return json({
        success: false,
        message: 'Layanan API mengembalikan halaman HTML, bukan data API. Periksa endpoint atau kunci API di server.',
      }, 502);
    }
    if (/json|text|xml|javascript/i.test(contentType)) {
      let text = await upstreamResponse.text();
      if (key) text = text.split(key).join('[redacted]');
      text = text.replace(/([?&](?:api)?key=)[^&\s"'<>]+/gi, '$1[redacted]');
      // Isi berubah setelah penyamaran, jadi panjang dari upstream tidak boleh diteruskan.
      responseHeaders.delete('content-length');
      return new Response(text, { status: upstreamResponse.status, headers: responseHeaders });
    }
    return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders });
  } catch {
    return json({ success: false, message: 'Gagal menghubungi layanan API.' }, 502);
  }
}
