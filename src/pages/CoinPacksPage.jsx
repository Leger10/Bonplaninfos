import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Star, Crown, Sparkles, Coins, Check, Calculator, ArrowRight, AlertCircle, Flame, TrendingUp, Rocket, Target, Gift, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import '@/components/LicensePurchase.css';

// Configuration des packs avec liens MoneyFusion spécifiques UNIQUES pour chaque pack
const CREDIT_PACKS = [
    { 
        id: 'pack_debutant', 
        name: 'Débutant',
        amount: 500, 
        coins: 50, 
        bonus: 0, 
        features: ['50 pièces', 'Test', 'Illimité'],
        icon: Coins, 
        color: 'text-yellow-400',
        actionTags: ['Essentiel'],
        paymentLink: 'https://my.moneyfusion.net/694df16698fe6dbde0fbf5c8' 
    },
    { 
        id: 'pack_intermediaire', 
        name: 'Intermédiaire',
        amount: 1000, 
        coins: 100, 
        bonus: 0, 
        features: ['100 pièces', 'Simple', 'Support'],
        icon: Zap, 
        color: 'text-blue-400',
        actionTags: ['Populaire'],
        paymentLink: 'https://my.moneyfusion.net/694df3b298fe6dbde0fbf9b5' 
    },
    { 
        id: 'pack_standard', 
        name: 'Standard',
        amount: 5000, 
        coins: 500, 
        bonus: 0, 
        features: ['500 pièces', 'Événements', 'Boost léger'],
        icon: Star, 
        color: 'text-indigo-400',
        actionTags: ['Recommandé'],
        badge: '🔥 Choix',
        paymentLink: 'https://my.moneyfusion.net/694df44f98fe6dbde0fbfaa8'
    },
    { 
        id: 'pack_premium', 
        name: 'Premium',
        amount: 10000, 
        coins: 1000, 
        bonus: 50, 
        features: ['1000 pièces', '+50 Bonus', 'Visibilité +', 'Prioritaire'],
        icon: Sparkles, 
        color: 'text-purple-400',
        actionTags: ['+50%'],
        badge: '🚀 Top',
        paymentLink: 'https://my.moneyfusion.net/694df92d98fe6dbde0fbff97'
    },
    { 
        id: 'pack_vip', 
        name: 'VIP',
        amount: 25000, 
        coins: 2500, 
        bonus: 250, 
        features: ['2500 pièces', '+250 Bonus', 'Statut VIP', 'Dédié'],
        icon: Crown, 
        color: 'text-red-400',
        actionTags: ['Exclusif'],
        badge: '👑 Élite',
        paymentLink: 'https://my.moneyfusion.net/694df7e598fe6dbde0fbfe80'
    },
    { 
        id: 'pack_king', 
        name: 'King',
        amount: 50000, 
        coins: 5000, 
        bonus: 500, 
        features: ['5000 pièces', '+500 Bonus', 'Boost Max', 'Partenaire'],
        icon: Crown, 
        color: 'text-orange-400',
        actionTags: ['Maximum'],
        badge: '🏆 Ultime',
        paymentLink: 'https://my.moneyfusion.net/694df57e98fe6dbde0fbfc78'
    },
];

// Lien UNIQUEMENT pour le paiement personnalisé
const CUSTOM_PAYMENT_LINK = "https://my.moneyfusion.net/694dfabb98fe6dbde0fc014f";

const CoinPacksPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [customAmount, setCustomAmount] = useState('');

    // Fonction pour les packs STANDARDS
    const handlePurchase = (pack) => {
        if (!user) {
            toast({ 
                title: "Connexion requise", 
                description: "Veuillez vous connecter pour acheter des crédits.", 
                variant: "warning" 
            });
            navigate('/auth?redirect=/credit-packs');
            return;
        }

        // CORRECTION IMPORTANTE : Utiliser le lien SPÉCIFIQUE du pack
        console.log(`Achat pack ${pack.name} - Redirection vers: ${pack.paymentLink}`);
        window.location.href = pack.paymentLink; // Lien UNIQUE pour chaque pack
    };

    // Fonction UNIQUEMENT pour le paiement personnalisé
    const handleCustomAmountPurchase = () => {
        if (!user) {
            toast({ 
                title: "Connexion requise", 
                description: "Veuillez vous connecter pour acheter des crédits.", 
                variant: "warning" 
            });
            navigate('/auth?redirect=/credit-packs');
            return;
        }
        
        // CORRECTION : Utiliser CUSTOM_PAYMENT_LINK pour le paiement personnalisé
        console.log(`Paiement personnalisé - Redirection vers: ${CUSTOM_PAYMENT_LINK}`);
        window.location.href = CUSTOM_PAYMENT_LINK;
    };

    return (
        <div className="min-h-screen bg-black py-8 px-3 sm:px-4 text-gray-100">
            <MultilingualSeoHead pageData={{ 
                title: "Acheter des pièces - BonPlanInfos", 
                description: "Rechargez votre compte en crédits avec nos packs exclusifs." 
            }} />
            
            <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-center space-y-3 sm:space-y-4"
                >
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500">
                        Boutique des pièces
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto px-2">
                       Choisis ton pack, recharge ton compte et profite des événements exclusifs 🔥
                    </p>
                    
                    {/* Stats Banner - Version mobile simplifiée */}
                    <div className="max-w-3xl mx-auto mt-4 sm:mt-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                                <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-300">Sécurisé</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                                <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-300">Instantané</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                                <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-300">Bonus</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                                <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <Target className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-300">Illimité</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Packs Grid - 2 colonnes sur mobile, 3 sur desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {CREDIT_PACKS.map((pack, index) => {
                        const Icon = pack.icon;
                        return (
                            <motion.div 
                                key={pack.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative group bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden border border-gray-800 flex flex-col hover:border-yellow-500/30 hover:scale-[1.02]"
                            >
                                {/* Action Tags */}
                                <div className="absolute top-2 left-2 z-10">
                                    {pack.actionTags?.map((tag, idx) => (
                                        <span 
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                
                                {pack.badge && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-bl-lg sm:rounded-bl-xl">
                                        {pack.badge}
                                    </div>
                                )}
                                
                                <div className="p-4 sm:p-6 text-center border-b border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 flex-grow">
                                    <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-3 sm:mb-4 shadow group-hover:scale-105 transition-transform duration-300 ${pack.color} shadow-current/10`}>
                                        <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </div>
                                    <h3 className="text-sm sm:text-lg font-bold text-white mb-2">{pack.name}</h3>
                                    <div className="flex items-baseline justify-center mb-1">
                                        <span className="text-xl sm:text-3xl font-extrabold text-white">{pack.amount.toLocaleString()}</span>
                                        <span className="text-xs sm:text-sm font-medium text-gray-400 ml-1">FCFA</span>
                                    </div>
                                    <div className="inline-flex items-center bg-gray-800 border border-gray-700 text-yellow-300 px-2 sm:px-3 py-1 rounded-full text-xs font-bold mt-1">
                                        <Coins className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                        {pack.coins.toLocaleString()} pièces
                                    </div>
                                </div>

                                <div className="p-4 sm:p-6 bg-gray-900 flex flex-col justify-between flex-grow">
                                    <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                                        {pack.features.map((feature, i) => (
                                            <li key={i} className="flex items-start text-xs sm:text-sm text-gray-300 hover:text-white transition-colors">
                                                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                        {pack.bonus > 0 && (
                                            <li className="flex items-start text-xs sm:text-sm font-bold text-green-400 bg-gray-800/50 p-2 rounded border border-green-500/20">
                                                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mr-1 sm:mr-2 mt-0.5 flex-shrink-0" />
                                                <span>+{pack.bonus} Bonus</span>
                                            </li>
                                        )}
                                    </ul>

                                    <Button 
                                        className={`w-full h-10 sm:h-12 text-sm sm:text-base font-bold shadow transition-all duration-300 group relative overflow-hidden ${
                                            pack.badge 
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:shadow-purple-500/20' 
                                            : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black hover:shadow-yellow-500/20'
                                        }`}
                                        onClick={() => handlePurchase(pack)}
                                    >
                                        <span className="relative z-10 flex items-center justify-center text-xs sm:text-sm">
                                            Acheter
                                            <Rocket className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4" />
                                        </span>
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Custom Amount Section - Version mobile optimisée */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-2xl mx-auto px-2 sm:px-0"
                >
                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl sm:rounded-2xl shadow border border-gray-800 p-4 sm:p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500"></div>
                        
                        <div className="flex flex-col items-center gap-4 sm:gap-6 relative z-10">
                            <div className="flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-full border border-gray-700 shadow">
                                <Calculator className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
                            </div>
                            
                            <div className="flex-grow text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                                    <h3 className="text-base sm:text-lg font-bold text-white">Montant Personnalisé</h3>
                                    <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-full">Flexible</span>
                                </div>
                                <p className="text-gray-400 text-xs sm:text-sm mb-4">
                                    Budget spécifique ? Créez votre pack !
                                </p>
                                
                                <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            placeholder="Montant en FCFA" 
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            className="pr-12 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500 h-10 sm:h-12 text-sm"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm">FCFA</span>
                                    </div>
                                    
                                    <Button 
                                        className="h-10 sm:h-12 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 text-white hover:text-white hover:border-yellow-500 hover:bg-gray-800 font-medium shadow text-sm sm:text-base"
                                        onClick={handleCustomAmountPurchase}
                                    >
                                        <Target className="mr-2 w-3 h-3 sm:w-4 sm:h-4" />
                                        Payer personnalisé
                                    </Button>
                                </div>
                                
                                {customAmount > 0 && (
                                    <div className="mt-3 p-2 bg-gray-800/50 rounded border border-gray-700">
                                        <p className="text-xs sm:text-sm font-medium text-gray-300">
                                            Vous recevrez ~ <span className="font-bold text-yellow-300">{Math.floor(customAmount / 10).toLocaleString()} pièces</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Call to Action Banner - Version mobile simplifiée */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-gray-900 via-black to-gray-900 border border-gray-800 mx-2 sm:mx-0"
                >
                    <div className="relative p-4 sm:p-6 text-center">
                        <div className="inline-flex items-center gap-2 mb-3">
                            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                            <h3 className="text-sm sm:text-lg font-bold text-white">Pourquoi nos packs ?</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
                            <div className="space-y-1">
                                <div className="text-yellow-400 font-bold text-xs sm:text-sm">📈 Boost</div>
                                <p className="text-xs sm:text-sm text-gray-400">Visibilité instantanée</p>
                            </div>
                            <div className="space-y-1">
                                <div className="text-yellow-400 font-bold text-xs sm:text-sm">⚡ Immédiat</div>
                                <p className="text-xs sm:text-sm text-gray-400">Utilisez sans délai</p>
                            </div>
                            <div className="space-y-1">
                                <div className="text-yellow-400 font-bold text-xs sm:text-sm">🎁 Économies</div>
                                <p className="text-xs sm:text-sm text-gray-400">Plus vous achetez</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CoinPacksPage;