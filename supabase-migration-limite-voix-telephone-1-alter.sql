-- ============================================================
-- MIGRATION (PARTIE 1/2) : Limite de voix par téléphone
-- Bonplaninfos — à exécuter dans Supabase > SQL Editor
--
-- ⚠️ À faire AVANT la partie 2, et de préférence quand l'application
-- est peu utilisée (fermez les onglets de la page de l'événement).
--
-- Cette partie prend un VERROU EXCLUSIF sur event_settings.
-- Si vous obtenez "deadlock detected (40P01)" : rien n'est appliqué,
-- attendez quelques secondes et ré-exécutez. Le script est idempotent.
--
-- Vérification après exécution :
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name='event_settings' AND column_name='max_votes_per_phone';
-- ============================================================

ALTER TABLE public.event_settings
    ADD COLUMN IF NOT EXISTS max_votes_per_phone integer NOT NULL DEFAULT 50;