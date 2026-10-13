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
   `supabase/migrations/20261010000000_rollen_im_dashboard.sql` (Rollen auch im Dashboard änderbar) und
   `supabase/migrations/20261013000000_freigaben.sql` (Presse gibt Profile frei, neue Fotos warten auf Freigabe).
   Oben rechts im SQL-Editor muss als Rolle `postgres` stehen. Alle Dateien dürfen erneut ausgeführt werden.

## 2. Login konfigurieren

Unter *Authentication*:

- **Sign In / Providers → Email**: aktiv. „Allow new users to sign up“ **ausschalten** (nur Einladungen).
- **URL Configuration → Site URL**: die Website-Adresse, z. B. `https://tanznetzdresden.de`.
  **Redirect URLs**: `https://tanznetzdresden.de/intern/**` (bei GitHub Pages mit Unterpfad entsprechend).
- **Emails → Templates**: Texte auf Deutsch anpassen. Der Einladungslink sollte auf `/intern/passwort/` führen.
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
| Link aus der E-Mail führt auf `localhost` oder eine Fehlerseite | *Authentication → URL Configuration*: Site URL und Redirect URLs prüfen (Schritt 2). Bei GitHub Pages: `https://maltlinski.github.io/tanznetzdresden_website/intern/**`. |
| Angemeldet, aber Fehlermeldungen oder leere Listen | Nicht alle fünf Migrationen ausgeführt. Im SQL-Editor der Reihe nach ausführen; meldet eine „already exists“, war sie schon ausgeführt. |
| Table Editor oder SQL-Editor: „Nur der Vorstand kann Rollen ändern.“ | Fünfte Migration `20261013000000_freigaben.sql` (noch einmal) ausführen, dann erneut speichern. Im SQL-Editor oben rechts muss als Rolle `postgres` stehen, nicht ein angemeldetes Mitglied. |
| Freigaben: „Die Datenbank kennt die Freigabe noch nicht“ | Fünfte Migration `20261013000000_freigaben.sql` ausführen. |
| Mein Profil: „Neue Fotos gibt die Redaktion frei.“ | Die Seite ist älter als die Datenbank. Seite neu laden. |
| „Redaktion“ fehlt im Menü | Rolle ist `mitglied`. Vorstand oder *Table Editor → profiles → role* auf `presse`, `vorstand` oder `admin` setzen. |
| Redaktion: „noch nicht eingerichtet“ | Supabase-Funktion `inhalte` und GitHub-Schlüssel fehlen, siehe [redaktion.md](redaktion.md#einrichten-einmalig-admin). |
| Veröffentlichte News oder freigegebene Profile erscheinen erst am nächsten Morgen | Die Redaktion (Funktion `inhalte` mit GitHub-Schlüssel) ist nicht eingerichtet; sie stößt den Neubau an. Siehe [redaktion.md](redaktion.md#einrichten-einmalig-admin). |

## 4. Mitglieder einladen

*Authentication → Users → Invite user*: E-Mail-Adresse eingeben. Die Person bekommt einen Link, legt ein Passwort
fest und pflegt danach ihr Profil. Beim ersten Login wird automatisch ein Profil angelegt.

**Ersten Vorstand ernennen:** *Table Editor → profiles* → bei der Person `role` auf `vorstand` oder `admin` setzen
(braucht die vierte Migration, sonst kommt „Nur der Vorstand kann Rollen ändern.“).
Danach vergibt der Vorstand Rollen direkt unter *Intern → Mitglieder*:

| Rolle | darf |
|---|---|
| Mitglied | eigenes Profil, Mitgliederliste, Dokumente lesen |
| Presse | zusätzlich die Redaktion: News, Termine, Formate, Profitraining, Personen, Partner, Texte, Profile und Fotos freigeben (docs/redaktion.md) |
| Vorstand | zusätzlich Rollen vergeben, Dokumente hochladen, Redaktion inkl. Impressum, Datenschutz und rechtlicher Vereinsdaten |
| Admin | wie Vorstand (Admin vergeben nur Admins) |

**Mitgliedschaft beendet:** *Authentication → Users* → Person löschen. Das Profil wird mit gelöscht.

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

## Redaktion

Die Redaktion (*Intern → Redaktion*) braucht zusätzlich die Supabase-Funktion `inhalte` und einen GitHub-Schlüssel.
Einrichtung in [redaktion.md](redaktion.md#einrichten-einmalig-admin).

## Ideen für später

- Interne Termine (Plenum, AG-Treffen) im selben Kalender (`src/components/Kalender.astro`), sichtbar nur für Mitglieder.
- Einladungen direkt aus dem internen Bereich (braucht eine Supabase Edge Function mit Service-Key).
