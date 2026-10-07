/**
 * Bot-Schutz für E-Mail-Adressen (läuft nur beim Build).
 *
 * Die Adresse steht nie im Klartext im HTML. Sie wird mit AES-GCM verschlüsselt;
 * der Schlüssel ergibt sich aus einer Zahl n, die der Browser erst per
 * „Proof of Work“ finden muss (SHA-256-Rätsel, ca. 0,2–1 s). Für eine Person ist das
 * ein kurzer Klick, für massenhaft scannende Bots zu teuer. Ohne Drittanbieter,
 * ohne Cookies – also auch datenschutzrechtlich unproblematisch.
 */
import { randomBytes, randomInt, webcrypto } from 'node:crypto';

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const toB64 = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64');


/** Suchraum des Rätsels. Höher = mehr Rechenzeit im Browser. */
export const POW_MAX = 60_000;

export interface ProtectedPayload {
  salt: string;
  challenge: string;
  max: number;
  iv: string;
  data: string;
}

export async function protectEmail(email: string): Promise<ProtectedPayload> {
  const { subtle } = webcrypto;
  const salt = randomBytes(8).toString('hex');
  const n = randomInt(POW_MAX);
  const challenge = toHex(await subtle.digest('SHA-256', enc.encode(`${salt}:${n}`)));
  const keyBytes = await subtle.digest('SHA-256', enc.encode(`key:${salt}:${n}`));
  const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = new Uint8Array(randomBytes(12));
  const data = await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(email));
  return { salt, challenge, max: POW_MAX, iv: toB64(iv), data: toB64(data) };
}
