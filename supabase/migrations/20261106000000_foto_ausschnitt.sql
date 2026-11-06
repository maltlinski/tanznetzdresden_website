-- =====================================================================
-- Ausschnitt von Profilfotos (Mein Profil → Ausschnitt wählen)
--
-- Porträts stehen auf der Website in festen Formen (Keil im Profilkopf, Karte im Netzwerk, Kachel im
-- Profitraining). Der Fokuspunkt („x% y%“) bestimmt, welcher Teil in jeder Form sichtbar bleibt.
--  photo_focus   Fokus je Foto-Pfad: { "<pfad>": "40% 25%" } – so gilt er für das freigegebene Foto
--                und für ein neues, das noch auf Freigabe wartet, ohne dass die Freigabe etwas umkopiert.
-- Galeriefotos brauchen keine neue Spalte: Fokus und „ganz zeigen“ stehen im Eintrag der Liste
-- (gallery: [{ path, caption, …, fokus, ganz }]); die öffentliche Ansicht gibt sie schon weiter.
--
-- Einspielen: im SQL-Editor ausführen (Rolle oben rechts: postgres). Mehrfaches Ausführen schadet nicht.
-- Ohne diese Migration funktioniert alles weiter, nur der Ausschnitt des Porträts lässt sich nicht speichern.
-- =====================================================================

alter table public.profiles
  add column if not exists photo_focus jsonb not null default '{}'
    check (jsonb_typeof(photo_focus) = 'object' and char_length(photo_focus::text) <= 600);

comment on column public.profiles.photo_focus is 'Fokuspunkt des Porträts je Foto-Pfad: {"<pfad>": "x% y%"}.';

-- Öffentliche Ansicht wie in 20261020000000_profil_seite.sql, dazu photo_focus (nur der Wert des
-- freigegebenen Fotos). Neue Spalte am Ende, damit create or replace genügt.
create or replace view public.public_profiles
with (security_invoker = false) as
  select p.slug, p.display_name, p.pronouns, p.bio, p.bio_en, p.tags, p.website, p.instagram, p.vimeo,
         p.is_trainer, p.ags, p.photo_path, p.photo_credit, p.updated_at,
         p.profession, p.profession_en, p.base, p.pitch, p.pitch_en, p.open_for, p.works,
         p.education, p.techniques, p.languages, p.regions, p.height, p.available, p.public_email,
         coalesce((
           select jsonb_agg(g - 'frei' order by i)
           from jsonb_array_elements(p.gallery) with ordinality as t(g, i)
           where (g->>'frei')::boolean is true
         ), '[]'::jsonb) as gallery,
         p.gallery_layout,
         case when p.photo_path is not null then p.photo_focus ->> p.photo_path end as photo_focus
  from public.profiles p
  where p.public_listing and p.verified and p.slug is not null;

grant select on public.public_profiles to anon, authenticated;
