// netlify/functions/moneyfusion-ticket-webhook.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// 🔥 FONCTION POUR CRÉER DIRECTEMENT LES TICKETS DANS tickets
// ============================================================
const createTicketsDirectly = async (eventId, userId, attendeeName, orderId, cart, ticketTypes, originalAmount) => {
    try {
        const tickets = [];
        const ticketCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
        
        if (ticketCount === 0) {
            return { success: false, error: 'Aucun ticket à créer' };
        }

        // Récupérer les types de tickets de l'événement
        const { data: ticketTypesData, error: typesError } = await supabase
            .from('ticket_types')
            .select('id, name, price, color')
            .eq('event_id', eventId);
        
        if (typesError) {
            console.error('❌ Erreur récupération ticket_types:', typesError);
            return { success: false, error: typesError };
        }
        
        // Pour chaque type de ticket dans le panier
        for (const [ticketTypeId, quantity] of Object.entries(cart)) {
            const ticketType = ticketTypesData.find(t => t.id === ticketTypeId);
            
            for (let i = 0; i < quantity; i++) {
                const ticketId = crypto.randomUUID ? crypto.randomUUID() : `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                const ticketCodeShort = `${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                
                tickets.push({
                    id: ticketId,
                    event_id: eventId,
                    user_id: userId,
                    status: 'active',
                    payment_method: 'moneyfusion_ticket',
                    transaction_reference: orderId,
                    attendee_name: attendeeName || 'Invité',
                    purchased_at: new Date().toISOString(),
                    qr_code: qrCode,
                    ticket_code_short: ticketCodeShort,
                    ticket_number: `TKT-${Date.now()}-${i+1}`,
                    purchase_price_pi: Math.floor(originalAmount / 10 / ticketCount),
                    ticket_type_id: ticketTypeId || null
                });
            }
        }
        
        if (tickets.length === 0) {
            return { success: false, error: 'Aucun ticket à créer' };
        }
        
        // 🔥 INSERTION DIRECTE DANS LA TABLE tickets (PAS event_tickets)
        const { error: insertError } = await supabase
            .from('tickets')
            .insert(tickets);
        
        if (insertError) {
            console.error('❌ Erreur insertion tickets:', insertError);
            return { success: false, error: insertError };
        }
        
        console.log(`✅ ${tickets.length} tickets créés dans tickets`);
        
        return { success: true, tickets, ticket_count: tickets.length };
        
    } catch (error) {
        console.error('❌ Erreur createTicketsDirectly:', error);
        return { success: false, error: error.message };
    }
};

// ============================================================
// 🔥 FONCTION PRINCIPALE
// ============================================================
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
        console.log('📦 Webhook Ticket MoneyFusion reçu:', JSON.stringify(payload, null, 2));

        const {
            event: eventType,
            personal_Info,
            tokenPay,
            numeroSend,
            nomclient,
            numeroTransaction,
            Montant,
            statut
        } = payload;

        const userId = personal_Info?.[0]?.userId;
        const orderId = personal_Info?.[0]?.orderId;
        const eventId = personal_Info?.[0]?.eventId;
        const cart = personal_Info?.[0]?.cart;
        const promoCodeId = personal_Info?.[0]?.promoCodeId;
        const commissionAmount = personal_Info?.[0]?.commissionAmount || 0;
        const isGuest = personal_Info?.[0]?.isGuest || false;
        const userEmail = personal_Info?.[0]?.userEmail || null;
        
        const attendeeName = personal_Info?.[0]?.attendeeName || 
                            personal_Info?.[0]?.nomclient || 
                            nomclient || 
                            'Invité';
        
        const originalAmount = personal_Info?.[0]?.amountFcfa || Montant || 0;
        const amountWithFees = personal_Info?.[0]?.amountWithFees || Montant || 0;
        const ticketTypes = personal_Info?.[0]?.ticketTypes || [];

        console.log(`📊 Événement: ${eventType}, Statut: ${statut}`);
        console.log(`💰 Montant: ${originalAmount} FCFA, Nom: ${attendeeName}`);
        console.log(`👤 Invité: ${isGuest}, UserId: ${userId}`);

        if (eventType === 'payin.session.completed' || statut === 'paid') {
            console.log(`✅ Paiement réussi pour ${orderId}`);

            // --- 1. Gérer l'utilisateur (invité ou connecté) ---
            let finalUserId = userId;
            
            if (isGuest || !userId || userId.startsWith('guest_')) {
                console.log('👤 Création compte invité...');
                
                if (userEmail) {
                    const { data: existingUser } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', userEmail)
                        .maybeSingle();
                    
                    if (existingUser) {
                        finalUserId = existingUser.id;
                        console.log(`✅ Utilisateur existant: ${finalUserId}`);
                    }
                }
                
                if (!finalUserId || finalUserId.startsWith('guest_')) {
                    const newUserId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                    
                    await supabase
                        .from('profiles')
                        .insert({
                            id: newUserId,
                            email: userEmail || `guest_${Date.now()}@temp.com`,
                            full_name: attendeeName,
                            phone: numeroSend || '',
                            user_type: 'guest',
                            created_at: new Date().toISOString()
                        });
                    
                    finalUserId = newUserId;
                    console.log(`✅ Compte invité créé: ${finalUserId}`);
                }
            }

            // --- 2. 🔥 CRÉER LES TICKETS DIRECTEMENT DANS tickets ---
            const ticketResult = await createTicketsDirectly(
                eventId,
                finalUserId,
                attendeeName,
                orderId,
                cart,
                ticketTypes,
                originalAmount
            );

            if (!ticketResult.success) {
                console.error('❌ Erreur création tickets:', ticketResult.error);
            } else {
                console.log(`✅ ${ticketResult.ticket_count} tickets créés`);
            }

            // --- 3. CRÉER LE PAIEMENT ---
            const coinsAmount = Math.floor(originalAmount / 10);
            
            await supabase
                .from('payments')
                .insert({
                    user_id: finalUserId,
                    coins_amount: coinsAmount,
                    amount_fcfa: originalAmount,
                    status: 'completed',
                    payment_method: 'moneyfusion_ticket',
                    transaction_id: orderId,
                    pack_id: 'ticket_payment',
                    credits_added: false,
                    created_at: new Date().toISOString(),
                    processed_at: new Date().toISOString(),
                    coupon_code: promoCodeId ? await getPromoCode(promoCodeId) : null,
                    coupon_owner_id: promoCodeId ? await getPromoCodeOwner(promoCodeId) : null,
                    coupon_commission: commissionAmount || 0
                });

            // --- 4. CRÉER LES GAINS DE L'ORGANISATEUR ---
            const { data: eventData } = await supabase
                .from('events')
                .select('organizer_id, title')
                .eq('id', eventId)
                .single();

            if (eventData) {
                const organizerId = eventData.organizer_id;
                const amountCoins = Math.floor(originalAmount / 10);
                const platformCommission = Math.floor(amountCoins * 0.05);
                const netCoins = amountCoins - platformCommission;
                const netFcfa = netCoins * 10;

                await supabase
                    .from('organizer_earnings')
                    .insert({
                        organizer_id: organizerId,
                        event_id: eventId,
                        transaction_id: orderId,
                        transaction_type: 'ticket_sale',
                        earnings_coins: netCoins,
                        earnings_fcfa: netFcfa,
                        status: 'pending',
                        platform_commission: platformCommission,
                        platform_fee: platformCommission * 10,
                        net_amount: netFcfa,
                        ticket_count: ticketResult?.ticket_count || 1,
                        earning_type: 'ticket_sale',
                        event_type: 'ticketing',
                        description: `💰 Vente de ${ticketResult?.ticket_count || 1} tickets via MoneyFusion - ${attendeeName}`,
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
                            total_earnings: (profile.total_earnings || 0) + netCoins,
                            available_earnings: (profile.available_earnings || 0) + netCoins,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', organizerId);
                    console.log(`✅ Profil organisateur mis à jour: +${netCoins} coins`);
                }
            }

            console.log(`🎉 Traitement terminé pour ${orderId}`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    received: true,
                    success: true,
                    tickets_created: ticketResult?.success || false,
                    ticket_count: ticketResult?.ticket_count || 0,
                    user_id: finalUserId,
                    is_guest: isGuest,
                    attendee_name: attendeeName
                })
            };
        }

        console.log(`ℹ️ Événement non traité: ${eventType}`);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                received: true,
                event: eventType,
                message: 'Événement reçu'
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

// Fonctions helper
async function getPromoCode(promoCodeId) {
    const { data } = await supabase
        .from('promo_codes')
        .select('code')
        .eq('id', promoCodeId)
        .single();
    return data?.code || null;
}

async function getPromoCodeOwner(promoCodeId) {
    const { data } = await supabase
        .from('promo_codes')
        .select('influencer_id')
        .eq('id', promoCodeId)
        .single();
    return data?.influencer_id || null;
}