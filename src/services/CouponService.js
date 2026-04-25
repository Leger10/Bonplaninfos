import { supabase } from '@/lib/customSupabaseClient';
import { retrySupabaseRequest } from '@/lib/supabaseHelper';

export class CouponService {
  static generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static async createCoupon(userId) {
    try {
      let code = this.generateCode();
      let existing = true;
      while (existing) {
        const { data } = await supabase
          .from('coupons')
          .select('code')
          .eq('code', code)
          .maybeSingle();
        if (!data) existing = false;
        else code = this.generateCode();
      }

      const { data, error } = await retrySupabaseRequest(() =>
        supabase.from('coupons').insert({
          code,
          user_id: userId,
          active: true,
          usage_count: 0,
          total_amount: 0,
          commission_earned: 0,
          last_used_at: null
        }).select().single()
      );

      if (error) throw error;
      return { code: data.code, error: null };
    } catch (error) {
      console.error('[CouponService] createCoupon error:', error);
      return { code: null, error };
    }
  }

  static async getUserCoupons(userId) {
    try {
      const { data, error } = await retrySupabaseRequest(() =>
        supabase
          .from('coupons')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      );
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[CouponService] getUserCoupons error:', error);
      return { data: null, error };
    }
  }

  static async validateCoupon(code) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('code, active, user_id')
        .eq('code', code)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { valid: false, coupon: null, error: 'Code invalide' };
      if (!data.active) return { valid: false, coupon: null, error: 'Code désactivé' };
      return { valid: true, coupon: data, error: null };
    } catch (error) {
      console.error('[CouponService] validateCoupon error:', error);
      return { valid: false, coupon: null, error: error.message };
    }
  }

  /**
   * Utilise un coupon et crédite les gains au propriétaire
   * @param {string} couponCode - Code du coupon à utiliser
   * @param {string} buyerUserId - ID de l'acheteur qui utilise le coupon
   * @param {number} amountFcfa - Montant de la transaction en FCFA
   * @param {string|null} transactionId - ID optionnel de la transaction
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  static async useCoupon(couponCode, buyerUserId, amountFcfa, transactionId = null) {
    try {
      const { data, error } = await supabase.rpc('credit_coupon_earnings', {
        p_coupon_code: couponCode,
        p_buyer_user_id: buyerUserId,
        p_amount_fcfa: amountFcfa,
        p_transaction_id: transactionId
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return { success: true, data: data.data };
    } catch (error) {
      console.error('[CouponService] useCoupon error:', error);
      return { success: false, error: error.message };
    }
  }

  static async deactivateCoupon(code) {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: false })
        .eq('code', code);
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('[CouponService] deactivateCoupon error:', error);
      return { success: false, error };
    }
  }

  static async activateCoupon(code) {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: true })
        .eq('code', code);
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('[CouponService] activateCoupon error:', error);
      return { success: false, error };
    }
  }

  static async getAllCouponsStats() {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('code, user_id, usage_count, total_amount, commission_earned, last_used_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[CouponService] getAllCouponsStats error:', error);
      return { data: null, error };
    }
  }

  static async getAllCouponUsages() {
    try {
      const { data, error } = await supabase
        .from('coupon_usages')
        .select(`
          *,
          coupon:coupon_code(code),
          user:user_id(full_name, email),
          transaction:transaction_id(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[CouponService] getAllCouponUsages error:', error);
      return { data: null, error };
    }
  }

  /**
   * Récupère les statistiques des gains d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<{totalCommission: number, usageCount: number, coupons: Array}>}
   */
  static async getUserEarningsStats(userId) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('code, usage_count, total_amount, commission_earned')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const totalCommission = data?.reduce((sum, c) => sum + (c.commission_earned || 0), 0) || 0;
      const totalUsage = data?.reduce((sum, c) => sum + (c.usage_count || 0), 0) || 0;
      const totalAmount = data?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      
      return {
        totalCommission,
        totalUsage,
        totalAmount,
        couponsCount: data?.length || 0,
        coupons: data || [],
        error: null
      };
    } catch (error) {
      console.error('[CouponService] getUserEarningsStats error:', error);
      return { totalCommission: 0, totalUsage: 0, totalAmount: 0, couponsCount: 0, coupons: [], error };
    }
  }
}