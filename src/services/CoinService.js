import { supabase } from '@/lib/customSupabaseClient';
import { retrySupabaseRequest } from '@/lib/supabaseHelper';

export class CoinService {
  static COIN_RATE = 10;

  static async initializeRate() {
  try {
    const { data, error } = await retrySupabaseRequest(() => 
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'coin_to_fcfa_rate')
        .maybeSingle()
    );

    if (error) throw error;

    if (data && data.value) {
      this.COIN_RATE = parseFloat(data.value);
    }
  } catch (error) {
    console.warn("Failed to initialize coin rate:", error);
  }
}

  static convertFcfaToCoins(fcfa) {
    return Math.max(1, Math.ceil(fcfa / this.COIN_RATE));
  }

  static convertCoinsToFcfa(coins) {
    return coins * this.COIN_RATE;
  }

  static async getWalletBalances(userId) {
    try {
      const { data, error } = await retrySupabaseRequest(() => supabase
        .from('profiles')
        .select('coin_balance, free_coin_balance')
        .eq('id', userId)
        .maybeSingle());
      if (error && error.code !== 'PGRST116') {
        console.error('Erreur récupération solde', error);
        return { coin_balance: 0, free_coin_balance: 0, total: 0 };
      }
      const paid = data?.coin_balance || 0;
      const free = data?.free_coin_balance || 0;
      return {
        coin_balance: paid,
        free_coin_balance: free,
        total: paid + free
      };
    } catch (error) {
      console.error('Exception getting wallet balances:', error);
      return { coin_balance: 0, free_coin_balance: 0, total: 0 };
    }
  }

  static async getUserBalance(userId) {
    const balances = await this.getWalletBalances(userId);
    return balances.total;
  }

  static async debitCoins(userId, amount, description, metadata = {}) {
    const balances = await this.getWalletBalances(userId);
    if (balances.total < amount) {
      throw new Error("Solde insuffisant");
    }

    const freeUsed = Math.min(balances.free_coin_balance, amount);
    const paidUsed = amount - freeUsed;

    const { error: updateError } = await retrySupabaseRequest(() => supabase.rpc('debit_user_coins', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: description,
      p_debitor_id: userId
    }));

    if (updateError) {
      console.warn("RPC debit_user_coins failed, using manual update", updateError);
      const { error: manualError } = await retrySupabaseRequest(() => supabase
        .from('profiles')
        .update({
          free_coin_balance: balances.free_coin_balance - freeUsed,
          coin_balance: balances.coin_balance - paidUsed
        })
        .eq('id', userId));
      if (manualError) throw manualError;
      await retrySupabaseRequest(() => supabase.from('coin_transactions').insert({
        user_id: userId,
        amount: -amount,
        type: 'debit',
        description: description,
        metadata: { ...metadata, free_used: freeUsed, paid_used: paidUsed }
      }));
    }
    return true;
  }

  static async addCredits(userId, amountFcfa, transactionId, couponCode = null) {
    try {
      console.log(`[CoinService.addCredits] Calling RPC process_moneyfusion_success for user ${userId}, amount ${amountFcfa}, txn ${transactionId}, coupon ${couponCode}`);
      const { data, error } = await supabase.rpc('process_moneyfusion_success', {
        p_user_id: userId,
        p_transaction_id: transactionId,
        p_amount: amountFcfa,
        p_status: 'success',
        p_coupon_code: couponCode
      });
      if (error) {
        console.error("[CoinService.addCredits] RPC Error:", error);
        throw error;
      }
      console.log(`[CoinService.addCredits] RPC Success:`, data);
      return data;
    } catch (error) {
      console.error("[CoinService.addCredits] Exception:", error);
      throw error;
    }
  }

  /**
   * Appelle la fonction serverless qui crée la demande de paiement via l'API MoneyFusion
   * @returns {Promise<string>} L'URL de redirection vers MoneyFusion
   */
  static async createMoneyFusionPayment({
    amountFcfa,
    userId,
    packId,
    transactionId,
    couponCode,
    returnUrl,
    webhookUrl
  }) {
    const response = await fetch('/.netlify/functions/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalPrice: amountFcfa,
        article: [{ [packId || 'custom']: amountFcfa }],
        personal_Info: [{ userId, orderId: transactionId }],
        numeroSend: '54329299', // À adapter avec le téléphone de l'utilisateur si disponible
        nomclient: 'Client',
        return_url: returnUrl,
        webhook_url: webhookUrl
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.redirect_url;
  }

  /**
   * Méthode principale pour gérer une action nécessitant des crédits.
   * Si l'utilisateur a assez de crédits, exécute onSuccess().
   * Sinon, lance le processus d'achat via MoneyFusion.
   */
  static async handleAction({ userId, requiredCoins, onSuccess, onInsufficientBalance, ...paymentData }) {
    const balance = await this.getUserBalance(userId);
    const hasBalance = balance >= requiredCoins;

    if (hasBalance) {
      await onSuccess();
    } else if (onInsufficientBalance) {
      onInsufficientBalance();
    } else {
      const txnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      // Enregistrer la transaction pending
      await supabase.from('payments').insert({
        user_id: userId,
        coins_amount: paymentData.coinsAmount,
        amount_fcfa: paymentData.amountFcfa,
        status: 'pending',
        payment_method: 'moneyfusion',
        transaction_id: txnId,
        pack_id: paymentData.packId,
      });

      const returnUrl = `${window.location.origin}/payment-success?transaction_id=${txnId}&amount=${paymentData.amountFcfa}&status=success`;
      const webhookUrl = `${window.location.origin}/.netlify/functions/moneyfusion-webhook`;

      const redirectUrl = await this.createMoneyFusionPayment({
        amountFcfa: paymentData.amountFcfa,
        userId,
        packId: paymentData.packId,
        transactionId: txnId,
        couponCode: paymentData.couponCode,
        returnUrl,
        webhookUrl
      });

      window.location.href = redirectUrl;
    }
  }
}

// Initialiser le taux de conversion au chargement
CoinService.initializeRate().catch(err => console.warn("Failed to init coin rate:", err));