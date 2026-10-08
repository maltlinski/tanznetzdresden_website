/**
 * Hero „Das Netz“ — a diagonal Keil edge sweeps left to right and reveals the
 * net together with one stage photo. The photo's black stage ground is keyed
 * out, so the dancer appears to shine through the purple (screen blend), and
 * the net is erased wherever a body is (the net runs *behind* the dancers).
 * Towards the photo on the right the net fades out.
 *
 * Ported from the Claude Design prototype (TanzNetzDresden Website.dc.html, round 4).
 */

export interface HeroPhoto {
  src: string;
  /** source crop in image pixels */
  s: [number, number, number, number];
  /** destination on the 1280×800 stage */
  d: [number, number, number, number];
  /** bounding box of the body on the stage */
  box: [number, number, number, number];
  /** y on the stage below which a floor reflection is keyed out harder */
  floorY?: number;
}

export interface HeroNetOptions {
  canvas: HTMLCanvasElement;
  /** Element whose top edge is the stage floor (stats bar). */
  floor: HTMLElement | null;
  /** Headline — photos are never placed over its text. */
  title: HTMLElement | null;
  photos: HeroPhoto[];
  /** Base node count at 1440×820 (scaled by area). */
  nodeCount?: number;
  /** How strongly the net fades out towards the right (0–1). */
  netFade?: number;
  /** Whether the pointer links up with nearby nodes. */
  interactive?: boolean;
}

interface Node { tx: number; ty: number; ph: number; x: number; y: number; md: number }
interface Edge { a: number; b: number; base: number }
interface Layer { cv: HTMLCanvasElement; mask: HTMLCanvasElement; box: [number, number, number, number] }

type Rgb = [number, number, number];

const R = 170; // pointer radius

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
const easeInOutCubic = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);

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
  private opts: Required<Omit<HeroNetOptions, 'floor' | 'title'>> & Pick<HeroNetOptions, 'floor' | 'title'>;
  private ctx: CanvasRenderingContext2D | null = null;
  private net: HTMLCanvasElement | null = null;
  private nctx: CanvasRenderingContext2D | null = null;
  private W = 0;
  private H = 0;
  private textRight = 0;
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private accents: Node[] = [];
  private layer: Layer | null = null;
  private images = new Map<string, Promise<HTMLImageElement | null>>();
  private photoIdx: number;
  private t0 = 0;
  private raf = 0;
  private visible = true;
  private mouse: { x: number; y: number } | null = null;
  private reduced: boolean;
  private resizeTimer = 0;
  private lastWidth = 0;
  private cleanup: (() => void)[] = [];
  private colors: Record<'purple' | 'magenta' | 'cyan', Rgb> = { purple: [46, 26, 77], magenta: [218, 26, 106], cyan: [72, 198, 215] };

  constructor(options: HeroNetOptions) {
    this.opts = { nodeCount: 110, netFade: 1, interactive: true, ...options };
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // One photo per visit. Chosen at random, so nothing is stored on the device.
    this.photoIdx = Math.floor(Math.random() * Math.max(1, this.opts.photos.length));
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

  /** Next photo, knot the net again. */
  replay(): void {
    if (this.opts.photos.length) this.photoIdx = (this.photoIdx + 1) % this.opts.photos.length;
    this.build(this.reduced);
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
    const idx = this.photoIdx;
    const def = this.opts.photos[idx];
    if (!def) {
      this.buildNow(settled, null, null);
      return;
    }
    void this.loadPhoto(def.src).then((img) => {
      if (idx === this.photoIdx) this.buildNow(settled, def, img);
    });
  }

  private buildNow(settled: boolean, hp: HeroPhoto | null, img: HTMLImageElement | null): void {
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

    // The photo is laid out on a 1280×800 stage, scaled to the hero height and
    // anchored right — but the body never starts left of the headline's end.
    const fl = this.opts.floor;
    const h1 = this.opts.title;
    const floor = fl ? fl.getBoundingClientRect().top - r.top : H;
    let textRight = W * 0.45;
    if (h1) {
      const rg = document.createRange();
      rg.selectNodeContents(h1);
      textRight = rg.getBoundingClientRect().right - r.left;
    }
    this.textRight = textRight;
    const k = Math.max(0.5, floor / 800);
    const ox = Math.max(W - 1280 * k, textRight + 24 - (hp ? hp.box[0] : 545) * k);
    const X = (x: number) => ox + x * k;
    const Y = (y: number) => y * k;
    const PW = c.width;
    const PH = c.height;

    this.layer = null;
    // Too narrow for the photo next to the headline (phones): show the net only,
    // rather than a body cut off at the edge.
    const fits = hp ? W - X(hp.box[0]) >= (hp.box[2] - hp.box[0]) * k * 0.5 : false;
    if (hp && img && fits) {
      const cv = document.createElement('canvas');
      cv.width = PW;
      cv.height = PH;
      const x = cv.getContext('2d', { willReadFrequently: true });
      const mask = document.createElement('canvas');
      mask.width = PW;
      mask.height = PH;
      if (x) {
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        x.fillStyle = '#000';
        x.fillRect(0, 0, W, H);
        x.drawImage(img, ...hp.s, X(hp.d[0]), Y(hp.d[1]), hp.d[2] * k, hp.d[3] * k);
        try {
          // Key out the black stage: dark pixels fade to black (invisible under
          // `screen`), and the alpha mask marks where the body is.
          const id = x.getImageData(0, 0, PW, PH);
          const data = id.data;
          const mctx = mask.getContext('2d');
          if (mctx) {
            const mid = mctx.createImageData(PW, PH);
            const md = mid.data;
            const floorPx = hp.floorY ? Y(hp.floorY) * dpr : Infinity;
            for (let i = 0; i < data.length; i += 4) {
              const yy = ((i / 4) / PW) | 0;
              const mx = Math.max(data[i], data[i + 1], data[i + 2]);
              const below = yy > floorPx;
              const lo = below ? 150 : 56;
              const span = below ? 50 : 54;
              const fa = mx < lo ? 0 : mx < lo + span ? (mx - lo) / span : 1;
              if (fa < 1) {
                data[i] *= fa;
                data[i + 1] *= fa;
                data[i + 2] *= fa;
              }
              if (fa > 0.06) md[i + 3] = 255;
            }
            x.setTransform(1, 0, 0, 1, 0, 0);
            x.putImageData(id, 0, 0);
            mctx.putImageData(mid, 0, 0);
          }
        } catch {
          // Tainted canvas (e.g. file://): the photo still shows via `screen`, the net just isn't masked.
        }
        this.layer = { cv, mask, box: [X(hp.box[0]), Y(hp.box[1]), X(hp.box[2]), Y(hp.box[3])] };
      }
    }

    // Nodes: best-candidate sampling for an even spread, slightly denser on the
    // left (behind the text); count scaled by area.
    const base = this.opts.nodeCount;
    const N = Math.max(30, Math.round(base * Math.min(1.4, Math.max(0.45, (W * H) / (1440 * 820)))));
    const pts: Node[] = [];
    for (let i = 0; i < N; i++) {
      let best: [number, number] = [W / 2, H / 2];
      let bd = -1;
      for (let q = 0; q < 16; q++) {
        const cx = 16 + Math.pow(Math.random(), 1.3) * (W - 32);
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
      pts.push({ tx: best[0], ty: best[1], ph: Math.random() * Math.PI * 2, x: best[0], y: best[1], md: Infinity });
    }

    // Edges: each node knots to its 3 nearest; quieter behind the headline.
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
          const mx = (p.tx + pts[j].tx) / 2;
          const my = (p.ty + pts[j].ty) / 2;
          const inText = mx < W * 0.46 && my > H * 0.32;
          edges.push({ a: i, b: j, base: inText ? 0.14 : 0.3 });
        });
    });
    this.nodes = pts;
    this.edges = edges;

    // Three magenta accent squares, away from the text and the body.
    this.accents = [];
    const L = this.layer;
    for (let i = 0; i < 300 && this.accents.length < 3; i++) {
      const p = pts[(Math.random() * pts.length) | 0];
      const inBody = !!L && p.tx > L.box[0] && p.tx < L.box[2] && p.ty > L.box[1];
      if (!inBody && !(p.tx < W * 0.5 && p.ty > H * 0.3) && !this.accents.includes(p)) this.accents.push(p);
    }

    this.t0 = performance.now() - (settled ? 20000 : 0);
    if (!this.raf && this.visible) this.loop();
  }

  private frame(now: number): void {
    const { ctx, nctx, net, W, H, layer } = this;
    if (!ctx || !nctx || !net || !this.nodes.length) return;
    const t = (now - this.t0) / 1000;
    const m = this.opts.interactive ? this.mouse : null;
    const drift = this.reduced ? 0 : 2;

    // Keil wipe: a diagonal edge sweeps left to right and opens net and photo.
    const sl = H * 0.16;
    const f = easeInOutCubic(clamp01((t - 0.35) / 1.9));
    const fx = -sl + (W + 2 * sl) * f;
    const reveal = (c: CanvasRenderingContext2D) => {
      c.beginPath();
      if (f <= 0) return false;
      if (f >= 1) c.rect(0, 0, W, H);
      else {
        c.moveTo(0, 0);
        c.lineTo(fx + sl, 0);
        c.lineTo(fx - sl, H);
        c.lineTo(0, H);
        c.closePath();
      }
      return true;
    };

    // 1 · ground + photo (screen blend)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(this.colors.purple);
    ctx.fillRect(0, 0, W, H);
    if (layer) {
      ctx.globalCompositeOperation = 'screen';
      ctx.save();
      if (reveal(ctx)) {
        ctx.clip();
        ctx.drawImage(layer.cv, 0, 0, W, H);
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }

    // 2 · the net, on its own layer
    nctx.globalCompositeOperation = 'source-over';
    nctx.globalAlpha = 1;
    nctx.clearRect(0, 0, W, H);
    for (const n of this.nodes) {
      let x = n.tx + Math.sin(t * 0.5 + n.ph) * drift;
      let y = n.ty + Math.cos(t * 0.42 + n.ph) * drift;
      n.md = Infinity;
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
      const near = m ? Math.max(0, 1 - Math.min(a.md, b.md) / R) : 0;
      nctx.strokeStyle = rgba(this.colors.cyan, e.base + near * 0.45);
      nctx.beginPath();
      nctx.moveTo(a.x, a.y);
      nctx.lineTo(b.x, b.y);
      nctx.stroke();
    }
    for (const n of this.nodes) {
      const hot = n.md < R;
      nctx.fillStyle = hot ? '#fff' : 'rgba(255,255,255,0.55)';
      const s = hot ? 4 : 2.5;
      nctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
    }
    nctx.fillStyle = rgba(this.colors.magenta);
    for (const p of this.accents) nctx.fillRect(p.x - 5, p.y - 5, 10, 10);

    // 3 · the net runs out towards the photo on the right
    const fade = clamp01(this.opts.netFade);
    if (fade > 0) {
      const x0 = Math.min(W * 0.75, Math.max(W * 0.45, (this.textRight || W * 0.45) + 40));
      const g = nctx.createLinearGradient(x0, 0, W, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.4, `rgba(0,0,0,${(fade * 0.85).toFixed(3)})`);
      g.addColorStop(0.7, `rgba(0,0,0,${(fade * 0.97).toFixed(3)})`);
      g.addColorStop(1, `rgba(0,0,0,${fade.toFixed(3)})`);
      nctx.globalCompositeOperation = 'destination-out';
      nctx.fillStyle = g;
      nctx.fillRect(0, 0, W, H);
      nctx.globalCompositeOperation = 'source-over';
    }
    if (m) {
      nctx.lineWidth = 1.25;
      for (const n of this.nodes) {
        if (n.md >= R) continue;
        nctx.strokeStyle = rgba(this.colors.magenta, (1 - n.md / R) * 0.85);
        nctx.beginPath();
        nctx.moveTo(m.x, m.y);
        nctx.lineTo(n.x, n.y);
        nctx.stroke();
      }
    }

    // 4 · erase the net wherever the body is
    if (layer) {
      nctx.globalCompositeOperation = 'destination-out';
      nctx.save();
      if (reveal(nctx)) {
        nctx.clip();
        nctx.drawImage(layer.mask, 0, 0, W, H);
      }
      nctx.restore();
      nctx.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    if (reveal(ctx)) {
      ctx.clip();
      ctx.drawImage(net, 0, 0, W, H);
    }
    ctx.restore();

    // the Keil edge itself, fading out as it leaves
    if (f > 0 && f < 1) {
      ctx.strokeStyle = rgba(this.colors.magenta, Math.min(1, (1 - f) * 4));
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx + sl, 0);
      ctx.lineTo(fx - sl, H);
      ctx.stroke();
    }
    if (m) {
      ctx.fillStyle = rgba(this.colors.magenta);
      ctx.fillRect(m.x - 5, m.y - 5, 10, 10);
    }
  }
}
