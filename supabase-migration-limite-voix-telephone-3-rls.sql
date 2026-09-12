-- ============================================================
-- MIGRATION (PARTIE 3/3) : Politiques RLS pour modifier
-- la limite de voix par téléphone depuis le panneau admin.
-- Bonplaninfos — à exécuter dans Supabase > SQL Editor
--
-- ⚠️ À exécuter APRÈS les parties 1 et 2, de préférence quand
-- l'application est peu utilisée (CREATE POLICY pose un verrou).
--
-- Problème corrigé : "new row violates row-level security policy
-- for table event_settings" (42501) lors de la sauvegarde depuis
-- le panneau admin (EventDetailPage). Les fonctions Netlify
-- utilisent le service_role (non concerné), mais le client
-- navigateur est soumis à la RLS.
--
-- Politiques ajoutées (idempotentes, sans risque si re-exécutées) :
--  - lecture publique (indispensable au fonctionnement de la page)
--  - mise à jour par l'ORGANISATEUR de l'événement uniquement
--  - insertion par l'organisateur (ligne de réglage si absente)
-- ============================================================

DO $$
BEGIN
    -- Lecture : n'importe qui (page événement publique)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'event_settings'
          AND policyname = 'event_settings_public_read'
    ) THEN
        CREATE POLICY "event_settings_public_read" ON public.event_settings
            FOR SELECT USING (true);
    END IF;

    -- Mise à jour : uniquement l'organisateur de l'événement
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'event_settings'
          AND policyname = 'event_settings_organizer_update'
    ) THEN
        CREATE POLICY "event_settings_organizer_update" ON public.event_settings
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.events e
                    WHERE e.id = event_settings.event_id
                      AND e.organizer_id = auth.uid()
                )
            );
    END IF;

    -- Insertion (ligne de réglage absente) : organisateur uniquement
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'event_settings'
          AND policyname = 'event_settings_organizer_insert'
    ) THEN
        CREATE POLICY "event_settings_organizer_insert" ON public.event_settings
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.events e
                    WHERE e.id = event_settings.event_id
                      AND e.organizer_id = auth.uid()
                )
            );
    END IF;
END $$;

-- ============================================================
-- VÉRIFICATION après exécution :
--   SELECT policyname, cmd FROM pg_policies
--   WHERE tablename = 'event_settings';
-- ============================================================