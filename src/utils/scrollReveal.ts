// Animasi "muncul saat scroll" yang ringan:
// - hanya menyentuh kartu yang masih berada di bawah layar saat tampil,
// - memakai transform + opacity (dipercepat GPU),
// - mati otomatis kalau HP memakai mode "kurangi animasi",
// - kalau terjadi error apa pun, konten tetap tampil normal.
const SELECTOR = '.glass-card, .glass-card-glow, [data-reveal]';

export function initScrollReveal(): () => void {
  try {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return () => {};
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => {};
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          if (!el.classList.contains('reveal-pre')) continue;
          el.classList.remove('reveal-pre');
          el.classList.add('reveal-in');
          const done = () => el.classList.remove('reveal-in');
          el.addEventListener('animationend', done, { once: true });
          window.setTimeout(done, 900);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
    );

    const seen = new WeakSet<Element>();
    const consider = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      const node = el as HTMLElement;
      const r = node.getBoundingClientRect();
      if (r.height < 24 || r.width < 24) return;
      // Hanya kartu yang masih di bawah layar yang dianimasikan.
      if (r.top > window.innerHeight * 0.92 && r.left < window.innerWidth && r.right > 0) {
        node.classList.add('reveal-pre');
        io.observe(node);
      }
    };

    let queued = false;
    const pending: Node[] = [];
    const flush = () => {
      queued = false;
      const nodes = pending.splice(0, pending.length);
      for (const n of nodes) {
        if (!(n instanceof Element) || !n.isConnected) continue;
        if (n.matches(SELECTOR)) consider(n);
        n.querySelectorAll(SELECTOR).forEach(consider);
      }
    };
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) m.addedNodes.forEach((n) => pending.push(n));
      if (!queued && pending.length) {
        queued = true;
        window.requestAnimationFrame(flush);
      }
    });

    const root = document.getElementById('root') || document.body;
    mo.observe(root, { childList: true, subtree: true });
    pending.push(root);
    queued = true;
    window.requestAnimationFrame(flush);

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  } catch {
    return () => {};
  }
}
