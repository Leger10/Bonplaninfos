import { supabase } from '@/lib/customSupabaseClient';
import { retrySupabaseRequest } from '@/lib/supabaseHelper';

export class CoinService {
  static COIN_RATE = 10; 

  static async initializeRate() {
    try {
      const { data } = await retrySupabaseRequest(() => supabase
        .from('app_settings')
        .select('coin_to_fcfa_rate')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle());
        
      if (data && data.coin_to_fcfa_rate) {
        this.COIN_RATE = data.coin_to_fcfa_rate;
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

  static generateMoneyFusionLink(data) {
    const returnUrl = `${window.location.origin}/paiement/success?action=${data.action}&userId=${data.userId}&amount=${data.amountFcfa}&packId=${data.packId || ''}`;
    const cancelUrl = `${window.location.origin}/paiement/cancel`;

    const params = new URLSearchParams({
      amount: data.amountFcfa.toString(),
      userId: data.userId,
      packId: data.packId || '',
      action: data.action,
      email: data.email || '',
      phone: data.phone || '',
      return_url: returnUrl,
      cancel_url: cancelUrl
    });
    
    return `https://www.pay.moneyfusion.net/bonplaninfos/bed9acd64772611a/pay/?${params.toString()}`;
  }

  static async handleAction({ userId, requiredCoins, onSuccess, onInsufficientBalance, ...paymentData }) {
    const balance = await this.getUserBalance(userId);
    const hasBalance = balance >= requiredCoins;

    if (hasBalance) {
      await onSuccess();
    } else if (onInsufficientBalance) {
      onInsufficientBalance();
    } else {
      const url = this.generateMoneyFusionLink({
        userId,
        ...paymentData
      });
      window.location.href = url;
    }
  }
}

CoinService.initializeRate().catch(err => console.warn("Failed to init coin rate:", err));