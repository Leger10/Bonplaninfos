const { createClient } = require('@supabase/supabase-js');

// Utiliser la clé service_role pour contourner RLS (le webhook doit pouvoir tout modifier)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    console.log('Webhook reçu :', payload);

    const {
      event: eventType,
      tokenPay,
      personal_Info,
      Montant,
      frais,
    } = payload;

    const userId = personal_Info?.[0]?.userId;
    const orderId = personal_Info?.[0]?.orderId;

    if (!userId || !orderId) {
      console.error('Données manquantes dans le webhook');
      return { statusCode: 400, body: 'Missing user/order info' };
    }

    // Récupérer la transaction
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', orderId)
      .single();

    if (fetchError || !payment) {
      console.error('Paiement non trouvé :', orderId);
      return { statusCode: 404, body: 'Payment not found' };
    }

    let newStatus = 'pending';
    if (eventType === 'payin.session.completed') newStatus = 'completed';
    if (eventType === 'payin.session.cancelled') newStatus = 'cancelled';

    if (newStatus === payment.status) {
      console.log('Statut déjà à jour, ignoré');
      return { statusCode: 200, body: 'Already processed' };
    }

    // Mettre à jour le statut
    await supabase
      .from('payments')
      .update({ status: newStatus, processed_at: new Date() })
      .eq('transaction_id', orderId);

    if (newStatus === 'completed') {
      const couponCode = payment.coupon_code || null;
      const netAmount = payment.amount_fcfa;

      console.log('🔍 Appel RPC avec :', { userId, orderId, netAmount, couponCode });

      const { data, error: rpcError } = await supabase.rpc('process_moneyfusion_success', {
        p_user_id: userId,
        p_transaction_id: orderId,
        p_amount: netAmount,
        p_status: 'success',
        p_coupon_code: couponCode,
      });

      if (rpcError) {
        console.error('❌ Erreur RPC détaillée :', rpcError);
        return { statusCode: 500, body: JSON.stringify({ error: rpcError.message }) };
      }

      console.log('✅ RPC success :', data);
      console.log(`Utilisateur ${userId} crédité de ${data.coins_added} coins.`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Erreur webhook :', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
};