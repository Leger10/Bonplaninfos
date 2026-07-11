// netlify/functions/moneyfusion-ticket-webhook.cjs - CORRIGÉ
const { createClient } = require('@supabase/supabase-js');

// 🔥 UTILISER LA CLÉ SERVICE_ROLE (pas ANON)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
    throw new Error('Variables d\'environnement Supabase manquantes');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 🔥 FONCTION POUR CRÉER UN ID UTILISATEUR VALIDE
const generateUserId = async (userEmail, attendeeName, phoneNumber) => {
    if (userEmail) {
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', userEmail)
            .maybeSingle();
        
        if (existing) {
            return existing.id;
        }
    }
    
    const newUserId = crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Math.random().toString(36).substring(2, 10)}`;
    
    // 🔥 Utiliser upsert au lieu de insert + on
    await supabase
        .from('profiles')
        .upsert({
            id: newUserId,
            email: userEmail || `guest_${Date.now()}@temp.com`,
            full_name: attendeeName || 'Invité',
            phone: phoneNumber || '',
            user_type: 'user',
            created_at: new Date().toISOString()
        }, { onConflict: 'id' });

    return newUserId;
};

// 🔥 FONCTION POUR CRÉER UN ID INVITÉ SANS PROFIL
const generateGuestUserId = () => {
    return crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Math.random().toString(36).substring(2, 10)}`;
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
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        if (!event.body) {
            throw new Error('Body manquant');
        }

        const payload = JSON.parse(event.body);
        console.log('📦 Webhook reçu:', JSON.stringify(payload, null, 2));

        const { event: eventType, personal_Info, statut } = payload;

        if (eventType !== 'payin.session.completed' && statut !== 'paid') {
            console.log('ℹ️ Événement non traité:', eventType);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ received: true })
            };
        }

        const info = personal_Info?.[0] || {};
        const orderId = info.orderId;
        const eventId = info.eventId;
        const cart = info.cart || {};
        const attendeeName = info.attendeeName || 'Invité';
        const originalAmount = info.amountFcfa || 0;
        const isGuest = info.isGuest || false;
        const userEmail = info.userEmail || null;
        const phoneNumber = info.phone || '';

        console.log('✅ Paiement réussi:', { orderId, eventId, attendeeName, originalAmount, isGuest });

        // --- 1. Gérer l'utilisateur ---
        let finalUserId = info.userId;

        if (isGuest || !finalUserId || finalUserId.startsWith('guest_')) {
            console.log('👤 Création ID invité...');
            finalUserId = generateGuestUserId();
            console.log('✅ ID invité créé:', finalUserId);
            
            // 🔥 Utiliser upsert
            try {
                await supabase
                    .from('profiles')
                    .upsert({
                        id: finalUserId,
                        email: `guest_${Date.now()}@temp.com`,
                        full_name: attendeeName || 'Invité',
                        phone: phoneNumber || '',
                        user_type: 'user',
                        created_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                console.log('✅ Profil invité créé:', finalUserId);
            } catch (profileError) {
                console.warn('⚠️ Impossible de créer le profil invité:', profileError.message);
                // Continue sans profil
            }
        }

        // --- 2. Créer les tickets ---
        let ticketCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
        if (ticketCount === 0) ticketCount = 1;

        const tickets = [];
        for (let i = 0; i < ticketCount; i++) {
            const ticketId = crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Math.random().toString(36).substring(2, 10)}`;
            const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            tickets.push({
                id: ticketId,
                event_id: eventId,
                user_id: finalUserId || null,
                status: 'active',
                payment_method: 'moneyfusion_ticket',
                transaction_reference: orderId,
                attendee_name: attendeeName,
                purchased_at: new Date().toISOString(),
                qr_code: qrCode,
                ticket_number: `MF-${Date.now()}-${String(i + 1).padStart(4, '0')}`,
                purchase_price_pi: Math.floor(originalAmount / 10 / ticketCount),
                ticket_type_id: null
            });
        }

        // 🔥 INSERTION DANS LA TABLE tickets
        if (tickets.length > 0) {
            const { error } = await supabase
                .from('tickets')
                .insert(tickets);

            if (error) {
                console.error('❌ Erreur insertion tickets:', error);
                throw new Error('Erreur insertion tickets: ' + error.message);
            } else {
                console.log(`✅ ${tickets.length} tickets créés dans tickets`);
            }
        }

        // --- 3. Mettre à jour le paiement ---
        await supabase
            .from('payments')
            .update({
                status: 'completed',
                processed_at: new Date().toISOString(),
                user_id: finalUserId || null,
                payment_method: 'moneyfusion_ticket'
            })
            .eq('transaction_id', orderId);

        // --- 4. Créer les gains de l'organisateur ---
        const { data: eventData } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (eventData) {
            const organizerId = eventData.organizer_id;
            const amountCoins = Math.floor(originalAmount / 10);
            const platformCommission = Math.floor(amountCoins * 0.05);
            const netCoins = amountCoins - platformCommission;
            const netFcfa = netCoins * 10;
            const transactionUuid = crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Math.random().toString(36).substring(2, 10)}`;

            await supabase
                .from('organizer_earnings')
                .insert({
                    organizer_id: organizerId,
                    event_id: eventId,
                    transaction_id: transactionUuid,
                    transaction_type: 'ticket_sale',
                    earnings_coins: amountCoins,
                    earnings_fcfa: originalAmount,
                    status: 'pending',
                    platform_commission: platformCommission,
                    platform_fee: platformCommission * 10,
                    net_amount: netFcfa,
                    ticket_count: ticketCount || 1,
                    earning_type: 'ticket_sale',
                    event_type: 'ticketing',
                    description: `💰 Vente de ${ticketCount} tickets via MoneyFusion - ${attendeeName}`,
                    created_at: new Date().toISOString()
                });

            // Mettre à jour le profil de l'organisateur
            const { data: profile } = await supabase
                .from('profiles')
                .select('total_earnings, available_earnings')
                .eq('id', organizerId)
                .single();

            if (profile) {
                await supabase
                    .from('profiles')
                    .update({
                        total_earnings: (profile.total_earnings || 0) + amountCoins,
                        available_earnings: (profile.available_earnings || 0) + amountCoins,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', organizerId);
                console.log(`✅ Profil organisateur mis à jour: +${amountCoins} coins`);
            }
        }

        console.log(`🎉 Traitement terminé pour ${orderId}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                received: true,
                success: true,
                tickets_created: tickets.length > 0,
                ticket_count: tickets.length,
                user_id: finalUserId
            })
        };

    } catch (error) {
        console.error('❌ Erreur webhook:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};