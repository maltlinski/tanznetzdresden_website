# Texte der Website (für die Pressestelle)

Unter *Intern → Redaktion → Texte* ändert die Pressestelle (und Vorstand, Admin) die festen Texte der Website:
Überschriften, Knöpfe, Hinweise, Einleitungen. Termine, News, Formate, Profile und Textseiten wie das Impressum
haben eigene Bereiche (siehe [redaktion.md](redaktion.md)).

Bisher dabei: **Startseite**, **Netzwerk** und **Profil einer Person**. Weitere Seiten kommen nach und nach dazu.

## So geht's

- Links eine Seite wählen. Rechts stehen ihre Texte in der Reihenfolge, in der sie auf der Seite erscheinen,
  jeweils mit einem Satz, wo der Text steht. „Auf der Website ansehen“ öffnet die Seite.
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
| `src/settings/texte.json` | alle Texte: Seite (`titel`, `pfad`) → `abschnitte` → `texte`; je Text `wo`, `de`, `en`, optional `zeilen`, `max`; von der Redaktion gesetzt: `ursprung`, `enPruefen` |
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
