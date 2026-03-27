const { createClient } = require('@supabase/supabase-js');

// Initialiser Supabase avec les variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    console.log('Webhook reçu :', payload);

    const {
      event: eventType,           // 'payin.session.pending', 'payin.session.completed', 'payin.session.cancelled'
      tokenPay,
      personal_Info,
      Montant,                    // montant total payé (incluant les frais)
      frais,
    } = payload;

    // Extraire nos données
    const userId = personal_Info?.[0]?.userId;
    const orderId = personal_Info?.[0]?.orderId; // notre transaction_id

    if (!userId || !orderId) {
      console.error('Données manquantes dans le webhook');
      return { statusCode: 400, body: 'Missing user/order info' };
    }

    // Récupérer la transaction dans la base
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', orderId)
      .single();

    if (fetchError || !payment) {
      console.error('Paiement non trouvé :', orderId);
      return { statusCode: 404, body: 'Payment not found' };
    }

    // Éviter les doublons
    let newStatus = 'pending';
    if (eventType === 'payin.session.completed') newStatus = 'completed';
    if (eventType === 'payin.session.cancelled') newStatus = 'cancelled';

    if (newStatus === payment.status) {
      console.log('Statut déjà à jour, ignoré');
      return { statusCode: 200, body: 'Already processed' };
    }

    // Mettre à jour la transaction
    await supabase
      .from('payments')
      .update({ status: newStatus, processed_at: new Date() })
      .eq('transaction_id', orderId);

    // Si le paiement est complété, créditer les coins
    if (newStatus === 'completed') {
      const couponCode = payment.coupon_code || null;
      // Utiliser le montant net (prix du pack) stocké dans la base
      const netAmount = payment.amount_fcfa;

      console.log('🔍 Appel RPC avec :', { userId, orderId, netAmount, couponCode });

      const { data, error: rpcError } = await supabase.rpc('process_moneyfusion_success', {
        p_user_id: userId,
        p_transaction_id: orderId,
        p_amount: netAmount,               // Montant net (sans frais)
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