/**
 * Verbindung zu Supabase (interner Bereich, News aus der Redaktion, selbst gepflegte Profile).
 *
 * Beide Werte stehen im Supabase-Dashboard unter *Project Settings → API* und sind öffentlich:
 * Sie landen ohnehin im Browser. Die Daten schützt Row Level Security (supabase/migrations).
 * Niemals den `service_role`-Schlüssel hier eintragen!
 *
 * - `url`: nur die Projekt-Adresse, ohne /rest/v1/ dahinter.
 * - Leer lassen (''), um den internen Bereich abzuschalten.
 * - Die Umgebungsvariablen PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY (z. B. in `.env`
 *   für ein Testprojekt) haben Vorrang vor diesen Werten.
 */
export const supabase = {
  url: 'https://nfwbotgkvyysfemjwtem.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md2JvdGdrdnl5c2ZlbWp3dGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0Njc5MzIsImV4cCI6MjEwNzA0MzkzMn0.mCStH2bwMFjdfG_1sZzWThWF-HdGdeQPwwjizo7Bgus',
};
