// Tes penjemput Vercel (tanpa jaringan sungguhan). Jalankan:  node --test server/lib/gateway.test.mjs
// Memakai kunci PALSU dan server upstream palsu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { _resetRateLimits } from './guard.mjs';
import { _resetZapiMode } from './zapi.mjs';
import { gateway, resolveService } from '../gateway.mjs';

const NEXA = 'NEXAFAKE1';
const ZAPI = 'ZAPIFAKE2';
const realFetch = globalThis.fetch;
let calls = [];

function setup({ nexa = NEXA, zapi = ZAPI } = {}) {
  calls = [];
  _resetRateLimits();
  _resetZapiMode();
  delete process.env.NEXA_KEY;
  if (nexa) process.env.ANITA_API_KEY = nexa; else delete process.env.ANITA_API_KEY;
  if (zapi) process.env.NITA_API_KEY = zapi; else delete process.env.NITA_API_KEY;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', headers: new Headers(init.headers), body: init.body });
    return Response.json({ ok: true });
  };
}
test.afterEach(() => { globalThis.fetch = realFetch; });

const req = (path, init) => new Request(`https://situs.example${path}`, init);
const upstream = (i = 0) => new URL(calls[i].url);

test('resolveService: dari _svc, lalu dari awalan jalur, selain itu null', () => {
  assert.equal(resolveService(new URL('https://x/api/gateway?_svc=zapi')), 'zapi');
  assert.equal(resolveService(new URL('https://x/api/gateway?_svc=__proto__')), null);
  assert.equal(resolveService(new URL('https://x/media-api/ytmp3?url=a')), 'api-nexadev');
  assert.equal(resolveService(new URL('https://x/tools-api/api/ampreset/')), 'nexadev');
  assert.equal(resolveService(new URL('https://x/anime-api/anime')), 'apii');
  assert.equal(resolveService(new URL('https://x/api/spotify?q=a')), 'spotify');
  assert.equal(resolveService(new URL('https://x/lainnya')), null);
});

test('jalur tidak dikenal -> 404', async () => {
  setup();
  const res = await gateway(req('/api/gateway'));
  assert.equal(res.status, 404);
  assert.equal(calls.length, 0);
});

test('nexa lewat rewrite Vercel (_svc + _targetPath): kunci server dipakai, _svc tidak diteruskan', async () => {
  setup();
  const res = await gateway(req('/api/gateway?_svc=api-nexadev&_targetPath=ytmp3&url=https%3A%2F%2Fyoutu.be%2Fx&key=LAMA'));
  assert.equal(res.status, 200);
  const u = upstream();
  assert.equal(u.origin + u.pathname, 'https://api.nexadev.my.id/api/ytmp3');
  assert.equal(u.searchParams.get('key'), NEXA);
  assert.equal(u.searchParams.getAll('key').length, 1);
  assert.equal(u.searchParams.has('_svc'), false);
  assert.equal(u.searchParams.has('_targetPath'), false);
});

test('nexa lewat jalur asli (URL tidak ditulis ulang): tetap benar', async () => {
  setup();
  await gateway(req('/media-api/dramabox/home?page=1'));
  const u = upstream();
  assert.equal(u.pathname, '/api/dramabox/home');
  assert.equal(u.searchParams.get('key'), NEXA);
});

test('ampreset: jalur dengan garis miring akhir diteruskan utuh', async () => {
  setup();
  await gateway(req('/api/gateway?_svc=nexadev&_targetPath=api/ampreset/&q=x'));
  assert.equal(upstream().pathname, '/api/ampreset/');
  assert.equal(upstream().searchParams.get('key'), NEXA);
});

test('anime: jalur lain ditolak', async () => {
  setup();
  const ok = await gateway(req('/api/gateway?_svc=apii&_targetPath=anime&recent=1'));
  assert.equal(ok.status, 200);
  assert.equal(upstream().origin, 'https://apii.nexadev.my.id');
  const bad = await gateway(req('/api/gateway?_svc=apii&_targetPath=admin/secret'));
  assert.equal(bad.status, 404);
});

test('zapi lewat rewrite Vercel (_targetPath dengan titik dua) memakai NITA_API_KEY', async () => {
  setup();
  const res = await gateway(req('/api/gateway?_svc=zapi&_targetPath=downloader%3Ayoutube%2Fdownload&url=https%3A%2F%2Fyoutu.be%2Fx&key=LAMA'));
  assert.equal(res.status, 200);
  const u = upstream();
  assert.equal(u.origin + u.pathname, 'https://api.zapi.ink/v1/downloader:youtube/download');
  assert.equal(u.searchParams.has('_targetPath'), false);
  assert.equal(u.searchParams.has('_svc'), false);
  assert.equal(calls[0].headers.get('x-api-key'), ZAPI);
});

test('zapi lewat jalur asli /zapi-api/...', async () => {
  setup();
  await gateway(req('/zapi-api/downloader:youtube/download?url=x'));
  assert.equal(upstream().pathname, '/v1/downloader:youtube/download');
  assert.equal(calls[0].headers.get('x-api-key'), ZAPI);
});

test('zapi endpoint di luar daftar putih -> 404', async () => {
  setup();
  const res = await gateway(req('/api/gateway?_svc=zapi&_targetPath=admin%2Fusers'));
  assert.equal(res.status, 404);
  assert.equal(calls.length, 0);
});

test('tanpa ANITA_API_KEY -> 503, tanpa NITA_API_KEY -> 503 (dua variabel terpisah)', async () => {
  setup({ nexa: '' });
  assert.equal((await gateway(req('/api/gateway?_svc=api-nexadev&_targetPath=ytmp3&url=x'))).status, 503);
  setup({ zapi: '' });
  assert.equal((await gateway(req('/api/gateway?_svc=zapi&_targetPath=downloader%3Ayoutube%2Fdownload&url=x'))).status, 503);
  assert.equal(calls.length, 0);
});

test('spotify memakai ANITA_API_KEY dan kunci tidak bocor di jawaban', async () => {
  setup();
  globalThis.fetch = async (url) => { calls.push({ url: String(url) }); return Response.json({ echo: NEXA, ok: true }); };
  const res = await gateway(req('/api/gateway?_svc=spotify&q=halo'));
  assert.equal(res.status, 200);
  assert.equal(upstream().searchParams.get('q'), 'halo');
  const text = await res.text();
  assert.equal(text.includes(NEXA), false);
});

test('POST: isi permintaan ikut diteruskan (cleanuri)', async () => {
  setup();
  const res = await gateway(req('/api/gateway?_svc=cleanuri', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'url=https%3A%2F%2Fcontoh.com',
  }));
  assert.equal(res.status, 200);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body, 'url=https%3A%2F%2Fcontoh.com');
});

test('lyrics tidak meneruskan _svc ke LRCLIB', async () => {
  setup();
  await gateway(req('/api/gateway?_svc=lyrics&path=get&track_name=a'));
  const u = upstream();
  assert.equal(u.origin + u.pathname, 'https://lrclib.net/api/get');
  assert.equal(u.searchParams.has('_svc'), false);
  assert.equal(u.searchParams.get('track_name'), 'a');
});

test('IP Vercel dipakai untuk pembatas laju (tiap IP punya jatah sendiri)', async () => {
  setup();
  const mk = (ip) => req('/api/gateway?_svc=nexadev&_targetPath=api%2Ftiktokview%2F&url=x&qty=1', { headers: { 'x-vercel-forwarded-for': ip } });
  for (let i = 0; i < 8; i++) assert.equal((await gateway(mk('1.1.1.1'))).status, 200);
  assert.equal((await gateway(mk('1.1.1.1'))).status, 429);
  assert.equal((await gateway(mk('2.2.2.2'))).status, 200);
});

// ---- Chat Snaping (nexadev GPT-4) ----
function chatSetup(replyFn) {
  setup();
  globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), method: init.method || 'GET' }); return replyFn(); };
}
const chatReq = (body) => req('/api/gateway?_svc=chat', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('chat: memakai API gpt4 nexadev dengan ANITA_API_KEY, instruksi sistem + pesan digabung ke q', async () => {
  chatSetup(() => Response.json({ author: 'NexaDev', status: true, result: 'Halo kak, snaping di sini!' }));
  const res = await gateway(chatReq({ message: 'Halo', systemInstruction: 'Nama kamu snaping.' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { reply: 'Halo kak, snaping di sini!' });
  const u = upstream();
  assert.equal(u.origin + u.pathname, 'https://api.nexadev.my.id/ai/gpt4/');
  assert.equal(u.searchParams.get('key'), NEXA);
  assert.match(u.searchParams.get('q'), /Nama kamu snaping\./);
  assert.match(u.searchParams.get('q'), /Halo/);
});

test('chat: bentuk balasan lain (teks biasa, field response, data bersarang) tetap terbaca', async () => {
  chatSetup(() => new Response('Jawaban teks biasa', { headers: { 'content-type': 'text/plain' } }));
  assert.equal((await (await gateway(chatReq({ message: 'a' }))).json()).reply, 'Jawaban teks biasa');
  chatSetup(() => Response.json({ status: true, data: { response: 'dari data' } }));
  assert.equal((await (await gateway(chatReq({ message: 'a' }))).json()).reply, 'dari data');
});

test('chat: status false / HTML / galat jaringan -> 502 (frontend lalu memakai jawaban cadangan)', async () => {
  chatSetup(() => Response.json({ author: 'NexaDev', status: false, msg: 'Response unavailable!' }));
  assert.equal((await gateway(chatReq({ message: 'a' }))).status, 502);
  chatSetup(() => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }));
  assert.equal((await gateway(chatReq({ message: 'a' }))).status, 502);
  chatSetup(() => { throw new Error('putus'); });
  assert.equal((await gateway(chatReq({ message: 'a' }))).status, 502);
});

test('chat: kunci tidak bocor, pesan kosong 400, tanpa ANITA_API_KEY 503, GET diterima', async () => {
  chatSetup(() => Response.json({ status: true, result: `kuncinya ${NEXA}` }));
  assert.equal((await (await gateway(chatReq({ message: 'a' }))).json()).reply.includes(NEXA), false);
  chatSetup(() => Response.json({ status: true, result: 'x' }));
  assert.equal((await gateway(chatReq({ message: '   ' }))).status, 400);
  assert.equal((await gateway(req('/api/gateway?_svc=chat&message=hai'))).status, 200);
  setup({ nexa: '' });
  assert.equal((await gateway(chatReq({ message: 'a' }))).status, 503);
});
