# Checkliste vor dem Livegang

Stand: Oktober 2026. Offene Platzhalter finden: `grep -rn "BITTE" src` (24 Stellen in sieben Dateien, Liste unten).
Vieles lässt sich ohne Code ändern: *Intern → Redaktion → Website-Inhalte* (Verein, Seiten, Termine …) und
*Intern → Redaktion → Texte*. Impressum, Datenschutz und rechtliche Vereinsdaten ändert nur der Vorstand.

## 1. Recht (Vorstand)

- [ ] **Impressum** (*Redaktion → Website-Inhalte → Verein*, Datei `src/settings/verein.json` → `register`):
      Registernummer (`VR …`), Vertretung laut Satzung (einzeln oder gemeinsam), Hinweis zur Gemeinnützigkeit,
      verantwortliche Person nach § 18 MStV. Im Text `src/content/seiten/impressum.md`: Fotonachweis je Bild.
- [ ] **Datenschutzerklärung** (`src/content/seiten/datenschutz.md` + `en/`): Der Text ist ein Muster. Ergänzen:
      Hoster und Löschfrist der Logfiles, Newsletter-Dienst, ggf. Statistik. Neu seit dem Muster und zu erwähnen:
      Supabase (interner Bereich, Profile, Fotos, Mitgliedschaften, Open Calls, E-Mail-Versand der Einladungen und
      Erinnerungen), GitHub Pages,
      optional Google Wallet (nur wenn eingeschaltet). Bitte prüfen lassen, z. B. über den Dachverband oder eine
      Datenschutzberatung für Vereine.
- [ ] **Auftragsverarbeitungsverträge** (Art. 28 DSGVO) mit Hoster, Supabase (DPA im Dashboard bei den
      Organisationseinstellungen) und Newsletter-Dienst abschließen. Supabase-Projekt in der Region EU (Frankfurt) prüfen.
- [ ] **Barrierefreiheitserklärung** (`src/content/seiten/barrierefreiheit.md`): Stelle `[BITTE PRÜFEN]` klären.
- [ ] **Englische Rechtstexte** (`src/content/seiten/en/`) nach jeder Änderung der deutschen mitziehen.
- [ ] **Gestaltung**: Vereinbarung zwischen Malte Leonard Herz und dem Verein über die Nutzung der Gestaltung
  (wofür, ob der Verein ändern darf, was nach einem Wechsel gilt, Nennung). Die Website nennt die Gestaltung im Fuß
  und im Impressum (`src/settings/gestaltung.ts`), die Rechte stehen in `LICENSE`.
- [ ] **Bildrechte**: für alle Fotos auf der Website geklärt, Nachweise in der Mediathek (*Intern → Medien*) eingetragen.
- [ ] Postfächer `kontakt@` und `vorstand@tanznetzdresden.de` gibt es und jemand liest sie (`verein.json` → `emails`).

## 2. Förderer (Vorstand, mit den Zuwendungsbescheiden)

Gepflegt unter *Redaktion → Website-Inhalte → Verein → Förderer* (Logo hochladen, Pflichttext eintragen).
Maßgeblich ist immer der Wortlaut im jeweiligen Bescheid bzw. dessen Anlage zur Öffentlichkeitsarbeit.

- [ ] **Welche Förderungen laufen noch?** Nur zeigen, was aktuell gefördert wird oder laut Bescheid weiter genannt
      werden muss. NEUSTART KULTUR (über den Dachverband Tanz, Programme DIS-TANZEN u. a.) lief 2020–2023 –
      Logo und Eintrag „Dachverband Tanz“ entfernen, wenn keine Nennungspflicht mehr besteht.
- [ ] **BKM**: Seit Mai 2025 heißt das Amt „Der Beauftragte der Bundesregierung für Kultur und Medien“
      (Wolfram Weimer); das Logo wurde 2025 entsprechend geändert. Die Datei `src/assets/foerderer/bkm.png` zeigt
      noch „Die Beauftragte“. Neue Logodatei aus den Unterlagen zum Bescheid bzw. von kulturstaatsminister.de
      holen (Read-me der BKM beachten: Logo nicht verändern, nicht verzerren, Wort- und Bildmarke zusammen;
      auf Websites mit kulturstaatsminister.de verlinkt) und unter *Förderer → Logo* hochladen. Name ist schon
      angepasst.
- [ ] **Landeshauptstadt Dresden, Amt für Kultur und Denkmalschutz**: offizielles Förderlogo und ggf. Pflichttext
      beim Amt anfragen (kultur-denkmalschutz@dresden.de); das jetzige Logo ist aus der Förderer-Grafik ausgeschnitten.
- [ ] **Kulturstiftung des Freistaates Sachsen**: Logodatei und Pflichttext laut Bescheid prüfen (der jetzige Text
      „… mitfinanziert durch Steuermittel auf der Grundlage des vom Sächsischen Landtag beschlossenen Haushaltes“
      ist der übliche Wortlaut).
- [ ] Größen: Förderlogos etwa so groß wie das eigene Logo, keins dominiert (*Förderer → Höhe des Logos*).

## 3. Vereinsdaten und Geld (Vorstand)

- [ ] **Mitgliedsbeitrag** (`verein.json` → `membership.fee`, auch englisch), **Mitgliedsantrag** und **Satzung**
      als PDF (*Redaktion → Website-Inhalte → Verein*). Klären, ob die Satzung Fördermitglieder vorsieht.
- [ ] **Spenden** (`verein.json` → `donation`): IBAN/BIC – erst dann erscheinen Bankverbindung und GiroCode.
      Texte zu den Formaten (`donation.formate`) und die Zusage „fließt vollständig dorthin“ abstimmen.
- [ ] **Freistellungsbescheid** (`verein.json` → `taxExemption`: Finanzamt, Steuernummer, Datum, Zeitraum). Ohne ihn
      ist der vereinfachte Spendennachweis (`/spenden/nachweis/`) ungültig und der Hinweis auf die
      Gemeinnützigkeit erscheint nicht.
- [ ] **Transparenz-Seite** (`src/content/seiten/transparenz.md` + `en/`): Tätigkeitsbericht, Personal,
      Mittelherkunft und -verwendung des letzten Jahres, Mitgliedschaften in Verbänden. Jährlich aktualisieren.
- [ ] Optional Online-Spende (z. B. betterplace) – externer Dienst, braucht dann Einwilligung und Datenschutztext.

## 4. Inhalte (Presse und Vorstand)

- [ ] **Termine**: Platzhalter aus dem Entwurf durch echte ersetzen (*Intern → Kalender*), alte löschen.
- [ ] **Orte** (*Kooperationen → Orte*): Adressen prüfen und ergänzen (TENZA Schmiede, Palucca, Semperoper, Staatsoperette,
  HELLERAU fehlen noch). Der Tanzkalender zeigt sie unter dem Ort eines Termins.
- [ ] **Alte Beiträge** (WordPress, docs/news.md#alte-beiträge-aus-wordpress): Bericht `docs/wordpress-import.md`
      durchsehen (Rubriken, Fristen, Hinweise), Bildbeschreibungen der wichtigsten Titelbilder ergänzen. **Bilder und
      PDFs übernehmen, solange die alte Website noch läuft** – danach gibt es sie nicht mehr.
- [ ] **KEEP UP**: Dozent:innen einplanen, Beschreibungen anstoßen (*Intern → Kalender*, *Meine Trainings*).
- [ ] **Fotos**: Formate *Welttanztag* und *Bodies & Textiles* nutzen fremde Fotos – eigene ergänzen.
- [ ] **Kooperationen** (`src/content/kooperation/`): Partnerliste und Rollen mit den Partnern abstimmen,
      Koordinaten der Orte prüfen, Website-Links ergänzen.
- [ ] **Texte** (*Intern → Redaktion → Texte*, Textbuch zum Durchlesen): einmal komplett gegenlesen, Englisch prüfen.
- [ ] **Leichte Sprache**: von Prüfer:innen aus der Zielgruppe gegenlesen lassen.
- [ ] **Newsletter**: Dienst wählen und `verein.json` → `newsletter.action` eintragen (sonst Anmeldung per E-Mail).
- [ ] Telegram-Link für KEEP UP (`verein.json` → `social.telegram`, leer = ausgeblendet), Koordinaten der Karte
      (`verein.json` → `map`).

## 5. Technik

**Website**

- [ ] Domain und HTTPS (docs/deployment.md); die Adresse kommt aus `SITE_URL` bzw. `astro.config.mjs`.
      Beim Umzug der Domain leiten die alten Beitragsadressen (`/<beitrag>/`) automatisch auf `/news/<beitrag>/`
      weiter (`src/content/news/weiterleitungen.json`).
- [ ] **Workflow von Hand übernehmen**: `.github/workflows/deploy.yml` reagiert noch nicht auf `news-updated`. Die
      Fassung aus `docs/github-workflows/deploy.yml` hineinkopieren (docs/github-workflows/README.md), sonst
      erscheinen News aus dem internen Bereich erst nachts.
- [ ] Statistik: entscheiden, ob und welche (Matomo cookielos / Plausible), `verein.json` → `analytics`,
      Datenschutz-Abschnitt anpassen.
- [ ] Demo-Ansicht (Beispielprofile) gilt nur im eigenen Browser; vor Screenshots und Pressebildern mit `?demo=0` aus.
- [ ] Optional: CMS unter `/admin/` für Admins (docs/inhalte.md). Für alle anderen reicht der interne Bereich.

**Supabase** (docs/intern.md)

- [ ] Alle **dreizehn Migrationen** aus `supabase/migrations/` der Reihe nach im SQL-Editor ausgeführt
      (bis `20261028000000_kalender_eintritt.sql`).
- [ ] *Authentication*: Selbst-Registrierung aus, Site URL gesetzt, **Redirect URLs** `…/intern/**` und
      `…/en/intern/**`.
- [ ] **E-Mails** (*Authentication → Emails*): Vorlagen für Einladung, Login-Link und Passwort auf Deutsch (und
      Englisch, Beispiel in docs/intern.md), eigener SMTP-Server für mehr als ein paar Mails pro Stunde.
- [ ] **Funktionen** (*Edge Functions*) angelegt und Secrets eingetragen:
  - [ ] `inhalte` – Redaktion, Texte, Neubau der Website (`GITHUB_TOKEN`, `GITHUB_REPO`; docs/redaktion.md).
        Nach jeder Änderung an `supabase/functions/inhalte/index.ts` neu einspielen (zuletzt: Schutz der
        Rechtstexte für Nicht-Vorstand).
  - [ ] `einladen` – Mitglieder einladen (`SITE_URL`; docs/intern.md → „Mitglieder einladen“).
  - [ ] optional `erinnerungen` – Fristen der Open Calls per Mail (SMTP-Secrets, täglicher Cron, dann
        `erinnerungen: true` in `src/settings/supabase.ts`; docs/open-calls.md).
  - [ ] optional `ausweis` – Google Wallet (Google-Schlüssel, dann `wallet: true` in `src/settings/supabase.ts`).
- [ ] Ersten Vorstand im *Table Editor → profiles* ernennen, danach alles unter *Intern → Mitglieder*.

**Einmal mit echten Personen durchspielen**

- [ ] Einladen (*Intern → Mitglieder*), Mail kommt an, Passwort festlegen, auch eine englische Einladung.
- [ ] Mitgliedschaft anlegen, Beitrag buchen, Ausweis als PDF, QR-Code auf `/mitglied/pruefen/` prüfen.
- [ ] Profil mit Foto ausfüllen, öffentlich schalten, unter *Redaktion → Freigaben* freigeben, erscheint unter Netzwerk.
- [ ] News: Rolle „Presse“ vergeben, Testbeitrag schreiben, veröffentlichen, zurückziehen (Website baut neu).
- [ ] Texte: einen Text ändern und zurückholen; mit Rolle Presse darf „Rechtliches“ nicht änderbar sein.
- [ ] Open Calls: als Mitglied einen Call melden, als Presse prüfen und freigeben, merken, Kalenderdatei öffnen.
- [ ] KEEP UP: Dozent:in einplanen, Beschreibung schreiben und veröffentlichen, im Kalender auf `/profitraining/` sehen.

## Offene Platzhalter `[BITTE …]` (Stand dieser Liste)

| Datei | Was |
|---|---|
| `src/settings/verein.json` | Registernummer, Vertretung, Gemeinnützigkeit, Mitgliedsbeitrag, Finanzamt, Steuernummer, Datum und Zeitraum des Freistellungsbescheids |
| `src/content/seiten/impressum.md` | Fotonachweis je Bild |
| `src/content/seiten/datenschutz.md` | Hoster und Löschfrist, Newsletter-Dienst, Statistik |
| `src/content/seiten/transparenz.md` | Tätigkeitsbericht, Personal, Einnahmen und Ausgaben, Verbände, Förderungen |
| `src/content/seiten/barrierefreiheit.md` | eine Angabe prüfen |
| `src/views/SpendenView.astro`, `SpendenNachweisView.astro` | kein Eintrag nötig: blenden Angaben mit Platzhalter automatisch aus |
