/**
 * Mein Profil: Galerie (Fotos hochladen, beschriften, sortieren, entfernen) und Liste der Arbeiten.
 * Neue Galeriefotos speichert die Liste sofort, damit keine Datei ohne Eintrag im Bucket liegt.
 * Ob ein Foto freigegeben ist (frei), entscheidet die Datenbank (Trigger profiles_galerie).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { photoUrl, type GalerieEintrag } from '../../lib/supabase';
import { GALERIE_MAX, ARBEITEN_MAX } from '../../lib/profil-felder';
import { h } from './news/dom';
import { t } from './sprache';

const BUCKET = 'profilbilder';
type Melden = (text: string, art?: 'ok') => void;

export function galerieEditor(o: { sb: SupabaseClient; userId: string; box: HTMLElement; start: GalerieEintrag[]; verified: () => boolean; melden: Melden }) {
  let liste = o.start.map((g) => ({ ...g }));
  const raster = h('ol', { class: 'pg__liste' });
  const datei = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, class: 'visually-hidden', id: 'p-galerie-datei' }) as HTMLInputElement;
  const knopf = h('label', { class: 'btn btn--secondary btn--sm', for: 'p-galerie-datei' }, t('Fotos hinzufügen', 'Add photos'));
  const zahl = h('span', { class: 'i-hint' });
  o.box.append(raster, h('div', { class: 'pg__neu' }, datei, knopf, zahl));

  const speichern = async (neu: GalerieEintrag[]) => {
    const { data, error } = await o.sb.from('profiles').update({ gallery: neu }).eq('id', o.userId).select('gallery').single();
    if (error) {
      o.melden(error.message);
      return false;
    }
    liste = (data.gallery ?? []) as GalerieEintrag[];
    zeigen();
    return true;
  };

  function zeigen() {
    zahl.textContent = t(
      `${liste.length} von ${GALERIE_MAX} Fotos. JPG, PNG oder WebP, höchstens 5 MB. Neue Fotos erscheinen nach der Freigabe.`,
      `${liste.length} of ${GALERIE_MAX} photos. JPG, PNG or WebP, up to 5 MB. New photos appear after approval.`,
    );
    knopf.toggleAttribute('hidden', liste.length >= GALERIE_MAX);
    raster.replaceChildren(
      ...liste.map((g, i) => {
        const n = i + 1;
        const bild = h('img', { src: photoUrl(g.path) ?? '', alt: g.caption ? t(`Vorschau: ${g.caption}`, `Preview: ${g.caption}`) : t(`Galeriefoto ${n} (Vorschau)`, `Gallery photo ${n} (preview)`), loading: 'lazy' });
        const status = h('span', { class: g.frei ? 'pg__status pg__status--ok' : 'pg__status' },
          g.frei ? (o.verified() ? t('Auf der Website', 'On the website') : t('Freigegeben', 'Approved')) : t('Wartet auf Freigabe', 'Waiting for approval'));
        const cap = h('input', { value: g.caption ?? '', maxlength: '140', 'aria-label': t(`Bildunterschrift Foto ${n}`, `Caption photo ${n}`), placeholder: t('Bildunterschrift (beschreibt das Foto)', 'Caption (describes the photo)') }) as HTMLInputElement;
        const capEn = h('input', { value: g.caption_en ?? '', maxlength: '140', lang: 'en', 'aria-label': t(`Bildunterschrift Foto ${n} (Englisch)`, `Caption photo ${n} (English)`), placeholder: t('Englisch (optional)', 'English (optional)') }) as HTMLInputElement;
        const credit = h('input', { value: g.credit ?? '', maxlength: '80', 'aria-label': t(`Foto ${n} von`, `Photo ${n} by`), placeholder: t('Foto von', 'Photo by') }) as HTMLInputElement;
        cap.addEventListener('input', () => (g.caption = cap.value.trim()));
        capEn.addEventListener('input', () => (g.caption_en = capEn.value.trim()));
        credit.addEventListener('input', () => (g.credit = credit.value.trim()));
        const mini = (text: string, label: string, aus: boolean, fn: () => void, schieben = false) => {
          const b = h('button', { type: 'button', class: 'pg__mini', 'aria-label': label, title: label, ...(schieben ? { 'data-schieben': '' } : {}) }, text) as HTMLButtonElement;
          b.disabled = aus;
          b.addEventListener('click', fn);
          return b;
        };
        const tauschen = async (j: number) => {
          const neu = [...liste];
          [neu[i], neu[j]] = [neu[j], neu[i]];
          if (await speichern(neu)) raster.children[j]?.querySelector<HTMLButtonElement>('[data-schieben]:not(:disabled)')?.focus();
        };
        return h('li', { class: 'pg__el' },
          h('div', { class: 'pg__bild' }, bild, status),
          h('div', { class: 'pg__felder' }, cap, capEn, credit),
          h('div', { class: 'pg__knoepfe' },
            mini('↑', t(`Foto ${n} nach vorn`, `Move photo ${n} forward`), i === 0, () => tauschen(i - 1), true),
            mini('↓', t(`Foto ${n} nach hinten`, `Move photo ${n} back`), i === liste.length - 1, () => tauschen(i + 1), true),
            mini('✕', t(`Foto ${n} entfernen`, `Remove photo ${n}`), false, async () => {
              if (!confirm(t('Dieses Foto aus der Galerie entfernen?', 'Remove this photo from the gallery?'))) return;
              if (await speichern(liste.filter((_, k) => k !== i))) {
                await o.sb.storage.from(BUCKET).remove([g.path]);
                o.melden(t('Foto entfernt.', 'Photo removed.'), 'ok');
              }
            })),
        );
      }),
    );
  }

  datei.addEventListener('change', async () => {
    const files = [...(datei.files ?? [])].slice(0, GALERIE_MAX - liste.length);
    datei.value = '';
    if (!files.length) return;
    const zuGross = files.filter((f) => f.size > 5 * 1024 * 1024);
    const neu: GalerieEintrag[] = [];
    for (const [k, file] of files.filter((f) => f.size <= 5 * 1024 * 1024).entries()) {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${o.userId}/galerie-${Date.now()}-${k}.${ext}`;
      const { error } = await o.sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        o.melden(error.message);
        continue;
      }
      neu.push({ path, caption: '', credit: '' });
    }
    if (neu.length && (await speichern([...liste, ...neu]))) {
      o.melden(
        t(
          `${neu.length === 1 ? 'Foto' : `${neu.length} Fotos`} hochgeladen. Auf der Website erscheinen sie, sobald Presse oder Vorstand sie freigegeben haben.` +
            (zuGross.length ? ` ${zuGross.length} größer als 5 MB, nicht hochgeladen.` : ''),
          `${neu.length === 1 ? 'Photo' : `${neu.length} photos`} uploaded. They appear on the website as soon as the press team or the board has approved them.` +
            (zuGross.length ? ` ${zuGross.length} larger than 5 MB, not uploaded.` : ''),
        ),
        'ok',
      );
      raster.lastElementChild?.querySelector('input')?.focus();
    } else if (zuGross.length) {
      o.melden(t('Die Fotos sind größer als 5 MB.', 'The photos are larger than 5 MB.'));
    }
  });

  zeigen();
  return {
    /** aktuelle Liste mit Bildunterschriften für das Speichern */
    wert: () => liste.map((g) => ({ ...g })),
    setzen: (neu: GalerieEintrag[]) => {
      liste = neu.map((g) => ({ ...g }));
      zeigen();
    },
  };
}

export interface Arbeit {
  year: string;
  title: string;
  place?: string;
}

export function arbeitenEditor(box: HTMLElement, start: Arbeit[]) {
  const liste = h('ol', { class: 'pa__liste' });
  const neu = h('button', { type: 'button', class: 'i-linkbtn' }, t('+ Arbeit hinzufügen', '+ Add work')) as HTMLButtonElement;
  box.append(liste, neu);

  const zeile = (a: Partial<Arbeit> = {}) => {
    const n = liste.children.length + 1;
    const arbeit = t(`Arbeit ${n}`, `Work ${n}`);
    const jahr = h('input', { value: a.year ?? '', maxlength: '9', inputmode: 'numeric', placeholder: '2026', 'aria-label': `${arbeit}: ${t('Jahr', 'Year')}`, pattern: '\\d{4}(–\\d{4})?', 'data-k': 'year' });
    const titel = h('input', { value: a.title ?? '', maxlength: '120', placeholder: t('Titel', 'Title'), 'aria-label': `${arbeit}: ${t('Titel', 'Title')}`, 'data-k': 'title' });
    const ort = h('input', { value: a.place ?? '', maxlength: '120', placeholder: t('Wo, z. B. Welttanztag · Societaetstheater', 'Where, e.g. World Dance Day · Societaetstheater'), 'aria-label': `${arbeit}: ${t('Wo', 'Where')}`, 'data-k': 'place' });
    const weg = h('button', { type: 'button', class: 'pg__mini', 'aria-label': t(`Arbeit ${n} entfernen`, `Remove work ${n}`), title: t('Entfernen', 'Remove') }, '✕') as HTMLButtonElement;
    const li = h('li', { class: 'pa__z' }, jahr, titel, ort, weg);
    weg.addEventListener('click', () => {
      li.remove();
      knopf();
      neu.focus();
    });
    return li;
  };
  const knopf = () => (neu.hidden = liste.children.length >= ARBEITEN_MAX);
  neu.addEventListener('click', () => {
    liste.append(zeile());
    knopf();
    liste.lastElementChild?.querySelector('input')?.focus();
  });
  liste.append(...start.map((a) => zeile(a)));
  knopf();

  return {
    wert: (): Arbeit[] =>
      [...liste.children].flatMap((li) => {
        const v = (k: string) => li.querySelector<HTMLInputElement>(`[data-k="${k}"]`)!.value.trim();
        return v('title') ? [{ year: v('year'), title: v('title'), ...(v('place') ? { place: v('place') } : {}) }] : [];
      }),
  };
}
