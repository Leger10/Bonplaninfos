import React, { useState, useEffect } from 'react';
import { PurchaseService } from '@/services/purchaseService';
import { motion } from 'framer-motion';
import { Loader2, Zap, Star, Gem, Crown, Sparkles, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const packIcons = {
    'Pack Débutant': <Zap className="w-8 h-8 text-yellow-400" />,
    'Pack Intermediaire': <Sparkles className="w-8 h-8 text-blue-400" />,
    'Pack Standard': <Star className="w-8 h-8 text-orange-400" />,
    'Pack Premium': <Gem className="w-8 h-8 text-purple-400" />,
    'Pack VIP': <Crown className="w-8 h-8 text-red-400" />,
    'Pack King': <img src="/king-icon.png" alt="King" className="w-10 h-10" />,
};

const CoinPacksPage = () => {
    const { user } = useAuth();
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customAmount, setCustomAmount] = useState(1000);
    const [customCoins, setCustomCoins] = useState(100);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPacks = async () => {
            try {
                const data = await PurchaseService.getCoinPacks();
                setPacks(data);
            } catch (error) {
                toast({
                    title: "Erreur",
                    description: "Impossible de charger les packs de pièces.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchPacks();
    }, [toast]);

    useEffect(() => {
        const coins = Math.floor(customAmount / 10) + PurchaseService.calculateCustomBonus(customAmount);
        setCustomCoins(coins);
    }, [customAmount]);

    const handlePurchase = (pack) => {
        if (!user) {
            toast({ title: "Connexion requise", description: "Veuillez vous connecter pour acheter des pièces.", variant: "destructive" });
            navigate('/auth');
            return;
        }
        navigate(`/payment/checkout?amount=${pack.fcfa_price}&packId=${pack.id}&type=coin_pack`);
    };

    const handleCustomPurchase = () => {
        if (!user) {
            toast({ title: "Connexion requise", description: "Veuillez vous connecter pour acheter des pièces.", variant: "destructive" });
            navigate('/auth');
            return;
        }
        if (customAmount < 500) {
            toast({
                title: "Montant invalide",
                description: "Le montant minimum est de 500 FCFA.",
                variant: "destructive",
            });
            return;
        }
        navigate(`/payment/checkout?amount=${customAmount}&type=custom_coins`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 text-foreground">
            <MultilingualSeoHead pageData={{
                title: "Acheter des Pièces - BonPlanInfos",
                description: "Rechargez votre compte en pièces pour interagir avec les événements, voter, et plus encore. Packs avantageux et bonus disponibles.",
            }} />
            <div className="container mx-auto px-4 py-12 md:py-20">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-secondary">
                        Boutique de Pièces
                    </h1>
                    <p className="max-w-2xl mx-auto mt-4 text-lg text-muted-foreground">
                        Rechargez votre portefeuille et débloquez tout le potentiel de BonPlanInfos.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {packs.filter(p => !p.is_custom).map((pack, index) => (
                        <motion.div
                            key={pack.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className={`h-full flex flex-col glass-effect hover:border-primary/50 transition-all duration-300 relative overflow-hidden ${pack.badge ? 'border-primary' : ''}`}>
                                {pack.badge && (
                                    <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">{pack.badge}</div>
                                )}
                                <CardHeader className="items-center text-center">
                                    {packIcons[pack.name] || <Zap className="w-8 h-8 text-gray-400" />}
                                    <CardTitle className="text-2xl">{pack.name}</CardTitle>
                                    <CardDescription>{pack.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col text-center">
                                    <div className="my-4">
                                        <span className="text-5xl font-bold">{pack.total_coins.toLocaleString()}</span>
                                        <span className="text-xl text-muted-foreground"> pièces</span>
                                    </div>
                                    {pack.bonus_coins > 0 && (
                                        <p className="text-green-500 font-semibold mb-4">
                                            +{pack.bonus_coins} pièces bonus incluses !
                                        </p>
                                    )}
                                    <div className="text-2xl font-semibold text-primary mb-6">
                                        {pack.fcfa_price.toLocaleString()} FCFA
                                    </div>
                                    <Button onClick={() => handlePurchase(pack)} size="lg" className="w-full mt-auto gradient-red text-primary-foreground">
                                        Acheter ce pack <ChevronsRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}

                    {/* Custom Amount Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: packs.length * 0.1 }}
                        className="md:col-span-2 lg:col-span-1"
                    >
                        <Card className="h-full flex flex-col glass-effect border-dashed border-2 hover:border-primary transition-all">
                            <CardHeader className="items-center text-center">
                                <Sparkles className="w-8 h-8 text-green-400" />
                                <CardTitle className="text-2xl">Montant Personnalisé</CardTitle>
                                <CardDescription>Choisissez exactement combien vous voulez dépenser.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col text-center justify-center">
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="custom-amount" className="text-muted-foreground">Montant en FCFA</Label>
                                        <Input
                                            id="custom-amount"
                                            type="number"
                                            value={customAmount}
                                            onChange={(e) => setCustomAmount(parseInt(e.target.value) || 0)}
                                            className="text-center text-2xl font-bold h-14"
                                            min="500"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-muted-foreground">Vous recevrez</p>
                                        <p className="text-3xl font-bold text-green-500">{customCoins.toLocaleString()} pièces</p>
                                    </div>
                                    <Button onClick={handleCustomPurchase} size="lg" className="w-full gradient-green text-primary-foreground">
                                        Procéder au paiement <ChevronsRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CoinPacksPage;