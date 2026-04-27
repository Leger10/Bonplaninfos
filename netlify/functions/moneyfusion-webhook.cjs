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

    const { event: eventType, personal_Info, Montant, statut } = payload;

    // Vérifier le type d'événement
    if (eventType !== 'payin.session.completed') {
      console.log(`ℹ️ Événement ignoré: ${eventType}`);
      return { statusCode: 200, body: 'Event ignored' };
    }

    // ✅ Vérifier le statut du paiement (accepte SUCCESS, paid, PAID)
    const isSuccess = statut === 'SUCCESS' || statut === 'paid' || statut === 'PAID';
    if (!isSuccess) {
      console.log(`⚠️ Paiement non réussi, statut: ${statut}`);
      return { statusCode: 200, body: 'Payment not successful' };
    }

    const userId = personal_Info?.[0]?.userId;
    const orderId = personal_Info?.[0]?.orderId;
    const couponCode = personal_Info?.[0]?.couponCode || null;
    const amountFcfa = personal_Info?.[0]?.amountFcfa || Montant || 0;

    if (!userId || !orderId) {
      console.error('❌ Données manquantes:', { userId, orderId });
      return { statusCode: 400, body: 'Missing user/order info' };
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

    // Vérifier si déjà traité
    if (payment.status === 'completed') {
      console.log('⚠️ Paiement déjà traité');
      return { statusCode: 200, body: 'Already processed' };
    }

    // Vérifier si le paiement est en annulation
    if (payment.status === 'cancelled') {
      console.log('⚠️ Paiement annulé, aucun traitement');
      return { statusCode: 200, body: 'Payment cancelled' };
    }

    // ============================================
    // 1. AJOUTER LES CRÉDITS À L'ACHETEUR
    // ============================================
    const coinsToAdd = payment.coins_amount;
    
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single();

    if (buyerError) {
      console.error('❌ Erreur récupération profil acheteur:', buyerError);
    }

    const newBalance = (buyerProfile?.coin_balance || 0) + coinsToAdd;
    
    const { error: updateBuyerError } = await supabase
      .from('profiles')
      .update({ 
        coin_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateBuyerError) {
      console.error('❌ Erreur mise à jour crédits acheteur:', updateBuyerError);
      throw new Error(`Failed to update buyer credits: ${updateBuyerError.message}`);
    }

    console.log(`✅ ${coinsToAdd} crédits ajoutés à l'acheteur ${userId}`);

    // ============================================
    // 2. TRAITER LE COUPON (COMMISSION POUR LE PARRAIN)
    // ============================================
    let commissionCredited = 0;
    let couponOwnerId = null;
    
    const finalCouponCode = payment.coupon_code || couponCode;
    
    if (finalCouponCode && finalCouponCode !== 'null' && finalCouponCode !== '') {
      console.log(`🎫 Traitement du coupon: ${finalCouponCode}`);
      
      // Vérifier le coupon
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', finalCouponCode)
        .single();

      if (couponError) {
        console.error('❌ Erreur récupération coupon:', couponError);
      } else if (!coupon.active) {
        console.log(`⚠️ Coupon ${finalCouponCode} est désactivé, commission non créditée`);
      } else if (coupon.user_id === userId) {
        console.log(`⚠️ L'utilisateur ne peut pas utiliser son propre coupon, commission non créditée`);
      } else {
        // Calculer la commission (2%)
        const commission = Math.floor(amountFcfa * 0.02);
        
        if (commission > 0) {
          // Vérifier si ce coupon a déjà été utilisé pour cette transaction
          const { data: existingUsage } = await supabase
            .from('coupon_usages')
            .select('id')
            .eq('payment_id', payment.id)
            .eq('coupon_code', finalCouponCode)
            .maybeSingle();

          if (!existingUsage) {
            // Enregistrer l'utilisation
            await supabase
              .from('coupon_usages')
              .insert({
                coupon_code: finalCouponCode,
                user_id: userId,
                owner_id: coupon.user_id,
                payment_id: payment.id,
                transaction_id: orderId,
                amount_fcfa: amountFcfa,
                commission_amount: commission,
                status: 'completed',
                commission_credited_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
          }

          // Mettre à jour les statistiques du coupon
          await supabase
            .from('coupons')
            .update({
              usage_count: (coupon.usage_count || 0) + 1,
              total_amount: (coupon.total_amount || 0) + amountFcfa,
              commission_earned: (coupon.commission_earned || 0) + commission,
              last_used_at: new Date().toISOString()
            })
            .eq('code', finalCouponCode);

          // ============================================
          // ✅ CRÉDITER LE PROPRIÉTAIRE DU COUPON
          // ============================================
          const commissionCoins = Math.floor(commission / 10); // 10 FCFA = 1 crédit
          
          const { data: ownerProfile, error: ownerError } = await supabase
            .from('profiles')
            .select('coin_balance, available_earnings')
            .eq('id', coupon.user_id)
            .single();

          if (ownerError) {
            console.error('❌ Erreur récupération profil propriétaire:', ownerError);
          } else {
            const newOwnerBalance = (ownerProfile?.coin_balance || 0) + commissionCoins;
            const newAvailableEarnings = (ownerProfile?.available_earnings || 0) + commission;
            
            const { error: updateOwnerError } = await supabase
              .from('profiles')
              .update({
                coin_balance: newOwnerBalance,
                available_earnings: newAvailableEarnings,
                updated_at: new Date().toISOString()
              })
              .eq('id', coupon.user_id);

            if (updateOwnerError) {
              console.error('❌ Erreur crédit commission propriétaire:', updateOwnerError);
            } else {
              commissionCredited = commission;
              couponOwnerId = coupon.user_id;
              console.log(`✅ Commission de ${commission} FCFA (${commissionCoins} crédits) créditée au parrain ${coupon.user_id}`);
              console.log(`   Nouveau available_earnings: ${newAvailableEarnings} FCFA`);
            }
          }

          // ============================================
          // ENREGISTRER LA TRANSACTION DE COMMISSION
          // ============================================
          await supabase
            .from('transactions')
            .insert({
              user_id: coupon.user_id,
              transaction_type: 'commission',
              amount_pi: commissionCoins,
              amount_fcfa: commission,
              status: 'completed',
              description: `Commission de parrainage (2%) pour l'utilisation du coupon ${finalCouponCode}`,
              reference_id: payment.id,
              metadata: {
                coupon_code: finalCouponCode,
                buyer_id: userId,
                payment_id: payment.id,
                amount_fcfa: amountFcfa,
                commission_rate: 2
              },
              created_at: new Date().toISOString()
            });
        }
      }
    }

    // ============================================
    // 3. METTRE À JOUR LE STATUT DU PAIEMENT
    // ============================================
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({ 
        status: 'completed', 
        processed_at: new Date().toISOString(),
        credits_added: true,
        coupon_commission: commissionCredited,
        coupon_owner_id: couponOwnerId
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('❌ Erreur mise à jour paiement:', updatePaymentError);
    }

    // ============================================
    // 4. ENREGISTRER LA TRANSACTION PRINCIPALE
    // ============================================
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_type: 'credit_purchase',
        amount_pi: coinsToAdd,
        amount_fcfa: amountFcfa,
        status: 'completed',
        description: `Achat de ${coinsToAdd} crédits`,
        reference_id: payment.id,
        metadata: {
          pack_id: payment.pack_id,
          coupon_used: finalCouponCode || null,
          commission_credited: commissionCredited,
          transaction_id: orderId
        },
        created_at: new Date().toISOString()
      });

    console.log(`🎉 Transaction ${orderId} complétée avec succès`);
    console.log(`📊 Résumé:`);
    console.log(`   - Acheteur: +${coinsToAdd} crédits`);
    console.log(`   - Parrain: +${commissionCredited} FCFA (${Math.floor(commissionCredited / 10)} crédits)`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        coins_added: coinsToAdd,
        commission_credited: commissionCredited,
        coupon_owner_id: couponOwnerId
      }),
    };
    
  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    
    // Tentative d'enregistrement de l'erreur
    try {
      await supabase
        .from('webhook_errors')
        .insert({
          error: error.message,
          payload: event.body,
          timestamp: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Impossible de logger l\'erreur:', logError);
    }
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};