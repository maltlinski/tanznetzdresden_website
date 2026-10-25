# Profil (Netzwerk) – Entwurf Oktober 2026

Aus Claude Design, „Profil v2“ in der überarbeiteten Fassung vom 25.10.2026. Umgesetzt in
`src/views/ProfilView.astro` und `src/scripts/profil.ts`, Inhalte siehe `docs/profile.md`.

Neu gegenüber der ersten Fassung von v2:
- Der Name ist etwas kleiner (bis 176 px) und darf über das Porträt laufen. Links vom schrägen Bildrand steht er voll,
  über dem Foto durchscheinend (zweite Ebene, für Screenreader verborgen; die Grenze rechnet das Skript aus).
- „Über“ ohne Seitenfoto: Text links, Angaben und Links rechts, klebend beim Scrollen.

Abweichungen:
- Die Abschnittsleiste steht als eigene Leiste unter dem Seitenkopf (nicht eingeklappt im Kopf), damit die Abschnitte
  von Anfang an erreichbar sind.
- Sehr lange Wörter im Namen verkleinern die Schrift, damit nichts aus der Seite ragt; auf dem Handy steht das Foto
  über dem Namen, dort gibt es keine Überlagerung.
- Zusätzlich: Abschnitt „Termine“, englische Fassung, Demo-Ansicht (auch mit Beispielangaben neben „Über“).
- Die Umschalter des Entwurfs (Galerie-Darstellung, Namensvorschau) sind keine Schalter auf der Website: Die
  Darstellung der Galerie wählt jede Person in „Mein Profil“.
