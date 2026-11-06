# Deploy SnapTools ke Vercel

1. Push proyek ke GitHub, lalu Vercel > Add New > Project > pilih repo (framework Vite terdeteksi otomatis).
2. Isi **Environment Variables** (Settings > Environment Variables), centang Production + Preview:
   - `ANITA_API_KEY` : kunci API nexadev (Downloader, Anime, Komik, DramaBox, Tools, Spotify, chat Snaping)
   - `NITA_API_KEY`  : kunci downloader baru (api.zapi.ink)
   Aktifkan **Sensitive** supaya nilainya tersembunyi setelah disimpan.
3. Deploy / Redeploy (variabel baru hanya terbaca setelah deploy ulang).

Cara kerja: semua rute (`/tools-api`, `/media-api`, `/anime-api`, `/zapi-api`, `/zapi-file`,
`/api/spotify`, dst.) diarahkan oleh `vercel.json` ke satu fungsi `api/gateway.js`. Kunci hanya
dibaca di server dan tidak pernah dikirim ke browser. Kode bersama ada di `server/`
(dipakai juga oleh Netlify, jadi kedua hosting tetap jalan). Tes: `npm test`.
