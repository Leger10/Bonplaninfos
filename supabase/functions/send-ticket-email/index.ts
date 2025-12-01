// import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// import { Resend } from 'npm:resend@2.0.0'

// const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

// serve(async (req) => {
//   try {
//     const { record } = await req.json()
    
//     const {
//       user_email,
//       user_name,
//       event_title,
//       ticket_quantity,
//       total_paid,
//       ticket_codes,
//       platform_fee,
//       organizer_amount
//     } = record

//     const { data, error } = await resend.emails.send({
//       from: 'Billets <tickets@votre-domaine.com>',
//       to: [user_email],
//       subject: `🎟️ Confirmation d'achat - ${event_title}`,
//       html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <meta charset="utf-8">
//             <style>
//                 body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//                 .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//                 .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
//                 .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
//                 .ticket { background: white; border: 2px dashed #667eea; padding: 20px; margin: 10px 0; border-radius: 8px; }
//                 .code { font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; }
//                 .breakdown { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
//             </style>
//         </head>
//         <body>
//             <div class="container">
//                 <div class="header">
//                     <h1>🎟️ Confirmation d'achat</h1>
//                     <h2>${event_title}</h2>
//                 </div>
//                 <div class="content">
//                     <p>Bonjour <strong>${user_name}</strong>,</p>
                    
//                     <p>Votre achat de <strong>${ticket_quantity} billet(s)</strong> pour l'événement <strong>"${event_title}"</strong> a été confirmé avec succès !</p>
                    
//                     <h3>📋 Détails de votre commande :</h3>
//                     <div class="breakdown">
//                         <p><strong>Montant total :</strong> ${total_paid}π</p>
//                         <p><strong>Quantité :</strong> ${ticket_quantity} billet(s)</p>
//                         <p><strong>Date d'achat :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
//                     </div>

//                     <h3>🎫 Vos codes billets :</h3>
//                     ${ticket_codes.map(code => `
//                         <div class="ticket">
//                             <strong>Code :</strong> <span class="code">${code}</span>
//                         </div>
//                     `).join('')}

//                     <div class="breakdown">
//                         <h4>💵 Répartition du paiement :</h4>
//                         <p><strong>Organisateur (95%) :</strong> ${organizer_amount}π</p>
//                         <p><strong>Frais plateforme (5%) :</strong> ${platform_fee}π</p>
//                         <p><strong>Total :</strong> ${total_paid}π</p>
//                     </div>

//                     <p>📱 <strong>Conseil :</strong> Présentez ces codes à l'entrée de l'événement pour validation.</p>
                    
//                     <p>Merci pour votre confiance !</p>
//                     <p>L'équipe de votre plateforme</p>
//                 </div>
//             </div>
//         </body>
//         </html>
//       `,
//     })

//     if (error) {
//       console.error('Error sending email:', error)
//       return new Response(JSON.stringify({ error: error.message }), {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' },
//       })
//     }

//     // Marquer l'email comme envoyé dans la base de données
//     // (à implémenter avec un webhook)

//     return new Response(JSON.stringify({ success: true, data }), {
//       headers: { 'Content-Type': 'application/json' },
//     })
//   } catch (error) {
//     console.error('Error:', error)
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: { 'Content-Type': 'application/json' },
//     })
//   }
// })