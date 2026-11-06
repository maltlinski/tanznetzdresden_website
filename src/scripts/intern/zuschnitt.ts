/**
 * Zuschnitt-Dialog für Fotos („Ausschnitt wählen“), zuerst unter „Mein Profil“ (Porträt und Galerie).
 *
 * - Großes Foto mit einem Fokuspunkt (Quadrat), der sich ziehen, antippen oder mit den Pfeiltasten verschieben lässt.
 * - Darüber eine Abdeckung: was in keiner Form zu sehen ist, ist dunkel, was nur in manchen Formen zu sehen ist,
 *   halb dunkel; der Bereich, der überall sichtbar bleibt, ist umrandet. Fährt man über eine Vorschau, erscheint
 *   ihr Rahmen im großen Foto.
 * - Daneben jede Form, in der das Foto auf der Website erscheint, live mit Keil (src/lib/bild-zuschnitt.ts).
 * - „Vorschlag“: Gesichter, sonst Personen (MediaPipe im Browser, bild-erkennung.ts), sonst eine Auswertung des
 *   Bildinhalts (Hautton, Kanten, Farben). Kein externer Dienst, das Foto verlässt den Rechner nicht.
 * - Galeriefotos können statt dessen ganz gezeigt werden.
 */
import { fokusLesen, fokusText, fokusVorschlag, ausschnitt, sicherSichtbar, FOKUS_MITTE, type Fokus, type Quelle, type Rahmen } from '../../lib/bild-zuschnitt';
import { erkennen } from './bild-erkennung';
import { h } from './news/dom';
import { t } from './sprache';

export interface ZuschnittWahl {
  fokus: string;
  ganz: boolean;
}

const vorschlaege = new Map<string, Promise<{ fokus: Fokus; quelle: Quelle }>>();

/** Fokus-Vorschlag für ein Foto (Adresse oder Datei), ganz im Browser */
export function vorschlagBerechnen(quelle: string | Blob): Promise<{ fokus: Fokus; quelle: Quelle }> {
  const schluessel = typeof quelle === 'string' ? quelle : '';
  const alt = schluessel && vorschlaege.get(schluessel);
  if (alt) return alt;
  const neu = (async () => {
    try {
      const blob = typeof quelle === 'string' ? await (await fetch(quelle)).blob() : quelle;
      const bmp = await createImageBitmap(blob);
      const leinwand = (max: number) => {
        const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(bmp.width * s));
        c.height = Math.max(1, Math.round(bmp.height * s));
        c.getContext('2d', { willReadFrequently: true })!.drawImage(bmp, 0, 0, c.width, c.height);
        return c;
      };
      // Gesichter und Personen auf ~640 px, Bildinhalt auf ~128 px; Kästen auf das kleine Bild umrechnen
      const gross = leinwand(640);
      const klein = leinwand(128);
      bmp.close();
      const k = klein.width / gross.width;
      const e = await erkennen(gross);
      const um = (l: { x: number; y: number; w: number; h: number }[] = []) => l.map((b) => ({ x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k }));
      const px = klein.getContext('2d')!.getImageData(0, 0, klein.width, klein.height).data;
      return fokusVorschlag(px, klein.width, klein.height, { gesichter: um(e?.gesichter), personen: um(e?.personen) });
    } catch {
      return { fokus: { ...FOKUS_MITTE }, quelle: 'mitte' as const };
    }
  })();
  if (schluessel) vorschlaege.set(schluessel, neu);
  return neu;
}

const QUELLE: Record<Quelle, [string, string]> = {
  gesicht: ['Gesicht erkannt, der Punkt sitzt darauf.', 'Face detected, the point is on it.'],
  person: ['Person erkannt, der Punkt sitzt auf Kopfhöhe. Bitte kurz prüfen.', 'Person detected, the point is at head height. Please check.'],
  inhalt: ['Vorschlag nach dem Bildinhalt. Bitte kurz prüfen, ob das Wichtigste gut zu sehen ist.', 'Suggestion based on the picture. Please check that the important part is clearly visible.'],
  mitte: ['Kein klarer Mittelpunkt gefunden, der Punkt steht in der Mitte.', 'No clear centre found, the point is in the middle.'],
};

/**
 * Dialog öffnen. `rahmen(format, ganz)` liefert die Formen auf der Website für das Seitenverhältnis des Fotos.
 * Ergebnis: gewählter Ausschnitt oder null (abgebrochen).
 */
export function zuschnittWaehlen(o: {
  src: string;
  fokus?: string;
  ganz?: boolean;
  /** „Ganzes Foto zeigen“ anbieten (Galerie) */
  ganzErlaubt?: boolean;
  rahmen: (format: number, ganz: boolean) => Rahmen[];
  titel?: string;
  /** beim Öffnen gleich einen Vorschlag setzen (neues Foto ohne gewählten Ausschnitt) */
  vorschlagSofort?: boolean;
  /** Fokus, wenn keiner gewählt ist (Porträt: etwas oberhalb der Mitte) */
  standard?: Fokus;
}): Promise<ZuschnittWahl | null> {
  return new Promise((fertig) => {
    let fokus: Fokus = fokusLesen(o.fokus) ?? { ...(o.standard ?? FOKUS_MITTE) };
    let ganz = !!o.ganz;
    let format = 1;
    let markiert = -1;
    let ergebnis: ZuschnittWahl | null = null;

    const dlg = h('dialog', { class: 'zs', 'aria-labelledby': 'zs-h', 'aria-describedby': 'zs-hilfe' }) as HTMLDialogElement;
    const bild = h('img', { src: o.src, alt: '', draggable: false, class: 'zs__bild' }) as HTMLImageElement;
    const decke = h('canvas', { class: 'zs__decke', 'aria-hidden': 'true' }) as HTMLCanvasElement;
    const punkt = h('span', {
      class: 'zs__punkt', role: 'slider', tabindex: '0', 'aria-label': t('Fokuspunkt', 'Focal point'),
      'aria-valuemin': '0', 'aria-valuemax': '100',
    });
    const flaeche = h('div', { class: 'zs__flaeche' }, bild, decke, punkt);
    const status = h('p', { class: 'i-hint zs__status', role: 'status' });
    const vorschlagKnopf = h('button', { type: 'button', class: 'btn btn--secondary btn--sm' }, t('Vorschlag', 'Suggest')) as HTMLButtonElement;
    const mitteKnopf = h('button', { type: 'button', class: 'i-linkbtn' }, t('Mitte', 'Centre')) as HTMLButtonElement;
    const ganzBox = h('input', { type: 'checkbox', checked: ganz }) as HTMLInputElement;
    const ganzZeile = o.ganzErlaubt
      ? h('label', { class: 'i-check zs__ganz' }, ganzBox,
          h('span', {},
            h('strong', { text: t('Ganzes Foto zeigen', 'Show the whole photo') }), ' ',
            t('statt zuschneiden. Im Filmstreifen bekommt es sein eigenes Format, im Mosaik und Raster steht es vollständig auf Lila.',
              'instead of cropping. In the film strip it keeps its own format, in the mosaic and grid it sits complete on purple.')))
      : null;
    const liste = h('ul', { class: 'zs__formen' });
    const ok = h('button', { type: 'button', class: 'btn btn--primary btn--sm btn--marker' }, t('Übernehmen', 'Apply')) as HTMLButtonElement;
    const abbrechen = h('button', { type: 'button', class: 'btn btn--secondary btn--sm' }, t('Abbrechen', 'Cancel')) as HTMLButtonElement;

    dlg.append(
      h('div', { class: 'zs__kopf' },
        h('h2', { id: 'zs-h', text: o.titel ?? t('Ausschnitt wählen', 'Choose the crop') }),
        h('p', { class: 'i-hint', id: 'zs-hilfe', text: t(
          'Setz den Punkt auf das Wichtigste im Foto, zum Beispiel ein Gesicht: Er bleibt in jeder Form sichtbar. Ziehen, antippen oder mit den Pfeiltasten verschieben (mit Umschalt in großen Schritten).',
          'Place the point on what matters most, for example a face: it stays visible in every format. Drag, tap or move it with the arrow keys (hold Shift for big steps).',
        ) })),
      h('div', { class: 'zs__haupt' },
        h('div', { class: 'zs__buehne' }, flaeche),
        h('div', { class: 'zs__seite' },
          h('div', { class: 'zs__werkzeuge' }, vorschlagKnopf, mitteKnopf),
          status,
          ganzZeile,
          h('p', { class: 'zs__unter', text: t('So erscheint es auf der Website', 'How it appears on the website') }),
          liste,
          h('p', { class: 'i-hint zs__legende', text: t(
            'Im großen Foto: dunkel ist nirgends zu sehen, halb dunkel nur in manchen Formen. Die Linie umrandet, was überall zu sehen ist.',
            'In the large photo: dark is never shown, half dark only in some formats. The line marks what is visible everywhere.',
          ) }))),
      h('div', { class: 'zs__fuss' }, abbrechen, ok),
    );

    // ---------- Formen ----------
    let rahmen: Rahmen[] = [];
    let formBilder: HTMLImageElement[] = [];
    function formenBauen() {
      rahmen = o.rahmen(format, ganz);
      formBilder = [];
      liste.replaceChildren(...rahmen.map((r, i) => {
        const img = h('img', { src: o.src, alt: '', draggable: false }) as HTMLImageElement;
        formBilder.push(img);
        const form = h('div', { class: r.ganz ? 'zs__form zs__form--ganz' : 'zs__form', style: `aspect-ratio: ${r.r}; --r: ${r.r};${r.clip ? ` clip-path: ${r.clip};` : ''}` }, img);
        const li = h('li', { class: 'zs__formel', tabindex: '0', 'aria-label': t(`Vorschau: ${r.de}`, `Preview: ${r.en}`) }, form, h('span', { text: t(r.de, r.en) }));
        const an = () => ((markiert = i), zeichnen());
        const aus = () => ((markiert = -1), zeichnen());
        li.addEventListener('pointerenter', an);
        li.addEventListener('pointerleave', aus);
        li.addEventListener('focus', an);
        li.addEventListener('blur', aus);
        return li;
      }));
      zeichnen();
    }

    // ---------- Zeichnen ----------
    let bereit = 0;
    function zeichnen() {
      cancelAnimationFrame(bereit);
      bereit = requestAnimationFrame(() => {
        const pos = fokusText(fokus);
        punkt.style.left = `${fokus.x}%`;
        punkt.style.top = `${fokus.y}%`;
        punkt.setAttribute('aria-valuenow', String(Math.round(fokus.x)));
        punkt.setAttribute('aria-valuetext', t(`${Math.round(fokus.x)} % von links, ${Math.round(fokus.y)} % von oben`, `${Math.round(fokus.x)} % from the left, ${Math.round(fokus.y)} % from the top`));
        formBilder.forEach((img) => (img.style.objectPosition = pos));
        // Abdeckung
        const w = bild.clientWidth;
        const hh = bild.clientHeight;
        if (!w || !hh) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (decke.width !== Math.round(w * dpr)) decke.width = Math.round(w * dpr);
        if (decke.height !== Math.round(hh * dpr)) decke.height = Math.round(hh * dpr);
        decke.style.width = `${w}px`;
        decke.style.height = `${hh}px`;
        const g = decke.getContext('2d')!;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, hh);
        const css = getComputedStyle(dlg);
        const lila = css.getPropertyValue('--purple').trim() || '#3d1060';
        const magenta = css.getPropertyValue('--magenta').trim() || '#e5007d';
        const zuschnitt = rahmen.filter((r) => !r.ganz);
        if (zuschnitt.length) {
          g.globalAlpha = 0.72;
          g.fillStyle = lila;
          g.fillRect(0, 0, w, hh);
          g.globalCompositeOperation = 'destination-out';
          g.globalAlpha = 1 / zuschnitt.length;
          g.fillStyle = '#000';
          for (const r of zuschnitt) {
            const a = ausschnitt(format, r.r, fokus);
            g.fillRect(a.x * w, a.y * hh, a.w * w, a.h * hh);
          }
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = 1;
          const s = sicherSichtbar(format, zuschnitt, fokus);
          g.setLineDash([6, 5]);
          g.lineWidth = 1.5;
          g.strokeStyle = '#fff';
          g.strokeRect(s.x * w + 0.75, s.y * hh + 0.75, s.w * w - 1.5, s.h * hh - 1.5);
          g.setLineDash([]);
        }
        const m = rahmen[markiert];
        if (m && !m.ganz) {
          const a = ausschnitt(format, m.r, fokus);
          g.lineWidth = 3;
          g.strokeStyle = magenta;
          g.strokeRect(a.x * w + 1.5, a.y * hh + 1.5, a.w * w - 3, a.h * hh - 3);
        }
      });
    }

    // ---------- Bedienung ----------
    const setzen = (f: Fokus) => {
      fokus = { x: Math.round(Math.min(100, Math.max(0, f.x))), y: Math.round(Math.min(100, Math.max(0, f.y))) };
      zeichnen();
    };
    const ausZeiger = (e: PointerEvent) => {
      const r = bild.getBoundingClientRect();
      setzen({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    };
    flaeche.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      flaeche.setPointerCapture(e.pointerId);
      flaeche.classList.add('is-ziehen');
      ausZeiger(e);
      punkt.focus({ preventScroll: true });
    });
    flaeche.addEventListener('pointermove', (e) => flaeche.hasPointerCapture(e.pointerId) && ausZeiger(e));
    const loslassen = (e: PointerEvent) => {
      if (flaeche.hasPointerCapture(e.pointerId)) flaeche.releasePointerCapture(e.pointerId);
      flaeche.classList.remove('is-ziehen');
    };
    flaeche.addEventListener('pointerup', loslassen);
    flaeche.addEventListener('pointercancel', loslassen);
    punkt.addEventListener('keydown', (e) => {
      const schritt = e.shiftKey ? 10 : 1;
      const wege: Record<string, [number, number]> = { ArrowLeft: [-schritt, 0], ArrowRight: [schritt, 0], ArrowUp: [0, -schritt], ArrowDown: [0, schritt] };
      if (e.key === 'Home') setzen({ ...FOKUS_MITTE });
      else if (wege[e.key]) setzen({ x: fokus.x + wege[e.key][0], y: fokus.y + wege[e.key][1] });
      else return;
      e.preventDefault();
    });
    async function vorschlagen() {
      vorschlagKnopf.disabled = true;
      status.textContent = t('Foto wird ausgewertet … (beim ersten Mal einige Sekunden)', 'Analysing the photo … (a few seconds the first time)');
      const v = await vorschlagBerechnen(o.src);
      vorschlagKnopf.disabled = false;
      setzen(v.fokus);
      status.textContent = t(...QUELLE[v.quelle]);
    }
    vorschlagKnopf.addEventListener('click', vorschlagen);
    mitteKnopf.addEventListener('click', () => {
      setzen({ ...(o.standard ?? FOKUS_MITTE) });
      status.textContent = '';
    });
    ganzBox.addEventListener('change', () => {
      ganz = ganzBox.checked;
      formenBauen();
    });
    const beobachter = new ResizeObserver(() => zeichnen());
    beobachter.observe(bild);

    abbrechen.addEventListener('click', () => dlg.close());
    ok.addEventListener('click', () => {
      ergebnis = { fokus: fokusText(fokus), ganz };
      dlg.close();
    });
    dlg.addEventListener('close', () => {
      beobachter.disconnect();
      dlg.remove();
      fertig(ergebnis);
    });

    document.body.append(dlg);
    dlg.showModal();
    const los = () => {
      format = bild.naturalWidth && bild.naturalHeight ? bild.naturalWidth / bild.naturalHeight : 1;
      formenBauen();
      if (o.vorschlagSofort && !fokusLesen(o.fokus)) void vorschlagen();
    };
    if (bild.complete && bild.naturalWidth) los();
    else {
      bild.addEventListener('load', los, { once: true });
      bild.addEventListener('error', () => (status.textContent = t('Das Foto ließ sich nicht laden.', 'The photo could not be loaded.')), { once: true });
    }
    punkt.focus({ preventScroll: true });
  });
}
