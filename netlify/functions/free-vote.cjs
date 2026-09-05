// netlify/functions/free-vote.cjs
// Vote GRATUIT (concours "voting_type = free") — sans compte requis.
// - action=vote : incrémente candidates.vote_count + enregistre user_votes
//                 (user_id null pour invité, guest_id pour la limite par appareil).
// Service role => bypass RLS => permet aux visiteurs anonymes de voter.
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

const MAX_VOTES_PER_CALL = 100;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: '',
        };
    }

    if (!supabase) {
        return ok(500, { success: false, message: 'Configuration Supabase manquante sur le serveur.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return ok(400, { success: false, message: 'JSON invalide.' });
    }

    try {
        switch (payload.action) {
            case 'vote':
                return await handleVote(payload);
            default:
                return ok(400, { success: false, message: 'Action inconnue (' + payload.action + ').' });
        }
    } catch (e) {
        console.error('❌ free-vote error:', e);
        return ok(500, { success: false, message: e.message || 'Erreur serveur.' });
    }
};

const ok = (status, body) => ({
    statusCode: status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

const cleanInt = (v, fallback, min, max) => {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

const handleVote = async (payload) => {
    const eventId = String(payload.eventId || '').trim();
    const candidateId = String(payload.candidateId || '').trim();
    const voteCount = cleanInt(payload.voteCount, 1, 1, MAX_VOTES_PER_CALL);
    const userId = payload.userId ? String(payload.userId).trim() : null;
    const guestId = payload.guestId ? String(payload.guestId).trim().slice(0, 64) : null;
    const fullName = String(payload.fullName || '').trim().slice(0, 120) || null;
    const phone = String(payload.phone || '').trim().slice(0, 30) || null;

    if (!eventId) return ok(400, { success: false, message: 'Identifiant de l&apos;événement manquant.' });
    if (!candidateId) return ok(400, { success: false, message: 'Identifiant du candidat manquant.' });
    if (!userId && !guestId) return ok(400, { success: false, message: 'Identification du voteur manquante.' });
    if (voteCount < 1) return ok(400, { success: false, message: 'Nombre de voix invalide.' });

    // 1) Charger l'événement (statut, prix, période)
    const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, organizer_id, price_pi, event_end_at, is_sales_closed')
        .eq('id', eventId)
        .maybeSingle();
    if (eventError) return ok(500, { success: false, message: 'Erreur lecture événement (' + eventError.message + ').' });
    if (!event) return ok(404, { success: false, message: 'Événement introuvable.' });

    if (event.is_sales_closed) {
        return ok(400, { success: false, message: 'Les votes sont temporairement désactivés.' });
    }
    if (event.event_end_at && new Date(event.event_end_at).getTime() < Date.now()) {
        return ok(400, { success: false, message: 'Les votes sont terminés.' });
    }

    // 2) Vérifier que c'est bien un vote GRATUIT
    const { data: settings, error: settingsError } = await supabase
        .from('event_settings')
        .select('voting_type, voting_enabled, max_votes_per_user')
        .eq('event_id', eventId)
        .maybeSingle();

    const votingType = settings?.voting_type || 'paid';
    const isFree = votingType === 'free' || Number(event.price_pi) === 0;
    if (!isFree) {
        return ok(400, { success: false, message: 'Ce concours n&apos;est pas un vote gratuit.' });
    }
    if (settings && settings.voting_enabled === false) {
        return ok(400, { success: false, message: 'Les votes sont temporairement désactivés.' });
    }

    const maxVotesPerUser = settings?.max_votes_per_user ? cleanInt(settings.max_votes_per_user, 0, 0, 1e9) : 0;

    // 3) Vérifier que le candidat appartient à l'événement
    const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id, name, vote_count')
        .eq('id', candidateId)
        .eq('event_id', eventId)
        .maybeSingle();
    if (candidateError || !candidate) {
        return ok(404, { success: false, message: 'Candidat introuvable pour cet événement.' });
    }

    // 4) Limite par appareil (invités) ou par utilisateur (connecté)
    if (maxVotesPerUser > 0) {
        let counted = 0;
        if (userId) {
            const { data: rows } = await supabase
                .from('user_votes')
                .select('vote_count')
                .eq('event_id', eventId)
                .eq('user_id', userId);
            counted = (rows || []).reduce((s, r) => s + (r.vote_count || 0), 0);
        } else if (guestId) {
            const { data: rows } = await supabase
                .from('user_votes')
                .select('vote_count')
                .eq('event_id', eventId)
                .eq('guest_id', guestId);
            counted = (rows || []).reduce((s, r) => s + (r.vote_count || 0), 0);
        }
        if (counted + voteCount > maxVotesPerUser) {
            const restant = Math.max(0, maxVotesPerUser - counted);
            return ok(400, {
                success: false,
                message: `Limite de ${maxVotesPerUser} voix atteinte pour cet appareil.` + (restant > 0 ? ` Encore ${restant} voix possible(s).` : ''),
            });
        }
    }

    // 5) Enregistrer le vote PUIS incrémenter (si l'incrément échoue, on annule l'insert)
    // Colonnes ajoutées par migration (guest_id, voter_name, voter_phone) :
    // on tente avec, puis on retombe sur un insert minimal si la migration n'est pas faite.
    let insertError = null;

    const tryInsert = async (row) => {
        const res = await supabase.from('user_votes').insert(row);
        return res.error;
    };

    const newVoteCount = (candidate.vote_count || 0) + voteCount;

    insertError = await tryInsert({
        event_id: eventId,
        candidate_id: candidateId,
        user_id: userId,
        guest_id: guestId,
        vote_count: voteCount,
        vote_cost_pi: 0,
        vote_cost_fcfa: 0,
        net_to_organizer: 0,
        fees: 0,
        payment_method: 'free',
        payment_status: 'completed',
        voter_name: fullName,
        voter_phone: phone,
    });

    if (insertError) {
        insertError = await tryInsert({
            event_id: eventId,
            candidate_id: candidateId,
            user_id: userId,
            guest_id: guestId,
            vote_count: voteCount,
            vote_cost_pi: 0,
            vote_cost_fcfa: 0,
            net_to_organizer: 0,
            fees: 0,
            payment_method: 'free',
            payment_status: 'completed',
        });
    }

    if (insertError) {
        insertError = await tryInsert({
            event_id: eventId,
            candidate_id: candidateId,
            user_id: userId,
            vote_count: voteCount,
            vote_cost_pi: 0,
            vote_cost_fcfa: 0,
            net_to_organizer: 0,
            fees: 0,
            payment_method: 'free',
            payment_status: 'completed',
        });
    }

    if (insertError) {
        return ok(500, { success: false, message: 'Erreur enregistrement du vote (' + insertError.message + ').' });
    }

    const { error: updateError } = await supabase
        .from('candidates')
        .update({ vote_count: newVoteCount })
        .eq('id', candidateId);
    if (updateError) {
        await supabase
            .from('user_votes')
            .delete()
            .eq('event_id', eventId)
            .eq('candidate_id', candidateId)
            .eq('payment_method', 'free')
            .order('created_at', { ascending: false })
            .limit(1);
        return ok(500, { success: false, message: 'Erreur enregistrement du vote (' + updateError.message + ').' });
    }

    const guestTotal = guestId ? await getGuestCount(eventId, guestId) : 0;
    return ok(200, {
        success: true,
        newVoteCount,
        voted: voteCount,
        remaining: maxVotesPerUser > 0 ? Math.max(0, maxVotesPerUser - guestTotal) : null,
    });
};

const getGuestCount = async (eventId, guestId) => {
    const { data: rows } = await supabase
        .from('user_votes')
        .select('vote_count')
        .eq('event_id', eventId)
        .eq('guest_id', guestId);
    return (rows || []).reduce((s, r) => s + (r.vote_count || 0), 0);
};