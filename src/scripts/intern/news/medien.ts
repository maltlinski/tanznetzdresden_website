/**
 * Mediathek der Redaktion: alle Fotos im Bucket „newsbilder“ mit ihren Angaben (Tabelle news_medien,
 * Migration 20261016000000_mediathek.sql) und den Beiträgen, in denen sie stehen.
 * Genutzt von der Medien-Seite (src/pages/intern/news/medien/) und im Editor (Bild wählen).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { newsPhotoUrl, type MedienRow, type NewsRow } from '../../../lib/supabase';
import { abschnitte } from '../../../lib/news-bloecke';
import { BUCKET, hochladen } from './fotos';
import { h } from './dom';

export interface Verwendung {
  id: string;
  titel: string;
  online: boolean;
}
export interface Medium extends MedienRow {
  verwendet: Verwendung[];
}
export interface Mediathek {
  liste: Medium[];
  /** false: Tabelle news_medien fehlt noch (Migration nicht eingespielt) – Angaben lassen sich nicht speichern */
  tabelle: boolean;
}

const leer = (datei: string): Medium => ({ datei, alt: '', alt_en: '', credit: '', focus: null, verwendet: [] });
const imBucket = (d: string) => !/^(\/|https:|\.\.)/.test(d);

/** Dateien im Bucket (Ordner je Jahr) – klappt nur mit der Leserechte-Regel aus der Migration */
async function bucketDateien(sb: SupabaseClient): Promise<{ datei: string; created_at?: string }[]> {
  const out: { datei: string; created_at?: string }[] = [];
  const { data: oben } = await sb.storage.from(BUCKET).list('', { limit: 1000 });
  for (const x of oben ?? []) {
    if (x.id) {
      out.push({ datei: x.name, created_at: x.created_at ?? undefined });
      continue;
    }
    const { data: innen } = await sb.storage.from(BUCKET).list(x.name, { limit: 1000 });
    for (const y of innen ?? []) if (y.id && !y.name.startsWith('.')) out.push({ datei: `${x.name}/${y.name}`, created_at: y.created_at ?? undefined });
  }
  return out;
}

/** Alles laden: Angaben, Dateien und Verwendung in Beiträgen; neueste zuerst */
export async function medienLaden(sb: SupabaseClient): Promise<Mediathek> {
  const [angaben, beitraege, dateien] = await Promise.all([
    sb.from('news_medien').select('*'),
    sb.from('news_posts').select('id, title, status, image_path, body, body_en').order('date', { ascending: false }),
    bucketDateien(sb).catch(() => []),
  ]);
  const map = new Map<string, Medium>();
  const holen = (d: string) => map.get(d) ?? map.set(d, leer(d)).get(d)!;
  for (const r of (angaben.data ?? []) as MedienRow[]) map.set(r.datei, { ...leer(r.datei), ...r, alt: r.alt ?? '', alt_en: r.alt_en ?? '', credit: r.credit ?? '' });
  for (const f of dateien) holen(f.datei).created_at ??= f.created_at;
  for (const p of (beitraege.data ?? []) as Pick<NewsRow, 'id' | 'title' | 'status' | 'image_path' | 'body' | 'body_en'>[]) {
    const v: Verwendung = { id: p.id, titel: p.title, online: p.status === 'veroeffentlicht' };
    const darin = new Map<string, string>();
    if (p.image_path) darin.set(p.image_path, '');
    for (const b of abschnitte(p.body ?? '').bloecke) {
      const fotos = b.typ === 'bilder' ? b.bilder : b.typ === 'schritte' ? b.schritte : [];
      for (const x of fotos) if (x.datei && imBucket(x.datei)) darin.set(x.datei, x.alt);
    }
    for (const [d, alt] of darin) {
      const m = holen(d);
      if (!m.verwendet.some((x) => x.id === v.id)) m.verwendet.push(v);
      // ältere Beiträge: Bildbeschreibung aus dem Text übernehmen, bis sie in der Mediathek steht
      if (!m.alt && alt) m.alt = alt;
    }
  }
  const zeit = (m: Medium) => m.created_at ?? m.datei.match(/-([a-z0-9]{8,})\.\w+$/)?.[1] ?? '';
  const liste = [...map.values()].sort((a, b) => (zeit(b) > zeit(a) ? 1 : zeit(b) < zeit(a) ? -1 : b.datei.localeCompare(a.datei)));
  return { liste, tabelle: !angaben.error };
}

/** Angaben speichern (legt das Foto in der Tabelle an, falls nötig) */
export async function medienSpeichern(sb: SupabaseClient, m: Pick<MedienRow, 'datei' | 'alt' | 'alt_en' | 'credit' | 'focus'>) {
  const { error } = await sb.from('news_medien').upsert({ datei: m.datei, alt: m.alt, alt_en: m.alt_en, credit: m.credit, focus: m.focus });
  return error;
}

/** Neues Foto hochladen und in die Mediathek aufnehmen */
export async function medienHochladen(sb: SupabaseClient, f: File, slug = 'mediathek', angaben: Partial<MedienRow> = {}): Promise<string> {
  const datei = await hochladen(sb, f, slug);
  await sb.from('news_medien').upsert({ datei, alt: '', alt_en: '', credit: '', focus: null, ...angaben }, { onConflict: 'datei', ignoreDuplicates: true });
  return datei;
}

export const ZUSCHNITTE = [
  { label: 'Übersicht · 4:3', ratio: '4 / 3', clip: 'polygon(0 0, 100% 0, 100% 84%, 88% 100%, 0 100%)' },
  { label: 'Startseite · 16:9', ratio: '16 / 9', clip: 'polygon(0 0, 100% 0, 100% 86%, 93% 100%, 0 100%)' },
  { label: 'Artikel · 21:9', ratio: '21 / 9', clip: 'polygon(0 0, 100% 0, 100% 86%, 94% 100%, 0 100%)' },
];

/** So wird das Foto auf der Website zugeschnitten (je nach Ausschnitt) */
export function zuschnitte(src: string, fokus: string | null) {
  return h('div', { class: 'md-zuschnitte', 'aria-hidden': 'true' },
    ...ZUSCHNITTE.map((z) => h('div', { class: 'md-zuschnitt' },
      h('div', { class: 'md-zuschnitt__rahmen', style: `aspect-ratio:${z.ratio};clip-path:${z.clip}` },
        h('img', { src, alt: '', style: `object-position:${fokus ?? '50% 50%'}`, loading: 'lazy' })),
      h('span', { text: z.label }))));
}

/** Foto mit Fokuspunkt: Klick setzt den Ausschnitt */
export function fokusFlaeche(src: string, fokus: string | null, setzen: (f: string) => void, titel = 'Klick ins Foto setzt den Fokuspunkt. Alle Zuschnitte richten sich danach.') {
  const img = h('img', { src, alt: '', draggable: false });
  const [x, y] = (fokus ?? '50% 50%').split(' ');
  const punkt = h('span', { class: 'md-fokus__punkt', style: `left:${x};top:${y}`, 'aria-hidden': 'true' }, h('span'));
  const el = h('div', { class: 'md-fokus', title: titel }, img, punkt);
  el.addEventListener('click', (e) => {
    const r = img.getBoundingClientRect();
    const fx = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
    const fy = Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)));
    punkt.style.left = `${fx}%`;
    punkt.style.top = `${fy}%`;
    setzen(`${fx}% ${fy}%`);
  });
  return el;
}

/**
 * „Bild wählen“: Mediathek als Dialog. Klick wählt ein Foto (bei `mehrere` ankreuzen und übernehmen);
 * hochladen geht über den Knopf oder per Ziehen ins Fenster.
 */
export function medienWaehlen(sb: SupabaseClient, opt: { mehrere?: boolean; slug?: () => string } = {}): Promise<Medium[]> {
  return new Promise((fertig) => {
    let ergebnis: Medium[] = [];
    const gewaehlt = new Set<Medium>();
    const dlg = h('dialog', { class: 'md-wahl', 'aria-labelledby': 'md-wahl-h' }) as HTMLDialogElement;
    const raster = h('div', { class: 'md-wahl__raster' }, h('p', { class: 'i-hint', text: 'Fotos werden geladen …' }));
    const status = h('p', { class: 'i-hint md-wahl__status', role: 'status' });
    const ok = h('button', { type: 'button', class: 'btn btn--primary btn--sm btn--marker', text: 'Übernehmen', disabled: true }) as HTMLButtonElement;
    const datei = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: !!opt.mehrere, class: 'visually-hidden' }) as HTMLInputElement;
    const nehmen = (l: Medium[]) => {
      ergebnis = l;
      dlg.close();
    };
    const hoch = async (files: File[]) => {
      const bilder = files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
      if (!bilder.length) return;
      status.textContent = bilder.length === 1 ? 'Foto wird hochgeladen …' : `${bilder.length} Fotos werden hochgeladen …`;
      try {
        const neu = await Promise.all(bilder.map((f) => medienHochladen(sb, f, opt.slug?.() || 'mediathek')));
        nehmen(neu.map((d) => leer(d)));
      } catch (e) {
        status.textContent = (e as Error).message?.startsWith('Bitte') ? (e as Error).message : 'Hochladen hat nicht geklappt. Bitte erneut versuchen.';
      }
    };
    datei.addEventListener('change', () => void hoch([...(datei.files ?? [])]));
    ok.addEventListener('click', () => nehmen([...gewaehlt]));
    dlg.append(
      h('div', { class: 'md-wahl__kopf' },
        h('div', {}, h('span', { class: 'tag', text: 'Mediathek' }), h('h2', { id: 'md-wahl-h', text: opt.mehrere ? 'Bilder wählen' : 'Bild wählen' })),
        h('div', { class: 'md-wahl__aktionen' },
          h('span', { class: 'i-hint', text: 'Oder Datei ins Fenster ziehen' }),
          h('label', { class: 'md-knopf' }, 'Hochladen', datei),
          h('button', { type: 'button', class: 'md-leise', text: 'Schließen', onclick: () => dlg.close() }))),
      status,
      raster,
      opt.mehrere ? h('div', { class: 'md-wahl__fuss' }, ok) : '',
    );
    dlg.addEventListener('dragover', (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dlg.classList.add('is-drop');
    });
    dlg.addEventListener('dragleave', (e) => {
      if (!dlg.contains(e.relatedTarget as Node)) dlg.classList.remove('is-drop');
    });
    dlg.addEventListener('drop', (e) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      dlg.classList.remove('is-drop');
      void hoch([...e.dataTransfer.files]);
    });
    dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());
    dlg.addEventListener('close', () => {
      dlg.remove();
      fertig(ergebnis);
    });
    document.body.append(dlg);
    dlg.showModal();

    void medienLaden(sb).then(({ liste }) => {
      raster.replaceChildren(...(liste.length
        ? liste.map((m) => {
            const name = m.datei.split('/').pop()!;
            const bild = h('div', { class: 'md-kachel__bild' },
              h('img', { src: newsPhotoUrl(m.datei)!, alt: '', loading: 'lazy', style: m.focus ? `object-position:${m.focus}` : undefined }),
              m.alt ? null : h('span', { class: 'md-kachel__warn', text: 'Ohne Beschreibung' }));
            const label = m.alt || `Foto ${name}`;
            if (!opt.mehrere) return h('button', { type: 'button', class: 'md-kachel', 'aria-label': `${label} wählen`, onclick: () => nehmen([m]) }, bild, h('span', { class: 'md-kachel__name', text: name }));
            const cb = h('input', { type: 'checkbox', 'aria-label': label }) as HTMLInputElement;
            cb.addEventListener('change', () => {
              if (cb.checked) gewaehlt.add(m);
              else gewaehlt.delete(m);
              ok.disabled = !gewaehlt.size;
              ok.textContent = gewaehlt.size ? `${gewaehlt.size} übernehmen` : 'Übernehmen';
            });
            return h('label', { class: 'md-kachel' }, cb, bild, h('span', { class: 'md-kachel__name', text: name }));
          })
        : [h('p', { class: 'i-hint', text: 'Noch keine Fotos. Lade das erste hoch.' })]));
    }, () => raster.replaceChildren(h('p', { class: 'i-hint', text: 'Die Mediathek ließ sich nicht laden.' })));
  });
}
