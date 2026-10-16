/**
 * Link einfügen im News-Editor: Seiten, Personen aus dem Netzwerk, Termine und News suchen und wählen –
 * oder eine eigene Adresse eintragen. Die Ziele stehen beim Build in der Seite ([data-linkziele]).
 */
import { h } from './dom';

export interface Linkziel {
  /** Seite · Person · Termin · News */
  art: string;
  titel: string;
  /** Adresse ohne Basis-Pfad, z. B. /netzwerk/rika-yotsumoto/ */
  href: string;
}

export function linkAuswahl(ziele: Linkziel[]) {
  return (markiert: string) =>
    new Promise<{ href: string; text: string } | null>((fertig) => {
      const sucheId = 'lw-suche';
      const textId = 'lw-text';
      const urlId = 'lw-url';
      const dlg = h('dialog', { class: 'lw', 'aria-labelledby': 'lw-h' }) as HTMLDialogElement;
      const liste = h('ul', { class: 'lw__liste', role: 'listbox', 'aria-label': 'Treffer' });
      const suche = h('input', { id: sucheId, type: 'search', placeholder: 'Name, Termin, Seite …', autocomplete: 'off' }) as HTMLInputElement;
      const text = h('input', { id: textId, value: markiert, placeholder: 'Wird verlinkt' }) as HTMLInputElement;
      const url = h('input', { id: urlId, type: 'url', placeholder: 'https://…' }) as HTMLInputElement;
      let ergebnis: { href: string; text: string } | null = null;
      const nehmen = (href: string, titel: string) => {
        ergebnis = { href, text: text.value.trim() || titel };
        dlg.close();
      };
      const zeigen = () => {
        const q = suche.value.trim().toLowerCase();
        const treffer = (q ? ziele.filter((z) => `${z.titel} ${z.art}`.toLowerCase().includes(q)) : ziele.filter((z) => z.art === 'Seite')).slice(0, 40);
        liste.replaceChildren(...(treffer.length
          ? treffer.map((z) => h('li', {},
              h('button', { type: 'button', class: 'lw__ziel', onclick: () => nehmen(z.href, z.titel) },
                h('span', { class: 'lw__art', text: z.art }), h('span', { text: z.titel }))))
          : [h('li', { class: 'i-hint', text: 'Nichts gefunden. Unten eine eigene Adresse eintragen.' })]));
      };
      suche.addEventListener('input', zeigen);
      dlg.append(
        h('div', { class: 'lw__kopf' },
          h('strong', { id: 'lw-h', text: 'Link einfügen' }),
          h('button', { type: 'button', class: 'i-linkbtn', text: 'Abbrechen', onclick: () => dlg.close() })),
        h('div', { class: 'i-field' }, h('label', { for: textId, text: 'Text des Links' }), text),
        h('div', { class: 'i-field' }, h('label', { for: sucheId, text: 'Auf der Website suchen: Personen, Termine, News, Seiten' }), suche),
        liste,
        h('form', {
          class: 'lw__eigen',
          onsubmit: (e: Event) => {
            e.preventDefault();
            const v = url.value.trim();
            if (!/^(https?:\/\/|mailto:)/i.test(v)) {
              url.setCustomValidity('Bitte eine vollständige Adresse mit https:// eintragen.');
              url.reportValidity();
              return;
            }
            nehmen(v, v.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
          },
        },
          h('div', { class: 'i-field' }, h('label', { for: urlId, text: 'Oder eine andere Website' }), url),
          h('button', { type: 'submit', class: 'btn btn--secondary btn--sm', text: 'Verlinken' })),
      );
      url.addEventListener('input', () => url.setCustomValidity(''));
      dlg.addEventListener('close', () => {
        dlg.remove();
        fertig(ergebnis);
      });
      document.body.append(dlg);
      zeigen();
      dlg.showModal();
      (markiert ? suche : text).focus();
    });
}
