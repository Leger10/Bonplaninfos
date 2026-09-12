-- ============================================================
-- MIGRATION : Limite de voix par numéro de téléphone (anti-fraude)
-- Bonplaninfos — à exécuter dans Supabase > SQL Editor (tout le fichier)
--
-- Objectif : empêcher qu'une même personne (numéro de téléphone)
-- vote de façon illimitée pour un candidat, que ce soit en vote
-- GRATUIT ou PAYANT (pièces / USSD). La limite est appliquée CÔTÉ
-- SERVEUR via un trigger sur user_votes : elle couvre donc TOUS les
-- chemins d'écriture (even un client non modifié / un appel API direct).
-- ============================================================

-- 1) Réglage par événement : nombre max de voix par téléphone.
--    Valeur par défaut 50 appliquée aux événements EXISTANTS et NOUVEAUX.
--    Mettre 0 = illimité.
ALTER TABLE public.event_settings
    ADD COLUMN IF NOT EXISTS max_votes_per_phone integer NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.event_settings.max_votes_per_phone IS
    'Nombre maximal de voix autorisées par numéro de téléphone pour cet événement. 0 = illimité.';

-- 2) Fonction de lecture : total de voix déjà données par un téléphone
--    sur un événement. LARGEMENT utilisée pour la pré-vérification
--    côté application (message d'erreur propre) avant écriture.
--    Les numéros sont comparés SANS caractères non numériques
--    (+225 0708... / 0708... / +2250708... sont le même numéro).
CREATE OR REPLACE FUNCTION public.get_phone_vote_count(
    p_event_id uuid,
    p_phone text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(vote_count), 0)
    FROM public.user_votes
    WHERE event_id = p_event_id
      AND COALESCE(voter_phone, '') <> ''
      AND regexp_replace(voter_phone, '[^0-9]', '', 'g')
        = regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
$$;

GRANT EXECUTE ON FUNCTION public.get_phone_vote_count(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_phone_vote_count(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_phone_vote_count(uuid, text) TO service_role;

-- 3) Trigger d'application obligatoire sur user_votes (tous chemins).
--    - Utilisateur CONNECTÉ (user_id renseigné) : le téléphone est lu dans
--      profiles.phone (source de vérité, non modifiable par le client).
--    - Invité (user_id NULL) : le téléphone fourni à l'insertion (voter_phone)
--      est utilisé.
--    - Si aucun téléphone n'est disponible ou si la limite est 0 : aucun blocage.
--    - En cas de dépassement, l'écriture est REFUSÉE (RAISE EXCEPTION).
CREATE OR REPLACE FUNCTION public.enforce_vote_phone_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phone   text := '';
    v_limit   integer := 0;
    v_total   integer := 0;
    v_exclude uuid := NULL;
    v_remaining integer := 0;
BEGIN
    -- Téléphone de référence
    IF NEW.user_id IS NOT NULL THEN
        SELECT phone INTO v_phone FROM public.profiles WHERE id = NEW.user_id;
    ELSE
        v_phone := NEW.voter_phone;
    END IF;

    v_phone := regexp_replace(COALESCE(v_phone, ''), '[^0-9]', '', 'g');
    IF v_phone = '' THEN
        RETURN NEW; -- pas de téléphone exploitable : laisser passer
    END IF;

    -- Limite configurée pour l'événement
    SELECT max_votes_per_phone INTO v_limit
    FROM public.event_settings
    WHERE event_id = NEW.event_id;

    v_limit := COALESCE(v_limit, 0);
    IF v_limit <= 0 THEN
        RETURN NEW; -- illimité
    END IF;

    -- Total déjà atteint par ce téléphone (hors ligne en cours de mise à jour)
    IF TG_OP = 'UPDATE' THEN
        v_exclude := OLD.id;
    END IF;

    SELECT COALESCE(SUM(vote_count), 0)
      INTO v_total
    FROM public.user_votes
    WHERE event_id = NEW.event_id
      AND (v_exclude IS NULL OR id <> v_exclude)
      AND COALESCE(voter_phone, '') <> ''
      AND regexp_replace(voter_phone, '[^0-9]', '', 'g') = v_phone;

    v_total := v_total + COALESCE(NEW.vote_count, 1);

    IF v_total > v_limit THEN
        v_remaining := GREATEST(0, v_limit - (v_total - COALESCE(NEW.vote_count, 1)));
        RAISE EXCEPTION 'Limite de % voix par téléphone atteinte pour cet événement. Encore % voix possible(s).', v_limit, v_remaining
            USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vote_phone_limit ON public.user_votes;
CREATE TRIGGER trg_vote_phone_limit
    BEFORE INSERT OR UPDATE OF vote_count ON public.user_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_vote_phone_limit();

-- ============================================================
-- À FAIRE UNE FOIS LA MIGRATION EXÉCUTÉE SI BESOIN :
-- Pour modifier la limite d'un événement précis :
--   UPDATE public.event_settings SET max_votes_per_phone = 100
--   WHERE event_id = 'UUID-DE-L-EVENEMENT';
-- ============================================================