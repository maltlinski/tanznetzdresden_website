import type { APIRoute } from 'astro';
import { manifest } from '../../lib/manifest';

export const GET: APIRoute = () => manifest('en');
