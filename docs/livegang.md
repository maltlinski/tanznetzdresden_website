# Checkliste vor dem Livegang

Alle Stellen mit `[BITTE …]` suchen: `grep -rn "BITTE" src`

## Recht

- [ ] **Impressum** (`src/settings/verein.json` → `register`): Registernummer, Vertretungsregel laut Satzung
      (einzeln/gemeinsam), verantwortliche Person nach § 18 MStV, Gemeinnützigkeit.
- [ ] **Datenschutzerklärung** (`src/content/seiten/datenschutz.md`): Hosting-Anbieter, Löschfrist der Logfiles,
      Newsletter-Dienst. Der Text ist ein Muster. Bitte prüfen lassen, z. B. über den Dachverband oder eine
      Datenschutzberatung für Vereine.
- [ ] Auftragsverarbeitungsverträge mit Hoster, Newsletter-Dienst und Supabase abschließen.
- [ ] **Förderhinweis**: Die fünf Logos (Stadt Dresden, Kulturstiftung Sachsen, BKM, NEUSTART KULTUR,
      Dachverband Tanz) sind aus der Förderer-Grafik des Vereins ausgeschnitten. Besser: die offiziellen
      Logodateien der Förderer (SVG/PDF, z. B. das Förderlogo der Stadt auf dresden.de) in
      `src/assets/foerderer/` ablegen und in `verein.json` → `funders[].logo` eintragen.
      BKM-Logo zeigt noch „Die Beauftragte“ – seit Mai 2025 „Der Beauftragte“; Fassung laut Bescheid prüfen.
      Prüfen, ob alle Förderungen noch laufen (NEUSTART KULTUR endete 2023) und ob weitere Pflichttexte
      nötig sind (`funders[].notice`).
- [ ] **Spenden** (`verein.json` → `donation`, `taxExemption`): IBAN/BIC eintragen (erst dann erscheinen
      Bankverbindung und GiroCode), Wirkungs-Beispiele mit echten Kosten abgleichen, Freistellungsbescheid
      (Finanzamt, Steuernummer, Datum, Zeitraum) eintragen – ohne ihn ist der vereinfachte Spendennachweis
      ungültig. Klären, ob die Satzung Fördermitglieder vorsieht. Online-Spende optional (z. B. betterplace).
- [ ] **Transparenz-Seite** (`src/content/seiten/transparenz.md` + `en/`): Freistellungsbescheid, Tätigkeitsbericht,
      Mittelherkunft und -verwendung jährlich eintragen.
- [ ] **Leichte Sprache**: Text von Prüfer:innen aus der Zielgruppe gegenlesen lassen.
- [ ] **Englische Rechtstexte** nach Änderungen an den deutschen mitziehen (`src/content/seiten/en/`).
- [ ] **Fotonachweis** im Impressum-Text (Fotograf:in je Bild). Bildrechte für die Website klären.
- [ ] E-Mail `vorstand@tanznetzdresden.de` existiert? (`verein.json` → `emails`)

## Inhalte

- [ ] **Termine**: Die Termine aus dem Entwurf sind Platzhalter. Echte Termine eintragen.
- [ ] Formate *Welttanztag* und *Bodies & Textiles* nutzen fremde Fotos. Eigene Bilder ergänzen.
- [ ] Mitgliedsbeitrag, Mitgliedsantrag und Satzung als PDF (`verein.json` → `membership`).
- [ ] Telegram-Link für KEEP UP (`verein.json` → `social.telegram`). Leer = ausgeblendet.
- [ ] Koordinaten der Karte prüfen (`verein.json` → `map`).
- [ ] Newsletter-Dienst wählen und `newsletter.action` eintragen (sonst Anmeldung per E-Mail).

## Technik

- [ ] Domain und HTTPS (docs/deployment.md)
- [ ] Interner Bereich: Supabase eingerichtet, **beide** Migrationen eingespielt, Test-Einladung durchgespielt (docs/intern.md)
- [ ] Profile: Freigabe-Ablauf mit dem Vorstand abstimmen, optional Webhook für sofortige Aktualisierung (docs/profile.md)
- [ ] Statistik: entscheiden, ob und welche (Matomo cookielos / Plausible); Datenschutz-Abschnitt anpassen
- [ ] CMS-Login eingerichtet (docs/inhalte.md)
