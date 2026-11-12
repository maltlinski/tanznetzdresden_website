/**
 * Testlauf auf GitHub (Workflow „CI“, .github/workflows/ci.yml): gebaut wird ein fester Stand – nur die Dateien
 * (ohne Daten aus Supabase) und die ursprünglichen Texte aus texte.json (`ursprung`, alles sichtbar). So verschieben
 * Änderungen der Redaktion die Erwartungen der Tests nicht. Die echte Website (Workflow „Deploy“) zeigt alles aktuell.
 * Lokal wie auf GitHub bauen: `GITHUB_WORKFLOW=CI npm run build`.
 */
export const testlauf = typeof process !== 'undefined' && process.env.GITHUB_WORKFLOW === 'CI';
