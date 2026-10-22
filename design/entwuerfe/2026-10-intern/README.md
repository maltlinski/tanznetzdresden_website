# Interner Bereich · Mein Status – Entwurf Oktober 2026

Aus Claude Design. Die Seite „Mein Status“ und ihr Rahmen gelten als Vorlage für den ganzen internen Bereich
(wie die Redaktion: lila Seitenleiste links). Umgesetzt in `src/layouts/Intern.astro` (Rahmen für alle internen
Seiten, die Redaktion nutzt ihn über `src/layouts/Redaktion.astro`) und `src/pages/intern/index.astro`.
Daten: `supabase/migrations/20261022000000_mitgliedschaft.sql`, Status-Regel in `src/lib/mitgliedschaft.ts`.
Einrichtung und Pflege: `docs/intern.md`.

Umgesetzt wie im Entwurf: Seitenleiste mit Logo, „Interner Bereich“, Menü und Person (Foto, Name, „Mitglied seit“),
„Website ansehen“, „Abmelden“; Ausweis im Kartenformat zum Umdrehen (Vorder-/Rückseite, Stempel bei offenem Beitrag
oder abgelaufener Mitgliedschaft, grau), Angaben zur Mitgliedschaft mit Status, Hinweis mit E-Mail bei offenem
Beitrag, „Auf dem Handy“ mit Google Wallet und PDF, Vorschau des Wallet-Passes, Blende beim Betreten.

Abweichungen:
- Menü: Mein Status, Mein Profil, Mitglieder, Dokumente; für Presse, Vorstand und Admin darunter „Redaktion“ mit
  Beiträge, Medien, Website-Inhalte, Freigaben; für den Vorstand „Verwaltung“ (Supabase). Die alte Übersicht mit
  Kacheln entfällt; der Demo-Schalter steht jetzt unter Website-Inhalte.
- Daten echt statt Beispiel: Status kommt aus der Tabelle `mitgliedschaften` (der Vorstand pflegt sie unter
  Mitglieder). Ohne Eintrag zeigt die Seite „In Vorbereitung“.
- QR-Code echt: führt auf die öffentliche Prüfseite `/mitglied/pruefen/?c=…` (zufälliger Prüfcode, zeigt nur Name,
  Nummer, Art, Status, gültig bis).
- Rückseite ohne E-Mail-Adresse (Adressen nur geschützt), dafür Anschrift und Domain.
- „Als PDF speichern“ öffnet den Druckdialog mit beiden Seiten in Kartengröße (85,6 × 54 mm); nur bei aktivem Status.
- Google Wallet braucht ein Google-Konto des Vereins und die Supabase-Funktion `ausweis`. Bis das eingerichtet ist
  (`wallet` in `src/settings/supabase.ts`), fehlen Wallet-Knopf und Vorschau. „Gespeichert“ merkt sich der Browser.
- Statt „wir aktualisieren den Ausweis in deiner Wallet automatisch“: neuer Pass nach der nächsten Beitragszahlung.
- Ausweis immer in Dunkellila (die Cyan-Variante aus dem Entwurf ist nicht umgesetzt).
