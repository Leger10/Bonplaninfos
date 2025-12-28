import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Star,
  Crown,
  Sparkles,
  Coins,
  Check,
  Calculator,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MultilingualSeoHead from "@/components/MultilingualSeoHead";
import "@/components/LicensePurchase.css";

// Configuration des packs avec liens MoneyFusion spécifiques fournis par l'utilisateur
const CREDIT_PACKS = [
  {
    id: "pack_debutant",
    name: "Pack Débutant",
    amount: 500,
    coins: 50,
    bonus: 0,
    features: ["50 Crédits", "Idéal pour tester", "Validité illimitée"],
    icon: Coins,
    color: "text-slate-300",
    paymentLink: "https://my.moneyfusion.net/694df16698fe6dbde0fbf5c8",
  },
  {
    id: "pack_intermediaire",
    name: "Pack Intermédiaire",
    amount: 1000,
    coins: 100,
    bonus: 0,
    features: ["100 Crédits", "Participation simple", "Support standard"],
    icon: Zap,
    color: "text-blue-400",
    paymentLink: "https://my.moneyfusion.net/694df3b298fe6dbde0fbf9b5",
  },
  {
    id: "pack_standard",
    name: "Pack Standard",
    amount: 5000,
    coins: 500,
    bonus: 0,
    features: ["500 Crédits", "Création d'événements", "Boost léger"],
    icon: Star,
    color: "text-indigo-400",
    badge: "Populaire",
    paymentLink: "https://my.moneyfusion.net/694df44f98fe6dbde0fbfaa8",
  },
  {
    id: "pack_premium",
    name: "Pack Premium",
    amount: 10000,
    coins: 1000,
    bonus: 50,
    features: [
      "1000 Crédits",
      "+50 Crédits Bonus",
      "Visibilité accrue",
      "Support prioritaire",
    ],
    icon: Sparkles,
    color: "text-purple-400",
    badge: "Meilleure Offre",
    paymentLink: "https://my.moneyfusion.net/694df92d98fe6dbde0fbff97",
  },
  {
    id: "pack_vip",
    name: "Pack VIP",
    amount: 25000,
    coins: 2500,
    bonus: 250,
    features: [
      "2500 Crédits",
      "+250 Crédits Bonus",
      "Statut VIP",
      "Support dédié",
    ],
    icon: Crown,
    color: "text-red-400",
    badge: "Exclusif",
    paymentLink: "https://my.moneyfusion.net/694df7e598fe6dbde0fbfe80",
  },
  {
    id: "pack_king",
    name: "Pack King",
    amount: 50000,
    coins: 5000,
    bonus: 500,
    features: [
      "5000 Crédits",
      "+500 Crédits Bonus",
      "Boost Maximum",
      "Partenariat exclusif",
    ],
    icon: Crown,
    color: "text-orange-400",
    paymentLink: "https://my.moneyfusion.net/694df57e98fe6dbde0fbfc78",
  },
];

const CUSTOM_PAYMENT_LINK =
  "https://my.moneyfusion.net/694dfabb98fe6dbde0fc014f";

const CreditPacksPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");

  const handlePurchase = (pack) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour acheter des crédits.",
        variant: "warning",
      });
      navigate("/auth?redirect=/credit-packs");
      return;
    }

    // CORRECTION : Utiliser le lien spécifique du pack au lieu du lien personnalisé
    console.log(`Redirection vers: ${pack.paymentLink} pour ${pack.name}`);
    window.location.href = pack.paymentLink; // Utiliser pack.paymentLink spécifique
  };

  const handleCustomAmountPurchase = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour acheter des crédits.",
        variant: "warning",
      });
      navigate("/auth?redirect=/credit-packs");
      return;
    }

    // CORRECTION : S'assurer qu'on utilise seulement CUSTOM_PAYMENT_LINK ici
    console.log(`Redirection vers lien personnalisé: ${CUSTOM_PAYMENT_LINK}`);
    window.location.href = CUSTOM_PAYMENT_LINK;
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <MultilingualSeoHead
        pageData={{
          title: "Acheter des Crédits - BonPlanInfos",
          description:
            "Rechargez votre compte en crédits avec nos packs exclusifs.",
        }}
      />

      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Boutique d’achats de crédits
          </h1>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Sélectionnez le pack qui correspond le mieux à vos besoins et
            accédez facilement à nos services digitaux :
            <br />
            <br />
            🎯 Tombolas et tirages au sort en ligne sécurisés
            <br />
            🗳 Votes & concours transparents
            <br />
            🏪 Location de stands simplifiée
            <br />
            🎟 Achat de billets et tickets en ligne
          </p>
        </motion.div>

        {/* Packs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {CREDIT_PACKS.map((pack, index) => {
            const Icon = pack.icon;
            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative group bg-gray-900 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-800 flex flex-col hover:border-indigo-500/50"
              >
                {pack.badge && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-lg z-10">
                    {pack.badge}
                  </div>
                )}

                <div className="p-8 text-center border-b border-gray-800 bg-gray-900/30 flex-grow">
                  <div
                    className={`w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 ${pack.color}`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {pack.name}
                  </h3>
                  <div className="flex items-baseline justify-center mb-1">
                    <span className="text-4xl font-extrabold text-white">
                      {pack.amount.toLocaleString()}
                    </span>
                    <span className="text-lg font-medium text-slate-300 ml-1">
                      FCFA
                    </span>
                  </div>
                  <div className="inline-flex items-center bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded-full text-sm font-semibold mt-2 border border-indigo-700/50">
                    <Coins className="w-3 h-3 mr-1.5" />
                    {pack.coins.toLocaleString()} Crédits
                  </div>
                </div>

                <div className="p-8 bg-gray-900 flex flex-col justify-between flex-grow">
                  <ul className="space-y-4 mb-8">
                    {pack.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start text-sm text-slate-300"
                      >
                        <Check className="w-4 h-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {pack.bonus > 0 && (
                      <li className="flex items-start text-sm font-bold text-green-400 bg-green-900/20 p-2 rounded-lg border border-green-800/30">
                        <Sparkles className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span>+{pack.bonus} Crédits Bonus Offerts</span>
                      </li>
                    )}
                  </ul>

                  <Button
                    className={`w-full h-12 text-base font-medium shadow-lg transition-all duration-300 ${
                      pack.badge
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                        : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                    }`}
                    onClick={() => handlePurchase(pack)}
                  >
                    Acheter maintenant
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Custom Amount Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gray-700 to-gray-900"></div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 bg-gray-800 p-4 rounded-full">
                <Calculator className="w-8 h-8 text-gray-300" />
              </div>

              <div className="flex-grow text-center md:text-left">
                <h3 className="text-xl font-bold text-white mb-2">
                  Montant Personnalisé
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Vous souhaitez créditer un montant spécifique ? Utilisez notre
                  outil personnalisé.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative w-full">
                    <Input
                      type="number"
                      placeholder="Montant en FCFA"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="pr-16 bg-gray-800 border-gray-700 text-white focus:border-indigo-500 focus:ring-indigo-900 placeholder:text-gray-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      FCFA
                    </span>
                  </div>

                  <Button
                    className="w-full sm:w-auto bg-gray-800 border-2 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 whitespace-nowrap"
                    onClick={handleCustomAmountPurchase}
                  >
                    Payer <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                {customAmount > 0 && (
                  <p className="mt-3 text-sm font-medium text-indigo-400">
                    Vous recevrez environ{" "}
                    <span className="font-bold">
                      {Math.floor(customAmount / 10)}
                    </span>{" "}
                    Crédits
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreditPacksPage;
