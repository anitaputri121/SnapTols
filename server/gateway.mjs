// Penjemput tunggal untuk Vercel: semua fungsi server digabung di satu Vercel Function (api/gateway.js)
// supaya jumlah fungsi sedikit (batas paket Hobby). Layanan dipilih dari parameter _svc (diisi oleh
// rewrite di vercel.json) atau, bila tidak ada, dari awalan jalur URL.
import * as h from './handlers.mjs';

const ROUTES = {
  nexadev: h.nexadev,
  'api-nexadev': h.apiNexadev,
  apii: h.apii,
  zapi: h.zapi,
  'zapi-file': h.zapiFile,
  tikwm: h.tikwm,
  spotify: h.spotify,
  lyrics: h.lyrics,
  cleanuri: h.cleanuri,
  clooud: h.clooud,
  chat: h.chat,
};

// Urutan penting: awalan yang lebih spesifik lebih dulu.
const PREFIXES = [
  ['/api/tikwm', 'tikwm'],
  ['/api/spotify', 'spotify'],
  ['/api/lyrics', 'lyrics'],
  ['/api/chat', 'chat'],
  ['/api/nexadev/', 'api-nexadev'],
  ['/media-api/', 'api-nexadev'],
  ['/nexadev/', 'nexadev'],
  ['/tools-api/', 'nexadev'],
  ['/anime-api/', 'apii'],
  ['/apii/', 'apii'],
  ['/zapi-api/', 'zapi'],
  ['/zapi-file/', 'zapi-file'],
  ['/clooud', 'clooud'],
  ['/cleanuri', 'cleanuri'],
];

export function resolveService(url) {
  const svc = url.searchParams.get('_svc');
  if (svc && Object.prototype.hasOwnProperty.call(ROUTES, svc)) return svc;
  const hit = PREFIXES.find(([prefix]) => url.pathname.startsWith(prefix));
  return hit ? hit[1] : null;
}

export async function gateway(request) {
  const url = new URL(request.url);
  const svc = resolveService(url);
  if (!svc) {
    return Response.json({ success: false, message: 'Endpoint tidak tersedia.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  // Buang penanda internal supaya tidak ikut diteruskan ke layanan upstream.
  url.searchParams.delete('_svc');
  const init = { method: request.method, headers: request.headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }
  return ROUTES[svc](new Request(url, init));
}
