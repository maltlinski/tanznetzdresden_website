-- =====================================================================
-- Links in Profilen nur ins Web (Website, Video)
--
-- Mitglieder tragen ihre Website und ein Video (Vimeo) ein; beides wird auf der öffentlichen
-- Profilseite verlinkt. Erlaubt sind nur Adressen mit http:// oder https:// – wie bei Open Calls
-- (open_calls.link). So kann kein „javascript:“-Link o. ä. auf die Website gelangen.
-- Die Website prüft dasselbe noch einmal beim Bauen (webLink() in src/lib/profil-ansicht.ts).
--
-- Vorher werden alte Einträge bereinigt: „www.beispiel.de“ bekommt https:// davor, Adressen mit
-- einem anderen Schema werden geleert.
-- Einspielen: im SQL-Editor ausführen (Rolle oben rechts: postgres). Mehrfaches Ausführen schadet nicht.
-- =====================================================================

update public.profiles set website = nullif(trim(website), '') where website is distinct from nullif(trim(website), '');
update public.profiles set vimeo = nullif(trim(vimeo), '') where vimeo is distinct from nullif(trim(vimeo), '');
update public.profiles set website = 'https://' || website where website !~* '^[a-z][a-z0-9+.-]*:' and website ~ '^[^\s/]+\.[^\s]+$';
update public.profiles set vimeo = 'https://' || vimeo where vimeo !~* '^[a-z][a-z0-9+.-]*:' and vimeo ~ '^[^\s/]+\.[^\s]+$';
update public.profiles set website = null where website !~* '^https?://\S';
update public.profiles set vimeo = null where vimeo !~* '^https?://\S';

alter table public.profiles drop constraint if exists profiles_website_web;
alter table public.profiles add constraint profiles_website_web check (website is null or website ~* '^https?://\S');
alter table public.profiles drop constraint if exists profiles_vimeo_web;
alter table public.profiles add constraint profiles_vimeo_web check (vimeo is null or vimeo ~* '^https?://\S');
