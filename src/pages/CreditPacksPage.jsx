import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/customSupabaseClient";
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
  Rocket,
  Target,
  Flame,
  TrendingUp,
  X,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MultilingualSeoHead from "@/components/MultilingualSeoHead";
import { CouponService } from "@/services/CouponService";

const CREDIT_PACKS = [
  {
    id: "pack_debutant",
    name: "Pack Débutant",
    amount: 500,
    coins: 50,
    bonus: 0,
    features: [
      "50 Crédits",
      "Idéal pour tester",
      "Validité illimitée",
    ],
    icon: Coins,
    color: "text-yellow-400",
    glowColor: "rgba(250, 204, 21, 0.4)",
    actionTags: ["Démarrer", "Essentiel"],
  },
  {
    id: "pack_intermediaire",
    name: "Pack Standard",
    amount: 1000,
    coins: 100,
    bonus: 0,
    features: [
      "100 Crédits",
      "Participation simple",
      "Support standard",
    ],
    icon: Zap,
    color: "text-blue-400",
    glowColor: "rgba(59, 130, 246, 0.4)",
    actionTags: ["Populaire", "Sans risque"],
  },
  {
    id: "pack_standard",
    name: "Pack Start",
    amount: 5000,
    coins: 500,
    bonus: 0,
    features: [
      "500 Crédits",
      "Création d'événements",
      "Boost léger",
    ],
    icon: Star,
    color: "text-indigo-400",
    glowColor: "rgba(99, 102, 241, 0.4)",
    actionTags: ["Recommandé"],
    badge: "🔥 Choix intelligent",
  },
  {
    id: "pack_premium",
    name: "Pack Premium",
    amount: 10000,
    coins: 1000,
    bonus: 0,
    features: [
      "1000 Crédits",
      "Visibilité accrue",
      "Support prioritaire",
    ],
    icon: Sparkles,
    color: "text-purple-400",
    glowColor: "rgba(168, 85, 247, 0.4)",
    actionTags: ["Prioritaire"],
    badge: "🚀 Le plus acheté",
  },
  {
    id: "pack_vip",
    name: "Pack VIP",
    amount: 25000,
    coins: 2500,
    bonus: 0,
    features: [
      "2500 Crédits",
      "Statut VIP",
      "Support dédié",
    ],
    icon: Crown,
    color: "text-red-400",
    glowColor: "rgba(239, 68, 68, 0.4)",
    actionTags: ["Exclusif"],
    badge: "👑 Élite",
  },
  {
    id: "pack_king",
    name: "Pack King",
    amount: 50000,
    coins: 5000,
    bonus: 0,
    features: [
      "5000 Crédits",
      "Boost Maximum",
      "Partenariat exclusif",
    ],
    icon: Crown,
    color: "text-orange-400",
    glowColor: "rgba(249, 115, 22, 0.4)",
    actionTags: ["Maximum"],
    badge: "🏆 Ultime",
  },
];

const CreditPacksPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [feePercent, setFeePercent] = useState(3);
  const [userPhone, setUserPhone] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [tempPhone, setTempPhone] = useState("");
  const [pendingPurchase, setPendingPurchase] = useState(null);

  useEffect(() => {
    const fetchFees = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "moneyfusion_fee_percent")
        .single();
      if (data) setFeePercent(parseFloat(data.value));
    };
    fetchFees();
  }, []);

  useEffect(() => {
    const fetchUserPhone = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();
        
        if (data && !error) {
          const phone = data.phone || "";
          setUserPhone(phone);
          setTempPhone(phone);
          console.log("📱 Téléphone récupéré:", phone || "Aucun");
        }
      }
    };
    
    fetchUserPhone();
  }, [user?.id]);

  useEffect(() => {
    const savedCoupon = localStorage.getItem("appliedCoupon");
    if (savedCoupon) {
      try {
        const coupon = JSON.parse(savedCoupon);
        setAppliedCoupon(coupon);
        setCouponCode(coupon.code);
      } catch (e) {}
    }
  }, []);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Code vide",
        description: "Veuillez saisir un code.",
        variant: "destructive",
      });
      return;
    }
    setValidatingCoupon(true);
    try {
      const { valid, coupon, error } = await CouponService.validateCoupon(
        couponCode.trim().toUpperCase(),
      );

      if (!valid) throw new Error(error);

      const { data: ownerData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", coupon.user_id)
        .single();

      setAppliedCoupon({
        code: coupon.code,
        ownerEmail: ownerData?.email || "Propriétaire",
        ownerName: ownerData?.full_name || "Propriétaire",
        ownerId: coupon.user_id,
        commissionRate: 2,
      });

      localStorage.setItem(
        "appliedCoupon",
        JSON.stringify({
          code: coupon.code,
          ownerEmail: ownerData?.email || "Propriétaire",
          ownerName: ownerData?.full_name || "Propriétaire",
          ownerId: coupon.user_id,
          commissionRate: 2,
        }),
      );

      toast({
        title: "Coupon appliqué",
        description: `${coupon.code} est valide !`,
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Coupon invalide",
        description: err.message,
        variant: "destructive",
      });
      setAppliedCoupon(null);
      localStorage.removeItem("appliedCoupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    localStorage.removeItem("appliedCoupon");
    toast({
      title: "Coupon retiré",
      description: "Vous pouvez en appliquer un autre.",
      variant: "default",
    });
  };

  const saveUserPhone = async (phone) => {
    if (!user?.id) return false;
    
    const { error } = await supabase
      .from("profiles")
      .update({ phone: phone })
      .eq("id", user.id);
    
    if (error) {
      console.error("❌ Erreur sauvegarde téléphone:", error);
      return false;
    }
    
    setUserPhone(phone);
    console.log("✅ Téléphone sauvegardé:", phone);
    return true;
  };

  const initPayment = async (amountFcfa, coinsAmount, packId) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour acheter des crédits.",
        variant: "destructive",
      });
      navigate("/auth?redirect=/packs");
      return;
    }

    if (!userPhone || userPhone.trim() === "") {
      setPendingPurchase({ amountFcfa, coinsAmount, packId });
      setShowPhoneModal(true);
      return;
    }

    await processPayment(amountFcfa, coinsAmount, packId);
  };

  const processPayment = async (amountFcfa, coinsAmount, packId) => {
    setIsProcessing(true);
    const txnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // ✅ LOGIQUE CORRECTE:
    // - amountFcfa = prix que l'utilisateur voit (ex: 500 FCFA)
    // - L'utilisateur paie exactement amountFcfa sur MoneyFusion
    // - MoneyFusion prend 3%, tu reçois 97%
    // - L'utilisateur reçoit des crédits = amountFcfa / 10 (ex: 50 crédits = 500 FCFA)
    
    const totalWithFees = amountFcfa; // Ce que l'utilisateur paie (500)
    const finalCoinsAmount = Math.floor(amountFcfa / 10); // Crédits reçus (50)
    
    const moneyFusionFee = Math.floor(amountFcfa * feePercent / 100);
    const whatYouReceive = amountFcfa - moneyFusionFee;
    
    console.log(`💰 Transaction ${packId}:`);
    console.log(`   Utilisateur voit et paie: ${amountFcfa} FCFA`);
    console.log(`   MoneyFusion prend ${feePercent}%: -${moneyFusionFee} FCFA`);
    console.log(`   Tu reçois: ${whatYouReceive} FCFA`);
    console.log(`   Utilisateur reçoit: ${finalCoinsAmount} crédits (${finalCoinsAmount * 10} FCFA)`);

    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          coins_amount: finalCoinsAmount,
          amount_fcfa: amountFcfa,
          status: "pending",
          payment_method: "moneyfusion",
          transaction_id: txnId,
          pack_id: packId,
          coupon_code: appliedCoupon?.code || null,
          credits_added: false,
        })
        .select()
        .single();

      if (paymentError) {
        console.error("❌ Erreur Supabase insert :", paymentError);
        throw new Error(`Erreur lors de l'enregistrement: ${paymentError.message}`);
      }

      console.log("✅ Paiement enregistré en attente:", paymentData);

      let couponUsageId = null;
      if (appliedCoupon?.code) {
        const registerResult = await CouponService.registerCouponUsage(
          appliedCoupon.code,
          user.id,
          amountFcfa,
          paymentData.id,
        );

        if (registerResult.success) {
          couponUsageId = registerResult.usageId;
        }
      }

      localStorage.setItem("pendingPaymentTxnId", txnId);
      localStorage.setItem("pendingPaymentAmount", amountFcfa);
      localStorage.setItem("pendingPaymentCoins", finalCoinsAmount);
      localStorage.setItem("pendingPaymentPackId", packId);
      localStorage.setItem("pendingPaymentUserId", user.id);
      if (couponUsageId) {
        localStorage.setItem("pendingCouponUsageId", couponUsageId);
      }

      const response = await fetch("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalPrice: totalWithFees,
          article: [{ [packId]: amountFcfa }],
          personal_Info: [
            {
              userId: user.id,
              orderId: txnId,
              couponCode: appliedCoupon?.code || null,
              amountFcfa: amountFcfa,
              paymentId: paymentData.id,
              couponUsageId: couponUsageId,
            },
          ],
          numeroSend: userPhone,
          nomclient: user.email || "Client",
          return_url: `https://bonplaninfos.net/payment-success?transaction_id=${txnId}&amount=${amountFcfa}&status=success`,
          webhook_url: "https://bonplaninfos.net/.netlify/functions/moneyfusion-webhook",
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Erreur création paiement");

      window.location.href = result.redirect_url;
      
    } catch (err) {
      console.error("Payment init error:", err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!tempPhone || tempPhone.trim() === "") {
      toast({
        title: "Numéro requis",
        description: "Veuillez entrer votre numéro de téléphone.",
        variant: "destructive",
      });
      return;
    }

    let cleanPhone = tempPhone.replace(/\D/g, '');
    
    if (cleanPhone.length > 12) {
      cleanPhone = cleanPhone.slice(-12);
    }
    
    if (cleanPhone.startsWith('226') && cleanPhone.length > 8) {
      cleanPhone = cleanPhone.substring(3);
    }
    
    if (cleanPhone.startsWith('0') && cleanPhone.length === 9) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    if (cleanPhone.length < 8 || cleanPhone.length > 12) {
      toast({
        title: "Numéro invalide",
        description: "Veuillez entrer un numéro valide (8 à 12 chiffres).",
        variant: "destructive",
      });
      return;
    }

    const saved = await saveUserPhone(cleanPhone);
    if (saved && pendingPurchase) {
      setShowPhoneModal(false);
      await processPayment(pendingPurchase.amountFcfa, pendingPurchase.coinsAmount, pendingPurchase.packId);
      setPendingPurchase(null);
    }
  };

  const handlePurchase = (pack) => {
    // Pas de bonus supplémentaire, l'utilisateur reçoit exactement amount/10 crédits
    const totalCoins = pack.coins;
    initPayment(pack.amount, totalCoins, pack.id);
  };

  const handleCustomAmountPurchase = () => {
    const amount = parseInt(customAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un montant valide.",
        variant: "destructive",
      });
      return;
    }

    const estimatedCoins = Math.floor(amount / 10);
    initPayment(amount, estimatedCoins, "custom");
  };

  return (
    <div className="min-h-screen bg-black py-12 px-4 text-gray-100">
      <MultilingualSeoHead
        pageData={{
          title: "Acheter des Crédits - BonPlanInfos",
          description: "Rechargez votre compte en crédits avec nos packs exclusifs.",
        }}
      />

      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-yellow-500/50 shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Numéro de téléphone requis
              </h3>
              <p className="text-gray-400">
                Pour effectuer un paiement, nous avons besoin de votre numéro.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📱 Votre numéro WhatsApp / Mobile
              </label>
              <Input
                type="tel"
                placeholder="Ex: 771234567"
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white text-lg"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Format: 8 à 12 chiffres (sans espaces)
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowPhoneModal(false);
                  setPendingPurchase(null);
                }}
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Annuler
              </Button>
              <Button
                onClick={handlePhoneSubmit}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              >
                Continuer
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">
            💳 Boutique de crédits BonPlanInfos
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Rechargez votre compte en toute sécurité, choisissez un pack adapté
            à vos besoins et participez facilement aux événements.
          </p>
        </motion.div>

        {/* Section code promo */}
        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl animate-bounce">🎁</span>
              <h2 className="text-xl font-bold text-white">Entrez votre Code coupon</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Entrez un code (ex: MONCODE123)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                  className="bg-gray-800 border-gray-700 text-white uppercase"
                />
              </div>
              {!appliedCoupon ? (
                <Button
                  onClick={validateCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                >
                  {validatingCoupon ? "Vérification..." : "Appliquer"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={removeCoupon}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <X className="w-4 h-4 mr-2" /> Retirer
                </Button>
              )}
            </div>

            {appliedCoupon && (
              <div className="mt-4 p-3 bg-green-900/40 border border-green-500/50 rounded-lg">
                <p className="text-green-300 font-medium">✓ Code {appliedCoupon.code} appliqué</p>
                <p className="text-gray-300 text-xs mt-1">
                  👤 Parrain : {appliedCoupon.ownerName || appliedCoupon.ownerEmail}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Packs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {CREDIT_PACKS.map((pack, index) => {
            const Icon = pack.icon;
            const totalCoins = pack.coins;
            // Calcul de ce que l'utilisateur reçoit en valeur FCFA
            const valueInFcfa = totalCoins * 10;

            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative group bg-gray-900 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden border border-gray-800 flex flex-col"
              >
                {pack.badge && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg z-10">
                    {pack.badge}
                  </div>
                )}
                <div className="p-8 text-center border-b border-gray-800 bg-gray-950">
                  <div className={`w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-6 ${pack.color}`}>
                    <Icon className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{pack.name}</h3>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-5xl font-extrabold text-white">{pack.amount.toLocaleString()}</span>
                    <span className="text-lg font-medium text-gray-400 ml-1">FCFA</span>
                  </div>
                  <div className="inline-flex items-center bg-gray-800 border border-gray-700 text-yellow-300 px-3 py-1 rounded-full text-sm font-bold">
                    <Coins className="w-4 h-4 mr-1" />
                    {totalCoins.toLocaleString()} Crédits
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    (Soit {valueInFcfa.toLocaleString()} FCFA)
                  </div>
                </div>
                <div className="p-6 bg-gray-900">
                  <ul className="space-y-3 mb-6">
                    {pack.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-sm text-gray-300">
                        <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    disabled={isProcessing}
                    className={`w-full font-bold ${
                      pack.badge ? "bg-purple-600 hover:bg-purple-700" : "bg-yellow-500 hover:bg-yellow-600 text-black"
                    }`}
                    onClick={() => handlePurchase(pack)}
                  >
                    {isProcessing ? "Redirection..." : `Acheter ${pack.amount.toLocaleString()} FCFA`}
                    {!isProcessing && <Rocket className="ml-2 w-4 h-4" />}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Montant Personnalisé */}
        <motion.div className="max-w-2xl mx-auto">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 bg-gray-800 p-4 rounded-full">
                <Calculator className="w-10 h-10 text-yellow-400" />
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="text-xl font-bold text-white mb-2">Montant Personnalisé</h3>
                <p className="text-gray-400 text-sm mb-6">Vous avez un budget spécifique ?</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative w-full">
                    <Input
                      type="number"
                      placeholder="Montant en FCFA"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="pr-16 bg-gray-800 border-gray-700 text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">FCFA</span>
                  </div>
                  <Button
                    disabled={isProcessing}
                    className="bg-gray-800 border border-gray-700 text-white hover:border-yellow-500"
                    onClick={handleCustomAmountPurchase}
                  >
                    <Target className="mr-2 w-4 h-4" />
                    Payer personnalisé
                  </Button>
                </div>
                {customAmount && parseInt(customAmount) > 0 && (
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-sm font-medium text-gray-300">
                      Vous recevrez{" "}
                      <span className="font-bold text-yellow-300">
                        {Math.floor(parseInt(customAmount) / 10).toLocaleString()} Crédits
                      </span>
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-4">
                  💡 Tous nos prix incluent les frais de transaction
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreditPacksPage;