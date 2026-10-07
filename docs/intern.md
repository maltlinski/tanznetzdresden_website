# Interner Bereich einrichten (Supabase)

Der interne Bereich (`/intern/`) nutzt [Supabase](https://supabase.com): Login, Datenbank und Dateiablage.
Die Website bleibt statisch. Der Browser spricht direkt mit Supabase, und **Row Level Security** in der Datenbank
sorgt dafür, dass nur angemeldete Mitglieder:innen Daten sehen. Der öffentliche Schlüssel im Browser allein
öffnet nichts.

## 1. Projekt anlegen (ca. 15 Minuten)

1. Auf supabase.com ein Konto anlegen und ein neues Projekt erstellen. **Region: Central EU (Frankfurt)**.
2. Den Auftragsverarbeitungsvertrag (DPA) im Dashboard unter *Organization → Legal Documents* abschließen.
3. *SQL Editor* öffnen und den Inhalt von `supabase/migrations/20261007000000_intern.sql` ausführen.

## 2. Login konfigurieren

Unter *Authentication*:

- **Sign In / Providers → Email**: aktiv. „Allow new users to sign up“ **ausschalten** (nur Einladungen).
- **URL Configuration → Site URL**: die Website-Adresse, z. B. `https://tanznetzdresden.de`.
  **Redirect URLs**: `https://tanznetzdresden.de/intern/**` (bei GitHub Pages mit Unterpfad entsprechend).
- **Emails → Templates**: Texte auf Deutsch anpassen. Der Einladungslink sollte auf `/intern/passwort/` führen.
- **SMTP**: Für mehr als ein paar Mails pro Stunde einen eigenen Mailserver eintragen (z. B. vom Webhoster).
- Optional **Attack Protection → CAPTCHA** (z. B. Cloudflare Turnstile) gegen automatisierte Login-Versuche.

## 3. Website verbinden

*Project Settings → API*: `Project URL` und `anon public key` kopieren.

- Lokal: in `.env` als `PUBLIC_SUPABASE_URL` und `PUBLIC_SUPABASE_ANON_KEY`.
- GitHub: *Settings → Secrets and variables → Actions → Variables* mit denselben Namen anlegen.
  Dann den Deploy-Workflow neu starten.

## 4. Mitglieder einladen

*Authentication → Users → Invite user*: E-Mail-Adresse eingeben. Die Person bekommt einen Link, legt ein Passwort
fest und pflegt danach ihr Profil. Beim ersten Login wird automatisch ein Profil angelegt.

**Vorstand ernennen:** *Table Editor → profiles* → bei der Person `role` auf `vorstand` setzen.
Der Vorstand kann danach Dokumente hochladen und löschen sowie Profile bearbeiten.

**Mitgliedschaft beendet:** *Authentication → Users* → Person löschen. Das Profil wird mit gelöscht.

## Was wo gespeichert wird

| Daten | Wer sieht es |
|---|---|
| Name, Pronomen, Kurzbio, Website, Instagram, AGs | alle angemeldeten Mitglieder:innen |
| E-Mail, Telefon | nur, wenn die Person es freigibt |
| `public_listing` | Name, Website und Instagram dürfen öffentlich erscheinen (Ansicht `public_profiles`) |
| Dokumente (Bucket `intern`) | Lesen: alle Mitglieder:innen · Hochladen/Löschen: Vorstand |
| Rolle | ändern kann nur der Vorstand |

## Ideen für später

- Öffentliche Netzwerk-Liste automatisch aus `public_profiles` erzeugen (beim Build abrufen).
- Interne Termine (Plenum, AG-Treffen) als eigene Tabelle.
- Einladungen direkt aus dem internen Bereich (braucht eine Supabase Edge Function mit Service-Key).
