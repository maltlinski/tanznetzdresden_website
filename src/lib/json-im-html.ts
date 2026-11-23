/**
 * Daten als JSON in ein <script> der Seite schreiben (`set:html`), z. B. für Suchmaschinen (ld+json) oder als
 * Startdaten für ein Skript. `<` wird zu <: Steht in einem Text „</script>“ (Profiltext, Termintitel …),
 * kann er das Skript sonst beenden und eigenen Code in die Seite bringen. JSON.parse liest < wieder als „<“.
 * Immer diese Funktion nehmen, nie `set:html={JSON.stringify(…)}` (geprüft von tests/sicherheit.spec.ts).
 */
export const jsonImHtml = (wert: unknown): string => JSON.stringify(wert).replace(/</g, '\\u003c');
