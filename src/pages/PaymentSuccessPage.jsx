import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Loader2, AlertCircle, Coins, Home } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import { motion } from 'framer-motion';

const PaymentSuccessPage = () => {
    const { user } = useAuth();
    const { forceRefreshUserProfile } = useData(); 
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [error, setError] = useState(null);

    // Params from MoneyFusion Callback
    const transactionId = searchParams.get('transaction_id') || searchParams.get('id'); 
    const amount = searchParams.get('amount');
    const status = searchParams.get('status') || 'success';

    useEffect(() => {
        if (!user) return;

        const processPayment = async () => {
            if (!transactionId || !amount) {
                // If parameters are missing, try checking for legacy license flow fallback
                // But for credit packs, we need these params.
                setError("Paramètres de transaction manquants.");
                setVerifying(false);
                return;
            }

            try {
                // Call the new RPC designed for direct payments
                const { data, error: rpcError } = await supabase.rpc('process_moneyfusion_success', {
                    p_user_id: user.id,
                    p_transaction_id: transactionId,
                    p_amount: parseInt(amount, 10),
                    p_status: status
                });

                if (rpcError) throw rpcError;

                if (data.success) {
                    setSuccess(true);
                    setResultData(data);
                    forceRefreshUserProfile();
                    
                    if (!data.already_processed) {
                        toast({
                            title: "Paiement validé !",
                            description: `${data.coins_added} crédits ajoutés à votre compte.`,
                            variant: "default",
                            className: "bg-green-600 text-white border-none"
                        });
                    }
                } else {
                    setError(data.message || "Échec du traitement du paiement.");
                }
            } catch (err) {
                console.error("Payment processing error:", err);
                setError("Erreur lors de la communication avec le serveur.");
            } finally {
                setVerifying(false);
            }
        };

        const timeout = setTimeout(processPayment, 1000);
        return () => clearTimeout(timeout);

    }, [user, transactionId, amount, status, forceRefreshUserProfile, toast]);

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center space-y-6">
                    <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Vérification du paiement...</h2>
                        <p className="text-slate-500">Nous validons votre transaction MoneyFusion.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <MultilingualSeoHead pageData={{ title: "Paiement Réussi - BonPlanInfos", description: "Confirmation de votre achat." }} />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
            >
                <Card className="shadow-2xl border-0 overflow-hidden">
                    <div className={`h-2 w-full ${success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <CardHeader className="text-center pb-2 pt-8">
                        <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ${success ? 'bg-green-50' : 'bg-red-50'}`}>
                            {success ? (
                                <CheckCircle2 className="w-12 h-12 text-green-600" />
                            ) : (
                                <AlertCircle className="w-12 h-12 text-red-500" />
                            )}
                        </div>
                        <CardTitle className={`text-3xl font-bold ${success ? 'text-green-700' : 'text-red-700'}`}>
                            {success ? 'Paiement Réussi !' : 'Erreur de Traitement'}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6 text-center px-8">
                        {success ? (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center space-x-2 text-slate-500 mb-2">
                                        <Coins className="w-5 h-5" />
                                        <span className="font-medium">Compte Crédité</span>
                                    </div>
                                    
                                    <div className="py-4">
                                        <span className="text-6xl font-extrabold text-indigo-600 block mb-2">{resultData.coins_added}</span>
                                        <span className="text-xl font-medium text-slate-400">pièces ajoutés</span>
                                    </div>

                                    {resultData.bonus_added > 0 && (
                                        <div className="inline-block bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full mb-4">
                                            +{resultData.bonus_added} Bonus inclus 🎉
                                        </div>
                                    )}
                                    
                                    <div className="border-t border-slate-200 pt-4 mt-4">
                                        <p className="text-sm text-slate-500">Nouveau solde disponible</p>
                                        <p className="text-2xl font-bold text-slate-800">{resultData.new_balance} <span className="text-sm font-normal text-slate-400">crédits</span></p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                                <p className="text-red-700 font-medium mb-2">{error}</p>
                                <p className="text-xs text-red-400 font-mono mt-4">ID: {transactionId || 'Non fourni'}</p>
                                <p className="text-sm text-slate-500 mt-4">
                                    Si vous avez été débité, veuillez contacter le support avec l'ID de transaction ci-dessus.
                                </p>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 pt-4 pb-8 px-8">
                        <Button 
                            className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200" 
                            onClick={() => navigate('/profile')}
                        >
                            Voir mon profil <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-700" onClick={() => navigate('/credit-packs')}>
                            <Home className="mr-2 w-4 h-4" /> Retourner à la boutique
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};

export default PaymentSuccessPage;