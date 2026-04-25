// hooks/usePromoCode.js - VERSION CORRIGÉE
import { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";

// Taux de conversion constant (1 pièce = 10 FCFA)
const COIN_TO_FCFA_RATE = 10;

export const usePromoCode = (eventId) => {
  const [promoConfig, setPromoConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appliedCode, setAppliedCode] = useState(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCommission, setAppliedCommission] = useState(0);
  const [appliedDiscountAmount, setAppliedDiscountAmount] = useState(0);

  useEffect(() => {
    if (eventId) loadPromoConfig();
  }, [eventId]);

  const loadPromoConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("event_promo_config")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPromoConfig({
          enabled: data.enabled,
          discountType: data.discount_type,
          discountValue: data.discount_value,
          commissionRate: data.commission_rate,
          usageLimit: data.usage_limit,
        });
      }
    } catch (error) {
      console.error("Error loading promo config:", error);
    }
  };

  const validatePromoCode = async (code, userId) => {
    if (!eventId) {
      return { valid: false, discountAmount: 0, commissionAmount: 0, message: "Événement non trouvé" };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("validate_promo_code_simple", {
        p_code: code.toUpperCase(),
        p_event_id: eventId,
        p_user_id: userId || null,
      });

      if (error) throw error;

      if (data && data.valid === true) {
        return {
          valid: true,
          promo_code_id: data.promo_code_id,
          influencer_id: data.influencer_id,
          discountType: data.discount_type,
          discountValue: data.discount_value, // En FCFA pour 'fixed', en % pour 'percentage'
          commissionRate: data.commission_rate,
          message: data.message,
          code: data.code,
        };
      }
      
      return { 
        valid: false, 
        discountAmount: 0, 
        commissionAmount: 0, 
        message: data?.message || "Code invalide" 
      };
    } catch (error) {
      console.error("Error validating promo code:", error);
      return { valid: false, discountAmount: 0, commissionAmount: 0, message: "Erreur lors de la validation" };
    } finally {
      setLoading(false);
    }
  };

  const applyPromoCode = async (code, originalAmount, userId) => {
    console.log("🔍 Applying promo code:", { code, originalAmount, userId });
    
    if (originalAmount <= 0) {
      return {
        newTotal: 0,
        codeId: null,
        influencerId: null,
        discountAmount: 0,
        commissionAmount: 0,
        message: "Panier vide"
      };
    }
    
    const validation = await validatePromoCode(code, userId);
    console.log("✅ Validation result:", validation);

    if (validation.valid) {
      let discountAmountInCoins = 0;
      let commissionAmount = 0;
      let originalDiscountValue = validation.discountValue;
      
      // IMPORTANT: Calcul correct de la réduction
      if (validation.discountType === 'percentage') {
        // Réduction en pourcentage (ex: 10%)
        discountAmountInCoins = (originalAmount * validation.discountValue) / 100;
        commissionAmount = (originalAmount - discountAmountInCoins) * (validation.commissionRate / 100);
      } else if (validation.discountType === 'fixed') {
        // ⚠️ CRITIQUE: discount_value est en FCFA, originalAmount est en pièces
        // Convertir la réduction de FCFA en pièces (1 pièce = 10 FCFA)
        const discountInCoins = validation.discountValue / COIN_TO_FCFA_RATE;
        discountAmountInCoins = Math.min(discountInCoins, originalAmount);
        commissionAmount = (originalAmount - discountAmountInCoins) * (validation.commissionRate / 100);
        
        console.log("💰 Fixed discount calculation:", {
          discountFcfa: validation.discountValue,
          discountInCoins: discountInCoins,
          originalAmount: originalAmount,
          finalDiscount: discountAmountInCoins
        });
      }
      
      // Arrondir à l'entier inférieur
      discountAmountInCoins = Math.floor(discountAmountInCoins);
      commissionAmount = Math.floor(commissionAmount);
      
      const newTotal = Math.max(0, originalAmount - discountAmountInCoins);
      
      console.log("💰 Final calculated:", { 
        originalAmount,
        discountAmountInCoins, 
        commissionAmount, 
        newTotal,
        discountType: validation.discountType,
        discountValueOriginal: originalDiscountValue,
        discountInFcfa: discountAmountInCoins * COIN_TO_FCFA_RATE
      });
      
      setAppliedCode({ 
        id: validation.promo_code_id, 
        influencer_id: validation.influencer_id,
        code: validation.code 
      });
      setAppliedDiscount(discountAmountInCoins);
      setAppliedCommission(commissionAmount);
      setAppliedDiscountAmount(discountAmountInCoins);
      
      return {
        newTotal: newTotal,
        codeId: validation.promo_code_id,
        influencerId: validation.influencer_id,
        discountAmount: discountAmountInCoins,
        discountAmountFcfa: discountAmountInCoins * COIN_TO_FCFA_RATE,
        commissionAmount: commissionAmount,
        message: validation.message,
        discountType: validation.discountType,
        discountValue: validation.discountValue,
        code: validation.code
      };
    }
    
    return {
      newTotal: originalAmount,
      codeId: null,
      influencerId: null,
      discountAmount: 0,
      commissionAmount: 0,
      message: validation.message || "Code invalide"
    };
  };

  const removePromoCode = () => {
    setAppliedCode(null);
    setAppliedDiscount(0);
    setAppliedCommission(0);
    setAppliedDiscountAmount(0);
    toast({ title: "Code supprimé", description: "La réduction a été retirée" });
  };

  const recordPromoCodeUsage = async (codeId, userId, purchaseAmount, influencerId, commissionAmount, transactionId = null) => {
    try {
      console.log("📝 Recording promo usage:", { codeId, userId, purchaseAmount, influencerId, commissionAmount, transactionId });
      
      const discountAmount = appliedDiscount;
      
      const { data, error } = await supabase.rpc("process_promo_usage", {
        p_code_id: codeId,
        p_user_id: userId,
        p_discount: discountAmount,
        p_commission: commissionAmount || appliedCommission,
        p_purchase: purchaseAmount,
        p_transaction_id: transactionId
      });
      
      if (error) {
        console.error("Error in process_promo_usage:", error);
        throw error;
      }
      
      console.log("✅ Promo usage recorded:", data);
      
      if (codeId) {
        await getCodeStats(codeId);
      }
      
      return true;
    } catch (error) {
      console.error("Error recording promo usage:", error);
      return false;
    }
  };

  const getCodeStats = async (codeId) => {
    try {
      const { data: codeData, error: codeError } = await supabase
        .from("promo_codes")
        .select("usage_count")
        .eq("id", codeId)
        .maybeSingle();

      if (codeError) throw codeError;

      const { data: usagesData, error: usageError } = await supabase
        .from("promo_code_usages")
        .select("commission_amount")
        .eq("promo_code_id", codeId);

      if (usageError) throw usageError;

      const totalCommission = usagesData?.reduce((sum, u) => sum + (u.commission_amount || 0), 0) || 0;

      return { 
        usageCount: codeData?.usage_count || 0, 
        totalCommission: totalCommission 
      };
    } catch (error) {
      console.error("Error getting code stats:", error);
      return { usageCount: 0, totalCommission: 0 };
    }
  };

  const getFormattedDiscount = () => {
    if (!promoConfig || !promoConfig.enabled) return null;
    
    if (promoConfig.discountType === 'percentage') {
      return `${promoConfig.discountValue}%`;
    } else {
      const discountInCoins = promoConfig.discountValue / COIN_TO_FCFA_RATE;
      return `${discountInCoins} pièces (${promoConfig.discountValue.toLocaleString()} FCFA)`;
    }
  };

  const isCodeApplied = () => {
    return appliedCode !== null && appliedDiscount > 0;
  };

  return {
    promoConfig,
    loading,
    appliedCode,
    appliedDiscount,
    appliedCommission,
    appliedDiscountAmount,
    validatePromoCode,
    applyPromoCode,
    removePromoCode,
    recordPromoCodeUsage,
    loadPromoConfig,
    getCodeStats,
    getFormattedDiscount,
    isCodeApplied,
  };
};