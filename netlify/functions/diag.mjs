import { checkRate, clientIp, tooManyRequests } from '../../server/lib/guard.mjs';
import { readServerKey } from '../../server/lib/proxy.mjs';
import { readZapiKey } from '../../server/lib/zapi.mjs';

// Pemeriksaan sementara: /.netlify/functions/diag
// Tidak pernah menampilkan kunci. Hapus berkas ini setelah masalah beres.
export default async function handler(request) {
  const rate = checkRate(`diag:${clientIp(request)}`, 10);
  if (!rate.ok) return tooManyRequests(rate.retryAfter);
  const raw = String(process.env.ANITA_API_KEY || '');
  const key = readServerKey();
  const info = {
    ANITA_API_KEY_terisi: raw.length > 0,
    panjang_kunci_terbaca: key.length,
    ada_spasi_atau_kutip_di_nilai_asli: /\s|["'`]/.test(raw),
    NEXA_KEY_lama_terisi: Boolean(process.env.NEXA_KEY),
  };
  if (key) {
    try {
      const u = new URL('https://api.nexadev.my.id/api/ytmp3');
      u.searchParams.set('url', 'https://youtu.be/dQw4w9WgXcQ');
      u.searchParams.set('key', key);
      const res = await fetch(u, { headers: { accept: 'application/json' } });
      let text = (await res.text()).split(key).join('[redacted]');
      info.balasan_server_api = { status: res.status, isi: text.slice(0, 300) };
    } catch (e) {
      info.balasan_server_api = { galat: 'Tidak bisa menghubungi server API.' };
    }
  }
  // Tes fitur lama (anime) lewat perantara sendiri, sama seperti yang dipakai web.
  if (key) {
    try {
      const origin = new URL(request.url).origin;
      const res = await fetch(`${origin}/anime-api/anime?recent=1&page=1`, { headers: { accept: 'application/json' } });
      info.balasan_anime = { status: res.status, isi: (await res.text()).split(key).join('[redacted]').slice(0, 200) };
    } catch (e) {
      info.balasan_anime = { galat: 'Tidak bisa menghubungi perantara anime.' };
    }
  }
  const zkey = readZapiKey();
  info.NITA_API_KEY_terisi = Boolean(process.env.NITA_API_KEY);
  info.NITA_panjang_kunci_terbaca = zkey.length;
  if (zkey) {
    // Panggil lewat perantara sendiri supaya sama persis dengan yang dipakai web.
    try {
      const origin = new URL(request.url).origin;
      const res = await fetch(`${origin}/zapi-api/downloader:youtube/download?url=${encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}&quality=360&audioOnly=false&audioFormat=mp3`, { headers: { accept: 'application/json' } });
      info.balasan_zapi = { status: res.status, isi: (await res.text()).split(zkey).join('[redacted]').slice(0, 500) };
    } catch (e) {
      info.balasan_zapi = { galat: 'Tidak bisa menghubungi perantara zapi.' };
    }
  }
  return Response.json(info, { headers: { 'Cache-Control': 'no-store' } });
}
