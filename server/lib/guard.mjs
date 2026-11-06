// Pembatas permintaan sederhana (per alamat IP) untuk fungsi server (Vercel / Netlify).
// Catatan jujur: data disimpan di memori satu instance fungsi. Tiap instance
// punya memori sendiri, jadi ini penahan "sebisanya" (bukan batas mutlak), tapi cukup
// untuk menghentikan penyalahgunaan yang menekan tombol/skrip berulang kali.

const buckets = new Map();
const MAX_BUCKETS = 5000;

export function clientIp(request) {
  const h = request.headers;
  return (
    h.get('x-nf-client-connection-ip') ||   // Netlify
    h.get('x-vercel-forwarded-for') ||       // Vercel
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

function prune(now) {
  for (const [id, b] of buckets) if (now >= b.reset) buckets.delete(id);
  if (buckets.size > MAX_BUCKETS) buckets.clear();
}

/** Mengembalikan { ok: true } atau { ok: false, retryAfter } (detik). */
export function checkRate(id, limit, windowMs = 60_000, now = Date.now()) {
  let b = buckets.get(id);
  if (!b || now >= b.reset) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(id, b);
  }
  b.count += 1;
  if (buckets.size > MAX_BUCKETS) prune(now);
  if (b.count <= limit) return { ok: true };
  return { ok: false, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
}

export function tooManyRequests(retryAfter) {
  return Response.json(
    { success: false, message: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
  );
}

/** Dipakai untuk tes saja. */
export function _resetRateLimits() {
  buckets.clear();
}
