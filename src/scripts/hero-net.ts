/**
 * Hero „Das Netz“ (Entwurf v2) — three stage photos as depth layers: two in the
 * back, one in front of the net. Their black stage ground is keyed out, so the
 * dancers stand free on the purple. A diagonal Keil edge sweeps left to right and
 * reveals everything. The net gathers around the „Upcoming“ field: nodes lean
 * away from it, magenta links run from its corner to the nearest nodes.
 * Scrolling pulls the photos upward, the front one fastest.
 *
 * Ported from the Claude Design prototype (TanzNetzDresden_Website_v2.dc.html).
 */

export interface HeroPhoto {
  src: string;
  /** source crop in image pixels, feet at the bottom */
  s: [number, number, number, number];
  /** fraction of the crop height below which a floor reflection is keyed out harder */
  floor?: number;
}

export interface HeroNetOptions {
  canvas: HTMLCanvasElement;
  /** Element whose top edge is the stage floor (stats bar). */
  floor: HTMLElement | null;
  /** The „Upcoming“ field the net gathers around. */
  focus: HTMLElement | null;
  /** Back left, front centre, back right (phones: the first two). */
  photos: HeroPhoto[];
  /** Base node count at 1440×820 (scaled by area). */
  nodeCount?: number;
  /** Whether the pointer links up with nearby nodes. */
  interactive?: boolean;
  /** Scrolling pulls the photos upward. */
  scrollWipe?: boolean;
}

interface Node { tx: number; ty: number; ph: number; x: number; y: number; px: number; py: number; md: number; fd: number }
interface Edge { a: number; b: number; v: number }
interface Layer { cv: HTMLCanvasElement; front: boolean; speed: number }
interface Box { x0: number; y0: number; x1: number; y1: number }

type Rgb = [number, number, number];

const R = 170; // pointer radius
const BASE = 0.3; // edge opacity

/** Placement on the stage: centre x (share of width), height factor, y offset, opacity, scroll speed. */
const SETS_WIDE = [
  { cx: 0.14, k: 0.76, oy: 0.1, a: 0.88, sp: 0.7, front: false },
  { cx: 0.52, k: 1.06, oy: 0, a: 1, sp: 1.3, front: true },
  { cx: 0.82, k: 0.88, oy: -0.05, a: 0.92, sp: 0.95, front: false },
];
const SETS_NARROW = [
  { cx: 0.25, k: 0.84, oy: 0.08, a: 0.9, sp: 0.8, front: false },
  { cx: 0.68, k: 1.04, oy: 0, a: 1, sp: 1.3, front: true },
];

/** Farben aus den Design-Tokens (design/system) lesen – als [r, g, b]. */
function tokenRgb(name: string, fallback: Rgb): Rgb {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.style.display = 'none';
  document.body.append(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : fallback;
}
const rgba = ([r, g, b]: Rgb, a = 1) => `rgba(${r},${g},${b},${a.toFixed(3)})`;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutExpo = (v: number) => (v >= 1 ? 1 : 1 - Math.pow(2, -10 * v));
const easeInOutCubic = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);

/** Does segment a→b pass through box B (grown by pad)? */
function segHits(ax: number, ay: number, bx: number, by: number, B: Box, pad: number, skipStart = false): boolean {
  const x0 = B.x0 - pad, y0 = B.y0 - pad, x1 = B.x1 + pad, y1 = B.y1 + pad;
  let t0 = skipStart ? 0.04 : 0;
  let t1 = 1;
  const dx = bx - ax, dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - x0, x1 - ax, ay - y0, y1 - ay];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
      continue;
    }
    const r = q[i] / p[i];
    if (p[i] < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return t1 - t0 > (skipStart ? 0.03 : 0);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

export class HeroNet {
  private opts: Required<Omit<HeroNetOptions, 'floor' | 'focus'>> & Pick<HeroNetOptions, 'floor' | 'focus'>;
  private ctx: CanvasRenderingContext2D | null = null;
  private net: HTMLCanvasElement | null = null;
  private nctx: CanvasRenderingContext2D | null = null;
  private W = 0;
  private H = 0;
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private layers: Layer[] = [];
  private images = new Map<string, Promise<HTMLImageElement | null>>();
  private buildId = 0;
  private t0 = 0;
  private raf = 0;
  private visible = true;
  private mouse: { x: number; y: number } | null = null;
  private hover = false;
  private hov = 0;
  private reduced: boolean;
  private resizeTimer = 0;
  private lastWidth = 0;
  private cleanup: (() => void)[] = [];
  private colors: Record<'purple' | 'magenta' | 'cyan', Rgb> = { purple: [46, 26, 77], magenta: [218, 26, 106], cyan: [72, 198, 215] };

  constructor(options: HeroNetOptions) {
    this.opts = { nodeCount: 100, interactive: true, scrollWipe: true, ...options };
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  start(): void {
    const { canvas } = this.opts;
    this.colors = {
      purple: tokenRgb('--purple', this.colors.purple),
      magenta: tokenRgb('--magenta', this.colors.magenta),
      cyan: tokenRgb('--cyan', this.colors.cyan),
    };
    this.build(this.reduced);

    const onResize = () => {
      // Mobile browsers fire resize when the URL bar collapses; only rebuild on width changes.
      const w = canvas.getBoundingClientRect().width;
      if (Math.abs(w - this.lastWidth) < 1 && this.ctx) return;
      clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.build(true), 160);
    };
    window.addEventListener('resize', onResize);
    this.cleanup.push(() => window.removeEventListener('resize', onResize));

    if (this.opts.interactive) {
      const host = canvas.parentElement ?? canvas;
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        const r = canvas.getBoundingClientRect();
        this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const onLeave = () => (this.mouse = null);
      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerleave', onLeave);
      this.cleanup.push(() => {
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
      });
    }

    // Pause the loop while the hero is off-screen.
    const io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible && !this.raf) this.loop();
    });
    io.observe(canvas);
    this.cleanup.push(() => io.disconnect());

    this.loop();
  }

  /** Knot the net again. */
  replay(): void {
    this.build(this.reduced);
  }

  /** The „Upcoming“ field is hovered or focused: the net leans in a little more. */
  setHover(on: boolean): void {
    this.hover = on;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.cleanup.forEach((fn) => fn());
  }

  private loop = () => {
    if (!this.visible) {
      this.raf = 0;
      return;
    }
    this.frame(performance.now());
    this.raf = requestAnimationFrame(this.loop);
  };

  private loadPhoto(src: string) {
    let p = this.images.get(src);
    if (!p) {
      p = loadImage(src);
      this.images.set(src, p);
    }
    return p;
  }

  private build(settled: boolean): void {
    const id = ++this.buildId;
    const narrow = this.opts.canvas.getBoundingClientRect().width < 640;
    const sets = narrow ? SETS_NARROW : SETS_WIDE;
    const defs = this.opts.photos.slice(0, sets.length);
    void Promise.all(defs.map((d) => this.loadPhoto(d.src))).then((imgs) => {
      if (id === this.buildId) this.buildNow(settled, defs, imgs, sets);
    });
  }

  private buildNow(
    settled: boolean,
    defs: HeroPhoto[],
    imgs: (HTMLImageElement | null)[],
    sets: typeof SETS_WIDE,
  ): void {
    const c = this.opts.canvas;
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    this.lastWidth = r.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = r.width;
    const H = r.height;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const net = document.createElement('canvas');
    net.width = c.width;
    net.height = c.height;
    const nctx = net.getContext('2d');
    if (!nctx) return;
    nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Object.assign(this, { ctx, net, nctx, W, H });

    const fl = this.opts.floor;
    const floor = fl ? fl.getBoundingClientRect().top - r.top : H;
    const PW = c.width;
    const PH = c.height;

    // Photos: each on its own canvas, black stage keyed out (only within its box).
    this.layers = [];
    defs.forEach((p, i) => {
      const im = imgs[i];
      const L = sets[i];
      if (!im) return;
      const dh = floor * 1.02 * L.k;
      const dw = dh * (p.s[2] / p.s[3]);
      const dx = W * L.cx - dw / 2;
      const dy = floor * (1.02 + L.oy) - dh;
      const cv = document.createElement('canvas');
      cv.width = PW;
      cv.height = PH;
      const x = cv.getContext('2d', { willReadFrequently: true });
      if (!x) return;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.drawImage(im, ...p.s, dx, dy, dw, dh);
      const bx = Math.max(0, Math.floor(dx * dpr));
      const by = Math.max(0, Math.floor(dy * dpr));
      const bw = Math.min(PW, Math.ceil((dx + dw) * dpr)) - bx;
      const bh = Math.min(PH, Math.ceil((dy + dh) * dpr)) - by;
      const floorPx = p.floor == null ? Infinity : (dy + p.floor * dh) * dpr - by;
      if (bw > 0 && bh > 0) {
        try {
          const id = x.getImageData(bx, by, bw, bh);
          const data = id.data;
          for (let j = 0; j < data.length; j += 4) {
            const yy = ((j / 4) / bw) | 0;
            const mx = Math.max(data[j], data[j + 1], data[j + 2]);
            const below = yy > floorPx;
            const lo = below ? 150 : 56;
            const span = below ? 50 : 54;
            const fa = mx < lo ? 0 : mx < lo + span ? (mx - lo) / span : 1;
            data[j + 3] = 255 * fa * L.a;
          }
          x.setTransform(1, 0, 0, 1, 0, 0);
          x.putImageData(id, bx, by);
        } catch {
          // Tainted canvas (e.g. file://): the photo shows with its black ground.
        }
      }
      this.layers.push({ cv, front: L.front, speed: L.sp });
    });

    // Nodes: best-candidate sampling for an even spread; count scaled by area.
    const base = this.opts.nodeCount;
    const N = Math.max(30, Math.round(base * Math.min(1.4, Math.max(0.45, (W * H) / (1440 * 820)))));
    const pts: Node[] = [];
    for (let i = 0; i < N; i++) {
      let best: [number, number] = [W / 2, H / 2];
      let bd = -1;
      for (let q = 0; q < 16; q++) {
        const cx = 16 + Math.random() * (W - 32);
        const cy = 16 + Math.random() * (H - 32);
        let d = Infinity;
        for (const p of pts) {
          const dd = (p.tx - cx) ** 2 + (p.ty - cy) ** 2;
          if (dd < d) d = dd;
        }
        if (d > bd) {
          bd = d;
          best = [cx, cy];
        }
      }
      pts.push({ tx: best[0], ty: best[1], ph: Math.random() * Math.PI * 2, x: best[0], y: best[1], px: 0, py: 0, md: Infinity, fd: Infinity });
    }

    // Edges: each node knots to its 3 nearest.
    const keys = new Set<string>();
    const edges: Edge[] = [];
    pts.forEach((p, i) => {
      pts
        .map((q, j) => [j, Math.hypot(q.tx - p.tx, q.ty - p.ty)] as const)
        .filter(([j]) => j !== i)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .forEach(([j]) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (keys.has(key)) return;
          keys.add(key);
          edges.push({ a: i, b: j, v: 1 });
        });
    });
    this.nodes = pts;
    this.edges = edges;

    this.t0 = performance.now() - (settled ? 20000 : 0);
    if (!this.raf && this.visible) this.loop();
  }

  private frame(now: number): void {
    const { ctx, nctx, net, W, H } = this;
    if (!ctx || !nctx || !net || !this.nodes.length) return;
    const c = this.opts.canvas;
    const cr = c.getBoundingClientRect();
    if (cr.bottom < 0) return;
    const t = (now - this.t0) / 1000;
    const m = this.opts.interactive ? this.mouse : null;
    const drift = this.reduced ? 0 : 2;
    const { purple, magenta, cyan } = this.colors;

    // Scrolling pulls the photo layers upward, each at its own speed.
    const sp = this.opts.scrollWipe && !this.reduced ? clamp01(window.scrollY / Math.max(1, H)) : 0;
    const se = 1 - (1 - sp) * (1 - sp);

    // The „Upcoming“ field: its box and its corner (the node the magenta links start from).
    let FP: { x: number; y: number } | null = null;
    let BX: Box | null = null;
    const fe = this.opts.focus;
    if (fe) {
      const ur = fe.getBoundingClientRect();
      if (ur.width) {
        FP = { x: ur.left - cr.left + 6, y: ur.top - cr.top + 8 };
        BX = { x0: ur.left - cr.left, y0: ur.top - cr.top, x1: ur.right - cr.left, y1: ur.bottom - cr.top };
      }
    }
    const fon = clamp01((t - 1.8) / 1.2);
    this.hov += ((this.hover ? 1 : 0) - this.hov) * 0.12;
    const RF = 260 + 30 * this.hov;

    // Keil wipe: a diagonal edge sweeps left to right and opens net and photos.
    const sl = H * 0.16;
    const f = easeInOutCubic(clamp01((t - 0.35) / 1.9));
    const fx = -sl + (W + 2 * sl) * f;
    const reveal = (c2: CanvasRenderingContext2D) => {
      c2.beginPath();
      if (f <= 0) return false;
      if (f >= 1) c2.rect(0, 0, W, H);
      else {
        c2.moveTo(0, 0);
        c2.lineTo(fx + sl, 0);
        c2.lineTo(fx - sl, H);
        c2.lineTo(0, H);
        c2.closePath();
      }
      return true;
    };

    // 1 · ground + back photos
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(purple);
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (reveal(ctx)) {
      ctx.clip();
      for (const l of this.layers) if (!l.front) ctx.drawImage(l.cv, 0, -se * H * l.speed, W, H);
    }
    ctx.restore();

    // 2 · the net, on its own layer
    nctx.clearRect(0, 0, W, H);
    for (const n of this.nodes) {
      let x = n.tx + Math.sin(t * 0.5 + n.ph) * drift;
      let y = n.ty + Math.cos(t * 0.42 + n.ph) * drift;
      n.md = Infinity;
      n.fd = Infinity;
      // nodes lean away from the Upcoming field, the net keeps running underneath
      let px = 0;
      let py = 0;
      if (BX) {
        const P = 34 + 6 * this.hov;
        const push = (14 + 4 * this.hov) * fon;
        const qx = Math.max(BX.x0, Math.min(x, BX.x1));
        const qy = Math.max(BX.y0, Math.min(y, BX.y1));
        const dx = x - qx;
        const dy = y - qy;
        const d = Math.hypot(dx, dy);
        if (d === 0) {
          const cx = (BX.x0 + BX.x1) / 2;
          const cy = (BX.y0 + BX.y1) / 2;
          const ux = (x - cx) / ((BX.x1 - BX.x0) / 2 || 1);
          const uy = (y - cy) / ((BX.y1 - BX.y0) / 2 || 1);
          const ul = Math.hypot(ux, uy) || 1;
          px = (ux / ul) * push * 1.6;
          py = (uy / ul) * push * 1.6;
        } else if (d < P) {
          px = (dx / d) * push * (1 - d / P);
          py = (dy / d) * push * (1 - d / P);
        }
      }
      n.px += (px - n.px) * 0.14;
      n.py += (py - n.py) * 0.14;
      x += n.px;
      y += n.py;
      if (FP) n.fd = Math.hypot(FP.x - x, FP.y - y);
      if (m) {
        const d = Math.hypot(m.x - x, m.y - y);
        n.md = d;
        if (d < R) {
          const k = (1 - d / R) * 0.14;
          x += (m.x - x) * k;
          y += (m.y - y) * k;
        }
      }
      n.x = x;
      n.y = y;
    }
    nctx.lineWidth = 1;
    for (const e of this.edges) {
      const a = this.nodes[e.a];
      const b = this.nodes[e.b];
      const hit = !!BX && fon > 0 && segHits(a.x, a.y, b.x, b.y, BX, 10);
      e.v += ((hit ? 0.45 : 1) - e.v) * 0.15;
      const near = m ? Math.max(0, 1 - Math.min(a.md, b.md) / R) : 0;
      const fn = FP ? Math.max(0, 1 - Math.min(a.fd, b.fd) / RF) * fon : 0;
      nctx.strokeStyle = rgba(cyan, (BASE * (1 - 0.45 * fon) + near * 0.45 + fn * 0.5) * e.v);
      nctx.beginPath();
      nctx.moveTo(a.x, a.y);
      nctx.lineTo(b.x, b.y);
      nctx.stroke();
    }
    for (const n of this.nodes) {
      const hot = n.md < R || n.fd < RF * 0.55 * fon;
      nctx.fillStyle = hot ? '#fff' : 'rgba(255,255,255,0.55)';
      const s = hot ? 4 : 2.5;
      nctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
    }
    // magenta links from the Upcoming corner to the nearest nodes
    if (FP && BX && fon > 0) {
      const K = 9;
      const near = this.nodes
        .filter((n) => n.fd < RF && !segHits(FP.x, FP.y, n.x, n.y, BX, -2, true))
        .sort((a, b) => a.fd - b.fd)
        .slice(0, K);
      nctx.lineWidth = 1.25;
      near.forEach((n, k) => {
        const q = easeOutExpo(clamp01((t - 1.8 - k * 0.08) / 0.7));
        const al = (1 - n.fd / RF) * (0.55 + 0.25 * this.hov) * q;
        if (al <= 0.01) return;
        nctx.strokeStyle = rgba(magenta, al);
        nctx.beginPath();
        nctx.moveTo(FP.x, FP.y);
        nctx.lineTo(FP.x + (n.x - FP.x) * q, FP.y + (n.y - FP.y) * q);
        nctx.stroke();
      });
      nctx.lineWidth = 1;
    }
    if (m) {
      nctx.lineWidth = 1.25;
      for (const n of this.nodes) {
        if (n.md >= R) continue;
        nctx.strokeStyle = rgba(magenta, (1 - n.md / R) * 0.85);
        nctx.beginPath();
        nctx.moveTo(m.x, m.y);
        nctx.lineTo(n.x, n.y);
        nctx.stroke();
      }
      nctx.lineWidth = 1;
    }

    // 3 · net, then the front photo above it
    ctx.save();
    if (reveal(ctx)) {
      ctx.clip();
      ctx.drawImage(net, 0, 0, W, H);
      for (const l of this.layers) if (l.front) ctx.drawImage(l.cv, 0, -se * H * l.speed, W, H);
    }
    ctx.restore();

    // the Keil edge itself, fading out as it leaves
    if (f > 0 && f < 1) {
      ctx.strokeStyle = rgba(magenta, Math.min(1, (1 - f) * 4));
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx + sl, 0);
      ctx.lineTo(fx - sl, H);
      ctx.stroke();
    }
    if (m) {
      ctx.fillStyle = rgba(magenta);
      ctx.fillRect(m.x - 5, m.y - 5, 10, 10);
    }
  }
}
