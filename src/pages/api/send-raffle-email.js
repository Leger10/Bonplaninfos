// supabase/functions/send-raffle-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      user_id,
      raffle_title,
      ticket_quantity,
      total_paid,
      ticket_numbers,
      user_name,
      user_email,
    } = await req.json();

    if (!user_email) {
      return new Response(
        JSON.stringify({ error: "Email utilisateur manquant" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data, error } = await resend.emails.send({
      from: "Tombola <noreply@bonplaninfos.net>",
      to: [user_email],
      subject: `🎫 Confirmation de participation - ${raffle_title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3B82F6; text-align: center;">Confirmation de Participation</h1>
          <p>Bonjour <strong>${user_name}</strong>,</p>
          <p>Votre participation à la tombola <strong>"${raffle_title}"</strong> a bien été enregistrée.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
            <h3 style="color: #1E293B; margin-bottom: 15px;">📋 Détails de votre participation :</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px;">
                <strong>Nombre de tickets :</strong> ${ticket_quantity}
              </li>
              <li style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px;">
                <strong>Montant total :</strong> ${total_paid}pièces
              </li>
              <li style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px;">
                <strong>Numéros de tickets :</strong> ${ticket_numbers.join(", ")}
              </li>
            </ul>
          </div>
          
          <p style="color: #64748B; font-size: 14px; text-align: center;">
            Merci pour votre participation et bonne chance ! 🍀
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Erreur Resend:", error);
      return new Response(JSON.stringify({ error: "Erreur envoi email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email envoyé avec succès" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Erreur fonction:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
