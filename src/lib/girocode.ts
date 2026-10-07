/**
 * GiroCode (EPC-QR, „SEPA-Überweisung per QR“): Banking-Apps lesen daraus
 * Empfänger, IBAN, Betrag und Verwendungszweck. Wird beim Build als SVG erzeugt –
 * keine Anfrage an Dritte.
 * Spezifikation: EPC069-12 (European Payments Council), Version 002.
 */
import QRCode from 'qrcode';

/** Prüft eine IBAN (Länge und Prüfziffer nach ISO 13616, mod 97). */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

/** IBAN in Vierergruppen: DE89 3704 0044 … */
export const formatIban = (iban: string) => iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();

interface GiroCodeInput {
  name: string;
  iban: string;
  bic?: string;
  /** Betrag in Euro; leer = Betrag wählt die Person in der Banking-App */
  amount?: number;
  text: string;
}

export async function giroCodeSvg({ name, iban, bic = '', amount, text }: GiroCodeInput): Promise<string> {
  const payload = [
    'BCD', '002', '1', 'SCT',
    bic.replace(/\s+/g, ''),
    name.slice(0, 70),
    iban.replace(/\s+/g, '').toUpperCase(),
    amount ? `EUR${amount.toFixed(2)}` : '',
    '', // Purpose code
    '', // strukturierte Referenz (nicht zusammen mit Text)
    text.slice(0, 140),
  ].join('\n');
  // Fehlerkorrektur M ist laut EPC-Vorgabe Pflicht
  return QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#000000', light: '#ffffff' } });
}
