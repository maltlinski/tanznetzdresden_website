/**
 * Kleiner, eigener Consent-Manager – ohne Drittanbieter.
 * Speichert die Auswahl lokal (localStorage) und informiert andere Skripte per Event.
 *
 *   import { hasConsent, onConsent } from './consent';
 *   onConsent((c) => { if (c.medien) ladeKarte(); });
 *
 * Skripte, die erst nach Zustimmung laufen dürfen, so einbinden:
 *   <script type="text/plain" data-consent="statistik" data-src="https://…"></script>
 */
const KEY = 'tndd-consent';
const EVENT = 'tndd:consent';

export interface ConsentState {
  v: number;
  date: string;
  categories: Record<string, boolean>;
}

export function readConsent(version: number): ConsentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    return parsed.v === version ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(version: number, categories: Record<string, boolean>): ConsentState {
  const state: ConsentState = { v: version, date: new Date().toISOString(), categories: { ...categories, notwendig: true } };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* privater Modus: Auswahl gilt nur für diesen Seitenaufruf */
  }
  window.dispatchEvent(new CustomEvent<ConsentState>(EVENT, { detail: state }));
  activateScripts(state);
  return state;
}

export function hasConsent(category: string): boolean {
  const v = Number(document.documentElement.dataset.consentVersion ?? 1);
  return !!readConsent(v)?.categories[category];
}

export function onConsent(cb: (categories: Record<string, boolean>) => void): void {
  window.addEventListener(EVENT, (e) => cb((e as CustomEvent<ConsentState>).detail.categories));
}

/** Freigegebene, zurückgehaltene Skripte nachladen. */
export function activateScripts(state: ConsentState | null): void {
  if (!state) return;
  document.querySelectorAll<HTMLScriptElement>('script[type="text/plain"][data-consent]').forEach((el) => {
    if (!state.categories[el.dataset.consent ?? '']) return;
    const s = document.createElement('script');
    if (el.dataset.src) s.src = el.dataset.src;
    else s.textContent = el.textContent;
    el.replaceWith(s);
  });
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event('tndd:consent-open'));
}
