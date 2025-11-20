


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."event_type_enum" AS ENUM (
    'protected',
    'ticketing',
    'voting',
    'raffle'
);


ALTER TYPE "public"."event_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."access_protected_event"("p_event_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    event_record RECORD;
    user_profile RECORD;
    existing_access RECORD;
    access_cost INTEGER := 2; -- Coût d'accès
    organizer_credit INTEGER := 1; -- Crédit pour l'organisateur (1 pièce)
    platform_commission INTEGER := 1; -- Commission pour la plateforme (1 pièce)
    paid_coins_used INTEGER := 0;
    free_coins_used INTEGER := 0;
    super_admin_id uuid;
    v_coin_to_fcfa_rate INT;
BEGIN
    SELECT coin_to_fcfa_rate INTO v_coin_to_fcfa_rate FROM app_settings LIMIT 1;
    v_coin_to_fcfa_rate := COALESCE(v_coin_to_fcfa_rate, 10);

    SELECT * INTO event_record
    FROM events
    WHERE id = p_event_id AND status = 'active';
    
    IF event_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Événement non trouvé ou inactif', 'has_access', false);
    END IF;

    -- Vérifier l'utilisateur
    SELECT * INTO user_profile FROM profiles WHERE id = p_user_id;
    IF user_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utilisateur non trouvé', 'has_access', false);
    END IF;
    
    -- Accès gratuit pour les modérateurs et le propriétaire
    IF event_record.organizer_id = p_user_id OR user_profile.user_type IN ('super_admin', 'admin', 'secretary') THEN
        INSERT INTO protected_event_access (event_id, user_id, amount_paid_pi, status)
        VALUES (p_event_id, p_user_id, 0, 'active')
        ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'active';
        RETURN jsonb_build_object('success', true, 'message', 'Accès autorisé (propriétaire ou modérateur)', 'has_access', true);
    END IF;
    
    -- Vérifier si l'utilisateur a déjà accès
    SELECT * INTO existing_access
    FROM protected_event_access
    WHERE event_id = p_event_id AND user_id = p_user_id AND status = 'active';
    
    IF existing_access IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Accès déjà accordé', 'has_access', true);
    END IF;

    -- Si c'est une vérification de statut (GET), ne pas débiter
    IF (SELECT current_setting('request.method', true)) = 'GET' THEN
       RETURN jsonb_build_object('success', true, 'message', 'Vérification de statut', 'has_access', false);
    END IF;
    
    -- Vérifier le solde
    IF (COALESCE(user_profile.coin_balance, 0) + COALESCE(user_profile.free_coin_balance, 0)) < access_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant. ' || access_cost || 'π requis pour accéder à cet événement', 'has_access', false);
    END IF;
    
    -- Débiter l'utilisateur de 2π
    free_coins_used := LEAST(COALESCE(user_profile.free_coin_balance, 0), access_cost);
    paid_coins_used := access_cost - free_coins_used;

    UPDATE profiles SET 
        free_coin_balance = free_coin_balance - free_coins_used,
        coin_balance = coin_balance - paid_coins_used
    WHERE id = p_user_id;

    INSERT INTO coin_spending (user_id, amount, spent_from_free, free_coins_used, paid_coins_used, purpose, target_id, target_type, description)
    VALUES (p_user_id, access_cost, free_coins_used > 0, free_coins_used, paid_coins_used, 'event_access', p_event_id, 'event', 'Accès à l''événement: ' || event_record.title);
    
    -- Distribuer les gains si des pièces PAYANTES ont été utilisées
    IF paid_coins_used > 0 THEN
      -- Créditer l'organisateur de 1π
      INSERT INTO organizer_earnings (organizer_id, event_id, transaction_type, earnings_coins, earnings_fcfa, status, platform_commission, description) 
      VALUES (event_record.organizer_id, p_event_id, 'event_access', organizer_credit, organizer_credit * v_coin_to_fcfa_rate, 'available', platform_commission, 'Gain pour accès à un événement protégé');

      UPDATE profiles
      SET available_earnings = COALESCE(available_earnings, 0) + organizer_credit
      WHERE id = event_record.organizer_id;
      
      -- Créditer la plateforme de 1π
      SELECT id INTO super_admin_id FROM profiles WHERE user_type = 'super_admin' LIMIT 1;
      IF super_admin_id IS NOT NULL THEN
        UPDATE public.profiles
        SET commission_wallet = COALESCE(commission_wallet, 0) + platform_commission
        WHERE id = super_admin_id;
      END IF;
    END IF;

    -- Accorder l'accès
    INSERT INTO protected_event_access (event_id, user_id, amount_paid_pi, status, expires_at)
    VALUES (p_event_id, p_user_id, access_cost, 'active', NOW() + INTERVAL '30 days')
    ON CONFLICT (event_id, user_id) DO UPDATE 
    SET status = 'active', expires_at = NOW() + INTERVAL '30 days';
    
    -- Mettre à jour les statistiques
    UPDATE events SET views_count = COALESCE(views_count, 0) + 1, interactions_count = COALESCE(interactions_count, 0) + 1, updated_at = NOW() WHERE id = p_event_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Accès accordé à l''événement protégé',
        'amount_paid', access_cost,
        'has_access', true
    );
END;
$$;


ALTER FUNCTION "public"."access_protected_event"("p_event_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activate_partner_license"("p_license_id" "uuid", "p_admin_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    admin_role TEXT;
    license_record RECORD;
BEGIN
    -- 1. Verify that the user is a super_admin
    SELECT role INTO admin_role FROM public.profiles WHERE id = p_admin_id;
    IF admin_role IS NULL OR admin_role <> 'super_admin' THEN
        RETURN QUERY SELECT false, 'Permission non accordée. Seul un super administrateur peut effectuer cette action.';
        RETURN;
    END IF;

    -- 2. Get the license record
    SELECT * INTO license_record FROM public.partner_licenses WHERE id = p_license_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Licence non trouvée.';
        RETURN;
    END IF;

    -- 3. Update the license status and set the start/end dates
    UPDATE public.partner_licenses
    SET 
        status = 'active',
        start_date = NOW(),
        end_date = NOW() + (license_record.duration_days || ' days')::interval
    WHERE id = p_license_id;

    RETURN QUERY SELECT true, 'La licence a été activée avec succès. La période de validité a commencé.';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."activate_partner_license"("p_license_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_foreign_key_if_not_exists"("p_table_name" "text", "p_column_name" "text", "p_referenced_table" "text", "p_referenced_column" "text" DEFAULT 'id'::"text", "p_on_delete" "text" DEFAULT 'NO ACTION'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = p_table_name || '_' || p_column_name || '_fkey' 
        AND table_name = p_table_name
    ) THEN
        EXECUTE 'ALTER TABLE public.' || p_table_name || 
                ' ADD CONSTRAINT ' || p_table_name || '_' || p_column_name || '_fkey' ||
                ' FOREIGN KEY (' || p_column_name || ') REFERENCES public.' || p_referenced_table || '(' || p_referenced_column || ')' ||
                ' ON DELETE ' || p_on_delete;
    END IF;
END;
$$;


ALTER FUNCTION "public"."add_foreign_key_if_not_exists"("p_table_name" "text", "p_column_name" "text", "p_referenced_table" "text", "p_referenced_column" "text", "p_on_delete" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_commission_5_95"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_transaction_id" "uuid", "p_transaction_type" character varying, "p_user_id" "uuid", "p_total_amount_coins" integer) RETURNS TABLE("platform_commission" integer, "organizer_earnings" integer, "commission_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_platform_commission INTEGER;
    v_organizer_earnings INTEGER;
    v_commission_id UUID;
    v_coin_to_fcfa_rate INT;
BEGIN
    SELECT coin_to_fcfa_rate INTO v_coin_to_fcfa_rate FROM app_settings LIMIT 1;
    v_coin_to_fcfa_rate := COALESCE(v_coin_to_fcfa_rate, 10);

    -- Calculer les commissions (5% plateforme, 95% organisateur)
    SELECT platform_commission, organizer_earnings 
    INTO v_platform_commission, v_organizer_earnings
    FROM public.calculate_commissions(p_total_amount_coins);

    -- Enregistrer la commission
    INSERT INTO public.ticket_commissions (
        transaction_id, transaction_type, event_id, organizer_id, user_id,
        total_amount_coins, platform_commission, organizer_earnings
    ) VALUES (
        p_transaction_id, p_transaction_type, p_event_id, p_organizer_id, p_user_id,
        p_total_amount_coins, v_platform_commission, v_organizer_earnings
    ) RETURNING id INTO v_commission_id;

    -- Créditer la plateforme (5%)
    UPDATE public.platform_wallet 
    SET 
        balance_coins = COALESCE(balance_coins, 0) + v_platform_commission,
        total_earned_coins = COALESCE(total_earned_coins, 0) + v_platform_commission,
        balance_fcfa = COALESCE(balance_fcfa, 0) + (v_platform_commission * v_coin_to_fcfa_rate),
        total_earned_fcfa = COALESCE(total_earned_fcfa, 0) + (v_platform_commission * v_coin_to_fcfa_rate),
        last_updated = NOW(),
        updated_at = NOW()
    WHERE wallet_type = 'commission';

    -- Créditer l'organisateur (95%)
    INSERT INTO public.organizer_earnings (
        organizer_id, event_id, transaction_id, transaction_type,
        earnings_coins, earnings_fcfa
    ) VALUES (
        p_organizer_id, p_event_id, p_transaction_id, p_transaction_type,
        v_organizer_earnings, (v_organizer_earnings * v_coin_to_fcfa_rate)
    );

    RETURN QUERY SELECT v_platform_commission, v_organizer_earnings, v_commission_id;
END;
$$;


ALTER FUNCTION "public"."apply_commission_5_95"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_transaction_id" "uuid", "p_transaction_type" character varying, "p_user_id" "uuid", "p_total_amount_coins" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_organizer_id UUID;
    v_amount_pi INTEGER;
    v_withdrawal_method TEXT;
BEGIN
    -- Récupérer les infos de la demande
    SELECT user_id, amount_pi, withdrawal_method 
    INTO v_organizer_id, v_amount_pi, v_withdrawal_method
    FROM public.withdrawal_requests 
    WHERE id = p_request_id AND status = 'pending';
    
    IF v_organizer_id IS NULL THEN
        RAISE EXCEPTION 'Demande non trouvée ou déjà traitée';
    END IF;
    
    -- Marquer comme approuvé
    UPDATE public.withdrawal_requests 
    SET status = 'approved',
        processed_at = NOW(),
        processed_by = p_processed_by
    WHERE id = p_request_id;
    
    -- Déduire du solde organisateur
    UPDATE public.organizer_wallet 
    SET total_balance_coins = total_balance_coins - v_amount_pi,
        total_balance_fcfa = total_balance_fcfa - (v_amount_pi * 10),
        last_updated = NOW()
    WHERE organizer_id = v_organizer_id;
    
    RAISE NOTICE '✅ Demande % approuvée (% pièces via %). Solde mis à jour.', 
        p_request_id, v_amount_pi, v_withdrawal_method;
END;
$$;


ALTER FUNCTION "public"."approve_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_withdrawal_secretary"("p_withdrawal_id" "uuid", "p_secretary_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    withdrawal_record RECORD;
    secretary_username TEXT;
BEGIN
    -- Vérifier que le secrétaire existe et est autorisé
    SELECT username INTO secretary_username
    FROM public.profiles 
    WHERE id = p_secretary_id 
    AND (admin_type = 'secretary' OR appointed_by_super_admin = true);
    
    IF secretary_username IS NULL THEN
        RETURN '❌ Secrétaire non autorisé ou non trouvé';
    END IF;
    
    -- Récupérer la demande de retrait
    SELECT wr.*, p.username as organizer_username
    INTO withdrawal_record
    FROM public.withdrawal_requests wr
    JOIN public.profiles p ON wr.organizer_id = p.id
    WHERE wr.id = p_withdrawal_id AND wr.status = 'pending';
    
    IF withdrawal_record.id IS NULL THEN
        RETURN '❌ Demande de retrait non trouvée ou déjà traitée';
    END IF;
    
    -- Approuver par le secrétaire
    UPDATE public.withdrawal_requests 
    SET 
        status = 'approved',
        secretary_id = p_secretary_id,
        secretary_approval_date = NOW(),
        secretary_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_withdrawal_id;
    
    -- Créer une notification pour le super admin
    INSERT INTO public.admin_notifications (
        admin_id,
        notification_type, 
        title,
        message
    )
    SELECT 
        id,
        'withdrawal_approval',
        'Retrait à superviser',
        'Le secrétaire ' || secretary_username || ' a approuvé un retrait de ' || 
        withdrawal_record.amount_coins || ' pièces pour ' || withdrawal_record.organizer_username
    FROM public.profiles 
    WHERE admin_type = 'super_admin'
    LIMIT 1;
    
    RETURN '✅ Retrait approuvé par le secrétaire ' || secretary_username || 
           ' pour ' || withdrawal_record.organizer_username;
END;
$$;


ALTER FUNCTION "public"."approve_withdrawal_secretary"("p_withdrawal_id" "uuid", "p_secretary_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_raffle_ticket_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_ticket_sequence INT;
BEGIN
    -- Verrouille la ligne de l'événement de tombola pour éviter les conditions de concurrence
    PERFORM * FROM raffle_events WHERE id = NEW.raffle_id FOR UPDATE;

    -- Récupère la dernière séquence de ticket pour cette tombola et l'incrémente
    SELECT COALESCE(MAX(ticket_number), 0) + 1 INTO next_ticket_sequence
    FROM raffle_tickets
    WHERE raffle_id = NEW.raffle_id;

    NEW.ticket_number := next_ticket_sequence;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_raffle_ticket_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_disable_expired_licenses"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    expired_count INTEGER;
    warning_count INTEGER;
BEGIN
    -- Compter les licences qui vont expirer dans moins de 7 jours
    SELECT COUNT(*) INTO warning_count
    FROM public.profiles 
    WHERE license_status = 'active'
    AND license_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';
    
    -- Désactiver les licences expirées
    UPDATE public.profiles 
    SET 
        license_status = 'expired',
        admin_type = NULL  -- Retirer les privilèges admin
    WHERE license_status = 'active'
    AND license_expires_at < NOW();
    
    -- Récupérer le nombre de licences désactivées
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN '✅ ' || expired_count || ' licences désactivées, ' || 
           warning_count || ' licences vont expirer bientôt';
END;
$$;


ALTER FUNCTION "public"."auto_disable_expired_licenses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_geocode_event_address"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check only for relevant changes
    IF TG_OP = 'INSERT' OR (NEW.address IS DISTINCT FROM OLD.address OR NEW.city IS DISTINCT FROM OLD.city OR NEW.country IS DISTINCT FROM OLD.country OR NEW.google_maps_link IS DISTINCT FROM OLD.google_maps_link) THEN
        -- If a google maps link is provided, it's a manual override
        IF NEW.google_maps_link IS NOT NULL THEN
            NEW.geocoding_status := 'manual';
            NEW.geocoding_attempts := 0;
        -- If there is an address to geocode
        ELSIF NEW.address IS NOT NULL OR (NEW.city IS NOT NULL AND NEW.country IS NOT NULL) THEN
            NEW.geocoding_status := 'pending';
            NEW.geocoding_attempts := 0;
            NEW.geocoding_last_attempt := NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_geocode_event_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_update_commission_wallet"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Mettre à jour le portefeuille commission après chaque INSERT
    UPDATE public.platform_wallet 
    SET 
        balance_coins = balance_coins + FLOOR(NEW.total_amount_coins * 0.05),
        total_earned_coins = total_earned_coins + FLOOR(NEW.total_amount_coins * 0.05),
        last_updated = NOW(),
        updated_at = NOW()
    WHERE wallet_type = 'commission';
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_update_commission_wallet"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."book_stand_with_commission"("p_event_id" "uuid", "p_stand_id" "uuid", "p_vendor_id" "uuid") RETURNS TABLE("success" boolean, "message" "text", "booking_id" "uuid", "total_coins" integer, "platform_commission" integer, "organizer_earnings" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_stand RECORD;
    v_organizer_id UUID;
    v_booking_id UUID;
    v_total_coins INTEGER;
    v_commission_result RECORD;
BEGIN
    -- Vérifier le stand
    SELECT * INTO v_stand FROM public.event_stands 
    WHERE id = p_stand_id AND event_id = p_event_id AND is_available = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Stand non disponible.', NULL, NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Récupérer l'organisateur
    SELECT organizer_id INTO v_organizer_id FROM public.events WHERE id = p_event_id;

    -- Calcul du prix
    IF v_stand.price_coins IS NOT NULL THEN
        v_total_coins := v_stand.price_coins;
    ELSE
        v_total_coins := public.convert_fcfa_to_coins(v_stand.price_fcfa);
    END IF;

    -- Créer la réservation
    INSERT INTO public.stand_bookings (
        event_id, stand_id, vendor_id, booking_number,
        total_amount_fcfa, total_amount_coins, booking_status, payment_status
    ) VALUES (
        p_event_id, p_stand_id, p_vendor_id,
        'STAND-' || EXTRACT(EPOCH FROM NOW()) || '-' || substr(md5(random()::text), 1, 6),
        v_stand.price_fcfa, v_total_coins, 'confirmed', 'completed'
    ) RETURNING id INTO v_booking_id;

    -- Marquer le stand comme réservé
    UPDATE public.event_stands 
    SET is_booked = true, booked_by = p_vendor_id, booking_start = NOW()
    WHERE id = p_stand_id;

    -- APPLIQUER LES COMMISSIONS 5%/95%
    SELECT * INTO v_commission_result
    FROM public.apply_commission_5_95(
        p_event_id, v_organizer_id, v_booking_id, 
        'stand_booking', p_vendor_id, v_total_coins
    );

    RETURN QUERY SELECT true, 'Stand réservé! Commission 5% appliquée', 
                v_booking_id, v_total_coins,
                v_commission_result.platform_commission,
                v_commission_result.organizer_earnings;

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Erreur: ' || SQLERRM, NULL, NULL, NULL, NULL;
END;
$$;


ALTER FUNCTION "public"."book_stand_with_commission"("p_event_id" "uuid", "p_stand_id" "uuid", "p_vendor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."boost_content"("p_user_id" "uuid", "p_content_id" "uuid", "p_content_type" "text", "p_pack_type" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    pack_info RECORD;
    user_profile RECORD;
    table_name TEXT;
    update_query TEXT;
BEGIN
    -- 1. Récupérer les informations sur le pack depuis admin_config
    SELECT
        (p->>'id')::text AS id,
        (p->>'coins')::int AS coins,
        (p->>'duration_days')::int AS duration_days
    INTO pack_info
    FROM admin_config, jsonb_array_elements(admin_config.promotion_packs) AS p
    WHERE (p->>'id')::text = p_pack_type
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Pack de boost non trouvé.';
        RETURN;
    END IF;

    -- 2. Vérifier le solde de l'utilisateur
    SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
    IF user_profile.total_coins < pack_info.coins THEN
        RETURN QUERY SELECT false, 'Solde de pièces insuffisant.';
        RETURN;
    END IF;

    -- 3. Déduire les pièces et mettre à jour le contenu
    -- Déterminer la table à mettre à jour
    IF p_content_type = 'event' THEN
        table_name := 'events';
    ELSIF p_content_type = 'promotion' THEN
        table_name := 'promotions';
    ELSE
        RETURN QUERY SELECT false, 'Type de contenu non valide.';
        RETURN;
    END IF;

    -- Mettre à jour le contenu avec le pack de boost
    -- On suppose que les tables events/promotions ont des colonnes pour gérer le boost
    -- comme 'pack_type', 'pack_started_at', 'pack_expires_at'
    update_query := format(
        'UPDATE public.%I SET pack_type = %L, pack_started_at = NOW(), pack_expires_at = NOW() + interval ''1 day'' * %s, status = ''active'' WHERE id = %L;',
        table_name,
        p_pack_type,
        pack_info.duration_days,
        p_content_id
    );
    EXECUTE update_query;

    -- 4. Déduire les pièces du portefeuille de l'utilisateur
    UPDATE public.profiles
    SET
        bonus_coins = GREATEST(0, bonus_coins - pack_info.coins),
        purchased_coins = purchased_coins - GREATEST(0, pack_info.coins - bonus_coins)
    WHERE id = p_user_id;

    -- 5. Enregistrer la transaction
    INSERT INTO public.coin_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -pack_info.coins, 'debit', 'Boost de contenu: ' || p_pack_type);

    RETURN QUERY SELECT true, 'Contenu boosté avec succès !';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."boost_content"("p_user_id" "uuid", "p_content_id" "uuid", "p_content_type" "text", "p_pack_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buy_ticket"("p_user_id" "uuid", "p_event_id" "uuid", "p_quantity" integer) RETURNS TABLE("success" boolean, "message" "text", "ticket_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    event_info RECORD;
    user_profile RECORD;
    total_cost INT;
    cost_from_bonus INT;
    cost_from_purchased INT;
    organizer_id_val UUID;
    earnings_share_organizer INT;
    new_ticket_id UUID;
BEGIN
    -- 1. Get event and user info
    SELECT * INTO event_info FROM public.events WHERE id = p_event_id;
    SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Événement ou utilisateur non trouvé.', null::uuid;
        RETURN;
    END IF;

    -- 2. Check ticket availability
    IF event_info.total_tickets IS NOT NULL AND (event_info.tickets_sold + p_quantity) > event_info.total_tickets THEN
        RETURN QUERY SELECT false, 'Pas assez de billets disponibles.', null::uuid;
        RETURN;
    END IF;

    -- 3. Calculate total cost
    total_cost := event_info.ticket_price_coins * p_quantity;

    -- 4. Check user balance
    IF user_profile.total_coins < total_cost THEN
        RETURN QUERY SELECT false, 'Solde de pièces insuffisant.', null::uuid;
        RETURN;
    END IF;

    -- 5. Debit coins
    cost_from_bonus := LEAST(user_profile.bonus_coins, total_cost);
    cost_from_purchased := total_cost - cost_from_bonus;

    UPDATE public.profiles
    SET
        bonus_coins = bonus_coins - cost_from_bonus,
        purchased_coins = purchased_coins - cost_from_purchased
    WHERE id = p_user_id;

    -- 6. Log coin transaction
    INSERT INTO public.coin_transactions (user_id, amount, type, description, metadata)
    VALUES (p_user_id, -total_cost, 'debit', 'Achat de billet pour ' || event_info.title, jsonb_build_object('event_id', p_event_id, 'quantity', p_quantity));

    -- 7. Create ticket
    INSERT INTO public.tickets (event_id, user_id, quantity, coin_cost, qr_code, status, transaction_id)
    VALUES (p_event_id, p_user_id, p_quantity, total_cost, 'QR-' || gen_random_uuid(), 'active', gen_random_uuid()::text)
    RETURNING id INTO new_ticket_id;

    -- 8. Update event's sold tickets count
    UPDATE public.events
    SET tickets_sold = tickets_sold + p_quantity
    WHERE id = p_event_id;

    -- 9. Credit organizer
    organizer_id_val := event_info.organizer_id;
    IF organizer_id_val IS NOT NULL AND organizer_id_val <> p_user_id AND cost_from_purchased > 0 THEN
        earnings_share_organizer := floor(cost_from_purchased * 0.8);
        IF earnings_share_organizer > 0 THEN
            UPDATE public.profiles SET earnings_coins = COALESCE(earnings_coins, 0) + earnings_share_organizer WHERE id = organizer_id_val;
            INSERT INTO public.coin_transactions (user_id, amount, type, description)
            VALUES (organizer_id_val, earnings_share_organizer, 'credit', 'Gains sur billet pour ' || event_info.title);
        END IF;
    END IF;

    RETURN QUERY SELECT true, 'Billet acheté avec succès !', new_ticket_id;

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM, null::uuid;
END;
$$;


ALTER FUNCTION "public"."buy_ticket"("p_user_id" "uuid", "p_event_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_and_record_partner_payment"("p_license_id" "uuid", "p_month_year" "text", "p_calculator_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    license_record RECORD;
    total_revenue_in_zone INT;
    partner_share_amount INT;
    platform_share_amount INT;
    net_payment INT;
    start_date_month DATE;
    end_date_month DATE;
BEGIN
    -- Check if caller is super_admin
    IF (SELECT get_my_role()) <> 'super_admin' THEN
        RETURN QUERY SELECT false, 'Permission non accordée.';
        RETURN;
    END IF;

    -- Get license details
    SELECT * INTO license_record FROM public.partner_licenses WHERE id = p_license_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Licence de partenaire non trouvée.';
        RETURN;
    END IF;

    -- Check if payment for this month already exists
    IF EXISTS (SELECT 1 FROM public.partner_license_payments WHERE license_id = p_license_id AND month_year = p_month_year) THEN
        RETURN QUERY SELECT false, 'Un paiement pour ce mois a déjà été enregistré.';
        RETURN;
    END IF;

    -- Calculate start and end of the month
    start_date_month := to_date(p_month_year || '-01', 'YYYY-MM-DD');
    end_date_month := (start_date_month + interval '1 month') - interval '1 day';

    -- Calculate total revenue from interactions using purchased coins within the partner's zone
    SELECT COALESCE(SUM(ABS(ct.amount) * ac.coin_to_cfa_rate), 0)::INT
    INTO total_revenue_in_zone
    FROM public.coin_transactions ct
    JOIN public.profiles u ON ct.user_id = u.id
    CROSS JOIN (SELECT coin_to_cfa_rate FROM public.admin_config LIMIT 1) ac
    WHERE ct.type = 'debit'
      AND ct.description NOT LIKE '%Bonus%' -- Exclure les transactions bonus
      AND ct.created_at >= start_date_month AND ct.created_at <= end_date_month
      AND u.country = license_record.country
      AND (license_record.cities IS NULL OR license_record.cities = '{}' OR u.city = ANY(license_record.cities));

    -- Calculate shares
    partner_share_amount := floor(total_revenue_in_zone * (license_record.revenue_share_percent / 100.0));
    platform_share_amount := total_revenue_in_zone - partner_share_amount;
    net_payment := partner_share_amount - license_record.monthly_fee_cfa;

    -- Insert payment record
    INSERT INTO public.partner_license_payments (
        license_id, month_year, total_revenue_cfa, revenue_share_percent, 
        partner_share_cfa, platform_share_cfa, license_fee_cfa, net_payment_cfa, 
        payment_status, calculated_by, calculated_at
    ) VALUES (
        p_license_id, p_month_year, total_revenue_in_zone, license_record.revenue_share_percent,
        partner_share_amount, platform_share_amount, license_record.monthly_fee_cfa, net_payment,
        'pending_payment', p_calculator_id, NOW()
    );

    -- Update totals on the license
    UPDATE public.partner_licenses
    SET 
        total_revenue_cfa = COALESCE(total_revenue_cfa, 0) + total_revenue_in_zone,
        partner_earnings_cfa = COALESCE(partner_earnings_cfa, 0) + partner_share_amount,
        platform_earnings_cfa = COALESCE(platform_earnings_cfa, 0) + platform_share_amount
    WHERE id = p_license_id;

    RETURN QUERY SELECT true, 'Paiement du partenaire calculé et enregistré avec succès.';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."calculate_and_record_partner_payment"("p_license_id" "uuid", "p_month_year" "text", "p_calculator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_commissions"("p_total_amount_coins" integer) RETURNS TABLE("platform_commission" integer, "organizer_earnings" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY SELECT
        FLOOR(p_total_amount_coins * 0.05)::INTEGER as platform_commission,
        (p_total_amount_coins - FLOOR(p_total_amount_coins * 0.05))::INTEGER as organizer_earnings;
END;
$$;


ALTER FUNCTION "public"."calculate_commissions"("p_total_amount_coins" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculer_paiement_admin"("p_admin_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    ca_zone_coins DECIMAL;
    ca_zone_fcfa DECIMAL;
    taux DECIMAL;
    score DECIMAL;
    montant DECIMAL;
    licence RECORD;
    settings RECORD;
    mois_calcul DATE;
    admin_licence_id uuid;
    admin_activity RECORD;
BEGIN
    -- Obtenir la licence active pour l'admin
    SELECT * INTO licence FROM admin_licences WHERE admin_id = p_admin_id AND statut = 'actif' LIMIT 1;
    IF NOT FOUND THEN
        RAISE NOTICE 'Admin introuvable ou licence inactive pour l''id %', p_admin_id;
        RETURN;
    END IF;
    
    admin_licence_id := licence.id;

    -- Obtenir les paramètres de l'application
    SELECT * INTO settings FROM app_settings LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paramètres de l''application non trouvés';
    END IF;
    
    mois_calcul := DATE_TRUNC('month', NOW() - INTERVAL '1 month');

    -- Calculer le CA en pièces pour la zone de l'admin pour le mois précédent
    SELECT COALESCE(SUM(t.amount_pi), 0)
    INTO ca_zone_coins
    FROM transactions t
    WHERE t.transaction_type = 'manual_credit'
      AND t.country = licence.zone_country
      AND DATE_TRUNC('month', t.created_at) = mois_calcul;
      
    -- Convertir le CA en FCFA
    ca_zone_fcfa := ca_zone_coins * settings.coin_to_fcfa_rate;

    -- Déterminer le taux de commission en fonction du type de licence
    CASE licence.licence_type
        WHEN 'starter' THEN taux := settings.commission_rate_starter;
        WHEN 'business' THEN taux := settings.commission_rate_business;
        WHEN 'premium' THEN taux := settings.commission_rate_premium;
        ELSE taux := 0;
    END CASE;

    -- Obtenir le score de l'admin pour le mois précédent
    SELECT * INTO admin_activity FROM admin_activites WHERE admin_id = admin_licence_id AND mois = mois_calcul;
    IF FOUND THEN
      score := admin_activity.score;
    ELSE
      score := 1.0; -- Score par défaut si aucune activité n'est enregistrée
    END IF;

    -- Calculer le montant à payer
    montant := ca_zone_fcfa * (taux / 100.0) * score;

    -- Enregistrer le paiement
    INSERT INTO paiements_admin (admin_id, mois, ca_zone, taux_commission, score, montant_a_payer, statut)
    VALUES (admin_licence_id, mois_calcul, ca_zone_fcfa, taux, score, montant, 'en_attente')
    ON CONFLICT (admin_id, mois) DO UPDATE SET
        ca_zone = EXCLUDED.ca_zone,
        taux_commission = EXCLUDED.taux_commission,
        score = EXCLUDED.score,
        montant_a_payer = EXCLUDED.montant_a_payer,
        statut = 'en_attente',
        created_at = NOW();
END;
$$;


ALTER FUNCTION "public"."calculer_paiement_admin"("p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculer_score_admin"("p_admin_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    score DECIMAL(4,2);
    act RECORD;
BEGIN
    SELECT * INTO act
    FROM admin_activites
    WHERE admin_id = p_admin_id
      AND mois = DATE_TRUNC('month', NOW());

    IF NOT FOUND THEN
        -- Si aucune activité n'est enregistrée, on donne un score neutre de 0.5
        RETURN 0.5;
    END IF;

    -- Logique de scoring simplifiée : on peut la complexifier plus tard
    score := 0.5 + (act.nb_evenements_moderes * 0.01) - (act.nb_evenements_ajoutes * 0.005);
    score := GREATEST(0.1, LEAST(1.0, score)); -- Le score est entre 0.1 et 1.0

    UPDATE admin_activites
    SET score = score
    WHERE id = act.id;

    RETURN score;
END;
$$;


ALTER FUNCTION "public"."calculer_score_admin"("p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_organizer_balance"("p_organizer_id" "uuid") RETURNS TABLE("total_coins" bigint, "total_fcfa" numeric, "can_withdraw" boolean, "missing_coins" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    wallet_record RECORD;
    minimum_withdrawal BIGINT := 50;
BEGIN
    -- Récupérer le solde
    SELECT 
        total_balance_coins,
        total_balance_fcfa
    INTO wallet_record
    FROM public.organizer_wallet 
    WHERE organizer_id = p_organizer_id;
    
    -- Si pas de portefeuille, retourner des zéros
    IF NOT FOUND THEN
        total_coins := 0;
        total_fcfa := 0;
        can_withdraw := false;
        missing_coins := minimum_withdrawal;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Calculer si le retrait est possible
    total_coins := wallet_record.total_balance_coins;
    total_fcfa := wallet_record.total_balance_fcfa;
    can_withdraw := wallet_record.total_balance_coins >= minimum_withdrawal;
    missing_coins := GREATEST(0, minimum_withdrawal - wallet_record.total_balance_coins);
    
    RETURN NEXT;
    
END;
$$;


ALTER FUNCTION "public"."check_organizer_balance"("p_organizer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_organizer_interaction_balance"("p_organizer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_earnings INTEGER;
    can_withdraw BOOLEAN;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_earnings
    FROM organizer_interaction_earnings
    WHERE organizer_id = p_organizer_id AND status = 'available';
    
    can_withdraw := (total_earnings >= 50);
    
    RETURN jsonb_build_object(
        'success', true,
        'total_earnings', total_earnings,
        'can_withdraw', can_withdraw,
        'missing_for_withdrawal', CASE WHEN can_withdraw THEN 0 ELSE 50 - total_earnings END,
        'message', CASE 
            WHEN can_withdraw THEN 'Vous pouvez demander un retrait (≥50π)'
            ELSE 'Minimum 50π requis pour le retrait'
        END
    );
END;
$$;


ALTER FUNCTION "public"."check_organizer_interaction_balance"("p_organizer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_mandatory_video"("user_uuid" "uuid", "video_uuid" "uuid", "watch_duration" integer, "device_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    video_record RECORD;
    user_record RECORD;
    existing_view RECORD;
    final_reward_coins INTEGER;
    encouragement_message TEXT;
    is_fully_watched BOOLEAN;
    streak_bonus INTEGER := 0;
BEGIN
    SELECT * INTO video_record FROM mandatory_videos WHERE id = video_uuid AND is_active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Vidéo non trouvée ou inactive'); END IF;
    
    SELECT * INTO user_record FROM profiles WHERE id = user_uuid;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Utilisateur non trouvé'); END IF;
    
    SELECT * INTO existing_view FROM user_video_views WHERE user_id = user_uuid AND video_id = video_uuid;
    IF FOUND AND existing_view.fully_watched THEN RETURN jsonb_build_object('success', false, 'message', 'Vous avez déjà regardé cette vidéo et reçu votre récompense'); END IF;
    
    is_fully_watched := (watch_duration >= (video_record.video_duration * 0.9));
    IF NOT is_fully_watched THEN RETURN jsonb_build_object('success', false, 'message', 'Veuillez regarder la vidéo en entier pour recevoir votre récompense'); END IF;

    -- Calculate streak bonus
    IF user_record.last_video_streak_date = CURRENT_DATE - INTERVAL '1 day' THEN
        streak_bonus := LEAST(COALESCE(user_record.video_streak_count, 0), 5);
    END IF;
    
    -- Calculate final reward
    final_reward_coins := video_record.reward_coins + streak_bonus;
    
    -- Get encouragement message
    SELECT message_text INTO encouragement_message FROM encouragement_messages WHERE message_type = 'video_completion' AND is_active = true ORDER BY display_order LIMIT 1;
    IF encouragement_message IS NULL THEN encouragement_message := video_record.reward_message; END IF;
    
    IF streak_bonus > 0 THEN encouragement_message := COALESCE(encouragement_message, '') || ' Bonus série: +' || streak_bonus || 'π! 🔥'; END IF;
    
    -- Insert or update view log
    INSERT INTO user_video_views (user_id, video_id, watch_duration, fully_watched, watch_started_at, watch_completed_at, reward_received, coins_awarded, reward_message, device_info)
    VALUES (user_uuid, video_uuid, watch_duration, true, NOW() - (watch_duration || ' seconds')::INTERVAL, NOW(), true, final_reward_coins, encouragement_message, device_data)
    ON CONFLICT (user_id, video_id) DO UPDATE SET watch_duration = EXCLUDED.watch_duration, fully_watched = EXCLUDED.fully_watched, watch_completed_at = EXCLUDED.watch_completed_at, reward_received = EXCLUDED.reward_received, coins_awarded = EXCLUDED.coins_awarded, reward_message = EXCLUDED.reward_message;
    
    -- Update user profile
    UPDATE profiles p SET 
        free_coin_balance = COALESCE(p.free_coin_balance, 0) + final_reward_coins,
        mandatory_videos_completed = COALESCE(p.mandatory_videos_completed, 0) + 1,
        total_video_rewards_earned = COALESCE(p.total_video_rewards_earned, 0) + final_reward_coins,
        last_video_watched_at = NOW(),
        video_streak_count = CASE WHEN p.last_video_streak_date IS NULL OR p.last_video_streak_date < CURRENT_DATE - INTERVAL '1 day' THEN 1 WHEN p.last_video_streak_date = CURRENT_DATE - INTERVAL '1 day' THEN COALESCE(p.video_streak_count, 0) + 1 ELSE p.video_streak_count END,
        last_video_streak_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE p.id = user_uuid;
    
    -- Update video statistics
    UPDATE mandatory_videos mv SET 
      total_views = COALESCE(mv.total_views, 0) + 1, 
      total_rewards_given = COALESCE(mv.total_rewards_given, 0) + 1, 
      total_coins_distributed = COALESCE(mv.total_coins_distributed, 0) + final_reward_coins, 
      updated_at = NOW() 
    WHERE mv.id = video_uuid;
    
    -- Record transaction
    INSERT INTO transactions (user_id, transaction_type, amount_pi, amount_fcfa, description, status)
    VALUES (user_uuid, 'earning', final_reward_coins, final_reward_coins * 10, 'Récompense vidéo: ' || video_record.title, 'completed');
    
    -- Send push notification
    PERFORM send_push_notification(user_uuid, '🎉 Récompense gagnée!', encouragement_message, 'earning', jsonb_build_object('video_id', video_uuid, 'coins_earned', final_reward_coins, 'streak_bonus', streak_bonus, 'video_title', video_record.title), true);
    
    RETURN jsonb_build_object('success', true, 'message', COALESCE(encouragement_message, 'Récompense reçue!'), 'coins_earned', final_reward_coins);
END;
$$;


ALTER FUNCTION "public"."complete_mandatory_video"("user_uuid" "uuid", "video_uuid" "uuid", "watch_duration" integer, "device_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_price_to_coins"("p_amount" numeric, "p_currency" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    amount_in_xaf DECIMAL(10, 2);
    coin_rate INTEGER;
BEGIN
    SELECT coin_to_fcfa_rate INTO coin_rate FROM app_settings LIMIT 1;
    IF coin_rate IS NULL THEN
        coin_rate := 10;
    END IF;

    IF p_currency = 'XAF' THEN
        amount_in_xaf := p_amount;
    ELSIF p_currency = 'EUR' THEN
        amount_in_xaf := p_amount * (SELECT exchange_rate FROM currency_rates WHERE base_currency = 'EUR' AND target_currency = 'XAF' AND is_active = true LIMIT 1);
    ELSIF p_currency = 'USD' THEN
        amount_in_xaf := p_amount * (SELECT exchange_rate FROM currency_rates WHERE base_currency = 'USD' AND target_currency = 'XAF' AND is_active = true LIMIT 1);
    ELSIF p_currency = 'XOF' THEN
        amount_in_xaf := p_amount;
    ELSE
        amount_in_xaf := p_amount; -- Assume XAF if currency is unknown
    END IF;
    
    RETURN CEIL(amount_in_xaf / coin_rate);
END;
$$;


ALTER FUNCTION "public"."convert_price_to_coins"("p_amount" numeric, "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_advertising_campaign"("p_title" "text", "p_description" "text", "p_ad_type" "text", "p_ad_content" "text", "p_link_url" "text", "p_advertiser_id" "uuid", "p_pack_type" "text", "p_total_cost_cfa" integer, "p_coins_used" integer, "p_countries" "text"[], "p_cities" "text"[], "p_created_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_campaign_id UUID;
  pack_coins INTEGER;
BEGIN
  SELECT purchased_coins INTO pack_coins FROM profiles WHERE id = p_advertiser_id;
  IF pack_coins < p_coins_used THEN RAISE EXCEPTION 'Pièces insuffisantes. Disponible: %, Requis: %', pack_coins, p_coins_used; END IF;
  INSERT INTO advertising_campaigns (title, description, ad_type, ad_content, link_url, advertiser_id, pack_type, total_cost_cfa, coins_used, countries, cities, created_by)
  VALUES (p_title, p_description, p_ad_type, p_ad_content, p_link_url, p_advertiser_id, p_pack_type, p_total_cost_cfa, p_coins_used, p_countries, p_cities, p_created_by)
  RETURNING id INTO new_campaign_id;
  UPDATE profiles SET purchased_coins = purchased_coins - p_coins_used WHERE id = p_advertiser_id;
  RETURN new_campaign_id;
END;
$$;


ALTER FUNCTION "public"."create_advertising_campaign"("p_title" "text", "p_description" "text", "p_ad_type" "text", "p_ad_content" "text", "p_link_url" "text", "p_advertiser_id" "uuid", "p_pack_type" "text", "p_total_cost_cfa" integer, "p_coins_used" integer, "p_countries" "text"[], "p_cities" "text"[], "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_announcement"("ann_title" "text", "ann_message" "text", "ann_video_url" "text", "creator_uuid" "uuid", "ann_type" "text" DEFAULT 'info'::"text", "ann_image_url" "text" DEFAULT NULL::"text", "send_to_all" boolean DEFAULT true, "immediate_send" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
    DECLARE
        announcement_id UUID;
    BEGIN
        -- Vérifier la vidéo obligatoire
        IF ann_video_url IS NULL OR ann_video_url = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Une vidéo est obligatoire pour les annonces');
        END IF;
        
        -- Créer l'annonce
        INSERT INTO announcements (
            title,
            message,
            type,
            image_url,
            video_url,
            video_required,
            target_audience,
            send_to_all_users,
            send_immediately,
            status,
            created_by
        ) VALUES (
            ann_title,
            ann_message,
            ann_type,
            ann_image_url,
            ann_video_url,
            true, -- Vidéo obligatoire
            CASE WHEN send_to_all THEN 'all' ELSE 'users' END,
            send_to_all,
            immediate_send,
            'approved', -- Simplified status
            creator_uuid
        ) RETURNING id INTO announcement_id;
        
        -- Si envoi immédiat
        IF immediate_send THEN
            PERFORM send_announcement_to_users(announcement_id);
        END IF;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Annonce créée avec succès',
            'announcement_id', announcement_id,
            'needs_approval', false
        );
    END;
    $$;


ALTER FUNCTION "public"."create_announcement"("ann_title" "text", "ann_message" "text", "ann_video_url" "text", "creator_uuid" "uuid", "ann_type" "text", "ann_image_url" "text", "send_to_all" boolean, "immediate_send" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_bank_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_bank_name" "text", "p_account_number" "text", "p_account_holder" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN public.create_withdrawal_request(
        p_organizer_id,
        p_amount_coins,
        'bank_account',
        jsonb_build_object(
            'bank_name', p_bank_name,
            'account_number', p_account_number,
            'account_holder', p_account_holder
        )
    );
END;
$$;


ALTER FUNCTION "public"."create_bank_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_bank_name" "text", "p_account_number" "text", "p_account_holder" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_moov_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN public.create_withdrawal_request(
        p_organizer_id,
        p_amount_coins,
        'moov_money',
        jsonb_build_object(
            'phone_number', p_phone_number,
            'operator', 'Moov',
            'service', 'Moov Money'
        )
    );
END;
$$;


ALTER FUNCTION "public"."create_moov_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_orange_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN public.create_withdrawal_request(
        p_organizer_id,
        p_amount_coins,
        'orange_money',
        jsonb_build_object(
            'phone_number', p_phone_number,
            'operator', 'Orange',
            'service', 'Orange Money'
        )
    );
END;
$$;


ALTER FUNCTION "public"."create_orange_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_organizer_scanner"("p_organizer_id" "uuid", "p_scanner_name" "text", "p_device_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_scanner_code TEXT;
    scanner_id UUID;
BEGIN
    -- Générer un code scanner unique
    new_scanner_code := 'SCAN-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)) || '-' || 
                       TO_CHAR(EXTRACT(EPOCH FROM NOW()), 'FM000000');
    
    INSERT INTO organizer_scanners (organizer_id, scanner_name, scanner_code, device_id)
    VALUES (p_organizer_id, p_scanner_name, new_scanner_code, p_device_id)
    RETURNING id INTO scanner_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'scanner_id', scanner_id,
        'scanner_code', new_scanner_code,
        'message', 'Scanner créé avec succès'
    );
END;
$$;


ALTER FUNCTION "public"."create_organizer_scanner"("p_organizer_id" "uuid", "p_scanner_name" "text", "p_device_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_license_id UUID;
  revenue_share_percent INTEGER;
  duration_days INTEGER;
BEGIN
  CASE p_license_type
    WHEN 'starter' THEN
      revenue_share_percent := 20;
      duration_days := 30;
    WHEN 'business' THEN
      revenue_share_percent := 30;
      duration_days := 90;
    WHEN 'premium' THEN
      revenue_share_percent := 40;
      duration_days := 365;
    ELSE
      revenue_share_percent := 20;
      duration_days := 30;
  END CASE;

  INSERT INTO public.partner_licenses (
    partner_id, license_type, license_code, country, region, cities,
    monthly_fee_cfa, revenue_share_percent, company_name, legal_reference,
    contact_phone, contact_email, address, created_by, duration_days, status
  ) VALUES (
    p_partner_id, p_license_type, 
    'LIC-' || UPPER(p_country) || '-' || UPPER(p_license_type) || '-' || TO_CHAR(NOW(), 'YYYYMMDD'),
    p_country, p_region, p_cities,
    p_monthly_fee_cfa, revenue_share_percent, p_company_name, p_legal_reference,
    p_contact_phone, p_contact_email, p_address, p_created_by, duration_days, 'pending_verification'
  ) RETURNING id INTO new_license_id;

  UPDATE public.profiles 
  SET 
    admin_type = 'actionnaire',
    user_type = 'admin',
    country = p_country
  WHERE id = p_partner_id;

  RETURN new_license_id;
END;
$$;


ALTER FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_license_id UUID;
  revenue_share_percent INTEGER;
BEGIN
  CASE p_license_type
    WHEN 'starter' THEN revenue_share_percent := 40;
    WHEN 'business' THEN revenue_share_percent := 40;
    WHEN 'premium' THEN revenue_share_percent := 40;
    ELSE revenue_share_percent := 40;
  END CASE;

  INSERT INTO partner_licenses (
    partner_id, license_type, license_code, country, region, cities,
    monthly_fee_cfa, revenue_share_percent, company_name, legal_reference,
    contact_phone, contact_email, address, created_by, duration_days, start_date, status
  )
  VALUES (
    p_partner_id, p_license_type, 'LIC-' || UPPER(p_country) || '-' || UPPER(p_license_type) || '-' || TO_CHAR(NOW(), 'YYYYMMDD'),
    p_country, p_region, p_cities, p_monthly_fee_cfa, revenue_share_percent,
    p_company_name, p_legal_reference, p_contact_phone, p_contact_email, p_address,
    p_created_by, p_duration_days, NOW(), 'active'
  )
  RETURNING id INTO new_license_id;

  UPDATE profiles
  SET admin_type = 'actionnaire', role = 'admin', country = p_country
  WHERE id = p_partner_id;

  RETURN new_license_id;
END;
$$;


ALTER FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer, "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_license_id UUID;
  revenue_share_percent INTEGER;
BEGIN
  CASE p_license_type
    WHEN 'starter' THEN revenue_share_percent := 40;
    WHEN 'business' THEN revenue_share_percent := 40;
    WHEN 'premium' THEN revenue_share_percent := 40;
    ELSE revenue_share_percent := 40;
  END CASE;

  INSERT INTO partner_licenses (
    partner_id, license_type, license_code, country, region, cities,
    monthly_fee_cfa, revenue_share_percent, company_name, legal_reference,
    contact_phone, contact_email, address, created_by, duration_days, start_date, status,
    rib_document_url, fiscal_document_url, commerce_register_url, location_proof_url,
    opening_authorization_url, legal_agreement_url, additional_documents_url
  )
  VALUES (
    p_partner_id, p_license_type, 'LIC-' || UPPER(p_country) || '-' || UPPER(p_license_type) || '-' || TO_CHAR(NOW(), 'YYYYMMDD'),
    p_country, p_region, p_cities, p_monthly_fee_cfa, revenue_share_percent,
    p_company_name, p_legal_reference, p_contact_phone, p_contact_email, p_address,
    p_created_by, p_duration_days, NOW(), 'active',
    p_rib_document_url, p_fiscal_document_url, p_commerce_register_url, p_location_proof_url,
    p_opening_authorization_url, p_legal_agreement_url, p_additional_documents_url
  )
  RETURNING id INTO new_license_id;

  UPDATE profiles
  SET admin_type = 'actionnaire', role = 'admin', country = p_country
  WHERE id = p_partner_id;

  RETURN new_license_id;
END;
$$;


ALTER FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer, "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_created_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_license_id UUID;
  caller_role TEXT;
BEGIN
  -- Verify caller is a super_admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = p_created_by;
  IF caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Permission non accordée. Seul un super administrateur peut créer une licence.';
  END IF;

  -- Insert a new license with a pending status
  INSERT INTO partner_licenses (
    partner_id,
    license_type,
    license_code,
    country,
    cities,
    status,
    created_by,
    start_date,
    duration_days,
    monthly_fee_cfa,
    revenue_share_percent
  )
  VALUES (
    p_partner_id,
    'default', -- A default type, admin will choose later or it's fixed
    'LIC-' || UPPER(p_country) || '-' || TO_CHAR(NOW(), 'YYYYMMDD'),
    p_country,
    p_cities,
    'pending_verification', -- New status
    p_created_by,
    NOW(),
    365, -- Default duration, can be adjusted
    0, -- Default fee, to be set upon verification
    40 -- Default share, to be set upon verification
  )
  RETURNING id INTO new_license_id;

  -- Update the user's profile to assign the admin role
  UPDATE public.profiles
  SET 
    role = 'admin',
    admin_type = 'actionnaire',
    country = p_country
  WHERE id = p_partner_id;

  RETURN new_license_id;
END;
$$;


ALTER FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_license_type" "text", "p_created_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_license_id UUID;
  caller_role TEXT;
  revenue_share_percent INTEGER;
  monthly_fee_cfa INTEGER;
  duration_days INTEGER;
BEGIN
  -- Verify caller is a super_admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = p_created_by;
  IF caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Permission non accordée. Seul un super administrateur peut créer une licence.';
  END IF;

  -- Determine fee, share and duration based on license type
  CASE p_license_type
    WHEN 'starter' THEN
        monthly_fee_cfa := 100000;
        revenue_share_percent := 40;
        duration_days := 30;
    WHEN 'business' THEN
        monthly_fee_cfa := 300000;
        revenue_share_percent := 40;
        duration_days := 60;
    WHEN 'premium' THEN
        monthly_fee_cfa := 500000;
        revenue_share_percent := 40;
        duration_days := 90;
    ELSE
        -- Default values if type is somehow invalid
        monthly_fee_cfa := 0;
        revenue_share_percent := 40;
        duration_days := 30;
  END CASE;

  -- Insert a new license with a pending status
  INSERT INTO partner_licenses (
    partner_id,
    license_type,
    license_code,
    country,
    cities,
    status,
    created_by,
    start_date,
    duration_days,
    monthly_fee_cfa,
    revenue_share_percent
  )
  VALUES (
    p_partner_id,
    p_license_type,
    'LIC-' || UPPER(p_country) || '-' || TO_CHAR(NOW(), 'YYYYMMDD'),
    p_country,
    p_cities,
    'pending_verification', -- New status
    p_created_by,
    NOW(),
    duration_days,
    monthly_fee_cfa,
    revenue_share_percent
  )
  RETURNING id INTO new_license_id;

  -- Update the user's profile to assign the admin role
  UPDATE public.profiles
  SET 
    role = 'admin',
    admin_type = 'actionnaire',
    country = p_country
  WHERE id = p_partner_id;

  RETURN new_license_id;
END;
$$;


ALTER FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_license_type" "text", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_paypal_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_paypal_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN public.create_withdrawal_request(
        p_organizer_id,
        p_amount_coins,
        'paypal',
        jsonb_build_object(
            'paypal_email', p_paypal_email,
            'service', 'PayPal'
        )
    );
END;
$$;


ALTER FUNCTION "public"."create_paypal_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_paypal_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_test_organizer"() RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    new_user_id UUID;
    new_profile_id UUID;
BEGIN
    -- Créer d'abord un utilisateur dans la table users (si elle existe)
    -- Si vous utilisez l'authentification Supabase, cette partie est gérée automatiquement
    -- Ici on suppose que profiles est la table principale
    
    -- Créer directement dans profiles avec un ID cohérent
    new_profile_id := gen_random_uuid();
    
    INSERT INTO public.profiles (
        id,
        username, 
        email, 
        admin_type, 
        appointed_by_super_admin, 
        license_status,
        license_type
    ) VALUES (
        new_profile_id,
        'test_organizer_' || substr(md5(random()::text), 1, 8),
        'test_organizer_' || substr(md5(random()::text), 1, 8) || '@test.com',
        'organizer',
        true,
        'active',
        'standard'
    );
    
    RETURN new_profile_id;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Erreur lors de la création du profil: %', SQLERRM;
        RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."create_test_organizer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_with_role"("p_name" "text", "p_email" "text", "p_password" "text", "p_phone" "text", "p_country" "text", "p_city" "text", "p_role" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_user_id UUID;
    caller_role TEXT;
BEGIN
    -- Get caller's role
    caller_role := (SELECT get_my_claim('user_type'));

    -- Only super_admins can call this function
    IF caller_role <> 'super_admin' THEN
        RETURN QUERY SELECT false, 'Permission non accordée.';
        RETURN;
    END IF;

    -- Prevent creating another super_admin
    IF p_role = 'super_admin' THEN
        RETURN QUERY SELECT false, 'La création de super administrateurs est interdite.';
        RETURN;
    END IF;

    -- Create the user in auth.users
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, phone, email_change_confirm_status)
    VALUES (current_setting('app.instance_id')::uuid, gen_random_uuid(), 'authenticated', 'authenticated', p_email, crypt(p_password, gen_salt('bf')), now(), '', now(), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_name, 'user_type', p_role, 'country', p_country, 'city', p_city, 'phone', p_phone), now(), now(), p_phone, 0)
    RETURNING id INTO new_user_id;

    -- The handle_new_user trigger will automatically create the profile. We need to update the role explicitly.
    UPDATE public.profiles SET user_type = p_role, admin_type = (CASE WHEN p_role = 'admin' THEN 'country_manager' ELSE NULL END) WHERE id = new_user_id;

    RETURN QUERY SELECT true, 'Utilisateur créé avec succès.';
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT false, 'Un utilisateur avec cet email existe déjà.';
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_user_with_role"("p_name" "text", "p_email" "text", "p_password" "text", "p_phone" "text", "p_country" "text", "p_city" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_visa_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_card_number" "text", "p_card_holder" "text", "p_expiry_date" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN public.create_withdrawal_request(
        p_organizer_id,
        p_amount_coins,
        'visa_card',
        jsonb_build_object(
            'card_number', p_card_number,
            'card_holder', p_card_holder,
            'expiry_date', p_expiry_date,
            'type', 'Visa'
        )
    );
END;
$$;


ALTER FUNCTION "public"."create_visa_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_card_number" "text", "p_card_holder" "text", "p_expiry_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_balance BIGINT;
    withdrawal_id UUID;
    minimum_withdrawal BIGINT := 50; -- 50 pièces minimum
    organizer_username TEXT;
BEGIN
    -- Vérifier que l'organisateur existe
    SELECT username INTO organizer_username
    FROM public.profiles 
    WHERE id = p_organizer_id;
    
    IF organizer_username IS NULL THEN
        RAISE EXCEPTION 'Organisateur non trouvé';
    END IF;
    
    -- Vérifier le solde actuel
    SELECT total_balance_coins INTO current_balance
    FROM public.organizer_wallet 
    WHERE organizer_id = p_organizer_id;
    
    -- Vérifier si le solde est suffisant
    IF current_balance IS NULL OR current_balance < p_amount_coins THEN
        RAISE EXCEPTION 'Solde insuffisant. Solde actuel: % pièces, Retrait demandé: % pièces', 
                        COALESCE(current_balance, 0), p_amount_coins;
    END IF;
    
    -- Vérifier le minimum de retrait
    IF p_amount_coins < minimum_withdrawal THEN
        RAISE EXCEPTION 'Retrait minimum non atteint. Minimum: % pièces (% FCFA)', 
                        minimum_withdrawal, (minimum_withdrawal * 10);
    END IF;
    
    -- Créer la demande de retrait (adaptée à votre structure)
    INSERT INTO public.withdrawal_requests (
        user_id,  -- Utiliser user_id au lieu de organizer_id
        request_type,
        amount_pi,  -- amount_pi au lieu de amount_coins
        amount_fcfa,
        status,
        requested_at
    ) VALUES (
        p_organizer_id,
        'coins_withdrawal',
        p_amount_coins,
        p_amount_coins * 10, -- Conversion en FCFA
        'pending',
        NOW()
    )
    RETURNING id INTO withdrawal_id;
    
    RETURN withdrawal_id;
    
END;
$$;


ALTER FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_coins_amount" integer, "p_payment_method" "text", "p_account_number" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_earnings INT;
    cfa_rate INT;
    cfa_equiv INT;
    min_withdrawal_coins INT := 50; -- Minimum withdrawal amount in coins
BEGIN
    SELECT earnings_coins INTO user_earnings FROM public.profiles WHERE id = p_organizer_id;
    SELECT coin_to_cfa_rate INTO cfa_rate FROM public.admin_config LIMIT 1;

    IF p_coins_amount < min_withdrawal_coins THEN
        RETURN QUERY SELECT false, 'Le montant minimum de retrait est de ' || min_withdrawal_coins || ' pièces.';
        RETURN;
    END IF;

    IF user_earnings < p_coins_amount THEN
        RETURN QUERY SELECT false, 'Solde de gains insuffisant.';
        RETURN;
    END IF;

    cfa_equiv := p_coins_amount * cfa_rate;

    UPDATE public.profiles SET earnings_coins = earnings_coins - p_coins_amount WHERE id = p_organizer_id;

    INSERT INTO public.withdrawal_requests (organizer_id, coins_amount, cfa_amount, payment_method, account_number, status)
    VALUES (p_organizer_id, p_coins_amount, cfa_equiv, p_payment_method, p_account_number, 'pending');

    RETURN QUERY SELECT true, 'Demande de retrait soumise avec succès.';
EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_coins_amount" integer, "p_payment_method" "text", "p_account_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_withdrawal_method" "text" DEFAULT NULL::"text", "p_payment_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_balance BIGINT;
    withdrawal_id UUID;
    minimum_withdrawal BIGINT := 50;
    organizer_exists BOOLEAN;
    valid_request_type TEXT;
BEGIN
    -- Trouver un request_type valide
    SELECT DISTINCT request_type INTO valid_request_type
    FROM public.withdrawal_requests 
    WHERE request_type IS NOT NULL
    LIMIT 1;
    
    -- Valeur par défaut si aucun type trouvé
    valid_request_type := COALESCE(valid_request_type, 'withdrawal');
    
    -- Vérifier que l'organisateur existe
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE id = p_organizer_id AND user_type = 'organizer'
    ) INTO organizer_exists;
    
    IF NOT organizer_exists THEN
        RAISE EXCEPTION 'Organisateur non trouvé ou mauvais type';
    END IF;
    
    -- Vérifier le solde
    SELECT total_balance_coins INTO current_balance
    FROM public.organizer_wallet 
    WHERE organizer_id = p_organizer_id;
    
    -- Vérifications
    IF current_balance IS NULL OR current_balance < p_amount_coins THEN
        RAISE EXCEPTION 'Solde insuffisant. Solde actuel: % pièces, Retrait demandé: % pièces', 
                        COALESCE(current_balance, 0), p_amount_coins;
    END IF;
    
    IF p_amount_coins < minimum_withdrawal THEN
        RAISE EXCEPTION 'Retrait minimum non atteint. Minimum: % pièces (% FCFA)', 
                        minimum_withdrawal, (minimum_withdrawal * 10);
    END IF;
    
    -- Valider le mode de retrait
    IF p_withdrawal_method IS NOT NULL AND p_withdrawal_method NOT IN (
        'orange_money', 'moov_money', 'visa_card', 'bank_account', 'paypal'
    ) THEN
        RAISE EXCEPTION 'Mode de retrait non valide';
    END IF;
    
    -- Créer la demande
    INSERT INTO public.withdrawal_requests (
        user_id,
        request_type,  -- Utiliser le type valide
        amount_pi,
        amount_fcfa,
        withdrawal_method,
        payment_details,
        status,
        requested_at
    ) VALUES (
        p_organizer_id,
        valid_request_type,
        p_amount_coins,
        p_amount_coins * 10,
        p_withdrawal_method,
        p_payment_details,
        'pending',
        NOW()
    )
    RETURNING id INTO withdrawal_id;
    
    RETURN withdrawal_id;
    
END;
$$;


ALTER FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_withdrawal_method" "text", "p_payment_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."credit_user_after_payment"("p_user_id" "uuid", "p_pack_id" "uuid", "p_amount_paid" integer, "p_transaction_id" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    pack_info RECORD;
    coins_to_add INT;
    bonus_coins_to_add INT;
    user_profile RECORD;
BEGIN
    -- Vérifier si la transaction a déjà été traitée
    IF EXISTS (SELECT 1 FROM public.payment_transactions WHERE transaction_id_provider = p_transaction_id AND status = 'completed') THEN
        RETURN QUERY SELECT true, 'Transaction déjà traitée.';
        RETURN;
    END IF;

    -- Trouver le pack spécifique dans la nouvelle table
    SELECT * INTO pack_info FROM public.coin_packs WHERE id = p_pack_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Pack non trouvé.';
        RETURN;
    END IF;

    -- Calculer les pièces à ajouter
    coins_to_add := pack_info.coin_amount;
    bonus_coins_to_add := pack_info.bonus_coins;

    -- Récupérer les soldes actuels
    SELECT purchased_coins, bonus_coins, earnings_coins INTO user_profile FROM public.profiles WHERE id = p_user_id;

    -- Créditer le compte de l'utilisateur
    UPDATE public.profiles
    SET 
        purchased_coins = COALESCE(purchased_coins, 0) + coins_to_add,
        bonus_coins = COALESCE(bonus_coins, 0) + bonus_coins_to_add
    WHERE id = p_user_id;

    -- Enregistrer la transaction de pièces
    INSERT INTO public.coin_transactions (user_id, type, amount, description, purchased_balance_after, bonus_balance_after, earnings_balance_after, metadata)
    VALUES (p_user_id, 'credit', coins_to_add, 'Achat du pack: ' || pack_info.name, COALESCE(user_profile.purchased_coins, 0) + coins_to_add, COALESCE(user_profile.bonus_coins, 0) + bonus_coins_to_add, user_profile.earnings_coins, jsonb_build_object('pack_id', p_pack_id));
    
    IF bonus_coins_to_add > 0 THEN
        INSERT INTO public.coin_transactions (user_id, type, amount, description, purchased_balance_after, bonus_balance_after, earnings_balance_after, metadata)
        VALUES (p_user_id, 'bonus', bonus_coins_to_add, 'Bonus pour l''achat du pack: ' || pack_info.name, COALESCE(user_profile.purchased_coins, 0) + coins_to_add, COALESCE(user_profile.bonus_coins, 0) + bonus_coins_to_add, user_profile.earnings_coins, jsonb_build_object('pack_id', p_pack_id));
    END IF;

    -- Enregistrer ou mettre à jour la transaction de paiement
    INSERT INTO public.payment_transactions (user_id, transaction_id_provider, pack_id, amount_cfa, coins_credited, status)
    VALUES (p_user_id, p_transaction_id, p_pack_id, p_amount_paid, coins_to_add + bonus_coins_to_add, 'completed')
    ON CONFLICT (transaction_id_provider) DO UPDATE 
    SET status = 'completed', updated_at = NOW(), user_id = p_user_id, pack_id = p_pack_id, amount_cfa = p_amount_paid, coins_credited = coins_to_add + bonus_coins_to_add;

    RETURN QUERY SELECT true, 'Compte crédité avec succès.';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Erreur interne: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."credit_user_after_payment"("p_user_id" "uuid", "p_pack_id" "uuid", "p_amount_paid" integer, "p_transaction_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."credit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_creditor_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    creditor_profile RECORD;
    target_user_profile RECORD;
    notification_title TEXT;
    notification_message TEXT;
    coin_to_fcfa_rate_val INT;
    v_zone_admin_id UUID;
BEGIN
    -- Obtenir les informations sur le créditeur
    SELECT * INTO creditor_profile FROM public.profiles WHERE id = p_creditor_id;
    
    IF creditor_profile.user_type NOT IN ('super_admin', 'secretary') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permission non accordée.');
    END IF;

    UPDATE public.profiles
    SET coin_balance = COALESCE(coin_balance, 0) + p_amount
    WHERE id = p_user_id
    RETURNING * INTO target_user_profile;

    INSERT INTO public.admin_logs (actor_id, action_type, target_id, details)
    VALUES (p_creditor_id, 'user_credited', p_user_id, jsonb_build_object('amount', p_amount, 'reason', p_reason));

    SELECT coin_to_fcfa_rate INTO coin_to_fcfa_rate_val FROM app_settings LIMIT 1;
    coin_to_fcfa_rate_val := COALESCE(coin_to_fcfa_rate_val, 10);

    INSERT INTO public.transactions (user_id, transaction_type, amount_pi, amount_fcfa, description, status, city, region, country)
    VALUES (
        p_user_id, 
        'manual_credit', 
        p_amount, 
        p_amount * coin_to_fcfa_rate_val, 
        'Crédit manuel par ' || creditor_profile.full_name || ': ' || p_reason, 
        'completed',
        target_user_profile.city,
        target_user_profile.region,
        target_user_profile.country
    );
    
    -- Find the zone admin and record revenue
    v_zone_admin_id := get_zone_admin(target_user_profile.country);
    IF v_zone_admin_id IS NOT NULL THEN
        INSERT INTO public.admin_revenue(admin_id, credited_user_id, creditor_id, credit_source, amount_pi, amount_fcfa)
        VALUES (v_zone_admin_id, p_user_id, p_creditor_id, creditor_profile.user_type, p_amount, p_amount * coin_to_fcfa_rate_val);
    END IF;

    notification_title := '🎉 Vous avez reçu des pièces !';
    notification_message := 'Vous avez été crédité de ' || p_amount || ' pièces. ' || COALESCE(p_reason, '');
    
    INSERT INTO public.notifications (user_id, title, message, type, data, sound_enabled, sound_effect, is_global)
    VALUES (p_user_id, notification_title, notification_message, 'earning', jsonb_build_object('amount', p_amount), true, 'coin', false);

    RETURN jsonb_build_object('success', true, 'message', 'Utilisateur crédité avec succès.');
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'message', 'Une erreur est survenue: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."credit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_creditor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debit_and_distribute_participation_fee"("p_user_id" "uuid", "p_event_id" "uuid", "p_transaction_type" "text", "p_amount_coins" integer, "p_reference_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_profile RECORD;
    event_record RECORD;
    platform_fee_rate NUMERIC;
    platform_fee_coins INT;
    organizer_earnings_coins INT;
    free_coins_used INT;
    paid_coins_used INT;
    v_coin_to_fcfa_rate INT;
    super_admin_id UUID;
BEGIN
    -- 1. Get settings
    SELECT platform_fee_percentage, coin_to_fcfa_rate 
    INTO platform_fee_rate, v_coin_to_fcfa_rate 
    FROM app_settings LIMIT 1;
    
    platform_fee_rate := COALESCE(platform_fee_rate, 5) / 100.0;
    v_coin_to_fcfa_rate := COALESCE(v_coin_to_fcfa_rate, 10);

    -- 2. Get user and event info
    SELECT * INTO user_profile FROM profiles WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Utilisateur non trouvé.'); END IF;

    SELECT organizer_id INTO event_record FROM events WHERE id = p_event_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Événement non trouvé.'); END IF;

    -- 3. Check balance
    IF (COALESCE(user_profile.coin_balance, 0) + COALESCE(user_profile.free_coin_balance, 0)) < p_amount_coins THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solde de pièces insuffisant.');
    END IF;

    -- 4. Debit user (free coins first)
    free_coins_used := LEAST(COALESCE(user_profile.free_coin_balance, 0), p_amount_coins);
    paid_coins_used := p_amount_coins - free_coins_used;

    UPDATE profiles 
    SET 
        free_coin_balance = free_coin_balance - free_coins_used,
        coin_balance = coin_balance - paid_coins_used 
    WHERE id = p_user_id;

    -- 5. Log the spending
    INSERT INTO coin_spending (user_id, amount, spent_from_free, free_coins_used, paid_coins_used, purpose, target_id, target_type)
    VALUES (p_user_id, p_amount_coins, free_coins_used > 0, free_coins_used, paid_coins_used, p_transaction_type, p_event_id, 'event_participation');

    -- 6. Calculate and distribute earnings (from PAID coins only)
    IF paid_coins_used > 0 THEN
        platform_fee_coins := floor(paid_coins_used * platform_fee_rate); -- 5%
        organizer_earnings_coins := paid_coins_used - platform_fee_coins; -- 95%

        -- Credit organizer
        IF organizer_earnings_coins > 0 AND event_record.organizer_id IS NOT NULL THEN
            UPDATE profiles
            SET available_earnings = COALESCE(available_earnings, 0) + organizer_earnings_coins
            WHERE id = event_record.organizer_id;

            INSERT INTO organizer_earnings (organizer_id, event_id, transaction_type, earnings_coins, earnings_fcfa, status, platform_commission)
            VALUES (event_record.organizer_id, p_event_id, p_transaction_type, organizer_earnings_coins, organizer_earnings_coins * v_coin_to_fcfa_rate, 'available', platform_fee_coins);
        END IF;

        -- Credit platform
        IF platform_fee_coins > 0 THEN
            SELECT id INTO super_admin_id FROM profiles WHERE user_type = 'super_admin' LIMIT 1;
            IF super_admin_id IS NOT NULL THEN
                UPDATE profiles
                SET commission_wallet = COALESCE(commission_wallet, 0) + platform_fee_coins
                WHERE id = super_admin_id;
            END IF;
        END IF;
        
        -- Log participation payment record
        INSERT INTO participation_payments (user_id, event_id, organizer_id, transaction_type, reference_id, total_amount_coins, platform_fee_coins, organizer_earnings_coins)
        VALUES (p_user_id, p_event_id, event_record.organizer_id, p_transaction_type, p_reference_id, paid_coins_used, platform_fee_coins, organizer_earnings_coins);
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Paiement et distribution réussis.');
END;
$$;


ALTER FUNCTION "public"."debit_and_distribute_participation_fee"("p_user_id" "uuid", "p_event_id" "uuid", "p_transaction_type" "text", "p_amount_coins" integer, "p_reference_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debit_coins_and_distribute_earnings"("p_user_id" "uuid", "p_event_id" "uuid", "p_amount_pi" integer, "p_purpose" "text", "p_target_id" "uuid", "p_target_type" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_profile RECORD;
    event_record RECORD;
    free_coins_used INTEGER;
    paid_coins_used INTEGER;
    platform_commission_rate NUMERIC;
    platform_fee INTEGER;
    organizer_earning INTEGER;
    super_admin_id uuid;
BEGIN
    -- Obtenir les paramètres de la plateforme
    SELECT platform_fee_percentage INTO platform_commission_rate FROM app_settings LIMIT 1;
    platform_commission_rate := COALESCE(platform_commission_rate, 5) / 100.0; -- Default to 5%

    -- Obtenir le profil utilisateur
    SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utilisateur non trouvé.');
    END IF;

    -- Vérifier le solde
    IF (COALESCE(user_profile.coin_balance, 0) + COALESCE(user_profile.free_coin_balance, 0)) < p_amount_pi THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solde de pièces insuffisant.');
    END IF;

    -- Obtenir l'organisateur de l'événement
    SELECT organizer_id INTO event_record FROM public.events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Événement non trouvé.');
    END IF;

    -- Débiter l'utilisateur (priorité aux pièces gratuites)
    free_coins_used := LEAST(COALESCE(user_profile.free_coin_balance, 0), p_amount_pi);
    paid_coins_used := p_amount_pi - free_coins_used;

    UPDATE public.profiles 
    SET 
        free_coin_balance = free_coin_balance - free_coins_used,
        coin_balance = coin_balance - paid_coins_used 
    WHERE id = p_user_id;

    -- Enregistrer la dépense
    INSERT INTO public.coin_spending (user_id, amount, spent_from_free, free_coins_used, paid_coins_used, purpose, target_id, target_type)
    VALUES (p_user_id, p_amount_pi, free_coins_used > 0, free_coins_used, paid_coins_used, p_purpose, p_target_id, p_target_type);

    -- Calculer et distribuer les gains à partir des pièces PAYANTES uniquement
    IF paid_coins_used > 0 THEN
        platform_fee := floor(paid_coins_used * platform_commission_rate); -- e.g. 5%
        organizer_earning := paid_coins_used - platform_fee; -- e.g. 95%

        IF organizer_earning > 0 AND event_record.organizer_id IS NOT NULL AND event_record.organizer_id <> p_user_id THEN
            -- Créditer l'organisateur
            UPDATE public.profiles
            SET available_earnings = COALESCE(available_earnings, 0) + organizer_earning
            WHERE id = event_record.organizer_id;

            -- Enregistrer les gains de l'organisateur
            INSERT INTO public.organizer_earnings (organizer_id, event_id, earnings_type, amount, status, platform_commission) 
            VALUES (event_record.organizer_id, p_event_id, p_purpose, organizer_earning, 'available', platform_fee);
        
            -- Créditer le portefeuille de commission de la plateforme
            SELECT id INTO super_admin_id FROM profiles WHERE user_type = 'super_admin' LIMIT 1;
            IF super_admin_id IS NOT NULL THEN
              UPDATE public.profiles
              SET commission_wallet = COALESCE(commission_wallet, 0) + platform_fee
              WHERE id = super_admin_id;
            END IF;
        END IF;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Débit et distribution réussis.');
END;
$$;


ALTER FUNCTION "public"."debit_coins_and_distribute_earnings"("p_user_id" "uuid", "p_event_id" "uuid", "p_amount_pi" integer, "p_purpose" "text", "p_target_id" "uuid", "p_target_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_debitor_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    debitor_profile RECORD;
    target_user_profile RECORD;
    notification_title TEXT;
    notification_message TEXT;
    coin_to_fcfa_rate_val INT;
    paid_coins_to_debit INT;
    free_coins_to_debit INT;
BEGIN
    -- Obtenir les informations sur le débiteur et vérifier les permissions
    SELECT * INTO debitor_profile FROM public.profiles WHERE id = p_debitor_id;
    IF debitor_profile.user_type <> 'super_admin' AND NOT (debitor_profile.user_type = 'secretary' AND debitor_profile.appointed_by_super_admin = TRUE) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permission non accordée.');
    END IF;

    -- Obtenir les informations de l'utilisateur cible
    SELECT * INTO target_user_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utilisateur non trouvé.');
    END IF;

    -- Vérifier si le solde est suffisant
    IF (COALESCE(target_user_profile.coin_balance, 0) + COALESCE(target_user_profile.free_coin_balance, 0)) < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solde de l''utilisateur insuffisant pour ce débit.');
    END IF;

    -- Débiter d'abord les pièces payantes, puis les pièces gratuites
    paid_coins_to_debit := LEAST(COALESCE(target_user_profile.coin_balance, 0), p_amount);
    free_coins_to_debit := p_amount - paid_coins_to_debit;

    -- Mettre à jour le solde de l'utilisateur
    UPDATE public.profiles
    SET 
        coin_balance = coin_balance - paid_coins_to_debit,
        free_coin_balance = free_coin_balance - free_coins_to_debit
    WHERE id = p_user_id;

    -- Enregistrer l'action dans les journaux d'administration
    INSERT INTO public.admin_logs (actor_id, action_type, target_id, details)
    VALUES (p_debitor_id, 'user_debited', p_user_id, jsonb_build_object('amount', p_amount, 'reason', p_reason));

    -- Obtenir le taux de conversion
    SELECT coin_to_fcfa_rate INTO coin_to_fcfa_rate_val FROM app_settings LIMIT 1;
    coin_to_fcfa_rate_val := COALESCE(coin_to_fcfa_rate_val, 10);

    -- Enregistrer une transaction négative pour ajuster le chiffre d'affaires
    INSERT INTO public.transactions (user_id, transaction_type, amount_pi, amount_fcfa, description, status, city, region, country)
    VALUES (
        p_user_id, 
        'manual_debit', 
        -p_amount, -- Montant négatif
        -p_amount * coin_to_fcfa_rate_val, -- Montant FCFA négatif
        'Débit manuel par ' || debitor_profile.full_name || ': ' || p_reason, 
        'completed',
        target_user_profile.city,
        target_user_profile.region,
        target_user_profile.country
    );

    -- Envoyer une notification à l'utilisateur
    notification_title := '⚠️ Un débit a été effectué sur votre compte';
    notification_message := 'Votre compte a été débité de ' || p_amount || ' pièces. Raison: ' || COALESCE(p_reason, 'Débit administratif.');
    
    INSERT INTO public.notifications (user_id, title, message, type, data, sound_enabled, sound_effect)
    VALUES (p_user_id, notification_title, notification_message, 'system', jsonb_build_object('amount', p_amount, 'reason', p_reason), true, 'alert');

    RETURN jsonb_build_object('success', true, 'message', 'Le compte a été débité avec succès.');
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'message', 'Une erreur est survenue: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."debit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_debitor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_event_completely"("p_event_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- This order is important to respect foreign key constraints.
    DELETE FROM public.event_comments WHERE event_id = p_event_id;
    DELETE FROM public.event_reactions WHERE event_id = p_event_id;
    DELETE FROM public.content_reports WHERE target_id = p_event_id AND target_type = 'event';

    -- Ticketing related data
    DELETE FROM public.ticket_verifications WHERE event_id = p_event_id;
    DELETE FROM public.ticket_issues WHERE event_id = p_event_id;
    DELETE FROM public.ticket_emails WHERE event_ticket_id IN (SELECT id FROM public.event_tickets WHERE event_id = p_event_id);
    DELETE FROM public.event_tickets WHERE event_id = p_event_id;
    DELETE FROM public.ticket_orders WHERE event_id = p_event_id;
    DELETE FROM public.ticket_types WHERE event_id = p_event_id;
    DELETE FROM public.ticketing_events WHERE event_id = p_event_id;

    -- Raffle related data
    DELETE FROM public.raffle_winners WHERE raffle_event_id IN (SELECT id FROM public.raffle_events WHERE event_id = p_event_id);
    -- Corrected this line from raffle_id to raffle_event_id
    DELETE FROM public.raffle_tickets WHERE raffle_event_id IN (SELECT re.id FROM public.raffle_events re WHERE re.event_id = p_event_id);
    DELETE FROM public.raffle_prizes WHERE event_id = p_event_id;
    DELETE FROM public.raffle_events WHERE event_id = p_event_id;

    -- Voting related data
    DELETE FROM public.participant_votes WHERE event_id = p_event_id;
    DELETE FROM public.candidates WHERE event_id = p_event_id;

    -- Stand rental related data
    DELETE FROM public.stand_rentals WHERE stand_event_id IN (SELECT id FROM public.stand_events WHERE event_id = p_event_id);
    DELETE FROM public.stand_types WHERE event_id = p_event_id;
    DELETE FROM public.stand_events WHERE event_id = p_event_id;
    DELETE FROM public.stands WHERE event_id = p_event_id;
    
    -- Other relations
    DELETE FROM public.event_promotions WHERE event_id = p_event_id;
    DELETE FROM public.event_notifications WHERE event_id = p_event_id;
    DELETE FROM public.transactions WHERE event_id = p_event_id;
    DELETE FROM public.event_revenues WHERE event_id = p_event_id;
    DELETE FROM public.event_settings WHERE event_id = p_event_id;
    DELETE FROM public.event_geocoding_results WHERE event_id = p_event_id;
    DELETE FROM public.protected_event_access WHERE event_id = p_event_id;
    DELETE FROM public.organizer_earnings WHERE event_id = p_event_id;
    DELETE FROM public.organizer_interaction_earnings WHERE event_id = p_event_id;
    DELETE FROM public.user_interactions WHERE event_id = p_event_id;

    -- Finally, delete the event itself
    DELETE FROM public.events WHERE id = p_event_id;
END;
$$;


ALTER FUNCTION "public"."delete_event_completely"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_location"("p_location_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
  location_owner_id uuid;
BEGIN
  -- Check if the caller exists in profiles
  SELECT user_type INTO caller_role FROM public.profiles WHERE id = caller_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accès refusé. Profil utilisateur non trouvé.';
  END IF;

  -- Get the owner of the location
  SELECT user_id INTO location_owner_id FROM public.locations WHERE id = p_location_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lieu non trouvé.';
  END IF;

  -- Allow deletion if the caller is the owner, an admin, or a super_admin
  IF caller_id = location_owner_id OR caller_role IN ('super_admin', 'admin') THEN
    DELETE FROM public.locations WHERE id = p_location_id;
  ELSE
    RAISE EXCEPTION 'Permission non accordée pour supprimer ce lieu.';
  END IF;
END;
$$;


ALTER FUNCTION "public"."delete_location"("p_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_securely"("p_user_id" "uuid", "p_caller_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    caller_profile RECORD;
    target_user_profile RECORD;
    root_admins TEXT[] := ARRAY['bonplaninfos@gmail.com', 'digihouse10@gmail.com'];
BEGIN
    -- 1. Check if caller exists and is a root admin
    SELECT * INTO caller_profile FROM public.profiles WHERE id = p_caller_id;
    IF NOT FOUND OR NOT (caller_profile.email = ANY(root_admins)) THEN
        RAISE EXCEPTION 'Action non autorisée.';
    END IF;

    -- 2. Check if target user exists
    SELECT * INTO target_user_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utilisateur cible non trouvé.';
    END IF;

    -- 3. Prevent deleting a root admin
    IF target_user_profile.email = ANY(root_admins) THEN
        RAISE EXCEPTION 'Les super administrateurs principaux ne peuvent pas être supprimés.';
    END IF;

    -- 4. Anonymize and disable related content instead of deleting, to preserve data integrity
    UPDATE public.events SET status = 'archived', organizer_id = NULL WHERE organizer_id = p_user_id;
    UPDATE public.event_comments SET user_id = NULL WHERE user_id = p_user_id;
    -- Continue for other user-generated content tables...

    -- 5. Delete relational data
    DELETE FROM public.user_interactions WHERE user_id = p_user_id;
    DELETE FROM public.notifications WHERE user_id = p_user_id;
    DELETE FROM public.votes WHERE user_id = p_user_id;
    DELETE FROM public.event_tickets WHERE user_id = p_user_id;
    DELETE FROM public.coin_spending WHERE user_id = p_user_id;
    DELETE FROM public.transactions WHERE user_id = p_user_id;
    DELETE FROM public.push_tokens WHERE user_id = p_user_id;
    DELETE FROM public.admin_logs WHERE actor_id = p_user_id OR target_id = p_user_id;
    
    -- 6. Delete the profile and auth user
    DELETE FROM public.profiles WHERE id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;

    -- 7. Log the action
    INSERT INTO public.admin_logs(actor_id, action_type, target_id, details)
    VALUES(p_caller_id, 'user_deleted', p_user_id, jsonb_build_object('deleted_email', target_user_profile.email));
END;
$$;


ALTER FUNCTION "public"."delete_user_securely"("p_user_id" "uuid", "p_caller_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."desactiver_licences_expirees"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE admin_licences
    SET statut = 'expiré'
    WHERE date_fin < NOW() AND statut = 'actif';
END;
$$;


ALTER FUNCTION "public"."desactiver_licences_expirees"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."draw_raffle_winner"("raffle_id_param" "uuid") RETURNS TABLE("success" boolean, "message" "text", "winning_ticket" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    winner_ticket RECORD;
    raffle_record RECORD;
BEGIN
    SELECT * INTO raffle_record FROM raffle_events WHERE id = raffle_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Raffle not found.', NULL;
        RETURN;
    END IF;

    IF raffle_record.is_drawn THEN
        RETURN QUERY SELECT false, 'Winner has already been drawn.', raffle_record.winning_ticket_number;
        RETURN;
    END IF;

    IF raffle_record.tickets_sold = 0 THEN
        RETURN QUERY SELECT false, 'No tickets sold, cannot draw a winner.', NULL;
        RETURN;
    END IF;

    -- Select a random winner
    SELECT * INTO winner_ticket FROM raffle_tickets 
    WHERE raffle_id = raffle_id_param 
    ORDER BY random() 
    LIMIT 1;

    -- Update raffle_events with winner information
    UPDATE raffle_events 
    SET 
        is_drawn = true,
        winning_ticket_number = winner_ticket.ticket_number::text,
        winner_user_id = winner_ticket.user_id,
        winner_announced_at = NOW()
    WHERE id = raffle_id_param;

    RETURN QUERY SELECT true, 'Winner drawn successfully.', winner_ticket.ticket_number::text;
END;
$$;


ALTER FUNCTION "public"."draw_raffle_winner"("raffle_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_verification_session"("p_session_id" "uuid", "p_organizer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    session_record RECORD;
BEGIN
    SELECT * INTO session_record 
    FROM verification_sessions 
    WHERE id = p_session_id AND organizer_id = p_organizer_id AND is_active = true;
    
    IF session_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session non trouvée ou déjà terminée');
    END IF;
    
    UPDATE verification_sessions 
    SET 
        is_active = false,
        session_end = NOW()
    WHERE id = p_session_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Session de vérification terminée',
        'session_id', p_session_id,
        'tickets_verified', session_record.tickets_verified,
        'session_duration', EXTRACT(EPOCH FROM (NOW() - session_record.session_start)) || ' secondes'
    );
END;
$$;


ALTER FUNCTION "public"."end_verification_session"("p_session_id" "uuid", "p_organizer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generer_paiements_mensuels"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    admin_license RECORD;
BEGIN
    IF (get_my_role()) <> 'super_admin' THEN
        RAISE EXCEPTION 'Permission non accordée.';
    END IF;
    
    FOR admin_license IN SELECT * FROM admin_licences WHERE statut = 'actif'
    LOOP
        PERFORM calculer_paiement_admin(admin_license.admin_id);
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."generer_paiements_mensuels"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_conversion_rate"() RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_rate DECIMAL(10,4);
BEGIN
    SELECT rate INTO current_rate
    FROM public.conversion_rates
    WHERE currency_from = 'FCFA' 
        AND currency_to = 'COIN'
        AND is_active = true
        AND (effective_until IS NULL OR effective_until > NOW())
    ORDER BY effective_from DESC
    LIMIT 1;
    
    RETURN COALESCE(current_rate, 0.1);
END;
$$;


ALTER FUNCTION "public"."get_current_conversion_rate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_cities_from_credits"("p_country" "text") RETURNS TABLE("city" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.city
    FROM transactions t
    WHERE t.transaction_type = 'manual_credit' AND t.country = p_country AND t.city IS NOT NULL
    ORDER BY t.city;
END;
$$;


ALTER FUNCTION "public"."get_distinct_cities_from_credits"("p_country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_cities_from_locations"() RETURNS TABLE("city" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT l.city
    FROM locations l
    WHERE l.is_active = true AND l.city IS NOT NULL
    ORDER BY l.city;
END;
$$;


ALTER FUNCTION "public"."get_distinct_cities_from_locations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_countries_from_credits"() RETURNS TABLE("country" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.country
    FROM transactions t
    WHERE t.transaction_type = 'manual_credit' AND t.country IS NOT NULL
    ORDER BY t.country;
END;
$$;


ALTER FUNCTION "public"."get_distinct_countries_from_credits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_global_analytics"() RETURNS TABLE("total_revenue_pi" bigint, "total_users" bigint, "new_users_last_30_days" bigint, "active_events" bigint, "new_events_last_30_days" bigint, "total_coins_purchased" bigint, "monthly_revenue" "jsonb", "top_5_events" "jsonb", "revenue_by_type" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH revenue_data AS (
        SELECT 
            SUM(amount) AS total_revenue_pi,
            (SELECT jsonb_agg(monthly) FROM (
                SELECT
                    date_trunc('month', created_at)::date as month,
                    SUM(amount) as total_pi
                FROM coin_spending
                WHERE created_at >= now() - interval '1 year'
                GROUP BY 1
                ORDER BY 1
            ) monthly) as monthly_revenue,
            (SELECT jsonb_agg(top_events) FROM (
                SELECT 
                    e.id as event_id,
                    e.title as event_title,
                    SUM(cs.amount) as total_revenue
                FROM coin_spending cs
                JOIN events e ON cs.target_id = e.id AND cs.target_type = 'event'
                GROUP BY e.id, e.title
                ORDER BY total_revenue DESC
                LIMIT 5
            ) top_events) as top_5_events,
            (SELECT jsonb_agg(by_type) FROM (
                SELECT
                    purpose,
                    SUM(amount) as total_pi
                FROM coin_spending
                GROUP BY purpose
            ) by_type) as revenue_by_type
        FROM coin_spending
    ),
    user_data AS (
        SELECT
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') as new_users_last_30_days
        FROM profiles
    ),
    event_data AS (
        SELECT
            COUNT(*) as active_events,
            COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') as new_events_last_30_days
        FROM events
        WHERE status = 'active'
    ),
    purchase_data AS (
        SELECT SUM(coins_credited) as total_coins_purchased FROM coin_transactions
    )
    SELECT 
        rd.total_revenue_pi,
        ud.total_users,
        ud.new_users_last_30_days,
        ed.active_events,
        ed.new_events_last_30_days,
        pd.total_coins_purchased,
        rd.monthly_revenue,
        rd.top_5_events,
        rd.revenue_by_type
    FROM revenue_data rd, user_data ud, event_data ed, purchase_data pd;
END;
$$;


ALTER FUNCTION "public"."get_global_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_credit_stats"("start_date" "text", "end_date" "text", "p_country" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text") RETURNS TABLE("month_start" "date", "total_pi" numeric, "total_fcfa" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        date_trunc('month', t.created_at)::date as month_start,
        SUM(t.amount_pi)::numeric as total_pi,
        SUM(t.amount_fcfa)::numeric as total_fcfa
    FROM
        transactions t
    WHERE
        t.transaction_type IN ('manual_credit', 'credit_reversal')
        AND t.created_at >= start_date::timestamptz
        AND t.created_at <= end_date::timestamptz
        AND (p_country IS NULL OR t.country = p_country)
        AND (p_city IS NULL OR t.city = p_city)
    GROUP BY
        date_trunc('month', t.created_at)
    ORDER BY
        month_start;
END;
$$;


ALTER FUNCTION "public"."get_monthly_credit_stats"("start_date" "text", "end_date" "text", "p_country" "text", "p_city" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_credit_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "p_country" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text") RETURNS TABLE("month_start" "date", "total_pi" numeric, "total_fcfa" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('month', t.created_at)::date as month_start,
    SUM(t.amount_pi)::numeric as total_pi,
    SUM(t.amount_fcfa)::numeric as total_fcfa
  FROM transactions t
  WHERE 
    t.transaction_type IN ('manual_credit', 'credit_reversal')
    AND t.created_at >= start_date
    AND t.created_at <= end_date
    AND (p_country IS NULL OR t.country = p_country)
    AND (p_city IS NULL OR t.city = p_city)
  GROUP BY date_trunc('month', t.created_at)
  ORDER BY month_start;
END;
$$;


ALTER FUNCTION "public"."get_monthly_credit_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "p_country" "text", "p_city" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_most_viewed_events"("p_limit" integer DEFAULT 10, "p_days" integer DEFAULT 30) RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "category" "text", "city" "text", "country" "text", "location" "text", "event_date" timestamp with time zone, "organizer_id" "uuid", "event_type" "text", "is_active" boolean, "status" "text", "is_promoted" boolean, "promoted_until" timestamp with time zone, "price_fcfa" integer, "price_pi" integer, "views_count" integer, "interactions_count" integer, "participants_count" integer, "promotion_views_count" integer, "cover_image" "text", "tags" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "contact_phone" "text", "address" "text", "google_maps_link" "text", "latitude" numeric, "longitude" numeric, "full_address" "text", "google_place_id" "text", "location_instructions" "text", "geocoding_status" "text", "geocoding_attempts" integer, "geocoding_last_attempt" timestamp with time zone, "promotion_start" timestamp with time zone, "promotion_end" timestamp with time zone, "promotion_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.*
    FROM events e
    WHERE e.created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND e.status = 'active'
    ORDER BY e.views_count DESC NULLS LAST
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_most_viewed_events"("p_limit" integer, "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_claim"("claim" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb ->> claim;
$$;


ALTER FUNCTION "public"."get_my_claim"("claim" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  my_role TEXT;
  user_id UUID;
  jwt_claims JSONB;
BEGIN
  -- Attempt to get claims from the request context
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    jwt_claims := NULL;
  END;
  
  -- If there are no claims or no 'sub' (user_id), the user is not properly authenticated yet.
  -- Return 'anonymous' to prevent errors in policies that depend on this function.
  IF jwt_claims IS NULL OR NOT (jwt_claims ? 'sub') OR (jwt_claims->>'sub') = '' THEN
    RETURN 'anonymous';
  END IF;
  
  -- Extract user ID from the JWT
  user_id := (jwt_claims->>'sub')::uuid;
  
  IF user_id IS NULL THEN
    RETURN 'anonymous';
  END IF;
  
  -- Read the role from the profiles table
  SELECT user_type INTO my_role 
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(my_role, 'user'); -- Default to 'user' if profile not found for some reason
END;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_nearby_locations"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" integer DEFAULT 10, "p_type_slugs" "text"[] DEFAULT NULL::"text"[], "p_limit" integer DEFAULT 20) RETURNS TABLE("location_id" "uuid", "name" "text", "type_name" "text", "type_icon" "text", "address" "text", "city" "text", "distance_km" numeric, "rating" numeric, "latitude" numeric, "longitude" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as location_id,
        l.name,
        lt.name as type_name,
        lt.icon as type_icon,
        l.address,
        l.city,
        CAST(6371 * ACOS(
            COS(RADIANS(p_latitude)) * COS(RADIANS(l.latitude)) * 
            COS(RADIANS(l.longitude) - RADIANS(p_longitude)) + 
            SIN(RADIANS(p_latitude)) * SIN(RADIANS(l.latitude))
        ) AS DECIMAL(10,2)) as distance_km,
        l.rating,
        l.latitude,
        l.longitude
    FROM locations l
    JOIN location_types lt ON l.type_id = lt.id
    WHERE l.is_active = true AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
      AND (p_type_slugs IS NULL OR lt.slug = ANY(p_type_slugs))
      AND (6371 * ACOS(
          COS(RADIANS(p_latitude)) * COS(RADIANS(l.latitude)) * 
          COS(RADIANS(l.longitude) - RADIANS(p_longitude)) + 
          SIN(RADIANS(p_latitude)) * SIN(RADIANS(l.latitude))
      )) <= p_radius_km
    ORDER BY distance_km ASC, l.rating DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_nearby_locations"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" integer, "p_type_slugs" "text"[], "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_popular_events_by_category"("p_limit_per_category" integer DEFAULT 3) RETURNS TABLE("category_id" "uuid", "category_name" "text", "category_slug" "text", "category_icon" "text", "category_color" "text", "event_id" "uuid", "event_title" "text", "cover_image" "text", "event_date" timestamp with time zone, "organizer_name" "text", "starting_price_pi" integer, "total_participants" bigint, "event_rank" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH ranked_events AS (
        SELECT 
            ewc.category_id,
            ewc.category_name,
            ewc.category_slug,
            ewc.category_icon,
            ewc.category_color,
            ewc.id as event_id,
            ewc.title as event_title,
            ewc.cover_image,
            ewc.event_date,
            ewc.organizer_name,
            ewc.starting_price_pi,
            (COALESCE(ewc.total_votes, 0) + COALESCE(ewc.total_tickets_sold, 0) + COALESCE(ewc.total_raffle_participants, 0)) as total_participants,
            ROW_NUMBER() OVER (
                PARTITION BY ewc.category_id 
                ORDER BY 
                    ewc.is_promoted DESC,
                    ewc.views_count DESC,
                    ewc.interactions_count DESC
            ) as event_rank
        FROM events_with_categories ewc
        WHERE ewc.availability_status = 'active'
          AND ewc.event_date > NOW()
    )
    SELECT 
        re.category_id,
        re.category_name,
        re.category_slug,
        re.category_icon,
        re.category_color,
        re.event_id,
        re.event_title,
        re.cover_image,
        re.event_date,
        re.organizer_name,
        re.starting_price_pi,
        re.total_participants,
        re.event_rank
    FROM ranked_events re
    WHERE re.event_rank <= p_limit_per_category
    ORDER BY re.category_name, re.event_rank;
END;
$$;


ALTER FUNCTION "public"."get_popular_events_by_category"("p_limit_per_category" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_promoted_events"("p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "city" "text", "country" "text", "location" "text", "event_date" timestamp with time zone, "organizer_id" "uuid", "event_type" "text", "is_active" boolean, "status" "text", "is_promoted" boolean, "promoted_until" timestamp with time zone, "price_fcfa" integer, "price_pi" integer, "views_count" integer, "interactions_count" integer, "participants_count" integer, "promotion_views_count" integer, "cover_image" "text", "tags" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "contact_phone" "text", "address" "text", "google_maps_link" "text", "latitude" numeric, "longitude" numeric, "full_address" "text", "google_place_id" "text", "location_instructions" "text", "geocoding_status" "text", "geocoding_attempts" integer, "geocoding_last_attempt" timestamp with time zone, "promotion_start" timestamp with time zone, "promotion_end" timestamp with time zone, "promotion_type" "text", "verification_enabled" boolean, "max_verifications_per_ticket" integer, "verification_start_time" timestamp with time zone, "verification_end_time" timestamp with time zone, "category_id" "uuid", "boost_level" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.city,
        e.country,
        e.location,
        e.event_date,
        e.organizer_id,
        e.event_type,
        e.is_active,
        e.status,
        e.is_promoted,
        e.promoted_until,
        e.price_fcfa,
        e.price_pi,
        e.views_count,
        e.interactions_count,
        e.participants_count,
        e.promotion_views_count,
        e.cover_image,
        e.tags,
        e.created_at,
        e.updated_at,
        e.contact_phone,
        e.address,
        e.google_maps_link,
        e.latitude,
        e.longitude,
        e.full_address,
        e.google_place_id,
        e.location_instructions,
        e.geocoding_status,
        e.geocoding_attempts,
        e.geocoding_last_attempt,
        e.promotion_start,
        e.promotion_end,
        e.promotion_type,
        e.verification_enabled,
        e.max_verifications_per_ticket,
        e.verification_start_time,
        e.verification_end_time,
        e.category_id,
        CASE 
            WHEN e.promotion_end > NOW() + INTERVAL '7 days' THEN 3
            WHEN e.promotion_end > NOW() + INTERVAL '3 days' THEN 2
            ELSE 1
        END as boost_level
    FROM events e
    WHERE e.is_promoted = true
      AND e.promotion_end > NOW()
      AND e.status = 'active'
    ORDER BY 
        boost_level DESC,
        e.views_count DESC NULLS LAST
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_promoted_events"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommended_events"("p_user_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("event_id" "uuid", "title" "text", "cover_image" "text", "description" "text", "event_type" "text", "event_date" timestamp with time zone, "location" "text", "city" "text", "category_name" "text", "category_slug" "text", "organizer_name" "text", "starting_price_pi" integer, "is_promoted" boolean, "similarity_score" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH user_preferences AS (
        -- User's preferred categories based on history
        SELECT
            e.category_id,
            COUNT(*) as interaction_count
        FROM events e
        JOIN user_interactions ui ON e.id = ui.event_id AND ui.user_id = p_user_id
        WHERE ui.interaction_type IN ('view', 'like', 'comment', 'purchase')
        GROUP BY e.category_id
        ORDER BY interaction_count DESC
        LIMIT 3
    ),
    city_preference AS (
        -- User's preferred city
        SELECT p.city
        FROM profiles p
        WHERE p.id = p_user_id
    )
    SELECT
        ewc.id as event_id,
        ewc.title,
        ewc.cover_image,
        ewc.description,
        ewc.event_type,
        ewc.event_date,
        ewc.location,
        ewc.city,
        ewc.category_name,
        ewc.category_slug,
        ewc.organizer_name,
        ewc.starting_price_pi,
        ewc.is_promoted,
        -- Similarity score
        CASE
            WHEN ewc.category_id = ANY(SELECT up.category_id FROM user_preferences up) THEN 1.0
            WHEN ewc.city = (SELECT cp.city FROM city_preference cp) THEN 0.7
            ELSE 0.3
        END::numeric as similarity_score
    FROM events_with_categories ewc
    WHERE ewc.availability_status = 'active'
      AND ewc.event_date > NOW()
      AND NOT EXISTS (
        SELECT 1 FROM user_interactions ui
        WHERE ui.user_id = p_user_id AND ui.event_id = ewc.id AND ui.interaction_type = 'purchased'
      )
    ORDER BY
        similarity_score DESC,
        ewc.is_promoted DESC,
        ewc.event_date ASC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_recommended_events"("p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_todays_mandatory_video"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_record RECORD;
    video_record RECORD;
    videos_available INTEGER;
BEGIN
    SELECT * INTO user_record FROM profiles WHERE id = user_uuid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utilisateur non trouvé');
    END IF;
    
    SELECT COUNT(*) INTO videos_available
    FROM mandatory_videos 
    WHERE is_active = true 
    AND is_mandatory = true
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF videos_available = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Aucune vidéo obligatoire disponible pour le moment'
        );
    END IF;
    
    SELECT mv.* INTO video_record
    FROM mandatory_videos mv
    WHERE mv.is_active = true 
    AND mv.is_mandatory = true
    AND (mv.expires_at IS NULL OR mv.expires_at > NOW())
    AND NOT EXISTS (
        SELECT 1 FROM user_video_views uvv 
        WHERE uvv.user_id = user_uuid 
        AND uvv.video_id = mv.id 
        AND uvv.fully_watched = true
    )
    ORDER BY mv.display_order, mv.created_at
    LIMIT 1;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'video', jsonb_build_object(
                'id', video_record.id,
                'title', video_record.title,
                'description', video_record.description,
                'video_url', video_record.video_url,
                'video_duration', video_record.video_duration,
                'thumbnail_url', video_record.thumbnail_url,
                'reward_coins', video_record.reward_coins,
                'is_mandatory', video_record.is_mandatory
            )
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Vous avez regardé toutes les vidéos obligatoires disponibles!',
            'all_videos_watched', true
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_todays_mandatory_video"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_uuid" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT user_type INTO user_role 
  FROM public.profiles 
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_vapid_public_key"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'VAPID_PUBLIC_KEY' LIMIT 1);
END;
$$;


ALTER FUNCTION "public"."get_vapid_public_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_verification_stats"("p_event_id" "uuid", "p_organizer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_tickets INTEGER;
    verified_tickets INTEGER;
    duplicate_scans INTEGER;
    active_sessions INTEGER;
    recent_verifications JSONB;
BEGIN
    -- Vérifier que l'organisateur a accès à l'événement
    IF NOT EXISTS (SELECT 1 FROM events WHERE id = p_event_id AND organizer_id = p_organizer_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Accès non autorisé');
    END IF;
    
    -- Statistiques de base
    SELECT COUNT(*) INTO total_tickets
    FROM event_tickets et
    JOIN ticketing_events te ON et.ticketing_event_id = te.id
    WHERE te.event_id = p_event_id;
    
    SELECT COUNT(*) INTO verified_tickets
    FROM event_tickets et
    JOIN ticketing_events te ON et.ticketing_event_id = te.id
    WHERE te.event_id = p_event_id AND et.verification_status = 'verified';
    
    SELECT COUNT(*) INTO duplicate_scans
    FROM ticket_verifications tv
    WHERE tv.event_id = p_event_id AND tv.verification_status = 'duplicate';
    
    SELECT COUNT(*) INTO active_sessions
    FROM verification_sessions vs
    WHERE vs.event_id = p_event_id AND vs.is_active = true;
    
    -- Dernières vérifications
    SELECT jsonb_agg(
        jsonb_build_object(
            'ticket_number', et.ticket_number,
            'verification_time', tv.verification_time,
            'verification_method', tv.verification_method,
            'status', tv.verification_status,
            'scanner_name', os.scanner_name
        ) ORDER BY tv.verification_time DESC
    ) INTO recent_verifications
    FROM ticket_verifications tv
    JOIN event_tickets et ON tv.ticket_id = et.id
    JOIN organizer_scanners os ON tv.scanner_id = os.id
    WHERE tv.event_id = p_event_id
    LIMIT 10;
    
    RETURN jsonb_build_object(
        'success', true,
        'stats', jsonb_build_object(
            'total_tickets', total_tickets,
            'verified_tickets', verified_tickets,
            'duplicate_scans', duplicate_scans,
            'active_sessions', active_sessions,
            'verification_rate', CASE 
                WHEN total_tickets > 0 THEN ROUND((verified_tickets * 100.0 / total_tickets), 2)
                ELSE 0
            END,
            'recent_verifications', COALESCE(recent_verifications, '[]'::jsonb)
        )
    );
END;
$$;


ALTER FUNCTION "public"."get_verification_stats"("p_event_id" "uuid", "p_organizer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_withdrawal_method_stats"() RETURNS TABLE("withdrawal_method" "text", "method_display" "text", "request_count" bigint, "total_pi" bigint, "total_fcfa" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wr.withdrawal_method,
        CASE wr.withdrawal_method
            WHEN 'orange_money' THEN 'Orange Money'
            WHEN 'moov_money' THEN 'Moov Money'
            WHEN 'visa_card' THEN 'Carte Visa'
            WHEN 'bank_account' THEN 'Compte Bancaire'
            WHEN 'paypal' THEN 'PayPal'
            ELSE 'Autre'
        END as method_display,
        COUNT(*) as request_count,
        COALESCE(SUM(wr.amount_pi), 0) as total_pi,
        COALESCE(SUM(wr.amount_fcfa), 0) as total_fcfa
    FROM public.withdrawal_requests wr
    WHERE wr.withdrawal_method IS NOT NULL
    GROUP BY wr.withdrawal_method
    ORDER BY request_count DESC;
END;
$$;


ALTER FUNCTION "public"."get_withdrawal_method_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_zone_admin"("p_country" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id
    FROM public.profiles
    WHERE user_type = 'admin'
    AND country = p_country
    AND is_active = true
    LIMIT 1;
    RETURN v_admin_id;
END;
$$;


ALTER FUNCTION "public"."get_zone_admin"("p_country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    interaction_cost INT;
    user_profile RECORD;
    table_name TEXT;
    update_query TEXT;
    count_column TEXT;
    organizer_id_val UUID;
    earnings_share_organizer INT;
    cost_from_bonus INT;
    cost_from_purchased INT;
    current_event RECORD;
    reward_config JSONB;
    share_milestone INT;
    download_milestone INT;
    reward_coins INT;
BEGIN
    -- 1. Déterminer le coût de l'interaction
    SELECT (coin_usage_costs->> (CASE p_interaction_type
                                    WHEN 'view' THEN 'view_content'
                                    WHEN 'share' THEN 'share_content'
                                    WHEN 'download' THEN 'download_content'
                                    ELSE 'view_content'
                                END))::int
    INTO interaction_cost
    FROM admin_config ORDER BY id DESC LIMIT 1;
    interaction_cost := COALESCE(interaction_cost, 0);

    -- Si l'interaction est gratuite, on l'enregistre et on sort
    IF interaction_cost = 0 THEN
        INSERT INTO public.post_interactions (post_id, post_type, user_id, interaction_type)
        VALUES (p_post_id, p_post_type, p_user_id, p_interaction_type);
        RETURN QUERY SELECT true, 'Action enregistrée.';
        RETURN;
    END IF;

    -- 2. Vérifier si l'utilisateur a déjà payé pour voir ce contenu
    IF p_interaction_type = 'view' AND EXISTS (
        SELECT 1 FROM public.post_interactions 
        WHERE user_id = p_user_id AND post_id = p_post_id AND post_type = p_post_type AND interaction_type = 'view'
    ) THEN
        RETURN QUERY SELECT true, 'Contenu déjà débloqué.';
        RETURN;
    END IF;

    -- 3. Vérifier le solde de l'utilisateur
    SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
    IF user_profile.total_coins < interaction_cost THEN
        RETURN QUERY SELECT false, 'Solde de pièces insuffisant.';
        RETURN;
    END IF;

    -- 4. Déterminer la table et les colonnes à mettre à jour
    IF p_post_type = 'event' THEN
        table_name := 'events';
        count_column := CASE p_interaction_type WHEN 'share' THEN 'share_count' WHEN 'download' THEN 'download_count' WHEN 'view' THEN 'view_count' ELSE NULL END;
    ELSIF p_post_type = 'promotion' THEN
        table_name := 'promotions';
        count_column := CASE p_interaction_type WHEN 'share' THEN 'share_count' WHEN 'download' THEN 'download_count' WHEN 'view' THEN 'view_count' ELSE NULL END;
    ELSE
        RETURN QUERY SELECT false, 'Type de contenu non valide.';
        RETURN;
    END IF;

    -- Mettre à jour le compteur sur le post et récupérer l'ID de l'organisateur
    IF count_column IS NOT NULL THEN
        update_query := format('UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = %L RETURNING *;', table_name, count_column, count_column, p_post_id);
    ELSE
        update_query := format('SELECT * FROM public.%I WHERE id = %L;', table_name, p_post_id);
    END IF;
    
    IF p_post_type = 'promotion' THEN
        EXECUTE update_query INTO current_event;
        organizer_id_val := current_event.user_id;
    ELSE
        EXECUTE update_query INTO current_event;
        organizer_id_val := current_event.organizer_id;
    END IF;

    -- 5. Calculer la répartition du coût entre les portefeuilles (bonus d'abord)
    cost_from_bonus := LEAST(user_profile.bonus_coins, interaction_cost);
    cost_from_purchased := interaction_cost - cost_from_bonus;

    -- 6. Déduire les pièces du portefeuille de l'utilisateur
    UPDATE public.profiles SET bonus_coins = bonus_coins - cost_from_bonus, purchased_coins = purchased_coins - cost_from_purchased WHERE id = p_user_id;

    -- 7. Enregistrer la transaction de débit
    INSERT INTO public.coin_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -interaction_cost, 'debit', 'Interaction (' || p_interaction_type || ') sur ' || p_post_type || ' ' || p_post_id);

    -- 8. Enregistrer l'interaction
    INSERT INTO public.post_interactions (post_id, post_type, user_id, interaction_type)
    VALUES (p_post_id, p_post_type, p_user_id, p_interaction_type);

    -- 9. Créditer l'organisateur (80% des pièces ACHETÉES uniquement)
    IF organizer_id_val IS NOT NULL AND organizer_id_val <> p_user_id AND cost_from_purchased > 0 THEN
        earnings_share_organizer := floor(cost_from_purchased * 0.8);
        IF earnings_share_organizer > 0 THEN
            UPDATE public.profiles SET earnings_coins = COALESCE(earnings_coins, 0) + earnings_share_organizer WHERE id = organizer_id_val;
            INSERT INTO public.coin_transactions (user_id, amount, type, description)
            VALUES (organizer_id_val, earnings_share_organizer, 'credit', 'Gains sur interaction (' || p_interaction_type || ') de ' || user_profile.name);
        END IF;
    END IF;

    -- 10. Vérifier et attribuer les récompenses par palier pour les événements
    IF p_post_type = 'event' AND organizer_id_val IS NOT NULL THEN
        SELECT (admin_config.event_packs->0->'rewards') INTO reward_config FROM admin_config LIMIT 1;
        share_milestone := (reward_config->>'share_milestone')::int;
        download_milestone := (reward_config->>'download_milestone')::int;
        reward_coins := (reward_config->>'reward_coins')::int;

        IF share_milestone > 0 AND current_event.share_count >= share_milestone THEN
            UPDATE public.profiles SET earnings_coins = COALESCE(earnings_coins, 0) + reward_coins WHERE id = organizer_id_val;
            UPDATE public.events SET share_count = share_count - share_milestone WHERE id = p_post_id;
            INSERT INTO public.coin_transactions (user_id, amount, type, description) VALUES (organizer_id_val, reward_coins, 'credit', 'Récompense palier partage pour ' || current_event.title);
        END IF;

        IF download_milestone > 0 AND current_event.download_count >= download_milestone THEN
            UPDATE public.profiles SET earnings_coins = COALESCE(earnings_coins, 0) + reward_coins WHERE id = organizer_id_val;
            UPDATE public.events SET download_count = download_count - download_milestone WHERE id = p_post_id;
            INSERT INTO public.coin_transactions (user_id, amount, type, description) VALUES (organizer_id_val, reward_coins, 'credit', 'Récompense palier téléchargement pour ' || current_event.title);
        END IF;
    END IF;

    RETURN QUERY SELECT true, 'Interaction réussie !';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text", "p_comment_text" "text" DEFAULT NULL::"text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    interaction_cost INT;
    user_profile RECORD;
    table_name TEXT;
    update_query TEXT;
    count_column TEXT;
    organizer_id_val UUID;
    earnings_share_organizer INT;
    cost_from_bonus INT;
    cost_from_purchased INT;
    current_post RECORD;
    reward_config JSONB;
    share_milestone INT;
    download_milestone INT;
    reward_coins INT;
    interaction_exists BOOLEAN;
BEGIN
    -- 1. Déterminer le coût de l'interaction
    SELECT (coin_usage_costs->> (CASE p_interaction_type
                                    WHEN 'view' THEN 'view_content'
                                    WHEN 'share' THEN 'share_content'
                                    WHEN 'download' THEN 'download_content'
                                    WHEN 'like' THEN 'like_content'
                                    WHEN 'comment' THEN 'comment_content'
                                    WHEN 'follow' THEN 'follow_content'
                                    ELSE 'view_content'
                                END))::int
    INTO interaction_cost
    FROM admin_config ORDER BY id DESC LIMIT 1;
    interaction_cost := COALESCE(interaction_cost, 0);

    -- 2. Vérifier si l'interaction existe déjà (pour les actions uniques comme like, follow, view)
    SELECT EXISTS (
        SELECT 1 FROM public.post_interactions 
        WHERE user_id = p_user_id AND post_id = p_post_id AND post_type = p_post_type AND interaction_type = p_interaction_type
    ) INTO interaction_exists;

    -- Si l'action est 'unlike' ou 'unfollow', on supprime et on sort
    IF (p_interaction_type = 'like' OR p_interaction_type = 'follow') AND interaction_exists THEN
        DELETE FROM public.post_interactions
        WHERE user_id = p_user_id AND post_id = p_post_id AND post_type = p_post_type AND interaction_type = p_interaction_type;
        RETURN QUERY SELECT true, 'Action annulée.';
        RETURN;
    END IF;

    -- Si l'action existe déjà et ne doit pas être répétée, on sort
    IF interaction_exists AND p_interaction_type IN ('view', 'share', 'download') THEN
        RETURN QUERY SELECT true, 'Action déjà effectuée.';
        RETURN;
    END IF;

    -- 3. Vérifier le solde de l'utilisateur si l'action a un coût
    IF interaction_cost > 0 THEN
        SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
        IF user_profile.total_coins < interaction_cost THEN
            RETURN QUERY SELECT false, 'Solde de pièces insuffisant.';
            RETURN;
        END IF;
    END IF;

    -- 4. Déterminer la table et les colonnes à mettre à jour
    IF p_post_type = 'event' THEN
        table_name := 'events';
        count_column := CASE p_interaction_type 
            WHEN 'share' THEN 'share_count' 
            WHEN 'download' THEN 'download_count' 
            WHEN 'view' THEN 'view_count' 
            ELSE NULL 
        END;
    ELSIF p_post_type = 'promotion' THEN
        table_name := 'promotions';
        count_column := CASE p_interaction_type 
            WHEN 'share' THEN 'share_count' 
            WHEN 'download' THEN 'download_count' 
            WHEN 'view' THEN 'view_count' 
            ELSE NULL 
        END;
    ELSE
        RETURN QUERY SELECT false, 'Type de contenu non valide.';
        RETURN;
    END IF;

    -- Mettre à jour le compteur sur le post et récupérer les infos
    IF count_column IS NOT NULL THEN
        update_query := format('UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = %L RETURNING *;', table_name, count_column, count_column, p_post_id);
    ELSE
        update_query := format('SELECT * FROM public.%I WHERE id = %L;', table_name, p_post_id);
    END IF;
    
    EXECUTE update_query INTO current_post;
    
    IF p_post_type = 'promotion' THEN
        organizer_id_val := current_post.user_id;
    ELSE
        organizer_id_val := current_post.organizer_id;
    END IF;

    -- 5. Déduire les pièces si nécessaire
    IF interaction_cost > 0 THEN
        cost_from_bonus := LEAST(user_profile.bonus_coins, interaction_cost);
        cost_from_purchased := interaction_cost - cost_from_bonus;

        UPDATE public.profiles SET bonus_coins = bonus_coins - cost_from_bonus, purchased_coins = purchased_coins - cost_from_purchased WHERE id = p_user_id;

        INSERT INTO public.coin_transactions (user_id, amount, type, description, purchased_balance_after, bonus_balance_after)
        VALUES (p_user_id, -interaction_cost, 'debit', 'Interaction (' || p_interaction_type || ') sur ' || p_post_type || ' ' || p_post_id, user_profile.purchased_coins - cost_from_purchased, user_profile.bonus_coins - cost_from_bonus);
    END IF;

    -- 6. Enregistrer l'interaction
    INSERT INTO public.post_interactions (post_id, post_type, user_id, interaction_type, comment_text)
    VALUES (p_post_id, p_post_type, p_user_id, p_interaction_type, p_comment_text);

    -- 7. Créditer l'organisateur (80% des pièces ACHETÉES uniquement)
    IF organizer_id_val IS NOT NULL AND organizer_id_val <> p_user_id AND cost_from_purchased > 0 THEN
        earnings_share_organizer := floor(cost_from_purchased * 0.8);
        IF earnings_share_organizer > 0 THEN
            UPDATE public.profiles SET earnings_coins = COALESCE(earnings_coins, 0) + earnings_share_organizer WHERE id = organizer_id_val;
            INSERT INTO public.coin_transactions (user_id, amount, type, description)
            VALUES (organizer_id_val, earnings_share_organizer, 'credit', 'Gains sur interaction (' || p_interaction_type || ') de ' || user_profile.name);
        END IF;
    END IF;

    -- 8. Gérer les récompenses par palier (si applicable)
    IF p_post_type = 'event' AND organizer_id_val IS NOT NULL AND (p_interaction_type = 'share' OR p_interaction_type = 'download') THEN
        SELECT (admin_config.event_packs->0->'rewards') INTO reward_config FROM admin_config LIMIT 1;
        share_milestone := (reward_config->>'share_milestone')::int;
        download_milestone := (reward_config->>'download_milestone')::int;
        reward_coins := (reward_config->>'reward_coins')::int;

        IF p_interaction_type = 'share' AND share_milestone > 0 AND current_post.share_count >= share_milestone THEN
            UPDATE public.profiles SET bonus_coins = COALESCE(bonus_coins, 0) + reward_coins WHERE id = organizer_id_val;
            UPDATE public.events SET share_count = share_count - share_milestone WHERE id = p_post_id;
            INSERT INTO public.coin_transactions (user_id, amount, type, description) VALUES (organizer_id_val, reward_coins, 'bonus', 'Récompense palier partage pour ' || current_post.title);
        END IF;

        IF p_interaction_type = 'download' AND download_milestone > 0 AND current_post.download_count >= download_milestone THEN
            UPDATE public.profiles SET bonus_coins = COALESCE(bonus_coins, 0) + reward_coins WHERE id = organizer_id_val;
            UPDATE public.events SET download_count = download_count - download_milestone WHERE id = p_post_id;
            INSERT INTO public.coin_transactions (user_id, amount, type, description) VALUES (organizer_id_val, reward_coins, 'bonus', 'Récompense palier téléchargement pour ' || current_post.title);
        END IF;
    END IF;

    RETURN QUERY SELECT true, 'Interaction réussie !';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text", "p_comment_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_event_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    organizer_name TEXT;
    user_record RECORD;
BEGIN
    SELECT full_name INTO organizer_name FROM public.profiles WHERE id = NEW.organizer_id;

    -- Create notifications for users in the same country
    FOR user_record IN 
        SELECT id FROM public.profiles 
        WHERE is_active = true 
          AND id != NEW.organizer_id
          AND country = NEW.country
    LOOP
        INSERT INTO notifications (user_id, title, message, type, data, sound_enabled, vibration_enabled, sound_effect, is_global)
        VALUES (
            user_record.id,
            'Nouvel Événement !',
            NEW.title || ' par ' || COALESCE(organizer_name, 'un organisateur'),
            'new_event',
            jsonb_build_object('event_id', NEW.id),
            true,
            true,
            'event',
            false
        );
    END LOOP;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_event_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role TEXT;
    user_email TEXT;
    ref_code TEXT;
    referrer_profile RECORD;
    welcome_bonus INTEGER := 10;
    referrer_reward INTEGER := 20;
    referred_reward INTEGER := 10;
    profile_country TEXT;
    profile_city TEXT;
BEGIN
    user_email := NEW.email;
    ref_code := 'BPI-' || substr(md5(random()::text || clock_timestamp()::text), 1, 7);

    user_role := COALESCE(NEW.raw_user_meta_data->>'user_type', 'user');

    IF user_email IN ('bonplaninfos@gmail.com', 'digihouse10@gmail.com') THEN
        user_role := 'super_admin';
    END IF;

    profile_country := NEW.raw_user_meta_data->>'country';
    profile_city := NEW.raw_user_meta_data->>'city';

    INSERT INTO public.profiles (
        id, email, full_name, user_type, affiliate_code,
        country, city,
        is_active, coin_balance, free_coin_balance,
        total_earnings, available_earnings,
        mandatory_videos_completed, total_video_rewards_earned
    )
    VALUES (
        NEW.id, user_email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'),
        user_role, ref_code, profile_country, profile_city,
        true, 0, 0, 0, 0, 0, 0
    )
    ON CONFLICT (id) DO NOTHING;
    
    IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
        SELECT * INTO referrer_profile FROM public.profiles WHERE affiliate_code = (NEW.raw_user_meta_data->>'referral_code');
        
        IF FOUND AND referrer_profile.id <> NEW.id THEN
            UPDATE public.profiles SET free_coin_balance = COALESCE(free_coin_balance, 0) + referred_reward WHERE id = NEW.id;
            UPDATE public.profiles SET free_coin_balance = COALESCE(free_coin_balance, 0) + referrer_reward WHERE id = referrer_profile.id;
            
            INSERT INTO public.referral_rewards(referrer_id, referred_id, referrer_reward, referred_reward)
            VALUES (referrer_profile.id, NEW.id, referrer_reward, referred_reward);
        ELSE
            UPDATE public.profiles SET free_coin_balance = COALESCE(free_coin_balance, 0) + welcome_bonus WHERE id = NEW.id;
        END IF;
    ELSE
        UPDATE public.profiles SET free_coin_balance = COALESCE(free_coin_balance, 0) + welcome_bonus WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_from_auth"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    auth_user RECORD;
    user_role TEXT;
    user_email TEXT;
    ref_code TEXT;
BEGIN
    -- Get the user details from auth.users for the current session user
    SELECT * INTO auth_user FROM auth.users WHERE id = auth.uid();
    
    IF auth_user IS NOT NULL THEN
        user_email := auth_user.email;
        ref_code := 'BPI-' || substr(md5(random()::text || clock_timestamp()::text), 1, 7);

        -- Determine role based on email
        IF user_email IN ('bonplaninfos@gmail.com', 'digihouse10@gmail.com') THEN
            user_role := 'super_admin';
        ELSE
            user_role := COALESCE(auth_user.raw_user_meta_data->>'user_type', 'user');
        END IF;

        -- Insert into public.profiles, handle conflicts
        INSERT INTO public.profiles (
            id, email, full_name, user_type, affiliate_code,
            is_active, coin_balance, free_coin_balance, 
            total_earnings, available_earnings,
            mandatory_videos_completed, total_video_rewards_earned,
            country, city
        )
        VALUES (
            auth_user.id, 
            user_email, 
            COALESCE(auth_user.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'), 
            user_role,
            ref_code,
            true,
            0, 10,
            0, 0, 0, 0,
            auth_user.raw_user_meta_data->>'country',
            auth_user.raw_user_meta_data->>'city'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            user_type = CASE
                -- Protect root super admins from being demoted on re-login
                WHEN public.profiles.email IN ('bonplaninfos@gmail.com', 'digihouse10@gmail.com') THEN 'super_admin'
                ELSE EXCLUDED.user_type
            END,
            last_login = now(); -- Update last login time
    END IF;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_from_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_raffle_tickets_sold"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE raffle_events
    SET tickets_sold = COALESCE(tickets_sold, 0) + 1
    WHERE id = NEW.raffle_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_raffle_tickets_sold"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ticket_type_sold"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.ticket_types
    SET quantity_sold = quantity_sold + 1
    WHERE id = NEW.ticket_type_id;

    UPDATE public.ticketing_events
    SET tickets_sold = tickets_sold + 1
    WHERE event_id = NEW.event_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_ticket_type_sold"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_user_coins"("p_user_id" "uuid", "p_coin_increment" integer, "p_fcfa_increment" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_coin_balance int;
    current_free_coin_balance int;
    latest_transaction_id int;
BEGIN
    -- Update coin_balance (purchased coins)
    UPDATE public.profiles
    SET coin_balance = COALESCE(coin_balance, 0) + p_coin_increment
    WHERE id = p_user_id
    RETURNING coin_balance, free_coin_balance INTO current_coin_balance, current_free_coin_balance;

    -- Find the latest transaction for the user that needs updating
    SELECT id INTO latest_transaction_id
    FROM public.user_coin_transactions
    WHERE user_id = p_user_id AND status = 'completed' AND coin_balance IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    -- Update the transaction log with the balances after the transaction
    IF latest_transaction_id IS NOT NULL THEN
        UPDATE public.user_coin_transactions
        SET 
            coin_balance = current_coin_balance,
            free_coin_balance = current_free_coin_balance
        WHERE id = latest_transaction_id;
    END IF;

END;
$$;


ALTER FUNCTION "public"."increment_user_coins"("p_user_id" "uuid", "p_coin_increment" integer, "p_fcfa_increment" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_user_id AND user_type = 'super_admin'
    );
END;
$$;


ALTER FUNCTION "public"."is_super_admin"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_partner_payment_paid"("p_payment_id" "uuid", "p_admin_id" "uuid", "p_payment_method" "text", "p_payment_reference" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    payment_record RECORD;
BEGIN
    -- Check if caller is super_admin
    IF (SELECT get_my_role()) <> 'super_admin' THEN
        RETURN QUERY SELECT false, 'Permission non accordée.';
        RETURN;
    END IF;

    -- Get payment details
    SELECT * INTO payment_record FROM public.partner_license_payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Enregistrement de paiement non trouvé.';
        RETURN;
    END IF;

    IF payment_record.payment_status = 'paid' THEN
        RETURN QUERY SELECT false, 'Ce paiement a déjà été marqué comme payé.';
        RETURN;
    END IF;

    -- Update the payment record
    UPDATE public.partner_license_payments
    SET 
        payment_status = 'paid',
        paid_at = NOW(),
        paid_by = p_admin_id,
        payment_method = p_payment_method,
        payment_reference = p_payment_reference
    WHERE id = p_payment_id;

    RETURN QUERY SELECT true, 'Paiement marqué comme payé avec succès.';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."mark_partner_payment_paid"("p_payment_id" "uuid", "p_admin_id" "uuid", "p_payment_method" "text", "p_payment_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_event"("event_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
    DECLARE
        event_record RECORD;
        total_sent INTEGER := 0;
        user_record RECORD;
    BEGIN
        -- Récupérer l'événement
        SELECT * INTO event_record FROM events WHERE id = event_uuid;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'message', 'Événement non trouvé');
        END IF;
        
        -- Enregistrer la notification d'événement
        INSERT INTO event_notifications (
            event_id,
            notification_type,
            send_to_all_users,
            send_to_city,
            status
        ) VALUES (
            event_uuid,
            'new_event',
            false, -- Ne pas envoyer à tous les utilisateurs par défaut
            true,  -- Envoyer aux utilisateurs de la ville
            'sending'
        );
        
        -- Notifier les utilisateurs de la même ville
        FOR user_record IN 
            SELECT id FROM profiles 
            WHERE city = event_record.city 
            AND is_active = true
            AND user_type = 'user'
        LOOP
            PERFORM send_push_notification(
                user_record.id,
                'Nouvel événement à ' || event_record.city,
                event_record.title,
                'new_event',
                jsonb_build_object(
                    'event_id', event_uuid,
                    'event_title', event_record.title,
                    'city', event_record.city,
                    'category', event_record.category
                )
            );
            total_sent := total_sent + 1;
        END LOOP;
        
        -- Mettre à jour les statistiques
        UPDATE event_notifications 
        SET 
            total_sent = total_sent,
            status = 'sent',
            sent_at = NOW()
        WHERE event_id = event_uuid AND notification_type = 'new_event';
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Notifications envoyées',
            'total_sent', total_sent,
            'city', event_record.city
        );
    END;
    $$;


ALTER FUNCTION "public"."notify_new_event"("event_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."participate_in_raffle"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer DEFAULT 1) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    raffle_record RECORD;
    total_cost_pi INTEGER;
    debit_result JSONB;
    i INT;
BEGIN
    SELECT * INTO raffle_record FROM raffle_events WHERE event_id = p_event_id FOR UPDATE;
    IF raffle_record IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Tirage non trouvé.'); END IF;
    IF (COALESCE(raffle_record.tickets_sold, 0) + p_ticket_quantity) > raffle_record.total_tickets THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nombre de tickets demandé non disponible');
    END IF;

    total_cost_pi := raffle_record.calculated_price_pi * p_ticket_quantity;

    -- Use the new distribution function
    debit_result := public.debit_and_distribute_participation_fee(p_user_id, p_event_id, 'raffle_ticket', total_cost_pi);
    IF NOT (debit_result->>'success')::boolean THEN
        RETURN debit_result;
    END IF;
    
    FOR i IN 1..p_ticket_quantity LOOP
        INSERT INTO raffle_tickets (raffle_id, user_id, purchase_price_pi)
        VALUES (raffle_record.id, p_user_id, raffle_record.calculated_price_pi);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Participation enregistrée');
END;
$$;


ALTER FUNCTION "public"."participate_in_raffle"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."participate_in_vote"("p_event_id" "uuid", "p_candidate_id" "uuid", "p_user_id" "uuid", "p_vote_count" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    vote_settings RECORD;
    total_cost_pi INTEGER;
    debit_result JSONB;
BEGIN
    SELECT * INTO vote_settings FROM event_settings WHERE event_id = p_event_id;
    IF vote_settings IS NULL OR vote_settings.vote_price_pi IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Paramètres de vote non trouvés pour cet événement.');
    END IF;

    total_cost_pi := vote_settings.vote_price_pi * p_vote_count;

    -- Use the new distribution function
    debit_result := public.debit_and_distribute_participation_fee(p_user_id, p_event_id, 'vote', total_cost_pi, p_candidate_id);
    IF NOT (debit_result->>'success')::boolean THEN
        RETURN debit_result;
    END IF;

    UPDATE candidates SET vote_count = COALESCE(vote_count, 0) + p_vote_count WHERE id = p_candidate_id;

    RETURN jsonb_build_object('success', true, 'message', 'Vote enregistré avec succès.');
END;
$$;


ALTER FUNCTION "public"."participate_in_vote"("p_event_id" "uuid", "p_candidate_id" "uuid", "p_user_id" "uuid", "p_vote_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_license_renewal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_approve" boolean, "p_notes" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    request_record RECORD;
    renewal_duration INTERVAL := INTERVAL '1 month';  -- Durée standard
    admin_username TEXT;
BEGIN
    -- Récupérer les détails de la demande
    SELECT lrr.*, p.username 
    INTO request_record
    FROM public.license_renewal_requests lrr
    JOIN public.profiles p ON lrr.admin_id = p.id
    WHERE lrr.id = p_request_id AND lrr.renewal_status = 'pending';
    
    IF request_record.id IS NULL THEN
        RETURN '❌ Demande non trouvée ou déjà traitée';
    END IF;
    
    IF p_approve THEN
        -- Approuver le renouvellement
        UPDATE public.profiles 
        SET 
            license_type = request_record.requested_license_type,
            license_status = 'active',
            license_expires_at = NOW() + renewal_duration,
            updated_at = NOW()
        WHERE id = request_record.admin_id;
        
        -- Marquer la demande comme approuvée
        UPDATE public.license_renewal_requests 
        SET 
            renewal_status = 'approved',
            processed_date = NOW(),
            processed_by = p_processor_id,
            notes = p_notes,
            updated_at = NOW()
        WHERE id = p_request_id;
        
        -- Notification de succès
        INSERT INTO public.admin_notifications (admin_id, notification_type, title, message)
        VALUES (
            request_record.admin_id,
            'renewal_approved',
            'Renouvellement approuvé',
            'Votre licence a été renouvelée en ' || request_record.requested_license_type || ' pour 1 mois.'
        );
        
        RETURN '✅ Renouvellement approuvé pour ' || request_record.username || ' - Licence ' || request_record.requested_license_type || ' activée pour 1 mois';
    ELSE
        -- Rejeter la demande
        UPDATE public.license_renewal_requests 
        SET 
            renewal_status = 'rejected',
            processed_date = NOW(),
            processed_by = p_processor_id,
            notes = p_notes,
            updated_at = NOW()
        WHERE id = p_request_id;
        
        -- Notification de rejet
        INSERT INTO public.admin_notifications (admin_id, notification_type, title, message)
        VALUES (
            request_record.admin_id,
            'renewal_rejected', 
            'Renouvellement rejeté',
            COALESCE(p_notes, 'Votre demande de renouvellement a été rejetée.')
        );
        
        RETURN '❌ Demande de renouvellement rejetée pour ' || request_record.username;
    END IF;
END;
$$;


ALTER FUNCTION "public"."process_license_renewal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_approve" boolean, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_status" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    request RECORD;
    processor_id UUID := auth.uid();
    processor_profile RECORD;
BEGIN
    -- Verify caller permissions
    SELECT * INTO processor_profile FROM public.profiles WHERE id = processor_id;
    IF processor_profile.user_type NOT IN ('super_admin', 'admin', 'secretary') THEN
        RAISE EXCEPTION 'Permission non accordée.';
    END IF;

    -- Get the withdrawal request
    SELECT * INTO request FROM public.organizer_withdrawal_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Demande de retrait non trouvée.';
    END IF;

    IF request.status <> 'pending' THEN
        RAISE EXCEPTION 'Cette demande a déjà été traitée.';
    END IF;

    -- Update the withdrawal request
    UPDATE public.organizer_withdrawal_requests
    SET 
        status = p_status,
        admin_notes = p_notes,
        reviewed_by_admin = CASE WHEN processor_profile.user_type = 'admin' OR processor_profile.user_type = 'secretary' THEN processor_id ELSE reviewed_by_admin END,
        reviewed_by_superadmin = CASE WHEN processor_profile.user_type = 'super_admin' THEN processor_id ELSE reviewed_by_superadmin END,
        reviewed_at = NOW(),
        paid_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END
    WHERE id = p_request_id;

    -- If the request is rejected, refund the coins to the organizer
    IF p_status = 'rejected' THEN
        UPDATE public.profiles
        SET available_earnings = COALESCE(available_earnings, 0) + request.amount_pi
        WHERE id = request.organizer_id;
    END IF;
    
    -- Send a notification to the organizer
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
        request.organizer_id,
        'Mise à jour de votre demande de retrait',
        CASE 
            WHEN p_status = 'approved' THEN 'Votre demande de retrait de ' || request.amount_pi || 'π a été approuvée et sera payée sous peu.'
            WHEN p_status = 'paid' THEN 'Votre demande de retrait de ' || request.amount_pi || 'π a été payée.'
            ELSE 'Votre demande de retrait de ' || request.amount_pi || 'π a été rejetée. Raison: ' || COALESCE(p_notes, 'Non spécifiée')
        END,
        CASE WHEN p_status = 'approved' OR p_status = 'paid' THEN 'success' ELSE 'warning' END,
        jsonb_build_object('request_id', p_request_id)
    );
    
    -- Log the admin action
    INSERT INTO public.admin_logs (actor_id, action_type, target_id, details)
    VALUES (
        processor_id,
        'withdrawal_' || p_status,
        request.organizer_id,
        jsonb_build_object(
            'request_id', p_request_id,
            'amount_pi', request.amount_pi,
            'notes', p_notes
        )
    );
END;
$$;


ALTER FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_status" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_admin_id" "uuid", "p_status" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    request RECORD;
    admin_profile RECORD;
BEGIN
    SELECT * INTO admin_profile FROM profiles WHERE id = p_admin_id;
    IF NOT admin_profile.user_type IN ('super_admin', 'admin', 'secretary') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permission non accordée.');
    END IF;

    SELECT * INTO request FROM withdrawal_requests WHERE id = p_request_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Demande non trouvée.'); END IF;

    IF request.status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'La demande a déjà été traitée.');
    END IF;

    UPDATE withdrawal_requests
    SET status = p_status, processed_by = p_admin_id, processed_at = NOW(), rejection_reason = p_notes
    WHERE id = p_request_id;

    IF p_status = 'rejected' THEN
        -- Refund coins
        UPDATE profiles
        SET available_earnings = COALESCE(available_earnings, 0) + request.amount_coins
        WHERE id = request.organizer_id;
    ELSIF p_status = 'approved' THEN
      -- Create transaction for withdrawal
       INSERT INTO organizer_transactions (organizer_id, transaction_type, source_type, amount_coins, amount_fcfa, description, reference_id)
       VALUES (request.organizer_id, 'withdrawal', 'manual', -request.amount_coins, -request.amount_fcfa, 'Retrait approuvé par admin', p_request_id);
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Demande de retrait traitée.');
END;
$$;


ALTER FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_admin_id" "uuid", "p_status" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_referral"("p_referrer_code" "text", "p_referred_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  referrer_profile RECORD;
  referred_profile RECORD;
  referrer_reward_amount INTEGER := 20;
  referred_reward_amount INTEGER := 10;
BEGIN
  -- 1. Find the referrer by their affiliate code
  SELECT * INTO referrer_profile FROM public.profiles WHERE affiliate_code = p_referrer_code;

  -- Exit if no referrer is found or if user refers themselves
  IF NOT FOUND OR referrer_profile.id = p_referred_id THEN
    RETURN;
  END IF;

  -- 2. Find the referred user's profile
  SELECT * INTO referred_profile FROM public.profiles WHERE id = p_referred_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 3. Check if this referral has already been processed
  IF EXISTS (SELECT 1 FROM public.referral_rewards WHERE referred_id = p_referred_id) THEN
    RETURN;
  END IF;

  -- 4. Credit the referred user with bonus coins
  UPDATE public.profiles
  SET free_coin_balance = COALESCE(free_coin_balance, 0) + referred_reward_amount
  WHERE id = p_referred_id;

  -- 5. Credit the referrer with bonus coins
  UPDATE public.profiles
  SET free_coin_balance = COALESCE(free_coin_balance, 0) + referrer_reward_amount
  WHERE id = referrer_profile.id;

  -- 6. Log the referral transaction for records
  INSERT INTO public.referral_rewards (referrer_id, referred_id, referrer_reward, referred_reward)
  VALUES (referrer_profile.id, p_referred_id, referrer_reward_amount, referred_reward_amount);

END;
$$;


ALTER FUNCTION "public"."process_referral"("p_referrer_code" "text", "p_referred_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_user_withdrawal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    request RECORD;
    processor_profile RECORD;
BEGIN
    -- Verify caller permissions
    SELECT * INTO processor_profile FROM public.profiles WHERE id = p_processor_id;
    IF processor_profile.user_type NOT IN ('super_admin', 'admin', 'secretary') THEN
        RAISE EXCEPTION 'Permission non accordée.';
    END IF;

    -- Get the withdrawal request
    SELECT * INTO request FROM public.withdrawal_requests WHERE id = p_request_id;

    IF request.status <> 'pending' THEN
        RAISE EXCEPTION 'Cette demande a déjà été traitée.';
    END IF;

    -- Update the withdrawal request
    UPDATE public.withdrawal_requests
    SET status = p_status,
        rejection_reason = p_rejection_reason,
        processed_by = p_processor_id,
        processed_at = NOW()
    WHERE id = p_request_id;

    -- If the request is rejected, refund the coins to the user
    IF p_status = 'rejected' THEN
        UPDATE public.profiles
        SET available_earnings = COALESCE(available_earnings, 0) + request.amount_pi
        WHERE id = request.user_id;
    END IF;
    
    -- Send a notification to the user
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        request.user_id,
        'Mise à jour de votre demande de retrait',
        CASE 
            WHEN p_status = 'approved' THEN 'Votre demande de retrait de ' || request.amount_pi || 'π a été approuvée et sera traitée.'
            ELSE 'Votre demande de retrait de ' || request.amount_pi || 'π a été rejetée. Raison: ' || p_rejection_reason
        END,
        CASE WHEN p_status = 'approved' THEN 'success' ELSE 'warning' END
    );
    
    -- Log the admin action
    INSERT INTO public.admin_logs (actor_id, action_type, target_id, details)
    VALUES (
        p_processor_id,
        CASE WHEN p_status = 'approved' THEN 'withdrawal_approved' ELSE 'withdrawal_rejected' END,
        request.user_id,
        jsonb_build_object(
            'request_id', p_request_id,
            'amount_pi', request.amount_pi,
            'rejection_reason', p_rejection_reason
        )
    );
END;
$$;


ALTER FUNCTION "public"."process_user_withdrawal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_withdrawal_request"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    request RECORD;
    processor_profile RECORD;
BEGIN
    -- Vérifier que l'appelant est un super_admin ou un secrétaire
    SELECT * INTO processor_profile FROM public.profiles WHERE id = p_processor_id;
    IF processor_profile.user_type NOT IN ('super_admin', 'secretary') THEN
        RAISE EXCEPTION 'Permission non accordée.';
    END IF;

    -- Récupérer la demande de retrait
    SELECT * INTO request FROM public.organizer_withdrawal_requests WHERE id = p_request_id;

    IF request.status <> 'pending' THEN
        RAISE EXCEPTION 'Cette demande a déjà été traitée.';
    END IF;

    -- Mettre à jour la demande de retrait
    UPDATE public.organizer_withdrawal_requests
    SET status = p_status,
        admin_notes = CASE WHEN processor_profile.user_type = 'secretary' THEN p_rejection_reason ELSE admin_notes END,
        superadmin_notes = CASE WHEN processor_profile.user_type = 'super_admin' THEN p_rejection_reason ELSE superadmin_notes END,
        reviewed_by_admin = CASE WHEN processor_profile.user_type = 'secretary' THEN p_processor_id ELSE reviewed_by_admin END,
        reviewed_by_superadmin = CASE WHEN processor_profile.user_type = 'super_admin' THEN p_processor_id ELSE reviewed_by_superadmin END,
        reviewed_at = NOW(),
        paid_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END
    WHERE id = p_request_id;

    -- Si la demande est rejetée, rembourser les pièces à l'organisateur
    IF p_status = 'rejected' THEN
        UPDATE public.profiles
        SET available_earnings = COALESCE(available_earnings, 0) + request.amount_pi
        WHERE id = request.organizer_id;
    END IF;
    
    -- Envoyer une notification à l'organisateur
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        request.organizer_id,
        'Mise à jour de votre demande de retrait',
        CASE 
            WHEN p_status = 'approved' THEN 'Votre demande de retrait de ' || request.amount_pi || 'π a été approuvée.'
            ELSE 'Votre demande de retrait de ' || request.amount_pi || 'π a été rejetée. Raison: ' || p_rejection_reason
        END,
        CASE WHEN p_status = 'approved' THEN 'success' ELSE 'warning' END
    );
    
    -- Enregistrer l'action dans les journaux d'administration
    INSERT INTO public.admin_logs (actor_id, action_type, target_id, details)
    VALUES (
        p_processor_id,
        CASE WHEN p_status = 'approved' THEN 'withdrawal_approved' ELSE 'withdrawal_rejected' END,
        request.organizer_id,
        jsonb_build_object(
            'request_id', p_request_id,
            'amount_pi', request.amount_pi,
            'rejection_reason', p_rejection_reason
        )
    );
END;
$$;


ALTER FUNCTION "public"."process_withdrawal_request"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protected_event_interaction"("p_event_id" "uuid", "p_user_id" "uuid", "p_interaction_type" "text", "p_comment_text" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    event_record RECORD;
    user_profile RECORD;
    has_access BOOLEAN;
    interaction_cost INTEGER;
    organizer_credit INTEGER := 1; -- 1 coin for organizer
    platform_commission INTEGER := 1; -- 1 coin for platform
    is_owner BOOLEAN;
    paid_coins_used INTEGER := 0;
    free_coins_used INTEGER := 0;
    interaction_exists BOOLEAN;
    super_admin_id uuid;
    v_coin_to_fcfa_rate INT;
BEGIN
    SELECT coin_to_fcfa_rate INTO v_coin_to_fcfa_rate FROM app_settings LIMIT 1;
    v_coin_to_fcfa_rate := COALESCE(v_coin_to_fcfa_rate, 10);

    SELECT *, (organizer_id = p_user_id) as owner INTO event_record FROM events WHERE id = p_event_id AND status = 'active';
    is_owner := event_record.owner;

    IF event_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Événement non trouvé');
    END IF;

    -- Gérer le unlike
    IF p_interaction_type = 'like' THEN
        SELECT EXISTS(SELECT 1 FROM user_interactions WHERE event_id = p_event_id AND user_id = p_user_id AND interaction_type = 'like') INTO interaction_exists;
        
        IF interaction_exists THEN
            DELETE FROM user_interactions WHERE event_id = p_event_id AND user_id = p_user_id AND interaction_type = 'like';
            UPDATE events SET interactions_count = GREATEST(0, COALESCE(interactions_count, 1) - 1), updated_at = NOW() WHERE id = p_event_id;
            RETURN jsonb_build_object('success', true, 'message', 'Mention "J''aime" retirée');
        END IF;
    END IF;

    -- Déterminer le coût
    IF is_owner THEN
        interaction_cost := 0;
    ELSIF event_record.event_type = 'protected' AND p_interaction_type IN ('like', 'comment', 'share', 'contact') THEN
        interaction_cost := 2;
    ELSE
        interaction_cost := 0;
    END IF;

    -- Vérifier l'accès pour les événements protégés
    IF event_record.event_type = 'protected' AND NOT is_owner THEN
        SELECT EXISTS(SELECT 1 FROM protected_event_access WHERE event_id = p_event_id AND user_id = p_user_id AND status = 'active') INTO has_access;
        IF NOT has_access THEN
            RETURN jsonb_build_object('success', false, 'message', 'Accès requis. Veuillez d''abord débloquer l''événement');
        END IF;
    END IF;

    -- Gérer le paiement s'il y a un coût
    IF interaction_cost > 0 THEN
        SELECT * INTO user_profile FROM profiles WHERE id = p_user_id;
        IF (COALESCE(user_profile.coin_balance, 0) + COALESCE(user_profile.free_coin_balance, 0)) < interaction_cost THEN
            RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant. ' || interaction_cost || 'π requis pour cette action');
        END IF;
        
        free_coins_used := LEAST(COALESCE(user_profile.free_coin_balance, 0), interaction_cost);
        paid_coins_used := interaction_cost - free_coins_used;

        UPDATE profiles SET 
            free_coin_balance = free_coin_balance - free_coins_used,
            coin_balance = coin_balance - paid_coins_used
        WHERE id = p_user_id;
        
        INSERT INTO coin_spending (user_id, amount, spent_from_free, free_coins_used, paid_coins_used, purpose, target_id, target_type, description)
        VALUES (p_user_id, interaction_cost, free_coins_used > 0, free_coins_used, paid_coins_used, p_interaction_type, p_event_id, 'event_interaction', 'Interaction (' || p_interaction_type || ') sur l''événement ' || event_record.title);
        
        -- Distribuer les gains si des pièces PAYANTES ont été utilisées
        IF paid_coins_used > 0 THEN
            INSERT INTO organizer_earnings (organizer_id, event_id, transaction_type, earnings_coins, earnings_fcfa, status, platform_commission, description) 
            VALUES (event_record.organizer_id, p_event_id, 'paid_interaction', organizer_credit, organizer_credit * v_coin_to_fcfa_rate, 'available', platform_commission, 'Gain pour interaction de type ' || p_interaction_type);
            
            UPDATE profiles SET available_earnings = COALESCE(available_earnings, 0) + organizer_credit WHERE id = event_record.organizer_id;

            -- Créditer la plateforme
            SELECT id INTO super_admin_id FROM profiles WHERE user_type = 'super_admin' LIMIT 1;
            IF super_admin_id IS NOT NULL THEN
              UPDATE profiles SET commission_wallet = COALESCE(commission_wallet, 0) + platform_commission WHERE id = super_admin_id;
            END IF;
        END IF;
    END IF;
    
    -- Enregistrer l'interaction utilisateur
    INSERT INTO user_interactions (user_id, event_id, interaction_type, cost_paid, used_free_balance, organizer_earned, platform_commission, comment_text)
    VALUES (p_user_id, p_event_id, p_interaction_type, interaction_cost, free_coins_used > 0, CASE WHEN is_owner OR paid_coins_used = 0 THEN 0 ELSE organizer_credit END, CASE WHEN is_owner OR paid_coins_used = 0 THEN 0 ELSE platform_commission END, p_comment_text);
    
    -- Mettre à jour le compteur d'interactions sur l'événement
    UPDATE events SET interactions_count = COALESCE(interactions_count, 0) + 1, updated_at = NOW() WHERE id = p_event_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Interaction enregistrée avec succès');
END;
$$;


ALTER FUNCTION "public"."protected_event_interaction"("p_event_id" "uuid", "p_user_id" "uuid", "p_interaction_type" "text", "p_comment_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_event_pack"("p_user_id" "uuid", "p_event_id" "uuid", "p_pack_id" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    pack_info RECORD;
    user_profile RECORD;
BEGIN
    -- 1. Récupérer les informations sur le pack depuis admin_config
    SELECT
        (p->>'id')::text AS id,
        (p->>'coins')::int AS coins
    INTO pack_info
    FROM admin_config, jsonb_array_elements(admin_config.event_packs) AS p
    WHERE (p->>'id')::text = p_pack_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Pack d''événement non trouvé.';
        RETURN;
    END IF;

    -- 2. Vérifier le solde de l'utilisateur
    SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
    IF user_profile.total_coins < pack_info.coins THEN
        RETURN QUERY SELECT false, 'Solde de pièces insuffisant.';
        RETURN;
    END IF;

    -- 3. Mettre à jour l'événement avec le type de pack
    UPDATE public.events
    SET pack_type = p_pack_id
    WHERE id = p_event_id;

    -- 4. Déduire les pièces du portefeuille de l'utilisateur
    UPDATE public.profiles
    SET
        bonus_coins = GREATEST(0, bonus_coins - pack_info.coins),
        purchased_coins = purchased_coins - GREATEST(0, pack_info.coins - bonus_coins)
    WHERE id = p_user_id;

    -- 5. Enregistrer la transaction
    INSERT INTO public.coin_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -pack_info.coins, 'debit', 'Achat pack événement: ' || p_pack_id || ' pour l''événement ' || p_event_id);

    RETURN QUERY SELECT true, 'Pack événement acheté avec succès !';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."purchase_event_pack"("p_user_id" "uuid", "p_event_id" "uuid", "p_pack_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_raffle_tickets_with_commission"("p_raffle_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) RETURNS TABLE("success" boolean, "message" "text", "total_coins" integer, "platform_commission" integer, "organizer_earnings" integer, "ticket_numbers" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_raffle RECORD;
    v_event RECORD;
    v_total_coins INTEGER;
    v_ticket_numbers TEXT[] := '{}';
    v_commission_result RECORD;
    i INTEGER;
BEGIN
    -- Vérifier le tirage
    SELECT * INTO v_raffle FROM public.event_raffles 
    WHERE id = p_raffle_id AND is_active = true AND draw_date > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Tirage non disponible.', NULL, NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Récupérer l'organisateur
    SELECT organizer_id INTO v_event FROM public.events WHERE id = v_raffle.event_id;

    -- Calcul du total
    IF v_raffle.ticket_price_coins IS NOT NULL THEN
        v_total_coins := v_raffle.ticket_price_coins * p_ticket_quantity;
    ELSE
        v_total_coins := public.convert_fcfa_to_coins(v_raffle.ticket_price_fcfa * p_ticket_quantity);
    END IF;

    -- Créer les tickets
    FOR i IN 1..p_ticket_quantity LOOP
        DECLARE
            v_ticket_number TEXT := 'R' || EXTRACT(EPOCH FROM NOW()) || substr(md5(random()::text), 1, 8);
        BEGIN
            INSERT INTO public.raffle_tickets (
                raffle_id, user_id, ticket_number,
                purchase_amount_fcfa, purchase_amount_coins
            ) VALUES (
                p_raffle_id, p_user_id, v_ticket_number,
                v_raffle.ticket_price_fcfa, 
                COALESCE(v_raffle.ticket_price_coins, public.convert_fcfa_to_coins(v_raffle.ticket_price_fcfa))
            );

            v_ticket_numbers := array_append(v_ticket_numbers, v_ticket_number);
        END;
    END LOOP;

    -- Mettre à jour les tickets vendus
    UPDATE public.event_raffles 
    SET tickets_sold = tickets_sold + p_ticket_quantity,
        updated_at = NOW()
    WHERE id = p_raffle_id;

    -- APPLIQUER LES COMMISSIONS 5%/95%
    SELECT * INTO v_commission_result
    FROM public.apply_commission_5_95(
        v_raffle.event_id, v_event.organizer_id, p_raffle_id, 
        'raffle_ticket', p_user_id, v_total_coins
    );

    RETURN QUERY SELECT true, 'Tickets de tirage achetés! Commission 5% appliquée', 
                v_total_coins,
                v_commission_result.platform_commission,
                v_commission_result.organizer_earnings,
                v_ticket_numbers;

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Erreur: ' || SQLERRM, NULL, NULL, NULL, NULL;
END;
$$;


ALTER FUNCTION "public"."purchase_raffle_tickets_with_commission"("p_raffle_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_ticket_with_pricing"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer DEFAULT 1) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    ticket_info RECORD;
    user_balance INTEGER;
    total_cost_pi INTEGER;
    ticket_ids UUID[];
    i INTEGER;
    new_ticket_id UUID;
    organizer_earning INTEGER;
    platform_commission INTEGER;
    event_organizer_id UUID;
BEGIN
    SELECT * INTO ticket_info
    FROM current_ticket_pricing
    WHERE ticket_type_id = p_ticket_type_id AND event_id = p_event_id;
    
    IF ticket_info IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Type de ticket non trouvé ou indisponible.');
    END IF;
    
    IF (SELECT quantity_available - quantity_sold FROM ticket_types WHERE id = p_ticket_type_id) < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nombre de tickets demandé non disponible');
    END IF;
    
    total_cost_pi := ticket_info.current_price_pi * p_quantity;
    
    SELECT (coin_balance + free_coin_balance) INTO user_balance FROM profiles WHERE id = p_user_id;
    
    IF user_balance IS NULL OR user_balance < total_cost_pi THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solde insuffisant');
    END IF;

    PERFORM debitCoins(p_user_id, total_cost_pi, 'ticket_purchase', p_event_id, 'event');
    
    FOR i IN 1..p_quantity LOOP
        INSERT INTO event_tickets (ticketing_event_id, event_id, user_id, ticket_type_id, ticket_number, qr_code, purchase_amount_pi, status)
        VALUES (ticket_info.ticketing_event_id, p_event_id, p_user_id, p_ticket_type_id, 'TICKET-' || SUBSTRING(p_event_id::TEXT, 1, 4) || '-' || (EXTRACT(EPOCH FROM NOW()))::INTEGER || '-' || i, 'QR-' || uuid_generate_v4(), ticket_info.current_price_pi, 'active')
        RETURNING id INTO new_ticket_id;
        ticket_ids := array_append(ticket_ids, new_ticket_id);
    END LOOP;
    
    SELECT organizer_id INTO event_organizer_id FROM events WHERE id = p_event_id;
    
    platform_commission := FLOOR(total_cost_pi * 0.05);
    organizer_earning := total_cost_pi - platform_commission;
    
    IF organizer_earning > 0 THEN
        INSERT INTO organizer_earnings (organizer_id, event_id, earnings_type, amount, status)
        VALUES (event_organizer_id, p_event_id, 'ticket_sale', organizer_earning, 'available');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', p_quantity || ' billet(s) acheté(s)');
END;
$$;


ALTER FUNCTION "public"."purchase_ticket_with_pricing"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_cart" "jsonb", "p_event_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    ticket_type_id_key uuid;
    quantity_value int;
    total_cost_fcfa numeric := 0;
    total_cost_pi int := 0;
    total_ticket_count int := 0;
    ticket_type_record record;
    ticketing_event_record record;
    new_order_id uuid;
    debit_result JSONB;
    user_email_val text;
    ticket_ids_array uuid[];
    current_ticket_id uuid;
    purchase_period_text text;
BEGIN
    -- Get ticketing event info
    SELECT * INTO ticketing_event_record FROM public.ticketing_events WHERE event_id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Événement de billetterie non trouvé.');
    END IF;

    -- Calculate total cost and check availability
    FOR ticket_type_id_key, quantity_value IN SELECT * FROM jsonb_each_text(p_cart) LOOP
        IF quantity_value::int > 0 THEN
            SELECT * INTO ticket_type_record FROM public.current_ticket_pricing WHERE ticket_type_id = ticket_type_id_key::uuid AND event_id = p_event_id;
            
            IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Type de billet non trouvé ou prix non défini: ' || ticket_type_id_key); END IF;
            IF (ticket_type_record.quantity_available - COALESCE(ticket_type_record.quantity_sold, 0)) < quantity_value::int THEN
                RETURN jsonb_build_object('success', false, 'message', 'Pas assez de billets disponibles pour: ' || ticket_type_record.ticket_type_name);
            END IF;

            total_cost_fcfa := total_cost_fcfa + (ticket_type_record.current_price_fcfa * quantity_value::int);
            total_cost_pi := total_cost_pi + (ticket_type_record.current_price_pi * quantity_value::int);
            total_ticket_count := total_ticket_count + quantity_value::int;
            purchase_period_text := ticket_type_record.current_period; -- Capture the pricing period
        END IF;
    END LOOP;

    -- Debit user coins
    debit_result := public.debit_coins_and_distribute_earnings(p_user_id, p_event_id, total_cost_pi, 'ticket_sale', p_event_id, 'event');
    IF NOT (debit_result->>'success')::boolean THEN
        RETURN debit_result;
    END IF;

    -- Create order
    INSERT INTO public.ticket_orders (user_id, event_id, ticketing_event_id, total_amount_pi, total_amount_fcfa, ticket_count, order_status, confirmed_at)
    VALUES (p_user_id, p_event_id, ticketing_event_record.id, total_cost_pi, total_cost_fcfa, total_ticket_count, 'confirmed', now())
    RETURNING id INTO new_order_id;
    
    -- Create individual tickets
    FOR ticket_type_id_key, quantity_value IN SELECT * FROM jsonb_each_text(p_cart) LOOP
        IF quantity_value::int > 0 THEN
            SELECT * INTO ticket_type_record FROM public.current_ticket_pricing WHERE ticket_type_id = ticket_type_id_key::uuid AND event_id = p_event_id;
            FOR i IN 1..quantity_value::int LOOP
                 INSERT INTO public.event_tickets (order_id, ticketing_event_id, event_id, user_id, ticket_type_id, ticket_number, qr_code, purchase_amount_pi, purchase_amount_fcfa, status, purchased_at)
                 VALUES (new_order_id, ticketing_event_record.id, p_event_id, p_user_id, ticket_type_id_key::uuid, 'TICKET-' || SUBSTRING(p_event_id::text, 1, 4) || '-' || (EXTRACT(EPOCH FROM NOW())*1000)::bigint || '-' || i, 'QR-' || uuid_generate_v4(), ticket_type_record.current_price_pi, ticket_type_record.current_price_fcfa, 'active', now())
                 RETURNING id INTO current_ticket_id;
                 ticket_ids_array := array_append(ticket_ids_array, current_ticket_id);
            END LOOP;
        END IF;
    END LOOP;

    -- Get user email for notification
    SELECT email INTO user_email_val FROM public.profiles WHERE id = p_user_id;

    -- Send confirmation email
    IF user_email_val IS NOT NULL AND array_length(ticket_ids_array, 1) > 0 THEN
        PERFORM public.send_ticket_confirmation_email(p_user_id, user_email_val, ticket_ids_array, p_event_id, total_cost_pi, total_cost_fcfa, purchase_period_text);
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Achat réussi!');
END;
$$;


ALTER FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_cart" "jsonb", "p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_event_id" "uuid", "p_cart" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    ticket_type_id_key uuid;
    quantity_value int;
    total_cost_pi int := 0;
    ticket_type_record record;
    ticketing_event_record record;
    new_order_id uuid;
    debit_result JSONB;
    user_email_val text;
    ticket_ids_array uuid[];
    current_ticket_id uuid;
BEGIN
    SELECT * INTO ticketing_event_record FROM ticketing_events WHERE event_id = p_event_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Événement de billetterie non trouvé.'); END IF;
    
    FOR ticket_type_id_key, quantity_value IN SELECT * FROM jsonb_each_text(p_cart) LOOP
        IF quantity_value::int > 0 THEN
            SELECT tt.*, op.calculated_coins AS calculated_price_pi, op.amount as base_price
            INTO ticket_type_record
            FROM ticket_types tt
            JOIN organizer_prices op ON tt.id = op.ticket_type_id
            WHERE tt.id = ticket_type_id_key::uuid AND op.event_id = p_event_id AND op.price_type = 'ticket' AND op.pricing_period = 'regular' AND op.is_active = true;

            IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Type de billet non trouvé: ' || ticket_type_id_key); END IF;
            IF (ticket_type_record.quantity_available - COALESCE(ticket_type_record.tickets_sold, 0)) < quantity_value::int THEN
                RETURN jsonb_build_object('success', false, 'message', 'Pas assez de billets pour: ' || ticket_type_record.name);
            END IF;
            total_cost_pi := total_cost_pi + (ticket_type_record.calculated_price_pi * quantity_value::int);
        END IF;
    END LOOP;

    debit_result := public.debit_and_distribute_participation_fee(p_user_id, p_event_id, 'ticket_sale', total_cost_pi, p_event_id);
    IF NOT (debit_result->>'success')::boolean THEN RETURN debit_result; END IF;

    INSERT INTO ticket_orders (user_id, event_id, total_amount_coins, ticket_count, status, payment_status, order_date)
    VALUES (p_user_id, p_event_id, total_cost_pi, (SELECT sum(value::int) FROM jsonb_each_text(p_cart)), 'completed', 'paid', now())
    RETURNING id INTO new_order_id;
    
    FOR ticket_type_id_key, quantity_value IN SELECT * FROM jsonb_each_text(p_cart) LOOP
        IF quantity_value::int > 0 THEN
            SELECT tt.*, op.calculated_coins AS calculated_price_pi
            INTO ticket_type_record
            FROM ticket_types tt
            JOIN organizer_prices op ON tt.id = op.ticket_type_id
            WHERE tt.id = ticket_type_id_key::uuid AND op.event_id = p_event_id AND op.price_type = 'ticket' AND op.pricing_period = 'regular' AND op.is_active = true;

            FOR i IN 1..quantity_value::int LOOP
                 INSERT INTO event_tickets (order_id, ticketing_event_id, event_id, user_id, ticket_type_id, ticket_number, qr_code, purchase_amount_pi, status, purchased_at)
                 VALUES (new_order_id, ticketing_event_record.id, p_event_id, p_user_id, ticket_type_id_key::uuid, 'TICKET-' || (EXTRACT(EPOCH FROM NOW())*1000)::bigint || '-' || i, 'QR-' || uuid_generate_v4(), ticket_type_record.calculated_price_pi, 'active', now())
                 RETURNING id INTO current_ticket_id;
                 ticket_ids_array := array_append(ticket_ids_array, current_ticket_id);
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Achat réussi!');
END;
$$;


ALTER FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_event_id" "uuid", "p_cart" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purchase_tickets_with_commission_simple"("p_user_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) RETURNS TABLE("success" boolean, "message" "text", "order_id" "uuid", "total_coins" integer, "platform_commission" integer, "organizer_earnings" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_ticket_type RECORD;
    v_organizer_id UUID;
    v_order_id UUID;
    v_total_coins INTEGER;
    v_commission_result RECORD;
    v_coin_to_fcfa_rate INT;
BEGIN
    SELECT coin_to_fcfa_rate INTO v_coin_to_fcfa_rate FROM app_settings LIMIT 1;
    v_coin_to_fcfa_rate := COALESCE(v_coin_to_fcfa_rate, 10);

    -- Vérifier le type de billet
    SELECT * INTO v_ticket_type
    FROM public.ticket_types
    WHERE id = p_ticket_type_id AND event_id = p_event_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Type de billet non trouvé.', NULL, NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Récupérer l'organisateur
    SELECT organizer_id INTO v_organizer_id
    FROM public.events WHERE id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Événement non trouvé.', NULL, NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Calculer le total
    IF v_ticket_type.price_coins IS NOT NULL THEN
        v_total_coins := v_ticket_type.price_coins * p_quantity;
    ELSE
        v_total_coins := public.convert_price_to_coins(v_ticket_type.price * p_quantity, 'FCFA');
    END IF;

    -- Créer la commande
    INSERT INTO public.ticket_orders (
        user_id, event_id, order_number, total_amount_fcfa, total_amount_coins,
        ticket_count, status, payment_method, payment_status
    ) VALUES (
        p_user_id, p_event_id, 
        'TICKET-' || EXTRACT(EPOCH FROM NOW()) || '-' || substr(md5(random()::text), 1, 6),
        v_total_coins * v_coin_to_fcfa_rate, v_total_coins, 
        p_quantity, 'pending', 'coins', 'pending'
    ) RETURNING id INTO v_order_id;

    -- APPLIQUER LES COMMISSIONS 5%/95%
    SELECT * INTO v_commission_result
    FROM public.apply_commission_5_95(
        p_event_id, v_organizer_id, v_order_id, 
        'ticket_sale', p_user_id, v_total_coins
    );

    -- Mettre à jour la commande
    UPDATE public.ticket_orders 
    SET status = 'paid', payment_status = 'completed', paid_at = NOW()
    WHERE id = v_order_id;

    RETURN QUERY SELECT 
        true, 
        'Achat réussi! Commission: 5% plateforme, 95% organisateur',
        v_order_id,
        v_total_coins,
        v_commission_result.platform_commission,
        v_commission_result.organizer_earnings;

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Erreur: ' || SQLERRM, NULL, NULL, NULL, NULL;
END;
$$;


ALTER FUNCTION "public"."purchase_tickets_with_commission_simple"("p_user_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.withdrawal_requests 
    SET status = 'rejected',
        processed_at = NOW(),
        processed_by = p_processed_by,
        rejection_reason = p_rejection_reason
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Demande non trouvée ou déjà traitée';
    END IF;
    
    RAISE NOTICE '❌ Demande % rejetée. Raison: %', p_request_id, p_rejection_reason;
END;
$$;


ALTER FUNCTION "public"."reject_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."renew_partner_license"("p_license_id" "uuid", "p_duration_days" integer, "p_renewed_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    license_record RECORD;
    new_expiration_date timestamp with time zone;
    caller_role TEXT;
BEGIN
    -- Vérifier que l'appelant est un super_admin
    SELECT user_type INTO caller_role FROM public.profiles WHERE id = p_renewed_by;
    IF caller_role IS NULL OR caller_role <> 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permission non accordée. Seul un super administrateur peut renouveler une licence.');
    END IF;

    -- Récupérer la licence
    SELECT * INTO license_record FROM public.partners WHERE id = p_license_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Licence non trouvée.');
    END IF;

    -- Calculer la nouvelle date d'expiration
    -- Si la licence est déjà expirée, on part de maintenant
    -- Sinon, on prolonge à partir de la date d'expiration actuelle
    IF license_record.expiration_date IS NULL OR license_record.expiration_date < NOW() THEN
        new_expiration_date := NOW() + (p_duration_days || ' days')::interval;
    ELSE
        new_expiration_date := license_record.expiration_date + (p_duration_days || ' days')::interval;
    END IF;

    -- Mettre à jour la licence
    UPDATE public.partners
    SET 
        expiration_date = new_expiration_date,
        status = 'active',
        updated_at = NOW()
    WHERE id = p_license_id;

    -- Enregistrer l'action dans les logs
    INSERT INTO public.admin_logs (actor_id, action_type, target_id, details)
    VALUES (
        p_renewed_by,
        'license_renewed',
        license_record.user_id,
        jsonb_build_object(
            'license_id', p_license_id,
            'duration_days', p_duration_days,
            'new_expiration_date', new_expiration_date
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Licence renouvelée avec succès.',
        'new_expiration_date', new_expiration_date
    );
END;
$$;


ALTER FUNCTION "public"."renew_partner_license"("p_license_id" "uuid", "p_duration_days" integer, "p_renewed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rent_stand"("p_event_id" "uuid", "p_user_id" "uuid", "p_stand_type_id" "uuid", "p_company_name" "text", "p_contact_person" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_business_description" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    stand_type_record RECORD;
    total_cost_pi INTEGER;
    new_stand_number TEXT;
    debit_result JSONB;
BEGIN
    SELECT st.*, se.id as stand_event_id INTO stand_type_record FROM stand_types st JOIN stand_events se ON st.stand_event_id = se.id WHERE st.id = p_stand_type_id AND se.event_id = p_event_id FOR UPDATE OF st;
    IF stand_type_record IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Type de stand non trouvé.'); END IF;
    IF (stand_type_record.quantity_available - COALESCE(stand_type_record.quantity_rented, 0) <= 0) THEN RETURN jsonb_build_object('success', false, 'message', 'Aucun stand disponible de ce type.'); END IF;
    
    total_cost_pi := stand_type_record.calculated_price_pi;

    -- Use the new distribution function
    debit_result := public.debit_and_distribute_participation_fee(p_user_id, p_event_id, 'stand_rental', total_cost_pi, p_stand_type_id);
    IF NOT (debit_result->>'success')::boolean THEN
        RETURN debit_result;
    END IF;

    new_stand_number := 'STD-' || stand_type_record.name || '-' || (COALESCE(stand_type_record.quantity_rented, 0) + 1);
    
    INSERT INTO stand_rentals (stand_event_id, user_id, stand_type_id, stand_number, company_name, contact_person, contact_email, contact_phone, business_description, rental_amount_pi, status, confirmed_at)
    VALUES (stand_type_record.stand_event_id, p_user_id, p_stand_type_id, new_stand_number, p_company_name, p_contact_person, p_contact_email, p_contact_phone, p_business_description, total_cost_pi, 'confirmed', NOW());
    
    UPDATE stand_types SET quantity_rented = COALESCE(quantity_rented, 0) + 1 WHERE id = p_stand_type_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Stand réservé avec succès', 'stand_number', new_stand_number);
END;
$$;


ALTER FUNCTION "public"."rent_stand"("p_event_id" "uuid", "p_user_id" "uuid", "p_stand_type_id" "uuid", "p_company_name" "text", "p_contact_person" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_business_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_license_renewal"("p_admin_id" "uuid", "p_requested_license_type" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_license_status TEXT;
    current_license_type TEXT;
    admin_username TEXT;
BEGIN
    -- Vérifier que l'admin existe et a une licence
    SELECT license_status, license_type, username
    INTO current_license_status, current_license_type, admin_username
    FROM public.profiles 
    WHERE id = p_admin_id;
    
    IF current_license_status IS NULL THEN
        RETURN '❌ Admin non trouvé ou sans licence';
    END IF;
    
    -- Vérifier le type de licence demandé
    IF p_requested_license_type NOT IN ('starter', 'business', 'premium') THEN
        RETURN '❌ Type de licence invalide';
    END IF;
    
    -- Créer la demande de renouvellement
    INSERT INTO public.license_renewal_requests (
        admin_id, requested_license_type, current_license_type
    )
    VALUES (
        p_admin_id, p_requested_license_type, current_license_type
    );
    
    -- Créer une notification pour l'admin
    INSERT INTO public.admin_notifications (admin_id, notification_type, title, message)
    VALUES (
        p_admin_id,
        'renewal_request',
        'Demande de renouvellement envoyée',
        'Votre demande de renouvellement en ' || p_requested_license_type || ' a été envoyée avec succès.'
    );
    
    RETURN '✅ Demande de renouvellement envoyée pour ' || admin_username || ' (licence ' || p_requested_license_type || ')';
END;
$$;


ALTER FUNCTION "public"."request_license_renewal"("p_admin_id" "uuid", "p_requested_license_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_organizer_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    organizer_profile RECORD;
    min_withdrawal INTEGER;
    rate INTEGER;
    amount_fcfa_val INTEGER;
    organizer_id_val UUID := auth.uid();
BEGIN
    -- Get app settings
    SELECT min_withdrawal_pi, coin_to_fcfa_rate INTO min_withdrawal, rate FROM app_settings LIMIT 1;
    min_withdrawal := COALESCE(min_withdrawal, 50);
    rate := COALESCE(rate, 10);

    -- Get organizer profile
    SELECT * INTO organizer_profile FROM public.profiles WHERE id = organizer_id_val;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profil utilisateur non trouvé.';
    END IF;

    -- Validations
    IF p_amount_pi < min_withdrawal THEN
        RAISE EXCEPTION 'Le montant minimum de retrait est de %π.', min_withdrawal;
    END IF;

    IF COALESCE(organizer_profile.available_earnings, 0) < p_amount_pi THEN
        RAISE EXCEPTION 'Solde de gains disponible insuffisant.';
    END IF;

    -- Calculate FCFA amount
    amount_fcfa_val := p_amount_pi * rate;

    -- Deduct from available earnings
    UPDATE public.profiles
    SET available_earnings = available_earnings - p_amount_pi
    WHERE id = organizer_id_val;

    -- Insert withdrawal request
    INSERT INTO public.organizer_withdrawal_requests (
        organizer_id,
        amount_pi,
        amount_fcfa,
        payment_details,
        status
    ) VALUES (
        organizer_id_val,
        p_amount_pi,
        amount_fcfa_val,
        p_payment_details,
        'pending'
    );
END;
$$;


ALTER FUNCTION "public"."request_organizer_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_organizer_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_method" "text", "p_payment_details" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    organizer_profile RECORD;
    min_withdrawal INT;
    rate INT;
    amount_fcfa_val INT;
BEGIN
    -- Get settings
    SELECT min_withdrawal_pi, coin_to_fcfa_rate INTO min_withdrawal, rate FROM app_settings LIMIT 1;
    min_withdrawal := COALESCE(min_withdrawal, 50);
    rate := COALESCE(rate, 10);

    -- Get organizer profile and balance
    SELECT * INTO organizer_profile FROM profiles WHERE id = p_organizer_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Profil organisateur non trouvé.'); END IF;
    
    -- Validations
    IF p_amount_coins < min_withdrawal THEN
        RETURN jsonb_build_object('success', false, 'message', 'Le montant minimum de retrait est de ' || min_withdrawal || 'π.');
    END IF;

    IF COALESCE(organizer_profile.available_earnings, 0) < p_amount_coins THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solde de gains disponible insuffisant.');
    END IF;

    amount_fcfa_val := p_amount_coins * rate;

    -- Deduct from available earnings
    UPDATE profiles
    SET available_earnings = available_earnings - p_amount_coins
    WHERE id = p_organizer_id;

    -- Insert withdrawal request
    INSERT INTO withdrawal_requests (
        organizer_id, user_id, amount_coins, amount_pi, amount_fcfa, withdrawal_method, payment_details, status, request_type
    ) VALUES (
        p_organizer_id, p_organizer_id, p_amount_coins, p_amount_coins, amount_fcfa_val, p_withdrawal_method, p_payment_details, 'pending', 'organizer_withdrawal'
    );
    
    RETURN jsonb_build_object('success', true, 'message', 'Demande de retrait soumise avec succès.');
END;
$$;


ALTER FUNCTION "public"."request_organizer_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_method" "text", "p_payment_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_profile RECORD;
    min_withdrawal INTEGER;
    rate INTEGER;
    amount_fcfa_val INTEGER;
    user_id_val UUID := auth.uid();
BEGIN
    -- Get app settings for withdrawal
    SELECT min_withdrawal_pi, coin_to_fcfa_rate INTO min_withdrawal, rate FROM app_settings LIMIT 1;
    min_withdrawal := COALESCE(min_withdrawal, 50);
    rate := COALESCE(rate, 10);

    -- Get user profile
    SELECT * INTO user_profile FROM public.profiles WHERE id = user_id_val;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profil utilisateur non trouvé.';
    END IF;

    -- Validations
    IF p_amount_pi < min_withdrawal THEN
        RAISE EXCEPTION 'Le montant minimum de retrait est de %π.', min_withdrawal;
    END IF;

    IF COALESCE(user_profile.available_earnings, 0) < p_amount_pi THEN
        RAISE EXCEPTION 'Solde de gains disponible insuffisant.';
    END IF;
    
    -- Calculate FCFA amount
    amount_fcfa_val := p_amount_pi * rate;

    -- Deduct from available earnings
    UPDATE public.profiles
    SET available_earnings = available_earnings - p_amount_pi
    WHERE id = user_id_val;

    -- Insert withdrawal request
    INSERT INTO public.withdrawal_requests (
        user_id,
        amount_pi,
        amount_fcfa,
        payment_details,
        status
    ) VALUES (
        user_id_val,
        p_amount_pi,
        amount_fcfa_val,
        p_payment_details,
        'pending'
    );
END;
$$;


ALTER FUNCTION "public"."request_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_type" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_balance INTEGER;
    organizer_username TEXT;
    amount_fcfa NUMERIC;
BEGIN
    -- Vérifier le solde de l'organisateur
    SELECT total_balance_coins, username 
    INTO current_balance, organizer_username
    FROM public.organizer_wallet ow
    JOIN public.profiles p ON ow.organizer_id = p.id
    WHERE ow.organizer_id = p_organizer_id;
    
    IF current_balance IS NULL THEN
        RETURN '❌ Organisateur non trouvé ou sans solde';
    END IF;
    
    IF p_amount_coins > current_balance THEN
        RETURN '❌ Solde insuffisant. Solde disponible: ' || current_balance || ' pièces';
    END IF;
    
    -- Conversion pièces → FCFA (1:1 pour l'exemple)
    amount_fcfa := p_amount_coins;
    
    -- Créer la demande de retrait
    INSERT INTO public.withdrawal_requests (
        organizer_id,
        amount_coins,
        amount_fcfa,
        withdrawal_type
    )
    VALUES (
        p_organizer_id,
        p_amount_coins,
        amount_fcfa,
        p_withdrawal_type
    );
    
    RETURN '✅ Demande de retrait de ' || p_amount_coins || ' pièces (' || amount_fcfa || ' FCFA) envoyée pour ' || organizer_username;
END;
$$;


ALTER FUNCTION "public"."request_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_application_data"("p_admin_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    admin_profile RECORD;
    table_name TEXT;
BEGIN
    -- 1. Verify that the user is a super_admin
    SELECT user_type INTO admin_profile FROM public.profiles WHERE id = p_admin_id;
    IF admin_profile.user_type IS NULL OR admin_profile.user_type <> 'super_admin' THEN
        RETURN QUERY SELECT false, 'Permission non accordée. Seul un super administrateur peut effectuer cette action.';
        RETURN;
    END IF;

    -- Disable all triggers in the public schema
    FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(table_name) || ' DISABLE TRIGGER ALL;';
    END LOOP;

    -- Deletion sequence from most dependent to least dependent
    DELETE FROM public.ticket_verifications;
    DELETE FROM public.ticket_issues;
    DELETE FROM public.ticket_scans;
    DELETE FROM public.ticket_emails;
    DELETE FROM public.event_tickets;
    DELETE FROM public.ticket_orders;
    DELETE FROM public.ticket_types;
    DELETE FROM public.verification_sessions;

    DELETE FROM public.user_interactions;
    DELETE FROM public.event_comments;
    DELETE FROM public.event_reactions;
    DELETE FROM public.content_reports;
    DELETE FROM public.user_subscriptions;
    DELETE FROM public.protected_event_access;
    DELETE FROM public.organizer_interaction_earnings;
    
    DELETE FROM public.raffle_winners;
    DELETE FROM public.raffle_tickets;
    DELETE FROM public.raffle_prizes;
    
    DELETE FROM public.stand_rentals;
    DELETE FROM public.stand_reservations;
    DELETE FROM public.stand_types;
    
    DELETE FROM public.votes;
    DELETE FROM public.candidates;
    
    DELETE FROM public.event_promotions;
    DELETE FROM public.event_notifications;
    DELETE FROM public.event_revenues;
    DELETE FROM public.event_settings;
    DELETE FROM public.event_geocoding_results;
    DELETE FROM public.organizer_prices;

    DELETE FROM public.raffle_events;
    DELETE FROM public.stand_events;
    DELETE FROM public.ticketing_events;
    
    DELETE FROM public.admin_commissions;
    DELETE FROM public.partner_badges;
    DELETE FROM public.partner_earnings;
    DELETE FROM public.paiements_admin;
    DELETE FROM public.admin_activites;

    DELETE FROM public.organizer_earnings;
    DELETE FROM public.organizer_withdrawal_requests;
    DELETE FROM public.admin_withdrawal_requests;
    
    DELETE FROM public.coin_spending;
    DELETE FROM public.transactions;
    DELETE FROM public.user_video_views;
    DELETE FROM public.referral_program;
    DELETE FROM public.referral_rewards;
    DELETE FROM public.user_coin_transactions;
    
    DELETE FROM public.events;
    DELETE FROM public.locations;

    DELETE FROM public.partners;
    DELETE FROM public.user_partner_licenses;
    DELETE FROM public.admin_licences;
    DELETE FROM public.organizer_scanners;
    
    DELETE FROM public.notifications;
    DELETE FROM public.push_tokens;
    DELETE FROM public.announcements;
    DELETE FROM public.welcome_popups;
    DELETE FROM public.contests;

    DELETE FROM public.withdrawal_requests;
    
    -- Explicitly delete from profiles last before auth.users
    DELETE FROM public.profiles WHERE user_type NOT IN ('super_admin', 'admin', 'secretary');

    -- Now delete from auth.users (triggers are off, so no new profiles will be created)
    DELETE FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles WHERE user_type IN ('super_admin', 'admin', 'secretary'));

    -- Reset balances for remaining admin/secretary users
    UPDATE public.profiles
    SET coin_balance = 0, free_coin_balance = 0, total_earnings = 0, available_earnings = 0, commission_wallet = 0, mandatory_videos_completed = 0, total_video_rewards_earned = 0
    WHERE user_type IN ('super_admin', 'admin', 'secretary');

    DELETE FROM public.organizer_balances;
    DELETE FROM public.admin_balances;

    -- Re-enable all triggers
    FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(table_name) || ' ENABLE TRIGGER ALL;';
    END LOOP;

    RETURN QUERY SELECT true, 'Application réinitialisée avec succès. Toutes les données et les utilisateurs non-admins ont été supprimés.';

EXCEPTION
    WHEN others THEN
        -- Ensure triggers are re-enabled even if an error occurs
        FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        LOOP
            EXECUTE 'ALTER TABLE public.' || quote_ident(table_name) || ' ENABLE TRIGGER ALL;';
        END LOOP;
        RETURN QUERY SELECT false, 'Une erreur est survenue lors de la réinitialisation: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."reset_application_data"("p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_ticket_issue"("p_issue_id" "uuid", "p_organizer_id" "uuid", "p_resolution" "text", "p_new_status" "text" DEFAULT 'resolved'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    issue_record RECORD;
BEGIN
    SELECT ti.*, e.organizer_id as event_organizer_id
    INTO issue_record
    FROM ticket_issues ti
    JOIN events e ON ti.event_id = e.id
    WHERE ti.id = p_issue_id;
    
    IF issue_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Problème non trouvé');
    END IF;
    
    IF issue_record.event_organizer_id != p_organizer_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Accès non autorisé');
    END IF;
    
    UPDATE ticket_issues 
    SET 
        status = p_new_status,
        resolution = p_resolution,
        resolved_at = NOW()
    WHERE id = p_issue_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Problème résolu avec succès',
        'issue_id', p_issue_id,
        'new_status', p_new_status
    );
END;
$$;


ALTER FUNCTION "public"."resolve_ticket_issue"("p_issue_id" "uuid", "p_organizer_id" "uuid", "p_resolution" "text", "p_new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_credit"("p_log_id" "uuid", "p_reverser_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    log_record RECORD;
    target_user_profile RECORD;
    reverser_profile RECORD;
    reversal_amount INTEGER;
    coin_to_fcfa_rate_val INT;
BEGIN
    -- Obtenir les informations sur l'annulateur et vérifier les permissions
    SELECT * INTO reverser_profile FROM public.profiles WHERE id = p_reverser_id;
    IF reverser_profile.user_type NOT IN ('super_admin', 'secretary') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permission non accordée.');
    END IF;

    -- Obtenir le log de crédit original
    SELECT * INTO log_record FROM public.admin_logs WHERE id = p_log_id AND action_type = 'user_credited';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transaction de crédit non trouvée.');
    END IF;
    
    -- Un secrétaire peut uniquement annuler ses propres crédits
    IF reverser_profile.user_type = 'secretary' AND log_record.actor_id <> p_reverser_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Vous ne pouvez annuler que vos propres crédits.');
    END IF;

    -- Vérifier si la transaction a déjà été annulée
    IF (log_record.details->>'reversed')::boolean = true THEN
      RETURN jsonb_build_object('success', false, 'message', 'Cette transaction a déjà été annulée.');
    END IF;

    reversal_amount := (log_record.details->>'amount')::integer;
    SELECT * INTO target_user_profile FROM public.profiles WHERE id = log_record.target_id;

    -- Débiter le montant du compte de l'utilisateur (on suppose que les crédits manuels vont dans coin_balance)
    IF COALESCE(target_user_profile.coin_balance, 0) < reversal_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solde payant de l''utilisateur insuffisant pour annuler ce crédit.');
    END IF;
    UPDATE public.profiles SET coin_balance = coin_balance - reversal_amount WHERE id = log_record.target_id;

    -- Marquer le log original comme annulé
    UPDATE public.admin_logs
    SET details = details || jsonb_build_object('reversed', true, 'reversed_by', p_reverser_id, 'reversed_by_name', reverser_profile.full_name, 'reversed_at', NOW())
    WHERE id = p_log_id;

    -- Obtenir le taux de conversion
    SELECT coin_to_fcfa_rate INTO coin_to_fcfa_rate_val FROM app_settings LIMIT 1;
    coin_to_fcfa_rate_val := COALESCE(coin_to_fcfa_rate_val, 10);

    -- Enregistrer une transaction négative pour impacter le CA
    INSERT INTO public.transactions (user_id, transaction_type, amount_pi, amount_fcfa, description, status, city, region, country)
    VALUES (
        log_record.target_id, 
        'credit_reversal', 
        -reversal_amount, 
        -reversal_amount * coin_to_fcfa_rate_val, 
        'Annulation du crédit du ' || TO_CHAR(log_record.created_at, 'DD/MM/YYYY') || ' par ' || reverser_profile.full_name, 
        'completed',
        target_user_profile.city,
        target_user_profile.region,
        target_user_profile.country
    );

    RETURN jsonb_build_object('success', true, 'message', 'Le crédit a été annulé avec succès.');
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'message', 'Une erreur est survenue: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."reverse_credit"("p_log_id" "uuid", "p_reverser_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_admin_role"("p_user_id" "uuid", "p_admin_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    admin_role TEXT;
BEGIN
    -- 1. Verify that the user is a super_admin
    SELECT role INTO admin_role FROM public.profiles WHERE id = p_admin_id;
    IF admin_role IS NULL OR admin_role <> 'super_admin' THEN
        RETURN QUERY SELECT false, 'Permission non accordée. Seul un super administrateur peut effectuer cette action.';
        RETURN;
    END IF;

    -- 2. Update the user's role back to 'user'
    UPDATE public.profiles
    SET 
        role = 'user',
        admin_type = NULL,
        country = NULL -- Also clear the country association
    WHERE id = p_user_id;

    -- 3. Deactivate any active licenses for this user
    UPDATE public.partner_licenses
    SET status = 'suspended'
    WHERE partner_id = p_user_id AND status = 'active';

    RETURN QUERY SELECT true, 'Le rôle de l''administrateur a été réinitialisé à "utilisateur" et ses licences ont été suspendues.';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."revert_admin_role"("p_user_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scan_ticket"("p_qr_code" "text", "p_scanner_id" "uuid", "p_scan_location" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    ticket_record RECORD;
    event_record RECORD;
    existing_scan RECORD;
BEGIN
    SELECT et.*, tt.name as ticket_type, e.title as event_title, e.event_date, e.organizer_id
    INTO ticket_record
    FROM event_tickets et
    JOIN ticket_types tt ON et.ticket_type_id = tt.id
    JOIN events e ON et.event_id = e.id
    WHERE et.qr_code = p_qr_code;
    
    IF ticket_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Ticket non trouvé',
            'is_valid', false
        );
    END IF;
    
    IF ticket_record.status != 'active' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Ticket non valide ou déjà utilisé',
            'is_valid', false,
            'ticket_status', ticket_record.status
        );
    END IF;
    
    IF ticket_record.event_date > NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'L''événement n''a pas encore commencé',
            'is_valid', false,
            'event_date', ticket_record.event_date
        );
    END IF;
    
    SELECT * INTO existing_scan
    FROM ticket_scans
    WHERE event_ticket_id = ticket_record.id AND scan_type = 'entry'
    ORDER BY scan_timestamp DESC
    LIMIT 1;
    
    IF existing_scan IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Ticket déjà scanné à ' || existing_scan.scan_timestamp,
            'is_valid', false,
            'previous_scan', existing_scan.scan_timestamp
        );
    END IF;
    
    INSERT INTO ticket_scans (
        event_ticket_id,
        scanned_by,
        scan_type,
        scan_location,
        is_valid,
        device_info
    ) VALUES (
        ticket_record.id,
        p_scanner_id,
        'entry',
        p_scan_location,
        true,
        jsonb_build_object(
            'scanner_id', p_scanner_id,
            'scan_time', NOW()
        )
    );
    
    UPDATE event_tickets 
    SET status = 'used',
        checked_in_at = NOW()
    WHERE id = ticket_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Ticket validé avec succès',
        'is_valid', true,
        'ticket_info', jsonb_build_object(
            'ticket_number', ticket_record.ticket_number,
            'ticket_type', ticket_record.ticket_type,
            'attendee_name', (SELECT full_name FROM profiles WHERE id = ticket_record.user_id),
            'event_title', ticket_record.event_title,
            'scan_time', NOW()
        )
    );
END;
$$;


ALTER FUNCTION "public"."scan_ticket"("p_qr_code" "text", "p_scanner_id" "uuid", "p_scan_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_events"("p_search_query" "text" DEFAULT NULL::"text", "p_category_slugs" "text"[] DEFAULT NULL::"text"[], "p_cities" "text"[] DEFAULT NULL::"text"[], "p_event_types" "text"[] DEFAULT NULL::"text"[], "p_price_min" integer DEFAULT NULL::integer, "p_price_max" integer DEFAULT NULL::integer, "p_date_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_date_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_only_promoted" boolean DEFAULT false, "p_sort_by" "text" DEFAULT 'event_date'::"text", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "title" "text", "description" "text", "event_type" "text", "event_date" timestamp with time zone, "cover_image" "text", "location" "text", "city" "text", "country" "text", "category_name" "text", "category_slug" "text", "category_icon" "text", "category_color" "text", "organizer_name" "text", "starting_price_pi" integer, "is_promoted" boolean, "promotion_end" timestamp with time zone, "views_count" integer, "interactions_count" integer, "total_participants" bigint, "availability_status" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ewc.id,
        ewc.title,
        ewc.description,
        ewc.event_type,
        ewc.event_date,
        ewc.cover_image,
        ewc.location,
        ewc.city,
        ewc.country,
        ewc.category_name,
        ewc.category_slug,
        ewc.category_icon,
        ewc.category_color,
        ewc.organizer_name,
        ewc.starting_price_pi,
        ewc.is_promoted,
        ewc.promotion_end,
        ewc.views_count,
        ewc.interactions_count,
        (COALESCE(ewc.total_votes, 0) + COALESCE(ewc.total_tickets_sold, 0) + COALESCE(ewc.total_raffle_participants, 0)) as total_participants,
        ewc.availability_status
    FROM events_with_categories ewc
    WHERE ewc.availability_status = 'active'
      AND (p_search_query IS NULL OR 
           ewc.title ILIKE '%' || p_search_query || '%' OR
           ewc.description ILIKE '%' || p_search_query || '%' OR
           ewc.organizer_name ILIKE '%' || p_search_query || '%' OR
           ewc.category_name ILIKE '%' || p_search_query || '%' OR
           ewc.city ILIKE '%' || p_search_query || '%')
      AND (p_category_slugs IS NULL OR ewc.category_slug = ANY(p_category_slugs))
      AND (p_cities IS NULL OR ewc.city = ANY(p_cities))
      AND (p_event_types IS NULL OR ewc.event_type = ANY(p_event_types))
      AND (p_price_min IS NULL OR ewc.starting_price_pi >= p_price_min)
      AND (p_price_max IS NULL OR ewc.starting_price_pi <= p_price_max)
      AND (p_date_from IS NULL OR ewc.event_date >= p_date_from)
      AND (p_date_to IS NULL OR ewc.event_date <= p_date_to)
      AND (NOT p_only_promoted OR ewc.is_promoted = true)
    ORDER BY
        CASE WHEN p_sort_by = 'promoted' THEN ewc.is_promoted END DESC,
        CASE WHEN p_sort_by = 'event_date' THEN ewc.event_date END ASC,
        CASE WHEN p_sort_by = 'views' THEN ewc.views_count END DESC,
        CASE WHEN p_sort_by = 'popularity' THEN (ewc.views_count + ewc.interactions_count) END DESC,
        ewc.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_events"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_event_types" "text"[], "p_price_min" integer, "p_price_max" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_only_promoted" boolean, "p_sort_by" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_events_advanced"("p_search_query" "text" DEFAULT NULL::"text", "p_category_slugs" "text"[] DEFAULT NULL::"text"[], "p_cities" "text"[] DEFAULT NULL::"text"[], "p_price_min_pi" integer DEFAULT NULL::integer, "p_price_max_pi" integer DEFAULT NULL::integer, "p_date_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_date_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 20) RETURNS TABLE("event_id" "uuid", "title" "text", "description" "text", "event_date" timestamp with time zone, "location" "text", "city" "text", "category_name" "text", "category_slug" "text", "organizer_name" "text", "starting_price_pi" integer, "is_promoted" boolean, "days_remaining" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ewc.id as event_id,
        ewc.title,
        ewc.description,
        ewc.event_date,
        ewc.location,
        ewc.city,
        ewc.category_name,
        ewc.category_slug,
        ewc.organizer_name,
        ewc.starting_price_pi,
        ewc.is_promoted,
        ewc.days_remaining
    FROM events_with_categories ewc
    WHERE ewc.availability_status = 'active'
      AND (p_search_query IS NULL OR ewc.title ILIKE '%' || p_search_query || '%')
      AND (p_category_slugs IS NULL OR ewc.category_slug = ANY(p_category_slugs))
      AND (p_cities IS NULL OR ewc.city = ANY(p_cities))
      AND (p_price_min_pi IS NULL OR ewc.starting_price_pi >= p_price_min_pi)
      AND (p_price_max_pi IS NULL OR ewc.starting_price_pi <= p_price_max_pi)
      AND (p_date_from IS NULL OR ewc.event_date >= p_date_from)
      AND (p_date_to IS NULL OR ewc.event_date <= p_date_to)
    ORDER BY ewc.is_promoted DESC, ewc.event_date ASC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."search_events_advanced"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_price_min_pi" integer, "p_price_max_pi" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_events_for_card"("p_search_query" "text" DEFAULT NULL::"text", "p_category_slugs" "text"[] DEFAULT NULL::"text"[], "p_cities" "text"[] DEFAULT NULL::"text"[], "p_limit" integer DEFAULT 20) RETURNS TABLE("event_id" "uuid", "title" "text", "event_date" timestamp with time zone, "city" "text", "country" "text", "full_address" "text", "cover_image" "text", "category_name" "text", "category_slug" "text", "organizer_id" "uuid", "organizer_name" "text", "event_type" "text", "is_promoted" boolean, "promotion_end" timestamp with time zone, "interactions_count" integer, "created_at" timestamp with time zone, "promoted_until" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as event_id,
        e.title,
        e.event_date,
        e.city,
        e.country,
        e.full_address,
        e.cover_image,
        ec.name as category_name,
        ec.slug as category_slug,
        e.organizer_id,
        p.full_name as organizer_name,
        e.event_type,
        e.is_promoted,
        e.promotion_end,
        e.interactions_count,
        e.created_at,
        e.promoted_until
    FROM 
        public.events e
    LEFT JOIN 
        public.event_categories ec ON e.category_id = ec.id
    LEFT JOIN 
        public.profiles p ON e.organizer_id = p.id
    WHERE 
        e.status = 'active'
        AND e.event_date >= NOW()
        AND (p_search_query IS NULL OR e.title ILIKE '%' || p_search_query || '%' OR e.description ILIKE '%' || p_search_query || '%')
        AND (p_category_slugs IS NULL OR ec.slug = ANY(p_category_slugs))
        AND (p_cities IS NULL OR e.city = ANY(p_cities))
    ORDER BY
        e.is_promoted DESC,
        e.event_date ASC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."search_events_for_card"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_locations"("p_search_query" "text" DEFAULT NULL::"text", "p_type_slugs" "text"[] DEFAULT NULL::"text"[], "p_city" "text" DEFAULT NULL::"text", "p_sort_by" "text" DEFAULT 'rating'::"text", "p_lat" numeric DEFAULT NULL::numeric, "p_lng" numeric DEFAULT NULL::numeric, "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("location_id" "uuid", "name" "text", "description" "text", "type_name" "text", "type_slug" "text", "type_icon" "text", "address" "text", "city" "text", "country" "text", "latitude" numeric, "longitude" numeric, "google_maps_link" "text", "images" "text"[], "features" "text"[], "price_range" "text", "rating" numeric, "total_reviews" integer, "is_verified" boolean, "distance_km" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as location_id,
        l.name,
        l.description,
        lt.name as type_name,
        lt.slug as type_slug,
        lt.icon as type_icon,
        l.address,
        l.city,
        l.country,
        l.latitude,
        l.longitude,
        l.google_maps_link,
        l.images,
        l.features,
        l.price_range,
        l.rating,
        l.total_reviews,
        l.is_verified,
        -- Calcul de distance si coordonnées utilisateur fournies
        CASE 
            WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL THEN
                CAST(6371 * ACOS(
                    COS(RADIANS(p_lat)) * COS(RADIANS(l.latitude)) * 
                    COS(RADIANS(l.longitude) - RADIANS(p_lng)) + 
                    SIN(RADIANS(p_lat)) * SIN(RADIANS(l.latitude))
                ) AS DECIMAL(10,2))
            ELSE NULL
        END as distance_km
        
    FROM locations l
    JOIN location_types lt ON l.type_id = lt.id
    WHERE l.is_active = true
      AND (p_search_query IS NULL OR 
           l.name ILIKE '%' || p_search_query || '%' OR
           l.description ILIKE '%' || p_search_query || '%' OR
           l.address ILIKE '%' || p_search_query || '%')
      AND (p_type_slugs IS NULL OR lt.slug = ANY(p_type_slugs))
      AND (p_city IS NULL OR l.city = p_city)
    ORDER BY 
        CASE WHEN p_sort_by = 'rating' THEN l.rating END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'created_at' THEN l.created_at END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'views' THEN l.views_count END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'distance' THEN distance_km END ASC NULLS LAST,
        l.is_verified DESC,
        l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_locations"("p_search_query" "text", "p_type_slugs" "text"[], "p_city" "text", "p_sort_by" "text", "p_lat" numeric, "p_lng" numeric, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_announcement_to_users"("announcement_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    announcement_record RECORD;
    total_recipients INTEGER := 0;
    total_sent INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Récupérer l'annonce
    SELECT * INTO announcement_record FROM announcements WHERE id = announcement_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Annonce non trouvée');
    END IF;

    -- Insérer les notifications pour tous les utilisateurs actifs
    INSERT INTO notifications (user_id, title, message, type, data, image_url, sound_enabled, vibration_enabled, sound_effect, is_global)
    SELECT 
        p.id,
        announcement_record.title,
        announcement_record.message,
        'announcement',
        jsonb_build_object(
            'announcement_id', announcement_uuid,
            'type', announcement_record.type,
            'video_url', announcement_record.video_url
        ),
        announcement_record.image_url,
        true, -- Enable sound
        true, -- Enable vibration
        'announcement', -- Specific sound effect
        true -- This is a global notification
    FROM public.profiles p
    WHERE p.is_active = true
    RETURNING id;

    GET DIAGNOSTICS total_sent = ROW_COUNT;
    
    -- Mettre à jour l'annonce
    UPDATE announcements 
    SET 
        status = 'sent',
        total_recipients = total_sent,
        delivered_count = total_sent,
        sent_at = NOW()
    WHERE id = announcement_uuid;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Annonce envoyée',
        'total_sent', total_sent
    );
END;
$$;


ALTER FUNCTION "public"."send_announcement_to_users"("announcement_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_license_expiration_notifications"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    notification_count INTEGER;
BEGIN
    -- Créer des notifications pour les licences qui expirent bientôt
    INSERT INTO public.admin_notifications (admin_id, notification_type, title, message)
    SELECT 
        id,
        'license_expiration',
        'Votre licence expire bientôt',
        'Votre licence ' || license_type || ' expire le ' || 
        TO_CHAR(license_expires_at, 'DD/MM/YYYY') || '. Pensez à la renouveler.'
    FROM public.profiles 
    WHERE license_status = 'active'
    AND license_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';
    
    -- Récupérer le nombre de notifications créées
    GET DIAGNOSTICS notification_count = ROW_COUNT;
    
    RETURN '✅ ' || notification_count || ' notifications d expiration créées';
END;
$$;


ALTER FUNCTION "public"."send_license_expiration_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_push_notification"("user_uuid" "uuid", "notif_title" "text", "notif_message" "text", "notif_type" "text" DEFAULT 'system'::"text", "notif_data" "jsonb" DEFAULT NULL::"jsonb", "notif_sound" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, title, message, type, data, sound_enabled, vibration_enabled
    ) VALUES (
        user_uuid, notif_title, notif_message, notif_type, notif_data, notif_sound, true
    ) RETURNING id INTO notification_id;
    
    UPDATE notifications SET push_sent = TRUE WHERE id = notification_id;
    
    RETURN notification_id;
END;
$$;


ALTER FUNCTION "public"."send_push_notification"("user_uuid" "uuid", "notif_title" "text", "notif_message" "text", "notif_type" "text", "notif_data" "jsonb", "notif_sound" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    event_info RECORD;
    ticket_details JSONB;
    email_content_html TEXT;
    email_subject TEXT;
    app_logo_url TEXT;
    user_full_name TEXT;
BEGIN
    -- Get App Logo and User Name
    SELECT logo_url INTO app_logo_url FROM app_settings LIMIT 1;
    app_logo_url := COALESCE(app_logo_url, 'https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png');
    SELECT full_name INTO user_full_name FROM profiles WHERE id = p_user_id;

    -- Get Event Info
    SELECT title, event_date, location, full_address, cover_image
    INTO event_info
    FROM events
    WHERE id = p_event_id;
    
    -- Aggregate Ticket Details
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'ticket_number', et.ticket_number,
            'qr_code_url', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' || et.qr_code,
            'ticket_type', tt.name,
            'purchase_date', et.purchased_at
        )
    ) INTO ticket_details
    FROM event_tickets et
    JOIN ticket_types tt ON et.ticket_type_id = tt.id
    WHERE et.id = ANY(p_ticket_ids);
    
    email_subject := 'Vos billets pour ' || event_info.title;
    
    -- Construct HTML Email
    email_content_html := format(
    '<!DOCTYPE html>
    <html lang="fr" style="font-family: Arial, sans-serif; line-height: 1.6;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>%s</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(to right, #4a00e0, #8e2de2); color: #ffffff; padding: 20px; text-align: center; }
        .header img { max-width: 150px; margin-bottom: 10px; }
        .content { padding: 20px; }
        .event-info img { width: 100%%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-top: 15px; }
        .ticket { border: 1px dashed #ccc; padding: 15px; margin: 20px 0; border-radius: 10px; background-color: #f9f9f9; }
        .qr-code { text-align: center; margin-top: 15px; }
        .important { color: #d9534f; font-weight: bold; }
        .footer { text-align: center; font-size: 12px; color: #777; padding: 20px; background-color: #f1f1f1; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="%s" alt="BonPlanInfos Logo">
          <h1>Confirmation de billets</h1>
        </div>
        <div class="content">
          <p>Bonjour %s,</p>
          <p>Merci pour votre achat ! Voici vos billets pour <strong>%s</strong>.</p>
          <div class="event-info">
            <h2>Détails de l''événement</h2>
            <p><strong>Date :</strong> %s</p>
            <p><strong>Lieu :</strong> %s</p>
            <img src="%s" alt="Affiche de l''événement">
          </div>
          <h2>Vos billets</h2>
          %s
          <div>
            <h2 style="color: #4a00e0;">Informations importantes</h2>
            <p class="important">📍 Présentez le QR code de chaque billet à l''entrée de l''événement.</p>
            <p class="important">📱 Vous pouvez présenter les QR codes directement depuis votre smartphone.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; %s BonPlanInfos. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>', 
    email_subject,
    app_logo_url, 
    user_full_name,
    event_info.title, 
    to_char(event_info.event_date, 'DD/MM/YYYY à HH24:MI'), 
    COALESCE(event_info.full_address, event_info.location, 'Lieu non spécifié'),
    event_info.cover_image,
    (SELECT STRING_AGG(
        format(
            '<div class="ticket"><h3>Billet: %s</h3><p><strong>Numéro:</strong> %s</p><div class="qr-code"><img src="%s" alt="QR Code"/></div></div>',
            ticket->>'ticket_type',
            ticket->>'ticket_number',
            ticket->>'qr_code_url'
        ), ''
    ) FROM jsonb_array_elements(ticket_details) AS ticket),
    EXTRACT(YEAR FROM NOW())
    );
    
    -- Insert email record for each ticket
    INSERT INTO ticket_emails (event_ticket_id, recipient_email, email_type, subject, content_html, delivery_status)
    SELECT ticket_id, p_user_email, 'confirmation', email_subject, email_content_html, 'pending'
    FROM unnest(p_ticket_ids) as ticket_id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" integer, "p_purchase_period" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    event_info RECORD;
    ticket_details JSONB;
    email_content_html TEXT;
    email_subject TEXT;
    app_logo_url TEXT;
    user_full_name TEXT;
BEGIN
    -- Get App Logo and User Name
    SELECT logo_url INTO app_logo_url FROM app_settings LIMIT 1;
    app_logo_url := COALESCE(app_logo_url, 'https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png');
    SELECT full_name INTO user_full_name FROM profiles WHERE id = p_user_id;

    -- Get Event Info
    SELECT title, event_date, location, full_address, cover_image
    INTO event_info
    FROM events
    WHERE id = p_event_id;
    
    -- Aggregate Ticket Details
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'ticket_number', et.ticket_number,
            'qr_code_url', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' || et.qr_code,
            'ticket_type', tt.name,
            'purchase_date', et.purchased_at
        )
    ) INTO ticket_details
    FROM event_tickets et
    JOIN ticket_types tt ON et.ticket_type_id = tt.id
    WHERE et.id = ANY(p_ticket_ids);
    
    email_subject := 'Vos billets pour ' || event_info.title;
    
    -- Construct HTML Email
    email_content_html := format(
    '<!DOCTYPE html>
    <html lang="fr" style="font-family: Arial, sans-serif; line-height: 1.6;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>%s</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(to right, #4a00e0, #8e2de2); color: #ffffff; padding: 20px; text-align: center; }
        .header img { max-width: 150px; margin-bottom: 10px; }
        .content { padding: 20px; }
        .event-info img { width: 100%%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-top: 15px; }
        .ticket { border: 1px dashed #ccc; padding: 15px; margin: 20px 0; border-radius: 10px; background-color: #f9f9f9; }
        .qr-code { text-align: center; margin-top: 15px; }
        .important { color: #d9534f; font-weight: bold; }
        .summary { background-color: #eee; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .footer { text-align: center; font-size: 12px; color: #777; padding: 20px; background-color: #f1f1f1; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="%s" alt="BonPlanInfos Logo">
          <h1>Confirmation de billets</h1>
        </div>
        <div class="content">
          <p>Bonjour %s,</p>
          <p>Merci pour votre achat ! Voici vos billets pour <strong>%s</strong>.</p>
          <div class="event-info">
            <h2>Détails de l''événement</h2>
            <p><strong>Date :</strong> %s</p>
            <p><strong>Lieu :</strong> %s</p>
            <img src="%s" alt="Affiche de l''événement">
          </div>
          <div class="summary">
            <h3>Résumé de la commande</h3>
            <p><strong>Nombre de billets :</strong> %s</p>
            <p><strong>Coût total :</strong> %s π (~%s FCFA)</p>
            <p><strong>Période d''achat :</strong> %s</p>
          </div>
          <h2>Vos billets</h2>
          %s
          <div>
            <h2 style="color: #4a00e0;">Informations importantes</h2>
            <p class="important">📍 Présentez le QR code de chaque billet à l''entrée de l''événement.</p>
            <p class="important">📱 Vous pouvez présenter les QR codes directement depuis votre smartphone.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; %s BonPlanInfos. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>', 
    email_subject,
    app_logo_url, 
    user_full_name,
    event_info.title, 
    to_char(event_info.event_date, 'DD/MM/YYYY à HH24:MI'), 
    COALESCE(event_info.full_address, event_info.location, 'Lieu non spécifié'),
    event_info.cover_image,
    array_length(p_ticket_ids, 1),
    p_total_pi,
    p_total_fcfa,
    p_purchase_period,
    (SELECT STRING_AGG(
        format(
            '<div class="ticket"><h3>Billet: %s</h3><p><strong>Numéro:</strong> %s</p><div class="qr-code"><img src="%s" alt="QR Code"/></div></div>',
            ticket->>'ticket_type',
            ticket->>'ticket_number',
            ticket->>'qr_code_url'
        ), ''
    ) FROM jsonb_array_elements(ticket_details) AS ticket),
    EXTRACT(YEAR FROM NOW())
    );
    
    -- Insert email record for each ticket
    INSERT INTO ticket_emails (event_ticket_id, recipient_email, email_type, subject, content_html, delivery_status)
    SELECT ticket_id, p_user_email, 'confirmation', email_subject, email_content_html, 'pending'
    FROM unnest(p_ticket_ids) as ticket_id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" integer, "p_purchase_period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer DEFAULT NULL::integer, "p_total_fcfa" numeric DEFAULT NULL::numeric, "p_purchase_period" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    event_info RECORD;
    ticket_details JSONB;
    email_content_html TEXT;
    email_subject TEXT;
    app_logo_url TEXT;
    user_full_name TEXT;
BEGIN
    -- Get App Logo and User Name
    SELECT logo_url INTO app_logo_url FROM app_settings LIMIT 1;
    app_logo_url := COALESCE(app_logo_url, 'https://res.cloudinary.com/dprp6vxv6/image/upload/v1722428610/bpi/logo-BPI-v2-transparent_pmsz7v.png');
    SELECT full_name INTO user_full_name FROM profiles WHERE id = p_user_id;

    -- Get Event Info
    SELECT title, event_date, location, full_address, cover_image
    INTO event_info
    FROM events
    WHERE id = p_event_id;
    
    -- Aggregate Ticket Details
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'ticket_number', et.ticket_number,
            'qr_code_url', 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' || et.qr_code,
            'ticket_type', tt.name,
            'purchase_date', et.purchased_at
        )
    ) INTO ticket_details
    FROM event_tickets et
    JOIN ticket_types tt ON et.ticket_type_id = tt.id
    WHERE et.id = ANY(p_ticket_ids);
    
    email_subject := 'Vos billets pour ' || event_info.title;
    
    -- Construct HTML Email
    email_content_html := format(
    '<!DOCTYPE html>
    <html lang="fr" style="font-family: Arial, sans-serif; line-height: 1.6;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>%s</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(to right, #4a00e0, #8e2de2); color: #ffffff; padding: 20px; text-align: center; }
        .header img { max-width: 150px; margin-bottom: 10px; }
        .content { padding: 20px; }
        .event-info img { width: 100%%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-top: 15px; }
        .ticket { border: 1px dashed #ccc; padding: 15px; margin: 20px 0; border-radius: 10px; background-color: #f9f9f9; }
        .qr-code { text-align: center; margin-top: 15px; }
        .important { color: #d9534f; font-weight: bold; }
        .summary { background-color: #eee; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .footer { text-align: center; font-size: 12px; color: #777; padding: 20px; background-color: #f1f1f1; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="%s" alt="BonPlanInfos Logo">
          <h1>Confirmation de billets</h1>
        </div>
        <div class="content">
          <p>Bonjour %s,</p>
          <p>Merci pour votre achat ! Voici vos billets pour <strong>%s</strong>.</p>
          <div class="event-info">
            <h2>Détails de l''événement</h2>
            <p><strong>Date :</strong> %s</p>
            <p><strong>Lieu :</strong> %s</p>
            <img src="%s" alt="Affiche de l''événement">
          </div>
          %s
          <h2>Vos billets</h2>
          %s
          <div>
            <h2 style="color: #4a00e0;">Informations importantes</h2>
            <p class="important">📍 Présentez le QR code de chaque billet à l''entrée de l''événement.</p>
            <p class="important">📱 Vous pouvez présenter les QR codes directement depuis votre smartphone.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; %s BonPlanInfos. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>', 
    email_subject,
    app_logo_url, 
    user_full_name,
    event_info.title, 
    to_char(event_info.event_date, 'DD/MM/YYYY à HH24:MI'), 
    COALESCE(event_info.full_address, event_info.location, 'Lieu non spécifié'),
    event_info.cover_image,
    CASE 
      WHEN p_total_pi IS NOT NULL THEN 
        format('<div class="summary"><h3>Résumé de la commande</h3><p><strong>Nombre de billets :</strong> %s</p><p><strong>Coût total :</strong> %s π (~%s FCFA)</p>%s</div>',
          array_length(p_ticket_ids, 1),
          p_total_pi,
          COALESCE(p_total_fcfa::text, '0'),
          CASE WHEN p_purchase_period IS NOT NULL THEN '<p><strong>Période d''achat :</strong> ' || p_purchase_period || '</p>' ELSE '' END
        )
      ELSE ''
    END,
    (SELECT STRING_AGG(
        format(
            '<div class="ticket"><h3>Billet: %s</h3><p><strong>Numéro:</strong> %s</p><div class="qr-code"><img src="%s" alt="QR Code"/></div></div>',
            ticket->>'ticket_type',
            ticket->>'ticket_number',
            ticket->>'qr_code_url'
        ), ''
    ) FROM jsonb_array_elements(ticket_details) AS ticket),
    EXTRACT(YEAR FROM NOW())
    );
    
    -- Insert email record for each ticket
    INSERT INTO ticket_emails (event_ticket_id, recipient_email, email_type, subject, content_html, delivery_status)
    SELECT ticket_id, p_user_email, 'confirmation', email_subject, email_content_html, 'pending'
    FROM unnest(p_ticket_ids) as ticket_id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" numeric, "p_purchase_period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_ad_campaign_end_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Fin = date de début + nombre de jours du pack
  IF NEW.start_date IS NULL THEN
    NEW.start_date := NOW();
  END IF;
  NEW.end_date := NEW.start_date + (NEW.duration_days || ' days')::INTERVAL;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_ad_campaign_end_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_pricing_period" "text", "p_amount" numeric, "p_currency" "text", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    calculated_coins INTEGER;
    existing_price RECORD;
    amount_xaf NUMERIC;
BEGIN
    calculated_coins := convert_price_to_coins(p_amount, p_currency);
    
    amount_xaf := CASE 
        WHEN p_currency = 'XAF' THEN p_amount
        WHEN p_currency = 'XOF' THEN p_amount
        WHEN p_currency = 'EUR' THEN p_amount * (SELECT exchange_rate FROM currency_rates WHERE base_currency = 'EUR' AND target_currency = 'XAF' AND is_active = true LIMIT 1)
        WHEN p_currency = 'USD' THEN p_amount * (SELECT exchange_rate FROM currency_rates WHERE base_currency = 'USD' AND target_currency = 'XAF' AND is_active = true LIMIT 1)
        ELSE p_amount
    END;
    
    SELECT * INTO existing_price
    FROM organizer_prices
    WHERE event_id = p_ticket_type_id -- Using ticket type id as the reference
    AND price_type = 'ticket'
    AND pricing_period = p_pricing_period;
    
    IF existing_price IS NOT NULL THEN
        UPDATE organizer_prices
        SET currency = p_currency,
            amount = p_amount,
            calculated_coins = calculated_coins,
            start_date = p_start_date,
            end_date = p_end_date,
            updated_at = NOW()
        WHERE id = existing_price.id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Prix mis à jour avec succès',
            'price_id', existing_price.id,
            'calculated_coins', calculated_coins,
            'formatted_price', calculated_coins || 'π = ' || p_amount || ' ' || p_currency,
            'action', 'updated'
        );
    ELSE
        INSERT INTO organizer_prices (
            event_id, price_type, currency, amount, 
            calculated_coins, pricing_period, start_date, end_date
        ) VALUES (
            p_ticket_type_id, 'ticket', p_currency, p_amount,
            calculated_coins, p_pricing_period, p_start_date, p_end_date
        ) RETURNING id INTO existing_price;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Prix créé avec succès',
            'price_id', existing_price.id,
            'calculated_coins', calculated_coins,
            'formatted_price', calculated_coins || 'π = ' || p_amount || ' ' || p_currency,
            'action', 'created'
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_pricing_period" "text", "p_amount" numeric, "p_currency" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_price_type" "text", "p_currency" "text", "p_amount" numeric, "p_pricing_period" "text" DEFAULT 'regular'::"text", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    calculated_coins INTEGER;
    existing_price RECORD;
    amount_xaf DECIMAL(10, 2);
BEGIN
    calculated_coins := convert_price_to_coins(p_amount, p_currency);
    
    amount_xaf := CASE 
        WHEN p_currency = 'XAF' THEN p_amount
        WHEN p_currency = 'XOF' THEN p_amount
        WHEN p_currency = 'EUR' THEN p_amount * (SELECT exchange_rate FROM currency_rates WHERE base_currency = 'EUR' AND target_currency = 'XAF' AND is_active = true LIMIT 1)
        WHEN p_currency = 'USD' THEN p_amount * (SELECT exchange_rate FROM currency_rates WHERE base_currency = 'USD' AND target_currency = 'XAF' AND is_active = true LIMIT 1)
        ELSE p_amount
    END;
    
    SELECT * INTO existing_price
    FROM organizer_prices
    WHERE event_id = p_event_id 
    AND ticket_type_id = p_ticket_type_id
    AND price_type = p_price_type 
    AND pricing_period = p_pricing_period;
    
    IF existing_price IS NOT NULL THEN
        UPDATE organizer_prices
        SET currency = p_currency,
            amount = p_amount,
            calculated_coins = calculated_coins,
            start_date = p_start_date,
            end_date = p_end_date,
            updated_at = NOW()
        WHERE id = existing_price.id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Prix mis à jour avec succès',
            'price_id', existing_price.id,
            'action', 'updated'
        );
    ELSE
        INSERT INTO organizer_prices (
            event_id, ticket_type_id, price_type, currency, amount, 
            calculated_coins, pricing_period, start_date, end_date
        ) VALUES (
            p_event_id, p_ticket_type_id, p_price_type, p_currency, p_amount,
            calculated_coins, p_pricing_period, p_start_date, p_end_date
        ) RETURNING id INTO existing_price;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Prix créé avec succès',
            'price_id', existing_price.id,
            'action', 'created'
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_price_type" "text", "p_currency" "text", "p_amount" numeric, "p_pricing_period" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_license_end_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Fin = date de début + nombre de jours de la licence
  IF NEW.start_date IS NULL THEN
    NEW.start_date := NOW();
  END IF;
  NEW.end_date := NEW.start_date + (NEW.duration_days || ' days')::INTERVAL;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_license_end_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_verification_session"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_scanner_id" "uuid", "p_location" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    event_record RECORD;
    scanner_record RECORD;
    session_id UUID;
BEGIN
    -- Vérifier l'événement
    SELECT * INTO event_record FROM events WHERE id = p_event_id AND organizer_id = p_organizer_id;
    IF event_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Événement non trouvé ou accès non autorisé');
    END IF;
    
    -- Vérifier le scanner
    SELECT * INTO scanner_record FROM organizer_scanners WHERE id = p_scanner_id AND organizer_id = p_organizer_id;
    IF scanner_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Scanner non trouvé ou non autorisé');
    END IF;
    
    IF NOT scanner_record.is_active THEN
        RETURN jsonb_build_object('success', false, 'message', 'Scanner désactivé');
    END IF;
    
    -- Vérifier les heures de vérification
    IF event_record.verification_start_time IS NOT NULL AND NOW() < event_record.verification_start_time THEN
        RETURN jsonb_build_object('success', false, 'message', 'La vérification commence à ' || event_record.verification_start_time);
    END IF;
    
    IF event_record.verification_end_time IS NOT NULL AND NOW() > event_record.verification_end_time THEN
        RETURN jsonb_build_object('success', false, 'message', 'La vérification est terminée');
    END IF;
    
    -- Démarrer la session
    INSERT INTO verification_sessions (event_id, organizer_id, scanner_id, location, is_active)
    VALUES (p_event_id, p_organizer_id, p_scanner_id, p_location, true)
    RETURNING id INTO session_id;
    
    -- Mettre à jour le scanner
    UPDATE organizer_scanners 
    SET last_used = NOW() 
    WHERE id = p_scanner_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'session_id', session_id,
        'message', 'Session de vérification démarrée',
        'event_title', event_record.title,
        'scanner_name', scanner_record.scanner_name
    );
END;
$$;


ALTER FUNCTION "public"."start_verification_session"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_scanner_id" "uuid", "p_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_partner_verification"("p_license_id" "uuid", "p_partner_id" "uuid", "p_license_type" "text", "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_license RECORD;
BEGIN
    -- Check if the user owns the license
    SELECT * INTO target_license FROM public.partners WHERE id = p_license_id AND user_id = p_partner_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Licence non trouvée ou permission non accordée.';
        RETURN;
    END IF;

    -- Update the license with the new information
    UPDATE public.partners
    SET
        documents_submitted = true,
        -- Storing documents in a jsonb column might be better in the long run
        -- but for now let's assume they are stored in fields if they exist.
        -- If the table schema has changed to store these URLs, update them here.
        status = 'pending' -- for super_admin review
    WHERE id = p_license_id;

    -- Here we should probably store the submitted data somewhere, maybe in the partners table if it has the columns.
    -- Assuming `partners` table has columns for this data.
     UPDATE public.partners
        SET
            company_name = p_company_name,
            legal_reference = p_legal_reference,
            contact_phone = p_contact_phone,
            contact_email = p_contact_email,
            address = p_address,
            rib_document_url = p_rib_document_url,
            fiscal_document_url = p_fiscal_document_url,
            commerce_register_url = p_commerce_register_url,
            location_proof_url = p_location_proof_url,
            opening_authorization_url = p_opening_authorization_url,
            legal_agreement_url = p_legal_agreement_url,
            additional_documents_url = p_additional_documents_url,
            documents_submitted = true,
            status = 'pending'
        WHERE id = p_license_id;

    -- Create a notification for all super_admins
    INSERT INTO public.notifications (user_id, title, message, type, data)
    SELECT id, 'Vérification Partenaire', 'Le partenaire ' || p_company_name || ' a soumis ses documents.', 'admin_notification', jsonb_build_object('partner_id', p_partner_id)
    FROM public.profiles
    WHERE user_type = 'super_admin';


    RETURN QUERY SELECT true, 'Vos informations ont été soumises pour vérification.';

EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT false, 'Une erreur est survenue: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."submit_partner_verification"("p_license_id" "uuid", "p_partner_id" "uuid", "p_license_type" "text", "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_commission_wallet"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_commissions INTEGER;
    commission_count INTEGER;
BEGIN
    -- Compter le nombre de commissions à traiter
    SELECT COUNT(*) INTO commission_count FROM public.ticket_commissions;
    
    -- Calculer le total des commissions (à adapter selon votre structure)
    -- Pour l'instant, on utilise une estimation basée sur votre correction
    total_commissions := 50 * commission_count; -- Adaptation basée sur votre correction
    
    -- Mettre à jour le portefeuille
    UPDATE public.platform_wallet 
    SET 
        balance_coins = total_commissions,
        total_earned_coins = total_commissions,
        last_updated = NOW(),
        updated_at = NOW()
    WHERE wallet_type = 'commission';
    
    RETURN '✅ Synchronisation terminée : ' || total_commissions || ' pièces pour ' || commission_count || ' commissions';
END;
$$;


ALTER FUNCTION "public"."sync_commission_wallet"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_commission_wallet_exact"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_comms INTEGER;
    montant_total INTEGER;
BEGIN
    -- Compter les commissions
    SELECT COUNT(*) INTO total_comms FROM public.ticket_commissions;
    
    -- CALCUL EXACT BASÉ SUR total_amount_coins
    SELECT COALESCE(SUM(FLOOR(total_amount_coins * 0.05)), 0) INTO montant_total
    FROM public.ticket_commissions;
    
    -- Mise à jour du portefeuille
    UPDATE public.platform_wallet 
    SET 
        balance_coins = montant_total,
        total_earned_coins = montant_total,
        last_updated = NOW(),
        updated_at = NOW()
    WHERE wallet_type = 'commission';
    
    RETURN '✅ Synchro exacte : ' || montant_total || ' pièces pour ' || total_comms || ' commissions';
END;
$$;


ALTER FUNCTION "public"."sync_commission_wallet_exact"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_fcm_on_new_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  request_id bigint;
  service_role_key TEXT;
BEGIN
  -- Récupérer la clé de service role depuis les secrets Vault
  SELECT decrypted_secret INTO service_role_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' 
  LIMIT 1;

  IF service_role_key IS NULL THEN
    -- Fallback ou log d'erreur si la clé n'est pas trouvée
    RAISE WARNING 'SUPABASE_SERVICE_ROLE_KEY not found in Vault.';
    RETURN NEW;
  END IF;

  SELECT
    net.http_post(
      url:='https://wklwxffmaximjryzdwxje.supabase.co/functions/v1/send-fcm-on-new-event',
      body:=jsonb_build_object('record', row_to_json(NEW)),
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )
    )
  INTO request_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_fcm_on_new_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_send_push_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM net.http_post(
    url:='https://wklwxffmaximjryzdwxje.supabase.co/functions/v1/send-push-notifications',
    body:=jsonb_build_object('record', row_to_json(NEW)),
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    )
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_send_push_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_appointed_by_super_admin_flag"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.appointed_by IS NOT NULL THEN
        NEW.appointed_by_super_admin := is_super_admin(NEW.appointed_by);
    ELSE
        NEW.appointed_by_super_admin := FALSE;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_appointed_by_super_admin_flag"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calculated_coins"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.base_price IS NOT NULL AND NEW.base_currency IS NOT NULL THEN
        NEW.calculated_price_pi := convert_price_to_coins(NEW.base_price, NEW.base_currency);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_calculated_coins"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organizer_balance"("p_organizer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_interaction BIGINT := 0;
    total_ticket BIGINT := 0;
    total_raffle BIGINT := 0;
    total_vote BIGINT := 0;
    total_stand BIGINT := 0;
    total_coins BIGINT := 0;
    total_fcfa DECIMAL(12,2) := 0;
    organizer_exists BOOLEAN;
BEGIN
    -- Vérifier si l'organisateur existe
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_organizer_id) INTO organizer_exists;
    
    IF NOT organizer_exists THEN
        RAISE EXCEPTION 'Organisateur non trouvé';
    END IF;

    -- 🎯 CALCUL DES GAINS : Tous les manual_credit completed
    SELECT COALESCE(SUM(amount_pi), 0) INTO total_coins
    FROM public.transactions 
    WHERE user_id = p_organizer_id 
      AND transaction_type = 'manual_credit' 
      AND status = 'completed';
    
    -- 🎯 CALCUL DES PERTES : Tous les credit_reversal completed (montants négatifs)
    SELECT COALESCE(SUM(amount_pi), 0) INTO total_coins
    FROM public.transactions 
    WHERE user_id = p_organizer_id 
      AND status = 'completed';
    
    -- Maintenant, répartir dans les bonnes catégories selon la description
    SELECT COALESCE(SUM(amount_pi), 0) INTO total_interaction
    FROM public.transactions 
    WHERE user_id = p_organizer_id 
      AND transaction_type = 'manual_credit' 
      AND status = 'completed'
      AND (description ILIKE '%interaction%' OR description ILIKE '%social%' OR description ILIKE '%réseau%');
    
    SELECT COALESCE(SUM(amount_pi), 0) INTO total_ticket
    FROM public.transactions 
    WHERE user_id = p_organizer_id 
      AND transaction_type = 'manual_credit' 
      AND status = 'completed'
      AND (description ILIKE '%billet%' OR description ILIKE '%ticket%' OR description ILIKE '%concert%');
    
    SELECT COALESCE(SUM(amount_pi), 0) INTO total_raffle
    FROM public.transactions 
    WHERE user_id = p_organizer_id 
      AND transaction_type = 'manual_credit' 
      AND status = 'completed'
      AND (description ILIKE '%tombola%' OR description ILIKE '%raffle%' OR description ILIKE '%lot%');
    
    -- Le reste va dans interaction
    IF total_interaction = 0 THEN
        total_interaction := total_coins - total_ticket - total_raffle;
    END IF;
    
    total_fcfa := total_coins * 10; -- 1 pièce = 10 FCFA

    -- Mettre à jour ou insérer dans organizer_wallet
    INSERT INTO public.organizer_wallet (
        organizer_id,
        interaction_balance_coins,
        ticket_balance_coins,
        raffle_balance_coins,
        vote_balance_coins,
        stand_balance_coins,
        total_balance_coins,
        total_balance_fcfa,
        total_earned_coins,
        total_earned_fcfa,
        last_updated
    ) VALUES (
        p_organizer_id,
        total_interaction,
        total_ticket,
        total_raffle,
        0,  -- vote
        0,  -- stand
        total_coins,
        total_fcfa,
        total_coins,
        total_fcfa,
        NOW()
    )
    ON CONFLICT (organizer_id) 
    DO UPDATE SET
        interaction_balance_coins = EXCLUDED.interaction_balance_coins,
        ticket_balance_coins = EXCLUDED.ticket_balance_coins,
        raffle_balance_coins = EXCLUDED.raffle_balance_coins,
        vote_balance_coins = EXCLUDED.vote_balance_coins,
        stand_balance_coins = EXCLUDED.stand_balance_coins,
        total_balance_coins = EXCLUDED.total_balance_coins,
        total_balance_fcfa = EXCLUDED.total_balance_fcfa,
        total_earned_coins = EXCLUDED.total_earned_coins,
        total_earned_fcfa = EXCLUDED.total_earned_fcfa,
        last_updated = NOW();

    RAISE NOTICE '💰 Portefeuille mis à jour pour organisateur %: % pièces (% FCFA)', p_organizer_id, total_coins, total_fcfa;
    
END;
$$;


ALTER FUNCTION "public"."update_organizer_balance"("p_organizer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_push_token_usage"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE push_tokens SET last_used_at = NOW() WHERE user_id = NEW.user_id AND is_active = true;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_push_token_usage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_raffle_tickets_sold"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE raffle_events
    SET tickets_sold = (SELECT COUNT(*) FROM raffle_tickets WHERE raffle_id = NEW.raffle_id)
    WHERE id = NEW.raffle_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_raffle_tickets_sold"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ticket_verification_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Mettre à jour le statut de vérification du ticket
    IF NEW.verification_status = 'success' THEN
        UPDATE event_tickets 
        SET 
            verification_count = verification_count + 1,
            verification_status = 'verified',
            first_verified_at = COALESCE(first_verified_at, NOW()),
            last_verified_at = NOW()
        WHERE id = NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ticket_verification_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_role_securely"("p_user_id" "uuid", "p_new_role" "text", "p_caller_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    caller_profile RECORD;
    target_user_profile RECORD;
    root_admins TEXT[] := ARRAY['bonplaninfos@gmail.com', 'digihouse10@gmail.com'];
BEGIN
    -- 1. Check if caller exists
    SELECT * INTO caller_profile FROM public.profiles WHERE id = p_caller_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appelant non trouvé.';
    END IF;
    
    -- 2. Check if caller is a root admin
    IF NOT (caller_profile.email = ANY(root_admins)) THEN
        RAISE EXCEPTION 'Action non autorisée. Seuls les super administrateurs principaux peuvent modifier les rôles.';
    END IF;

    -- 3. Check if target user exists
    SELECT * INTO target_user_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Utilisateur cible non trouvé.';
    END IF;

    -- 4. Prevent a root admin from being demoted
    IF target_user_profile.email = ANY(root_admins) AND p_new_role <> 'super_admin' THEN
        RAISE EXCEPTION 'Les super administrateurs principaux ne peuvent pas être déclassés.';
    END IF;

    -- 5. Perform the update
    UPDATE public.profiles
    SET 
        user_type = p_new_role,
        appointed_by = CASE 
                          WHEN p_new_role IN ('admin', 'secretary') THEN p_caller_id
                          ELSE NULL
                       END,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- 6. Log the action
    INSERT INTO public.admin_logs(actor_id, action_type, target_id, details)
    VALUES(p_caller_id, 'role_updated', p_user_id, jsonb_build_object('new_role', p_new_role, 'old_role', target_user_profile.user_type));

END;
$$;


ALTER FUNCTION "public"."update_user_role_securely"("p_user_id" "uuid", "p_new_role" "text", "p_caller_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_ticket"("p_ticket_number" "text", "p_scanner_code" "text" DEFAULT NULL::"text", "p_verification_method" "text" DEFAULT 'qr_code'::"text", "p_location_latitude" numeric DEFAULT NULL::numeric, "p_location_longitude" numeric DEFAULT NULL::numeric, "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    ticket_record RECORD;
    scanner_record RECORD;
    session_record RECORD;
    event_record RECORD;
    verification_count INTEGER;
    max_verifications INTEGER;
    verification_id UUID;
    v_organizer_id UUID;
    v_scanner_id UUID;
    v_session_id UUID;
BEGIN
    -- This function now handles two flows:
    -- 1. Organizer is logged in (auth.uid() is available).
    -- 2. Public scanner is used via scanner_code (auth.uid() is NULL).

    -- Récupérer le ticket
    SELECT et.*, e.title as event_title, e.organizer_id, e.verification_enabled,
           e.max_verifications_per_ticket, e.verification_start_time, e.verification_end_time,
           te.event_id as main_event_id
    INTO ticket_record
    FROM event_tickets et
    JOIN ticketing_events te ON et.ticketing_event_id = te.id
    JOIN events e ON te.event_id = e.id
    WHERE et.ticket_number = p_ticket_number;
    
    IF ticket_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ticket non trouvé');
    END IF;

    -- Flow selection based on who is calling
    IF auth.uid() IS NOT NULL THEN
        -- Flow 1: Organizer is logged in
        v_organizer_id := auth.uid();
        
        -- Check if the logged-in user is the organizer
        IF v_organizer_id <> ticket_record.organizer_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Vous n''êtes pas l''organisateur de cet événement.');
        END IF;

        -- For logged-in organizers, we can assume a default or virtual scanner/session
        v_scanner_id := NULL; -- Or create a virtual scanner on the fly
        v_session_id := NULL; -- Or create a virtual session

    ELSIF p_scanner_code IS NOT NULL THEN
        -- Flow 2: Public scanner with scanner_code
        -- Récupérer le scanner et la session
        SELECT os.*, vs.id as session_id, vs.event_id as session_event_id
        INTO scanner_record
        FROM organizer_scanners os
        LEFT JOIN verification_sessions vs ON os.id = vs.scanner_id AND vs.is_active = true
        WHERE os.scanner_code = p_scanner_code AND os.is_active = true;
        
        IF scanner_record IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Scanner non valide ou désactivé');
        END IF;

        -- Vérifier que le scanner appartient à l'organisateur de l'événement
        IF scanner_record.organizer_id != ticket_record.organizer_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Scanner non autorisé pour cet événement');
        END IF;
        
        -- Vérifier que la session est pour le bon événement
        IF scanner_record.session_event_id != ticket_record.main_event_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Aucune session de vérification active trouvée pour ce scanner et cet événement.');
        END IF;

        v_organizer_id := scanner_record.organizer_id;
        v_scanner_id := scanner_record.id;
        v_session_id := scanner_record.session_id;

    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Accès non autorisé. Veuillez vous connecter ou utiliser un code scanner.');
    END IF;

    -- Common logic from here
    
    -- Vérifier si le ticket est actif
    IF ticket_record.status != 'active' AND ticket_record.status != 'purchased' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Ticket non valide: ' || ticket_record.status,
            'ticket_status', ticket_record.status
        );
    END IF;
    
    -- Vérifier si la vérification est activée pour l'événement
    IF NOT ticket_record.verification_enabled THEN
        RETURN jsonb_build_object('success', false, 'message', 'Vérification désactivée pour cet événement');
    END IF;
    
    -- Vérifier les heures de vérification
    IF ticket_record.verification_start_time IS NOT NULL AND NOW() < ticket_record.verification_start_time THEN
        RETURN jsonb_build_object('success', false, 'message', 'Vérification non encore commencée');
    END IF;
    
    IF ticket_record.verification_end_time IS NOT NULL AND NOW() > ticket_record.verification_end_time THEN
        RETURN jsonb_build_object('success', false, 'message', 'Vérification terminée');
    END IF;
    
    -- Vérifier les limites de vérification
    max_verifications := COALESCE(ticket_record.max_verifications_per_ticket, 1);
    verification_count := ticket_record.verification_count + 1;
    
    IF verification_count > max_verifications THEN
        -- Enregistrer comme doublon
        INSERT INTO ticket_verifications (event_id, ticket_id, organizer_id, scanner_id, verification_session_id, verification_method, verification_status, scanned_data, location_latitude, location_longitude, notes)
        VALUES (ticket_record.main_event_id, ticket_record.id, v_organizer_id, v_scanner_id, v_session_id, p_verification_method, 'duplicate', jsonb_build_object('ticket_number', p_ticket_number, 'previous_verifications', verification_count - 1, 'max_allowed', max_verifications), p_location_latitude, p_location_longitude, p_notes)
        RETURNING id INTO verification_id;
        
        -- Signaler le problème
        INSERT INTO ticket_issues (event_id, ticket_id, organizer_id, issue_type, description, status)
        VALUES (ticket_record.main_event_id, ticket_record.id, v_organizer_id, 'duplicate', 'Ticket scanné ' || verification_count || ' fois (maximum: ' || max_verifications || ')', 'reported');
        
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Ticket déjà utilisé (' || (verification_count - 1) || ' vérifications)',
            'verification_id', verification_id,
            'verification_status', 'duplicate',
            'ticket_number', p_ticket_number,
            'event_title', ticket_record.event_title,
            'current_verifications', verification_count - 1,
            'max_verifications', max_verifications
        );
    END IF;
    
    -- Vérification réussie
    INSERT INTO ticket_verifications (event_id, ticket_id, organizer_id, scanner_id, verification_session_id, verification_method, verification_status, scanned_data, location_latitude, location_longitude, notes)
    VALUES (ticket_record.main_event_id, ticket_record.id, v_organizer_id, v_scanner_id, v_session_id, p_verification_method, 'success', jsonb_build_object('ticket_number', p_ticket_number, 'verification_count', verification_count), p_location_latitude, p_location_longitude, p_notes)
    RETURNING id INTO verification_id;
    
    -- Mettre à jour le ticket
    UPDATE event_tickets 
    SET 
        verification_count = verification_count,
        verification_status = 'verified',
        first_verified_at = COALESCE(first_verified_at, NOW()),
        last_verified_at = NOW(),
        status = 'checked_in'
    WHERE id = ticket_record.id;
    
    -- Mettre à jour la session si elle existe
    IF v_session_id IS NOT NULL THEN
      UPDATE verification_sessions SET tickets_verified = tickets_verified + 1 WHERE id = v_session_id;
    END IF;
    
    -- Mettre à jour le scanner si il existe
    IF v_scanner_id IS NOT NULL THEN
      UPDATE organizer_scanners SET last_used = NOW() WHERE id = v_scanner_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Ticket vérifié avec succès',
        'verification_id', verification_id,
        'verification_status', 'success',
        'ticket_number', p_ticket_number,
        'event_title', ticket_record.event_title,
        'verification_count', verification_count,
        'verification_time', NOW(),
        'attendee_name', (SELECT full_name FROM profiles WHERE id = ticket_record.user_id)
    );
END;
$$;


ALTER FUNCTION "public"."verify_ticket"("p_ticket_number" "text", "p_scanner_code" "text", "p_verification_method" "text", "p_location_latitude" numeric, "p_location_longitude" numeric, "p_notes" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "city" "text" NOT NULL,
    "country" "text" DEFAULT 'Côte d''Ivoire'::"text" NOT NULL,
    "location" "text",
    "event_date" timestamp with time zone,
    "organizer_id" "uuid",
    "event_type" "text" DEFAULT 'protected'::"text",
    "is_active" boolean DEFAULT true,
    "status" "text" DEFAULT 'draft'::"text",
    "is_promoted" boolean DEFAULT false,
    "promoted_until" timestamp with time zone,
    "price_fcfa" integer DEFAULT 0,
    "price_pi" integer DEFAULT 0,
    "views_count" integer DEFAULT 0,
    "interactions_count" integer DEFAULT 0,
    "participants_count" integer DEFAULT 0,
    "promotion_views_count" integer DEFAULT 0,
    "cover_image" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "contact_phone" "text",
    "address" "text",
    "google_maps_link" "text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "full_address" "text",
    "google_place_id" "text",
    "location_instructions" "text",
    "geocoding_status" "text" DEFAULT 'pending'::"text",
    "geocoding_attempts" integer DEFAULT 0,
    "geocoding_last_attempt" timestamp with time zone,
    "promotion_start" timestamp with time zone,
    "promotion_end" timestamp with time zone,
    "promotion_type" "text",
    "verification_enabled" boolean DEFAULT false,
    "max_verifications_per_ticket" integer DEFAULT 1,
    "verification_start_time" timestamp with time zone,
    "verification_end_time" timestamp with time zone,
    "category_id" "uuid",
    CONSTRAINT "events_event_type_check" CHECK (("event_type" = ANY (ARRAY['simple'::"text", 'raffle'::"text", 'voting'::"text", 'ticketing'::"text", 'stand_rental'::"text", 'protected'::"text"]))),
    CONSTRAINT "events_geocoding_status_check" CHECK (("geocoding_status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'manual'::"text"]))),
    CONSTRAINT "events_promotion_type_check" CHECK (("promotion_type" = ANY (ARRAY['7days'::"text", '15days'::"text", '30days'::"text"]))),
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'archived'::"text", 'draft'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_scanners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "scanner_name" "text" NOT NULL,
    "scanner_code" "text" NOT NULL,
    "device_id" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_used" timestamp with time zone
);


ALTER TABLE "public"."organizer_scanners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "email" "text",
    "phone" "text",
    "user_type" "text" DEFAULT 'user'::"text",
    "coin_balance" integer DEFAULT 0,
    "free_coin_balance" integer DEFAULT 10,
    "total_earnings" integer DEFAULT 0,
    "available_earnings" integer DEFAULT 0,
    "mandatory_videos_completed" integer DEFAULT 0,
    "total_video_rewards_earned" integer DEFAULT 0,
    "last_video_watched_at" timestamp with time zone,
    "video_streak_count" integer DEFAULT 0,
    "last_video_streak_date" "date",
    "avatar_url" "text",
    "bio" "text",
    "city" "text",
    "country" "text" DEFAULT 'Côte d''Ivoire'::"text",
    "date_of_birth" "date",
    "is_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "affiliate_code" "text",
    "notification_radius" integer,
    "notification_settings" "jsonb",
    "deleted_at" timestamp with time zone,
    "admin_type" "text",
    "commission_wallet" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login" timestamp with time zone,
    "region" "text",
    "license_type" "text",
    "license_status" "text" DEFAULT 'inactive'::"text",
    "license_expires_at" timestamp with time zone,
    "appointed_by" "uuid",
    "appointed_by_super_admin" boolean DEFAULT false,
    CONSTRAINT "profiles_license_status_check" CHECK (("license_status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'expired'::"text"]))),
    CONSTRAINT "profiles_license_type_check" CHECK (("license_type" = ANY (ARRAY['starter'::"text", 'business'::"text", 'premium'::"text"]))),
    CONSTRAINT "profiles_user_type_check" CHECK (("user_type" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'secretary'::"text", 'organizer'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verification_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "scanner_id" "uuid" NOT NULL,
    "session_start" timestamp with time zone DEFAULT "now"(),
    "session_end" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "tickets_verified" integer DEFAULT 0,
    "location" "text"
);


ALTER TABLE "public"."verification_sessions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_verification_sessions" AS
 SELECT "vs"."id" AS "session_id",
    "vs"."event_id",
    "e"."title" AS "event_title",
    "vs"."organizer_id",
    "p"."full_name" AS "organizer_name",
    "vs"."scanner_id",
    "os"."scanner_name",
    "os"."scanner_code",
    "vs"."session_start",
    "vs"."tickets_verified",
    "vs"."location",
    EXTRACT(epoch FROM ("now"() - "vs"."session_start")) AS "session_duration_seconds"
   FROM ((("public"."verification_sessions" "vs"
     JOIN "public"."events" "e" ON (("vs"."event_id" = "e"."id")))
     JOIN "public"."profiles" "p" ON (("vs"."organizer_id" = "p"."id")))
     JOIN "public"."organizer_scanners" "os" ON (("vs"."scanner_id" = "os"."id")))
  WHERE ("vs"."is_active" = true)
  ORDER BY "vs"."session_start" DESC;


ALTER VIEW "public"."active_verification_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_activites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "mois" "date" NOT NULL,
    "nb_evenements_moderes" integer DEFAULT 0,
    "nb_evenements_corrects" integer DEFAULT 0,
    "nb_utilisateurs_inscrits" integer DEFAULT 0,
    "nb_evenements_ajoutes" integer DEFAULT 0,
    "score" numeric(3,2) DEFAULT 1.00,
    "date_calcul" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_activites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "total_commissions" integer DEFAULT 0,
    "available_balance" integer DEFAULT 0,
    "total_withdrawn" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_commissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "transaction_id" "uuid",
    "event_id" "uuid",
    "commission_type" "text" NOT NULL,
    "amount_pi" integer NOT NULL,
    "amount_fcfa" integer NOT NULL,
    "commission_rate" numeric(5,2) NOT NULL,
    "zone_city" "text",
    "zone_region" "text",
    "zone_country" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "calculated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_commissions_commission_type_check" CHECK (("commission_type" = ANY (ARRAY['pack_purchase'::"text", 'event_participation'::"text", 'promotion'::"text"]))),
    CONSTRAINT "admin_commissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'available'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."admin_commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_coverage_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "zone_type" "text" NOT NULL,
    "zone_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_coverage_zones_zone_type_check" CHECK (("zone_type" = ANY (ARRAY['city'::"text", 'region'::"text", 'country'::"text"])))
);


ALTER TABLE "public"."admin_coverage_zones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_licences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "licence_type" "text" NOT NULL,
    "zone_city" "text",
    "zone_region" "text",
    "zone_country" "text",
    "date_debut" timestamp with time zone NOT NULL,
    "date_fin" timestamp with time zone NOT NULL,
    "statut" "text" DEFAULT 'actif'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_licences_licence_type_check" CHECK (("licence_type" = ANY (ARRAY['starter'::"text", 'business'::"text", 'premium'::"text"]))),
    CONSTRAINT "admin_licences_statut_check" CHECK (("statut" = ANY (ARRAY['actif'::"text", 'inactif'::"text", 'expiré'::"text"])))
);


ALTER TABLE "public"."admin_licences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "target_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_revenue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "credited_user_id" "uuid" NOT NULL,
    "creditor_id" "uuid" NOT NULL,
    "credit_source" "text" NOT NULL,
    "amount_pi" integer NOT NULL,
    "amount_fcfa" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."admin_revenue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_salary_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "month" "date" NOT NULL,
    "revenue_fcfa" numeric NOT NULL,
    "license_rate" numeric NOT NULL,
    "personal_score" numeric NOT NULL,
    "final_salary" numeric NOT NULL,
    "is_paid" boolean DEFAULT false,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."admin_salary_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "role" "text" DEFAULT 'admin'::"text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text", 'moderator'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_withdrawal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "amount_pi" integer NOT NULL,
    "amount_fcfa" integer NOT NULL,
    "bank_name" "text",
    "account_number" "text",
    "mobile_money_number" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "processed_by" "uuid",
    CONSTRAINT "admin_withdrawal_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."admin_withdrawal_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_commissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "transaction_type" character varying(50) NOT NULL,
    "event_id" "uuid" NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_amount_coins" integer NOT NULL,
    "platform_commission" integer NOT NULL,
    "organizer_earnings" integer NOT NULL,
    "commission_rate" numeric(5,2) DEFAULT 5.0,
    "status" character varying(50) DEFAULT 'completed'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_commissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."all_commissions_view" AS
 SELECT "tc"."id",
    "tc"."transaction_id",
    "tc"."transaction_type",
    "tc"."event_id",
    "tc"."organizer_id",
    "tc"."user_id",
    "tc"."total_amount_coins",
    "tc"."platform_commission",
    "tc"."organizer_earnings",
    "tc"."commission_rate",
    "tc"."status",
    "tc"."created_at",
    "e"."title" AS "event_title",
    "p_org"."full_name" AS "organizer_name",
    "p_user"."full_name" AS "customer_name",
        CASE "tc"."transaction_type"
            WHEN 'ticket_sale'::"text" THEN 'Achat billet'::character varying
            WHEN 'stand_booking'::"text" THEN 'Réservation stand'::character varying
            WHEN 'raffle_ticket'::"text" THEN 'Ticket tirage'::character varying
            WHEN 'vote_premium'::"text" THEN 'Votes premium'::character varying
            ELSE "tc"."transaction_type"
        END AS "transaction_type_name"
   FROM ((("public"."ticket_commissions" "tc"
     JOIN "public"."events" "e" ON (("tc"."event_id" = "e"."id")))
     JOIN "public"."profiles" "p_org" ON (("tc"."organizer_id" = "p_org"."id")))
     JOIN "public"."profiles" "p_user" ON (("tc"."user_id" = "p_user"."id")));


ALTER VIEW "public"."all_commissions_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text",
    "image_url" "text",
    "video_url" "text",
    "video_required" boolean DEFAULT true,
    "target_audience" "text" DEFAULT 'all'::"text",
    "target_cities" "text"[],
    "target_countries" "text"[],
    "specific_users" "uuid"[],
    "send_immediately" boolean DEFAULT false,
    "scheduled_for" timestamp with time zone,
    "send_to_all_users" boolean DEFAULT true,
    "status" "text" DEFAULT 'draft'::"text",
    "is_active" boolean DEFAULT true,
    "total_recipients" integer DEFAULT 0,
    "delivered_count" integer DEFAULT 0,
    "opened_count" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    CONSTRAINT "announcements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'sending'::"text", 'sent'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "announcements_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['all'::"text", 'users'::"text", 'organizers'::"text", 'specific'::"text"]))),
    CONSTRAINT "announcements_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'warning'::"text", 'success'::"text", 'promotion'::"text", 'event'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_key" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "alt_text" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."app_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coin_to_fcfa_rate" integer DEFAULT 10,
    "min_withdrawal_pi" integer DEFAULT 50,
    "interaction_cost_pi" integer DEFAULT 2,
    "organizer_earn_per_interaction" integer DEFAULT 1,
    "commission_per_participation" integer DEFAULT 5,
    "free_interactions_count" integer DEFAULT 5,
    "min_event_price_pi" integer DEFAULT 10,
    "max_event_price_pi" integer DEFAULT 10000,
    "event_approval_required" boolean DEFAULT true,
    "max_events_per_organizer" integer DEFAULT 10,
    "promotion_enabled" boolean DEFAULT true,
    "max_promotions_per_event" integer DEFAULT 3,
    "promotion_cooldown_days" integer DEFAULT 7,
    "partner_licensing_enabled" boolean DEFAULT true,
    "partner_document_verification_required" boolean DEFAULT true,
    "partner_contract_required" boolean DEFAULT true,
    "app_name" "text" DEFAULT 'BonPlanInfos'::"text",
    "support_email" "text",
    "support_phone" "text",
    "default_country" "text" DEFAULT 'Côte d''Ivoire'::"text",
    "default_currency" "text" DEFAULT 'XAF'::"text",
    "maintenance_mode" boolean DEFAULT false,
    "max_login_attempts" integer DEFAULT 5,
    "session_timeout_minutes" integer DEFAULT 30,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "logo_url" "text",
    "commission_rate_starter" numeric DEFAULT 20,
    "commission_rate_business" numeric DEFAULT 30,
    "commission_rate_premium" numeric DEFAULT 40,
    "platform_fee_percentage" numeric DEFAULT 5,
    "currency_eur_rate" numeric DEFAULT 0.0015,
    "currency_usd_rate" numeric DEFAULT 0.0016,
    "screenshot_protection_enabled" boolean DEFAULT false
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidate_performances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "candidate_name" character varying(255) NOT NULL,
    "performance_score" numeric(10,2) DEFAULT 0,
    "votes_count" integer DEFAULT 0,
    "ranking_position" integer,
    "performance_data" "jsonb",
    "qualification_status" character varying(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."candidate_performances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "photo_url" "text",
    "vote_count" integer DEFAULT 0,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(255) NOT NULL,
    "description" "text",
    "icon" character varying(255),
    "color" character varying(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "color_hex" "text",
    "display_order" integer,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."event_categories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."category_filters" AS
 SELECT "ec"."id",
    "ec"."name",
    "ec"."slug",
    "ec"."icon_url",
    "ec"."color_hex",
    "ec"."display_order",
    "count"("e"."id") AS "event_count",
    "count"(
        CASE
            WHEN (("e"."event_date" > "now"()) AND ("e"."status" = 'active'::"text")) THEN 1
            ELSE NULL::integer
        END) AS "upcoming_events",
    "count"(
        CASE
            WHEN ("e"."is_promoted" = true) THEN 1
            ELSE NULL::integer
        END) AS "promoted_events"
   FROM ("public"."event_categories" "ec"
     LEFT JOIN "public"."events" "e" ON ((("ec"."id" = "e"."category_id") AND ("e"."status" = 'active'::"text"))))
  WHERE ("ec"."is_active" = true)
  GROUP BY "ec"."id", "ec"."name", "ec"."slug", "ec"."icon_url", "ec"."color_hex", "ec"."display_order"
  ORDER BY "ec"."display_order", "ec"."name";


ALTER VIEW "public"."category_filters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coin_conversion_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "currency" "text" NOT NULL,
    "coins_per_unit" numeric(10,4) NOT NULL,
    "min_purchase_amount" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "coin_conversion_rates_currency_check" CHECK (("currency" = ANY (ARRAY['XAF'::"text", 'EUR'::"text", 'USD'::"text", 'XOF'::"text"])))
);


ALTER TABLE "public"."coin_conversion_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coin_packs" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(100),
    "coin_amount" integer NOT NULL,
    "bonus_coins" integer DEFAULT 0,
    "fcfa_price" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_custom" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "badge" character varying(50),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."coin_packs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."coin_packs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."coin_packs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."coin_packs_id_seq" OWNED BY "public"."coin_packs"."id";



CREATE TABLE IF NOT EXISTS "public"."coin_spending" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "amount" integer NOT NULL,
    "spent_from_free" boolean DEFAULT false,
    "free_coins_used" integer DEFAULT 0,
    "paid_coins_used" integer DEFAULT 0,
    "purpose" "text" NOT NULL,
    "target_id" "uuid",
    "target_type" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coin_spending" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type_id" "uuid",
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "country" "text" NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "google_maps_link" "text",
    "website" "text",
    "phone_number" "text",
    "email" "text",
    "opening_hours" "jsonb",
    "price_range" "text",
    "images" "text"[],
    "features" "text"[],
    "user_id" "uuid",
    "is_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "views_count" integer DEFAULT 0,
    "rating" numeric(3,2) DEFAULT 0,
    "total_reviews" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."coin_spending_history" AS
 SELECT "cs"."id",
    "cs"."user_id",
    "cs"."created_at",
    "cs"."amount",
    "cs"."purpose",
    "cs"."description",
    "cs"."free_coins_used",
    "cs"."paid_coins_used",
    "cs"."target_id",
    "cs"."target_type",
    "e"."title" AS "event_title",
    "l"."name" AS "location_name"
   FROM (("public"."coin_spending" "cs"
     LEFT JOIN "public"."events" "e" ON ((("cs"."target_type" = 'event'::"text") AND ("cs"."target_id" = "e"."id"))))
     LEFT JOIN "public"."locations" "l" ON ((("cs"."target_type" = 'location'::"text") AND ("cs"."target_id" = "l"."id"))))
  ORDER BY "cs"."created_at" DESC;


ALTER VIEW "public"."coin_spending_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coin_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "pack_id" "uuid",
    "amount_paid" integer NOT NULL,
    "coins_credited" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "moneyfusion_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "coin_transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."coin_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "target_type" "text",
    "target_id" "uuid",
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "content_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text"]))),
    CONSTRAINT "content_reports_target_type_check" CHECK (("target_type" = ANY (ARRAY['event'::"text", 'comment'::"text", 'user'::"text", 'candidate'::"text"])))
);


ALTER TABLE "public"."content_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "vote_cost_coins" integer DEFAULT 1 NOT NULL,
    "category" "text",
    "organizer_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "primary_media_id" "uuid"
);


ALTER TABLE "public"."contests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversion_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "currency_from" character varying(10) NOT NULL,
    "currency_to" character varying(10) NOT NULL,
    "rate" numeric(10,4) NOT NULL,
    "is_active" boolean DEFAULT true,
    "effective_from" timestamp without time zone DEFAULT "now"(),
    "effective_until" timestamp without time zone,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversion_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currency_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_currency" "text" DEFAULT 'XAF'::"text" NOT NULL,
    "target_currency" "text" NOT NULL,
    "exchange_rate" numeric(10,4) NOT NULL,
    "is_active" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    CONSTRAINT "currency_rates_target_currency_check" CHECK (("target_currency" = ANY (ARRAY['XAF'::"text", 'EUR'::"text", 'USD'::"text", 'XOF'::"text"])))
);


ALTER TABLE "public"."currency_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_type" character varying(100) NOT NULL,
    "subject" character varying(255) NOT NULL,
    "html_content" "text" NOT NULL,
    "text_content" "text",
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."encouragement_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_type" "text" DEFAULT 'video_completion'::"text",
    "message_text" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "encouragement_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['video_completion'::"text", 'reward_received'::"text", 'streak_bonus'::"text"])))
);


ALTER TABLE "public"."encouragement_messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."event_categories_with_count" AS
 SELECT "ec"."name",
    "ec"."slug",
    "ec"."icon_url",
    "count"("e"."id") AS "event_count"
   FROM ("public"."event_categories" "ec"
     LEFT JOIN "public"."events" "e" ON (("ec"."id" = "e"."category_id")))
  WHERE ("ec"."is_active" = true)
  GROUP BY "ec"."name", "ec"."slug", "ec"."icon_url"
  ORDER BY ("count"("e"."id")) DESC;


ALTER VIEW "public"."event_categories_with_count" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" "uuid",
    "comment_text" "text" NOT NULL,
    "rating" integer,
    "is_approved" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_comments_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."event_comments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."event_commission_details" AS
 SELECT "e"."id" AS "event_id",
    "e"."title" AS "event_title",
    "e"."organizer_id",
    "p"."full_name" AS "organizer_name",
    "count"("tc"."id") AS "total_transactions",
    "sum"("tc"."total_amount_coins") AS "total_sales_coins",
    "sum"("tc"."platform_commission") AS "total_platform_commission",
    "sum"("tc"."organizer_earnings") AS "total_organizer_earnings",
    "round"("avg"("tc"."commission_rate"), 2) AS "commission_rate"
   FROM (("public"."ticket_commissions" "tc"
     JOIN "public"."events" "e" ON (("tc"."event_id" = "e"."id")))
     JOIN "public"."profiles" "p" ON (("e"."organizer_id" = "p"."id")))
  GROUP BY "e"."id", "e"."title", "e"."organizer_id", "p"."full_name";


ALTER VIEW "public"."event_commission_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_geocoding_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "input_address" "text" NOT NULL,
    "formatted_address" "text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "google_place_id" "text",
    "location_type" "text",
    "viewport_ne_lat" numeric(10,8),
    "viewport_ne_lng" numeric(11,8),
    "viewport_sw_lat" numeric(10,8),
    "viewport_sw_lng" numeric(11,8),
    "confidence_score" numeric(3,2),
    "geocoding_provider" "text" DEFAULT 'google'::"text",
    "raw_response" "jsonb",
    "status" "text" DEFAULT 'success'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_geocoding_results_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'partial'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."event_geocoding_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "notification_type" "text" DEFAULT 'new_event'::"text",
    "send_to_all_users" boolean DEFAULT true,
    "send_to_followers" boolean DEFAULT false,
    "send_to_city" boolean DEFAULT true,
    "total_sent" integer DEFAULT 0,
    "total_delivered" integer DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    CONSTRAINT "event_notifications_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['new_event'::"text", 'event_updated'::"text", 'event_cancelled'::"text", 'event_reminder'::"text", 'event_promoted'::"text"]))),
    CONSTRAINT "event_notifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."event_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_participations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" "uuid",
    "ticket_purchase_id" "uuid",
    "participation_type" character varying(50) DEFAULT 'attendee'::character varying,
    "status" character varying(50) DEFAULT 'registered'::character varying,
    "registration_date" timestamp without time zone DEFAULT "now"(),
    "attended_at" timestamp without time zone,
    "check_in_time" timestamp without time zone,
    "check_out_time" timestamp without time zone,
    "notes" "text",
    "rating" integer,
    "review_text" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_participations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_promotions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "organizer_id" "uuid",
    "promotion_pack_id" "uuid",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "cost_pi" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "used_free_coins" integer DEFAULT 0,
    "used_paid_coins" integer DEFAULT 0,
    "views_before" integer DEFAULT 0,
    "views_after" integer DEFAULT 0,
    "interactions_before" integer DEFAULT 0,
    "interactions_after" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "activated_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "event_promotions_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text"]))),
    CONSTRAINT "event_promotions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."event_promotions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_protections" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" character varying(100) NOT NULL,
    "is_unlocked" boolean DEFAULT false,
    "unlocked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."event_protections" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_protections" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."event_protections_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."event_protections_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."event_protections_id_seq" OWNED BY "public"."event_protections"."id";



CREATE TABLE IF NOT EXISTS "public"."event_raffles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "raffle_name" character varying(255) NOT NULL,
    "description" "text",
    "ticket_price_fcfa" numeric(10,2),
    "ticket_price_coins" integer,
    "total_tickets" integer NOT NULL,
    "tickets_sold" integer DEFAULT 0,
    "prizes" "jsonb" NOT NULL,
    "draw_date" timestamp without time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "winner_user_id" "uuid",
    "winner_announced" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_raffles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" "uuid",
    "reaction_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_reactions_reaction_type_check" CHECK (("reaction_type" = ANY (ARRAY['like'::"text", 'love'::"text", 'wow'::"text", 'funny'::"text"])))
);


ALTER TABLE "public"."event_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_revenues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "ticket_revenue_fcfa" numeric(15,2) DEFAULT 0,
    "vote_revenue_fcfa" numeric(15,2) DEFAULT 0,
    "interaction_revenue_fcfa" numeric(15,2) DEFAULT 0,
    "stand_revenue_fcfa" numeric(15,2) DEFAULT 0,
    "raffle_revenue_fcfa" numeric(15,2) DEFAULT 0,
    "total_revenue_fcfa" numeric(15,2) DEFAULT 0,
    "platform_fee_fcfa" numeric(15,2) DEFAULT 0,
    "organizer_gain_fcfa" numeric(15,2) DEFAULT 0,
    "organizer_gain_coins" integer DEFAULT 0,
    "organizer_gain_usd" numeric(15,2) DEFAULT 0,
    "organizer_gain_eur" numeric(15,2) DEFAULT 0,
    "calculation_date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_revenues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "vote_price_fcfa" integer DEFAULT 0,
    "vote_price_pi" integer DEFAULT 2,
    "max_votes_per_user" integer DEFAULT 1,
    "show_live_results" boolean DEFAULT true,
    "total_tickets" integer,
    "tickets_sold" integer DEFAULT 0,
    "ticket_price_fcfa" integer DEFAULT 0,
    "ticket_price_pi" integer DEFAULT 0,
    "total_stands" integer,
    "stands_rented" integer DEFAULT 0,
    "stand_price_fcfa" integer DEFAULT 0,
    "stand_price_pi" integer DEFAULT 0,
    "raffle_price_fcfa" integer DEFAULT 0,
    "raffle_price_pi" integer DEFAULT 0,
    "total_participants" integer,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "max_tickets_per_user" integer,
    "draw_date" timestamp with time zone,
    "automatic_draw" boolean DEFAULT true,
    "notify_winners" boolean DEFAULT true,
    "winners_drawn" boolean DEFAULT false,
    "voting_enabled" boolean DEFAULT false,
    "raffle_enabled" boolean DEFAULT false,
    "ticketing_enabled" boolean DEFAULT false,
    "stands_enabled" boolean DEFAULT false
);


ALTER TABLE "public"."event_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_stands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "stand_name" character varying(255) NOT NULL,
    "stand_type" character varying(100) NOT NULL,
    "location_description" "text",
    "price_fcfa" numeric(10,2) NOT NULL,
    "price_coins" integer,
    "size_sqm" numeric(5,2),
    "is_available" boolean DEFAULT true,
    "is_booked" boolean DEFAULT false,
    "booked_by" "uuid",
    "booking_start" timestamp without time zone,
    "booking_end" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_stands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "ticketing_event_id" "uuid",
    "event_id" "uuid",
    "user_id" "uuid",
    "ticket_type_id" "uuid",
    "ticket_number" "text" NOT NULL,
    "qr_code" "text",
    "seat_number" "text",
    "section" "text",
    "status" "text" DEFAULT 'active'::"text",
    "purchase_amount_pi" integer,
    "purchase_amount_fcfa" integer,
    "purchased_at" timestamp with time zone DEFAULT "now"(),
    "checked_in_at" timestamp with time zone,
    "verification_count" integer DEFAULT 0,
    "verification_status" "text" DEFAULT 'pending'::"text",
    "first_verified_at" timestamp with time zone,
    "last_verified_at" timestamp with time zone,
    CONSTRAINT "event_tickets_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'checked_in'::"text", 'cancelled'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."event_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participant_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "voter_id" "uuid" NOT NULL,
    "ticket_purchase_id" "uuid",
    "vote_value" integer DEFAULT 1,
    "vote_type" character varying(50) DEFAULT 'standard'::character varying,
    "vote_weight" numeric(5,2) DEFAULT 1.0,
    "voted_at" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."participant_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raffle_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "ticket_number" "text",
    "status" "text" DEFAULT 'active'::"text",
    "participated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "raffle_participants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'winner'::"text", 'loser'::"text"])))
);


ALTER TABLE "public"."raffle_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stand_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stand_id" "uuid",
    "user_id" "uuid",
    "company_name" "text",
    "business_activity" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "reserved_at" timestamp with time zone DEFAULT "now"(),
    "payment_reference" "text"
);


ALTER TABLE "public"."stand_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "stand_number" "text",
    "rental_amount_pi" integer DEFAULT 0,
    "rental_amount_fcfa" integer DEFAULT 0,
    "status" "text" DEFAULT 'available'::"text",
    "rented_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_available" boolean DEFAULT true,
    "type" "text",
    "price_fcfa" integer,
    "price_pi" integer,
    "reserved_by_company" "text",
    "business_activity" "text",
    CONSTRAINT "stands_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'rented'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."stands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "quantity" integer DEFAULT 1,
    "total_amount_pi" integer DEFAULT 0,
    "total_amount_fcfa" integer DEFAULT 0,
    "qr_code" "text",
    "status" "text" DEFAULT 'active'::"text",
    "purchased_at" timestamp with time zone DEFAULT "now"(),
    "used_at" timestamp with time zone,
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'used'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."events_with_categories" AS
 SELECT "e"."id",
    "e"."title",
    "e"."description",
    "e"."event_date",
    "e"."status",
    "e"."is_active",
    "e"."is_promoted",
    "e"."cover_image",
    "e"."event_type",
    "e"."city",
    "e"."country",
    "e"."location",
    "e"."views_count",
    "e"."interactions_count",
    "e"."price_pi" AS "starting_price_pi",
    "e"."promotion_end",
    "ec"."id" AS "category_id",
    "ec"."name" AS "category_name",
    "ec"."slug" AS "category_slug",
    "ec"."icon_url" AS "category_icon",
    "ec"."color_hex" AS "category_color",
    "p"."full_name" AS "organizer_name",
        CASE
            WHEN (("e"."status" = 'active'::"text") AND ("e"."event_date" > "now"())) THEN 'active'::"text"
            WHEN (("e"."status" = 'active'::"text") AND ("e"."event_date" <= "now"())) THEN 'past'::"text"
            ELSE "e"."status"
        END AS "availability_status",
    ( SELECT "count"(*) AS "count"
           FROM "public"."tickets"
          WHERE ("tickets"."event_id" = "e"."id")) AS "total_tickets_sold",
    ( SELECT "count"(*) AS "count"
           FROM "public"."raffle_participants"
          WHERE ("raffle_participants"."event_id" = "e"."id")) AS "total_raffle_participants",
    ( SELECT "count"(*) AS "count"
           FROM "public"."participant_votes"
          WHERE ("participant_votes"."event_id" = "e"."id")) AS "total_votes",
    ( SELECT "count"(*) AS "count"
           FROM "public"."stand_reservations"
          WHERE ("stand_reservations"."stand_id" IN ( SELECT "stands"."id"
                   FROM "public"."stands"
                  WHERE ("stands"."event_id" = "e"."id")))) AS "total_stand_reservations"
   FROM (("public"."events" "e"
     LEFT JOIN "public"."event_categories" "ec" ON (("e"."category_id" = "ec"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("e"."organizer_id" = "p"."id")));


ALTER VIEW "public"."events_with_categories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."events_with_location" AS
 SELECT "e"."id",
    "e"."title",
    "e"."description",
    "e"."event_type",
    "e"."event_date",
    "e"."location",
    "e"."latitude",
    "e"."longitude",
    "e"."full_address",
    "e"."google_maps_link",
    "e"."location_instructions",
    "e"."city",
    "e"."country",
    "e"."geocoding_status",
        CASE
            WHEN ("e"."google_maps_link" IS NOT NULL) THEN "e"."google_maps_link"
            WHEN (("e"."latitude" IS NOT NULL) AND ("e"."longitude" IS NOT NULL)) THEN ((('https://maps.google.com/?q='::"text" || "e"."latitude") || ','::"text") || "e"."longitude")
            ELSE NULL::"text"
        END AS "final_google_maps_link",
    "e"."is_promoted",
    "e"."promotion_end",
    "p"."full_name" AS "organizer_name"
   FROM ("public"."events" "e"
     JOIN "public"."profiles" "p" ON (("e"."organizer_id" = "p"."id")))
  WHERE ("e"."status" = ANY (ARRAY['active'::"text", 'completed'::"text"]));


ALTER VIEW "public"."events_with_location" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."home_page_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_type" "text",
    "title" "text" NOT NULL,
    "subtitle" "text",
    "description" "text",
    "image_url" "text",
    "button_text" "text",
    "button_link" "text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "home_page_data_section_type_check" CHECK (("section_type" = ANY (ARRAY['hero'::"text", 'features'::"text", 'stats'::"text", 'banner'::"text", 'announcement'::"text"])))
);


ALTER TABLE "public"."home_page_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."licence_renewal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "licence_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "request_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "notes" "text",
    CONSTRAINT "chk_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."licence_renewal_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."license_renewal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "requested_license_type" "text" NOT NULL,
    "current_license_type" "text",
    "renewal_status" "text" DEFAULT 'pending'::"text",
    "request_date" timestamp with time zone DEFAULT "now"(),
    "processed_date" timestamp with time zone,
    "processed_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "license_renewal_requests_renewal_status_check" CHECK (("renewal_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'processed'::"text"]))),
    CONSTRAINT "license_renewal_requests_requested_license_type_check" CHECK (("requested_license_type" = ANY (ARRAY['starter'::"text", 'business'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."license_renewal_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "candidate_name" character varying(255) NOT NULL,
    "current_score" numeric(10,2) DEFAULT 0,
    "current_votes" integer DEFAULT 0,
    "ranking_position" integer,
    "position_change" integer DEFAULT 0,
    "qualification_status" character varying(50),
    "last_update" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_rankings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "icon" "text",
    "description" "text",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."location_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mandatory_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "video_url" "text" NOT NULL,
    "video_duration" integer NOT NULL,
    "thumbnail_url" "text",
    "reward_coins" integer DEFAULT 10,
    "reward_message" "text" DEFAULT 'Félicitations! Vous avez gagné 10π gratuits! 🎉'::"text",
    "is_active" boolean DEFAULT true,
    "is_mandatory" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "target_audience" "text" DEFAULT 'all'::"text",
    "min_app_version" "text",
    "total_views" integer DEFAULT 0,
    "total_rewards_given" integer DEFAULT 0,
    "total_coins_distributed" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    CONSTRAINT "mandatory_videos_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['all'::"text", 'new_users'::"text", 'returning_users'::"text", 'specific'::"text"])))
);


ALTER TABLE "public"."mandatory_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "push_notifications_enabled" boolean DEFAULT true,
    "sound_enabled" boolean DEFAULT true,
    "vibration_enabled" boolean DEFAULT true,
    "announcements_enabled" boolean DEFAULT true,
    "announcement_approval_required" boolean DEFAULT true,
    "max_announcements_per_day" integer DEFAULT 3,
    "new_events_notification" boolean DEFAULT true,
    "promoted_events_notification" boolean DEFAULT true,
    "nearby_events_notification" boolean DEFAULT true,
    "user_activity_notifications" boolean DEFAULT true,
    "marketing_notifications" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'system'::"text",
    "data" "jsonb",
    "image_url" "text",
    "sound_enabled" boolean DEFAULT true,
    "vibration_enabled" boolean DEFAULT true,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "push_sent" boolean DEFAULT false,
    "push_delivered" boolean DEFAULT false,
    "push_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    "sound_effect" "text",
    "is_global" boolean DEFAULT false,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text", 'new_event'::"text", 'promotion'::"text", 'earning'::"text", 'credit'::"text", 'admin_notification'::"text", 'system'::"text", 'announcement'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."notification_stats" AS
 SELECT "date"("created_at") AS "date",
    "type",
    "count"(*) AS "total_notifications",
    "count"(
        CASE
            WHEN ("is_read" = true) THEN 1
            ELSE NULL::integer
        END) AS "read_notifications",
    "count"(
        CASE
            WHEN ("push_sent" = true) THEN 1
            ELSE NULL::integer
        END) AS "sent_notifications",
    "count"(
        CASE
            WHEN ("push_delivered" = true) THEN 1
            ELSE NULL::integer
        END) AS "delivered_notifications"
   FROM "public"."notifications"
  GROUP BY ("date"("created_at")), "type"
  ORDER BY ("date"("created_at")) DESC;


ALTER VIEW "public"."notification_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid",
    "interaction_earnings" integer DEFAULT 0,
    "event_revenues" integer DEFAULT 0,
    "subscription_earnings" integer DEFAULT 0,
    "total_earnings" integer DEFAULT 0,
    "total_withdrawn" integer DEFAULT 0,
    "available_balance" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizer_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "transaction_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_type" character varying(50) DEFAULT 'ticket_sale'::character varying,
    "earnings_coins" integer NOT NULL,
    "earnings_fcfa" numeric(10,2) NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "paid_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "description" "text",
    "platform_commission" integer DEFAULT 0
);


ALTER TABLE "public"."organizer_earnings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."organizer_earnings_summary" AS
 SELECT "oe"."organizer_id",
    "p"."full_name" AS "organizer_name",
    "count"("oe"."id") AS "total_transactions",
    "sum"("oe"."earnings_coins") AS "total_earnings_coins",
    "sum"("oe"."earnings_fcfa") AS "total_earnings_fcfa",
    "max"("oe"."created_at") AS "last_payment"
   FROM ("public"."organizer_earnings" "oe"
     JOIN "public"."profiles" "p" ON (("oe"."organizer_id" = "p"."id")))
  GROUP BY "oe"."organizer_id", "p"."full_name";


ALTER VIEW "public"."organizer_earnings_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_interaction_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid",
    "event_id" "uuid",
    "amount" integer NOT NULL,
    "interaction_type" "text" NOT NULL,
    "status" "text" DEFAULT 'available'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organizer_interaction_earnings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'available'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."organizer_interaction_earnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "price_type" "text" NOT NULL,
    "currency" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "calculated_coins" integer,
    "pricing_period" "text" DEFAULT 'regular'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "ticket_type_id" "uuid",
    CONSTRAINT "organizer_prices_currency_check" CHECK (("currency" = ANY (ARRAY['XAF'::"text", 'EUR'::"text", 'USD'::"text", 'XOF'::"text"]))),
    CONSTRAINT "organizer_prices_price_type_check" CHECK (("price_type" = ANY (ARRAY['ticket'::"text", 'vote'::"text", 'stand'::"text", 'raffle'::"text"]))),
    CONSTRAINT "organizer_prices_pricing_period_check" CHECK (("pricing_period" = ANY (ARRAY['early_bird'::"text", 'regular'::"text", 'door_sale'::"text", 'standard'::"text", 'vip'::"text", 'last_minute'::"text", 'group'::"text", 'student'::"text"])))
);


ALTER TABLE "public"."organizer_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "amount_coins" integer NOT NULL,
    "amount_fcfa" numeric NOT NULL,
    "description" "text",
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organizer_transactions_source_type_check" CHECK (("source_type" = ANY (ARRAY['interaction'::"text", 'ticket'::"text", 'raffle'::"text", 'vote'::"text", 'stand'::"text"]))),
    CONSTRAINT "organizer_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['earning'::"text", 'withdrawal'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."organizer_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_wallet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "interaction_balance_coins" integer DEFAULT 0,
    "ticket_balance_coins" integer DEFAULT 0,
    "raffle_balance_coins" integer DEFAULT 0,
    "vote_balance_coins" integer DEFAULT 0,
    "stand_balance_coins" integer DEFAULT 0,
    "total_balance_coins" integer DEFAULT 0,
    "total_balance_fcfa" numeric DEFAULT 0,
    "total_earned_coins" integer DEFAULT 0,
    "total_withdrawn_coins" integer DEFAULT 0,
    "total_earned_fcfa" numeric DEFAULT 0,
    "total_withdrawn_fcfa" numeric DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizer_wallet" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizer_withdrawal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid",
    "amount_pi" integer NOT NULL,
    "amount_fcfa" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "superadmin_notes" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_by_admin" "uuid",
    "reviewed_by_superadmin" "uuid",
    "reviewed_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "payment_details" "jsonb",
    CONSTRAINT "organizer_withdrawal_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'under_review'::"text", 'approved'::"text", 'rejected'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."organizer_withdrawal_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paiements_admin" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "mois" "date" NOT NULL,
    "ca_zone" numeric DEFAULT 0 NOT NULL,
    "taux_commission" numeric NOT NULL,
    "score" numeric NOT NULL,
    "montant_a_payer" numeric NOT NULL,
    "statut" "text" DEFAULT 'en_attente'::"text" NOT NULL,
    "paye_le" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paiements_admin" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participation_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "reference_id" "uuid",
    "total_amount_coins" integer NOT NULL,
    "platform_fee_coins" integer NOT NULL,
    "organizer_earnings_coins" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."participation_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."participation_payments" IS 'Records all participation fees with commission breakdown.';



COMMENT ON COLUMN "public"."participation_payments"."reference_id" IS 'ID of the specific item purchased (e.g., candidate, ticket type).';



CREATE TABLE IF NOT EXISTS "public"."partner_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "partner_name" character varying(100) NOT NULL,
    "license_type" character varying(20) NOT NULL,
    "zone" character varying(100) NOT NULL,
    "badge_id" character varying(50) NOT NULL,
    "is_active" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "custom_title" character varying(100),
    "custom_description" "text",
    "banner_color" character varying(7) DEFAULT '#000000'::character varying,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_badges_license_type_check" CHECK ((("license_type")::"text" = ANY ((ARRAY['starter'::character varying, 'business'::character varying, 'premium'::character varying])::"text"[])))
);


ALTER TABLE "public"."partner_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "month" character varying(7) NOT NULL,
    "total_sales_fcfa" numeric(15,2) DEFAULT 0,
    "total_sales_coins" integer DEFAULT 0,
    "commission_rate" numeric(5,2) DEFAULT 0,
    "earnings_fcfa" numeric(15,2) DEFAULT 0,
    "earnings_coins" integer DEFAULT 0,
    "payout_status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "paid_at" timestamp with time zone,
    CONSTRAINT "partner_earnings_payout_status_check" CHECK ((("payout_status")::"text" = ANY ((ARRAY['pending'::character varying, 'paid'::character varying])::"text"[])))
);


ALTER TABLE "public"."partner_earnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_license_packs" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "licence_type" character varying(100) NOT NULL,
    "fcfa_price" integer NOT NULL,
    "duration_days" integer DEFAULT 90 NOT NULL,
    "revenue_share_percent" integer NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "badge" character varying(50),
    "features" "text"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "duration_months" integer
);


ALTER TABLE "public"."partner_license_packs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."partner_license_packs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."partner_license_packs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."partner_license_packs_id_seq" OWNED BY "public"."partner_license_packs"."id";



CREATE TABLE IF NOT EXISTS "public"."partner_licenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "coverage_type" character varying(20) NOT NULL,
    "commission_rate" numeric(5,2) NOT NULL,
    "duration_days" integer DEFAULT 30,
    "price_fcfa" numeric(15,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "partner_licenses_coverage_type_check" CHECK ((("coverage_type")::"text" = ANY ((ARRAY['city'::character varying, 'region'::character varying, 'country'::character varying])::"text"[])))
);


ALTER TABLE "public"."partner_licenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "license_id" "uuid" NOT NULL,
    "coverage_zone" "jsonb" NOT NULL,
    "activation_date" timestamp with time zone,
    "expiration_date" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "documents_submitted" boolean DEFAULT false,
    "documents_verified" boolean DEFAULT false,
    "contract_sent" boolean DEFAULT false,
    "total_earnings" numeric(15,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "partners_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('active'::character varying)::"text", ('suspended'::character varying)::"text", ('expired'::character varying)::"text", ('pending_verification'::character varying)::"text"])))
);


ALTER TABLE "public"."partners" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."pending_announcements" AS
 SELECT "a"."id",
    "a"."title",
    "a"."message",
    "a"."type",
    "a"."image_url",
    "a"."video_url",
    "a"."video_required",
    "a"."target_audience",
    "a"."target_cities",
    "a"."target_countries",
    "a"."specific_users",
    "a"."send_immediately",
    "a"."scheduled_for",
    "a"."send_to_all_users",
    "a"."status",
    "a"."is_active",
    "a"."total_recipients",
    "a"."delivered_count",
    "a"."opened_count",
    "a"."created_by",
    "a"."created_at",
    "a"."updated_at",
    "a"."sent_at",
    "p"."full_name" AS "creator_name",
    "p"."email" AS "creator_email"
   FROM ("public"."announcements" "a"
     JOIN "public"."profiles" "p" ON (("a"."created_by" = "p"."id")))
  WHERE ("a"."status" = 'pending'::"text")
  ORDER BY "a"."created_at" DESC;


ALTER VIEW "public"."pending_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_score" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "score" numeric(4,3) NOT NULL,
    "calculation_date" "date" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."personal_score" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_wallet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_type" character varying(50) NOT NULL,
    "balance_coins" integer DEFAULT 0,
    "balance_fcfa" numeric(15,2) DEFAULT 0,
    "total_earned_coins" integer DEFAULT 0,
    "total_earned_fcfa" numeric(15,2) DEFAULT 0,
    "last_updated" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_wallet" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."platform_commission_stats" AS
 SELECT "wallet_type",
    "balance_coins" AS "total_commission_coins",
    "balance_fcfa" AS "total_commission_fcfa",
    "total_earned_coins" AS "historical_commission_coins",
    "total_earned_fcfa" AS "historical_commission_fcfa",
    "last_updated"
   FROM "public"."platform_wallet"
  WHERE (("wallet_type")::"text" = 'commission'::"text");


ALTER VIEW "public"."platform_commission_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promotion_packs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "duration_days" integer NOT NULL,
    "cost_pi" integer NOT NULL,
    "description" "text",
    "features" "jsonb",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."promotion_packs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."protected_event_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "user_id" "uuid",
    "amount_paid_pi" integer NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "protected_event_access_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."protected_event_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "device_type" "text" NOT NULL,
    "token" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "app_version" "text",
    "device_info" "jsonb",
    "last_used_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "push_tokens_device_type_check" CHECK (("device_type" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raffle_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "base_currency" "text" DEFAULT 'XAF'::"text",
    "base_price" numeric(10,2) NOT NULL,
    "calculated_price_pi" integer,
    "total_tickets" integer NOT NULL,
    "tickets_sold" integer DEFAULT 0,
    "winning_ticket_number" "text",
    "winner_user_id" "uuid",
    "winner_announced_at" timestamp with time zone,
    "draw_date" timestamp with time zone NOT NULL,
    "is_drawn" boolean DEFAULT false,
    "auto_draw" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "min_tickets_sold" integer DEFAULT 0,
    CONSTRAINT "raffle_events_base_currency_check" CHECK (("base_currency" = ANY (ARRAY['XAF'::"text", 'EUR'::"text", 'USD'::"text", 'XOF'::"text"])))
);


ALTER TABLE "public"."raffle_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."raffle_events"."min_tickets_sold" IS 'The minimum number of tickets that must be sold for the draw to be valid. If not reached, participants are refunded.';



CREATE TABLE IF NOT EXISTS "public"."raffle_prizes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "rank" integer NOT NULL,
    "description" "text" NOT NULL,
    "value_fcfa" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."raffle_prizes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raffle_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raffle_event_id" "uuid",
    "user_id" "uuid",
    "ticket_number" integer NOT NULL,
    "purchase_price_pi" integer NOT NULL,
    "purchased_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."raffle_tickets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."raffle_tickets_ticket_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."raffle_tickets_ticket_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."raffle_tickets_ticket_number_seq" OWNED BY "public"."raffle_tickets"."ticket_number";



CREATE TABLE IF NOT EXISTS "public"."raffle_winners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raffle_event_id" "uuid",
    "user_id" "uuid",
    "ticket_number" "text" NOT NULL,
    "prize_description" "text",
    "prize_value_pi" integer,
    "prize_value_fcfa" integer,
    "claimed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."raffle_winners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_program" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid",
    "referred_id" "uuid",
    "bonus_coins" integer DEFAULT 5,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "referral_program_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."referral_program" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_rewards" (
    "id" integer NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referred_id" "uuid" NOT NULL,
    "referrer_reward" integer NOT NULL,
    "referred_reward" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."referral_rewards" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."referral_rewards_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."referral_rewards_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."referral_rewards_id_seq" OWNED BY "public"."referral_rewards"."id";



CREATE TABLE IF NOT EXISTS "public"."sponsors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text" NOT NULL,
    "website_url" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "category" "text" DEFAULT 'general'::"text",
    "show_in_footer" boolean DEFAULT true,
    "level" "text"
);


ALTER TABLE "public"."sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stand_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "stand_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "booking_number" character varying(100) NOT NULL,
    "total_amount_fcfa" numeric(10,2),
    "total_amount_coins" integer,
    "booking_status" character varying(50) DEFAULT 'pending'::character varying,
    "payment_status" character varying(50) DEFAULT 'pending'::character varying,
    "booked_at" timestamp without time zone DEFAULT "now"(),
    "paid_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."stand_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stand_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "base_currency" "text" DEFAULT 'XAF'::"text",
    "layout_image_url" "text",
    "terms_conditions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stand_events_base_currency_check" CHECK (("base_currency" = ANY (ARRAY['XAF'::"text", 'EUR'::"text", 'USD'::"text", 'XOF'::"text"])))
);


ALTER TABLE "public"."stand_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stand_rentals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stand_event_id" "uuid",
    "user_id" "uuid",
    "stand_type_id" "uuid",
    "stand_number" "text",
    "company_name" "text",
    "contact_person" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "business_description" "text",
    "rental_amount_pi" integer,
    "rental_amount_fcfa" numeric(12,2),
    "deposit_paid_pi" integer DEFAULT 0,
    "deposit_paid_fcfa" numeric(12,2) DEFAULT 0,
    "rental_start_date" timestamp with time zone,
    "rental_end_date" timestamp with time zone,
    "status" "text" DEFAULT 'reserved'::"text",
    "reserved_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "stand_rentals_status_check" CHECK (("status" = ANY (ARRAY['reserved'::"text", 'confirmed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."stand_rentals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stand_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stand_event_id" "uuid",
    "event_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "size" "text",
    "amenities" "jsonb",
    "base_currency" "text" DEFAULT 'XAF'::"text",
    "base_price" numeric(12,2) NOT NULL,
    "calculated_price_pi" integer,
    "quantity_available" integer NOT NULL,
    "quantity_rented" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stand_types_base_currency_check" CHECK (("base_currency" = ANY (ARRAY['XAF'::"text", 'EUR'::"text", 'USD'::"text", 'XOF'::"text"])))
);


ALTER TABLE "public"."stand_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_designs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_type_id" "uuid",
    "name" character varying(255) NOT NULL,
    "background_color" character varying(7) DEFAULT '#FFFFFF'::character varying,
    "text_color" character varying(7) DEFAULT '#000000'::character varying,
    "accent_color" character varying(7) DEFAULT '#3B82F6'::character varying,
    "border_color" character varying(7) DEFAULT '#E5E7EB'::character varying,
    "qr_color" character varying(7) DEFAULT '#000000'::character varying,
    "header_image_url" "text",
    "footer_text" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_designs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_ticket_id" "uuid",
    "recipient_email" "text" NOT NULL,
    "email_type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "content_html" "text",
    "content_text" "text",
    "attachments" "jsonb",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "delivery_status" "text"
);


ALTER TABLE "public"."ticket_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "issue_type" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'reported'::"text",
    "resolution" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."ticket_issues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" "uuid",
    "order_number" character varying(100) NOT NULL,
    "total_amount_fcfa" numeric(10,2),
    "total_amount_coins" integer,
    "ticket_count" integer NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "payment_method" character varying(50),
    "payment_status" character varying(50) DEFAULT 'pending'::character varying,
    "order_date" timestamp without time zone DEFAULT "now"(),
    "paid_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_order_id" "uuid",
    "ticket_type_id" "uuid",
    "user_id" "uuid",
    "event_id" "uuid",
    "ticket_number" character varying(100) NOT NULL,
    "qr_code_data" "text",
    "price_fcfa" numeric(10,2),
    "price_coins" integer,
    "purchase_date" timestamp without time zone DEFAULT "now"(),
    "status" character varying(50) DEFAULT 'active'::character varying,
    "used_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_purchase_id" "uuid",
    "event_id" "uuid",
    "scanner_user_id" "uuid",
    "scan_type" character varying(50) DEFAULT 'entry'::character varying,
    "scan_location" character varying(255),
    "scan_timestamp" timestamp without time zone DEFAULT "now"(),
    "scan_status" character varying(50) DEFAULT 'success'::character varying,
    "notes" "text",
    "device_info" "text",
    "gps_coordinates" character varying(100),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "name" character varying(255) NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "price_coins" integer,
    "quantity_available" integer NOT NULL,
    "tickets_sold" integer DEFAULT 0,
    "sales_start" timestamp without time zone,
    "sales_end" timestamp without time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "scanner_id" "uuid" NOT NULL,
    "verification_session_id" "uuid",
    "verification_time" timestamp with time zone DEFAULT "now"(),
    "verification_method" "text",
    "verification_status" "text",
    "scanned_data" "jsonb",
    "location_latitude" numeric,
    "location_longitude" numeric,
    "notes" "text"
);


ALTER TABLE "public"."ticket_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticketing_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "total_tickets" integer NOT NULL,
    "tickets_sold" integer DEFAULT 0,
    "max_tickets_per_user" integer DEFAULT 5,
    "early_bird_price_pi" integer,
    "early_bird_end_date" timestamp with time zone,
    "vip_tickets_available" boolean DEFAULT false,
    "vip_ticket_price_pi" integer,
    "seating_plan_available" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticketing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" "uuid",
    "transaction_type" "text",
    "amount_pi" integer NOT NULL,
    "amount_fcfa" integer NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "payment_gateway_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "city" "text",
    "region" "text",
    "country" "text",
    CONSTRAINT "transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['earning'::"text", 'spending'::"text", 'withdrawal'::"text", 'refund'::"text", 'manual_credit'::"text", 'manual_debit'::"text", 'commission'::"text", 'license_fee'::"text", 'credit_reversal'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_coin_transactions" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "transaction_id" character varying(100) NOT NULL,
    "amount_fcfa" numeric(10,2) NOT NULL,
    "coin_amount" integer,
    "bonus_coins" integer DEFAULT 0,
    "total_coins" integer,
    "pack_id" integer,
    "license_pack_id" integer,
    "transaction_type" character varying(20) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "conversion_rate" numeric(10,2) DEFAULT 10.00,
    "user_email" character varying(255),
    "moneyfusion_reference" character varying(100),
    "payment_date" timestamp with time zone,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "coin_balance" numeric,
    "free_coin_balance" numeric
);


ALTER TABLE "public"."user_coin_transactions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_coin_transactions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_coin_transactions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_coin_transactions_id_seq" OWNED BY "public"."user_coin_transactions"."id";



CREATE TABLE IF NOT EXISTS "public"."user_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "earnings_type" "text",
    "amount" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "description" "text",
    "source_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "withdrawn_at" timestamp with time zone,
    CONSTRAINT "user_earnings_earnings_type_check" CHECK (("earnings_type" = ANY (ARRAY['referral'::"text", 'contest_win'::"text", 'refund'::"text", 'bonus'::"text"]))),
    CONSTRAINT "user_earnings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'available'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."user_earnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" "uuid",
    "interaction_type" "text",
    "cost_paid" integer DEFAULT 0,
    "used_free_balance" boolean DEFAULT false,
    "organizer_earned" integer DEFAULT 0,
    "platform_commission" integer DEFAULT 0,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "comment_text" "text",
    CONSTRAINT "user_interactions_interaction_type_check" CHECK (("interaction_type" = ANY (ARRAY['view'::"text", 'download'::"text", 'share'::"text", 'like'::"text", 'love'::"text", 'comment'::"text", 'subscribe'::"text", 'save'::"text", 'report'::"text", 'rating'::"text"])))
);


ALTER TABLE "public"."user_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_partner_licenses" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "license_pack_id" integer,
    "transaction_id" character varying(100),
    "purchase_date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "expiry_date" timestamp with time zone,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "revenue_share_percent" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_partner_licenses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_partner_licenses_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_partner_licenses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_partner_licenses_id_seq" OWNED BY "public"."user_partner_licenses"."id";



CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "organizer_id" "uuid",
    "is_active" boolean DEFAULT true,
    "subscribed_at" timestamp with time zone DEFAULT "now"(),
    "unsubscribe_at" timestamp with time zone
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_video_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "video_id" "uuid",
    "watch_duration" integer NOT NULL,
    "fully_watched" boolean DEFAULT false,
    "watch_started_at" timestamp with time zone,
    "watch_completed_at" timestamp with time zone,
    "reward_received" boolean DEFAULT false,
    "coins_awarded" integer DEFAULT 0,
    "reward_message" "text",
    "device_info" "jsonb",
    "app_version" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_video_views" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."verification_dashboard" AS
 SELECT "e"."id" AS "event_id",
    "e"."title" AS "event_title",
    "e"."event_date",
    "e"."verification_enabled",
    "e"."verification_start_time",
    "e"."verification_end_time",
    "count"(DISTINCT "et"."id") AS "total_tickets",
    "count"(DISTINCT
        CASE
            WHEN ("et"."verification_status" = 'verified'::"text") THEN "et"."id"
            ELSE NULL::"uuid"
        END) AS "verified_tickets",
    "count"(DISTINCT "vs"."id") AS "active_sessions",
    "count"(DISTINCT "os"."id") AS "available_scanners",
    "count"(DISTINCT "tv"."id") AS "total_verifications",
    "count"(DISTINCT
        CASE
            WHEN ("tv"."verification_status" = 'duplicate'::"text") THEN "tv"."id"
            ELSE NULL::"uuid"
        END) AS "duplicate_verifications",
    "round"(((("count"(DISTINCT
        CASE
            WHEN ("et"."verification_status" = 'verified'::"text") THEN "et"."id"
            ELSE NULL::"uuid"
        END))::numeric * 100.0) / (NULLIF("count"(DISTINCT "et"."id"), 0))::numeric), 2) AS "verification_rate",
    "max"("tv"."verification_time") AS "last_verification"
   FROM ((((("public"."events" "e"
     LEFT JOIN "public"."ticketing_events" "te" ON (("e"."id" = "te"."event_id")))
     LEFT JOIN "public"."event_tickets" "et" ON (("te"."id" = "et"."ticketing_event_id")))
     LEFT JOIN "public"."verification_sessions" "vs" ON ((("e"."id" = "vs"."event_id") AND ("vs"."is_active" = true))))
     LEFT JOIN "public"."organizer_scanners" "os" ON ((("e"."organizer_id" = "os"."organizer_id") AND ("os"."is_active" = true))))
     LEFT JOIN "public"."ticket_verifications" "tv" ON (("e"."id" = "tv"."event_id")))
  WHERE ("e"."organizer_id" IS NOT NULL)
  GROUP BY "e"."id", "e"."title", "e"."event_date", "e"."verification_enabled", "e"."verification_start_time", "e"."verification_end_time";


ALTER VIEW "public"."verification_dashboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voting_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "session_name" character varying(255) NOT NULL,
    "session_type" character varying(100) DEFAULT 'public'::character varying,
    "voting_start" timestamp without time zone NOT NULL,
    "voting_end" timestamp without time zone NOT NULL,
    "max_votes_per_user" integer DEFAULT 1,
    "allow_multiple_votes" boolean DEFAULT false,
    "is_active" boolean DEFAULT false,
    "results_public" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."voting_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."welcome_popups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_url" "text" NOT NULL,
    "alt_text" "text",
    "is_active" boolean DEFAULT true,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."welcome_popups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."withdrawal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "request_type" "text" DEFAULT 'user_earnings'::"text",
    "amount_pi" integer NOT NULL,
    "amount_fcfa" integer NOT NULL,
    "bank_name" "text",
    "account_number" "text",
    "account_holder" "text",
    "mobile_money_number" "text",
    "mobile_money_operator" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "rejection_reason" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "processed_by" "uuid",
    "organizer_id" "uuid",
    "amount_coins" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "withdrawal_method" "text",
    "payment_details" "jsonb",
    CONSTRAINT "withdrawal_requests_mobile_money_operator_check" CHECK (("mobile_money_operator" = ANY (ARRAY['orange'::"text", 'mtn'::"text", 'wave'::"text", 'moov'::"text"]))),
    CONSTRAINT "withdrawal_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['user_earnings'::"text", 'organizer_earnings'::"text"]))),
    CONSTRAINT "withdrawal_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."withdrawal_requests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."coin_packs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."coin_packs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."event_protections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."event_protections_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."partner_license_packs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."partner_license_packs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."raffle_tickets" ALTER COLUMN "ticket_number" SET DEFAULT "nextval"('"public"."raffle_tickets_ticket_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."referral_rewards" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."referral_rewards_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_coin_transactions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_coin_transactions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_partner_licenses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_partner_licenses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_activites"
    ADD CONSTRAINT "admin_activites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_balances"
    ADD CONSTRAINT "admin_balances_admin_id_key" UNIQUE ("admin_id");



ALTER TABLE ONLY "public"."admin_balances"
    ADD CONSTRAINT "admin_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_commissions"
    ADD CONSTRAINT "admin_commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_coverage_zones"
    ADD CONSTRAINT "admin_coverage_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_licences"
    ADD CONSTRAINT "admin_licences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_logs"
    ADD CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_revenue"
    ADD CONSTRAINT "admin_revenue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_salary_history"
    ADD CONSTRAINT "admin_salary_history_admin_id_month_key" UNIQUE ("admin_id", "month");



ALTER TABLE ONLY "public"."admin_salary_history"
    ADD CONSTRAINT "admin_salary_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."admin_withdrawal_requests"
    ADD CONSTRAINT "admin_withdrawal_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_images"
    ADD CONSTRAINT "app_images_image_key_key" UNIQUE ("image_key");



ALTER TABLE ONLY "public"."app_images"
    ADD CONSTRAINT "app_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_performances"
    ADD CONSTRAINT "candidate_performances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."coin_conversion_rates"
    ADD CONSTRAINT "coin_conversion_rates_currency_unique" UNIQUE ("currency");



ALTER TABLE ONLY "public"."coin_conversion_rates"
    ADD CONSTRAINT "coin_conversion_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coin_packs"
    ADD CONSTRAINT "coin_packs_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."coin_packs"
    ADD CONSTRAINT "coin_packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coin_packs"
    ADD CONSTRAINT "coin_packs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."coin_spending"
    ADD CONSTRAINT "coin_spending_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coin_transactions"
    ADD CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contests"
    ADD CONSTRAINT "contests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversion_rates"
    ADD CONSTRAINT "conversion_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."currency_rates"
    ADD CONSTRAINT "currency_rates_base_target_unique" UNIQUE ("base_currency", "target_currency");



ALTER TABLE ONLY "public"."currency_rates"
    ADD CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encouragement_messages"
    ADD CONSTRAINT "encouragement_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_categories"
    ADD CONSTRAINT "event_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_geocoding_results"
    ADD CONSTRAINT "event_geocoding_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_notifications"
    ADD CONSTRAINT "event_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_participations"
    ADD CONSTRAINT "event_participations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_promotions"
    ADD CONSTRAINT "event_promotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_protections"
    ADD CONSTRAINT "event_protections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_protections"
    ADD CONSTRAINT "event_protections_user_id_event_type_key" UNIQUE ("user_id", "event_type");



ALTER TABLE ONLY "public"."event_raffles"
    ADD CONSTRAINT "event_raffles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_reactions"
    ADD CONSTRAINT "event_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_reactions"
    ADD CONSTRAINT "event_reactions_user_id_event_id_reaction_type_key" UNIQUE ("user_id", "event_id", "reaction_type");



ALTER TABLE ONLY "public"."event_revenues"
    ADD CONSTRAINT "event_revenues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_settings"
    ADD CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_stands"
    ADD CONSTRAINT "event_stands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_tickets"
    ADD CONSTRAINT "event_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_tickets"
    ADD CONSTRAINT "event_tickets_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."event_tickets"
    ADD CONSTRAINT "event_tickets_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."home_page_data"
    ADD CONSTRAINT "home_page_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."licence_renewal_requests"
    ADD CONSTRAINT "licence_renewal_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."license_renewal_requests"
    ADD CONSTRAINT "license_renewal_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_rankings"
    ADD CONSTRAINT "live_rankings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_types"
    ADD CONSTRAINT "location_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."location_types"
    ADD CONSTRAINT "location_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_types"
    ADD CONSTRAINT "location_types_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mandatory_videos"
    ADD CONSTRAINT "mandatory_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_balances"
    ADD CONSTRAINT "organizer_balances_organizer_id_key" UNIQUE ("organizer_id");



ALTER TABLE ONLY "public"."organizer_balances"
    ADD CONSTRAINT "organizer_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_earnings"
    ADD CONSTRAINT "organizer_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_interaction_earnings"
    ADD CONSTRAINT "organizer_interaction_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_prices"
    ADD CONSTRAINT "organizer_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_scanners"
    ADD CONSTRAINT "organizer_scanners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_scanners"
    ADD CONSTRAINT "organizer_scanners_scanner_code_key" UNIQUE ("scanner_code");



ALTER TABLE ONLY "public"."organizer_transactions"
    ADD CONSTRAINT "organizer_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_wallet"
    ADD CONSTRAINT "organizer_wallet_organizer_id_key" UNIQUE ("organizer_id");



ALTER TABLE ONLY "public"."organizer_wallet"
    ADD CONSTRAINT "organizer_wallet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizer_withdrawal_requests"
    ADD CONSTRAINT "organizer_withdrawal_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paiements_admin"
    ADD CONSTRAINT "paiements_admin_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participant_votes"
    ADD CONSTRAINT "participant_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participation_payments"
    ADD CONSTRAINT "participation_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_badges"
    ADD CONSTRAINT "partner_badges_badge_id_key" UNIQUE ("badge_id");



ALTER TABLE ONLY "public"."partner_badges"
    ADD CONSTRAINT "partner_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_earnings"
    ADD CONSTRAINT "partner_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_license_packs"
    ADD CONSTRAINT "partner_license_packs_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."partner_license_packs"
    ADD CONSTRAINT "partner_license_packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_licenses"
    ADD CONSTRAINT "partner_licenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_licenses"
    ADD CONSTRAINT "partner_licenses_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."personal_score"
    ADD CONSTRAINT "personal_score_admin_id_calculation_date_key" UNIQUE ("admin_id", "calculation_date");



ALTER TABLE ONLY "public"."personal_score"
    ADD CONSTRAINT "personal_score_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_wallet"
    ADD CONSTRAINT "platform_wallet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."promotion_packs"
    ADD CONSTRAINT "promotion_packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promotion_packs"
    ADD CONSTRAINT "promotion_packs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."promotion_packs"
    ADD CONSTRAINT "promotion_packs_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."protected_event_access"
    ADD CONSTRAINT "protected_event_access_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."protected_event_access"
    ADD CONSTRAINT "protected_event_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."raffle_events"
    ADD CONSTRAINT "raffle_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raffle_participants"
    ADD CONSTRAINT "raffle_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raffle_participants"
    ADD CONSTRAINT "raffle_participants_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."raffle_prizes"
    ADD CONSTRAINT "raffle_prizes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raffle_tickets"
    ADD CONSTRAINT "raffle_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raffle_tickets"
    ADD CONSTRAINT "raffle_tickets_raffle_id_ticket_number_key" UNIQUE ("raffle_event_id", "ticket_number");



ALTER TABLE ONLY "public"."raffle_winners"
    ADD CONSTRAINT "raffle_winners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_program"
    ADD CONSTRAINT "referral_program_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_program"
    ADD CONSTRAINT "referral_program_referred_id_key" UNIQUE ("referred_id");



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stand_bookings"
    ADD CONSTRAINT "stand_bookings_booking_number_key" UNIQUE ("booking_number");



ALTER TABLE ONLY "public"."stand_bookings"
    ADD CONSTRAINT "stand_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stand_events"
    ADD CONSTRAINT "stand_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stand_rentals"
    ADD CONSTRAINT "stand_rentals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stand_reservations"
    ADD CONSTRAINT "stand_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stand_types"
    ADD CONSTRAINT "stand_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stands"
    ADD CONSTRAINT "stands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_commissions"
    ADD CONSTRAINT "ticket_commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_designs"
    ADD CONSTRAINT "ticket_designs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_emails"
    ADD CONSTRAINT "ticket_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_issues"
    ADD CONSTRAINT "ticket_issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_purchases"
    ADD CONSTRAINT "ticket_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_purchases"
    ADD CONSTRAINT "ticket_purchases_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_verifications"
    ADD CONSTRAINT "ticket_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticketing_events"
    ADD CONSTRAINT "ticketing_events_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."ticketing_events"
    ADD CONSTRAINT "ticketing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_activites"
    ADD CONSTRAINT "unique_admin_activity_month" UNIQUE ("admin_id", "mois");



ALTER TABLE ONLY "public"."paiements_admin"
    ADD CONSTRAINT "unique_admin_payment_month" UNIQUE ("admin_id", "mois");



ALTER TABLE ONLY "public"."user_coin_transactions"
    ADD CONSTRAINT "user_coin_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_coin_transactions"
    ADD CONSTRAINT "user_coin_transactions_transaction_id_key" UNIQUE ("transaction_id");



ALTER TABLE ONLY "public"."user_earnings"
    ADD CONSTRAINT "user_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_partner_licenses"
    ADD CONSTRAINT "user_partner_licenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_video_views"
    ADD CONSTRAINT "user_video_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_video_views"
    ADD CONSTRAINT "user_video_views_user_id_video_id_key" UNIQUE ("user_id", "video_id");



ALTER TABLE ONLY "public"."verification_sessions"
    ADD CONSTRAINT "verification_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voting_sessions"
    ADD CONSTRAINT "voting_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."welcome_popups"
    ADD CONSTRAINT "welcome_popups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_logs_action_type" ON "public"."admin_logs" USING "btree" ("action_type");



CREATE INDEX "idx_admin_logs_actor_id" ON "public"."admin_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_admin_logs_created_at" ON "public"."admin_logs" USING "btree" ("created_at");



CREATE INDEX "idx_announcements_created" ON "public"."announcements" USING "btree" ("created_at");



CREATE INDEX "idx_announcements_status" ON "public"."announcements" USING "btree" ("status");



CREATE INDEX "idx_badges_active" ON "public"."partner_badges" USING "btree" ("is_active", "display_order");



CREATE INDEX "idx_badges_license" ON "public"."partner_badges" USING "btree" ("license_type", "zone");



CREATE INDEX "idx_event_notifications_event" ON "public"."event_notifications" USING "btree" ("event_id");



CREATE INDEX "idx_event_promotions_dates" ON "public"."event_promotions" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_event_promotions_event" ON "public"."event_promotions" USING "btree" ("event_id");



CREATE INDEX "idx_event_promotions_organizer" ON "public"."event_promotions" USING "btree" ("organizer_id");



CREATE INDEX "idx_event_promotions_status" ON "public"."event_promotions" USING "btree" ("status");



CREATE INDEX "idx_event_protections_event_type" ON "public"."event_protections" USING "btree" ("event_type");



CREATE INDEX "idx_event_protections_user_event" ON "public"."event_protections" USING "btree" ("user_id", "event_type");



CREATE INDEX "idx_event_tickets_ticket_number" ON "public"."event_tickets" USING "btree" ("ticket_number");



CREATE INDEX "idx_event_tickets_verification_status" ON "public"."event_tickets" USING "btree" ("verification_status", "last_verified_at");



CREATE INDEX "idx_events_city" ON "public"."events" USING "btree" ("city");



CREATE INDEX "idx_events_date" ON "public"."events" USING "btree" ("event_date");



CREATE INDEX "idx_events_organizer" ON "public"."events" USING "btree" ("organizer_id");



CREATE INDEX "idx_events_promoted" ON "public"."events" USING "btree" ("is_promoted", "promoted_until");



CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_events_status_active" ON "public"."events" USING "btree" ("status", "is_active");



CREATE INDEX "idx_mandatory_videos_active" ON "public"."mandatory_videos" USING "btree" ("is_active", "is_mandatory");



CREATE INDEX "idx_mandatory_videos_order" ON "public"."mandatory_videos" USING "btree" ("display_order", "created_at");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("is_read", "created_at");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_organizer_scanners_code" ON "public"."organizer_scanners" USING "btree" ("scanner_code", "is_active");



CREATE INDEX "idx_partners_status" ON "public"."partners" USING "btree" ("status");



CREATE INDEX "idx_partners_user_id" ON "public"."partners" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_streak" ON "public"."profiles" USING "btree" ("video_streak_count", "last_video_streak_date");



CREATE INDEX "idx_push_tokens_active" ON "public"."push_tokens" USING "btree" ("is_active");



CREATE INDEX "idx_push_tokens_user" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_ticket_issues_event_status" ON "public"."ticket_issues" USING "btree" ("event_id", "status");



CREATE INDEX "idx_ticket_verifications_event_time" ON "public"."ticket_verifications" USING "btree" ("event_id", "verification_time");



CREATE INDEX "idx_ticket_verifications_scanner" ON "public"."ticket_verifications" USING "btree" ("scanner_id", "verification_time");



CREATE INDEX "idx_ticket_verifications_ticket_session" ON "public"."ticket_verifications" USING "btree" ("ticket_id", "verification_session_id");



CREATE INDEX "idx_transactions_created" ON "public"."transactions" USING "btree" ("created_at");



CREATE INDEX "idx_transactions_status" ON "public"."transactions" USING "btree" ("status");



CREATE INDEX "idx_transactions_user" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_user_coin_transactions_status" ON "public"."user_coin_transactions" USING "btree" ("status");



CREATE INDEX "idx_user_coin_transactions_user_id" ON "public"."user_coin_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_user_earnings_user" ON "public"."user_earnings" USING "btree" ("user_id");



CREATE INDEX "idx_user_partner_licenses_status" ON "public"."user_partner_licenses" USING "btree" ("status");



CREATE INDEX "idx_user_partner_licenses_user_id" ON "public"."user_partner_licenses" USING "btree" ("user_id");



CREATE INDEX "idx_user_video_views_completed" ON "public"."user_video_views" USING "btree" ("fully_watched", "watch_completed_at");



CREATE INDEX "idx_user_video_views_user" ON "public"."user_video_views" USING "btree" ("user_id");



CREATE INDEX "idx_user_video_views_video" ON "public"."user_video_views" USING "btree" ("video_id");



CREATE INDEX "idx_verification_sessions_active" ON "public"."verification_sessions" USING "btree" ("is_active", "event_id");



CREATE OR REPLACE TRIGGER "after_insert_raffle_ticket" AFTER INSERT ON "public"."raffle_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_raffle_tickets_sold"();



CREATE OR REPLACE TRIGGER "before_insert_raffle_ticket" BEFORE INSERT ON "public"."raffle_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."assign_raffle_ticket_number"();



CREATE OR REPLACE TRIGGER "on_new_notification_send_push" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_send_push_notification"();



CREATE OR REPLACE TRIGGER "set_appointed_by_super_admin_on_profiles" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_appointed_by_super_admin_flag"();



CREATE OR REPLACE TRIGGER "trg_handle_new_event_notification" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_event_notification"();



CREATE OR REPLACE TRIGGER "trigger_auto_commission" AFTER INSERT ON "public"."ticket_commissions" FOR EACH ROW EXECUTE FUNCTION "public"."auto_update_commission_wallet"();



CREATE OR REPLACE TRIGGER "trigger_auto_geocode_event" BEFORE INSERT OR UPDATE OF "address", "city", "country", "google_maps_link" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."auto_geocode_event_address"();



CREATE OR REPLACE TRIGGER "trigger_notification_sent" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_push_token_usage"();



CREATE OR REPLACE TRIGGER "trigger_ticket_verification_update" AFTER INSERT ON "public"."ticket_verifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_verification_status"();



CREATE OR REPLACE TRIGGER "trigger_update_raffle_coins" BEFORE INSERT OR UPDATE OF "base_price", "base_currency" ON "public"."raffle_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_calculated_coins"();



CREATE OR REPLACE TRIGGER "trigger_update_stand_type_coins" BEFORE INSERT OR UPDATE OF "base_price", "base_currency" ON "public"."stand_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_calculated_coins"();



CREATE OR REPLACE TRIGGER "update_event_protections_updated_at" BEFORE UPDATE ON "public"."event_protections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_balances"
    ADD CONSTRAINT "admin_balances_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_commissions"
    ADD CONSTRAINT "admin_commissions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_commissions"
    ADD CONSTRAINT "admin_commissions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."admin_commissions"
    ADD CONSTRAINT "admin_commissions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."admin_coverage_zones"
    ADD CONSTRAINT "admin_coverage_zones_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_licences"
    ADD CONSTRAINT "admin_licences_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_logs"
    ADD CONSTRAINT "admin_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_logs"
    ADD CONSTRAINT "admin_logs_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_revenue"
    ADD CONSTRAINT "admin_revenue_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_revenue"
    ADD CONSTRAINT "admin_revenue_credited_user_id_fkey" FOREIGN KEY ("credited_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_revenue"
    ADD CONSTRAINT "admin_revenue_creditor_id_fkey" FOREIGN KEY ("creditor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_salary_history"
    ADD CONSTRAINT "admin_salary_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_withdrawal_requests"
    ADD CONSTRAINT "admin_withdrawal_requests_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_withdrawal_requests"
    ADD CONSTRAINT "admin_withdrawal_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."app_images"
    ADD CONSTRAINT "app_images_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."candidate_performances"
    ADD CONSTRAINT "candidate_performances_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."candidate_performances"
    ADD CONSTRAINT "candidate_performances_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coin_spending"
    ADD CONSTRAINT "coin_spending_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."coin_transactions"
    ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contests"
    ADD CONSTRAINT "contests_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contests"
    ADD CONSTRAINT "contests_primary_media_id_fkey" FOREIGN KEY ("primary_media_id") REFERENCES "storage"."objects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."currency_rates"
    ADD CONSTRAINT "currency_rates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."event_comments"
    ADD CONSTRAINT "event_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_geocoding_results"
    ADD CONSTRAINT "event_geocoding_results_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_notifications"
    ADD CONSTRAINT "event_notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_participations"
    ADD CONSTRAINT "event_participations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."event_participations"
    ADD CONSTRAINT "event_participations_ticket_purchase_id_fkey" FOREIGN KEY ("ticket_purchase_id") REFERENCES "public"."ticket_purchases"("id");



ALTER TABLE ONLY "public"."event_participations"
    ADD CONSTRAINT "event_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_promotions"
    ADD CONSTRAINT "event_promotions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_promotions"
    ADD CONSTRAINT "event_promotions_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_promotions"
    ADD CONSTRAINT "event_promotions_promotion_pack_id_fkey" FOREIGN KEY ("promotion_pack_id") REFERENCES "public"."promotion_packs"("id");



ALTER TABLE ONLY "public"."event_raffles"
    ADD CONSTRAINT "event_raffles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."event_raffles"
    ADD CONSTRAINT "event_raffles_winner_user_id_fkey" FOREIGN KEY ("winner_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_reactions"
    ADD CONSTRAINT "event_reactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."event_reactions"
    ADD CONSTRAINT "event_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_revenues"
    ADD CONSTRAINT "event_revenues_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."event_revenues"
    ADD CONSTRAINT "event_revenues_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_settings"
    ADD CONSTRAINT "event_settings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_stands"
    ADD CONSTRAINT "event_stands_booked_by_fkey" FOREIGN KEY ("booked_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."event_stands"
    ADD CONSTRAINT "event_stands_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."event_tickets"
    ADD CONSTRAINT "event_tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_tickets"
    ADD CONSTRAINT "event_tickets_ticketing_event_id_fkey" FOREIGN KEY ("ticketing_event_id") REFERENCES "public"."ticketing_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_tickets"
    ADD CONSTRAINT "event_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."paiements_admin"
    ADD CONSTRAINT "fk_admin_license" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_licences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_activites"
    ADD CONSTRAINT "fk_admin_license_activites" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_licences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."licence_renewal_requests"
    ADD CONSTRAINT "licence_renewal_requests_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."licence_renewal_requests"
    ADD CONSTRAINT "licence_renewal_requests_licence_id_fkey" FOREIGN KEY ("licence_id") REFERENCES "public"."admin_licences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."licence_renewal_requests"
    ADD CONSTRAINT "licence_renewal_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."license_renewal_requests"
    ADD CONSTRAINT "license_renewal_requests_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."license_renewal_requests"
    ADD CONSTRAINT "license_renewal_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."live_rankings"
    ADD CONSTRAINT "live_rankings_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."live_rankings"
    ADD CONSTRAINT "live_rankings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."location_types"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizer_balances"
    ADD CONSTRAINT "organizer_balances_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizer_interaction_earnings"
    ADD CONSTRAINT "organizer_interaction_earnings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."organizer_interaction_earnings"
    ADD CONSTRAINT "organizer_interaction_earnings_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizer_prices"
    ADD CONSTRAINT "organizer_prices_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizer_scanners"
    ADD CONSTRAINT "organizer_scanners_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizer_transactions"
    ADD CONSTRAINT "organizer_transactions_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizer_wallet"
    ADD CONSTRAINT "organizer_wallet_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizer_withdrawal_requests"
    ADD CONSTRAINT "organizer_withdrawal_requests_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizer_withdrawal_requests"
    ADD CONSTRAINT "organizer_withdrawal_requests_reviewed_by_admin_fkey" FOREIGN KEY ("reviewed_by_admin") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organizer_withdrawal_requests"
    ADD CONSTRAINT "organizer_withdrawal_requests_reviewed_by_superadmin_fkey" FOREIGN KEY ("reviewed_by_superadmin") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."participant_votes"
    ADD CONSTRAINT "participant_votes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."participant_votes"
    ADD CONSTRAINT "participant_votes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."participant_votes"
    ADD CONSTRAINT "participant_votes_ticket_purchase_id_fkey" FOREIGN KEY ("ticket_purchase_id") REFERENCES "public"."ticket_purchases"("id");



ALTER TABLE ONLY "public"."participant_votes"
    ADD CONSTRAINT "participant_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."participation_payments"
    ADD CONSTRAINT "participation_payments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."participation_payments"
    ADD CONSTRAINT "participation_payments_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."participation_payments"
    ADD CONSTRAINT "participation_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."partner_badges"
    ADD CONSTRAINT "partner_badges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."partner_badges"
    ADD CONSTRAINT "partner_badges_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_earnings"
    ADD CONSTRAINT "partner_earnings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "public"."partner_licenses"("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."personal_score"
    ADD CONSTRAINT "personal_score_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_appointed_by_fkey" FOREIGN KEY ("appointed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."protected_event_access"
    ADD CONSTRAINT "protected_event_access_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."protected_event_access"
    ADD CONSTRAINT "protected_event_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_events"
    ADD CONSTRAINT "raffle_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_events"
    ADD CONSTRAINT "raffle_events_winner_user_id_fkey" FOREIGN KEY ("winner_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."raffle_participants"
    ADD CONSTRAINT "raffle_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_participants"
    ADD CONSTRAINT "raffle_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."raffle_prizes"
    ADD CONSTRAINT "raffle_prizes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_tickets"
    ADD CONSTRAINT "raffle_tickets_raffle_id_fkey" FOREIGN KEY ("raffle_event_id") REFERENCES "public"."raffle_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_tickets"
    ADD CONSTRAINT "raffle_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."raffle_winners"
    ADD CONSTRAINT "raffle_winners_raffle_event_id_fkey" FOREIGN KEY ("raffle_event_id") REFERENCES "public"."raffle_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_winners"
    ADD CONSTRAINT "raffle_winners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referral_program"
    ADD CONSTRAINT "referral_program_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referral_program"
    ADD CONSTRAINT "referral_program_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_rewards"
    ADD CONSTRAINT "referral_rewards_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stand_bookings"
    ADD CONSTRAINT "stand_bookings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."stand_bookings"
    ADD CONSTRAINT "stand_bookings_stand_id_fkey" FOREIGN KEY ("stand_id") REFERENCES "public"."event_stands"("id");



ALTER TABLE ONLY "public"."stand_bookings"
    ADD CONSTRAINT "stand_bookings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stand_events"
    ADD CONSTRAINT "stand_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stand_rentals"
    ADD CONSTRAINT "stand_rentals_stand_event_id_fkey" FOREIGN KEY ("stand_event_id") REFERENCES "public"."stand_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stand_rentals"
    ADD CONSTRAINT "stand_rentals_stand_type_id_fkey" FOREIGN KEY ("stand_type_id") REFERENCES "public"."stand_types"("id");



ALTER TABLE ONLY "public"."stand_rentals"
    ADD CONSTRAINT "stand_rentals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stand_reservations"
    ADD CONSTRAINT "stand_reservations_stand_id_fkey" FOREIGN KEY ("stand_id") REFERENCES "public"."stands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stand_reservations"
    ADD CONSTRAINT "stand_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stand_types"
    ADD CONSTRAINT "stand_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stand_types"
    ADD CONSTRAINT "stand_types_stand_event_id_fkey" FOREIGN KEY ("stand_event_id") REFERENCES "public"."stand_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_designs"
    ADD CONSTRAINT "ticket_designs_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id");



ALTER TABLE ONLY "public"."ticket_emails"
    ADD CONSTRAINT "ticket_emails_event_ticket_id_fkey" FOREIGN KEY ("event_ticket_id") REFERENCES "public"."event_tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_issues"
    ADD CONSTRAINT "ticket_issues_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_issues"
    ADD CONSTRAINT "ticket_issues_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_issues"
    ADD CONSTRAINT "ticket_issues_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."event_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."ticket_orders"
    ADD CONSTRAINT "ticket_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_purchases"
    ADD CONSTRAINT "ticket_purchases_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."ticket_purchases"
    ADD CONSTRAINT "ticket_purchases_ticket_order_id_fkey" FOREIGN KEY ("ticket_order_id") REFERENCES "public"."ticket_orders"("id");



ALTER TABLE ONLY "public"."ticket_purchases"
    ADD CONSTRAINT "ticket_purchases_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id");



ALTER TABLE ONLY "public"."ticket_purchases"
    ADD CONSTRAINT "ticket_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_scanner_user_id_fkey" FOREIGN KEY ("scanner_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_scans"
    ADD CONSTRAINT "ticket_scans_ticket_purchase_id_fkey" FOREIGN KEY ("ticket_purchase_id") REFERENCES "public"."ticket_purchases"("id");



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_verifications"
    ADD CONSTRAINT "ticket_verifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_verifications"
    ADD CONSTRAINT "ticket_verifications_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_verifications"
    ADD CONSTRAINT "ticket_verifications_scanner_id_fkey" FOREIGN KEY ("scanner_id") REFERENCES "public"."organizer_scanners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_verifications"
    ADD CONSTRAINT "ticket_verifications_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."event_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_verifications"
    ADD CONSTRAINT "ticket_verifications_verification_session_id_fkey" FOREIGN KEY ("verification_session_id") REFERENCES "public"."verification_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticketing_events"
    ADD CONSTRAINT "ticketing_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_coin_transactions"
    ADD CONSTRAINT "user_coin_transactions_license_pack_id_fkey" FOREIGN KEY ("license_pack_id") REFERENCES "public"."partner_license_packs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_coin_transactions"
    ADD CONSTRAINT "user_coin_transactions_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."coin_packs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_coin_transactions"
    ADD CONSTRAINT "user_coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_earnings"
    ADD CONSTRAINT "user_earnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_partner_licenses"
    ADD CONSTRAINT "user_partner_licenses_license_pack_id_fkey" FOREIGN KEY ("license_pack_id") REFERENCES "public"."partner_license_packs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_partner_licenses"
    ADD CONSTRAINT "user_partner_licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_video_views"
    ADD CONSTRAINT "user_video_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_video_views"
    ADD CONSTRAINT "user_video_views_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."mandatory_videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verification_sessions"
    ADD CONSTRAINT "verification_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verification_sessions"
    ADD CONSTRAINT "verification_sessions_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verification_sessions"
    ADD CONSTRAINT "verification_sessions_scanner_id_fkey" FOREIGN KEY ("scanner_id") REFERENCES "public"."organizer_scanners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_sessions"
    ADD CONSTRAINT "voting_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."welcome_popups"
    ADD CONSTRAINT "welcome_popups_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."withdrawal_requests"
    ADD CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Admins and SuperAdmins can read logs" ON "public"."admin_logs" FOR SELECT USING (("public"."get_my_role"() = ANY (ARRAY['super_admin'::"text", 'admin'::"text"])));



CREATE POLICY "Admins can manage sponsors" ON "public"."sponsors" USING (("public"."get_my_role"() = ANY (ARRAY['super_admin'::"text", 'admin'::"text"])));



CREATE POLICY "Admins can manage withdrawal requests" ON "public"."withdrawal_requests" USING (("public"."get_my_role"() = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'secretary'::"text"])));



CREATE POLICY "Allow admin to create their own renewal requests" ON "public"."licence_renewal_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "admin_id"));



CREATE POLICY "Allow admin update access" ON "public"."app_images" FOR UPDATE USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "Allow admins to manage their own requests" ON "public"."admin_withdrawal_requests" USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Allow admins to read their own score" ON "public"."personal_score" FOR SELECT USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Allow admins to read their revenue" ON "public"."admin_revenue" FOR SELECT USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Allow admins to read their salary history" ON "public"."admin_salary_history" FOR SELECT USING (("auth"."uid"() = "admin_id"));



CREATE POLICY "Allow authenticated users to create events" ON "public"."events" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow organizers to manage their candidates" ON "public"."candidates" USING (("auth"."uid"() = ( SELECT "events"."organizer_id"
   FROM "public"."events"
  WHERE ("events"."id" = "candidates"."event_id")))) WITH CHECK (("auth"."uid"() = ( SELECT "events"."organizer_id"
   FROM "public"."events"
  WHERE ("events"."id" = "candidates"."event_id"))));



CREATE POLICY "Allow owner or admin to delete events" ON "public"."events" FOR DELETE USING ((("auth"."uid"() = "organizer_id") OR (( SELECT "profiles"."user_type"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['super_admin'::"text", 'admin'::"text"]))));



CREATE POLICY "Allow owner or admin to update events" ON "public"."events" FOR UPDATE USING ((("auth"."uid"() = "organizer_id") OR (( SELECT "profiles"."user_type"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['super_admin'::"text", 'admin'::"text"])))) WITH CHECK ((("auth"."uid"() = "organizer_id") OR (( SELECT "profiles"."user_type"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['super_admin'::"text", 'admin'::"text"]))));



CREATE POLICY "Allow public read access" ON "public"."app_images" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."home_page_data" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to active events" ON "public"."events" FOR SELECT USING ((("is_active" = true) AND ("status" = 'active'::"text")));



CREATE POLICY "Allow public read access to candidates" ON "public"."candidates" FOR SELECT USING (true);



CREATE POLICY "Allow super_admins to manage all renewal requests" ON "public"."licence_renewal_requests" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "Allow super_admins to manage all requests" ON "public"."admin_withdrawal_requests" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "Allow super_admins to manage salary history" ON "public"."admin_salary_history" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "Allow super_admins to manage scores" ON "public"."personal_score" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "Allow super_admins to read all revenue" ON "public"."admin_revenue" FOR SELECT USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."sponsors" FOR SELECT USING (true);



CREATE POLICY "SuperAdmins can manage admin activities" ON "public"."admin_activites" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "SuperAdmins can manage admin licenses" ON "public"."admin_licences" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "SuperAdmins can manage admin payments" ON "public"."paiements_admin" USING (("public"."get_my_role"() = 'super_admin'::"text"));



CREATE POLICY "Tout le monde peut voir les licences" ON "public"."partner_license_packs" FOR SELECT USING (true);



CREATE POLICY "Tout le monde peut voir les packs" ON "public"."coin_packs" FOR SELECT USING (true);



CREATE POLICY "Users can create their own withdrawal requests" ON "public"."withdrawal_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own event protections" ON "public"."event_protections" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own license" ON "public"."user_partner_licenses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own transactions" ON "public"."user_coin_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own profile and admins read all" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR (( SELECT "profiles_1"."user_type"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())) = ANY (ARRAY['super_admin'::"text", 'admin'::"text"]))));



CREATE POLICY "Users can read their own withdrawal requests" ON "public"."withdrawal_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own event protections" ON "public"."event_protections" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile and admins update all" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR (( SELECT "profiles_1"."user_type"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())) = ANY (ARRAY['super_admin'::"text", 'admin'::"text"]))));



CREATE POLICY "Users can view own event protections" ON "public"."event_protections" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own licenses" ON "public"."user_partner_licenses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own referral rewards" ON "public"."referral_rewards" FOR SELECT USING (("auth"."uid"() = "referrer_id"));



CREATE POLICY "Users can view their own transactions" ON "public"."user_coin_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_activites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_licences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_revenue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_salary_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_withdrawal_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coin_packs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."home_page_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."licence_renewal_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paiements_admin" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partner_license_packs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_score" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_coin_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_partner_licenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."withdrawal_requests" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."access_protected_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."access_protected_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."access_protected_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."activate_partner_license"("p_license_id" "uuid", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."activate_partner_license"("p_license_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_partner_license"("p_license_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_foreign_key_if_not_exists"("p_table_name" "text", "p_column_name" "text", "p_referenced_table" "text", "p_referenced_column" "text", "p_on_delete" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_foreign_key_if_not_exists"("p_table_name" "text", "p_column_name" "text", "p_referenced_table" "text", "p_referenced_column" "text", "p_on_delete" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_foreign_key_if_not_exists"("p_table_name" "text", "p_column_name" "text", "p_referenced_table" "text", "p_referenced_column" "text", "p_on_delete" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_commission_5_95"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_transaction_id" "uuid", "p_transaction_type" character varying, "p_user_id" "uuid", "p_total_amount_coins" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_commission_5_95"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_transaction_id" "uuid", "p_transaction_type" character varying, "p_user_id" "uuid", "p_total_amount_coins" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_commission_5_95"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_transaction_id" "uuid", "p_transaction_type" character varying, "p_user_id" "uuid", "p_total_amount_coins" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_withdrawal_secretary"("p_withdrawal_id" "uuid", "p_secretary_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_withdrawal_secretary"("p_withdrawal_id" "uuid", "p_secretary_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_withdrawal_secretary"("p_withdrawal_id" "uuid", "p_secretary_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_raffle_ticket_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_raffle_ticket_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_raffle_ticket_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_disable_expired_licenses"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_disable_expired_licenses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_disable_expired_licenses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_geocode_event_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_geocode_event_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_geocode_event_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_update_commission_wallet"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_update_commission_wallet"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_update_commission_wallet"() TO "service_role";



GRANT ALL ON FUNCTION "public"."book_stand_with_commission"("p_event_id" "uuid", "p_stand_id" "uuid", "p_vendor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."book_stand_with_commission"("p_event_id" "uuid", "p_stand_id" "uuid", "p_vendor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."book_stand_with_commission"("p_event_id" "uuid", "p_stand_id" "uuid", "p_vendor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."boost_content"("p_user_id" "uuid", "p_content_id" "uuid", "p_content_type" "text", "p_pack_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."boost_content"("p_user_id" "uuid", "p_content_id" "uuid", "p_content_type" "text", "p_pack_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."boost_content"("p_user_id" "uuid", "p_content_id" "uuid", "p_content_type" "text", "p_pack_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."buy_ticket"("p_user_id" "uuid", "p_event_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."buy_ticket"("p_user_id" "uuid", "p_event_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."buy_ticket"("p_user_id" "uuid", "p_event_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_and_record_partner_payment"("p_license_id" "uuid", "p_month_year" "text", "p_calculator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_and_record_partner_payment"("p_license_id" "uuid", "p_month_year" "text", "p_calculator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_and_record_partner_payment"("p_license_id" "uuid", "p_month_year" "text", "p_calculator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_commissions"("p_total_amount_coins" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_commissions"("p_total_amount_coins" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_commissions"("p_total_amount_coins" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculer_paiement_admin"("p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculer_paiement_admin"("p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculer_paiement_admin"("p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculer_score_admin"("p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculer_score_admin"("p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculer_score_admin"("p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_organizer_balance"("p_organizer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_organizer_balance"("p_organizer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_organizer_balance"("p_organizer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_organizer_interaction_balance"("p_organizer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_organizer_interaction_balance"("p_organizer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_organizer_interaction_balance"("p_organizer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_mandatory_video"("user_uuid" "uuid", "video_uuid" "uuid", "watch_duration" integer, "device_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_mandatory_video"("user_uuid" "uuid", "video_uuid" "uuid", "watch_duration" integer, "device_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_mandatory_video"("user_uuid" "uuid", "video_uuid" "uuid", "watch_duration" integer, "device_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_price_to_coins"("p_amount" numeric, "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_price_to_coins"("p_amount" numeric, "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_price_to_coins"("p_amount" numeric, "p_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_advertising_campaign"("p_title" "text", "p_description" "text", "p_ad_type" "text", "p_ad_content" "text", "p_link_url" "text", "p_advertiser_id" "uuid", "p_pack_type" "text", "p_total_cost_cfa" integer, "p_coins_used" integer, "p_countries" "text"[], "p_cities" "text"[], "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_advertising_campaign"("p_title" "text", "p_description" "text", "p_ad_type" "text", "p_ad_content" "text", "p_link_url" "text", "p_advertiser_id" "uuid", "p_pack_type" "text", "p_total_cost_cfa" integer, "p_coins_used" integer, "p_countries" "text"[], "p_cities" "text"[], "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_advertising_campaign"("p_title" "text", "p_description" "text", "p_ad_type" "text", "p_ad_content" "text", "p_link_url" "text", "p_advertiser_id" "uuid", "p_pack_type" "text", "p_total_cost_cfa" integer, "p_coins_used" integer, "p_countries" "text"[], "p_cities" "text"[], "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_announcement"("ann_title" "text", "ann_message" "text", "ann_video_url" "text", "creator_uuid" "uuid", "ann_type" "text", "ann_image_url" "text", "send_to_all" boolean, "immediate_send" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_announcement"("ann_title" "text", "ann_message" "text", "ann_video_url" "text", "creator_uuid" "uuid", "ann_type" "text", "ann_image_url" "text", "send_to_all" boolean, "immediate_send" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_announcement"("ann_title" "text", "ann_message" "text", "ann_video_url" "text", "creator_uuid" "uuid", "ann_type" "text", "ann_image_url" "text", "send_to_all" boolean, "immediate_send" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_bank_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_bank_name" "text", "p_account_number" "text", "p_account_holder" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_bank_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_bank_name" "text", "p_account_number" "text", "p_account_holder" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_bank_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_bank_name" "text", "p_account_number" "text", "p_account_holder" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_moov_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_moov_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_moov_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_orange_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_orange_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_orange_money_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_phone_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_organizer_scanner"("p_organizer_id" "uuid", "p_scanner_name" "text", "p_device_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_organizer_scanner"("p_organizer_id" "uuid", "p_scanner_name" "text", "p_device_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organizer_scanner"("p_organizer_id" "uuid", "p_scanner_name" "text", "p_device_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer, "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer, "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_partner_license"("p_partner_id" "uuid", "p_license_type" "text", "p_country" "text", "p_region" "text", "p_cities" "text"[], "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_created_by" "uuid", "p_duration_days" integer, "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_license_type" "text", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_license_type" "text", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_partner_license_simple"("p_partner_id" "uuid", "p_country" "text", "p_cities" "text"[], "p_license_type" "text", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_paypal_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_paypal_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_paypal_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_paypal_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_paypal_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_paypal_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_test_organizer"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_test_organizer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_test_organizer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_with_role"("p_name" "text", "p_email" "text", "p_password" "text", "p_phone" "text", "p_country" "text", "p_city" "text", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_with_role"("p_name" "text", "p_email" "text", "p_password" "text", "p_phone" "text", "p_country" "text", "p_city" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_with_role"("p_name" "text", "p_email" "text", "p_password" "text", "p_phone" "text", "p_country" "text", "p_city" "text", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_visa_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_card_number" "text", "p_card_holder" "text", "p_expiry_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_visa_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_card_number" "text", "p_card_holder" "text", "p_expiry_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_visa_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_card_number" "text", "p_card_holder" "text", "p_expiry_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_coins_amount" integer, "p_payment_method" "text", "p_account_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_coins_amount" integer, "p_payment_method" "text", "p_account_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_coins_amount" integer, "p_payment_method" "text", "p_account_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_withdrawal_method" "text", "p_payment_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_withdrawal_method" "text", "p_payment_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_withdrawal_request"("p_organizer_id" "uuid", "p_amount_coins" bigint, "p_withdrawal_method" "text", "p_payment_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."credit_user_after_payment"("p_user_id" "uuid", "p_pack_id" "uuid", "p_amount_paid" integer, "p_transaction_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."credit_user_after_payment"("p_user_id" "uuid", "p_pack_id" "uuid", "p_amount_paid" integer, "p_transaction_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."credit_user_after_payment"("p_user_id" "uuid", "p_pack_id" "uuid", "p_amount_paid" integer, "p_transaction_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."credit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_creditor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."credit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_creditor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."credit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_creditor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."debit_and_distribute_participation_fee"("p_user_id" "uuid", "p_event_id" "uuid", "p_transaction_type" "text", "p_amount_coins" integer, "p_reference_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debit_and_distribute_participation_fee"("p_user_id" "uuid", "p_event_id" "uuid", "p_transaction_type" "text", "p_amount_coins" integer, "p_reference_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debit_and_distribute_participation_fee"("p_user_id" "uuid", "p_event_id" "uuid", "p_transaction_type" "text", "p_amount_coins" integer, "p_reference_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."debit_coins_and_distribute_earnings"("p_user_id" "uuid", "p_event_id" "uuid", "p_amount_pi" integer, "p_purpose" "text", "p_target_id" "uuid", "p_target_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."debit_coins_and_distribute_earnings"("p_user_id" "uuid", "p_event_id" "uuid", "p_amount_pi" integer, "p_purpose" "text", "p_target_id" "uuid", "p_target_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debit_coins_and_distribute_earnings"("p_user_id" "uuid", "p_event_id" "uuid", "p_amount_pi" integer, "p_purpose" "text", "p_target_id" "uuid", "p_target_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."debit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_debitor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_debitor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debit_user_coins"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_debitor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_event_completely"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_event_completely"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_event_completely"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_location"("p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_location"("p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_location"("p_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_securely"("p_user_id" "uuid", "p_caller_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_securely"("p_user_id" "uuid", "p_caller_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_securely"("p_user_id" "uuid", "p_caller_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."desactiver_licences_expirees"() TO "anon";
GRANT ALL ON FUNCTION "public"."desactiver_licences_expirees"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."desactiver_licences_expirees"() TO "service_role";



GRANT ALL ON FUNCTION "public"."draw_raffle_winner"("raffle_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."draw_raffle_winner"("raffle_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."draw_raffle_winner"("raffle_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."end_verification_session"("p_session_id" "uuid", "p_organizer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."end_verification_session"("p_session_id" "uuid", "p_organizer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_verification_session"("p_session_id" "uuid", "p_organizer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generer_paiements_mensuels"() TO "anon";
GRANT ALL ON FUNCTION "public"."generer_paiements_mensuels"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generer_paiements_mensuels"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_conversion_rate"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_conversion_rate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_conversion_rate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_cities_from_credits"("p_country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_cities_from_credits"("p_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_cities_from_credits"("p_country" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_cities_from_locations"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_cities_from_locations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_cities_from_locations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_countries_from_credits"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_countries_from_credits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_countries_from_credits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_credit_stats"("start_date" "text", "end_date" "text", "p_country" "text", "p_city" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_credit_stats"("start_date" "text", "end_date" "text", "p_country" "text", "p_city" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_credit_stats"("start_date" "text", "end_date" "text", "p_country" "text", "p_city" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_credit_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "p_country" "text", "p_city" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_credit_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "p_country" "text", "p_city" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_credit_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "p_country" "text", "p_city" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_most_viewed_events"("p_limit" integer, "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_most_viewed_events"("p_limit" integer, "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_most_viewed_events"("p_limit" integer, "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_nearby_locations"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" integer, "p_type_slugs" "text"[], "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_nearby_locations"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" integer, "p_type_slugs" "text"[], "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_nearby_locations"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" integer, "p_type_slugs" "text"[], "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_popular_events_by_category"("p_limit_per_category" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_events_by_category"("p_limit_per_category" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_events_by_category"("p_limit_per_category" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_promoted_events"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_promoted_events"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_promoted_events"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recommended_events"("p_user_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommended_events"("p_user_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommended_events"("p_user_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_todays_mandatory_video"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_todays_mandatory_video"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_todays_mandatory_video"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_vapid_public_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_vapid_public_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_vapid_public_key"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_verification_stats"("p_event_id" "uuid", "p_organizer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verification_stats"("p_event_id" "uuid", "p_organizer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verification_stats"("p_event_id" "uuid", "p_organizer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_withdrawal_method_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_withdrawal_method_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_withdrawal_method_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_zone_admin"("p_country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_zone_admin"("p_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_zone_admin"("p_country" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text", "p_comment_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text", "p_comment_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_content_interaction"("p_user_id" "uuid", "p_post_id" "uuid", "p_post_type" "text", "p_interaction_type" "text", "p_comment_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_event_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_event_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_event_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_from_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_from_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_from_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_raffle_tickets_sold"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_raffle_tickets_sold"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_raffle_tickets_sold"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_ticket_type_sold"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_ticket_type_sold"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_ticket_type_sold"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_coins"("p_user_id" "uuid", "p_coin_increment" integer, "p_fcfa_increment" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_coins"("p_user_id" "uuid", "p_coin_increment" integer, "p_fcfa_increment" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_coins"("p_user_id" "uuid", "p_coin_increment" integer, "p_fcfa_increment" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_partner_payment_paid"("p_payment_id" "uuid", "p_admin_id" "uuid", "p_payment_method" "text", "p_payment_reference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_partner_payment_paid"("p_payment_id" "uuid", "p_admin_id" "uuid", "p_payment_method" "text", "p_payment_reference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_partner_payment_paid"("p_payment_id" "uuid", "p_admin_id" "uuid", "p_payment_method" "text", "p_payment_reference" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_event"("event_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_event"("event_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_event"("event_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."participate_in_raffle"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."participate_in_raffle"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."participate_in_raffle"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."participate_in_vote"("p_event_id" "uuid", "p_candidate_id" "uuid", "p_user_id" "uuid", "p_vote_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."participate_in_vote"("p_event_id" "uuid", "p_candidate_id" "uuid", "p_user_id" "uuid", "p_vote_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."participate_in_vote"("p_event_id" "uuid", "p_candidate_id" "uuid", "p_user_id" "uuid", "p_vote_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_license_renewal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_approve" boolean, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_license_renewal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_approve" boolean, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_license_renewal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_approve" boolean, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_status" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_status" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_status" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_admin_id" "uuid", "p_status" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_admin_id" "uuid", "p_status" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_organizer_withdrawal"("p_request_id" "uuid", "p_admin_id" "uuid", "p_status" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_referral"("p_referrer_code" "text", "p_referred_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_referral"("p_referrer_code" "text", "p_referred_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_referral"("p_referrer_code" "text", "p_referred_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_user_withdrawal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_user_withdrawal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_user_withdrawal"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_withdrawal_request"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_withdrawal_request"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_withdrawal_request"("p_request_id" "uuid", "p_processor_id" "uuid", "p_status" "text", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."protected_event_interaction"("p_event_id" "uuid", "p_user_id" "uuid", "p_interaction_type" "text", "p_comment_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."protected_event_interaction"("p_event_id" "uuid", "p_user_id" "uuid", "p_interaction_type" "text", "p_comment_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."protected_event_interaction"("p_event_id" "uuid", "p_user_id" "uuid", "p_interaction_type" "text", "p_comment_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_event_pack"("p_user_id" "uuid", "p_event_id" "uuid", "p_pack_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_event_pack"("p_user_id" "uuid", "p_event_id" "uuid", "p_pack_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_event_pack"("p_user_id" "uuid", "p_event_id" "uuid", "p_pack_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_raffle_tickets_with_commission"("p_raffle_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_raffle_tickets_with_commission"("p_raffle_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_raffle_tickets_with_commission"("p_raffle_id" "uuid", "p_user_id" "uuid", "p_ticket_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_ticket_with_pricing"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_ticket_with_pricing"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_ticket_with_pricing"("p_event_id" "uuid", "p_user_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_cart" "jsonb", "p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_cart" "jsonb", "p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_cart" "jsonb", "p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_event_id" "uuid", "p_cart" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_event_id" "uuid", "p_cart" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_tickets"("p_user_id" "uuid", "p_event_id" "uuid", "p_cart" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_tickets_with_commission_simple"("p_user_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_tickets_with_commission_simple"("p_user_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_tickets_with_commission_simple"("p_user_id" "uuid", "p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_withdrawal_request"("p_request_id" "uuid", "p_processed_by" "uuid", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."renew_partner_license"("p_license_id" "uuid", "p_duration_days" integer, "p_renewed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."renew_partner_license"("p_license_id" "uuid", "p_duration_days" integer, "p_renewed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."renew_partner_license"("p_license_id" "uuid", "p_duration_days" integer, "p_renewed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rent_stand"("p_event_id" "uuid", "p_user_id" "uuid", "p_stand_type_id" "uuid", "p_company_name" "text", "p_contact_person" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_business_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rent_stand"("p_event_id" "uuid", "p_user_id" "uuid", "p_stand_type_id" "uuid", "p_company_name" "text", "p_contact_person" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_business_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rent_stand"("p_event_id" "uuid", "p_user_id" "uuid", "p_stand_type_id" "uuid", "p_company_name" "text", "p_contact_person" "text", "p_contact_email" "text", "p_contact_phone" "text", "p_business_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_license_renewal"("p_admin_id" "uuid", "p_requested_license_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_license_renewal"("p_admin_id" "uuid", "p_requested_license_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_license_renewal"("p_admin_id" "uuid", "p_requested_license_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_organizer_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."request_organizer_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_organizer_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_organizer_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_method" "text", "p_payment_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."request_organizer_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_method" "text", "p_payment_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_organizer_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_method" "text", "p_payment_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_amount_pi" integer, "p_payment_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_withdrawal"("p_organizer_id" "uuid", "p_amount_coins" integer, "p_withdrawal_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_application_data"("p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_application_data"("p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_application_data"("p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_ticket_issue"("p_issue_id" "uuid", "p_organizer_id" "uuid", "p_resolution" "text", "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_ticket_issue"("p_issue_id" "uuid", "p_organizer_id" "uuid", "p_resolution" "text", "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_ticket_issue"("p_issue_id" "uuid", "p_organizer_id" "uuid", "p_resolution" "text", "p_new_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reverse_credit"("p_log_id" "uuid", "p_reverser_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reverse_credit"("p_log_id" "uuid", "p_reverser_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reverse_credit"("p_log_id" "uuid", "p_reverser_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revert_admin_role"("p_user_id" "uuid", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revert_admin_role"("p_user_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revert_admin_role"("p_user_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."scan_ticket"("p_qr_code" "text", "p_scanner_id" "uuid", "p_scan_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."scan_ticket"("p_qr_code" "text", "p_scanner_id" "uuid", "p_scan_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."scan_ticket"("p_qr_code" "text", "p_scanner_id" "uuid", "p_scan_location" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_events"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_event_types" "text"[], "p_price_min" integer, "p_price_max" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_only_promoted" boolean, "p_sort_by" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_events"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_event_types" "text"[], "p_price_min" integer, "p_price_max" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_only_promoted" boolean, "p_sort_by" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_events"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_event_types" "text"[], "p_price_min" integer, "p_price_max" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_only_promoted" boolean, "p_sort_by" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_events_advanced"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_price_min_pi" integer, "p_price_max_pi" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_events_advanced"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_price_min_pi" integer, "p_price_max_pi" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_events_advanced"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_price_min_pi" integer, "p_price_max_pi" integer, "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_events_for_card"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_events_for_card"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_events_for_card"("p_search_query" "text", "p_category_slugs" "text"[], "p_cities" "text"[], "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_locations"("p_search_query" "text", "p_type_slugs" "text"[], "p_city" "text", "p_sort_by" "text", "p_lat" numeric, "p_lng" numeric, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_locations"("p_search_query" "text", "p_type_slugs" "text"[], "p_city" "text", "p_sort_by" "text", "p_lat" numeric, "p_lng" numeric, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_locations"("p_search_query" "text", "p_type_slugs" "text"[], "p_city" "text", "p_sort_by" "text", "p_lat" numeric, "p_lng" numeric, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."send_announcement_to_users"("announcement_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."send_announcement_to_users"("announcement_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_announcement_to_users"("announcement_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_license_expiration_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_license_expiration_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_license_expiration_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_push_notification"("user_uuid" "uuid", "notif_title" "text", "notif_message" "text", "notif_type" "text", "notif_data" "jsonb", "notif_sound" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."send_push_notification"("user_uuid" "uuid", "notif_title" "text", "notif_message" "text", "notif_type" "text", "notif_data" "jsonb", "notif_sound" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_push_notification"("user_uuid" "uuid", "notif_title" "text", "notif_message" "text", "notif_type" "text", "notif_data" "jsonb", "notif_sound" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" integer, "p_purchase_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" integer, "p_purchase_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" integer, "p_purchase_period" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" numeric, "p_purchase_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" numeric, "p_purchase_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_ticket_confirmation_email"("p_user_id" "uuid", "p_user_email" "text", "p_ticket_ids" "uuid"[], "p_event_id" "uuid", "p_total_pi" integer, "p_total_fcfa" numeric, "p_purchase_period" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_ad_campaign_end_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_ad_campaign_end_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_ad_campaign_end_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_pricing_period" "text", "p_amount" numeric, "p_currency" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_pricing_period" "text", "p_amount" numeric, "p_currency" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_pricing_period" "text", "p_amount" numeric, "p_currency" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_price_type" "text", "p_currency" "text", "p_amount" numeric, "p_pricing_period" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_price_type" "text", "p_currency" "text", "p_amount" numeric, "p_pricing_period" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_event_prices"("p_event_id" "uuid", "p_ticket_type_id" "uuid", "p_price_type" "text", "p_currency" "text", "p_amount" numeric, "p_pricing_period" "text", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_license_end_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_license_end_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_license_end_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."start_verification_session"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_scanner_id" "uuid", "p_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."start_verification_session"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_scanner_id" "uuid", "p_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_verification_session"("p_event_id" "uuid", "p_organizer_id" "uuid", "p_scanner_id" "uuid", "p_location" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_partner_verification"("p_license_id" "uuid", "p_partner_id" "uuid", "p_license_type" "text", "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_partner_verification"("p_license_id" "uuid", "p_partner_id" "uuid", "p_license_type" "text", "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_partner_verification"("p_license_id" "uuid", "p_partner_id" "uuid", "p_license_type" "text", "p_monthly_fee_cfa" integer, "p_company_name" "text", "p_legal_reference" "text", "p_contact_phone" "text", "p_contact_email" "text", "p_address" "text", "p_rib_document_url" "text", "p_fiscal_document_url" "text", "p_commerce_register_url" "text", "p_location_proof_url" "text", "p_opening_authorization_url" "text", "p_legal_agreement_url" "text", "p_additional_documents_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_commission_wallet"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_commission_wallet"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_commission_wallet"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_commission_wallet_exact"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_commission_wallet_exact"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_commission_wallet_exact"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_fcm_on_new_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_fcm_on_new_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_fcm_on_new_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_send_push_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_send_push_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_send_push_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_appointed_by_super_admin_flag"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_appointed_by_super_admin_flag"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_appointed_by_super_admin_flag"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_calculated_coins"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_calculated_coins"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calculated_coins"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organizer_balance"("p_organizer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_organizer_balance"("p_organizer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organizer_balance"("p_organizer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_push_token_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_push_token_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_push_token_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_raffle_tickets_sold"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_raffle_tickets_sold"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_raffle_tickets_sold"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ticket_verification_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_verification_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_verification_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_role_securely"("p_user_id" "uuid", "p_new_role" "text", "p_caller_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_role_securely"("p_user_id" "uuid", "p_new_role" "text", "p_caller_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_role_securely"("p_user_id" "uuid", "p_new_role" "text", "p_caller_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_ticket"("p_ticket_number" "text", "p_scanner_code" "text", "p_verification_method" "text", "p_location_latitude" numeric, "p_location_longitude" numeric, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_ticket"("p_ticket_number" "text", "p_scanner_code" "text", "p_verification_method" "text", "p_location_latitude" numeric, "p_location_longitude" numeric, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_ticket"("p_ticket_number" "text", "p_scanner_code" "text", "p_verification_method" "text", "p_location_latitude" numeric, "p_location_longitude" numeric, "p_notes" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_scanners" TO "anon";
GRANT ALL ON TABLE "public"."organizer_scanners" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_scanners" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."verification_sessions" TO "anon";
GRANT ALL ON TABLE "public"."verification_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."active_verification_sessions" TO "anon";
GRANT ALL ON TABLE "public"."active_verification_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."active_verification_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_activites" TO "anon";
GRANT ALL ON TABLE "public"."admin_activites" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_activites" TO "service_role";



GRANT ALL ON TABLE "public"."admin_balances" TO "anon";
GRANT ALL ON TABLE "public"."admin_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_balances" TO "service_role";



GRANT ALL ON TABLE "public"."admin_commissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_commissions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_coverage_zones" TO "anon";
GRANT ALL ON TABLE "public"."admin_coverage_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_coverage_zones" TO "service_role";



GRANT ALL ON TABLE "public"."admin_licences" TO "anon";
GRANT ALL ON TABLE "public"."admin_licences" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_licences" TO "service_role";



GRANT ALL ON TABLE "public"."admin_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."admin_revenue" TO "anon";
GRANT ALL ON TABLE "public"."admin_revenue" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_revenue" TO "service_role";



GRANT ALL ON TABLE "public"."admin_salary_history" TO "anon";
GRANT ALL ON TABLE "public"."admin_salary_history" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_salary_history" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."admin_withdrawal_requests" TO "anon";
GRANT ALL ON TABLE "public"."admin_withdrawal_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_withdrawal_requests" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_commissions" TO "anon";
GRANT ALL ON TABLE "public"."ticket_commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_commissions" TO "service_role";



GRANT ALL ON TABLE "public"."all_commissions_view" TO "anon";
GRANT ALL ON TABLE "public"."all_commissions_view" TO "authenticated";
GRANT ALL ON TABLE "public"."all_commissions_view" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."app_images" TO "anon";
GRANT ALL ON TABLE "public"."app_images" TO "authenticated";
GRANT ALL ON TABLE "public"."app_images" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_performances" TO "anon";
GRANT ALL ON TABLE "public"."candidate_performances" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_performances" TO "service_role";



GRANT ALL ON TABLE "public"."candidates" TO "anon";
GRANT ALL ON TABLE "public"."candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."candidates" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."event_categories" TO "anon";
GRANT ALL ON TABLE "public"."event_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."event_categories" TO "service_role";



GRANT ALL ON TABLE "public"."category_filters" TO "anon";
GRANT ALL ON TABLE "public"."category_filters" TO "authenticated";
GRANT ALL ON TABLE "public"."category_filters" TO "service_role";



GRANT ALL ON TABLE "public"."coin_conversion_rates" TO "anon";
GRANT ALL ON TABLE "public"."coin_conversion_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."coin_conversion_rates" TO "service_role";



GRANT ALL ON TABLE "public"."coin_packs" TO "anon";
GRANT ALL ON TABLE "public"."coin_packs" TO "authenticated";
GRANT ALL ON TABLE "public"."coin_packs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."coin_packs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."coin_packs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."coin_packs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."coin_spending" TO "anon";
GRANT ALL ON TABLE "public"."coin_spending" TO "authenticated";
GRANT ALL ON TABLE "public"."coin_spending" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."coin_spending_history" TO "anon";
GRANT ALL ON TABLE "public"."coin_spending_history" TO "authenticated";
GRANT ALL ON TABLE "public"."coin_spending_history" TO "service_role";



GRANT ALL ON TABLE "public"."coin_transactions" TO "anon";
GRANT ALL ON TABLE "public"."coin_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."coin_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."content_reports" TO "anon";
GRANT ALL ON TABLE "public"."content_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."content_reports" TO "service_role";



GRANT ALL ON TABLE "public"."contests" TO "anon";
GRANT ALL ON TABLE "public"."contests" TO "authenticated";
GRANT ALL ON TABLE "public"."contests" TO "service_role";



GRANT ALL ON TABLE "public"."conversion_rates" TO "anon";
GRANT ALL ON TABLE "public"."conversion_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."conversion_rates" TO "service_role";



GRANT ALL ON TABLE "public"."currency_rates" TO "anon";
GRANT ALL ON TABLE "public"."currency_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."currency_rates" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."encouragement_messages" TO "anon";
GRANT ALL ON TABLE "public"."encouragement_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."encouragement_messages" TO "service_role";



GRANT ALL ON TABLE "public"."event_categories_with_count" TO "anon";
GRANT ALL ON TABLE "public"."event_categories_with_count" TO "authenticated";
GRANT ALL ON TABLE "public"."event_categories_with_count" TO "service_role";



GRANT ALL ON TABLE "public"."event_comments" TO "anon";
GRANT ALL ON TABLE "public"."event_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_comments" TO "service_role";



GRANT ALL ON TABLE "public"."event_commission_details" TO "anon";
GRANT ALL ON TABLE "public"."event_commission_details" TO "authenticated";
GRANT ALL ON TABLE "public"."event_commission_details" TO "service_role";



GRANT ALL ON TABLE "public"."event_geocoding_results" TO "anon";
GRANT ALL ON TABLE "public"."event_geocoding_results" TO "authenticated";
GRANT ALL ON TABLE "public"."event_geocoding_results" TO "service_role";



GRANT ALL ON TABLE "public"."event_notifications" TO "anon";
GRANT ALL ON TABLE "public"."event_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."event_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."event_participations" TO "anon";
GRANT ALL ON TABLE "public"."event_participations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_participations" TO "service_role";



GRANT ALL ON TABLE "public"."event_promotions" TO "anon";
GRANT ALL ON TABLE "public"."event_promotions" TO "authenticated";
GRANT ALL ON TABLE "public"."event_promotions" TO "service_role";



GRANT ALL ON TABLE "public"."event_protections" TO "anon";
GRANT ALL ON TABLE "public"."event_protections" TO "authenticated";
GRANT ALL ON TABLE "public"."event_protections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_protections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_protections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_protections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_raffles" TO "anon";
GRANT ALL ON TABLE "public"."event_raffles" TO "authenticated";
GRANT ALL ON TABLE "public"."event_raffles" TO "service_role";



GRANT ALL ON TABLE "public"."event_reactions" TO "anon";
GRANT ALL ON TABLE "public"."event_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."event_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."event_revenues" TO "anon";
GRANT ALL ON TABLE "public"."event_revenues" TO "authenticated";
GRANT ALL ON TABLE "public"."event_revenues" TO "service_role";



GRANT ALL ON TABLE "public"."event_settings" TO "anon";
GRANT ALL ON TABLE "public"."event_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."event_settings" TO "service_role";



GRANT ALL ON TABLE "public"."event_stands" TO "anon";
GRANT ALL ON TABLE "public"."event_stands" TO "authenticated";
GRANT ALL ON TABLE "public"."event_stands" TO "service_role";



GRANT ALL ON TABLE "public"."event_tickets" TO "anon";
GRANT ALL ON TABLE "public"."event_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."event_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."participant_votes" TO "anon";
GRANT ALL ON TABLE "public"."participant_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."participant_votes" TO "service_role";



GRANT ALL ON TABLE "public"."raffle_participants" TO "anon";
GRANT ALL ON TABLE "public"."raffle_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."raffle_participants" TO "service_role";



GRANT ALL ON TABLE "public"."stand_reservations" TO "anon";
GRANT ALL ON TABLE "public"."stand_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."stand_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."stands" TO "anon";
GRANT ALL ON TABLE "public"."stands" TO "authenticated";
GRANT ALL ON TABLE "public"."stands" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."events_with_categories" TO "anon";
GRANT ALL ON TABLE "public"."events_with_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."events_with_categories" TO "service_role";



GRANT ALL ON TABLE "public"."events_with_location" TO "anon";
GRANT ALL ON TABLE "public"."events_with_location" TO "authenticated";
GRANT ALL ON TABLE "public"."events_with_location" TO "service_role";



GRANT ALL ON TABLE "public"."home_page_data" TO "anon";
GRANT ALL ON TABLE "public"."home_page_data" TO "authenticated";
GRANT ALL ON TABLE "public"."home_page_data" TO "service_role";



GRANT ALL ON TABLE "public"."licence_renewal_requests" TO "anon";
GRANT ALL ON TABLE "public"."licence_renewal_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."licence_renewal_requests" TO "service_role";



GRANT ALL ON TABLE "public"."license_renewal_requests" TO "anon";
GRANT ALL ON TABLE "public"."license_renewal_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."license_renewal_requests" TO "service_role";



GRANT ALL ON TABLE "public"."live_rankings" TO "anon";
GRANT ALL ON TABLE "public"."live_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."live_rankings" TO "service_role";



GRANT ALL ON TABLE "public"."location_types" TO "anon";
GRANT ALL ON TABLE "public"."location_types" TO "authenticated";
GRANT ALL ON TABLE "public"."location_types" TO "service_role";



GRANT ALL ON TABLE "public"."mandatory_videos" TO "anon";
GRANT ALL ON TABLE "public"."mandatory_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."mandatory_videos" TO "service_role";



GRANT ALL ON TABLE "public"."notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."notification_stats" TO "anon";
GRANT ALL ON TABLE "public"."notification_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_stats" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_balances" TO "anon";
GRANT ALL ON TABLE "public"."organizer_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_balances" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_earnings" TO "anon";
GRANT ALL ON TABLE "public"."organizer_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_earnings_summary" TO "anon";
GRANT ALL ON TABLE "public"."organizer_earnings_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_earnings_summary" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_interaction_earnings" TO "anon";
GRANT ALL ON TABLE "public"."organizer_interaction_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_interaction_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_prices" TO "anon";
GRANT ALL ON TABLE "public"."organizer_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_prices" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_transactions" TO "anon";
GRANT ALL ON TABLE "public"."organizer_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_wallet" TO "anon";
GRANT ALL ON TABLE "public"."organizer_wallet" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_wallet" TO "service_role";



GRANT ALL ON TABLE "public"."organizer_withdrawal_requests" TO "anon";
GRANT ALL ON TABLE "public"."organizer_withdrawal_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."organizer_withdrawal_requests" TO "service_role";



GRANT ALL ON TABLE "public"."paiements_admin" TO "anon";
GRANT ALL ON TABLE "public"."paiements_admin" TO "authenticated";
GRANT ALL ON TABLE "public"."paiements_admin" TO "service_role";



GRANT ALL ON TABLE "public"."participation_payments" TO "anon";
GRANT ALL ON TABLE "public"."participation_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."participation_payments" TO "service_role";



GRANT ALL ON TABLE "public"."partner_badges" TO "anon";
GRANT ALL ON TABLE "public"."partner_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_badges" TO "service_role";



GRANT ALL ON TABLE "public"."partner_earnings" TO "anon";
GRANT ALL ON TABLE "public"."partner_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."partner_license_packs" TO "anon";
GRANT ALL ON TABLE "public"."partner_license_packs" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_license_packs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."partner_license_packs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."partner_license_packs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."partner_license_packs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."partner_licenses" TO "anon";
GRANT ALL ON TABLE "public"."partner_licenses" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_licenses" TO "service_role";



GRANT ALL ON TABLE "public"."partners" TO "anon";
GRANT ALL ON TABLE "public"."partners" TO "authenticated";
GRANT ALL ON TABLE "public"."partners" TO "service_role";



GRANT ALL ON TABLE "public"."pending_announcements" TO "anon";
GRANT ALL ON TABLE "public"."pending_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."personal_score" TO "anon";
GRANT ALL ON TABLE "public"."personal_score" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_score" TO "service_role";



GRANT ALL ON TABLE "public"."platform_wallet" TO "anon";
GRANT ALL ON TABLE "public"."platform_wallet" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_wallet" TO "service_role";



GRANT ALL ON TABLE "public"."platform_commission_stats" TO "anon";
GRANT ALL ON TABLE "public"."platform_commission_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_commission_stats" TO "service_role";



GRANT ALL ON TABLE "public"."promotion_packs" TO "anon";
GRANT ALL ON TABLE "public"."promotion_packs" TO "authenticated";
GRANT ALL ON TABLE "public"."promotion_packs" TO "service_role";



GRANT ALL ON TABLE "public"."protected_event_access" TO "anon";
GRANT ALL ON TABLE "public"."protected_event_access" TO "authenticated";
GRANT ALL ON TABLE "public"."protected_event_access" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."raffle_events" TO "anon";
GRANT ALL ON TABLE "public"."raffle_events" TO "authenticated";
GRANT ALL ON TABLE "public"."raffle_events" TO "service_role";



GRANT ALL ON TABLE "public"."raffle_prizes" TO "anon";
GRANT ALL ON TABLE "public"."raffle_prizes" TO "authenticated";
GRANT ALL ON TABLE "public"."raffle_prizes" TO "service_role";



GRANT ALL ON TABLE "public"."raffle_tickets" TO "anon";
GRANT ALL ON TABLE "public"."raffle_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."raffle_tickets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."raffle_tickets_ticket_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."raffle_tickets_ticket_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."raffle_tickets_ticket_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."raffle_winners" TO "anon";
GRANT ALL ON TABLE "public"."raffle_winners" TO "authenticated";
GRANT ALL ON TABLE "public"."raffle_winners" TO "service_role";



GRANT ALL ON TABLE "public"."referral_program" TO "anon";
GRANT ALL ON TABLE "public"."referral_program" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_program" TO "service_role";



GRANT ALL ON TABLE "public"."referral_rewards" TO "anon";
GRANT ALL ON TABLE "public"."referral_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_rewards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."referral_rewards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."referral_rewards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."referral_rewards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sponsors" TO "anon";
GRANT ALL ON TABLE "public"."sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsors" TO "service_role";



GRANT ALL ON TABLE "public"."stand_bookings" TO "anon";
GRANT ALL ON TABLE "public"."stand_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."stand_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."stand_events" TO "anon";
GRANT ALL ON TABLE "public"."stand_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stand_events" TO "service_role";



GRANT ALL ON TABLE "public"."stand_rentals" TO "anon";
GRANT ALL ON TABLE "public"."stand_rentals" TO "authenticated";
GRANT ALL ON TABLE "public"."stand_rentals" TO "service_role";



GRANT ALL ON TABLE "public"."stand_types" TO "anon";
GRANT ALL ON TABLE "public"."stand_types" TO "authenticated";
GRANT ALL ON TABLE "public"."stand_types" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_designs" TO "anon";
GRANT ALL ON TABLE "public"."ticket_designs" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_designs" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_emails" TO "anon";
GRANT ALL ON TABLE "public"."ticket_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_emails" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_issues" TO "anon";
GRANT ALL ON TABLE "public"."ticket_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_issues" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_orders" TO "anon";
GRANT ALL ON TABLE "public"."ticket_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_orders" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_purchases" TO "anon";
GRANT ALL ON TABLE "public"."ticket_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_purchases" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_scans" TO "anon";
GRANT ALL ON TABLE "public"."ticket_scans" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_scans" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_types" TO "anon";
GRANT ALL ON TABLE "public"."ticket_types" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_types" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_verifications" TO "anon";
GRANT ALL ON TABLE "public"."ticket_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."ticketing_events" TO "anon";
GRANT ALL ON TABLE "public"."ticketing_events" TO "authenticated";
GRANT ALL ON TABLE "public"."ticketing_events" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_coin_transactions" TO "anon";
GRANT ALL ON TABLE "public"."user_coin_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_coin_transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_coin_transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_coin_transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_coin_transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_earnings" TO "anon";
GRANT ALL ON TABLE "public"."user_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."user_interactions" TO "anon";
GRANT ALL ON TABLE "public"."user_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_partner_licenses" TO "anon";
GRANT ALL ON TABLE "public"."user_partner_licenses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_partner_licenses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_partner_licenses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_partner_licenses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_partner_licenses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_video_views" TO "anon";
GRANT ALL ON TABLE "public"."user_video_views" TO "authenticated";
GRANT ALL ON TABLE "public"."user_video_views" TO "service_role";



GRANT ALL ON TABLE "public"."verification_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."verification_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."voting_sessions" TO "anon";
GRANT ALL ON TABLE "public"."voting_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."voting_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."welcome_popups" TO "anon";
GRANT ALL ON TABLE "public"."welcome_popups" TO "authenticated";
GRANT ALL ON TABLE "public"."welcome_popups" TO "service_role";



GRANT ALL ON TABLE "public"."withdrawal_requests" TO "anon";
GRANT ALL ON TABLE "public"."withdrawal_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."withdrawal_requests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































