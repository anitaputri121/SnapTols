import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createZip } from './zipStore';
import { parseZapiResponse, extractPages, routeZapiMediaUrl } from './zapiParser';
import { buildApiUrl, buildLegacyApiUrl, detectPlatform, extractMangadexChapterId, PLATFORMS } from './detector';

const T = 'https://example.com/video/1';

test('buildApiUrl zapi: parameter sesuai contoh dan tanpa kunci', () => {
  assert.equal(
    buildApiUrl('ytmp4', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '1080p'),
    'https://api.zapi.ink/v1/downloader:youtube/download?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&quality=1080&audioOnly=false&audioFormat=mp3',
  );
  assert.match(buildApiUrl('ytmp4', T, '144p'), /quality=144&audioOnly=false/);
  assert.match(buildApiUrl('ytmp3', T, '720p'), /audioOnly=true&audioFormat=mp3/);
  assert.match(buildApiUrl('dailymotion', T, 'mp3'), /audioOnly=true/);
  assert.match(buildApiUrl('bilibili', T, 'auto'), /quality=&audioOnly=false/);
  assert.match(buildApiUrl('bilibili', T, '480p'), /quality=480&/);
  assert.equal(buildApiUrl('snapchat', T), 'https://api.zapi.ink/v1/downloader:snapchat/download?url=https%3A%2F%2Fexample.com%2Fvideo%2F1');
  assert.match(buildApiUrl('reddit', T), /downloader:redditsave\/download\?url=/);
  assert.match(buildApiUrl('mega', T), /downloader:mega-nz\/download\?url=/);
  assert.match(buildApiUrl('gdrive', T), /downloader:google-drive\/download\?url=/);
  assert.doesNotMatch(buildApiUrl('okru', T, '720p'), /key=/i);
  assert.match(buildLegacyApiUrl('ytmp4', T)!, /api\.nexadev\.my\.id\/api\/ytmp4\?url=/);
  assert.equal(buildLegacyApiUrl('okru', T), null);
});

test('mangadex: ID chapter diambil dari tautan; halaman judul ditolak', () => {
  const id = 'a54c491c-8e4c-4e97-8873-5b79e59da210';
  assert.equal(extractMangadexChapterId(`https://mangadex.org/chapter/${id}/1`), id);
  assert.equal(extractMangadexChapterId(id.toUpperCase()), id);
  assert.equal(extractMangadexChapterId(`https://mangadex.org/title/${id}/judul`), null);
  assert.equal(buildApiUrl('mangadex', `https://mangadex.org/chapter/${id}`), `https://api.zapi.ink/v1/downloader:mangadex/chapter/${id}`);
  assert.throws(() => buildApiUrl('mangadex', 'https://mangadex.org/title/abc'), /CHAPTER/);
});

test('detectPlatform: semua platform baru dikenali, yang lama tidak berubah', () => {
  const cases: [string, string][] = [
    ['https://www.dailymotion.com/video/xadq8hi', 'dailymotion'],
    ['https://dai.ly/xadq8hi', 'dailymotion'],
    ['https://www.snapchat.com/spotlight/W7_EDlXWTBiXAEEniNoMPwA', 'snapchat'],
    ['https://mangadex.org/chapter/a54c491c-8e4c-4e97-8873-5b79e59da210', 'mangadex'],
    ['https://www.reddit.com/r/funny/comments/iakyuq/who_said_chivalry_is_dead/', 'reddit'],
    ['https://v.redd.it/abc', 'reddit'],
    ['https://ok.ru/video/14418516314862', 'okru'],
    ['https://fuckingfast.co/wajys77edcwh', 'fuckingfast'],
    ['https://vk.com/video-22822305_456241864', 'vk'],
    ['https://mega.nz/file/EntxADbJ#UCXeVEZbEo0ci9xKBFJzgMPol39MfFecwoB-TXfp1yc', 'mega'],
    ['https://www.bilibili.tv/id/video/4799525516221440', 'bilibili'],
    ['https://drive.google.com/file/d/1CaJig7lPfOqKGtsv34jWophJ1Q1LLhJC/view?usp=sharing', 'gdrive'],
    ['https://pixeldrain.com/u/5UZcgpfV', 'pixeldrain'],
    ['mega.nz/file/abc#def', 'mega'],
    ['https://www.tiktok.com/@a/video/1', 'tiktok'],
    ['https://youtu.be/x', 'ytmp4'],
    ['https://x.com/a/status/1', 'twitter'],
    ['https://www.mediafire.com/file/abc/f.zip/file', 'mediafire'],
    ['https://pin.it/abc', 'pinterest'],
  ];
  for (const [url, id] of cases) assert.equal(detectPlatform(url), id, url);
  assert.equal(detectPlatform('https://contoh.com/tentang'), null);
});

test('PLATFORMS: 21 platform, semua punya endpoint dan tidak ada kunci', () => {
  const list = Object.values(PLATFORMS);
  assert.equal(list.length, 21);
  for (const p of list) {
    assert.ok(p.endpoint.startsWith('https://'), p.id);
    assert.doesNotMatch(p.endpoint, /key=/i);
    assert.ok(p.name && p.placeholder && p.badge, p.id);
  }
});

test('parser: bentuk umum {data:{title,url,thumbnail}}', () => {
  const r = parseZapiResponse({ success: true, data: { title: 'Halo', url: 'https://cdn.x/v.mp4', thumbnail: 'https://cdn.x/t.jpg', duration: 125 } }, { platformId: 'dailymotion', targetUrl: T, quality: '720p' });
  assert.equal(r.title, 'Halo');
  assert.equal(r.downloadUrl, 'https://cdn.x/v.mp4');
  assert.equal(r.thumbnail, 'https://cdn.x/t.jpg');
  assert.equal(r.duration, '2:05');
  assert.equal(r.mediaType, 'video');
});

test('parser: memilih kualitas dari daftar format (tepat, atau terdekat di bawahnya)', () => {
  const data = { result: { title: 'V', formats: [
    { quality: '1080p', url: 'https://c/1080.mp4' }, { quality: '720p', url: 'https://c/720.mp4' },
    { quality: '360p', url: 'https://c/360.mp4' }, { quality: 'audio', type: 'audio/mp4', url: 'https://c/a.m4a' },
  ] } };
  const get = (q: string) => parseZapiResponse(data, { platformId: 'ytmp4', targetUrl: T, quality: q });
  assert.equal(get('1080p').downloadUrl, 'https://c/1080.mp4');
  assert.equal(get('720p').downloadUrl, 'https://c/720.mp4');
  assert.equal(get('480p').downloadUrl, 'https://c/360.mp4');
  assert.equal(get('144p').downloadUrl, 'https://c/360.mp4'); // tidak ada yang lebih rendah: ambil terendah
  assert.equal(get('720p').quality, '720p');
  const audio = parseZapiResponse(data, { platformId: 'ytmp3', targetUrl: T, quality: 'mp3' });
  assert.equal(audio.downloadUrl, 'https://c/a.m4a');
  assert.equal(audio.mediaType, 'audio');
});

test('parser: tautan relatif/api.zapi.ink diarahkan lewat /zapi-file (kunci dari server)', () => {
  const r = parseZapiResponse({ data: { url: 'https://api.zapi.ink/files/abc.mp4?key=[redacted]&x=1' } }, { platformId: 'snapchat', targetUrl: T });
  assert.equal(r.downloadUrl, '/zapi-file/files/abc.mp4?key=[redacted]&x=1');
  const r2 = parseZapiResponse({ data: { url: '/files/zz.mp4' } }, { platformId: 'snapchat', targetUrl: T });
  assert.equal(r2.downloadUrl, '/zapi-file/files/zz.mp4');
  assert.equal(routeZapiMediaUrl('https://cdn.example/a.mp4'), 'https://cdn.example/a.mp4');
});

test('parser: platform berkas selalu jadi "file"; gambar jadi "image"; audioOnly jadi "audio"', () => {
  assert.equal(parseZapiResponse({ url: 'https://c/x.mkv', filename: 'film.mkv', size: 5242880 }, { platformId: 'mega', targetUrl: T }).mediaType, 'file');
  const f = parseZapiResponse({ data: { downloadUrl: 'https://c/x.bin', name: 'a.zip', size: '5.2 MB' } }, { platformId: 'pixeldrain', targetUrl: T });
  assert.equal(f.title, 'a.zip');
  assert.equal(f.filesize, '5.2 MB');
  assert.equal(parseZapiResponse({ url: 'https://c/p.jpg' }, { platformId: 'reddit', targetUrl: T }).mediaType, 'image');
  assert.equal(parseZapiResponse({ url: 'https://c/a.mp3' }, { platformId: 'vk', targetUrl: T, quality: 'mp3' }).mediaType, 'audio');
});

test('parser: galat API dan respons kosong memberi pesan, bukan hasil palsu', () => {
  assert.throws(() => parseZapiResponse({ success: false, message: 'API key tidak valid' }, { platformId: 'ytmp4', targetUrl: T }), /API key tidak valid/);
  assert.throws(() => parseZapiResponse({ status: 'error', error: 'Video tidak ditemukan' }, { platformId: 'ytmp4', targetUrl: T }), /tidak ditemukan/);
  assert.throws(() => parseZapiResponse({ success: true, data: {} }, { platformId: 'okru', targetUrl: T }), /tautan media/);
  assert.throws(() => parseZapiResponse({ success: true, url: T }, { platformId: 'okru', targetUrl: T }), /tautan media/);
});

test('parser: tautan di tempat tak terduga tetap ditemukan (cadangan)', () => {
  const r = parseZapiResponse({ ok: true, payload: { deep: [{ x: 'https://c/zz.mp4' }] } }, { platformId: 'okru', targetUrl: T });
  assert.equal(r.downloadUrl, 'https://c/zz.mp4');
});

test('mangadex: halaman dari daftar url dan dari bentuk asli MangaDex', () => {
  const a = parseZapiResponse({ success: true, data: { title: 'Ch 1', pages: ['https://c/1.png', 'https://c/2.png'] } }, { platformId: 'mangadex', targetUrl: 'x' });
  assert.deepEqual(a.pages, ['https://c/1.png', 'https://c/2.png']);
  assert.equal(a.quality, '2 halaman');
  const b = extractPages({ baseUrl: 'https://uploads.mangadex.org/', chapter: { hash: 'h1', data: ['1.png', '2.png'] } });
  assert.deepEqual(b, ['https://uploads.mangadex.org/data/h1/1.png', 'https://uploads.mangadex.org/data/h1/2.png']);
  const c = extractPages({ data: { images: [{ url: 'https://c/a.jpg' }, { url: 'https://c/b.jpg' }] } });
  assert.equal(c.length, 2);
  assert.throws(() => parseZapiResponse({ success: true, data: {} }, { platformId: 'mangadex', targetUrl: 'x' }), /halaman/);
});

test('ZIP buatan sendiri valid (dicek dengan unzip) dan isinya sama persis', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ziptest-'));
  const bin = new Uint8Array(70000).map((_, i) => (i * 31 + 7) & 255);
  const zip = createZip([
    { name: '001.jpg', data: bin },
    { name: 'catatan ü.txt', data: new TextEncoder().encode('halo dunia') },
    { name: 'kosong.bin', data: new Uint8Array(0) },
  ]);
  const file = join(dir, 'a.zip');
  writeFileSync(file, zip);
  execFileSync('unzip', ['-tq', file]);
  execFileSync('unzip', ['-oq', file, '-d', join(dir, 'out')]);
  assert.deepEqual(new Uint8Array(readFileSync(join(dir, 'out', '001.jpg'))), bin);
  assert.equal(readFileSync(join(dir, 'out', 'catatan ü.txt'), 'utf8'), 'halo dunia');
  assert.equal(readFileSync(join(dir, 'out', 'kosong.bin')).length, 0);
});
