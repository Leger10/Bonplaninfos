import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { PurchaseService } from '@/services/purchaseService';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";

const PaymentRedirectPage = () => {
    const { packSlug } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCustom, setIsCustom] = useState(false);
    const [customAmount, setCustomAmount] = useState(0);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const customAmountValue = searchParams.get('amount');
        if (packSlug === 'custom' && customAmountValue) {
            setIsCustom(true);
            setCustomAmount(parseInt(customAmountValue, 10));
        } else if (packSlug === 'custom' && !customAmountValue) {
            setError("Le montant pour un achat personnalisé est manquant.");
            setLoading(false);
        }
    }, [location.search, packSlug]);

    const initiatePayment = useCallback(async () => {
        if (!user) {
            toast({
                title: "Connexion requise",
                description: "Veuillez vous connecter pour effectuer un achat.",
                variant: "destructive"
            });
            navigate('/auth');
            return;
        }

        setLoading(true);
        try {
            let result;
            if (isCustom) {
                result = await PurchaseService.initiateCustomCoins(user.id, { amount_fcfa: customAmount });
            } else {
                const pack = await PurchaseService.getCoinPackBySlug(packSlug);
                if (!pack) {
                    throw new Error("Le pack que vous essayez d'acheter n'a pas été trouvé.");
                }
                result = await PurchaseService.initiateCoinPack(user.id, { pack_id: pack.id });
            }
            
            if (result && result.redirect_url) {
                navigate(result.redirect_url);
            } else {
                throw new Error("Impossible de générer le lien de paiement.");
            }
        } catch (err) {
            setError(err.message);
            toast({
                title: "Erreur de transaction",
                description: err.message,
                variant: "destructive"
            });
            setLoading(false);
        }
    }, [user, packSlug, navigate, toast, isCustom, customAmount]);

    useEffect(() => {
        if (error) return;

        if (user && (isCustom || (packSlug && packSlug !== 'custom'))) {
            initiatePayment();
        }
    }, [user, isCustom, packSlug, error, initiatePayment]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
                <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
                <h1 className="text-2xl font-bold">Préparation de votre transaction...</h1>
                <p className="text-muted-foreground">Veuillez patienter un instant.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-2xl font-bold text-destructive mb-4">Une erreur est survenue</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => navigate('/packs')}>Retour à la boutique</Button>
            </div>
        );
    }

    return null;
};

export default PaymentRedirectPage;