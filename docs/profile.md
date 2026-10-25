# Öffentliche Profile der Künstler:innen

Unter `/netzwerk/` (englisch `/en/network/`) hat jede Person aus dem Netzwerk eine eigene Seite. Aufbau (Entwurf
„Profil v2“, Stand 25.10.2026, `design/entwuerfe/2026-10-profil/`), jeder Abschnitt erscheint nur, wenn er gefüllt ist:

| Abschnitt | Inhalt |
|---|---|
| Kopf | großer Name, Porträt rechts mit schrägem Rand; ein langer Name läuft über das Foto und ist dort durchscheinend. Pronomen · Tätigkeit · Basis, Vorstandsfunktion, „Anfrage senden“, „Showreel“ |
| Leiste | klebt beim Scrollen unter dem Seitenkopf: Name, Abschnitte (aktueller markiert), „Anfrage“, Fortschritt |
| 01 Pitch | „In einem Satz“: Wörter leuchten beim Scrollen auf, Teil nach dem Doppelpunkt pink; Schwerpunkte darunter |
| 02 Galerie | Filmstreifen (zieht beim Scrollen seitlich vorbei, auf dem Handy zum Wischen), Mosaik oder Raster; Vollbild mit Pfeiltasten |
| 03 Über | Profiltext links (erster Absatz groß), rechts klebend die Angaben (Ausbildung, Techniken, Sprachen, Arbeitsorte, Basis, Körpergröße, Verfügbar) und Links |
| 04 Arbeiten | Stücke und Projekte mit Jahr und Ort, neueste oben |
| 05 Termine | nächste Termine, an denen die Person mitwirkt |
| 06 Kontakt | „Mit … arbeiten.“, offen für (Kooperationen, Engagements …), E-Mail (geschützt, mit Vorlage und „Kopieren“), Instagram-Nachricht |

Die Nummern zählt CSS (`counter`), sie stimmen also auch, wenn Abschnitte fehlen. Bei „Bewegung reduzieren“ gibt es
keine Animationen, der Filmstreifen ist dann eine wischbare Reihe. Code: `src/views/ProfilView.astro`,
`src/scripts/profil.ts`, gemeinsame Listen (offen für, Galerie-Darstellung, Angaben) in `src/lib/profil-felder.ts`.

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
  vimeo: "https://vimeo.com/…"     # Video oder Showreel (auch YouTube oder eigene Seite)
  email: "name@example.org"       # erscheint verschlüsselt (Bot-Schutz)
  profession: "Tänzerin und Choreografin"    # + profession_en
  base: "Dresden-Neustadt"
  pitch: "Ich bringe Tanz an Orte, an denen ihn niemand erwartet: Höfe, Haltestellen, leere Läden."  # + pitch_en
  openFor: [kooperationen, engagements, workshops, unterricht, auftraege]
  works:
    - { year: 2026, title: "Echo, draußen", place: "Welttanztag · Öffentlicher Raum" }
  education: "Palucca Hochschule für Tanz Dresden"
  techniques: "Release, Contact Improvisation"
  languages: "Deutsch, Englisch"
  regions: "Dresden, Leipzig · reisebereit"
  height: "168 cm"
  available: "ab Januar 2027"
  gallery:                         # Fotos in src/assets/personen/
    - photo: ../assets/personen/name-probe.jpg
      caption: "Probe im Hof"      # + caption_en; beschreibt das Foto auch für Screenreader
      credit: "Name Fotograf:in"
  galleryLayout: filmstreifen      # filmstreifen | mosaik | raster
```

Alles außer `name` und `roles` ist freiwillig. In der Redaktion (*Website-Inhalte → Personen*) stehen dieselben Felder.

**2. Selbst gepflegt (interner Bereich):** Mitglieder öffnen *Intern → Mein Profil*, setzen den Haken
„Öffentliches Profil“, wählen eine Adresse und füllen Tätigkeit, Basis, „In einem Satz“, Text, Schwerpunkte und Porträt
aus. Aufklappbar darunter: Galerie (bis 12 Fotos, mit Bildunterschrift, Reihenfolge und Darstellung), Arbeiten,
Ausbildung/Sprachen/…, Kontakt (öffentliche E-Mail, offen für, Video) und die englische Fassung.

- **Presse, Vorstand oder Admin geben frei** (*Intern → Redaktion → Freigaben*). Erst dann erscheint das Profil.
  Ändert eine Person später ihre Adresse, muss neu freigegeben werden. Textänderungen brauchen keine neue Freigabe.
- **Fotos:** Ein neues Foto wartet auf Freigabe, bis dahin bleibt das bisherige online. Unter *Freigaben* steht
  „bisher“ neben „neu“. Abgelehnte und ersetzte Fotos werden gelöscht.
- **Galerie:** Jedes neue Galeriefoto wartet ebenso auf Freigabe (einzeln oder „Alle Galeriefotos freigeben“). Wird ein
  neues Profil freigegeben, gehen seine Galeriefotos mit online. Bildunterschriften ändern braucht keine neue Freigabe.
  Abgelehnte Fotos werden gelöscht.
- Nimmt die Person dieselbe Adresse wie ihr Eintrag in `personen.yaml` (z. B. `rika-yotsumoto`), ergänzt der
  selbst gepflegte Inhalt diesen Eintrag. Vorstandsfunktion und Startseiten-Auswahl bleiben aus der Datei.
  Steht der Name schon mit anderer Adresse auf der Website, warnt die Freigaben-Seite vor einem doppelten Profil.
- Neue Personen bekommen automatisch eine eigene Seite.

## Wo das Profil erscheint

Ein Profil, eine Person, überall gleich (Name, Foto, Profil-Link):

| Wo | Was |
|---|---|
| `/netzwerk/` und Startseite | Karte bzw. Name mit Foto, Schwerpunkten, Text |
| `/netzwerk/<adresse>/` | ganze Profilseite mit den nächsten Terminen |
| Termine | „Mit …“ auf der Terminseite, wenn die Person bei *Mitwirkende* eingetragen ist |
| `/profitraining/` | Kachel im Dozent:innen-Mosaik (Foto aus dem Profil, ohne Foto ein Platzhalter) |

In der Redaktion stehen freigegebene Mitgliederprofile bei *Mitwirkende* (Termine) und *Person* (Dozent:innen) mit
zur Auswahl, gekennzeichnet als „(Mitgliederprofil)“. Nimmt jemand ein solches Profil später von der Website, bleibt
der Termin bzw. das Training stehen, nur ohne Link.

## Wann erscheinen Änderungen?

Die Website ist statisch und holt freigegebene Profile **beim Bauen**: jede Nacht automatisch und **sofort nach jeder
Freigabe**. Dafür stößt die Freigaben-Seite über die Supabase-Funktion `inhalte` einen Neubau an (sie braucht den
GitHub-Schlüssel der Redaktion, docs/redaktion.md). Ohne sie erscheint die Freigabe mit dem nächtlichen Update.

Textänderungen an schon freigegebenen Profilen erscheinen mit dem nächsten Neubau (spätestens nachts). Wer das sofort
will, legt zusätzlich einen Supabase-Webhook an:

1. GitHub: *Settings → Developer settings → Fine-grained token* mit Recht „Contents: read & write“ für das
   Repository anlegen.
2. Supabase: *Database → Webhooks → Create*: Tabelle `profiles`, Ereignis *Update*, Typ *HTTP Request*,
   `POST https://api.github.com/repos/maltlinski/tanznetzdresden_website/dispatches`,
   Header `Authorization: Bearer <token>` und `Accept: application/vnd.github+json`,
   Body `{"event_type":"profile-updated"}`.

Der Deploy-Workflow reagiert auf `profile-updated` und baut die Website in 1–2 Minuten neu.

## Datenbank

Für die selbst gepflegten Profile braucht es die Migrationen
`supabase/migrations/20261008000000_oeffentliche_profile.sql` (Felder, Freigabe, Ansicht `public_profiles`, öffentlicher
Bucket `profilbilder`, jede Person schreibt nur in ihren eigenen Ordner) und
`supabase/migrations/20261013000000_freigaben.sql` (wartende Fotos `photo_pending`, Funktion `freigabe()` für Presse,
Vorstand und Admin) und `supabase/migrations/20261020000000_profil_seite.sql` (Felder der neuen Profilseite, Galerie als
Liste `gallery` mit Merker `frei`, den nur die Redaktion setzt (Trigger `profiles_galerie`), Funktion `galerie_freigabe()`,
öffentliche Ansicht nur mit freigegebenen Fotos). Alle im SQL-Editor ausführen. Ohne die letzte Migration bleibt
*Mein Profil* wie bisher, die neuen Bereiche sind verborgen.

Wartende Fotos liegen schon im öffentlichen Bucket, unter einem nicht erratbaren Namen. Verlinkt sind sie erst nach
der Freigabe.

## Demo-Ansicht (zum Weiterentwickeln)

Solange kaum echte Profile gefüllt sind, zeigt die Demo-Ansicht, wie die Seiten mit Inhalt aussehen: Leere Profile
bekommen ein Beispielfoto (aus `src/assets/photos/`), einen Beispieltext („Beispieltext: …“), Schwerpunkte, einen
Beispielsatz, Tätigkeit, Galerie, Arbeiten und „offen für“. Echte Angaben werden nie ersetzt.

- Einschalten: *Intern → Übersicht → Demo-Ansicht* (Presse, Vorstand, Admin) oder eine Adresse mit `?demo=1` öffnen.
- Ausschalten: „Ausschalten“ im Band unten links, der Schalter oder `?demo=0`.
- Gilt nur im eigenen Browser (localStorage `tndd-demo`). Besucher:innen und Suchmaschinen sehen nichts davon.
- Code: `src/lib/demo.ts` (Beispiele), Klassen `demo-an`/`demo-aus` (`src/styles/global.css`), Band
  `src/components/DemoBand.astro`.
