-- =====================================================================
-- TanzNetzDresden – Eintritt bei Terminen aus Intern → Kalender
--
-- Der Tanzkalender (/termine/) zeigt beim Aufklappen eines Termins Wann, Wo und Eintritt. Für Termine aus
-- Dateien steht der Eintritt im Feld `eintritt` (src/content/termine/), hier dieselbe Angabe für die Tabelle.
-- Ohne diese Migration funktioniert alles weiter, nur ohne Eintritt.
--
-- Einspielen: nach 20261027000000_open_calls.sql im SQL-Editor ausführen (Rolle oben rechts: postgres).
-- Mehrfaches Ausführen schadet nicht.
-- =====================================================================

alter table public.kalender_termine
  add column if not exists eintritt    text not null default '' check (char_length(eintritt) <= 80),
  add column if not exists eintritt_en text not null default '' check (char_length(eintritt_en) <= 80);

-- Öffentliche Ansicht mit den neuen Spalten (Build der Website)
drop view if exists public.public_kalender;
create view public.public_kalender
with (security_invoker = false) as
  select slug, titel, titel_en, datum, von, bis, zeit_text, ort, kategorie, kurz, kurz_en, text, link, format, personen, news,
         eintritt, eintritt_en, updated_at
  from public.kalender_termine
  where sichtbar;
grant select on public.public_kalender to anon, authenticated;
