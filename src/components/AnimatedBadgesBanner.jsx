import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/customSupabaseClient";
import { Volume2, PlayCircle, Loader2 } from "lucide-react";

// Mapping des codes pays pour FlagCDN
const getCountryCode = (countryName) => {
  if (!countryName) return "bj";
  const mapping = {
    "Côte d'Ivoire": "ci",
    "Sénégal": "sn",
    "Burkina Faso": "bf",
    "Togo": "tg",
    "Mali": "ml",
    "Bénin": "bj",
    "Gabon": "ga",
    "Cameroun": "cm",
    "France": "fr"
  };
  return mapping[countryName] || "un";
};

const AnimatedBadgesBanner = () => {
  const [partners, setPartners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivePartners = async () => {
      try {
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("partners")
          .select("*, user:user_id(full_name, avatar_url)")
          .eq("status", "active")
          .gt("expiration_date", now)
          .limit(10);

        if (error) throw error;

        setPartners(data || []);
      } catch (err) {
        console.error("Erreur fetch banner:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivePartners();
  }, []);

  useEffect(() => {
    if (partners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % partners.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [partners]);

  const speak = (partner) => {
  if (!window.speechSynthesis) {
    console.warn("Synthèse vocale non supportée");
    return;
  }

  window.speechSynthesis.cancel();

  const country = partner.coverage_zone?.country || "son pays";
  const fullName = partner.user?.full_name || "notre ambassadeur";

  const text = `Découvrez ${fullName}, notre ambassadeur au ${country}.

En devenant partenaire BonPlanInfos dans votre pays, vous bénéficiez de nombreux avantages :

- Vous générez des revenus stables grâce à notre programme de partage de commissions, de 20% jusqu'à 50 % sur chaque vente de packs partenaires réalisée dans votre zone.
- Vous accédez à une plateforme de gestion d'événements tout en un, pour organiser, encaisser et promouvoir vos activités facilement.
- Vous recevez un accompagnement personnalisé de notre équipe, ainsi que des outils marketing pour développer votre réseau local.
- Vous gagnez en crédibilité et en visibilité en étant mis en avant sur notre site et nos réseaux sociaux.
- Vous participez à des événements exclusifs réservés aux ambassadeurs et bénéficiez de formations continues.

${fullName} incarne parfaitement ces valeurs et nous sommes fiers de l’avoir à nos côtés pour faire rayonner BonPlanInfos au ${country}.

Rejoignez le mouvement et devenez ambassadeur dès aujourd'hui !`;

  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "fr-FR";
  speech.rate = 0.9;

  window.speechSynthesis.speak(speech);
};

  if (loading || partners.length === 0) return null;

  const current = partners[currentIndex];
  const countryCode = getCountryCode(current.coverage_zone?.country);

  return (
    <div className="bg-primary text-white py-3 px-4 relative overflow-hidden shadow-inner">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between max-w-5xl mx-auto"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden shadow-lg bg-muted">
                <img
                  src={
                    current.user?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${current.user?.full_name}&background=random`
                  }
                  className="w-full h-full object-cover"
                  alt={current.user?.full_name}
                />
              </div>

              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-primary overflow-hidden shadow-sm bg-white">
                <img
                  src={`https://flagcdn.com/w40/${countryCode}.png`}
                  className="w-full h-full object-cover"
                  alt="Drapeau"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                Ambassadeur {current.coverage_zone?.country}
              </span>
              <span className="text-sm font-bold leading-tight">
                {current.user?.full_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => speak(current)}
              className="flex items-center gap-2 text-[11px] bg-white text-primary px-4 py-2 rounded-full font-black shadow-md hover:bg-slate-100 transition-transform active:scale-95"
            >
              <PlayCircle size={14} className="fill-primary text-white" />
              PRÉSENTATION
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Barre de progression visuelle */}
      <motion.div
        key={`progress-${currentIndex}`}
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 8, ease: "linear" }}
        className="absolute bottom-0 left-0 h-[2px] bg-white/30"
      />
    </div>
  );
};

export default AnimatedBadgesBanner;