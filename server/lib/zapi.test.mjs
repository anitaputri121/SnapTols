// Tes perantara zapi (tanpa jaringan sungguhan). Jalankan:  node --test server/lib/zapi.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { _resetRateLimits } from './guard.mjs';
import { _resetZapiMode } from './zapi.mjs';
import { zapi, zapiFile } from '../handlers.mjs';

const FAKE = 'ZKEY987';
const realFetch = globalThis.fetch;
let calls = [];
let reply = () => Response.json({ success: true, url: 'https://cdn.example/v.mp4' });

function setup(key = FAKE) {
  calls = [];
  reply = () => Response.json({ success: true, url: 'https://cdn.example/v.mp4' });
  _resetRateLimits(); _resetZapiMode();
  delete process.env.ANITA_API_KEY;
  if (key) process.env.NITA_API_KEY = key; else delete process.env.NITA_API_KEY;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: new URL(String(url)), headers: new Headers(init.headers), method: init.method || 'GET', redirect: init.redirect });
    return reply(calls.length, String(url));
  };
}
test.afterEach(() => { globalThis.fetch = realFetch; });
const req = (path, init) => new Request(`https://situs.example${path}`, init);
const YT = '/zapi-api/downloader:youtube/download?url=https%3A%2F%2Fyoutu.be%2Fx&quality=720&audioOnly=false&audioFormat=mp3';

test('jalur dan kunci: ke api.zapi.ink/v1, kunci dari server lewat header, kunci dari browser dibuang', async () => {
  setup();
  const res = await zapi(req(YT + '&key=KUNCI_ORANG&apikey=LAIN'));
  assert.equal(res.status, 200);
  const c = calls[0];
  assert.equal(c.url.origin, 'https://api.zapi.ink');
  assert.equal(c.url.pathname, '/v1/downloader:youtube/download');
  assert.equal(c.url.searchParams.get('quality'), '720');
  assert.equal(c.url.searchParams.get('url'), 'https://youtu.be/x');
  assert.equal(c.url.searchParams.has('key'), false);
  assert.equal(c.url.searchParams.has('apikey'), false);
  assert.equal(c.headers.get('x-api-key'), FAKE);
  assert.equal(c.headers.get('authorization'), `Bearer ${FAKE}`);
});

test('semua layanan baru lolos daftar putih, termasuk mangadex chapter', async () => {
  setup();
  for (const name of ['youtube', 'dailymotion', 'snapchat', 'redditsave', 'okru', 'fuckingfast', 'vk', 'mega-nz', 'bilibili', 'google-drive', 'pixeldrain']) {
    const res = await zapi(req(`/zapi-api/downloader:${name}/download?url=x`));
    assert.equal(res.status, 200, name);
  }
  const m = await zapi(req('/zapi-api/downloader:mangadex/chapter/a54c491c-8e4c-4e97-8873-5b79e59da210'));
  assert.equal(m.status, 200);
  assert.equal(calls.at(-1).url.pathname, '/v1/downloader:mangadex/chapter/a54c491c-8e4c-4e97-8873-5b79e59da210');
  assert.equal(calls.length, 12);
});

test('daftar putih: endpoint lain, layanan asing, dan uuid rusak ditolak (404) tanpa memanggil upstream', async () => {
  setup();
  for (const p of ['/zapi-api/user/credits', '/zapi-api/downloader:youtube/other', '/zapi-api/downloader:evil/download?url=x', '/zapi-api/downloader:mangadex/chapter/abc', '/zapi-api/']) {
    const res = await zapi(req(p));
    assert.equal(res.status, 404, p);
  }
  assert.equal(calls.length, 0);
});

test('keamanan: path berbahaya ditolak, metode selain GET/HEAD ditolak', async () => {
  setup();
  assert.equal((await zapi(req('/zapi-api/downloader:youtube/../../admin'))).status, 404);
  assert.equal((await zapi(req(YT, { method: 'POST', body: 'x' }))).status, 405);
  assert.equal((await zapiFile(req('/zapi-file/a', { method: 'DELETE' }))).status, 405);
  assert.equal(calls.length, 0);
  // host tujuan tidak bisa diganti lewat jalur
  await zapiFile(req('/zapi-file//evil.example/x'));
  await zapiFile(req('/zapi-file/%2F%2Fevil.example/x'));
  for (const c of calls) assert.equal(c.url.origin, 'https://api.zapi.ink');
});

test('kunci kosong: 503 dan tidak memanggil upstream', async () => {
  setup('');
  const res = await zapi(req(YT));
  assert.equal(res.status, 503);
  assert.match((await res.json()).message, /NITA_API_KEY/);
  assert.equal(calls.length, 0);
});

test('kunci salah tempel (kutip/spasi/awalan) dibersihkan', async () => {
  setup(' "NITA_API_KEY=ZK1"\n');
  await zapi(req(YT));
  assert.equal(calls[0].headers.get('x-api-key'), 'ZK1');
});

test('jika header ditolak (401), dicoba lewat parameter key lalu cara yang berhasil diingat', async () => {
  setup();
  reply = (n, url) => (new URL(url).searchParams.get('key') === FAKE ? Response.json({ ok: 1 }) : Response.json({ message: 'Unauthorized' }, { status: 401 }));
  const a = await zapi(req(YT));
  assert.equal(a.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url.searchParams.get('key'), FAKE);
  await zapi(req(YT));
  assert.equal(calls.length, 3); // langsung memakai cara yang sudah berhasil
  assert.equal(calls[2].url.searchParams.get('key'), FAKE);
});

test('kunci ditolak semua cara: pesan upstream tetap diteruskan (tanpa kunci)', async () => {
  setup();
  reply = () => Response.json({ success: false, message: `API key tidak valid ${FAKE}` }, { status: 401 });
  const res = await zapi(req(YT));
  assert.equal(res.status, 401);
  const text = await res.text();
  assert.equal(text.includes(FAKE), false);
  assert.match(text, /tidak valid/);
});

test('respons: kunci disamarkan di JSON dan tautan', async () => {
  setup();
  reply = () => Response.json({ url: `https://api.zapi.ink/f?id=1&key=${FAKE}`, note: FAKE });
  const text = await (await zapi(req(YT))).text();
  assert.equal(text.includes(FAKE), false);
  assert.match(text, /key=\[redacted\]/);
});

test('pengalihan ke CDN dikembalikan sebagai JSON {success,url}', async () => {
  setup();
  reply = () => new Response(null, { status: 302, headers: { Location: 'https://cdn.example/big.mp4' } });
  const res = await zapi(req(YT));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true, url: 'https://cdn.example/big.mp4' });
  assert.equal(calls[0].redirect, 'manual');
});

test('pengalihan yang memuat kunci ditolak', async () => {
  setup();
  reply = () => new Response(null, { status: 302, headers: { Location: `https://cdn.example/x?key=${FAKE}` } });
  assert.equal((await zapi(req(YT))).status, 502);
});

test('HTML dari upstream diganti galat 502; media biner diteruskan apa adanya', async () => {
  setup();
  reply = () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } });
  assert.equal((await zapi(req(YT))).status, 502);
  const bytes = new Uint8Array([9, 8, 7, 250]);
  reply = () => new Response(bytes, { headers: { 'content-type': 'video/mp4' } });
  const res = await zapi(req(YT));
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), bytes);
});

test('zapi-file: berkas diteruskan ke api.zapi.ink dengan kunci server; pengalihan jadi 302', async () => {
  setup();
  reply = () => new Response('abc', { headers: { 'content-type': 'application/zip' } });
  const res = await zapiFile(req('/zapi-file/files/abc.zip?x=1&key=LAIN', { headers: { range: 'bytes=0-9' } }));
  assert.equal(res.status, 200);
  assert.equal(calls[0].url.origin + calls[0].url.pathname, 'https://api.zapi.ink/files/abc.zip');
  assert.equal(calls[0].url.searchParams.get('x'), '1');
  assert.equal(calls[0].url.searchParams.has('key'), false);
  assert.equal(calls[0].headers.get('x-api-key'), FAKE);
  assert.equal(calls[0].headers.get('range'), 'bytes=0-9');
  reply = () => new Response(null, { status: 302, headers: { Location: 'https://cdn.example/f.zip' } });
  const r2 = await zapiFile(req('/zapi-file/files/abc.zip'));
  assert.equal(r2.status, 302);
  assert.equal(r2.headers.get('location'), 'https://cdn.example/f.zip');
});

test('pembatas: 40 permintaan/menit per IP, IP lain tidak terkena', async () => {
  setup();
  const ip = { headers: { 'x-nf-client-connection-ip': '1.1.1.1' } };
  let last;
  for (let i = 0; i < 41; i++) last = await zapi(req(YT, ip));
  assert.equal(last.status, 429);
  assert.equal(calls.length, 40);
  const other = await zapi(req(YT, { headers: { 'x-nf-client-connection-ip': '2.2.2.2' } }));
  assert.equal(other.status, 200);
});
