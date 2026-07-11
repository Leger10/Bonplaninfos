// netlify/functions/moneyfusion-ticket-webhook.cjs
const { createClient } = require('@supabase/supabase-js');

// 🔥 UTILISER LA CLÉ SERVICE_ROLE
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Présent' : '❌ Manquant');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Présent' : '❌ Manquant');
    throw new Error('Variables d\'environnement Supabase manquantes');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 🔥 FONCTION POUR CRÉER UN EMAIL À PARTIR DU NOM
const generateEmailFromName = (fullName) => {
    // Nettoyer le nom : supprimer les accents, espaces, caractères spéciaux
    const cleanName = fullName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/\s+/g, '') // Supprimer les espaces
        .replace(/[^a-z0-9]/g, ''); // Supprimer les caractères spéciaux
    
    return `${cleanName}@gmail.com`;
};

// 🔥 FONCTION POUR CRÉER UN COMPTE UTILISATEUR
const createUserAccount = async (fullName, phoneNumber) => {
    try {
        // 1. Générer l'email à partir du nom
        const email = generateEmailFromName(fullName);
        const password = '000000';
        
        console.log('📧 Création compte utilisateur:', { 
            email, 
            fullName, 
            phoneNumber,
            password: '000000'
        });

        // 2. Vérifier si l'utilisateur existe déjà
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 100
        });

        if (!listError && existingUsers) {
            const existingUser = existingUsers.users.find(u => u.email === email);
            if (existingUser) {
                console.log('✅ Utilisateur existant trouvé:', existingUser.id);
                
                // Mettre à jour le profil si nécessaire
                await supabase
                    .from('profiles')
                    .upsert({
                        id: existingUser.id,
                        email: email,
                        full_name: fullName,
                        phone: phoneNumber,
                        user_type: 'user',
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                
                return existingUser.id;
            }
        }

        // 3. Créer l'utilisateur dans auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                phone: phoneNumber
            }
        });

        if (authError) {
            console.error('❌ Erreur création auth:', authError);
            
            // Fallback: créer un ID invité
            const guestId = crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Math.random().toString(36).substring(2, 10)}`;
            console.log('👤 ID invité (fallback):', guestId);
            
            // Créer un profil invité
            await supabase
                .from('profiles')
                .upsert({
                    id: guestId,
                    email: email,
                    full_name: fullName,
                    phone: phoneNumber,
                    user_type: 'user',
                    created_at: new Date().toISOString()
                }, { onConflict: 'id' });
            
            return guestId;
        }

        if (!authUser || !authUser.user) {
            throw new Error('Création utilisateur échouée');
        }

        const userId = authUser.user.id;
        console.log('✅ Compte utilisateur créé:', { userId, email });

        // 4. Créer le profil
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                full_name: fullName,
                phone: phoneNumber,
                user_type: 'user',
                created_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (profileError) {
            console.warn('⚠️ Erreur création profil:', profileError.message);
        } else {
            console.log('✅ Profil utilisateur créé');
        }

        return userId;

    } catch (error) {
        console.error('❌ Erreur création compte:', error);
        
        // Fallback: créer un ID invité
        const guestId = crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Math.random().toString(36).substring(2, 10)}`;
        console.log('👤 ID invité (fallback):', guestId);
        
        // Créer un profil invité
        await supabase
            .from('profiles')
            .upsert({
                id: guestId,
                email: `guest_${Date.now()}@temp.com`,
                full_name: fullName || 'Invité',
                phone: phoneNumber || '',
                user_type: 'user',
                created_at: new Date().toISOString()
            }, { onConflict: 'id' });
        
        return guestId;
    }
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
        const phoneNumber = info.phone || '';

        console.log('✅ Paiement réussi:', { 
            orderId, 
            eventId, 
            attendeeName, 
            originalAmount, 
            isGuest,
            phoneNumber 
        });

        // --- 1. Créer le compte utilisateur ---
        let finalUserId;
        
        if (isGuest || !info.userId || info.userId.startsWith('guest_')) {
            console.log(`👤 Création compte pour: ${attendeeName} (${phoneNumber})`);
            finalUserId = await createUserAccount(attendeeName, phoneNumber);
            console.log('✅ ID utilisateur final:', finalUserId);
        } else {
            finalUserId = info.userId;
            console.log('👤 Utilisateur existant:', finalUserId);
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
                user_id: finalUserId,
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

        // --- 3. Insérer les tickets ---
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

        // --- 4. Mettre à jour le paiement ---
        await supabase
            .from('payments')
            .update({
                status: 'completed',
                processed_at: new Date().toISOString(),
                user_id: finalUserId,
                payment_method: 'moneyfusion_ticket'
            })
            .eq('transaction_id', orderId);

        // --- 5. Créer les gains de l'organisateur ---
        const { data: eventData } = await supabase
            .from('events')
            .select('organizer_id')
            .eq('id', eventId)
            .single();

        if (eventData) {
            const organizerId = eventData.organizer_id;
            const amountCoins = Math.floor(originalAmount / 10);
            const platformCommission = Math.floor(amountCoins * 0.05);
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
                    net_amount: (amountCoins - platformCommission) * 10,
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
                user_id: finalUserId,
                email: generateEmailFromName(attendeeName),
                password: '000000'
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