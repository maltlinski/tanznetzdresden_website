# Spendenseite – Entwurf Oktober 2026

Aus Claude Design. Umgesetzt in `src/views/SpendenView.astro`, Daten in `src/settings/verein.json` → `donation`.
Die Datei ist eine Referenz und läuft hier nicht eigenständig (sie braucht die Claude-Design-Umgebung `support.js`).

Aufbau: Kopf „Tanz braucht Rückhalt.“ mit Foto und Spendenkonto-Karte (Empfänger, IBAN, BIC, Verwendungszweck zum
Kopieren, GiroCode ohne Betrag, Hinweis Zuwendungsbestätigung), „Deine Spende wird Bewegung“ (drei Formate),
„Lieber anders helfen?“ (Fördermitglied, Unternehmen und Stiftungen), „Gut zu wissen“ (Fragen zum Aufklappen).
„Spenden“ steht im Menü.

Abweichungen in der Umsetzung:
- Solange keine IBAN eingetragen ist, zeigt die Karte statt Kontodaten und Code den Weg „Bankverbindung anfragen“.
- E-Mail-Adressen sind gegen Spam geschützt (Klick zeigt sie an), die Vorlage für die Zuwendungsbestätigung bleibt.
- Der GiroCode ist lila auf Weiß mit hellem Rand (Banking-Apps brauchen genug Kontrast).
- Die Formate (Foto, Titel) kommen aus `src/content/formate/`, Zeile und Text aus `donation.formate`; KEEP UP verlinkt
  zum Profitraining. Online-Spende erscheint als dritter Weg, wenn ein Link eingetragen ist.
- Die erste Frage verlinkt den vereinfachten Spendennachweis (bis 300 €). Der Hinweis auf den Freistellungsbescheid
  erscheint erst, wenn Finanzamt und Datum eingetragen sind.
- Menü behält „Journal“ (Startseite v5), Footer bleibt wie bisher.
