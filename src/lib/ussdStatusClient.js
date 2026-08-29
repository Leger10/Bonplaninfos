import { createClient } from "@supabase/supabase-js";

// Client dédié à la consultation/action USSD.
// En production, la Netlify Function ussd-payment sert d'intermédiaire avec la
// clé service role côté serveur. En dev (vite :3000) il n'y a pas de Netlify
// Function : on retombe sur un client service-role pour lire/agir, comme le fait
// déjà Sitemap.jsx. À réserver à cet usage spécifique.
const url = import.meta.env?.VITE_SUPABASE_URL || "";
const key =
  import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  "";

export const ussdServiceClient = url && key ? createClient(url, key) : null;

// Lecture du statut d'un paiement USSD (fallback dev quand la Netlify Function
// n'est pas disponible). Retourne 'pending' | 'completed' | 'cancelled' | null.
export const fetchUssdStatus = async (orderId) => {
  if (!ussdServiceClient || !orderId) return null;
  try {
    let q = ussdServiceClient
      .from("payments")
      .select("status")
      .eq("payment_method", "ussd");
    // transaction_id peut contenir un point -> bascule sur like si besoin
    const { data, error } = await q
      .eq("transaction_id", orderId)
      .maybeSingle();
    if (error || !data) return null;
    return data.status;
  } catch (e) {
    console.error("Erreur fetch état USSD:", e);
    return null;
  }
};
