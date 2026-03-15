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
  const queryAmount = searchParams.get('amount');
  const status = searchParams.get('status') || 'success';

  useEffect(() => {
    if (!user) return;

    const processPayment = async () => {
      console.info(`[PaymentSuccess] Starting verification for txn: ${transactionId}`);
      if (!transactionId) {
        setError("Identifiant de transaction manquant.");
        setVerifying(false);
        return;
      }

      try {
        // 1. Check local 'payments' table
        const { data: paymentRecord, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', transactionId)
            .single();

        if (paymentError || !paymentRecord) {
            console.warn("[PaymentSuccess] Payment record not found in local DB.", paymentError);
            // We can continue with RPC fallback using query params just in case, but warn first.
        } else if (paymentRecord.status === 'completed') {
            console.info("[PaymentSuccess] Payment already marked completed.");
        }

        // Use amount from DB if available, else from URL
        const finalAmount = paymentRecord ? paymentRecord.amount_fcfa : parseInt(queryAmount, 10);
        
        if (!finalAmount) {
            setError("Montant de la transaction introuvable.");
            setVerifying(false);
            return;
        }

        // 2. Call the RPC to securely handle the balance distribution (Idempotent)
        const { data, error: rpcError } = await supabase.rpc('process_moneyfusion_success', {
          p_user_id: user.id,
          p_transaction_id: transactionId,
          p_amount: finalAmount,
          p_status: status
        });

        if (rpcError) throw rpcError;

        if (data.success) {
          // 3. Update 'payments' table status
          if (paymentRecord && paymentRecord.status !== 'completed') {
             await supabase.from('payments')
                 .update({ status: 'completed', processed_at: new Date() })
                 .eq('transaction_id', transactionId);
          }

          setSuccess(true);
          setResultData(data);
          
          // CRITICAL: Force refresh context to update globally
          console.info("[PaymentSuccess] Payment processed successfully. Forcing context refresh.");
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
          // Update payment table to failed if we had a record
          if (paymentRecord) {
             await supabase.from('payments').update({ status: 'failed' }).eq('transaction_id', transactionId);
          }
          setError(data.message || "Échec du traitement du paiement.");
        }
      } catch (err) {
        console.error("[PaymentSuccess] Payment processing error:", err);
        setError("Erreur lors de la communication avec le serveur.");
      } finally {
        setVerifying(false);
      }
    };

    // Small delay to ensure DB propagation from external hooks if any
    const timeout = setTimeout(processPayment, 1000);
    return () => clearTimeout(timeout);

  }, [user, transactionId, queryAmount, status, forceRefreshUserProfile, toast]);

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
            <p className="text-slate-500">Nous validons votre transaction sécurisée.</p>
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
                    <span className="text-xl font-medium text-slate-400">Crédits ajoutés</span>
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
            <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-700" onClick={() => navigate('/packs')}>
              <Home className="mr-2 w-4 h-4" /> Retourner à la boutique
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentSuccessPage;