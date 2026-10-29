/**
 * E-Mail-Adressen in News-Texten schützen (wie <ProtectedEmail>): mailto-Links und Adressen im Fließtext werden
 * beim Build zu verschlüsselten Knöpfen; erst ein Klick zeigt die Adresse (src/scripts/protected-email.ts).
 * Stile: src/styles/artikel.css (.protected-email).
 */
import { protectEmail } from './protect-email';
import type { Lang } from './i18n';

const T = {
  de: { label: 'E-Mail-Adresse anzeigen', hint: 'Klick zeigt die Adresse', busy: 'Adresse wird entschlüsselt …', done: 'E-Mail-Adresse:', fail: 'Das hat nicht geklappt. Bitte erneut versuchen.' },
  en: { label: 'Show email address', hint: 'click reveals the address', busy: 'Decrypting address …', done: 'Email address:', fail: 'That did not work. Please try again.' },
};
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const EINE = new RegExp(EMAIL.source, 'i');
const ANKER = /<a href="mailto:([^"?]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

async function knopf(email: string, text: string, lang: Lang) {
  const t = T[lang];
  const p = await protectEmail(email);
  // eigener Linktext bleibt, eine ausgeschriebene Adresse wird zum neutralen Text
  const label = !text || EINE.test(text) ? t.label : text;
  return (
    `<span class="protected-email" data-protected-email data-salt="${p.salt}" data-challenge="${p.challenge}" data-max="${p.max}" data-iv="${p.iv}" data-data="${p.data}" data-msg-busy="${esc(t.busy)}" data-msg-done="${esc(t.done)}" data-msg-fail="${esc(t.fail)}">` +
    `<button type="button" class="protected-email__btn"><span class="protected-email__icon" aria-hidden="true"></span>${label}<span class="visually-hidden"> (${esc(email.split('@')[0])} …, ${t.hint})</span></button>` +
    `<span class="visually-hidden" role="status"></span></span>`
  );
}

async function ersetzen(s: string, re: RegExp, f: (m: RegExpExecArray) => Promise<string>) {
  const teile: (string | Promise<string>)[] = [];
  let last = 0;
  for (const m of s.matchAll(re)) {
    teile.push(s.slice(last, m.index), f(m as RegExpExecArray));
    last = m.index! + m[0].length;
  }
  teile.push(s.slice(last));
  return (await Promise.all(teile)).join('');
}

export async function emailsSchuetzen(html: string, lang: Lang): Promise<string> {
  if (!html.includes('@')) return html;
  const ohneLinks = await ersetzen(html, ANKER, (m) => knopf(decodeURIComponent(m[1]), m[2].replace(/<[^>]+>/g, '').trim(), lang));
  // Adressen im Text (nicht in Tags oder Attributen)
  const teile = ohneLinks.split(/(<[^>]+>)/);
  for (let i = 0; i < teile.length; i += 2) {
    if (EINE.test(teile[i])) teile[i] = await ersetzen(teile[i], EMAIL, (m) => knopf(m[0], m[0], lang));
  }
  return teile.join('');
}
