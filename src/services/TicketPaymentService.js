// src/services/TicketPaymentService.js

export class TicketPaymentService {
    /**
     * Crée un paiement de ticket via MoneyFusion
     * @param {Object} params
     * @param {number} params.amountFcfa - Montant total en FCFA
     * @param {string} params.userId - ID de l'utilisateur
     * @param {string} params.eventId - ID de l'événement
     * @param {Object} params.cart - Panier {ticketTypeId: quantity}
     * @param {string} params.promoCodeId - ID du code promo (optionnel)
     * @param {number} params.commissionAmount - Montant de la commission (optionnel)
     * @param {string} params.phoneNumber - Numéro de téléphone de l'utilisateur
     * @param {string} params.returnUrl - URL de retour après paiement
     * @returns {Promise<{success: boolean, redirect_url: string, token: string}>}
     */
    static async createTicketPayment({
        amountFcfa,
        userId,
        eventId,
        cart,
        promoCodeId = null,
        commissionAmount = 0,
        phoneNumber,
        returnUrl,
    }) {
        try {
            const transactionId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // Créer un enregistrement de paiement en attente
            const { data: paymentData, error: paymentError } = await supabase
                .from('payments')
                .insert({
                    user_id: userId,
                    coins_amount: Math.floor(amountFcfa / 10),
                    amount_fcfa: amountFcfa,
                    status: 'pending',
                    payment_method: 'moneyfusion_ticket',
                    transaction_id: transactionId,
                    pack_id: 'ticket_payment',
                    coupon_code: promoCodeId,
                    credits_added: false,
                    metadata: {
                        event_id: eventId,
                        cart: cart,
                        promo_code_id: promoCodeId,
                        commission_amount: commissionAmount,
                        payment_type: 'ticket'
                    }
                })
                .select()
                .single();

            if (paymentError) {
                throw new Error(`Erreur enregistrement paiement: ${paymentError.message}`);
            }

            // Préparer les données pour MoneyFusion
            const webhookUrl = `${window.location.origin}/.netlify/functions/moneyfusion-ticket-webhook`;
            const returnUrlFinal = returnUrl || `${window.location.origin}/ticket-payment-success?transaction_id=${transactionId}`;

            const response = await fetch('/.netlify/functions/create-ticket-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    totalPrice: amountFcfa,
                    article: [{ 
                        ticket_payment: amountFcfa,
                        event_id: eventId,
                        cart: cart
                    }],
                    personal_Info: [{
                        userId: userId,
                        orderId: transactionId,
                        amountFcfa: amountFcfa,
                        paymentId: paymentData.id,
                        eventId: eventId,
                        promoCodeId: promoCodeId,
                        commissionAmount: commissionAmount,
                        cart: cart
                    }],
                    numeroSend: phoneNumber,
                    nomclient: `Ticket - ${userId.substring(0, 8)}`,
                    return_url: returnUrlFinal,
                    webhook_url: webhookUrl
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Erreur création paiement ticket');
            }

            return {
                success: true,
                redirect_url: result.redirect_url,
                token: result.token,
                transaction_id: transactionId
            };
        } catch (error) {
            console.error('[TicketPaymentService.createTicketPayment] Error:', error);
            throw error;
        }
    }

    /**
     * Vérifie le statut d'un paiement de ticket
     */
    static async checkTicketPaymentStatus(transactionId) {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('transaction_id', transactionId)
                .maybeSingle();

            if (error) throw error;

            return {
                success: true,
                status: data?.status || 'pending',
                payment: data
            };
        } catch (error) {
            console.error('[TicketPaymentService.checkTicketPaymentStatus] Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}