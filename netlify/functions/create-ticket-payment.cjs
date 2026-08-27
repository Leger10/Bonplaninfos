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

        let webhookUrl = webhook_url;
        if (!webhookUrl) {
            const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'https://bonplaninfos.netlify.app';
            webhookUrl = `${siteUrl}/.netlify/functions/moneyfusion-ticket-webhook`;
        }

        // ✅ UTILISER L'URL COMME REDIRECTION DIRECTE (GET avec paramètres)
        const baseUrl = 'https://www.pay.moneyfusion.net/bonplaninfos/b361d6f0433103fe/pay';
        
        const params = new URLSearchParams({
            amount: totalPrice.toString(),
            customer_phone: cleanPhone,
            customer_name: nomclient || 'Client',
            return_url: return_url || `${process.env.URL || 'https://bonplaninfos.netlify.app'}/profile?tab=tickets&payment=success&order=${personal_Info[0]?.orderId || 'unknown'}`,
            webhook_url: webhookUrl
        });

        // Ajouter les métadonnées si nécessaire
        if (personal_Info && personal_Info[0]) {
            try {
                params.append('metadata', JSON.stringify(personal_Info[0]));
            } catch (e) {
                console.log('⚠️ Metadata non supporté en paramètre');
            }
        }

        const redirectUrl = `${baseUrl}?${params.toString()}`;

        console.log('💰 Création paiement ticket MoneyFusion (REDIRECTION DIRECTE):', {
            totalPrice,
            numeroSend: cleanPhone,
            nomclient,
            eventId: personal_Info[0]?.eventId,
            amountOriginal: personal_Info[0]?.amountFcfa,
            isGuest: personal_Info[0]?.isGuest || false,
            webhookUrl,
            redirectUrl: redirectUrl.substring(0, 200) + '...'
        });

        // ✅ RETOURNER L'URL DE REDIRECTION AU FRONTEND (sans appeler MoneyFusion)
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                redirect_url: redirectUrl,
                message: 'Paiement initialisé avec succès',
                amount_original: personal_Info[0]?.amountFcfa || totalPrice,
                amount_with_fees: totalPrice,
                phone_used: cleanPhone,
                webhook_url: webhookUrl
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
            errorMessage = error.response.data?.message || 'Données invalides pour MoneyFusion';
        } else if (error.response?.status === 401) {
            statusCode = 401;
            errorMessage = 'Non autorisé - Vérifiez vos identifiants MoneyFusion';
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