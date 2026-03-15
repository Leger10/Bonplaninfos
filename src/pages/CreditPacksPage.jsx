/*
  SQL Reference for 'payments' table:
  CREATE TABLE IF NOT EXISTS public.payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id),
      coins_amount INTEGER NOT NULL,
      amount_fcfa NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      transaction_id TEXT UNIQUE NOT NULL,
      processed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
*/
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Star, Crown, Sparkles, Coins, Check, Calculator, Rocket, Target, Gift, Shield, Flame, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import '@/components/LicensePurchase.css';

// Configuration des packs avec liens MoneyFusion spécifiques
const CREDIT_PACKS = [
    { 
        id: 'pack_debutant', 
        name: 'Pack Débutant',
        amount: 500, 
        coins: 50, 
        bonus: 0, 
        features: ['50 Crédits', 'Idéal pour tester', 'Validité illimitée'],
        icon: Coins, 
        color: 'text-yellow-400',
        actionTags: ['Démarrer', 'Essentiel'],
        paymentLink: 'https://my.moneyfusion.net/694df16698fe6dbde0fbf5c8' 
    },
    { 
        id: 'pack_intermediaire', 
        name: 'Pack Intermédiaire',
        amount: 1000, 
        coins: 100, 
        bonus: 0, 
        features: ['100 Crédits', 'Participation simple', 'Support standard'],
        icon: Zap, 
        color: 'text-blue-400',
        actionTags: ['Populaire', 'Sans risque'],
        paymentLink: 'https://my.moneyfusion.net/694df3b298fe6dbde0fbf9b5' 
    },
    { 
        id: 'pack_standard', 
        name: 'Pack Standard',
        amount: 5000, 
        coins: 500, 
        bonus: 0, 
        features: ['500 Crédits', 'Création d\'événements', 'Boost léger'],
        icon: Star, 
        color: 'text-indigo-400',
        actionTags: ['Recommandé', 'Meilleur rapport'],
        badge: '🔥 Choix intelligent',
        paymentLink: 'https://my.moneyfusion.net/694df44f98fe6dbde0fbfaa8'
    },
    { 
        id: 'pack_premium', 
        name: 'Pack Premium',
        amount: 10000, 
        coins: 1000, 
        bonus: 50, 
        features: ['1000 Crédits', '+50 Crédits Bonus', 'Visibilité accrue', 'Support prioritaire'],
        icon: Sparkles, 
        color: 'text-purple-400',
        actionTags: ['Boost +50%', 'Prioritaire'],
        badge: '🚀 Le plus acheté',
        paymentLink: 'https://my.moneyfusion.net/694df92d98fe6dbde0fbff97'
    },
    { 
        id: 'pack_vip', 
        name: 'Pack VIP',
        amount: 25000, 
        coins: 2500, 
        bonus: 250, 
        features: ['2500 Crédits', '+250 Crédits Bonus', 'Statut VIP', 'Support dédié'],
        icon: Crown, 
        color: 'text-red-400',
        actionTags: ['Exclusif', '+250 Bonus'],
        badge: '👑 Élite',
        paymentLink: 'https://my.moneyfusion.net/694df7e598fe6dbde0fbfe80'
    },
    { 
        id: 'pack_king', 
        name: 'Pack King',
        amount: 50000, 
        coins: 5000, 
        bonus: 500, 
        features: ['5000 Crédits', '+500 Crédits Bonus', 'Boost Maximum', 'Partenariat exclusif'],
        icon: Crown, 
        color: 'text-orange-400',
        actionTags: ['Maximum', '+500 Bonus'],
        badge: '🏆 Ultime',
        paymentLink: 'https://my.moneyfusion.net/694df57e98fe6dbde0fbfc78'
    },
];

const CUSTOM_PAYMENT_LINK = "https://my.moneyfusion.net/694dfabb98fe6dbde0fc014f";

const CreditPacksPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [customAmount, setCustomAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const initPayment = async (amountFcfa, coinsAmount, paymentLink) => {
        if (!user) {
            toast({ 
                title: "Connexion requise", 
                description: "Veuillez vous connecter pour acheter des crédits.", 
                variant: "warning" 
            });
            navigate('/auth?redirect=/packs');
            return;
        }

        setIsProcessing(true);
        const txnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        try {
            // Create a payment record in the 'payments' table before redirect
            const { error } = await supabase.from('payments').insert({
                user_id: user.id,
                coins_amount: coinsAmount,
                amount_fcfa: amountFcfa,
                status: 'pending',
                payment_method: 'moneyfusion',
                transaction_id: txnId
            });

            if (error) {
                console.error("[Payment Init] Supabase error:", error);
                throw new Error("Erreur lors de l'enregistrement de la transaction.");
            }

            console.info(`[Payment] Record created: ${txnId}, redirecting to MoneyFusion...`);

            // Build precise redirect URLs
            const successUrl = encodeURIComponent(`${window.location.origin}/payment-success?transaction_id=${txnId}&amount=${amountFcfa}&status=success`);
            const cancelUrl = encodeURIComponent(`${window.location.origin}/payment-cancel`);
            
            const finalRedirectLink = `${paymentLink}?transaction_id=${txnId}&success_url=${successUrl}&cancel_url=${cancelUrl}`;
            window.location.href = finalRedirectLink;

        } catch (err) {
            console.error("Payment init error:", err);
            toast({ title: "Erreur", description: "Impossible d'initialiser le paiement.", variant: "destructive" });
            setIsProcessing(false);
        }
    };

    const handlePurchase = (pack) => {
        initPayment(pack.amount, pack.coins + pack.bonus, pack.paymentLink);
    };

    const handleCustomAmountPurchase = () => {
        const amount = parseInt(customAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Erreur", description: "Veuillez entrer un montant valide.", variant: "destructive" });
            return;
        }
        
        // Calculate estimated coins (Assuming 10 FCFA = 1 Coin + manual bonus)
        let estimatedCoins = Math.floor(amount / 10);
        let bonus = 0;
        if (amount >= 250000) bonus = Math.floor(estimatedCoins * 0.15);
        else if (amount >= 50000) bonus = Math.floor(estimatedCoins * 0.10);
        else if (amount >= 10000) bonus = Math.floor(estimatedCoins * 0.05);

        initPayment(amount, estimatedCoins + bonus, CUSTOM_PAYMENT_LINK);
    };

    return (
        <div className="min-h-screen bg-black py-12 px-4 text-gray-100">
            <MultilingualSeoHead pageData={{ 
                title: "Acheter des Crédits - BonPlanInfos", 
                description: "Rechargez votre compte en crédits avec nos packs exclusifs." 
            }} />
            
            <div className="max-w-7xl mx-auto space-y-16">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-center space-y-4"
                >
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500">
                        Boutique de Crédits
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Choisissez le pack qui correspond à vos besoins et débloquez instantanément des fonctionnalités premium.
                    </p>
                    
                    {/* Stats Banner */}
                    <div className="max-w-3xl mx-auto mt-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Shield className="w-4 h-4 text-green-400" />
                                    <span className="text-sm font-medium text-gray-300">Paiement sécurisé</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Zap className="w-4 h-4 text-yellow-400" />
                                    <span className="text-sm font-medium text-gray-300">Recharge instantanée</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Gift className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm font-medium text-gray-300">Bonus exclusifs</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Target className="w-4 h-4 text-red-400" />
                                    <span className="text-sm font-medium text-gray-300">Crédits illimités</span>
                                </div>
                            </div>
                        </div>
                    </div>
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
                                className="relative group bg-gray-900 rounded-2xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 overflow-hidden border border-gray-800 flex flex-col hover:border-yellow-500/50 hover:scale-[1.02]"
                            >
                                {/* Action Tags */}
                                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                                    {pack.actionTags?.map((tag, idx) => (
                                        <span 
                                            key={idx}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg shadow-yellow-500/20"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                
                                {pack.badge && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-lg">
                                        {pack.badge}
                                    </div>
                                )}
                                
                                <div className="p-8 text-center border-b border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 flex-grow">
                                    <div className={`w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300 ${pack.color} shadow-current/20`}>
                                        <Icon className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-4">{pack.name}</h3>
                                    <div className="flex items-baseline justify-center mb-2">
                                        <span className="text-5xl font-extrabold text-white">{pack.amount.toLocaleString()}</span>
                                        <span className="text-lg font-medium text-gray-400 ml-2">FCFA</span>
                                    </div>
                                    <div className="inline-flex items-center bg-gray-800 border border-gray-700 text-yellow-300 px-4 py-2 rounded-full text-sm font-bold mt-2">
                                        <Coins className="w-4 h-4 mr-2" />
                                        {pack.coins.toLocaleString()} Crédits
                                    </div>
                                </div>

                                <div className="p-8 bg-gray-900 flex flex-col justify-between flex-grow">
                                    <ul className="space-y-4 mb-8">
                                        {pack.features.map((feature, i) => (
                                            <li key={i} className="flex items-start text-sm text-gray-300 hover:text-white transition-colors">
                                                <Check className="w-4 h-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                        {pack.bonus > 0 && (
                                            <li className="flex items-start text-sm font-bold text-green-400 bg-gray-800/50 p-3 rounded-lg border border-green-500/20">
                                                <Sparkles className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                                <span>+{pack.bonus} Crédits Bonus Offerts</span>
                                            </li>
                                        )}
                                    </ul>

                                    <Button 
                                        disabled={isProcessing}
                                        className={`w-full h-14 text-base font-bold shadow-lg transition-all duration-300 group relative overflow-hidden ${
                                            pack.badge 
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:shadow-purple-500/30' 
                                            : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black hover:shadow-yellow-500/30'
                                        }`}
                                        onClick={() => handlePurchase(pack)}
                                    >
                                        <span className="relative z-10 flex items-center justify-center">
                                            {isProcessing ? "Redirection..." : "Acheter maintenant"}
                                            {!isProcessing && <Rocket className="ml-2 w-4 h-4" />}
                                        </span>
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
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
                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl border border-gray-800 p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500"></div>
                        <div className="absolute -right-20 -top-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                        
                        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                            <div className="flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-full border border-gray-700 shadow-lg">
                                <Calculator className="w-10 h-10 text-yellow-400" />
                            </div>
                            
                            <div className="flex-grow text-center md:text-left">
                                <div className="flex items-center gap-2 mb-2">
                                    <Flame className="w-5 h-5 text-orange-400" />
                                    <h3 className="text-xl font-bold text-white">Montant Personnalisé</h3>
                                    <span className="ml-2 px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-full">Flexible</span>
                                </div>
                                <p className="text-gray-400 text-sm mb-6">
                                    Vous avez un budget spécifique ? Créez votre propre pack de crédits !
                                </p>
                                
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="relative w-full">
                                        <Input 
                                            type="number" 
                                            placeholder="Montant en FCFA" 
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            className="pr-16 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-yellow-500/20 h-12 text-base"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">FCFA</span>
                                    </div>
                                    
                                    <Button 
                                        disabled={isProcessing}
                                        className="w-full sm:w-auto h-12 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 text-white hover:text-white hover:border-yellow-500 hover:bg-gray-800 whitespace-nowrap font-medium shadow-lg"
                                        onClick={handleCustomAmountPurchase}
                                    >
                                        <Target className="mr-2 w-4 h-4" />
                                        {isProcessing ? "Patientez..." : "Payer personnalisé"}
                                    </Button>
                                </div>
                                
                                {customAmount > 0 && (
                                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                        <p className="text-sm font-medium text-gray-300">
                                            Vous recevrez environ <span className="font-bold text-yellow-300">{Math.floor(customAmount / 10).toLocaleString()} Crédits</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Call to Action Banner */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-black to-gray-900 border border-gray-800"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-purple-500/10"></div>
                    <div className="relative p-8 text-center">
                        <div className="inline-flex items-center gap-3 mb-4">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                            <h3 className="text-xl font-bold text-white">Pourquoi choisir nos packs ?</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <div className="space-y-2">
                                <div className="text-yellow-400 font-bold">📈 Boost d'activité</div>
                                <p className="text-sm text-gray-400">Augmentez votre visibilité instantanément</p>
                            </div>
                            <div className="space-y-2">
                                <div className="text-yellow-400 font-bold">⚡ Crédits immédiats</div>
                                <p className="text-sm text-gray-400">Rechargez et utilisez vos crédits sans délai</p>
                            </div>
                            <div className="space-y-2">
                                <div className="text-yellow-400 font-bold">🎁 Bonus exclusifs</div>
                                <p className="text-sm text-gray-400">Plus vous achetez, plus vous économisez</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CreditPacksPage;