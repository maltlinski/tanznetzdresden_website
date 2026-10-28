# Interner Bereich einrichten (Supabase)

Der interne Bereich (`/intern/`) nutzt [Supabase](https://supabase.com): Login, Datenbank und Dateiablage.
Die Website bleibt statisch. Der Browser spricht direkt mit Supabase, und **Row Level Security** in der Datenbank
sorgt dafür, dass nur angemeldete Mitglieder:innen Daten sehen. Der öffentliche Schlüssel im Browser allein
öffnet nichts.

## 1. Projekt anlegen (ca. 15 Minuten)

1. Auf supabase.com ein Konto anlegen und ein neues Projekt erstellen. **Region: Central EU (Frankfurt)**.
2. Den Auftragsverarbeitungsvertrag (DPA) im Dashboard unter *Organization → Legal Documents* abschließen.
3. *SQL Editor* öffnen und nacheinander ausführen:
   `supabase/migrations/20261007000000_intern.sql` (Login, Profile, Dokumente),
   `supabase/migrations/20261008000000_oeffentliche_profile.sql` (öffentliche Profile mit Freigabe, Porträts) und
   `supabase/migrations/20261009000000_news.sql` (News-Redaktion, Rolle „Presse“, siehe docs/news.md),
   `supabase/migrations/20261010000000_rollen_im_dashboard.sql` (Rollen auch im Dashboard änderbar),
   `supabase/migrations/20261013000000_freigaben.sql` (Presse gibt Profile frei, neue Fotos warten auf Freigabe),
   `supabase/migrations/20261015000000_news_bilder.sql` (News mit Bildausschnitt und längeren Texten),
   `supabase/migrations/20261016000000_mediathek.sql` (Mediathek der Redaktion, Newsletter-Vormerkung) und
   `supabase/migrations/20261020000000_profil_seite.sql` (Profilseite mit Galerie, Arbeiten und Kontakt, siehe docs/profile.md) und
   `supabase/migrations/20261022000000_mitgliedschaft.sql` (Mitgliedschaft und Mitgliedsausweis, siehe unten „Mein Status“) und
   `supabase/migrations/20261025000000_keepup.sql` (KEEP UP planen und beschreiben, siehe [keep-up.md](keep-up.md)) und
   `supabase/migrations/20261026000000_kalender.sql` (Termine im internen Kalender eintragen, siehe [kalender.md](kalender.md)) und
   `supabase/migrations/20261027000000_open_calls.sql` (Open Calls, siehe [open-calls.md](open-calls.md)) und
   `supabase/migrations/20261028000000_kalender_eintritt.sql` (Eintritt bei Terminen, siehe [kalender.md](kalender.md)).
   Oben rechts im SQL-Editor muss als Rolle `postgres` stehen. Alle Dateien dürfen erneut ausgeführt werden.

## 2. Login konfigurieren

Unter *Authentication*:

- **Sign In / Providers → Email**: aktiv. „Allow new users to sign up“ **ausschalten** (nur Einladungen).
- **URL Configuration → Site URL**: die Website-Adresse, z. B. `https://tanznetzdresden.de`.
  **Redirect URLs**: `https://tanznetzdresden.de/intern/**` und `https://tanznetzdresden.de/en/intern/**` (englische
  Seiten, siehe unten; bei GitHub Pages mit Unterpfad entsprechend).
- **Emails → Templates**: Texte auf Deutsch anpassen. Der Einladungslink sollte auf `/intern/passwort/` führen.
  Empfohlen: Links, die erst auf der Website eingelöst werden. Sonst öffnen Virenscanner mancher Postfächer
  (z. B. Microsoft 365) den Link vorher, und er gilt als „schon benutzt“. Dafür in den Vorlagen den Link ersetzen:
  - *Invite user*: `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">…</a>`
  - *Magic link*: `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">…</a>`
  - *Reset password*: `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">…</a>`

  Die Standardvorlagen (`{{ .ConfirmationURL }}`) funktionieren ebenfalls.
- **SMTP**: Für mehr als ein paar Mails pro Stunde einen eigenen Mailserver eintragen (z. B. vom Webhoster).
- Optional **Attack Protection → CAPTCHA** (z. B. Cloudflare Turnstile) gegen automatisierte Login-Versuche.

## 3. Website verbinden

*Project Settings → API*: `Project URL` und `anon public key` kopieren und in **`src/settings/supabase.ts`**
eintragen (direkt auf GitHub über den Stift bearbeiten). Die Adresse ohne `/rest/v1/` dahinter. Beide Werte sind
öffentlich, die Daten schützt Row Level Security. **Niemals den `service_role`-Schlüssel eintragen.**

Nach dem Speichern baut die Website neu, nach 2–3 Minuten ist der Login aktiv. Für ein Testprojekt lassen sich die
Werte lokal per `.env` (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`) oder in GitHub als Actions-Variablen
mit denselben Namen überschreiben.

## Wenn es nicht klappt

| Was passiert | Ursache und Lösung |
|---|---|
| `/intern/` zeigt „Noch nicht eingerichtet“ | Zugangsdaten fehlen in `src/settings/supabase.ts`, oder der Neubau läuft noch (*Actions*). |
| Anmelden: „Für diese Adresse gibt es kein Konto“ | Person unter *Authentication → Users* einladen. Registrieren geht absichtlich nicht. |
| Link aus der E-Mail: „abgelaufen oder wurde schon benutzt“ | Jeder Link gilt nur einmal und eine Stunde lang (*Authentication → Sign In / Providers → Email → Email OTP Expiration*). Neuen Link über „Passwort vergessen?“ anfordern. Passiert es oft, öffnet ein Virenscanner des Postfachs die Links vorher: Vorlagen mit `token_hash` nutzen (Schritt 2). |
| Link aus der E-Mail führt auf `localhost` oder eine Fehlerseite | *Authentication → URL Configuration*: Site URL und Redirect URLs prüfen (Schritt 2). Bei GitHub Pages: `https://maltlinski.github.io/tanznetzdresden_website/intern/**`. |
| Angemeldet, aber Fehlermeldungen oder leere Listen | Nicht alle Migrationen ausgeführt. Im SQL-Editor der Reihe nach ausführen; meldet eine „already exists“, war sie schon ausgeführt. |
| Table Editor oder SQL-Editor: „Nur der Vorstand kann Rollen ändern.“ | Fünfte Migration `20261013000000_freigaben.sql` (noch einmal) ausführen, dann erneut speichern. Im SQL-Editor oben rechts muss als Rolle `postgres` stehen, nicht ein angemeldetes Mitglied. |
| Freigaben: „Die Datenbank kennt die Freigabe noch nicht“ | Fünfte Migration `20261013000000_freigaben.sql` ausführen. |
| News: „Die Datenbank kennt den Bildausschnitt noch nicht“ oder „Der Text ist zu lang“ | Sechste Migration `20261015000000_news_bilder.sql` ausführen. |
| Medien: „erst speichern, wenn die Migration … ausgeführt ist“, Newsletter-Schalter gesperrt | Siebte Migration `20261016000000_mediathek.sql` ausführen. |
| Mein Profil: „Galerie, Arbeiten und weitere Angaben kommen bald dazu“; Freigaben: „Die Datenbank kennt die Galerie noch nicht“ | Achte Migration `20261020000000_profil_seite.sql` ausführen. |
| Mein Profil: „Neue Fotos gibt die Redaktion frei.“ | Die Seite ist älter als die Datenbank. Seite neu laden. |
| Mein Status zeigt immer „In Vorbereitung“; Mitglieder: „Mitgliedschaften lassen sich pflegen, sobald …“ | Neunte Migration `20261022000000_mitgliedschaft.sql` ausführen, dann unter *Intern → Mitglieder* die Mitgliedschaft eintragen. |
| Kalender: „Termine eintragen geht, sobald die Migration … ausgeführt ist“ | Elfte Migration `20261026000000_kalender.sql` ausführen. |
| Open Calls: „Open Calls gibt es, sobald die Migration … ausgeführt ist“ | Zwölfte Migration `20261027000000_open_calls.sql` ausführen. |
| Kalender: kein Feld „Eintritt“ unter *Mehr Angaben* | Dreizehnte Migration `20261028000000_kalender_eintritt.sql` ausführen. |
| KEEP UP: „Die Tabelle für KEEP UP fehlt noch“ | Zehnte Migration `20261025000000_keepup.sql` ausführen. |
| Dozent:in sieht „Meine Trainings“ nicht | Profiladresse muss genau dem Kürzel in `keep-up/dozentinnen.yaml` entsprechen und das Profil freigegeben sein; und der Vorstand muss sie eingeplant haben ([keep-up.md](keep-up.md)). |
| Google Wallet: „noch nicht eingerichtet“ | Funktion `ausweis` und ihre Secrets fehlen, siehe „Google Wallet“ unten. |
| „Redaktion“ fehlt im Menü | Rolle ist `mitglied`. Vorstand oder *Table Editor → profiles → role* auf `presse`, `vorstand` oder `admin` setzen. |
| Redaktion: „noch nicht eingerichtet“ | Supabase-Funktion `inhalte` und GitHub-Schlüssel fehlen, siehe [redaktion.md](redaktion.md#einrichten-einmalig-admin). |
| Veröffentlichte News oder freigegebene Profile erscheinen erst am nächsten Morgen | Die Redaktion (Funktion `inhalte` mit GitHub-Schlüssel) ist nicht eingerichtet; sie stößt den Neubau an. Siehe [redaktion.md](redaktion.md#einrichten-einmalig-admin). |

## 4. Mitglieder einladen

**Im internen Bereich (Vorstand):** *Intern → Mitglieder → Neues Mitglied einladen*. Name, E-Mail, Rolle, Sprache
der Einladung und – wenn die Tabelle `mitgliedschaften` da ist – Art und Beginn der Mitgliedschaft eintragen,
„Einladung senden“. Die Person bekommt eine E-Mail, legt über den Link ihr Passwort fest (`/intern/passwort/`, bei
englischer Einladung `/en/intern/passwort/`) und ist drin. Darunter stehen die Einladungen, die noch niemand
angenommen hat: **Erneut senden** (Link abgelaufen, Mail im Spam) oder **Zurücknehmen** (z. B. Tippfehler in der
Adresse). Bestehende Zugänge kann die Funktion nicht löschen.

**Einrichten (einmal):**

1. *Edge Functions → Deploy a new function → Via Editor*, Name `einladen`, Inhalt von
   `supabase/functions/einladen/index.ts` hineinkopieren. „Verify JWT“ eingeschaltet lassen.
   (Oder mit der CLI: `supabase functions deploy einladen --project-ref <projekt>`.)
2. *Edge Functions → Secrets*: `SITE_URL`, z. B. `https://tanznetzdresden.de/` (gibt es schon, wenn Google Wallet
   eingerichtet ist). Den Service-Schlüssel setzt Supabase selbst (`SUPABASE_SERVICE_ROLE_KEY`); er steht nur in der
   Funktion, nie im Repository oder im Browser.
3. *Authentication → URL Configuration → Redirect URLs*: `…/intern/**` und `…/en/intern/**` (siehe Schritt 2).
4. *Authentication → Emails → Invite user*: Text anpassen. Die Sprache der Einladung steht in `.Data.sprache`,
   der Name in `.Data.display_name`, zum Beispiel:

   ```html
   {{ if eq .Data.sprache "en" }}
   <h2>Welcome to TanzNetzDresden</h2>
   <p>Hello {{ .Data.display_name }}, the board has invited you to the members area.</p>
   <p><a href="{{ .ConfirmationURL }}">Set your password</a></p>
   {{ else }}
   <h2>Willkommen im TanzNetzDresden</h2>
   <p>Hallo {{ .Data.display_name }}, der Vorstand hat dich in den internen Bereich eingeladen.</p>
   <p><a href="{{ .ConfirmationURL }}">Passwort festlegen</a></p>
   {{ end }}
   ```

Ohne die Funktion zeigt *Intern → Mitglieder* einen Hinweis. Dann geht es wie bisher über das Dashboard:
*Authentication → Users → Invite user*. Beim ersten Login wird automatisch ein Profil angelegt.

**Ersten Vorstand ernennen:** *Table Editor → profiles* → bei der Person `role` auf `vorstand` oder `admin` setzen
(braucht die vierte Migration, sonst kommt „Nur der Vorstand kann Rollen ändern.“).
Danach vergibt der Vorstand Rollen direkt unter *Intern → Mitglieder*:

| Rolle | darf |
|---|---|
| Mitglied | eigenes Profil, Mitgliederliste, Dokumente lesen, Open Calls merken und melden |
| Presse | zusätzlich die Redaktion: News, Open Calls prüfen und eintragen, Termine, Formate, Profitraining, Personen, Partner, Texte, Profile und Fotos freigeben (docs/redaktion.md) |
| Vorstand | zusätzlich Rollen vergeben, Dokumente hochladen, Redaktion inkl. Impressum, Datenschutz und rechtlicher Vereinsdaten |
| Admin | wie Vorstand (Admin vergeben nur Admins) |

**Mitgliedschaft beendet:** *Authentication → Users* → Person löschen. Das Profil wird mit gelöscht.

## Auf Englisch

Die Seiten für Mitglieder gibt es auch auf Englisch unter `/en/intern/`: Anmelden, Mein Status mit Ausweis, Passwort,
Mein Profil, Open Calls und KEEP UP (Meine Trainings, Training beschreiben). Wer auf der englischen Website auf „Login“ klickt,
landet dort. Oben in der Seitenleiste schaltet **DE | EN** um; der interne Bereich merkt sich die Wahl im Browser und
öffnet beim nächsten Mal in dieser Sprache.

Redaktion, Kalender, Mitglieder und Dokumente bleiben deutsch (die Links in der englischen Leiste führen dorthin).
Welche Seiten es auf Englisch gibt, steht in `src/lib/intern-sprache.ts`. Die Seiten selbst liegen als Views in
`src/views/intern/`, Texte mit `tr()` (Seite) und `t()` aus `src/scripts/intern/sprache.ts` (Skript).

Nicht übersetzt: E-Mails von Supabase (Einladung, Login-Link; *Emails → Templates*), der Ausweis in Google Wallet
und die Prüfseite `/mitglied/pruefen/`.

## Was wo gespeichert wird

| Daten | Wer sieht es |
|---|---|
| Name, Pronomen, Kurzbio, Website, Instagram, AGs | alle angemeldeten Mitglieder:innen |
| E-Mail, Telefon | nur, wenn die Person es freigibt |
| `public_listing` | öffentliches Profil gewünscht; erscheint nach Freigabe (`verified`) in der Ansicht `public_profiles` |
| Porträt (Bucket `profilbilder`) | öffentlich; ein neues Foto (`photo_pending`) erscheint erst nach Freigabe auf der Website |
| Dokumente (Bucket `intern`) | Lesen: alle Mitglieder:innen · Hochladen/Löschen: Vorstand |
| Rolle | ändern kann nur der Vorstand |
| News (`news_posts`, Bucket `newsbilder`) | Entwürfe: nur Presse/Vorstand/Admin · veröffentlicht: öffentlich über `public_news` |

## Mein Status und Mitgliedsausweis

Nach dem Login landen alle auf *Mein Status* (`/intern/`): Ausweis zum Umdrehen, Angaben zur Mitgliedschaft und der
Ausweis als PDF (Druckdialog → „Als PDF speichern“). Der ganze interne Bereich hat denselben Rahmen mit Seitenleiste
(`src/layouts/Intern.astro`); Presse, Vorstand und Admin sehen dort zusätzlich die Redaktion.

**Pflegen (Vorstand):** *Intern → Mitglieder* → auf der Karte „Mitgliedschaft“ aufklappen. Nummer leer lassen, dann
vergibt die Datenbank eine (`TNDD-<Eintrittsjahr>-<laufende Nummer>`). Wenn der Beitrag da ist: „Beitrag <Jahr> bezahlt“.
Austritt: „Mitglied bis“ eintragen.

| Status | wann | was das Mitglied sieht |
|---|---|---|
| aktiv | Beitrag für das laufende Jahr bezahlt | Ausweis, PDF (und Google Wallet) |
| Beitrag offen | sonst | grauer Ausweis mit Stempel, Hinweis mit E-Mail „Zahlungsinfos anfragen“; fällig bis 31. März (`BEITRAG_FAELLIG` in `src/lib/mitgliedschaft.ts`) |
| abgelaufen | „Mitglied bis“ liegt in der Vergangenheit | grauer Ausweis, Hinweis „Mitgliedschaft verlängern“ |

**Prüfen:** Der QR-Code auf der Rückseite führt auf `/mitglied/pruefen/?c=<Prüfcode>`. Die Seite zeigt Name, Nummer,
Art, Status und „gültig bis“, ohne Anmeldung, aber nur mit dem zufälligen Code. Ausweis verloren: im SQL-Editor
`update public.mitgliedschaften set pruefcode = gen_random_uuid() where nummer = 'TNDD-…';` – der alte Code gilt dann
nicht mehr.

### Google Wallet (optional)

„Zu Google Wallet hinzufügen“ erscheint erst, wenn `wallet: true` in `src/settings/supabase.ts` steht. Vorher einmal
einrichten:

1. In der [Google Pay & Wallet Console](https://pay.google.com/business/console) ein Ausstellerkonto für den Verein
   anlegen und die **Issuer ID** notieren. Für den Livebetrieb dort „Publishing access“ beantragen (vorher sehen nur
   Testkonten den Pass).
2. In der Google Cloud Console die *Google Wallet API* aktivieren, ein **Dienstkonto** anlegen und einen Schlüssel
   (JSON) erzeugen. Das Dienstkonto in der Wallet Console unter *Users* als Entwickler eintragen.
3. Supabase: Funktion `supabase/functions/ausweis/index.ts` deployen (*Edge Functions → Deploy a new function → Via
   Editor*, Name `ausweis`, Inhalt der Datei hineinkopieren) und unter *Edge Functions → Secrets* eintragen:
   `WALLET_ISSUER_ID`, `WALLET_SA_EMAIL` (client_email aus der JSON-Datei), `WALLET_SA_KEY` (private_key aus der
   JSON-Datei), `SITE_URL` (z. B. `https://tanznetzdresden.de/`), optional `WALLET_LOGO_URL` (PNG-Logo).
   **Den Schlüssel nie ins Repository legen.**
4. `wallet: true` in `src/settings/supabase.ts` setzen.

An Google gehen Name, Mitgliedsnummer, „gültig bis“ und der Prüf-Link erst, wenn ein Mitglied selbst auf den Knopf
drückt und den Pass speichert. Das gehört in die Datenschutzerklärung, bevor der Schalter an ist.

## Open Calls

Ausschreibungen merken, Bewerbungen verfolgen, Calls melden; die Redaktion prüft und trägt ein. Anleitung und
Erinnerungen per Mail: [open-calls.md](open-calls.md).

## Kalender und KEEP UP

Unter *Intern → Kalender* tragen Presse, Vorstand und Admin Termine ein und planen KEEP UP ([kalender.md](kalender.md)),
auch wie der Google Kalender des Vereins das abonniert. Die Dozent:innen beschreiben ihre Trainings unter
*Meine Trainings* ([keep-up.md](keep-up.md)).

## Redaktion

Die Redaktion (*Intern → Redaktion*) braucht zusätzlich die Supabase-Funktion `inhalte` und einen GitHub-Schlüssel.
Einrichtung in [redaktion.md](redaktion.md#einrichten-einmalig-admin).

## Ideen für später

- Interne Termine (Plenum, AG-Treffen) im selben Kalender (`src/components/Kalender.astro`), sichtbar nur für Mitglieder.
