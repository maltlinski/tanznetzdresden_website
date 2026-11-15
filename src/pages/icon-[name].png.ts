/** Symbole für Startbildschirm und Lesezeichen (Web-Manifest, apple-touch-icon), aus dem Zeichen des Favicons. */
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { ICONS, iconSvg } from '../lib/icon';

export const getStaticPaths: GetStaticPaths = () => Object.keys(ICONS).map((name) => ({ params: { name } }));

export const GET: APIRoute = async ({ params }) => {
  const { groesse, rand } = ICONS[params.name as keyof typeof ICONS];
  const png = await sharp(Buffer.from(iconSvg(rand)), { density: 72 * (groesse / 64) }).resize(groesse, groesse).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
