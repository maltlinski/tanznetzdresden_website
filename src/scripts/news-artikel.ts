/**
 * Beitragsseite (Entwurf News v3), auch in der Vorschau des Editors:
 *  - Netz-Kopf: Netz auf der Farbfläche baut sich auf, ein Magenta-Knoten trägt die Angabe, die Maus knüpft mit
 *  - Netz statt Foto in den Karten „Mehr aus dem Netz“
 *  - Bildstrecke: Pfeile blättern, „Vollbild“ öffnet die Großansicht
 *  - Bild & Text: das Bild zum Schritt, der gerade in der Mitte steht, wischt herein
 *  - Fotos wischen beim Hereinscrollen auf; Bildpaar und Bildstrecke ohne Maße bekommen ihr Verhältnis beim Laden
 *  - „Link kopieren“
 * Bei „Bewegung reduzieren“ steht alles sofort da.
 */
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

// ---------- Netz ----------
type Rgb = [number, number, number];
interface Punkt { x: number; y: number; dim: boolean }
interface Netz { pts: Punkt[]; edges: { a: number; b: number; d: number; dim: boolean }[]; anker: { x: number; y: number; links: number[] } }
interface Box { x0: number; y0: number; x1: number; y1: number }

const hash = (t: string) => {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const zufall = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeO = (v: number) => 1 - Math.pow(1 - v, 3);

function farbe(name: string, fallback: Rgb): Rgb {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.style.display = 'none';
  document.body.append(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : fallback;
}
const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a.toFixed(3)})`;

/** Farben je Fläche: Kanten, Knoten, Deckkraft der Kanten */
function themen() {
  const lila = farbe('--purple', [46, 26, 77]);
  const cyan = farbe('--cyan', [72, 198, 215]);
  return {
    purple: { kante: cyan, knoten: [255, 255, 255] as Rgb, ea: 0.34 },
    cyan: { kante: lila, knoten: lila, ea: 0.3 },
    tint: { kante: lila, knoten: lila, ea: 0.2 },
  };
}
type Thema = ReturnType<typeof themen>['purple'];

function netzBauen(W: number, H: number, seed: string, box: Box | null, lab: (Box & { ax: number; ay: number }) | null): Netz {
  const rnd = zufall(hash(seed));
  const S = W < 700 ? 62 : 84;
  const pts: Punkt[] = [];
  for (let y = S / 2; y < H + S / 2; y += S) {
    for (let x = S / 2; x < W + S / 2; x += S) {
      const px = x + (rnd() - 0.5) * S * 0.9, py = y + (rnd() - 0.5) * S * 0.9;
      const dim = !!box && px > box.x0 && px < box.x1 && py > box.y0 && py < box.y1;
      const inLab = !!lab && px > lab.x0 && px < lab.x1 && py > lab.y0 && py < lab.y1;
      if (!inLab && rnd() < (dim ? 0.2 : 0.8)) pts.push({ x: px, y: py, dim });
    }
  }
  const ax = lab ? lab.ax : W * 0.74, ay = lab ? lab.ay : H * 0.42;
  const nah = (p: { x: number; y: number }, k: number) =>
    pts.map((q, j) => [j, Math.hypot(q.x - p.x, q.y - p.y)] as const).filter((z) => z[1] > 0).sort((u, v) => u[1] - v[1]).slice(0, k).map((z) => z[0]);
  const keys = new Set<string>();
  const edges: Netz['edges'] = [];
  pts.forEach((p, i) =>
    nah(p, 3).forEach((j) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (keys.has(key)) return;
      keys.add(key);
      edges.push({ a: i, b: j, d: Math.min(p.x, pts[j].x) / W + rnd() * 0.12, dim: p.dim || pts[j].dim });
    }),
  );
  return { pts, edges, anker: { x: ax, y: ay, links: nah({ x: ax, y: ay }, 6) } };
}

/** Zeichnet das Netz zum Zeitpunkt T (Sekunden seit Beginn); true = fertig aufgebaut */
function netzMalen(ctx: CanvasRenderingContext2D, net: Netz, W: number, H: number, th: Thema, T: number, maus: { x: number; y: number } | null, magenta: Rgb): boolean {
  const BUILD = 1.5;
  const R = 170;
  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 1;
  for (const e of net.edges) {
    const q = easeO(clamp01((T - e.d * BUILD) / 0.5));
    if (q <= 0) continue;
    const a = net.pts[e.a], b = net.pts[e.b];
    ctx.strokeStyle = rgba(th.kante, th.ea * (e.dim ? 0.35 : 1));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + (b.x - a.x) * q, a.y + (b.y - a.y) * q);
    ctx.stroke();
  }
  for (const p of net.pts) {
    if (T < (p.x / W) * BUILD) continue;
    const heiss = maus && Math.hypot(p.x - maus.x, p.y - maus.y) < R;
    ctx.fillStyle = rgba(th.knoten, heiss ? 1 : p.dim ? 0.25 : 0.6);
    const sz = heiss ? 4 : 2.5;
    ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  const A = net.anker, qa = easeO(clamp01((T - BUILD) / 0.7));
  if (qa > 0) {
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = rgba(magenta, 0.85);
    for (const j of A.links) {
      const p = net.pts[j];
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(A.x + (p.x - A.x) * qa, A.y + (p.y - A.y) * qa);
      ctx.stroke();
    }
    const s = 12 * qa;
    ctx.fillStyle = rgba(magenta, 1);
    ctx.fillRect(A.x - s / 2, A.y - s / 2, s, s);
  }
  if (maus) {
    ctx.lineWidth = 1.25;
    for (const p of net.pts) {
      const d = Math.hypot(p.x - maus.x, p.y - maus.y);
      if (d >= R) continue;
      ctx.strokeStyle = rgba(magenta, (1 - d / R) * 0.85);
      ctx.beginPath();
      ctx.moveTo(maus.x, maus.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(magenta, 1);
    ctx.fillRect(maus.x - 5, maus.y - 5, 10, 10);
  }
  return T > BUILD + 0.8;
}

function leinwand(c: HTMLCanvasElement, W: number, H: number) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Netz-Kopf: baut sich auf, Knoten-Beschriftung am Anker, die Maus knüpft mit */
function netzKopf(kopf: HTMLElement, seed: string, sofort = false) {
  const c = kopf.querySelector<HTMLCanvasElement>('.ak__netz');
  if (!c) return;
  const flaeche = (['cyan', 'tint'].find((f) => kopf.classList.contains(`ak--${f}`)) ?? 'purple') as 'purple' | 'cyan' | 'tint';
  const magenta = farbe('--magenta', [218, 26, 106]);
  let zustand: { net: Netz; ctx: CanvasRenderingContext2D; W: number; H: number; t0: number; maus: { x: number; y: number } | null } | null = null;
  let raf = 0;
  const th = themen()[flaeche];

  const aufbauen = (behalten: boolean) => {
    const r = kopf.getBoundingClientRect();
    const W = r.width, H = r.height;
    if (!W || !H) return;
    const ctx = leinwand(c, W, H);
    const text = kopf.querySelector<HTMLElement>('[data-netz-text]')?.getBoundingClientRect();
    const box = text ? { x0: text.left - r.left - 28, y0: text.top - r.top - 28, x1: text.right - r.left + 28, y1: text.bottom - r.top + 28 } : null;
    let ax = W * 0.74, ay = H * 0.42;
    if (box && box.x1 > W * 0.62) {
      ax = W * 0.66;
      ay = Math.max(70, Math.min(H * 0.3, box.y0 - 70));
    }
    const lab = kopf.querySelector<HTMLElement>('[data-knoten]');
    let lb: (Box & { ax: number; ay: number }) | null = null;
    if (lab) {
      lab.style.opacity = '0';
      const lw = lab.offsetWidth, lh = lab.offsetHeight;
      const rechts = ax + 16 + lw > W - 16;
      const lx = Math.max(8, rechts ? ax - 16 - lw : ax + 16), ly = ay - 18;
      lab.style.left = `${lx}px`;
      lab.style.top = `${ly}px`;
      lb = { ax, ay, x0: lx - 18, y0: ly - 18, x1: lx + lw + 18, y1: ly + lh + 18 };
    }
    const t0 = behalten && zustand ? zustand.t0 : ruhig() || sofort ? -1e9 : performance.now();
    zustand = { net: netzBauen(W, H, seed, box, lb), ctx, W, H, t0, maus: zustand?.maus ?? null };
    malen();
  };
  const malen = () => {
    cancelAnimationFrame(raf);
    const schritt = (jetzt: number) => {
      if (!zustand) return;
      const T = (jetzt - zustand.t0) / 1000;
      const fertig = netzMalen(zustand.ctx, zustand.net, zustand.W, zustand.H, th, T, zustand.maus, magenta);
      const lab = kopf.querySelector<HTMLElement>('[data-knoten]');
      if (lab && T > 1.7) {
        if (sofort) lab.style.transition = 'none';
        lab.style.opacity = '1';
      }
      if (!fertig) raf = requestAnimationFrame(schritt);
    };
    raf = requestAnimationFrame(schritt);
  };
  kopf.addEventListener('pointermove', (e) => {
    if (!zustand || e.pointerType === 'touch') return;
    const r = c.getBoundingClientRect();
    zustand.maus = { x: e.clientX - r.left, y: e.clientY - r.top };
    malen();
  });
  kopf.addEventListener('pointerleave', () => {
    if (!zustand) return;
    zustand.maus = null;
    malen();
  });
  let rz = 0;
  new ResizeObserver(() => {
    window.clearTimeout(rz);
    rz = window.setTimeout(() => aufbauen(true), 120);
  }).observe(kopf);
  (document.fonts?.ready ?? Promise.resolve()).then(() => aufbauen(false));
}

/** Netz in einer Karte (fertig gezeichnet, ohne Anker-Beschriftung) */
export function kartenNetze(root: ParentNode) {
  const magenta = farbe('--magenta', [218, 26, 106]);
  const th = themen();
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-netz-karte]').forEach((c) => {
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    const ctx = leinwand(c, r.width, r.height);
    const thema = th[(c.dataset.thema as keyof typeof th) ?? 'purple'] ?? th.purple;
    netzMalen(ctx, netzBauen(r.width, r.height, c.dataset.netzKarte ?? '', null, null), r.width, r.height, thema, 99, null, magenta);
  });
}

// ---------- Bildstrecke ----------
function strecken(root: HTMLElement) {
  root.addEventListener('click', (e) => {
    const knopf = (e.target as Element).closest<HTMLButtonElement>('[data-strecke-zurueck], [data-strecke-weiter], [data-strecke-voll]');
    const strecke = knopf?.closest<HTMLElement>('[data-strecke]');
    if (!knopf || !strecke) return;
    const spur = strecke.querySelector<HTMLElement>('[data-spur]');
    if (knopf.hasAttribute('data-strecke-voll')) return strecke.querySelector<HTMLAnchorElement>('a[data-lightbox]')?.click();
    const d = knopf.hasAttribute('data-strecke-weiter') ? 1 : -1;
    spur?.scrollBy({ left: d * spur.clientWidth * 0.7, behavior: ruhig() ? 'auto' : 'smooth' });
  });
}

// ---------- Bild & Text ----------
const ZEIGEN = 'polygon(0% 0%, 112% 0%, 100% 100%, 0% 100%)';
const VERSTECKT = 'polygon(0% 0%, 0% 0%, -12% 100%, 0% 100%)';
function schritteZeigen(root: HTMLElement) {
  for (const sc of root.querySelectorAll<HTMLElement>('[data-schritte]')) {
    const teile = [...sc.querySelectorAll<HTMLElement>('[data-schritt]')];
    let n = 0;
    teile.forEach((el, k) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.6) n = k;
    });
    // Bild zum Schritt n (oder das letzte davor, falls ein Schritt kein Bild hat)
    const bilder = [...sc.querySelectorAll<HTMLElement>('[data-schritt-bild]')];
    let sichtbar = 0;
    bilder.forEach((im, j) => {
      if (Number(im.dataset.schrittBild) <= n) sichtbar = j;
    });
    bilder.forEach((im, j) => {
      im.style.transition = ruhig() ? 'none' : `clip-path 0.9s ${EASE}`;
      im.style.clipPath = j <= sichtbar ? ZEIGEN : VERSTECKT;
    });
    const zahl = sc.querySelector('[data-schritt-zahl]');
    if (zahl) zahl.textContent = `${String(n + 1).padStart(2, '0')} / ${String(teile.length).padStart(2, '0')}`;
  }
}

// ---------- Fotos ----------
/** Bildpaar und Bildstrecke: Seitenverhältnis, wenn es beim Build nicht feststand (Vorschau) */
function verhaeltnisse(root: ParentNode) {
  root.querySelectorAll<HTMLImageElement>('.nb--paar .nb__item img, .nb--strecke .nb__item img').forEach((img) => {
    const a = img.parentElement as HTMLElement;
    if (a.style.getPropertyValue('--r')) return;
    const setzen = () => img.naturalWidth && a.style.setProperty('--r', (img.naturalWidth / img.naturalHeight).toFixed(4));
    if (img.complete) setzen();
    else img.addEventListener('load', setzen, { once: true });
  });
}

/** Fotos wischen von links auf, sobald sie ins Bild kommen */
function aufwischen(root: ParentNode) {
  if (ruhig() || !('IntersectionObserver' in window) || !('animate' in Element.prototype)) return;
  const els = [...root.querySelectorAll<HTMLElement>('.ak__img, .ab__text .nb__item img, .ns__rahmen')];
  const wisch = (el: HTMLElement, delay: number) => {
    el.style.clipPath = '';
    el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: 1100, delay, easing: EASE, fill: 'backwards' });
  };
  const io = new IntersectionObserver((eintraege) => eintraege.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    wisch(e.target as HTMLElement, 0);
  }), { rootMargin: '0px 0px -10% 0px' });
  for (const el of els) {
    if (el.getBoundingClientRect().top < innerHeight) wisch(el, 150);
    else {
      el.style.clipPath = 'inset(0 100% 0 0)';
      io.observe(el);
    }
  }
}

function kopieren(root: HTMLElement) {
  root.addEventListener('click', async (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-copy]');
    if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
    const label = btn.textContent;
    try {
      await navigator.clipboard.writeText(location.href.split('#')[0]);
      btn.textContent = btn.dataset.copied ?? label;
      btn.setAttribute('aria-pressed', 'true');
      setTimeout(() => {
        btn.textContent = label;
        btn.removeAttribute('aria-pressed');
      }, 2000);
    } catch {
      prompt('Link', location.href);
    }
  });
}

const eingerichtet = new WeakSet<HTMLElement>();

/**
 * Alles für einen Beitrag einrichten. `seed` macht das Netz für jeden Beitrag anders (und gleich beim
 * nächsten Besuch). Die Vorschau zeichnet den Inhalt bei jeder Änderung neu – dann `neu: true`
 * (Netz steht sofort, kein Aufwischen).
 */
export function initArtikel(root: HTMLElement, opt: { seed: string; neu?: boolean }) {
  const kopf = root.querySelector<HTMLElement>('[data-netz-kopf]');
  if (kopf) netzKopf(kopf, opt.seed, !!opt.neu);
  verhaeltnisse(root);
  root.querySelectorAll<HTMLElement>('[data-strecke-steuer]').forEach((s) => (s.hidden = false));
  if (!eingerichtet.has(root)) {
    eingerichtet.add(root);
    strecken(root);
    kopieren(root);
    addEventListener('scroll', () => schritteZeigen(root), { passive: true });
  }
  schritteZeigen(root);
  if (!opt.neu) aufwischen(root);
}
export { verhaeltnisse };
