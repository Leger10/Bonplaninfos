const axios = require('axios');
const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) 
    };
  }

  try {
    const {
      totalPrice,
      article,
      personal_Info,
      numeroSend,
      nomclient,
      return_url,
      webhook_url
    } = JSON.parse(event.body);

    const cleanPhone = numeroSend.replace(/\s/g, '');

    // ✅ MoneyFusion exige des URL SANS schéma (https://) pour return_url / webhook_url
    const stripScheme = (url) => (url || '').replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');

    // ✅ URL de l'API MoneyFusion propre au compte (à obtenir depuis le tableau de bord "API de paiement")
    const apiUrl = process.env.MONEYFUSION_API_URL || 'https://www.pay.moneyfusion.net/bonplaninfos/b361d6f0433103fe/pay/';

    console.log('💰 Appel API MoneyFusion:', { 
      totalPrice, 
      numeroSend: cleanPhone, 
      nomclient,
      apiUrl 
    });

    const paymentData = {
      totalPrice,
      article,
      personal_Info,
      numeroSend: cleanPhone,
      nomclient,
      return_url: stripScheme(return_url),
      webhook_url: stripScheme(webhook_url)
    };

    // ✅ Ignorer les erreurs SSL en développement seulement
    const agent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    });

    const response = await axios.post(apiUrl, paymentData, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      httpsAgent: agent,
      timeout: 30000
    });

    console.log('✅ Réponse MoneyFusion:', response.data);

    const data = response.data || {};
    const { statut, token, message, url } = data;

    // ✅ La réponse peut être un booléen (true/false) ou une chaîne "success"/"true"
    const isSuccess = statut === true || statut === 'true' || statut === 'success' || data.success === true;

    if (!isSuccess) {
      throw new Error(message || 'Erreur lors de la création du paiement');
    }

    // ✅ Conserver l'URL telle que renvoyée (le www fait partie du domaine MoneyFusion)
    let redirectUrl = url || data.redirect_url;
    if (redirectUrl && !redirectUrl.startsWith('http')) {
      redirectUrl = `https://${redirectUrl}`;
    }

    if (!redirectUrl) {
      throw new Error('Aucune URL de redirection reçue de MoneyFusion');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        token,
        redirect_url: redirectUrl,
        message
      })
    };
    
  } catch (error) {
    console.error('❌ Erreur détaillée:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: error.code
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: error.response?.data?.message || error.message || 'Erreur lors de la création du paiement'
      })
    };
  }
};