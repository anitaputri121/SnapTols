import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform, buildApiUrl, detectDevice, PLATFORMS } from './detector';

test('detectPlatform correctly detects supported active platforms', () => {
  assert.equal(detectPlatform('https://www.tiktok.com/@tiktok/video/12345'), 'tiktok');
  assert.equal(detectPlatform('https://vt.tiktok.com/ZS6Q9n49y/'), 'tiktok');
  assert.equal(detectPlatform('https://youtu.be/dQw4w9WgXcQ'), 'ytmp4');
  assert.equal(detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'ytmp4');
  assert.equal(detectPlatform('https://www.instagram.com/reel/C7-ABC123/'), 'instagram');
  assert.equal(detectPlatform('https://x.com/elonmusk/status/123456789'), 'twitter');
  assert.equal(detectPlatform('https://twitter.com/user/status/123'), 'twitter');
  assert.equal(detectPlatform('https://www.facebook.com/watch/?v=123'), 'facebook');
  assert.equal(detectPlatform('https://www.mediafire.com/file/abc/file.zip/file'), 'mediafire');
  assert.equal(detectPlatform('https://pin.it/7xYZabc'), 'pinterest');
  assert.equal(detectPlatform('https://www.threads.net/@user/post/abc'), 'threads');
  assert.equal(detectPlatform('https://www.capcut.com/template-detail/123'), 'capcut');
  assert.equal(detectPlatform('https://unknown-link.example.com/test'), null);
});

test('buildApiUrl generates expected downloader API URL without any embedded key', () => {
  const ytUrl = buildApiUrl('ytmp4', 'https://youtu.be/dQw4w9WgXcQ', '720p');
  assert.match(ytUrl, /api\.zapi\.ink\/v1\/downloader:youtube\/download/);
  assert.doesNotMatch(ytUrl, /key=/i);
  assert.match(ytUrl, /url=https%3A%2F%2Fyoutu\.be%2FdQw4w9WgXcQ/);

  const mfUrl = buildApiUrl('mediafire', 'https://www.mediafire.com/file/abc/archive.zip/file');
  assert.match(mfUrl, /api\.nexadev\.my\.id\/api\/mediafire/);
  assert.doesNotMatch(mfUrl, /key=/i);
  assert.match(mfUrl, /\/mediafire\/?\?url=/);
});

test('detectDevice identifies mobile and desktop OS correctly', () => {
  const androidUA = 'Mozilla/5.0 (Linux; U; Android 14; Pixel 8 Pro)';
  assert.equal(detectDevice(androidUA), 'Android');

  const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
  assert.equal(detectDevice(iphoneUA), 'iOS');

  const winUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
  assert.equal(detectDevice(winUA), 'Windows');

  const macUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
  assert.equal(detectDevice(macUA), 'macOS');
});

test('PLATFORMS configuration contains all active platforms (10 lama + 11 baru)', () => {
  assert.ok(PLATFORMS.tiktok);
  assert.ok(PLATFORMS.ytmp4);
  assert.ok(PLATFORMS.ytmp3);
  assert.ok(PLATFORMS.instagram);
  assert.ok(PLATFORMS.twitter);
  assert.ok(PLATFORMS.facebook);
  assert.ok(PLATFORMS.mediafire);
  assert.ok(PLATFORMS.capcut);
  assert.ok(PLATFORMS.pinterest);
  assert.ok(PLATFORMS.threads);
});
