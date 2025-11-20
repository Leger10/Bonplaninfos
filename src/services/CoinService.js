import { supabase } from '@/lib/customSupabaseClient';

    export class CoinService {
      static COIN_RATE = 10; 

      static async initializeRate() {
        const { data } = await supabase
          .from('app_settings')
          .select('coin_to_fcfa_rate')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (data && data.coin_to_fcfa_rate) {
          this.COIN_RATE = data.coin_to_fcfa_rate;
        }
      }

      static convertFcfaToCoins(fcfa) {
        return Math.max(1, Math.ceil(fcfa / this.COIN_RATE));
      }

      static convertCoinsToFcfa(coins) {
        return coins * this.COIN_RATE;
      }

      static async getUserBalance(userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('coin_balance, free_coin_balance')
          .eq('id', userId)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          console.error('Erreur récupération solde', error);
          return 0;
        }
        return (data?.coin_balance || 0) + (data?.free_coin_balance || 0);
      }

      static async debitCoins(userId, coins, purpose, target_id = null, target_type = null) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('coin_balance, free_coin_balance')
          .eq('id', userId)
          .single();

        if (profileError || !profile) throw new Error('Profil utilisateur non trouvé.');
        if ((profile.coin_balance + profile.free_coin_balance) < coins) throw new Error('Solde insuffisant');

        let freeCoinsUsed = 0;
        let paidCoinsUsed = 0;
        
        if(profile.free_coin_balance > 0){
          freeCoinsUsed = Math.min(profile.free_coin_balance, coins);
          paidCoinsUsed = coins - freeCoinsUsed;
        } else {
          paidCoinsUsed = coins;
        }

        const newFreeBalance = profile.free_coin_balance - freeCoinsUsed;
        const newPaidBalance = profile.coin_balance - paidCoinsUsed;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ coin_balance: newPaidBalance, free_coin_balance: newFreeBalance })
          .eq('id', userId);
        if (updateError) throw new Error('Erreur lors du débit: ' + updateError.message);

        const { error: spendingError } = await supabase.from('coin_spending').insert({
          user_id: userId,
          amount: coins,
          spent_from_free: freeCoinsUsed > 0,
          free_coins_used: freeCoinsUsed,
          paid_coins_used: paidCoinsUsed,
          purpose,
          target_id,
          target_type
        });
        if (spendingError) console.error('Erreur lors de l\'enregistrement de la dépense:', spendingError);

        return { freeCoinsUsed, paidCoinsUsed };
      }

      static async creditCoins(userId, coins, purpose, target_id = null, target_type = null) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('coin_balance')
          .eq('id', userId)
          .single();
        
        if (profileError || !profile) throw new Error('Profil utilisateur non trouvé.');

        const newCoinBalance = (profile.coin_balance || 0) + coins;

        await supabase.from('profiles').update({ coin_balance: newCoinBalance }).eq('id', userId);
        
        await supabase.from('user_coin_transactions').insert({
          user_id: userId,
          transaction_id: `manual-credit-${Date.now()}`,
          amount_fcfa: 0,
          total_coins: coins,
          transaction_type: 'manual_credit',
          status: 'completed'
        });
        
        return newCoinBalance;
      }

      static async hasSufficientBalance(userId, requiredCoins) {
        const balance = await this.getUserBalance(userId);
        return balance >= requiredCoins;
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
        const hasBalance = await this.hasSufficientBalance(userId, requiredCoins);

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

    CoinService.initializeRate();