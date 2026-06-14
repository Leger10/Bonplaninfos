// src/services/MoneyFusionService.js

const API_BASE_URL = 'https://www.pay.moneyfusion.net';

export class MoneyFusionService {
  /**
   * Créer une demande de paiement MoneyFusion
   * @returns {Promise<{success: boolean, redirect_url: string, token: string}>}
   */
  static async createPayment({
    amountFcfa,
    userId,
    packId,
    transactionId,
    couponCode,
    returnUrl,
    webhookUrl,
    phoneNumber,
    customerName = 'Client'
  }) {
    try {
      const response = await fetch('/.netlify/functions/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalPrice: amountFcfa,
          article: [{ [packId || 'custom']: amountFcfa }],
          personal_Info: [{ 
            userId, 
            orderId: transactionId,
            couponCode,
            amountFcfa,
            paymentId: null
          }],
          numeroSend: phoneNumber,
          nomclient: customerName,
          return_url: returnUrl,
          webhook_url: webhookUrl
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erreur création paiement');
      }
      
      return {
        success: true,
        redirect_url: result.redirect_url,
        token: result.token
      };
    } catch (error) {
      console.error('[MoneyFusionService.createPayment] Error:', error);
      throw error;
    }
  }

  /**
   * Vérifier le statut d'un paiement
   * @param {string} token - Token de paiement
   * @returns {Promise<Object>} Statut du paiement
   */
  static async checkPaymentStatus(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/paiementNotif/${token}`);
      const data = await response.json();
      
      if (!data.statut) {
        throw new Error(data.message || 'Erreur lors de la vérification');
      }
      
      return {
        success: true,
        status: data.data?.statut,
        transaction: data.data,
        token: token
      };
    } catch (error) {
      console.error('[MoneyFusionService.checkPaymentStatus] Error:', error);
      return {
        success: false,
        error: error.message,
        token: token
      };
    }
  }

  /**
   * Vérifier si un paiement est réussi
   * @param {string} token - Token de paiement
   * @returns {Promise<boolean>}
   */
  static async isPaymentSuccessful(token) {
    const result = await this.checkPaymentStatus(token);
    return result.success && result.status === 'paid';
  }

  /**
   * Attendre la confirmation d'un paiement (polling)
   * @param {string} token - Token de paiement
   * @param {number} maxAttempts - Nombre maximum de tentatives
   * @param {number} interval - Intervalle entre les tentatives (ms)
   * @returns {Promise<Object>}
   */
  static async waitForPaymentConfirmation(token, maxAttempts = 30, interval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.checkPaymentStatus(token);
        
        if (result.success && result.status === 'paid') {
          return { 
            success: true, 
            transaction: result.transaction,
            attempts: i + 1
          };
        }
        
        if (result.success && (result.status === 'failure' || result.status === 'no paid')) {
          return { 
            success: false, 
            error: `Payment ${result.status}`,
            attempts: i + 1
          };
        }
        
        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        console.error(`[MoneyFusionService] Tentative ${i + 1} échouée:`, error);
      }
    }
    
    return { 
      success: false, 
      error: 'Timeout waiting for payment confirmation',
      attempts: maxAttempts
    };
  }

  /**
   * Générer un ID de transaction unique
   * @returns {string}
   */
  static generateTransactionId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}