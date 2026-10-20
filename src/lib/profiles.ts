/**
 * Öffentliche Profile der Künstler:innen.
 *
 * Zwei Quellen, beim Build zusammengeführt:
 *  1. src/content/personen.yaml (Redaktion / CMS)
 *  2. Supabase-Ansicht public_profiles – Profile, die Mitglieder im internen Bereich
 *     selbst pflegen, öffentlich zeigen wollen und die der Vorstand freigegeben hat.
 * Gleiches Kürzel (id = slug) → selbst gepflegte Angaben ergänzen/überschreiben die
 * Datei; Vorstandsfunktion und „featured“ bleiben aus der Datei.
 * Ist Supabase nicht erreichbar, baut die Website nur mit der Datei (Warnung im Log).
 */
import type { ImageMetadata } from 'astro';
import { getPersonen } from './content';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config';
import { OFFEN_FUER, type GalerieLayout, type OffenFuer } from './profil-felder';

export type Role = 'mitglied' | 'trainer';

export interface GalerieFoto {
  /** lokales Bild (Datei) oder Adresse (Supabase Storage) */
  photo: ImageMetadata | string;
  caption?: string;
  caption_en?: string;
  credit?: string;
}

export interface Arbeit {
  year: string;
  title: string;
  place?: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  pronouns?: string;
  roles: Role[];
  vorstand?: string;
  vorstand_en?: string;
  bio?: string;
  bio_en?: string;
  tags: string[];
  /** lokales Bild (Datei) oder Adresse (Supabase Storage) */
  photo?: ImageMetadata | string;
  photoCredit?: string;
  website?: string;
  instagram?: string;
  vimeo?: string;
  email?: string;
  profession?: string;
  profession_en?: string;
  base?: string;
  pitch?: string;
  pitch_en?: string;
  openFor: OffenFuer[];
  works: Arbeit[];
  education?: string;
  techniques?: string;
  languages?: string;
  regions?: string;
  height?: string;
  available?: string;
  gallery: GalerieFoto[];
  galleryLayout: GalerieLayout;
  featured: boolean;
  /** selbst gepflegt im internen Bereich */
  selfManaged: boolean;
}

interface RemoteProfile {
  slug: string;
  display_name: string;
  pronouns: string | null;
  bio: string | null;
  bio_en: string | null;
  tags: string[] | null;
  website: string | null;
  instagram: string | null;
  vimeo: string | null;
  is_trainer: boolean;
  photo_path: string | null;
  photo_credit: string | null;
  // ab Migration 20261020000000_profil_seite.sql
  profession?: string | null;
  profession_en?: string | null;
  base?: string | null;
  pitch?: string | null;
  pitch_en?: string | null;
  open_for?: string[] | null;
  works?: { year?: unknown; title?: unknown; place?: unknown }[] | null;
  education?: string | null;
  techniques?: string | null;
  languages?: string | null;
  regions?: string | null;
  height?: string | null;
  available?: string | null;
  public_email?: string | null;
  gallery?: { path?: unknown; caption?: unknown; caption_en?: unknown; credit?: unknown }[] | null;
  gallery_layout?: string | null;
}

const clean = <T,>(v: T | null | undefined): T | undefined => (v === null || v === '' ? undefined : v);

async function fetchRemote(): Promise<RemoteProfile[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/public_profiles?select=*&order=display_name`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as RemoteProfile[];
  } catch (err) {
    console.warn(`[profile] Supabase-Profile nicht geladen (${String(err)}) – nur personen.yaml wird verwendet.`);
    return [];
  }
}

let cache: Promise<PublicProfile[]> | undefined;

export function getProfiles(): Promise<PublicProfile[]> {
  cache ??= (async () => {
    const [entries, remote] = await Promise.all([getPersonen(), fetchRemote()]);
    const list: PublicProfile[] = entries.map(({ id, data }) => ({ id, ...data, selfManaged: false }));
    const byId = new Map(list.map((p) => [p.id, p]));
    const bild = (pfad: string) => `${SUPABASE_URL}/storage/v1/object/public/profilbilder/${pfad}`;
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    for (const r of remote) {
      const photo = r.photo_path ? bild(r.photo_path) : undefined;
      const works = (r.works ?? [])
        .map((w) => ({ year: text(String(w.year ?? '')) ?? '', title: text(w.title) ?? '', place: text(w.place) }))
        .filter((w) => w.title);
      const gallery = (r.gallery ?? [])
        .filter((g) => typeof g.path === 'string' && g.path)
        .map((g) => ({ photo: bild(g.path as string), caption: text(g.caption), caption_en: text(g.caption_en), credit: text(g.credit) }));
      const fromRemote = {
        name: r.display_name,
        pronouns: clean(r.pronouns),
        bio: clean(r.bio),
        bio_en: clean(r.bio_en),
        tags: r.tags?.length ? r.tags : undefined,
        website: clean(r.website),
        instagram: clean(r.instagram),
        vimeo: clean(r.vimeo),
        photo,
        photoCredit: clean(r.photo_credit),
        email: clean(r.public_email),
        profession: clean(r.profession),
        profession_en: clean(r.profession_en),
        base: clean(r.base),
        pitch: clean(r.pitch),
        pitch_en: clean(r.pitch_en),
        openFor: r.open_for?.length ? (r.open_for.filter((o) => o in OFFEN_FUER) as OffenFuer[]) : undefined,
        works: works.length ? works : undefined,
        education: clean(r.education),
        techniques: clean(r.techniques),
        languages: clean(r.languages),
        regions: clean(r.regions),
        height: clean(r.height),
        available: clean(r.available),
        gallery: gallery.length ? gallery : undefined,
        galleryLayout: r.gallery_layout === 'mosaik' || r.gallery_layout === 'raster' || r.gallery_layout === 'filmstreifen' ? (r.gallery_layout as GalerieLayout) : undefined,
      };
      const existing = byId.get(r.slug);
      if (existing) {
        for (const [k, v] of Object.entries(fromRemote)) if (v !== undefined) (existing as unknown as Record<string, unknown>)[k] = v;
        if (r.is_trainer && !existing.roles.includes('trainer')) existing.roles.push('trainer');
        existing.selfManaged = true;
      } else {
        const p: PublicProfile = {
          id: r.slug,
          ...fromRemote,
          name: r.display_name,
          tags: fromRemote.tags ?? [],
          openFor: fromRemote.openFor ?? [],
          works: fromRemote.works ?? [],
          gallery: fromRemote.gallery ?? [],
          galleryLayout: fromRemote.galleryLayout ?? 'filmstreifen',
          roles: r.is_trainer ? ['mitglied', 'trainer'] : ['mitglied'],
          featured: true,
          selfManaged: true,
        };
        list.push(p);
        byId.set(p.id, p);
      }
    }
    return list;
  })();
  return cache;
}

export async function getProfile(id: string) {
  return (await getProfiles()).find((p) => p.id === id);
}

export function instagramUrl(handle?: string) {
  return handle ? `https://www.instagram.com/${encodeURIComponent(handle.replace(/^@/, ''))}/` : undefined;
}

export function initials(name: string) {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/** Profiltext in der Sprache (Fallback Deutsch), als Absätze. */
export function bioParagraphs(p: PublicProfile, lang: 'de' | 'en'): string[] {
  const text = (lang === 'en' && p.bio_en) || p.bio || '';
  return text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

/** Text in der Sprache, Fallback Deutsch (für Felder mit `_en`) */
export function profilText(p: PublicProfile, key: 'pitch' | 'profession', lang: 'de' | 'en'): string | undefined {
  return (lang === 'en' && p[`${key}_en`]) || p[key];
}
