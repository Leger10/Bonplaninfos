-- ============================================================
-- MIGRATION : Paiement des VOTES par USSD (Bonplaninfos)
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1) Table de persistance des votes payés par USSD (en attente de validation)
CREATE TABLE IF NOT EXISTS public.vote_payments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id    uuid,
    user_id       uuid NOT NULL,
    event_id      uuid,
    candidate_id  uuid NOT NULL,
    vote_count    integer DEFAULT 1,
    amount_pi     integer DEFAULT 0,
    amount_fcfa   integer DEFAULT 0,
    status        text DEFAULT 'pending',   -- pending | completed | cancelled
    transaction_id text,
    sms_reference text,
    proof_url     text,
    organizer_id  uuid,
    validated_by  uuid,
    rejected_by   uuid,
    validated_at  timestamptz,
    rejected_at   timestamptz,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

-- 1b) Compatibilité : si la table vote_payments existait déjà (créée avant sans la
--     colonne contest_id), CREATE TABLE IF NOT EXISTS ne l'ajoute pas => on force l'ajout.
ALTER TABLE public.vote_payments
    ADD COLUMN IF NOT EXISTS contest_id uuid;

-- 2) Colonnes de traçabilité sur user_votes (utilisées par l'upsert de validation)
ALTER TABLE public.user_votes
    ADD COLUMN IF NOT EXISTS payment_method text,
    ADD COLUMN IF NOT EXISTS payment_status text;

-- 3) Contrainte unique pour permettre l'upsert (si elle n'existe pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_votes_event_candidate_user_key'
    ) THEN
        ALTER TABLE public.user_votes
            ADD CONSTRAINT user_votes_event_candidate_user_key
            UNIQUE (event_id, candidate_id, user_id);
    END IF;
END $$;

-- 3b) VOTES GRATUITS SANS COMPTE : identification de l'appareil (invité)
ALTER TABLE public.user_votes
    ADD COLUMN IF NOT EXISTS guest_id text,
    ADD COLUMN IF NOT EXISTS voter_name text,
    ADD COLUMN IF NOT EXISTS voter_phone text;

-- 4) Index pour retrouver rapidement un vote en attente par paiement
CREATE INDEX IF NOT EXISTS idx_vote_payments_payment_id ON public.vote_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_vote_payments_status ON public.vote_payments(status);

-- 5) Index pour la limite des votes gratuits par appareil (invités)
CREATE INDEX IF NOT EXISTS idx_user_votes_guest_event ON public.user_votes(event_id, guest_id);
