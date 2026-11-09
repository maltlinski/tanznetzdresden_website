/**
 * Vorschau unter „Mein Profil“: läuft in der Vorlage der Profilseite (/intern/profil/vorschau/, im Rahmen neben dem
 * Formular) und füllt sie mit dem Stand des Formulars, noch bevor gespeichert ist. Das Formular ruft
 * `window.vorschauDaten(entwurf)` bei jeder Änderung (über src/scripts/intern/redaktion/vorschau.ts).
 *
 * Die Vorlage (lib/profil-vorlage.ts) enthält jeden Baustein einmal. Hier werden Bausteine geklont (damit die Stile
 * der Seite greifen), gefüllt oder ausgeblendet – nach denselben Regeln wie beim Build (lib/profil-ansicht.ts).
 * Termine kommen beim Build aus dem Kalender und fehlen in der Vorschau.
 */
import { absaetze, linkText, mosaik, nameTeile, pad, pitchWoerter, STREIFEN, type ProfilEntwurf } from '../lib/profil-ansicht';
import { ANGABEN, OFFEN_FUER } from '../lib/profil-felder';
import { FOKUS_PORTRAET, fokusText, galerieFormat, GALERIE_FORMATE, streifenFormat } from '../lib/bild-zuschnitt';
import { fuellen, zeilen } from '../lib/texte-regeln';

interface Texte {
  kicker: string;
  member: string;
  trainer: string;
  ueber: string;
  kontakt: string;
  photos: string;
  entries: string;
  soon: string;
  focus: string;
  base: string;
  website: string;
  video: string;
  photo: string;
}

declare global {
  interface Window {
    vorschauDaten?: (d: ProfilEntwurf) => void;
  }
}

const zeige = (el: Element | null | undefined, an: boolean) => {
  if (el instanceof HTMLElement || el instanceof SVGElement) el.style.display = an ? '' : 'none';
};
const klon = <T extends Element>(el: T) => el.cloneNode(true) as T;
/** Foto aus der Vorlage (Bild mit srcset) auf eine Adresse umstellen */
const bild = (img: HTMLImageElement | null, src: string, pos?: string) => {
  if (!img) return;
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  img.removeAttribute('width');
  img.removeAttribute('height');
  img.loading = 'eager';
  if (img.getAttribute('src') !== src) img.src = src;
  img.style.objectPosition = pos ?? '';
};
const text = (el: Element | null | undefined, t: string) => {
  if (el && el.textContent !== t) el.textContent = t;
};

export function profilVorschau() {
  const r = document.querySelector<HTMLElement>('[data-profil]');
  const texteEl = document.querySelector('[data-pv-texte]');
  if (!r || !texteEl) return;
  const root: HTMLElement = r;
  const T = JSON.parse(texteEl.textContent ?? '{}') as Texte;
  const en = document.documentElement.lang.startsWith('en');
  const $ = <E extends Element = HTMLElement>(sel: string) => root.querySelector<E>(sel);

  // Bausteine der Vorlage merken, bevor etwas verändert wird
  const vorlage = {
    wort: klon($('[data-w]')!),
    tag: klon($('.ppitch__disc li')!),
    absatz: klon($('.pueber__bio p')!),
    fakt: klon($('.pfakten__z:not(.pfakten__z--link)')!),
    link: klon($('.pfakten__z--link')!),
    arbeit: klon($('.parb__z')!),
    offen: klon($('.pkontakt__offen li')!),
    weg: klon($('a.pweg')!),
    streifen: klon($('.pstrip__el')!),
  };
  const raster = $<HTMLTemplateElement>('template[data-pv-raster]');
  const pitchSec = $('#pitch');
  // Wörter des Pitch erscheinen sonst erst beim Scrollen (Liste in scripts/profil.ts kennt die neuen nicht)
  pitchSec?.classList.remove('ppitch--an');

  function anwenden(d: ProfilEntwurf) {
    const sp = <K extends 'profession' | 'pitch' | 'bio'>(k: K) => (en && d[`${k}_en`]?.trim()) || d[k]?.trim() || '';
    const name = d.name.trim() || (en ? 'Your Name' : 'Dein Name');
    const { vorname, nachname, fit } = nameTeile(name);
    const pitch = sp('pitch');
    const bio = absaetze(sp('bio'));
    const insta = d.instagram?.trim().replace(/^@/, '') || '';
    const hatKontakt = !!(d.email || insta || d.website);
    const hero = d.photo
      ? { src: d.photo, credit: d.photoCredit, pos: d.photoFocus ?? fokusText(FOKUS_PORTRAET) }
      : d.gallery[0] ? { src: d.gallery[0].src, credit: d.gallery[0].credit, pos: d.gallery[0].fokus ?? '' } : null;
    const galerie = d.photo ? d.gallery : d.gallery.slice(1);
    const arbeiten = d.works.filter((w) => w.title).sort((a, b) => String(b.year).localeCompare(String(a.year)));

    // ---------- Kopf ----------
    text($('.ph__top .tag'), `${T.kicker} · ${T.member}${d.trainer ? ` · ${T.trainer}` : ''}`);
    const box = $('[data-name]');
    box?.style.setProperty('--fit', fit);
    for (const ebene of root.querySelectorAll<HTMLElement>('[data-name-voll], [data-name-licht]')) {
      const licht = ebene.hasAttribute('data-name-licht');
      const vor = ebene.querySelector<HTMLElement>('.ph__vor');
      const nach = ebene.querySelector<HTMLElement>('.ph__nach');
      if (licht) {
        vor?.setAttribute('data-text', vorname);
        nach?.setAttribute('data-text', nachname);
      } else {
        text(vor, vorname);
        text(nach, nachname);
      }
      zeige(nach, !!nachname);
      zeige(ebene.querySelector('br'), !!nachname);
    }
    const meta = [d.pronouns?.trim(), sp('profession'), d.base?.trim()].filter(Boolean).join(' · ');
    const metaEl = $('.ph__meta');
    text(metaEl, meta);
    zeige(metaEl, !!meta);
    const heroBox = $('[data-ph-bild]');
    zeige(heroBox, !!hero);
    zeige($('[data-pv-initialen]'), !hero);
    text($('[data-pv-initialen]'), name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join(''));
    if (hero) {
      bild(heroBox?.querySelector('img') ?? null, hero.src, hero.pos);
      const credit = $('.ph__credit');
      text(credit, `${T.photo}: ${hero.credit ?? ''}`);
      zeige(credit, !!hero.credit);
    }
    zeige($('.ph__aktionen a.btn[href="#kontakt"]'), hatKontakt);
    const reel = $<HTMLAnchorElement>('.ph__reel');
    zeige(reel, !!d.vimeo);
    if (reel && d.vimeo) reel.href = d.vimeo;

    // ---------- Leiste ----------
    text($('.pbar__name'), name);
    zeige($('.pbar__anfrage'), hatKontakt);
    const sichtbar: Record<string, boolean> = {
      pitch: !!pitch, galerie: galerie.length > 0, ueber: true, arbeiten: arbeiten.length > 0, termine: false, kontakt: hatKontakt,
    };
    root.querySelectorAll<HTMLAnchorElement>('[data-pbar-link]').forEach((a) => zeige(a.closest('li'), sichtbar[a.dataset.pbarLink!] ?? true));

    // ---------- Pitch ----------
    zeige(pitchSec, !!pitch);
    if (pitch) {
      $('.ppitch__satz')?.replaceChildren(...pitchWoerter(pitch).map((w) => {
        const s = klon(vorlage.wort);
        s.textContent = `${w.text} `;
        s.classList.toggle('ppitch__w--hi', w.hi);
        s.classList.add('is-an');
        return s;
      }));
    }
    const disc = $('.ppitch__disc');
    zeige(disc, d.tags.length > 0);
    disc?.replaceChildren(...d.tags.map((t, i) => {
      const li = klon(vorlage.tag);
      li.textContent = t;
      li.classList.toggle('is-erst', i === 0);
      return li;
    }));

    // ---------- Galerie ----------
    const gal = $('#galerie');
    zeige(gal, galerie.length > 0);
    if (gal && galerie.length) {
      // gezählt wird mit dem Foto oben (Porträt oder erstes Galeriefoto)
      text(gal.querySelector('.pgal__n'), `${pad(galerie.length + 1)} ${T.photos}`);
      const versatz = 2; // Nummer 01 ist das Foto oben
      const cap = (g: ProfilEntwurf['gallery'][number]) => (en && g.caption_en) || g.caption || '';
      const strip = gal.querySelector<HTMLElement>('[data-strip]');
      gal.querySelector('.pgrid__wrap')?.remove();
      if (d.galleryLayout === 'filmstreifen') {
        zeige(strip, true);
        const track = strip?.querySelector('[data-track]');
        const ende = track?.querySelector('.pstrip__ende');
        track?.querySelectorAll('.pstrip__el').forEach((el) => el.remove());
        galerie.forEach((g, k) => {
          const s = STREIFEN[k % STREIFEN.length];
          const el = klon(vorlage.streifen);
          el.className = el.className.replace(/pstrip__el--\w+/, `pstrip__el--${s.align}`);
          el.style.setProperty('--h', String(s.h));
          // gewähltes Format (Mein Profil → Ausschnitt), sonst die Form des Platzes
          const f = g.ganz ? undefined : galerieFormat(g.format);
          el.style.setProperty('--r', String(f ? +GALERIE_FORMATE[f].r.toFixed(4) : s.r));
          const b = el.querySelector<HTMLElement>('.pstrip__bild');
          b?.classList.remove('pstrip__bild--keil-a', 'pstrip__bild--keil-b');
          if (s.keil && !g.ganz) b?.classList.add(`pstrip__bild--keil-${s.keil}`);
          const img = el.querySelector('img');
          bild(img, g.src, g.fokus);
          // ganz gezeigt: Rahmen im Format des Fotos (wie beim Build), sobald das Foto geladen ist
          if (g.ganz && img) {
            const passen = () => img.naturalWidth && el.style.setProperty('--r', String(streifenFormat(img.naturalWidth / img.naturalHeight)));
            if (img.complete) passen();
            else img.addEventListener('load', passen, { once: true });
          }
          const c = el.querySelector('.pstrip__cap');
          const nr = c?.querySelector('.pstrip__nr');
          text(nr, pad(k + versatz));
          c?.querySelectorAll(':scope > span:not(.pstrip__nr)').forEach((x) => x.remove());
          if (cap(g) && nr) {
            const t = klon(nr);
            t.className = '';
            t.textContent = cap(g);
            c!.append(t);
          }
          track?.insertBefore(el, ende ?? null);
        });
      } else if (raster) {
        zeige(strip, false);
        const wrap = (raster.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
        const grid = wrap.querySelector<HTMLElement>('.pgrid')!;
        grid.classList.remove('pgrid--mosaik');
        grid.classList.add(`pgrid--${d.galleryLayout}`);
        const muster = grid.querySelector<HTMLElement>('.pgrid__el')!;
        const spans = mosaik(galerie.length, d.galleryLayout);
        grid.replaceChildren(...galerie.map((g, k) => {
          const el = klon(muster);
          el.className = el.className.replace(/pgrid__el--\w+/, `pgrid__el--${spans[k]}`);
          el.classList.toggle('pgrid__el--voll', !!g.ganz);
          const f = d.galleryLayout === 'raster' && !g.ganz ? galerieFormat(g.format) : undefined;
          if (f) el.style.setProperty('--fr', String(+GALERIE_FORMATE[f].r.toFixed(4)));
          else el.style.removeProperty('--fr');
          bild(el.querySelector('img'), g.src, g.fokus);
          text(el.querySelector('.pgrid__nr'), pad(k + versatz));
          return el;
        }));
        gal.querySelector('.pgal__kopf')?.after(wrap);
      }
    }

    // ---------- Über ----------
    const ueberH = $('#ueber-h');
    const ueberText = ueberH && [...ueberH.childNodes].reverse().find((n) => n.nodeType === Node.TEXT_NODE);
    if (ueberText) ueberText.textContent = fuellen(T.ueber, { name: vorname });
    $('.pueber__bio')?.replaceChildren(...(bio.length ? bio : [T.soon]).map((a) => {
      const p = klon(vorlage.absatz);
      p.textContent = a;
      return p;
    }));
    const fakten: [string, string][] = [
      ...(!pitch && d.tags.length ? [[T.focus, d.tags.join(' · ')] as [string, string]] : []),
      ...ANGABEN.slice(0, 4).map((a) => [a[en ? 'en' : 'de'], d.angaben[a.key]?.trim() ?? ''] as [string, string]),
      [T.base, d.base?.trim() ?? ''] as [string, string],
      ...ANGABEN.slice(4).map((a) => [a[en ? 'en' : 'de'], d.angaben[a.key]?.trim() ?? ''] as [string, string]),
    ].filter(([, v]) => v);
    const links = [
      d.website && { k: T.website, v: linkText(d.website), href: d.website },
      insta && { k: 'Instagram', v: `@${insta}`, href: `https://www.instagram.com/${encodeURIComponent(insta)}/` },
      d.vimeo && { k: T.video, v: linkText(d.vimeo), href: d.vimeo },
    ].filter(Boolean) as { k: string; v: string; href: string }[];
    const dl = $('.pfakten');
    dl?.replaceChildren(
      ...fakten.map(([k, v]) => {
        const z = klon(vorlage.fakt);
        text(z.querySelector('dt'), k);
        text(z.querySelector('dd'), v);
        return z;
      }),
      ...links.map((l) => {
        const z = klon(vorlage.link);
        text(z.querySelector('dt'), l.k);
        const a = z.querySelector('a')!;
        a.href = l.href;
        a.firstChild!.textContent = l.v;
        return z;
      }),
    );
    zeige($('.pueber__seite'), fakten.length + links.length > 0);

    // ---------- Arbeiten ----------
    const arb = $('#arbeiten');
    zeige(arb, arbeiten.length > 0);
    text(arb?.querySelector('.parb__n'), `${pad(arbeiten.length)} ${T.entries}`);
    arb?.querySelector('.parb__liste')?.replaceChildren(...arbeiten.map((w) => {
      const z = klon(vorlage.arbeit);
      text(z.querySelector('.parb__jahr'), w.year);
      text(z.querySelector('.parb__titel'), w.title);
      const ort = z.querySelector('.parb__ort');
      text(ort, w.place ?? '');
      zeige(ort, !!w.place);
      return z;
    }));

    // ---------- Kontakt ----------
    const kon = $('#kontakt');
    zeige(kon, hatKontakt);
    if (kon) {
      const [z1, z2 = ''] = zeilen(fuellen(T.kontakt, { name: vorname }));
      const h = kon.querySelector('#kontakt-h');
      const br = h?.querySelector('br') ?? document.createElement('br');
      h?.replaceChildren(`${z1} `, br, z2);
      const offen = kon.querySelector('.pkontakt__offen');
      zeige(offen, d.openFor.length > 0);
      offen?.querySelector('ul')?.replaceChildren(...d.openFor.map((o) => {
        const li = klon(vorlage.offen);
        li.textContent = OFFEN_FUER[o][en ? 'en' : 'de'];
        return li;
      }));
      const mail = kon.querySelector('.pweg:has([data-protected-email])');
      zeige(mail, !!d.email);
      const hinweis = mail?.querySelector('.protected-email__btn .visually-hidden');
      if (hinweis && d.email) hinweis.textContent = hinweis.textContent!.replace(/\(([^ ]*) …/, `(${d.email.split('@')[0]} …`);
      const wege = kon.querySelector('.pkontakt__wege');
      wege?.querySelectorAll('a.pweg').forEach((a) => a.remove());
      const weg = (k: string, v: string, href: string) => {
        const a = klon(vorlage.weg) as HTMLAnchorElement;
        a.href = href;
        text(a.querySelector('.pweg__k'), k);
        text(a.querySelector('.pweg__v'), v);
        wege?.append(a);
      };
      if (insta) weg('Instagram', `@${insta}`, `https://ig.me/m/${encodeURIComponent(insta)}`);
      if (!d.email && !insta && d.website) weg(T.website, linkText(d.website), d.website);
    }

    // Filmstreifen und Name über dem Porträt neu messen (scripts/profil.ts hört auf resize)
    dispatchEvent(new Event('resize'));
  }

  window.vorschauDaten = anwenden;
}
