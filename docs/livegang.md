# Checkliste vor dem Livegang

Alle Stellen mit `[BITTE …]` suchen: `grep -rn "BITTE" src`

## Recht

- [ ] **Impressum** (`src/settings/verein.json` → `register`): Registernummer, Vertretungsregel laut Satzung
      (einzeln/gemeinsam), verantwortliche Person nach § 18 MStV, Gemeinnützigkeit.
- [ ] **Datenschutzerklärung** (`src/content/seiten/datenschutz.md`): Hosting-Anbieter, Löschfrist der Logfiles,
      Newsletter-Dienst. Der Text ist ein Muster. Bitte prüfen lassen, z. B. über den Dachverband oder eine
      Datenschutzberatung für Vereine.
- [ ] Auftragsverarbeitungsverträge mit Hoster, Newsletter-Dienst und Supabase abschließen.
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
- [ ] Interner Bereich: Supabase eingerichtet, Test-Einladung durchgespielt (docs/intern.md)
- [ ] CMS-Login eingerichtet (docs/inhalte.md)
