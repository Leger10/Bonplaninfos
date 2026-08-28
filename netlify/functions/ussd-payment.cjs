// netlify/functions/ussd-payment.cjs
// Paiement USSD mobile money (Nida / marchand mobile) — sans passer par MoneyFusion.
// - action=submit   : le client a payé par USSD et saisit la référence du SMS => on enregistre
//                     le paiement (status 'pending'), on crédite immédiatement (pièces) ou on
//                     crée les billets, en attente de validation admin.
// - action=validate : l'admin confirme le paiement reçu  => payments.status = 'completed'
// - action=reject   : l'admin rejette (fraude)           => payments.status = 'cancelled'
//                     (+ remboursement pièces / suppression billets / contrepassation gains)
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

const USSD_MERCHANT = process.env.USSD_MERCHANT || '46598281';
const USSD_PREFIX = '*144*10*';
const buildUSSDCode = (amount) => `${USSD_PREFIX}${USSD_MERCHANT}*${amount}#`;

// Upload de la capture d'écran (service role => bypass RLS). Accepte une data:image/... base64
// ou une URL publique déjà prête. Retourne l'URL publique ou '' en cas d'échec.
const uploadProof = async (proofInput, orderId) => {
    try {
        const input = String(proofInput || '').trim();
        if (!input) return '';
        if (!input.startsWith('data:')) return input; // déjà une URL
        const m = input.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!m) return '';
        const isPng = m[1].toLowerCase().includes('png');
        const ext = isPng ? 'png' : 'jpg';
        const buf = Buffer.from(m[2], 'base64');
        const path = `ussd_proofs/${orderId}.${ext}`;
        const { error } = await supabase.storage.from('media').upload(path, buf, {
            contentType: isPng ? 'image/png' : 'image/jpeg',
            upsert: true,
            cacheControl: '3600'
        });
        if (error) {
            console.error('⚠️ Upload preuve échoué:', error.message);
            return '';
        }
        return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
    } catch (e) {
        console.error('⚠️ Upload preuve exception:', e.message);
        return '';
    }
};

const now = () => new Date().toISOString();
const uuidv4 = () => crypto.randomUUID
    ? crypto.randomUUID()
    : `00000000-0000-0000-0000-${Math.random().toString(36).substring(2, 10)}`;

const generateEmailFromName = (fullName) => {
    const cleanName = String(fullName || 'invite')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
    return `${cleanName}@gmail.com`;
};

const createUserAccount = async (fullName, phoneNumber, userEmail) => {
    try {
        const email = userEmail || generateEmailFromName(fullName);
        const password = '000000';

        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (!listError && existingUsers) {
            const existingUser = existingUsers.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
            if (existingUser) {
                if (phoneNumber) {
                    await supabase.from('profiles').update({ phone: phoneNumber, updated_at: now() }).eq('id', existingUser.id);
                }
                return existingUser.id;
            }
        }

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, phone: phoneNumber || '' }
        });

        if (authError || !authUser || !authUser.user) {
            const guestId = uuidv4();
            await supabase.from('profiles').insert({
                id: guestId,
                email,
                full_name: fullName || 'Invité',
                phone: phoneNumber || '',
                user_type: 'guest',
                created_at: now()
            });
            return guestId;
        }

        const userId = authUser.user.id;
        await supabase.from('profiles').insert({
            id: userId,
            email,
            full_name: fullName || 'Invité',
            phone: phoneNumber || '',
            user_type: 'user',
            created_at: now()
        });
        return userId;
    } catch (error) {
        console.error('❌ Erreur création compte:', error);
        const guestId = uuidv4();
        await supabase.from('profiles').insert({
            id: guestId,
            email: `guest_${Date.now()}@temp.com`,
            full_name: fullName || 'Invité',
            phone: phoneNumber || '',
            user_type: 'guest',
            created_at: now()
        });
        return guestId;
    }
};

// ============================================================
// SUBMIT — le client paie par USSD et confirme avec la réf. SMS
// ============================================================
const handleSubmit = async (body) => {
    const {
        type, // 'credits' | 'tickets'
        smsReference,
        proofUrl, // data:image/... base64 (capture d'écran) OU URL publique
        proofDataUrl, // alias moderne envoyé par l'app
        amountFcfa,
        phone,
        transactionId,
        // crédits:
        userId,
        coinsAmount,
        packId,
        couponCode,
        userEmail,
        // billets:
        eventId,
        cart,
        cartTotalFcfa,
        attendeeName,
        promoCodeId,
        commissionAmount,
        isGuest,
    } = body;

    if (type !== 'credits' && type !== 'tickets') {
        return { statusCode: 400, body: { success: false, message: 'Type de paiement invalide' } };
    }

    const cleanSmsRef = String(smsReference || '').trim();
    const proofInput = String(proofDataUrl || proofUrl || '').trim();
    if (!proofInput) {
        return { statusCode: 400, body: { success: false, message: "Capture d'écran de la transaction requise pour confirmer le paiement" } };
    }

    const total = parseInt(amountFcfa, 10);
    if (!total || total <= 0) {
        return { statusCode: 400, body: { success: false, message: 'Montant invalide' } };
    }

    const cleanPhone = String(phone || '').replace(/[^\d]/g, '');
    if (cleanPhone.length < 8) {
        return { statusCode: 400, body: { success: false, message: 'Numéro de téléphone invalide' } };
    }

    const orderId = transactionId || `ussd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const proofUrlFinal = await uploadProof(proofInput, orderId);
    if (!proofUrlFinal) {
        return { statusCode: 400, body: { success: false, message: "Impossible d'enregistrer la capture d'écran de la transaction" } };
    }
    const ussdMeta = {
        sms_reference: cleanSmsRef,
        proof_url: proofUrlFinal,
        merchant_ussd: buildUSSDCode(total),
        operator: 'mobile_money',
        amount_paid_fcfa: total
    };

    // ---------- CRÉDITS (packs / montant libre) ----------
    if (type === 'credits') {
        if (!userId) {
            return { statusCode: 400, body: { success: false, message: 'Utilisateur requis' } };
        }
        const coins = parseInt(coinsAmount, 10) || Math.floor(total / 10);

        const { data: paymentRow, error: paymentError } = await supabase
            .from('payments')
            .insert({
                user_id: userId,
                coins_amount: coins,
                amount_fcfa: total,
                status: 'pending',
                payment_method: 'ussd',
                transaction_id: orderId,
                pack_id: packId || 'custom',
                coupon_code: couponCode || null,
                credits_added: true
            })
            .select()
            .single();

        if (paymentError) {
            console.error('❌ Erreur insertion paiement USSD:', paymentError);
            return { statusCode: 500, body: { success: false, message: 'Erreur enregistrement paiement: ' + paymentError.message } };
        }

        // Créditer immédiatement (délivrance rapide, validation admin ensuite)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('coin_balance')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            console.error('❌ Profil introuvable:', profileError);
            return { statusCode: 500, body: { success: false, message: 'Compte utilisateur introuvable' } };
        }

        const newBalance = (profile.coin_balance || 0) + coins;
        const { error: creditError } = await supabase
            .from('profiles')
            .update({ coin_balance: newBalance, updated_at: now() })
            .eq('id', userId);

        if (creditError) {
            console.error('❌ Erreur crédit pièces:', creditError);
            return { statusCode: 500, body: { success: false, message: 'Erreur crédit des pièces: ' + creditError.message } };
        }

        await supabase.from('transactions').insert({
            user_id: userId,
            transaction_type: 'credit_purchase',
            amount_pi: coins,
            amount_fcfa: total,
            status: 'completed',
            description: `💳 Recharge USSD ${total} FCFA${cleanSmsRef ? ` (réf. ${cleanSmsRef})` : ' (capture d\'écran)'} - en attente de validation`,
            metadata: { ussd: ussdMeta, payment_id: paymentRow.id, payment_type: 'credits' }
        });

        return {
            statusCode: 200,
            body: {
                success: true,
                type: 'credits',
                transaction_id: orderId,
                payment_id: paymentRow.id,
                coins_added: coins,
                new_balance: newBalance,
                message: 'Paiement enregistré. Votre compte a été crédité.',
                pending_validation: true
            }
        };
    }

    // ---------- BILLETS ----------
    const originalAmount = parseInt(cartTotalFcfa, 10) || total;
    const userName = attendeeName || 'Invité';

    let finalUserId = userId || null;
    if (isGuest || !userId || String(userId).startsWith('guest_')) {
        finalUserId = await createUserAccount(userName, cleanPhone, userEmail);
    } else {
        await supabase.from('profiles').update({ phone: cleanPhone, updated_at: now() }).eq('id', finalUserId);
    }

    const cartData = cart && typeof cart === 'object' ? cart : {};
    let ticketCount = Object.values(cartData).reduce((sum, qty) => sum + parseInt(qty || 0, 10), 0);
    if (!ticketCount) ticketCount = 1;

    const pricePerTicketCoins = Math.floor(originalAmount / 10 / ticketCount);
    const pricePerTicketFcfa = Math.floor(originalAmount / ticketCount);

    const tickets = [];
    const baseTimestamp = Date.now();
    const created_at = now();
    for (let i = 0; i < ticketCount; i++) {
        const ticketId = uuidv4();
        const qrCode = `QR-${baseTimestamp}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        tickets.push({
            id: ticketId,
            event_id: eventId,
            user_id: finalUserId,
            status: 'active',
            payment_method: 'ussd',
            transaction_reference: orderId,
            attendee_name: userName,
            customer_name: userName,
            phone: cleanPhone,
            email: userEmail || generateEmailFromName(userName),
            is_guest: isGuest || false,
            purchased_at: created_at,
            qr_code: qrCode,
            ticket_code_short: Math.random().toString(36).substring(2, 8).toUpperCase(),
            ticket_number: `US-${baseTimestamp}-${String(i + 1).padStart(4, '0')}`,
            ticket_type_id: null,
            purchase_price_pi: pricePerTicketCoins,
            total_amount_pi: pricePerTicketCoins * ticketCount,
            total_amount_fcfa: pricePerTicketFcfa * ticketCount,
            quantity: 1,
            entry_count: 0,
            created_at,
            updated_at: created_at
        });
    }

    const { error: ticketsError } = await supabase.from('tickets').insert(tickets);
    if (ticketsError) {
        console.error('❌ Erreur insertion tickets:', ticketsError);
        return { statusCode: 500, body: { success: false, message: 'Erreur création des billets: ' + ticketsError.message } };
    }

    // ✅ Écriture miroir dans event_tickets pour l'affichage "Mes billets"
    const eventTicketRows = tickets.map((t) => ({
        order_id: orderId,
        event_id: eventId,
        user_id: finalUserId,
        ticket_type_id: null,
        ticket_number: t.ticket_number,
        qr_code: t.qr_code,
        status: 'active',
        purchase_amount_pi: t.purchase_price_pi,
        purchase_amount_fcfa: t.total_amount_fcfa,
        purchased_at: created_at,
        transaction_reference: orderId
    }));
    try {
        const { error: evtError } = await supabase.from('event_tickets').insert(eventTicketRows);
        if (evtError) console.error('⚠️ Écriture event_tickets ignorée:', evtError.message);
    } catch (e) {
        console.error('⚠️ Écriture event_tickets ignorée (exception):', e.message);
    }

    // Paiement (status pending, en attente de validation admin)
    const { data: paymentRow, error: paymentError } = await supabase
        .from('payments')
        .insert({
            user_id: finalUserId,
            coins_amount: pricePerTicketCoins * ticketCount,
            amount_fcfa: total,
            status: 'pending',
            payment_method: 'ussd',
            transaction_id: orderId,
            pack_id: 'ticket_payment',
            coupon_code: promoCodeId || null,
            credits_added: false
        })
        .select()
        .single();

    if (paymentError) {
        console.error('❌ Erreur insertion paiement ticket USSD:', paymentError);
        return { statusCode: 500, body: { success: false, message: 'Erreur enregistrement paiement: ' + paymentError.message } };
    }

    // Trace dans transactions (détails USSD : réf. SMS + capture d'écran)
    try {
        await supabase.from('transactions').insert({
            user_id: finalUserId,
            transaction_type: 'ticket_purchase',
            amount_pi: pricePerTicketCoins * ticketCount,
            amount_fcfa: total,
            status: 'completed',
            description: `🎟️ Achat de ${ticketCount} billet(s) via USSD${cleanSmsRef ? ` (réf. ${cleanSmsRef})` : ' (capture d\'écran)'} - ${userName} - à valider`,
            metadata: {
                ussd: ussdMeta,
                payment_id: paymentRow.id,
                payment_type: 'tickets',
                event_id: eventId,
                cart: cartData,
                promo_code_id: promoCodeId || null,
                commission_amount: commissionAmount || 0
            }
        });
    } catch (e) {
        console.error('⚠️ Trace transactions non enregistrée:', e.message);
    }

    // Gains organisateur
    try {
        const { data: eventData } = await supabase.from('events').select('organizer_id').eq('id', eventId).single();
        if (eventData) {
            const organizerId = eventData.organizer_id;
            const amountCoins = Math.floor(total / 10);
            const platformCommission = Math.floor(amountCoins * 0.05);
            const earningId = uuidv4();

            await supabase.from('organizer_earnings').insert({
                organizer_id: organizerId,
                event_id: eventId,
                transaction_id: earningId,
                transaction_type: 'ticket_sale',
                earnings_coins: amountCoins,
                earnings_fcfa: total,
                status: 'pending',
                platform_commission: platformCommission,
                platform_fee: platformCommission * 10,
                net_amount: (amountCoins - platformCommission) * 10,
                ticket_count: ticketCount,
                earning_type: 'ticket_sale',
                event_type: 'ticketing',
                description: `💰 Vente de ${ticketCount} tickets via USSD - ${userName} (${cleanPhone}) - à valider`,
                created_at: created_at
            });

            const { data: profile } = await supabase.from('profiles').select('total_earnings, available_earnings').eq('id', organizerId).single();
            if (profile) {
                await supabase.from('profiles').update({
                    total_earnings: (profile.total_earnings || 0) + amountCoins,
                    available_earnings: (profile.available_earnings || 0) + amountCoins,
                    updated_at: created_at
                }).eq('id', organizerId);
            }
        }
    } catch (e) {
        console.error('⚠️ Gains organisateur non crédités:', e.message);
    }

    return {
        statusCode: 200,
        body: {
            success: true,
            type: 'tickets',
            transaction_id: orderId,
            payment_id: paymentRow.id,
            ticket_count: tickets.length,
            tickets: tickets.map((t) => ({
                id: t.id,
                qr_code: t.qr_code,
                ticket_code_short: t.ticket_code_short,
                ticket_number: t.ticket_number
            })),
            message: 'Paiement enregistré. Vos billets sont disponibles.',
            pending_validation: true
        }
    };
};

// ============================================================
// VALIDATE / REJECT — actions admin
// ============================================================
const resolvePayment = async (body, targetStatus) => {
    const { paymentId, transactionId } = body;
    if (!paymentId && !transactionId) {
        return { statusCode: 400, body: { success: false, message: 'paymentId requis' } };
    }

    let query = supabase.from('payments').select('*');
    if (paymentId) query = query.eq('id', paymentId);
    else query = query.eq('transaction_id', transactionId);
    const { data: rows, error } = await query.maybeSingle();

    if (error || !rows) {
        return { statusCode: 404, body: { success: false, message: 'Paiement introuvable' } };
    }
    if (rows.payment_method !== 'ussd') {
        return { statusCode: 400, body: { success: false, message: 'Ce paiement n\'est pas un paiement USSD' } };
    }

    const payment = rows;

    // ---- REJET : rembourser / annuler la délivrance ----
    if (targetStatus === 'cancelled') {
        const orderId = payment.transaction_id;
        const isCredits = payment.pack_id !== 'ticket_payment';

        if (isCredits && payment.credits_added) {
            const coins = payment.coins_amount || 0;
            const { data: profile } = await supabase.from('profiles').select('coin_balance').eq('id', payment.user_id).single();
            if (profile) {
                const newBalance = Math.max((profile.coin_balance || 0) - coins, 0);
                await supabase.from('profiles').update({ coin_balance: newBalance, updated_at: now() }).eq('id', payment.user_id);
                await supabase.from('transactions').insert({
                    user_id: payment.user_id,
                    transaction_type: 'reversed_credits',
                    amount_pi: coins,
                    amount_fcfa: payment.amount_fcfa || 0,
                    status: 'completed',
                    description: `↩️ Remboursement USSD rejeté (${payment.amount_fcfa || 0} FCFA)`,
                    reference_id: payment.id,
                    metadata: { ussd: payment.metadata?.ussd }
                });
            }
        }

        if (!isCredits) {
            try {
                await supabase.from('tickets').update({ status: 'cancelled', updated_at: now() }).eq('transaction_reference', orderId);
            } catch (err) {
                console.warn('⚠️ tickets cleanup skip:', err.message);
            }
            try {
                await supabase.from('event_tickets').update({ status: 'cancelled' }).eq('transaction_reference', orderId);
            } catch (err) {
                console.warn('⚠️ event_tickets cleanup skip:', err.message);
            }
        }
    }

    const updates = { status: targetStatus, processed_at: now() };
    if (targetStatus === 'completed') updates.credits_added = true;

    const { error: updateError } = await supabase.from('payments').update(updates).eq('id', payment.id);
    if (updateError) {
        return { statusCode: 500, body: { success: false, message: 'Erreur mise à jour: ' + updateError.message } };
    }

    return {
        statusCode: 200,
        body: {
            success: true,
            status: targetStatus,
            message: targetStatus === 'completed' ? 'Paiement validé ✅' : 'Paiement rejeté (annulé)'
        }
    };
};

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
    }

    if (!supabase) {
        console.error('❌ ussd-payment: variables Supabase manquantes');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Configuration Supabase manquante côté serveur (SUPABASE_SERVICE_ROLE_KEY)'
            })
        };
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const { action } = payload;

        let result;
        switch (action) {
            case 'submit':
                result = await handleSubmit(payload);
                break;
            case 'validate':
                result = await resolvePayment(payload, 'completed');
                break;
            case 'reject':
                result = await resolvePayment(payload, 'cancelled');
                break;
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, message: 'Action inconnue (submit | validate | reject)' })
                };
        }

        console.log(`✅ ussd-payment [${action}]`, result.body);
        return {
            statusCode: result.statusCode,
            headers,
            body: JSON.stringify(result.body)
        };
    } catch (error) {
        console.error('❌ Erreur ussd-payment:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message || 'Erreur serveur' })
        };
    }
};