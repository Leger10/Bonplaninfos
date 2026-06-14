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
    
    // ✅ CORRECTION: Utiliser pay.moneyfusion.net (sans www)
    const apiUrl = process.env.MONEYFUSION_API_URL || 'https://pay.moneyfusion.net/api/payment';

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
      return_url,
      webhook_url
    };

    // ✅ Ignorer les erreurs SSL en développement seulement
    const agent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    });

    const response = await axios.post(apiUrl, paymentData, {
      headers: { 'Content-Type': 'application/json' },
      httpsAgent: agent,
      timeout: 30000
    });

    console.log('✅ Réponse MoneyFusion:', response.data);

    const { statut, token, message, url } = response.data;

    if (!statut) {
      throw new Error(message || 'Erreur lors de la création du paiement');
    }

    // ✅ Nettoyer l'URL de redirection (enlever www si présent)
    let redirectUrl = url;
    if (redirectUrl && redirectUrl.includes('www.pay.moneyfusion.net')) {
      redirectUrl = redirectUrl.replace('www.pay.moneyfusion.net', 'pay.moneyfusion.net');
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