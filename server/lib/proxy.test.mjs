// Tes perantara API (tanpa jaringan sungguhan). Jalankan:  node --test server/lib/proxy.test.mjs
// Memakai kunci PALSU 'TESTKEY123' dan server upstream palsu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { _resetRateLimits } from './guard.mjs';
import { apiNexadev, nexadev, apii, spotify } from '../handlers.mjs';

const FAKE = 'TESTKEY123';
const realFetch = globalThis.fetch;
let calls = [];
let reply = () => Response.json({ ok: true });

function setup(key = FAKE) {
  calls = [];
  reply = () => Response.json({ ok: true });
  _resetRateLimits();
  delete process.env.NEXA_KEY;
  if (key) process.env.ANITA_API_KEY = key; else delete process.env.ANITA_API_KEY;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    return reply(String(url));
  };
}
test.afterEach(() => { globalThis.fetch = realFetch; });

const req = (path, init) => new Request(`https://situs.example${path}`, init);
const upstreamOf = (i = 0) => new URL(calls[i].url);

test('endpoint API: kunci server menggantikan kunci dari browser (jalur asli /media-api)', async () => {
  setup();
  const res = await apiNexadev(req('/media-api/ytmp4?url=https%3A%2F%2Fyoutu.be%2Fx&key=KUNCI_LAMA'));
  assert.equal(res.status, 200);
  const u = upstreamOf();
  assert.equal(u.origin + u.pathname, 'https://api.nexadev.my.id/api/ytmp4');
  assert.equal(u.searchParams.get('key'), FAKE);
  assert.equal(u.searchParams.get('url'), 'https://youtu.be/x');
  assert.equal(u.searchParams.getAll('key').length, 1);
});

test('endpoint API: jalur hasil rewrite (/.netlify/functions/...) juga dikenali', async () => {
  setup();
  await apiNexadev(req('/.netlify/functions/api-nexadev/dramabox/home?page=1'));
  const u = upstreamOf();
  assert.equal(u.pathname, '/api/dramabox/home');
  assert.equal(u.searchParams.get('key'), FAKE);
});

test('tools-api: endpoint tools memakai kunci server dan tanpa prefix /api tambahan', async () => {
  setup();
  await nexadev(req('/tools-api/am/send/?email=a%40b.c'));
  await nexadev(req('/tools-api/tools/remove/?url=x&apikey=LAMA'));
  assert.equal(upstreamOf(0).pathname, '/am/send/');
  assert.equal(upstreamOf(0).searchParams.get('key'), FAKE);
  assert.equal(upstreamOf(1).pathname, '/tools/remove/');
  assert.equal(upstreamOf(1).searchParams.get('key'), FAKE);
  assert.equal(upstreamOf(1).searchParams.has('apikey'), false);
});

test('anime-api: endpoint dikenal diteruskan, jalur lain ditolak (404)', async () => {
  setup();
  const ok = await apii(req('/anime-api/komik/detail?slug=abc'));
  assert.equal(ok.status, 200);
  assert.equal(upstreamOf().origin, 'https://apii.nexadev.my.id');
  assert.equal(upstreamOf().searchParams.get('key'), FAKE);
  const bad = await apii(req('/anime-api/admin/semua'));
  assert.equal(bad.status, 404);
  assert.equal(calls.length, 1);
});

test('jalur berkas (bukan endpoint API): diteruskan tanpa kunci, kecuali penanda [redacted]', async () => {
  setup();
  await apiNexadev(req('/media-api/files/video.mp4?key=KUNCI_ORANG'));
  assert.equal(upstreamOf(0).pathname, '/api/files/video.mp4');
  assert.equal(upstreamOf(0).searchParams.has('key'), false);
  await apiNexadev(req('/media-api/files/video.mp4?key=%5Bredacted%5D'));
  assert.equal(upstreamOf(1).searchParams.get('key'), FAKE);
});

test('jalur berkas hanya boleh GET/HEAD', async () => {
  setup();
  const res = await apiNexadev(req('/media-api/files/x', { method: 'POST', body: 'a' }));
  assert.equal(res.status, 405);
  assert.equal(calls.length, 0);
});

test('kunci server kosong: endpoint API -> 503, jalur berkas tetap jalan', async () => {
  setup('');
  const a = await apiNexadev(req('/media-api/aio?url=x'));
  assert.equal(a.status, 503);
  assert.match((await a.json()).message, /ANITA_API_KEY/);
  const b = await apiNexadev(req('/media-api/files/x'));
  assert.equal(b.status, 200);
  assert.equal(calls.length, 1);
});

test('NEXA_KEY lama tetap dibaca bila ANITA_API_KEY belum ada (kompatibel)', async () => {
  setup('');
  process.env.NEXA_KEY = 'KUNCI_DARI_NEXA';
  await apiNexadev(req('/media-api/aio?url=x'));
  assert.equal(upstreamOf().searchParams.get('key'), 'KUNCI_DARI_NEXA');
  delete process.env.NEXA_KEY;
});

test('respons: kunci server disamarkan (JSON dan tautan)', async () => {
  setup();
  reply = () => Response.json({
    url: `https://api.nexadev.my.id/api/dl?id=1&key=${FAKE}`,
    catatan: `kunci ${FAKE} jangan bocor`,
  });
  const res = await apiNexadev(req('/media-api/aio?url=x'));
  const text = await res.text();
  assert.equal(text.includes(FAKE), false);
  assert.match(text, /key=\[redacted\]/);
});

test('respons HTML dari upstream diganti pesan galat 502', async () => {
  setup();
  reply = () => new Response('<!doctype html><html></html>', { headers: { 'content-type': 'text/html' } });
  const res = await apiNexadev(req('/media-api/aio?url=x'));
  assert.equal(res.status, 502);
});

test('media biner diteruskan apa adanya (tanpa diubah jadi teks)', async () => {
  setup();
  const bytes = new Uint8Array([1, 2, 3, 250, 251]);
  reply = () => new Response(bytes, { headers: { 'content-type': 'video/mp4' } });
  const res = await apiNexadev(req('/media-api/ytmp4?url=x'));
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), bytes);
  assert.equal(res.headers.get('content-type'), 'video/mp4');
});

test('keamanan: tidak bisa berpindah host atau keluar jalur', async () => {
  setup();
  const a = await apiNexadev(req('/media-api/files/x?_targetPath=..%2F..%2Fadmin'));
  assert.equal(a.status, 400);
  const b = await nexadev(req('/tools-api//evil.example/x'));
  const u = calls.length ? upstreamOf() : null;
  assert.ok(!u || u.origin === 'https://api.nexadev.my.id');
  assert.ok([200, 400].includes(b.status));
  const c = await apiNexadev(req('/media-api/aio', { method: 'DELETE' }));
  assert.equal(c.status, 405);
});

test('pembatas: endpoint rawan (tiktokview) maksimal 8 kali/menit per IP', async () => {
  setup();
  const ip = { headers: { 'x-nf-client-connection-ip': '1.2.3.4' } };
  let last;
  for (let i = 0; i < 9; i++) last = await nexadev(req('/tools-api/api/tiktokview/?url=x&qty=1', ip));
  assert.equal(calls.length, 8);
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get('retry-after')) >= 1);
  // IP lain tidak ikut terkena
  const other = await nexadev(req('/tools-api/api/tiktokview/?url=x&qty=1', { headers: { 'x-nf-client-connection-ip': '9.9.9.9' } }));
  assert.equal(other.status, 200);
  // endpoint biasa dari IP yang sama tetap jalan
  const normal = await nexadev(req('/tools-api/api/bypass/?url=x', ip));
  assert.equal(normal.status, 200);
});

test('spotify.mjs: memakai kunci server, menyamarkan kunci, dan 503 bila kunci kosong', async () => {
  setup();
  reply = () => Response.json({ data: [{ title: 'x', audio: `https://a/b?key=${FAKE}` }] });
  const ok = await spotify(req('/api/spotify?q=faded'));
  assert.equal(ok.status, 200);
  assert.equal((await ok.text()).includes(FAKE), false);
  assert.equal(upstreamOf().pathname, '/api/spotifyplay');
  assert.equal(upstreamOf().searchParams.get('key'), FAKE);

  setup('');
  const none = await spotify(req('/api/spotify?q=faded'));
  assert.equal(none.status, 503);
  assert.equal(calls.length, 0);
});

test('kunci yang salah tempel (kutip, spasi, awalan key=) dibersihkan', async () => {
  setup(' "key=ABC123"\n');
  await apiNexadev(req('/media-api/aio?url=x'));
  assert.equal(upstreamOf().searchParams.get('key'), 'ABC123');
});
