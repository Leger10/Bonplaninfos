-- ============================================================
-- MIGRATION : Garantir l'ajout des voix aux candidats + classement
-- Bonplaninfos — à exécuter dans Supabase > SQL Editor (tout le fichier)
-- ============================================================

-- 1) Fonction atomique d'incrément des voix d'un candidat.
--    Utilisée par le vote par pièces des concours (ContestDetailPage
--    => supabase.rpc('increment_vote_count', {candidate_id_to_inc, inc_amount})).
--    CREATE OR REPLACE = idempotent, l'exécuter plusieurs fois est sans risque.
CREATE OR REPLACE FUNCTION public.increment_vote_count(
    candidate_id_to_inc uuid,
    inc_amount integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF inc_amount IS NULL OR inc_amount <= 0 THEN
        RETURN;
    END IF;
    UPDATE public.candidates
    SET vote_count = COALESCE(vote_count, 0) + inc_amount
    WHERE id = candidate_id_to_inc;
END;
$$;

-- Autorisations (lisibilité : permettre aux clients RLS de l'appeler)
GRANT EXECUTE ON FUNCTION public.increment_vote_count(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_vote_count(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_vote_count(uuid, integer) TO service_role;

-- 2) Resynchronisation des compteurs publics (candidates.vote_count) à partir
--    des votes enregistrés dans user_votes (pièces + gratuits + USSD validés).
--    ⚠️ Sécurité : l'UPDATE ne fait JAMAIS baisser le compteur
--    (WHERE ... < ...) pour ne pas toucher aux candidats de concours dont
--    les voix par pièces sont comptabilisées hors user_votes (via RPC).
--    Les candidats en retard (cas du bug USSD) sont uniquement corrigés à la hausse.
UPDATE public.candidates c
SET vote_count = s.total
FROM (
    SELECT candidate_id, SUM(vote_count) AS total
    FROM public.user_votes
    GROUP BY candidate_id
) s
WHERE c.id = s.candidate_id
  AND COALESCE(c.vote_count, 0) < COALESCE(s.total, 0);

-- 3) (Option) Vérification après migration : les voix par candidat recalculées
SELECT c.id, c.name, c.vote_count AS voix_actuelles,
       COALESCE(s.total, 0) AS voix_en_base,
       c.vote_count - COALESCE(s.total, 0) AS ecart
FROM public.candidates c
LEFT JOIN (
    SELECT candidate_id, SUM(vote_count) AS total
    FROM public.user_votes
    GROUP BY candidate_id
) s ON s.candidate_id = c.id
WHERE c.vote_count <> COALESCE(s.total, 0)
ORDER BY ecart DESC;