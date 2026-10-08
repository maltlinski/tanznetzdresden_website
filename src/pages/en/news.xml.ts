import type { APIRoute } from 'astro';
import { newsFeed } from '../../lib/news-feed';

export const GET: APIRoute = ({ site }) => newsFeed('en', site);
