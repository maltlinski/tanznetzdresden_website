/**
 * Instagram-Story (1080 × 1920) zu einem Beitrag als Bild herunterladen: Titelbild mit Keil-Ecke, Rubrik,
 * Titel und Adresse – in den Farben und Schriften des Designsystems. Entsteht im Browser (Canvas).
 */
const W = 1080;
const H = 1920;
/** Farbe aus den Design-Tokens der Seite (CSS-Variablen) */
const farbe = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function laden(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fehler) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = fehler;
    img.src = src;
  });
}

/** Zeilen umbrechen, höchstens `max` Zeilen (letzte mit …) */
function zeilen(g: CanvasRenderingContext2D, text: string, breite: number, max: number) {
  const out: string[] = [];
  let zeile = '';
  for (const wort of text.split(/\s+/).filter(Boolean)) {
    const probe = zeile ? `${zeile} ${wort}` : wort;
    if (g.measureText(probe).width <= breite || !zeile) zeile = probe;
    else {
      out.push(zeile);
      zeile = wort;
    }
  }
  if (zeile) out.push(zeile);
  if (out.length > max) {
    out.length = max;
    out[max - 1] = `${out[max - 1].replace(/\s*\S+$/, '')} …`;
  }
  return out;
}

export async function storyBild(b: { titel: string; kategorie: string; datum: string; bild: string | null; fokus: string | null; datei: string }) {
  const lila = farbe('--purple');
  const magenta = farbe('--magenta');
  const cyan = farbe('--cyan');
  const display = "'Work Sans', system-ui, sans-serif";
  const mono = "'JetBrains Mono', ui-monospace, monospace";
  await Promise.all([document.fonts.load(`800 96px ${display}`), document.fonts.load(`600 30px ${mono}`)]).catch(() => {});

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = lila;
  g.fillRect(0, 0, W, H);

  // Titelbild oben, unten rechts mit Keil-Ecke
  const fotoH = 1080;
  if (b.bild) {
    const img = await laden(b.bild);
    const [fx, fy] = (b.fokus ?? '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
    const s = Math.max(W / img.width, fotoH / img.height);
    const w = img.width * s;
    const h = img.height * s;
    g.save();
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(W, 0);
    g.lineTo(W, fotoH * 0.86);
    g.lineTo(W * 0.88, fotoH);
    g.lineTo(0, fotoH);
    g.closePath();
    g.clip();
    g.drawImage(img, (W - w) * fx, (fotoH - h) * fy, w, h);
    g.restore();
    g.fillStyle = magenta;
    g.fillRect(0, 0, 64, 64);
  }

  const x = 80;
  let y = b.bild ? fotoH + 120 : 360;
  // Rubrik mit Marker
  g.fillStyle = magenta;
  g.fillRect(x, y - 22, 22, 22);
  g.fillStyle = cyan;
  g.font = `600 30px ${mono}`;
  g.textBaseline = 'alphabetic';
  const datum = new Date(`${b.datum}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  g.fillText(`${b.kategorie} · ${datum}`.toUpperCase().split('').join(' '), x + 42, y);

  // Titel
  y += 120;
  let groesse = 96;
  g.font = `800 ${groesse}px ${display}`;
  let z = zeilen(g, b.titel, W - 2 * x, 5);
  if (z.length > 4) {
    groesse = 78;
    g.font = `800 ${groesse}px ${display}`;
    z = zeilen(g, b.titel, W - 2 * x, 5);
  }
  g.fillStyle = '#fff';
  for (const l of z) {
    g.fillText(l, x, y);
    y += groesse * 1.02;
  }

  // Keil-Balken und Adresse unten
  g.fillStyle = magenta;
  g.beginPath();
  g.moveTo(0, H - 24);
  g.lineTo(W * 0.42 * 0.72, H - 24);
  g.lineTo(W * 0.42, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();
  g.fillStyle = cyan;
  g.font = `600 28px ${mono}`;
  g.fillText('TANZNETZDRESDEN.DE', x, H - 90);

  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'));
  if (!blob) throw new Error('Kein Bild');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = b.datei;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
