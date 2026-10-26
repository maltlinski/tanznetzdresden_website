# Open Calls (interner Bereich)

Unter *Intern → Open Calls* (`/intern/open-calls/`, auf Englisch `/en/intern/open-calls/`) sammeln wir
Ausschreibungen für die Dresdner Tanzszene: Förderungen, Residenzen, Auditions, Bühne und Festivals, Jobs,
Stipendien und Weiterbildungen. Entwurf: `design/entwuerfe/2026-10-open-calls/`.

## Für Mitglieder

- **Aktuell**: alle laufenden Calls, nach Frist sortiert (oder „Neueste zuerst“). Darüber die Zeitleiste mit den
  Fristen der nächsten 12 Wochen; Magenta heißt: höchstens 7 Tage. Filter nach Art, Reichweite (Dresden, Sachsen,
  bundesweit, international), „Honoriert“, „Auch auf Englisch“, „Aus dem Netzwerk“ und Suche.
- **Merken** legt einen Call auf die eigene Liste (*Gemerkt*). Läuft eine gemerkte Frist in den nächsten 7 Tagen ab,
  steht oben ein Hinweis.
- Im Call: **Mein Stand** (Gemerkt, In Arbeit, Eingereicht, Zusage, Absage) und die **Unterlagen** zum Abhaken. Wer
  etwas abhakt, ist „In Arbeit“. *Meine Bewerbungen* zeigt alles in Spalten, auch nach Ablauf der Frist.
- **In Kalender** lädt eine Kalenderdatei mit Erinnerung 7 Tage und 1 Tag vorher. *Gemerkte Fristen in Kalender*
  macht das für alle gemerkten Calls auf einmal.
- **Aus dem Netzwerk**: „Ich suche Mitstreiter:innen“ (bzw. „Ich mache beim gemeinsamen Antrag mit“) und „Ich habe
  mich hier schon beworben und teile meine Erfahrungen“. Beides sehen alle Mitglieder mit Namen – dafür ist es da.
  Alles andere (Stand, Unterlagen, Erinnerung) sieht nur die Person selbst.
- **Call melden**: Titel, Anbieter, Art, Reichweite, Frist, Link, optional Leistung und Kurzbeschreibung. Die
  Redaktion prüft; bis dahin sieht nur die Person selbst den Call („In Prüfung“) und kann die Meldung zurückziehen.
- **Link kopieren** gibt eine Adresse mit `#call-…`, die den Call direkt öffnet (nur für angemeldete Mitglieder).
- Nach der Frist (Ortszeit Dresden) steht ein Call im **Archiv**. Dafür läuft nichts im Hintergrund, die Seite
  rechnet es beim Öffnen aus.

## Für die Redaktion (Presse, Vorstand, Admin)

- **Call eintragen**: erscheint sofort für alle. Unter *Mehr Angaben*: Ort, Antragstellung ab, Zeitraum, Für wen,
  Sprache, Quelle, Wiederkehrend, Unterlagen (eine pro Zeile), Honoriert, Auch auf Englisch, „Vom Netzwerk“
  (Ausschreibung des Vereins), „Gemeinsamer Antrag“ und ein Hinweis aus dem Netzwerk.
- **Zu prüfen**: gemeldete Calls. Erst Link und Frist prüfen, dann *Freigeben*, *Bearbeiten* (Speichern gibt frei)
  oder *Ablehnen* (löscht die Meldung; der Person am besten kurz Bescheid sagen). Unter *Redaktion → Freigaben*
  steht ein Hinweis, wenn etwas wartet.
- Im Call: *Bearbeiten*, darin *Löschen*. Ändert man die Liste der Unterlagen, verschieben sich die Haken der Mitglieder.
- „Nur für Mitglieder“ ist für eine spätere öffentliche Liste auf der Website vorgemerkt; im Moment sind alle Open
  Calls nur intern.

## Technik

| Was | Wo |
|---|---|
| Tabellen `open_calls`, `open_call_stand`, `open_call_netz` | `supabase/migrations/20261027000000_open_calls.sql` |
| Fristen, Filter, Zeitleiste, Kalenderdatei | `src/lib/open-calls.ts` |
| Seite | `src/views/intern/OpenCallsView.astro`, Skript `src/scripts/intern/open-calls.ts` |
| Erinnerungen per Mail | `supabase/functions/erinnerungen/index.ts` |
| Tests | `tests/open-calls.spec.ts` |

Rechte (Row Level Security): Freigegebene Calls lesen alle Mitglieder, gemeldete nur die meldende Person und die
Redaktion. Mitglieder dürfen nur melden (der Trigger setzt „In Prüfung“ und streicht Felder der Redaktion); ändern,
freigeben und löschen darf die Redaktion. `open_call_stand` liest und schreibt nur die Person selbst.

## Erinnerungen per Mail (optional)

„Erinnere mich 7 Tage und 1 Tag vor der Frist per Mail“ erscheint erst mit `erinnerungen: true` in
`src/settings/supabase.ts`. Vorher einmal einrichten:

1. *Edge Functions → Deploy a new function → Via Editor*, Name `erinnerungen`, Inhalt von
   `supabase/functions/erinnerungen/index.ts` hineinkopieren.
2. *Edge Functions → Secrets*: `SITE_URL` (z. B. `https://tanznetzdresden.de/`), `SMTP_HOST`, `SMTP_USER`,
   `SMTP_PASS`, `SMTP_FROM` (Absender, z. B. `kontakt@tanznetzdresden.de`), optional `SMTP_PORT` (Standard 465).
   Das ist derselbe Mailserver wie für die Login-Mails (*Authentication → SMTP*), mit **SSL/TLS auf Port 465** –
   Supabase sperrt 25 und 587. Kein zusätzlicher Dienst.
3. Täglich aufrufen: *Database → Extensions* `pg_cron` und `pg_net` einschalten, dann im SQL-Editor (Projekt-Adresse
   und Schlüssel einsetzen; der Schlüssel ist `service_role` unter *Project Settings → API Keys* und landet
   verschlüsselt im Vault, nicht im Repository):

   ```sql
   select vault.create_secret('<service_role-Schlüssel>', 'service_role_key');
   select cron.schedule('open-calls-erinnerungen', '0 7 * * *', $$
     select net.http_post(
       url := 'https://<projekt>.supabase.co/functions/v1/erinnerungen',
       headers := jsonb_build_object('Authorization', 'Bearer ' ||
         (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'))
     );
   $$);
   ```

   Läuft um 7 Uhr UTC (8 bzw. 9 Uhr in Dresden). Die Funktion nimmt nur Aufrufe mit diesem Schlüssel an.
4. `erinnerungen: true` in `src/settings/supabase.ts` setzen.

Verschickt wird nur bei Stand „Gemerkt“ oder „In Arbeit“, jede Erinnerung einmal, in der Sprache der Seite, auf der
die Person sie eingeschaltet hat. Wer erst am Vortag einschaltet, bekommt nur die Mail „Endet morgen“.
Prüfen: *Edge Functions → erinnerungen → Logs*; Antwort `{"verschickt": n}`.

## Wenn es nicht klappt

| Was passiert | Ursache und Lösung |
|---|---|
| „Open Calls gibt es, sobald die Migration … ausgeführt ist“ | `20261027000000_open_calls.sql` im SQL-Editor ausführen. |
| Melden: „Die Frist liegt in der Vergangenheit.“ | Mitglieder melden nur laufende Calls. Die Redaktion kann auch ältere eintragen. |
| Keine Erinnerungs-Mails | Secrets und Cron prüfen (oben); Logs der Funktion. `503` = Secrets fehlen, `401` = falscher Schlüssel im Cron. |
