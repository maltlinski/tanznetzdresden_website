/**
 * Regel „Datumsschrift“ (docs/entwicklung.md): Datums-, Uhrzeit- und Terminangaben stehen überall in der Schrift
 * des Kalenders – JetBrains Mono (`--font-datum`, Klasse `.datum` oder `<time>`), gern dünner als im Kalender.
 * Ausnahmen: große Tageszahlen, Monats- und Jahresköpfe in Work Sans fett (wie im Kalender selbst), Titel und
 * Fließtext (ein Datum mitten im Satz behält die Schrift des Satzes).
 *
 * Die Muster hier nutzt der Test `tests/datum-schrift.spec.ts` für alle Seiten und `istDatum()` für frei
 * eingegebene Werte (z. B. Eckdaten der Formate). Neue Gestaltung mit Datum → Klasse `.datum` setzen; wer
 * bewusst abweicht, trägt die Stelle unten bei den Ausnahmen ein und begründet sie.
 */
const MONATE = 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|October|December';
const MON_KURZ = 'Jan|Feb|Mär|Mrz|Apr|Jun|Jul|Aug|Sep|Sept|Okt|Oct|Nov|Dez|Dec';
const WOCHENTAGE = 'Mo|Di|Mi|Do|Fr|Sa|So|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';

/** enthält ein Datum oder eine Uhrzeit */
export const DATUM_MUSTER = new RegExp(
  [
    `\\b\\d{1,2}\\.\\s?(${MONATE}|${MON_KURZ})\\b`, // 29. April, 2. Nov
    `\\b\\d{1,2}\\s(${MONATE}|${MON_KURZ})\\b`, // 29 April
    `\\b(${MONATE}|${MON_KURZ})\\.?\\s\\d{1,2}(?!\\d)`, // April 29
    `\\b\\d{1,2}\\.\\d{1,2}\\.(\\d{2,4})?`, // 29.04.2025
    `\\b([01]?\\d|2[0-3]):[0-5]\\d\\b`, // 20:00
    `\\b(${MONATE})\\s\\d{4}\\b`, // November 2026
    `^\\s*(${WOCHENTAGE})\\.?\\s*$`, // Wochentag allein
  ].join('|'),
);

/** nur Zahl, Monat oder Jahr – darf als großer Kopf in Work Sans stehen (wie die Tageszahl im Kalender) */
export const ZAHL_ODER_KOPF = new RegExp(
  `^\\s*(\\d{1,2}\\.?|\\d{4}|\\d{1,2}\\.?\\s(${MONATE})|(${MONATE})\\s\\d{1,2}|(${MONATE}|${MON_KURZ})\\.?(\\s?/\\s?(${MONATE}|${MON_KURZ})\\.?)?(\\s\\d{4})?)\\s*$`,
);

/** Datum oder Uhrzeit im Text – dann `.datum` setzen */
export const istDatum = (text: string) => DATUM_MUSTER.test(text);

/** Ausnahmen der Regel (CSS-Selektoren, Vorfahren zählen mit) */
export const DATUM_AUSNAHMEN = {
  /** Titel: ein Datum im Namen eines Beitrags, Termins oder einer Ausgabe gehört zum Titel */
  titel: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '.zeile__titel', '.tka-ausgabe__label', '[data-lb-label]', '.ku-hinweis__titel'],
  /** Fließtext: ein Datum im Satz behält die Schrift des Satzes */
  fliesstext: [
    '.prose', '.ab__text', '.ab__stand', '.nb__cap', '.post__teaser', '.more__teaser', '.fo-kap__d', '.fo-info__text', '.fo-projekt__text',
    '.tka-lead', '.ags__list p', '.ms-lead', '.tk-text', '.tb__text', '.pr-text', '[data-fliesstext]',
  ],
};
