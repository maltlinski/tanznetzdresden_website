# Öffentliche Profile der Künstler:innen

Unter `/netzwerk/` (englisch `/en/network/`) hat jede Person aus dem Netzwerk eine eigene Seite: Name, Pronomen,
Profiltext, Schwerpunkte, Links, Porträt, Vorstandsfunktion und die nächsten Termine, an denen sie mitwirkt.

## Zwei Wege, ein Profil zu füllen

**1. Redaktion (ohne Login):** in `src/content/personen.yaml` oder im CMS unter *Personen*.

```yaml
- id: rika-yotsumoto              # Adresse: /netzwerk/rika-yotsumoto/
  name: "Rika Yotsumoto"
  pronouns: "sie/ihr"
  roles: [mitglied, trainer]
  vorstand: "Finanzen, AG-Koordination, Projektleitung KEEP UP"
  vorstand_en: "Finances, working-group coordination, project lead KEEP UP"
  bio: |
    Erster Absatz erscheint groß.

    Weitere Absätze mit Leerzeile trennen.
  bio_en: "English text (optional)"
  tags: [Contemporary, Release, Improvisation]
  photo: ../assets/personen/rika-yotsumoto.jpg   # Datei in src/assets/personen/
  photoCredit: "Name Fotograf:in"
  website: "https://…"
  instagram: "handle"
  vimeo: "https://vimeo.com/…"
  email: "name@example.org"       # erscheint verschlüsselt (Bot-Schutz)
```

**2. Selbst gepflegt (interner Bereich):** Mitglieder öffnen *Intern → Mein Profil*, setzen den Haken
„Öffentliches Profil“, wählen eine Adresse und füllen Text, Schwerpunkte, Links und Foto aus.

- Der **Vorstand gibt frei** (*Intern → Mitglieder → „Profil freigeben“*). Erst dann erscheint das Profil.
  Ändert eine Person später ihre Adresse, muss neu freigegeben werden.
- Nimmt die Person dieselbe Adresse wie ihr Eintrag in `personen.yaml` (z. B. `rika-yotsumoto`), ergänzt der
  selbst gepflegte Inhalt diesen Eintrag. Vorstandsfunktion und Startseiten-Auswahl bleiben aus der Datei.
- Neue Personen bekommen automatisch eine eigene Seite.

## Wann erscheinen Änderungen?

Die Website ist statisch und holt freigegebene Profile **beim Bauen**: jede Nacht automatisch. Sofort geht es mit
einem Supabase-Webhook:

1. GitHub: *Settings → Developer settings → Fine-grained token* mit Recht „Contents: read & write“ für das
   Repository anlegen.
2. Supabase: *Database → Webhooks → Create*: Tabelle `profiles`, Ereignis *Update*, Typ *HTTP Request*,
   `POST https://api.github.com/repos/maltlinski/tanznetzdresden_website/dispatches`,
   Header `Authorization: Bearer <token>` und `Accept: application/vnd.github+json`,
   Body `{"event_type":"profile-updated"}`.

Der Deploy-Workflow reagiert auf `profile-updated` und baut die Website in 1–2 Minuten neu.

## Datenbank

Für die selbst gepflegten Profile braucht es die zweite Migration
`supabase/migrations/20261008000000_oeffentliche_profile.sql` (im SQL-Editor ausführen). Sie legt die Felder,
die Freigabe, die Ansicht `public_profiles` und den öffentlichen Bucket `profilbilder` an. Jede Person darf
dort nur in ihren eigenen Ordner schreiben.
