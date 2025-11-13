import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/layout/Navbar';
import { useData } from '@/contexts/DataContext';
import { PurchaseService } from '@/services/purchaseService';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const PaymentSuccessPage = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const { forceRefreshUserProfile, triggerVisualEffect } = useData();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState(t('paymentSuccess.processing'));

    const processPayment = useCallback(async () => {
        const transactionId = searchParams.get('transaction_id');
        const moneyfusionRef = searchParams.get('reference'); // Assuming moneyfusion provides a reference
        const userEmail = user?.email;

        if (!transactionId) {
            setStatus('error');
            setMessage(t('paymentError.missingParams'));
            setLoading(false);
            return;
        }

        try {
            const result = await PurchaseService.verifyAndCreditPayment(transactionId, userEmail, moneyfusionRef);
            
            if (result.success) {
                setStatus('success');
                setMessage(result.message);
                toast({
                    title: t('paymentSuccess.title'),
                    description: result.message,
                    variant: 'success',
                });
                forceRefreshUserProfile();
                triggerVisualEffect('bubbles');
            } else {
                setStatus('error');
                setMessage(result.message || 'Erreur lors du traitement du paiement.');
                toast({
                    title: t('paymentError.title'),
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error("Payment processing error:", error);
            setStatus('error');
            setMessage(t('paymentError.message'));
            toast({
                title: t('paymentError.title'),
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [searchParams, t, toast, forceRefreshUserProfile, triggerVisualEffect, user]);

    useEffect(() => {
        // We need user to be loaded before processing
        if(user) {
            processPayment();
        }
    }, [user, processPayment]);

    const renderContent = () => {
        switch (status) {
            case 'success':
                return {
                    icon: <CheckCircle className="mx-auto h-24 w-24 text-green-500" />,
                    header: t('paymentSuccess.header'),
                    message: message,
                };
            case 'error':
                 return {
                    icon: <AlertTriangle className="mx-auto h-24 w-24 text-destructive" />,
                    header: t('paymentError.title'),
                    message: message,
                };
            default: // processing
                return {
                    icon: <Loader2 className="mx-auto h-24 w-24 text-primary animate-spin" />,
                    header: t('paymentSuccess.processingHeader'),
                    message: message,
                };
        }
    };

    const { icon, header, message: contentMessage } = renderContent();

    return (
        <>
            <Navbar />
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <div className="text-center max-w-md">
                    {icon}
                    <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        {header}
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        {contentMessage}
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Link
                            to="/wallet"
                            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            {t('paymentSuccess.walletButton')}
                        </Link>
                        <Link to="/" className="text-sm font-semibold leading-6 text-foreground">
                            {t('paymentSuccess.homeButton')} <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentSuccessPage;