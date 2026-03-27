const axios = require('axios');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
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

    // Appel à l’API MoneyFusion
    const response = await axios.post(
      process.env.MONEYFUSION_API_URL,
      {
        totalPrice,
        article,
        personal_Info,
        numeroSend,
        nomclient,
        return_url,
        webhook_url
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONEYFUSION_API_KEY}` // si nécessaire
        }
      }
    );

    const { token, url } = response.data;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, token, redirect_url: url })
    };
  } catch (error) {
    console.error('Erreur MoneyFusion:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Erreur lors de la création du paiement' })
    };
  }
};