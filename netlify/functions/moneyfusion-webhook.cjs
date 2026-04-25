const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    console.log('📦 Webhook reçu:', JSON.stringify(payload, null, 2));

    const { event: eventType, personal_Info, Montant } = payload;

    const userId = personal_Info?.[0]?.userId;
    const orderId = personal_Info?.[0]?.orderId;
    const couponCode = personal_Info?.[0]?.couponCode || null;
    const amountFcfa = personal_Info?.[0]?.amountFcfa || Montant || 0;

    if (!userId || !orderId) {
      console.error('❌ Données manquantes:', { userId, orderId });
      return { statusCode: 400, body: 'Missing user/order info' };
    }

    // Vérifier le type d'événement
    if (eventType !== 'payin.session.completed') {
      console.log(`ℹ️ Événement ignoré: ${eventType}`);
      return { statusCode: 200, body: 'Event ignored' };
    }

    console.log(`💰 Paiement confirmé pour user ${userId}, montant ${amountFcfa} FCFA`);

    // Récupérer le paiement en attente
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', orderId)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Paiement non trouvé:', orderId);
      return { statusCode: 404, body: 'Payment not found' };
    }

    if (payment.status === 'completed') {
      console.log('⚠️ Paiement déjà traité');
      return { statusCode: 200, body: 'Already processed' };
    }

    // 1. Ajouter les crédits à l'acheteur
    const coinsToAdd = payment.coins_amount;
    
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    const newBalance = (buyerProfile?.coin_balance || 0) + coinsToAdd;
    
    await supabase
      .from('profiles')
      .update({ 
        coin_balance: newBalance,
        updated_at: new Date()
      })
      .eq('id', userId);

    console.log(`✅ ${coinsToAdd} crédits ajoutés à l'acheteur ${userId}`);

    // 2. Traiter le coupon si présent
    let commissionCredited = 0;
    
    if (couponCode && couponCode !== 'null' && couponCode !== '') {
      console.log(`🎫 Traitement du coupon: ${couponCode}`);
      
      // Vérifier le coupon
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('active', true)
        .single();

      if (!couponError && coupon && coupon.user_id !== userId) {
        // Calculer la commission (2%)
        const commission = Math.round(amountFcfa * 0.02);
        
        // Enregistrer l'utilisation
        await supabase
          .from('coupon_usages')
          .insert({
            coupon_code: couponCode,
            user_id: coupon.user_id,
            transaction_id: orderId,
            amount: amountFcfa,
            commission: commission,
            created_at: new Date()
          });
        
        // Mettre à jour les stats du coupon
        await supabase
          .from('coupons')
          .update({
            usage_count: (coupon.usage_count || 0) + 1,
            total_amount: (coupon.total_amount || 0) + amountFcfa,
            commission_earned: (coupon.commission_earned || 0) + commission,
            last_used_at: new Date()
          })
          .eq('code', couponCode);
        
        // Créditer le propriétaire du coupon
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('available_earnings')
          .eq('id', coupon.user_id)
          .single();
        
        const newEarnings = (ownerProfile?.available_earnings || 0) + commission;
        
        await supabase
          .from('profiles')
          .update({
            available_earnings: newEarnings,
            updated_at: new Date()
          })
          .eq('id', coupon.user_id);
        
        commissionCredited = commission;
        console.log(`✅ Commission de ${commission} FCFA créditée au parrain ${coupon.user_id}`);
      } else if (coupon && coupon.user_id === userId) {
        console.log(`⚠️ L'utilisateur ne peut pas utiliser son propre coupon`);
      }
    }

    // 3. Mettre à jour le statut du paiement
    await supabase
      .from('payments')
      .update({ 
        status: 'completed', 
        processed_at: new Date() 
      })
      .eq('transaction_id', orderId);

    // 4. Enregistrer la transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_type: 'credit_purchase',
        amount_pi: coinsToAdd,
        amount_fcfa: amountFcfa,
        status: 'completed',
        description: `Achat de ${coinsToAdd} crédits`,
        metadata: {
          pack_id: payment.pack_id,
          coupon_used: couponCode || null,
          commission_credited: commissionCredited,
          transaction_id: orderId
        },
        created_at: new Date()
      });

    console.log(`🎉 Transaction ${orderId} complétée avec succès`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        coins_added: coinsToAdd,
        commission_credited: commissionCredited
      }),
    };
    
  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};