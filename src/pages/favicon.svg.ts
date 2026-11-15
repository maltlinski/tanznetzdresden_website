/** Favicon in den Farben des Designsystems (ändert sich mit design/system mit). */
import type { APIRoute } from 'astro';
import { iconSvg } from '../lib/icon';

export const GET: APIRoute = () => new Response(iconSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
