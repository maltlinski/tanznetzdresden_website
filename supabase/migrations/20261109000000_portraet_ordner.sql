-- Wartendes Porträt (photo_pending) nur aus dem eigenen Ordner im Bucket „profilbilder“.
-- Ohne diese Regel konnte ein Mitglied den Pfad eines fremden Fotos eintragen; lehnt die Redaktion
-- es ab, löscht die Freigaben-Seite die Datei – und das Porträt der anderen Person wäre weg.
-- Gleiche Regel wie für Galeriefotos (profiles_galerie_pruefen, 20261020000000).

update public.profiles
  set photo_pending = null
  where photo_pending is not null and photo_pending !~ ('^' || id::text || '/[A-Za-z0-9._-]+$');

alter table public.profiles drop constraint if exists profiles_photo_pending_ordner;
alter table public.profiles add constraint profiles_photo_pending_ordner
  check (photo_pending is null or photo_pending ~ ('^' || id::text || '/[A-Za-z0-9._-]+$'));
