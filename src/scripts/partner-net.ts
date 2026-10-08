/**
 * „Ein Netz aus Orten“ – Karte der Kooperationsseite.
 *
 * Leaflet liefert nur die Geometrie (Koordinaten → Bildschirmpunkte, Zoom).
 * Darüber zeichnet ein Canvas das Netz: Orte als Quadrate mit Beschriftung,
 * Verbindungen zwischen den Orten und viele kleine Punkte um die Orte herum
 * (die Menschen im Netzwerk). Die OpenStreetMap-Kacheln darunter lädt die
 * Seite erst nach Einwilligung (siehe KooperationenView.astro).
 *
 * Übertragen aus dem Claude-Design-Entwurf design/entwuerfe/2026-10-kooperationen/.
 */
import type { Map as LeafletMap, TileLayer } from 'leaflet';

export interface Venue {
  name: string;
  label: string;
  lat: number;
  lon: number;
  seed: boolean;
}

export interface PartnerNetOptions {
  box: HTMLElement;
  mapEl: HTMLElement;
  canvas: HTMLCanvasElement;
  venues: Venue[];
  /** Paare von Indizes in `venues` */
  links: [number, number][];
  /** wird aufgerufen, wenn ein Ort hervorgehoben wird (-1 = keiner) */
  onHot?: (index: number) => void;
}

interface Node {
  ll: [number, number];
  tx: number; ty: number; sx: number; sy: number; d: number; ph: number;
  x: number; y: number;
  venue: boolean; seed: boolean; label: string; home: number;
}
interface Edge { a: number; b: number; kind: 'venue' | 'home' | 'dot'; at: number }
interface LabelBox { x: number; y: number; w: number; h: number; dy: number; side: number; i: number }
type RGB = [number, number, number];

const DOTS = 70;

/** Farbe eines Design-Tokens als [r, g, b] (folgt Änderungen in design/system). */
function tokenRgb(name: string, fallback: RGB): RGB {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.style.display = 'none';
  document.body.append(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : fallback;
}
const rgba = ([r, g, b]: RGB, a = 1) => `rgba(${r},${g},${b},${a.toFixed(3)})`;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (v: number) => (v >= 1 ? 1 : 1 - Math.pow(2, -10 * v));

export class PartnerNet {
  private o: PartnerNetOptions;
  private L!: typeof import('leaflet');
  private map: LeafletMap | null = null;
  private tiles: TileLayer | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private W = 0;
  private H = 0;
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private t0 = 0;
  private raf = 0;
  private visible = true;
  private hot = -1;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private colors = { purple: [46, 26, 77] as RGB, magenta: [218, 26, 106] as RGB, cyan: [72, 198, 215] as RGB };
  private resizeTimer = 0;
  /** Animation erst starten, wenn die Karte zum ersten Mal sichtbar ist */
  private seen = false;
  private settled = false;

  constructor(options: PartnerNetOptions) {
    this.o = options;
  }

  async start(): Promise<void> {
    this.L = await import('leaflet');
    this.colors = {
      purple: tokenRgb('--purple', this.colors.purple),
      magenta: tokenRgb('--magenta', this.colors.magenta),
      cyan: tokenRgb('--cyan', this.colors.cyan),
    };
    this.createMap();
    this.build(this.reduced);

    new ResizeObserver(() => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.build(true), 120);
    }).observe(this.o.box);

    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible && !this.seen) {
        this.seen = true;
        if (!this.settled) this.t0 = performance.now();
      }
      if (this.visible && !this.raf) this.loop();
    }).observe(this.o.box);

    this.o.box.addEventListener('pointermove', (e) => {
      if (!this.nodes.length) return;
      const r = this.o.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      let best = -1;
      let bd = 44;
      this.o.venues.forEach((_, i) => {
        const d = Math.hypot(this.nodes[i].x - x, this.nodes[i].y - y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      this.setHot(best);
    });
    this.o.box.addEventListener('pointerleave', () => this.setHot(-1));
    this.loop();
  }

  /** Ort hervorheben (auch von außen, z. B. beim Überfahren der Liste). */
  setHot(i: number): void {
    if (i === this.hot) return;
    this.hot = i;
    this.o.onHot?.(i);
  }

  /** OpenStreetMap-Kacheln einblenden (erst nach Einwilligung aufrufen). */
  showTiles(): void {
    if (!this.map || this.tiles) return;
    const tiles = this.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">OpenStreetMap</a>-Mitwirkende',
    });
    tiles.addTo(this.map);
    this.tiles = tiles;
    this.o.box.classList.add('has-tiles');
  }

  private createMap(): void {
    const L = this.L;
    const map = L.map(this.o.mapEl, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      zoomSnap: 0.25,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
      inertia: false,
    });
    map.attributionControl.setPrefix(false);
    L.control.zoom({ position: 'topright', zoomInTitle: '+', zoomOutTitle: '−' }).addTo(map);
    this.map = map;
  }

  private build(settled: boolean): void {
    const map = this.map;
    const c = this.o.canvas;
    const r = c.getBoundingClientRect();
    if (!map || !r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = r.width;
    const H = r.height;
    if (settled && this.W === W && this.H === H && this.nodes.length) return;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    map.invalidateSize(false);
    // Oben links Platz lassen für den Karten-Hinweis (auf schmalen Bildschirmen mehr)
    const narrow = W < 560;
    map.fitBounds(this.o.venues.map((v) => [v.lat, v.lon] as [number, number]), {
      paddingTopLeft: [narrow ? 24 : 40, narrow ? 120 : 50],
      paddingBottomRight: [Math.min(200, W * 0.3), 50],
      animate: false,
    });

    const rnd = () => Math.random();
    const venues: Node[] = this.o.venues.map((v, i) => {
      const p = map.latLngToContainerPoint([v.lat, v.lon]);
      return {
        ll: [v.lat, v.lon], tx: p.x, ty: p.y, sx: 0, sy: 0, d: 0, ph: 0, x: 0, y: 0,
        venue: true, seed: v.seed, label: v.label.toUpperCase(), home: i,
      };
    });
    // Punkte (Menschen) gaußartig um die Orte verteilt
    const g = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    const spread = Math.min(W, H) * 0.22;
    const dots: Node[] = [];
    for (let i = 0; i < DOTS; i++) {
      const v = venues[(rnd() * venues.length) | 0];
      const tx = Math.max(8, Math.min(W - 8, v.tx + g() * spread * 1.3));
      const ty = Math.max(8, Math.min(H - 8, v.ty + g() * spread));
      const q = map.containerPointToLatLng([tx, ty]);
      dots.push({ ll: [q.lat, q.lng], tx, ty, sx: 0, sy: 0, d: 0, ph: 0, x: 0, y: 0, venue: false, seed: false, label: '', home: -1 });
    }
    const pts = venues.concat(dots);
    for (const p of pts) {
      p.sx = rnd() * W;
      p.sy = rnd() * H;
      p.d = rnd() * 0.6;
      p.ph = rnd() * Math.PI * 2;
    }

    // Kanten: Orte untereinander, Punkte zum nächsten Ort und zu zwei Nachbarpunkten
    const seed = venues.find((v) => v.seed) ?? venues[0];
    const maxD = Math.hypot(W, H) * 0.7;
    const keys = new Set<string>();
    const edges: Edge[] = [];
    const add = (i: number, j: number, kind: Edge['kind']) => {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (keys.has(k)) return;
      keys.add(k);
      const mx = (pts[i].tx + pts[j].tx) / 2;
      const my = (pts[i].ty + pts[j].ty) / 2;
      edges.push({ a: i, b: j, kind, at: 0.5 + Math.min(1, Math.hypot(mx - seed.tx, my - seed.ty) / maxD) * 1.5 });
    };
    this.o.links.forEach(([a, b]) => add(a, b, 'venue'));
    dots.forEach((d, n) => {
      const i = venues.length + n;
      let nv = 0;
      let nd = Infinity;
      venues.forEach((v, k) => {
        const dd = Math.hypot(v.tx - d.tx, v.ty - d.ty);
        if (dd < nd) {
          nd = dd;
          nv = k;
        }
      });
      d.home = nv;
      if (nd < spread * 1.1) add(i, nv, 'home');
      pts
        .map((q, j) => [j, Math.hypot(q.tx - d.tx, q.ty - d.ty)] as const)
        .filter(([j]) => j !== i && j >= venues.length)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
        .forEach(([j]) => add(i, j, 'dot'));
    });

    Object.assign(this, { ctx, W, H, nodes: pts, edges, settled, t0: performance.now() - (settled ? 20000 : 0) });
    if (!this.raf && this.visible) this.loop();
  }

  private loop = () => {
    if (!this.visible) {
      this.raf = 0;
      return;
    }
    this.frame(performance.now());
    this.raf = requestAnimationFrame(this.loop);
  };

  private frame(now: number): void {
    const { ctx, W, H, nodes, edges, map } = this;
    if (!ctx || !nodes.length || !map) return;
    const nV = this.o.venues.length;
    const { cyan, magenta, purple } = this.colors;
    // Netz folgt der Karte beim Verschieben/Zoomen
    for (const n of nodes) {
      const p = map.latLngToContainerPoint(n.ll);
      n.tx = p.x;
      n.ty = p.y;
    }
    const t = (now - this.t0) / 1000;
    const hot = this.hot;
    const drift = this.reduced ? 0 : 1.5;
    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      const q = ease(clamp01((t - n.d) / 2));
      n.x = n.sx + (n.tx - n.sx) * q + (n.venue ? 0 : Math.sin(t * 0.5 + n.ph) * drift * q);
      n.y = n.sy + (n.ty - n.sy) * q + (n.venue ? 0 : Math.cos(t * 0.42 + n.ph) * drift * q);
    }

    for (const e of edges) {
      const q = ease(clamp01((t - e.at) / 0.6));
      if (q <= 0) continue;
      const a = nodes[e.a];
      const b = nodes[e.b];
      const lit = hot >= 0 && (e.a === hot || e.b === hot || (e.kind !== 'venue' && a.home === hot && b.home === hot));
      let al = e.kind === 'venue' ? 0.75 : e.kind === 'home' ? 0.3 : 0.16;
      if (hot >= 0) al = lit ? (e.kind === 'venue' ? 1 : 0.7) : al * 0.4;
      ctx.lineWidth = e.kind === 'venue' ? 2 : 1;
      ctx.strokeStyle = rgba(lit && e.kind !== 'venue' ? magenta : cyan, al);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + (b.x - a.x) * q, a.y + (b.y - a.y) * q);
      ctx.stroke();
    }

    for (let i = nV; i < nodes.length; i++) {
      const n = nodes[i];
      const on = hot >= 0 && n.home === hot;
      ctx.fillStyle = on ? '#fff' : `rgba(255,255,255,${hot >= 0 ? 0.35 : 0.75})`;
      const s = on ? 4 : 3;
      ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
    }

    // Beschriftungen ohne Überlappung platzieren
    const la = ease(clamp01((t - 1.8) / 0.8));
    ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
    const spaced = 'letterSpacing' in ctx;
    if (spaced) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px';
    if (la > 0) {
      const placed: LabelBox[] = [];
      const hit = (r: Omit<LabelBox, 'i'>) =>
        r.x < 4 || r.y < 4 || r.x + r.w > W - 4 || r.y + r.h > H - 4 ||
        placed.some((p) => r.x < p.x + p.w + 4 && r.x + r.w + 4 > p.x && r.y < p.y + p.h + 3 && r.y + r.h + 3 > p.y) ||
        nodes.slice(0, nV).some((m) => {
          const s = (m.seed ? 16 : 14) / 2 + 3;
          return r.x < m.x + s && r.x + r.w > m.x - s && r.y < m.y + s && r.y + r.h > m.y - s;
        });
      const order = [...Array(nV).keys()].sort((p, q) => (nodes[p].seed ? -1 : nodes[q].seed ? 1 : nodes[p].ty - nodes[q].ty || p - q));
      for (const i of order) {
        const n = nodes[i];
        const w = ctx.measureText(n.label).width + 14;
        const h = 22;
        const gap = 12 + (n.seed ? 16 : 14) / 2;
        let box: Omit<LabelBox, 'i'> | null = null;
        for (const dy of [0, -28, 28, -56, 56, -84, 84, -112, 112, -140, 140]) {
          for (const side of [1, -1]) {
            const r = { x: side > 0 ? n.x + gap : n.x - gap - w, y: n.y - h / 2 + dy, w, h, dy, side };
            if (!hit(r)) {
              box = r;
              break;
            }
          }
          if (box) break;
        }
        // Kein freier Platz: Sitz und hervorgehobener Ort bekommen trotzdem ein Etikett,
        // die übrigen stehen ohnehin in der Liste daneben.
        if (!box && !n.seed && i !== hot) continue;
        box ??= { x: Math.min(n.x + gap, W - w - 4), y: n.y - h / 2, w, h, dy: 0, side: 1 };
        placed.push({ ...box, i });
      }
      for (const r of placed) {
        const n = nodes[r.i];
        const on = hot === r.i;
        ctx.globalAlpha = la * (hot >= 0 && !on ? 0.5 : 1);
        if (r.dy !== 0) {
          ctx.strokeStyle = on || n.seed ? rgba(magenta) : 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(r.side > 0 ? r.x : r.x + r.w, r.y + r.h / 2);
          ctx.stroke();
        }
        const sx = (1 - la) * 12 * r.side;
        ctx.fillStyle = on || n.seed ? rgba(magenta) : rgba(purple, 0.92);
        ctx.fillRect(r.x + sx, r.y, r.w, r.h);
        ctx.fillStyle = '#fff';
        ctx.fillText(n.label, r.x + sx + 7, r.y + 15);
      }
      ctx.globalAlpha = 1;
    }

    // Orte zuletzt, Sitz und hervorgehobener Ort obenauf
    const sqOrder = [...Array(nV).keys()].sort((p, q) => (nodes[p].seed || p === hot ? 1 : 0) - (nodes[q].seed || q === hot ? 1 : 0));
    for (const i of sqOrder) {
      const n = nodes[i];
      const s = n.seed ? 16 : hot === i ? 14 : 10;
      ctx.fillStyle = n.seed || hot === i ? rgba(magenta) : rgba(cyan);
      ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
    }
    if (spaced) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  }
}
