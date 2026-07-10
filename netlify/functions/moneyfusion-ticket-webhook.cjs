// netlify/functions/moneyfusion-ticket-webhook.js
const { createClient } = require('@supabase/supabase-js');

// Initialisation de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// 🔥 FONCTION PRINCIPALE - CRÉE TOUT AUTOMATIQUEMENT
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

        // Extraire les informations
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
        const feesAmount = amountWithFees - originalAmount;

        console.log(`📊 Événement: ${eventType}, Statut: ${statut}`);
        console.log(`💰 Montant: ${originalAmount} FCFA, Nom: ${attendeeName}`);

        // ============================================================
        // 🔥 SEULEMENT SI PAIEMENT RÉUSSI
        // ============================================================
        if (eventType === 'payin.session.completed' || statut === 'paid') {
            console.log(`✅ Paiement réussi pour ${orderId}`);

            // --- 1. Gérer l'utilisateur (invité ou connecté) ---
            let finalUserId = userId;
            
            if (isGuest || !userId || userId.startsWith('guest_')) {
                console.log('👤 Création compte invité...');
                
                // Vérifier si l'utilisateur existe déjà
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
                
                // Créer un nouvel utilisateur si nécessaire
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

            // --- 2. Calculer le nombre de tickets ---
            let ticketCount = 0;
            if (cart) {
                ticketCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
            }
            console.log(`🎫 Tickets: ${ticketCount}`);

            // --- 3. CRÉER LES TICKETS ---
            const finalAmount = Math.floor(originalAmount / 10);
            
            const { data: ticketResult, error: ticketError } = await supabase.rpc('purchase_tickets_v2', {
                p_user_id: finalUserId,
                p_event_id: eventId,
                p_cart: cart,
                p_final_amount: finalAmount,
                p_promo_code_id: promoCodeId || null,
                p_commission_amount: commissionAmount || 0,
                p_payment_method: 'moneyfusion_ticket',
                p_transaction_reference: orderId,
                p_attendee_name: attendeeName
            });

            if (ticketError || !ticketResult?.success) {
                console.error('❌ Erreur tickets:', ticketError || ticketResult?.message);
                // On continue quand même pour créer le paiement et les gains
            } else {
                console.log(`✅ ${ticketResult.tickets_count || 0} tickets créés`);
            }

            // --- 4. CRÉER LE PAIEMENT DANS payments ---
            const coinsAmount = Math.floor(originalAmount / 10);
            
            const { error: paymentError } = await supabase
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
                    metadata: {
                        event_id: eventId,
                        cart: cart,
                        attendee_name: attendeeName,
                        ticket_count: ticketCount,
                        payment_method: 'moneyfusion_ticket',
                        is_guest: isGuest
                    }
                });

            if (paymentError) {
                console.error('❌ Erreur paiement:', paymentError);
            } else {
                console.log('✅ Paiement enregistré');
            }

            // --- 5. 🔥 CRÉER LES GAINS DE L'ORGANISATEUR (AUTOMATIQUE) ---
            // Récupérer l'organisateur
            const { data: eventData } = await supabase
                .from('events')
                .select('organizer_id, title')
                .eq('id', eventId)
                .single();

            if (eventData) {
                const organizerId = eventData.organizer_id;
                const eventTitle = eventData.title;

                // Calculs
                const amountCoins = Math.floor(originalAmount / 10);
                const platformCommission = Math.floor(amountCoins * 0.05);
                const netCoins = amountCoins - platformCommission;
                const netFcfa = netCoins * 10;

                // Vérifier si le gain existe déjà
                const { data: existingEarning } = await supabase
                    .from('organizer_earnings')
                    .select('id')
                    .eq('transaction_id', orderId)
                    .maybeSingle();

                if (!existingEarning) {
                    // Créer le gain
                    const { error: earningsError } = await supabase
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
                            ticket_count: ticketCount || 1,
                            earning_type: 'ticket_sale',
                            event_type: 'ticketing',
                            description: `Vente de ${ticketCount || 1} tickets via MoneyFusion - ${attendeeName}`,
                            metadata: {
                                event_title: eventTitle,
                                attendee_name: attendeeName,
                                payment_method: 'moneyfusion_ticket',
                                original_amount_fcfa: originalAmount,
                                ticket_count: ticketCount || 1
                            },
                            created_at: new Date().toISOString()
                        });

                    if (earningsError) {
                        console.error('❌ Erreur gains:', earningsError);
                    } else {
                        console.log(`✅ Gains créés: ${netCoins} coins pour ${organizerId}`);

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
                            console.log('✅ Profil organisateur mis à jour');
                        }
                    }
                } else {
                    console.log(`⚠️ Gain déjà existant pour ${orderId}`);
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
                    user_id: finalUserId,
                    is_guest: isGuest,
                    attendee_name: attendeeName
                })
            };
        }

        // Autres statuts
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