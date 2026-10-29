/**
 * Regeln für den Import: Adresse, Rubrik, Frist, Teaser, „Auf einen Blick“, deutsch-englische Paare.
 * Jede Entscheidung bekommt einen Grund, der im Bericht steht (docs/wordpress-import.md).
 */

/** Adresse (Dateiname) aus dem WordPress-Slug: nur a–z, 0–9 und Bindestrich, höchstens 90 Zeichen */
export function adresse(slug, titel) {
  let s = (slug || titel || 'beitrag')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > 90) s = s.slice(0, 91).replace(/-[^-]*$/, '');
  return s || 'beitrag';
}

const RUBRIKEN = [
  ['Ausschreibung', /\b(ausschreibung|open[ -]?call|call for|aufruf|bewerb|bewirb|apply|deadline|einreich|anmeldeschluss)/i],
  ['Training', /\b(keep[ -]?up|profi-?training|professional training|training|workshop|special week|masterclass|klasse|labor\b)/i],
  ['Verein', /\b(vorstand|mitgliederversammlung|verein|jubiläum|15 jahre|team vom|koordinat|satzung|neue[rn]? mitglied|wir suchen|stellenausschreibung)/i],
  ['Rückblick', /\b(rückblick|rückschau|nachlese|review|recap|dokumentation|ein film|im film|fotos vom|danke\b|war ein|so war)/i],
  ['Stimme', /\b(interview|im gespräch|nachgefragt|stimmen? aus|porträt|portrait|vorgestellt)\b|^»[^«]+«$/i],
];

/** Rubrik aus dem Titel, Training auch aus Schlagworten; Standard „Netzwerk“ (Ausschreibung nur am Titel: Schlagworte sind zu breit) */
export function rubrik(titel, schlagworte) {
  for (const [r, re] of RUBRIKEN) if (re.test(titel)) return { rubrik: r, grund: `Titel: „${titel.match(re)[0]}“` };
  const tags = schlagworte.join(' ');
  if (/\b(keep-up|profi-training|profitraining|workshop)\b/.test(tags)) return { rubrik: 'Training', grund: 'Schlagwort Training/Workshop' };
  return { rubrik: 'Netzwerk', grund: 'Standard' };
}

const MONATE = { jan: 1, januar: 1, january: 1, feb: 2, februar: 2, february: 2, mär: 3, märz: 3, maerz: 3, mar: 3, march: 3, apr: 4, april: 4, mai: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, dez: 12, dezember: 12, dec: 12, december: 12 };
const M = Object.keys(MONATE).sort((a, b) => b.length - a.length).join('|');
const iso = (j, m, t) => `${j}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
function jahrDazu(m, t, j, nach) {
  if (j) return Number(String(j).length === 2 ? `20${j}` : j);
  const y = Number(nach.slice(0, 4));
  return iso(y, m, t) >= nach.slice(0, 10) ? y : y + 1;
}

/** Datum aus einem Text („bis 19. Februar 2023“, „Deadline: 20.11.“, „until December 22, 2025“) */
export function datumIn(text, nach) {
  const muster = [
    [new RegExp(`(\\d{1,2})\\.\\s*(${M})\\.?(?:\\s+(\\d{4}))?`, 'i'), (x) => [x[3], MONATE[x[2].toLowerCase()], x[1]]],
    [new RegExp(`(${M})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?(?:\\s+(\\d{4}))?`, 'i'), (x) => [x[3], MONATE[x[1].toLowerCase()], x[2]]],
    [/(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/, (x) => [x[3], Number(x[2]), x[1]]],
  ];
  for (const [re, f] of muster) {
    const x = re.exec(text);
    if (!x) continue;
    const [j, m, t] = f(x);
    if (!m || m > 12 || Number(t) > 31 || Number(t) < 1) continue;
    return iso(jahrDazu(m, Number(t), j, nach), m, Number(t));
  }
  return null;
}

const FRIST_WORT = /(deadline|frist|bewerbungsschluss|einsendeschluss|anmeldeschluss|bewerb\w*\s+bis|bis\s+(?:zum\s+)?|until|apply by|noch bis)/i;

/** Frist einer Ausschreibung: aus „Auf einen Blick“ (Frist) oder dem Titel */
export function frist(titel, fakten, datum) {
  const f = fakten.find((x) => x.label === 'Frist');
  if (f) {
    const d = datumIn(f.value, datum);
    if (d) return { frist: d, grund: `Angabe „${f.value}“` };
  }
  const i = titel.search(FRIST_WORT);
  if (i >= 0) {
    const d = datumIn(titel.slice(i), datum);
    if (d) return { frist: d, grund: `Titel „${titel.slice(i, i + 40)}“` };
  }
  return { frist: null, grund: '' };
}

const LABELS = [
  ['Wann', /^(datum|termin|termine|wann|date|dates|zeit|uhrzeit|time|timetable|zeitraum|period)$/i],
  ['Wo', /^(ort|orte|wo|location|venue|place|adresse|address)$/i],
  ['Eintritt', /^(eintritt|tickets?|entry|admission|preis|kosten|price|fee|teilnahmegebühr)$/i],
  ['Frist', /^(deadline|frist|bewerbungsschluss|einsendeschluss|anmeldeschluss|bewerbungsfrist|application deadline)$/i],
  ['Mit', /^(mit|with|leitung|choreografie|choreography|künstler:innen|artists|dozent:in|dozentin|dozent|teacher)$/i],
  ['Anmeldung', /^(anmeldung|registration|kontakt|contact)$/i],
];

/**
 * „Auf einen Blick“ aus beschrifteten Zeilen („**Datum:** 22. August“). Zeilen, die dazu gehören, werden aus dem
 * Text genommen, aber nur, wenn sie einen zusammenhängenden Block bilden (sonst bleibt der Text, wie er ist).
 */
export function faktenAus(md) {
  const zeile = /^(?:- )?\*\*([^*:\n]{2,30}?)\s*:?\s*\*\*\s*:?\s*(.+?)\s*$/;
  const absaetze = md.split(/\n\n/);
  for (let i = 0; i < absaetze.length; i++) {
    const zeilen = absaetze[i].split(/ {2}\n|\n/).map((z) => z.trim()).filter(Boolean);
    const treffer = zeilen.map((z) => {
      const m = zeile.exec(z);
      const label = m && LABELS.find(([, re]) => re.test(m[1].trim()))?.[0];
      return label ? { label, value: m[2].replace(/\s+/g, ' ').trim() } : null;
    });
    const n = treffer.filter(Boolean).length;
    if (n >= 2 && n === zeilen.length && treffer.every((t) => t.value.length <= 160 && !/\]\(/.test(t.value))) {
      const fakten = [];
      for (const t of treffer) {
        const gleich = fakten.find((f) => f.label === t.label);
        if (gleich) gleich.value += ` · ${t.value}`;
        else fakten.push(t);
      }
      absaetze.splice(i, 1);
      return { fakten: fakten.slice(0, 5), md: absaetze.join('\n\n') };
    }
  }
  return { fakten: [], md };
}

const reinText = (md) =>
  md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/ {2}\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Teaser: Auszug, sonst der erste Textabsatz (höchstens 220 Zeichen, an einem Satzende gekürzt).
 * Ist der ganze erste Absatz der Teaser, fällt er aus dem Text (die Seite zeigt den Teaser oben).
 */
export function teaser(auszug, md) {
  if (reinText(auszug)) return { teaser: kuerzen(reinText(auszug)), md };
  const absaetze = md.split(/\n\n/);
  const i = absaetze.findIndex((a) => !/^(:::|#|>|- |\d+\. |\||\[.*\]\(.*\)$)/.test(a.trim()) && reinText(a).length >= 40);
  if (i < 0) return { teaser: '', md };
  const voll = reinText(absaetze[i]);
  const t = kuerzen(voll);
  if (t === voll && i <= 1) absaetze.splice(i, 1);
  return { teaser: t, md: absaetze.join('\n\n') };
}
function kuerzen(s) {
  if (s.length <= 220) return s;
  const satz = s.slice(0, 221).match(/^.*[.!?»«“”"](?=\s)/)?.[0];
  if (satz && satz.length >= 90) return satz.trim();
  return s.slice(0, 200).replace(/\s+\S*$/, '') + ' …';
}

/** Titel aufräumen: „eng:“/„deu:“ vorne weg, Leerraum vereinheitlichen */
export const titelSauber = (t) => t.replace(/^(eng|deu|de|en)\s*:\s*/i, '').replace(/\s+/g, ' ').trim();

const woerter = (t) => new Set(t.toLowerCase().match(/[a-zäöüß0-9]{3,}/g) ?? []);
/**
 * Englische Beiträge (Schlagwort „english“) ihrem deutschen Gegenstück zuordnen:
 * höchstens 4 Tage auseinander, gleiches Titelbild oder genug gemeinsame Wörter im Titel (Namen, Daten).
 */
export function paareFinden(beitraege) {
  const paare = new Map();
  const vergeben = new Set();
  const en = beitraege.filter((b) => b.englisch);
  for (const e of en) {
    let best = null;
    for (const d of beitraege) {
      if (d === e || d.englisch || vergeben.has(d.id)) continue;
      const tage = Math.abs(new Date(d.datum) - new Date(e.datum)) / 864e5;
      if (tage > 4) continue;
      const we = woerter(e.titel), wd = woerter(d.titel);
      const gemeinsam = [...we].filter((w) => wd.has(w)).length / Math.max(1, Math.min(we.size, wd.size));
      const score = (d.titelbild && d.titelbild === e.titelbild ? 1 : 0) + gemeinsam;
      if (score >= 0.45 && (!best || score > best.score)) best = { d, score };
    }
    if (best) {
      paare.set(e.id, best.d.id);
      vergeben.add(best.d.id);
    }
  }
  return paare;
}
