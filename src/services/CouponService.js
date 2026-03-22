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
}