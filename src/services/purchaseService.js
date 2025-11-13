import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';

export class PurchaseService {
  
  // Récupérer tous les packs de coins
  static async getCoinPacks() {
    const { data, error } = await supabase
      .from('coin_packs')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    
    return data.map(pack => ({
      ...pack,
      total_coins: (pack.coin_amount || 0) + (pack.bonus_coins || 0),
      price_per_coin: ((pack.coin_amount || 0) + (pack.bonus_coins || 0) > 0) 
        ? Number((pack.fcfa_price / ((pack.coin_amount || 0) + (pack.bonus_coins || 0))).toFixed(2))
        : 0,
      type: 'coin_pack'
    }));
  }

  static async getCoinPackBySlug(slug) {
    const { data, error } = await supabase
      .from('coin_packs')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching pack by slug:", error);
      throw error;
    }

    return data;
  }

  // Récupérer tous les packs de licence partenaire
  static async getLicensePacks() {
    const { data, error } = await supabase
      .from('partner_license_packs')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    
    return data.map(license => ({
      ...license,
      type: 'partner_license',
      duration_months: Math.floor(license.duration_days / 30)
    }));
  }

  // Initier un achat (coins ou licence)
  static async initiatePurchase(userId, purchaseData) {
    const { type } = purchaseData;
    
    if (type === 'coin_pack') {
      return await this.initiateCoinPack(userId, purchaseData);
    } else if (type === 'custom_coins') {
      return await this.initiateCustomCoins(userId, purchaseData);
    } else if (type === 'partner_license') {
      return await this.initiatePartnerLicense(userId, purchaseData);
    } else {
      throw new Error('Type d\'achat non supporté');
    }
  }

  // Achat pack de coins prédéfini
  static async initiateCoinPack(userId, { pack_id }) {
    const { data: pack, error: packError } = await supabase
      .from('coin_packs')
      .select('*')
      .eq('id', pack_id)
      .eq('is_active', true)
      .eq('is_custom', false)
      .single();

    if (packError || !pack) throw new Error('Ce pack de pièces n\'est pas disponible pour le moment.');

    const transactionId = `BPI-COIN-${pack_id}-${uuidv4().substring(0, 8)}`;
    const totalCoins = pack.coin_amount + pack.bonus_coins;

    const { error: transactionError } = await supabase
      .from('user_coin_transactions')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        amount_fcfa: pack.fcfa_price,
        coin_amount: pack.coin_amount,
        bonus_coins: pack.bonus_coins,
        total_coins: totalCoins,
        pack_id: pack_id,
        transaction_type: 'coin_pack'
      });

    if (transactionError) throw new Error("Erreur lors de la création de la transaction: " + transactionError.message);

    return {
      success: true,
      transaction_id: transactionId,
      redirect_url: this.generateRedirectUrl(transactionId, pack.fcfa_price, 'coin_pack', pack.id)
    };
  }

  // Achat coins personnalisé
  static async initiateCustomCoins(userId, { amount_fcfa }) {
    if (amount_fcfa < 500) throw new Error('Le montant minimum pour un achat personnalisé est de 500 FCFA.');
    if (amount_fcfa > 400000) throw new Error('Le montant maximum pour un achat personnalisé est de 400,000 FCFA.');

    const baseCoins = Math.floor(amount_fcfa / 10);
    const bonusCoins = this.calculateCustomBonus(amount_fcfa);
    const totalCoins = baseCoins + bonusCoins;
    const transactionId = `BPI-CUSTOM-${uuidv4().substring(0, 8)}`;

    const { error } = await supabase
      .from('user_coin_transactions')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        amount_fcfa: amount_fcfa,
        coin_amount: baseCoins,
        bonus_coins: bonusCoins,
        total_coins: totalCoins,
        transaction_type: 'custom_coins'
      });

    if (error) throw new Error("Erreur lors de la création de la transaction personnalisée: " + error.message);

    return {
      success: true,
      transaction_id: transactionId,
      redirect_url: this.generateRedirectUrl(transactionId, amount_fcfa, 'custom_coins')
    };
  }

  // Achat licence partenaire
  static async initiatePartnerLicense(userId, { license_pack_id }) {
    const { data: license, error: licenseError } = await supabase
      .from('partner_license_packs')
      .select('*')
      .eq('id', license_pack_id)
      .eq('is_active', true)
      .single();

    if (licenseError || !license) throw new Error('Cette licence de partenariat n\'est pas disponible.');

    const transactionId = `BPI-LIC-${license_pack_id}-${uuidv4().substring(0, 8)}`;

    const { error: transactionError } = await supabase
      .from('user_coin_transactions')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        amount_fcfa: license.fcfa_price,
        license_pack_id: license_pack_id,
        transaction_type: 'partner_license'
      });

    if (transactionError) throw new Error("Erreur lors de la création de la transaction de licence: " + transactionError.message);

    return {
      success: true,
      transaction_id: transactionId,
      redirect_url: this.generateRedirectUrl(transactionId, license.fcfa_price, 'partner_license', license_pack_id)
    };
  }

  // Calculer le bonus personnalisé
  static calculateCustomBonus(amountFcfa) {
    if (amountFcfa >= 200000) return Math.floor(amountFcfa / 10 * 0.08);
    if (amountFcfa >= 100000) return Math.floor(amountFcfa / 10 * 0.06);
    if (amountFcfa >= 50000) return Math.floor(amountFcfa / 10 * 0.05);
    if (amountFcfa >= 20000) return Math.floor(amountFcfa / 10 * 0.03);
    if (amountFcfa >= 10000) return Math.floor(amountFcfa / 10 * 0.02);
    if (amountFcfa >= 5000) return Math.floor(amountFcfa / 10 * 0.01);
    return 0;
  }

  // Générer l'URL de redirection vers la page de checkout
  static generateRedirectUrl(transactionId, amountFcfa, productType, packId = null) {
    const params = new URLSearchParams({
      transaction_id: transactionId,
      amount: amountFcfa,
      type: productType
    });
    if (packId) {
        params.append('pack_id', packId);
    }
    return `/payment/checkout?${params.toString()}`;
  }

  // Vérifier et créditer un paiement
  static async verifyAndCreditPayment(transactionId, userEmail, moneyfusionReference) {
    try {
      const { data: transaction, error } = await supabase
        .from('user_coin_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .eq('status', 'pending')
        .single();

      if (error || !transaction) {
        return { success: false, message: 'Transaction non trouvée ou déjà traitée.' };
      }

      const { error: updateError } = await supabase
        .from('user_coin_transactions')
        .update({
          status: 'completed',
          user_email: userEmail,
          moneyfusion_reference: moneyfusionReference,
          payment_date: new Date().toISOString(),
          verified_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId);

      if (updateError) throw updateError;

      if (transaction.transaction_type === 'coin_pack' || transaction.transaction_type === 'custom_coins') {
        const { error: coinError } = await supabase.rpc('increment_user_coins', {
          p_user_id: transaction.user_id,
          p_coin_increment: transaction.total_coins,
          p_fcfa_increment: parseFloat(transaction.amount_fcfa)
        });
        if (coinError) throw coinError;
        return { 
          success: true, 
          message: `${transaction.total_coins} pièces ont été créditées sur votre compte.`,
          type: 'coins',
          amount: transaction.total_coins
        };
      } else if (transaction.transaction_type === 'partner_license') {
        const { data: licensePack } = await supabase
          .from('partner_license_packs')
          .select('*')
          .eq('id', transaction.license_pack_id)
          .single();
        if (!licensePack) throw new Error('Pack de licence non trouvé pour la transaction.');
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + licensePack.duration_days);
        const { error: licenseError } = await supabase
          .from('user_partner_licenses')
          .insert({
            user_id: transaction.user_id,
            license_pack_id: transaction.license_pack_id,
            transaction_id: transactionId,
            purchase_date: new Date().toISOString(),
            expiry_date: expiryDate.toISOString(),
            revenue_share_percent: licensePack.revenue_share_percent,
            status: 'active'
          });
        if (licenseError) throw licenseError;
        return { 
          success: true, 
          message: `Votre Licence ${licensePack.name} est maintenant active pour ${licensePack.duration_days} jours.`,
          type: 'license',
          license_name: licensePack.name,
          expiry_date: expiryDate
        };
      }
    } catch (error) {
      console.error('Erreur de vérification/créditation:', error);
      return { success: false, message: "Une erreur technique est survenue: " + error.message };
    }
    return { success: false, message: 'Type de transaction inconnu.' };
  }

  // Récupérer les licences actives d'un utilisateur
  static async getUserLicenses(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('user_partner_licenses')
      .select(`*, partner_license_packs (*)`)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('purchase_date', { ascending: false });
    if (error) {
      console.error("Erreur lors de la récupération des licences utilisateur", error);
      throw error;
    }
    return data;
  }
}