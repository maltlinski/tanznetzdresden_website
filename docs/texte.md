# Texte der Website (für die Pressestelle)

Unter *Intern → Redaktion → Texte* ändert die Pressestelle (und Vorstand, Admin) die festen Texte der Website:
Überschriften, Knöpfe, Hinweise, Einleitungen. Termine, News, Formate, Profile und Textseiten wie das Impressum
haben eigene Bereiche (siehe [redaktion.md](redaktion.md)).

Dabei sind alle öffentlichen Seiten: **Auf allen Seiten** (Menü, Fuß, Newsletter, Cookie-Hinweis, Förderer,
Titel im Browser-Tab), Startseite, Netzwerk, Profil, Tanzkalender und Termine, News, Profitraining, Über uns,
Kooperationen, Mitglied werden, Spenden, Kontakt, Barrierefreiheit und Textseiten, die 404-Seite, die Prüfseite für
den Mitgliedsausweis und **Rechtliches** (Impressum, Datenschutz, Transparenz, Spendennachweis).

**Rechtliches ändert nur der Vorstand** (wie Impressum und Datenschutz unter Website-Inhalte). Die Pressestelle sieht
diese Texte nur zum Lesen; die Funktion `inhalte` lehnt Änderungen daran ab. Damit diese Prüfung greift, muss die
Funktion `inhalte` nach diesem Update einmal neu bereitgestellt werden (docs/redaktion.md, „Funktion in Supabase anlegen“).

Nicht hier, weil sie anderswo gepflegt werden: Inhalte wie Termine, News, Formate, Profile, Partner, Arbeitsgruppen,
die Säulen unter „Haltung“, die Texte der Seite Profitraining (Überschrift, Infos) und die Textseiten selbst
(Website-Inhalte). Bewusst im Code bleiben Beschriftungen nur für Screenreader, die Namen der Kategorien (Bühne,
Training, Diskurs), Hinweise der Demo-Ansicht und der ganze interne Bereich.

## So geht's

- Links eine Seite wählen (auf dem Handy oben im Auswahlfeld). Die Seiten sind gruppiert wie die Website:
  *Auf jeder Seite* (Menü, Fuß, Newsletter, Cookie-Hinweis), *Seiten im Menü*, *Weitere Seiten*, *Selten gebraucht*.
  Unter der gewählten Seite stehen ihre Abschnitte zum Hinspringen.
- Rechts stehen die Texte in der Reihenfolge, in der sie auf der Seite erscheinen, jeweils mit einem Satz, wo der
  Text steht. „Auf der Website ansehen“ öffnet die Seite.
- **Außerdem auf dieser Seite:** Unter manchen Abschnitten führt ein Link dorthin, wo der Rest gepflegt wird, z. B.
  die Arbeitsgruppen, die Vereinsdaten (Adresse, Bankverbindung) oder *Intern → Kalender* für die Termine selbst.
- Deutsch links, Englisch rechts. Ist Englisch leer, zeigt die englische Seite den deutschen Text.
- **Suchen** findet Texte über alle Seiten (auch „Wo steht ‚Anfrage senden‘?“).
- Beliebig viele Texte ändern, dann unten **einmal Speichern**. Nach 2–3 Minuten ist alles online. Wer die Seite
  mit ungespeicherten Änderungen verlässt, wird gefragt.
- **Änderungen verwerfen** setzt alles Ungespeicherte zurück.

## Regeln, auf die die Seite achtet

- **Zwei Zeilen:** Manche Überschriften haben zwei Zeilen (die zweite oft in Magenta). Neue Zeile mit der
  Eingabetaste; die Seite prüft, dass es genau so viele Zeilen bleiben.
- **Platzhalter** in geschweiften Klammern, z. B. `{name}` (Vorname der Person) oder `{zahl}`, bleiben stehen.
  Die Website setzt dort den passenden Wert ein. Sie dürfen an eine andere Stelle im Satz rücken.
- **Länge:** Wo der Platz knapp ist, zeigt ein Zähler die erlaubte Zahl der Zeichen.
- Kein HTML, keine spitzen Klammern. Texte wie gewohnt in Wir-Form und mit Doppelpunkt gendern (Tänzer:innen).

## Englisch prüfen und ursprünglicher Text

- Wird nur der deutsche Text geändert, steht beim Text „Englisch prüfen“ (Filter oben zeigt alle). Englisch
  anpassen oder „Englisch passt so“ wählen und speichern.
- Bei jedem schon einmal geänderten Text holt **Ursprünglichen Text zurückholen** die Fassung von vor der ersten
  Änderung zurück (Filter „Von der Redaktion geändert“ zeigt alle).
- Jede Speicherung steht mit Namen im Verlauf der Redaktion und lässt sich auch dort zurückholen.

## Textbuch

*Texte → Alle Texte zum Durchlesen* zeigt alle Texte am Stück, Seite für Seite, Deutsch und Englisch, mit Hinweis,
wo sie stehen. Zum Lesen, Abstimmen im Vorstand und Ausdrucken (Knopf „Drucken oder als PDF speichern“). Es zeigt
den Stand der Website, also nach einer Speicherung erst, wenn die Website neu gebaut ist. Geändert wird auf der
Seite „Texte“.

## Für Entwickler:innen

| Datei | Inhalt |
|---|---|
| `src/settings/texte.json` | alle Texte: Seite (`titel`, `gruppe`, `pfad`, optional `nurVorstand`) → `abschnitte` (`titel`, optional `auch`: Links zu dem, was anderswo gepflegt wird) → `texte`; je Text `wo`, `de`, `en`, optional `zeilen`, `max`; von der Redaktion gesetzt: `ursprung`, `enPruefen` |
| `supabase/functions/inhalte/index.ts` | `textePruefen()`: Seiten mit `nurVorstand` ändert nur Vorstand/Admin |
| `src/lib/texte.ts` | `texte(lang, seite, abschnitt)` für die Seiten (typisiert: Tippfehler fallen beim Build auf), `zeilen()`, `fuellen()` |
| `src/lib/texte-regeln.ts` | Prüfung (Platzhalter, Zeilen, Länge), Übernahme von Änderungen, Format der Datei (ein Text pro Zeile) |
| `src/pages/intern/redaktion/texte/` | Seite „Texte“ und `textbuch/` |
| `tests/redaktion.spec.ts` | Tests „Texte: …“ (prüfen auch, dass jeder Text in der Datei die Regeln einhält) |

Einen Text hinzufügen: in `texte.json` an der passenden Stelle (Reihenfolge wie auf der Seite) mit `wo`, `de`, `en`
eintragen und in der Komponente mit `texte(...)` lesen. Zweizeilige Überschriften als ein Text mit `\n` und
`"zeilen": 2`, Werte über Platzhalter (`fuellen(t.alle, { zahl })`). Eine neue Seite bekommt einen eigenen
Eintrag auf oberster Ebene. Beschriftungen nur für Screenreader bleiben mit `tr()` im Code.

Gespeichert wird über die Funktion `inhalte` (wie alle Redaktionsdateien, `src/settings/*.json` ist erlaubt); bei
gleichzeitigen Änderungen meldet sie einen Konflikt, die Seite lädt dann neu.
