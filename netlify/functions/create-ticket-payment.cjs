// netlify/functions/create-ticket-payment.js
const axios = require('axios');
const https = require('https');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Method Not Allowed'
            })
        };
    }

    try {
        if (!event.body) {
            throw new Error('Body manquant dans la requête');
        }

        const {
            totalPrice,
            article,
            personal_Info,
            numeroSend,
            nomclient,
            return_url,
            webhook_url
        } = JSON.parse(event.body);

        // 🔥 Nettoyer le numéro de téléphone
        const cleanPhone = numeroSend.replace(/\s/g, '');
        
        if (!cleanPhone || cleanPhone.length < 8) {
            throw new Error('Numéro de téléphone invalide. Veuillez fournir un numéro valide.');
        }

        if (!totalPrice || totalPrice <= 0) {
            throw new Error('Montant invalide');
        }

        if (!personal_Info || !personal_Info[0]) {
            throw new Error('Informations personnelles requises');
        }

        // 🔥 S'assurer que le téléphone est bien dans personal_Info
        if (personal_Info && personal_Info.length > 0) {
            personal_Info[0].phone = cleanPhone;
            personal_Info[0].phoneNumber = cleanPhone;
            personal_Info[0].telephone = cleanPhone;
        }

        const apiUrl = process.env.MONEYFUSION_API_URL || 'https://pay.moneyfusion.net/api/payment';

        let webhookUrl = webhook_url;
        if (!webhookUrl) {
            const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'https://bonplaninfos.netlify.app';
            webhookUrl = `${siteUrl}/.netlify/functions/moneyfusion-ticket-webhook`;
        }

        console.log('💰 Création paiement ticket MoneyFusion:', {
            totalPrice,
            numeroSend: cleanPhone,
            nomclient,
            eventId: personal_Info[0]?.eventId,
            amountOriginal: personal_Info[0]?.amountFcfa,
            isGuest: personal_Info[0]?.isGuest || false,
            webhookUrl,
            phoneInPersonalInfo: personal_Info[0]?.phone
        });

        const paymentData = {
            totalPrice: totalPrice,
            article: article || [{ ticket_payment: totalPrice }],
            personal_Info: personal_Info,
            numeroSend: cleanPhone,
            nomclient: nomclient || 'Client',
            return_url: return_url || `${process.env.URL || 'https://bonplaninfos.netlify.app'}/profile?tab=tickets&payment=success&order=${personal_Info[0]?.orderId || 'unknown'}`,
            webhook_url: webhookUrl
        };

        console.log('📤 Envoi à MoneyFusion:', {
            apiUrl,
            totalPrice: paymentData.totalPrice,
            numeroSend: paymentData.numeroSend,
            return_url: paymentData.return_url,
            webhook_url: paymentData.webhook_url,
            personal_Info_phone: paymentData.personal_Info[0]?.phone
        });

        const agent = new https.Agent({
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        });

        const response = await axios.post(apiUrl, paymentData, {
            headers: {
                'Content-Type': 'application/json'
            },
            httpsAgent: agent,
            timeout: 30000
        });

        console.log('✅ Réponse MoneyFusion reçue:', {
            statut: response.data?.statut,
            token: response.data?.token ? 'Présent' : 'Absent',
            hasUrl: !!response.data?.url,
            webhook_sent: !!paymentData.webhook_url
        });

        const { statut, token, message, url } = response.data;

        if (!statut) {
            throw new Error(message || 'Erreur lors de la création du paiement sur MoneyFusion');
        }

        let redirectUrl = url;
        if (redirectUrl) {
            if (redirectUrl.includes('www.pay.moneyfusion.net')) {
                redirectUrl = redirectUrl.replace('www.pay.moneyfusion.net', 'pay.moneyfusion.net');
            }
            if (!redirectUrl.startsWith('http')) {
                redirectUrl = `https://${redirectUrl}`;
            }
        } else {
            throw new Error('Aucune URL de redirection reçue de MoneyFusion');
        }

        const originalAmount = personal_Info[0]?.amountFcfa || totalPrice;
        const feesAmount = totalPrice - originalAmount;

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                token: token,
                redirect_url: redirectUrl,
                message: message || 'Paiement créé avec succès',
                fees: feesAmount,
                amount_original: originalAmount,
                amount_with_fees: totalPrice,
                phone_used: cleanPhone,
                webhook_url: webhookUrl,
                debug: {
                    phone_sent: cleanPhone,
                    phone_in_personal_info: personal_Info[0]?.phone
                }
            })
        };

    } catch (error) {
        console.error('❌ Erreur détaillée:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            code: error.code
        });

        let statusCode = 500;
        let errorMessage = error.message || 'Erreur lors de la création du paiement';

        if (error.response?.status === 400) {
            statusCode = 400;
            errorMessage = error.response.data?.message || 'Données invalides';
        } else if (error.response?.status === 401) {
            statusCode = 401;
            errorMessage = 'Non autorisé - Vérifiez vos clés API MoneyFusion';
        } else if (error.response?.status === 404) {
            statusCode = 404;
            errorMessage = 'API MoneyFusion non trouvée - Vérifiez l\'URL';
        } else if (error.response?.status === 500) {
            statusCode = 500;
            errorMessage = 'Erreur serveur MoneyFusion - Veuillez réessayer plus tard';
        }

        return {
            statusCode: statusCode,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                message: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};