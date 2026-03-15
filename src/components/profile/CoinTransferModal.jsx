import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft, AlertCircle, Coins, ArrowRight, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslation } from 'react-i18next';

const FCFA_PER_COIN = 10;

const CoinTransferModal = ({ isOpen, onClose, balance, onSuccess }) => {
    const { t } = useTranslation();
    const [fcfaAmount, setFcfaAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const fcfaInt = parseInt(fcfaAmount) || 0;
    const coinAmount = Math.floor(fcfaInt / FCFA_PER_COIN);
    
    const commissionCoins = Math.floor(coinAmount * 0.05);
    const netCoins = coinAmount - commissionCoins;
    const netFcfa = netCoins * FCFA_PER_COIN;

    const isValid = coinAmount > 0 && coinAmount <= balance;

    const handleTransfer = async () => {
        if (!user) return;
        if (!isValid) {
            toast({ variant: "destructive", title: t('coinTransferModal.errors.title'), description: coinAmount <= 0 ? t('coinTransferModal.errors.invalidAmount') : t('coinTransferModal.errors.insufficientBalance') });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('convert_coins_to_earnings', {
                p_user_id: user.id,
                p_amount: coinAmount
            });

            if (error) throw error;

            if (data?.success) {
                toast({
                    title: "Transfert réussi !",
                    description: `${coinAmount} pièces (${fcfaInt} FCFA) transférées. Vous avez reçu ${netCoins} pièces (${netFcfa} FCFA) en gains.`,
                    className: "bg-green-600 text-white"
                });
                setFcfaAmount('');
                if (onSuccess) onSuccess(); 
                onClose();
            } else {
                throw new Error(data?.message || "Erreur lors du transfert");
            }
        } catch (err) {
            console.error("Transfer error:", err);
            toast({
                variant: "destructive",
                title: t('coinTransferModal.errors.title'),
                description: err.message || "Une erreur est survenue."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-primary" />
                        {t('coinTransferModal.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('coinTransferModal.description', { percent: 5 })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-medium">{t('coinTransferModal.balanceLabel')}</span>
                        <span className="text-lg font-bold text-primary flex items-center gap-1">
                            <Coins className="w-4 h-4" /> {balance} {t('transferModal.coins')}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fcfa">{t('coinTransferModal.amountLabel')}</Label>
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-muted-foreground" />
                            <Input
                                id="fcfa"
                                type="number"
                                placeholder="Ex: 1000"
                                value={fcfaAmount}
                                onChange={(e) => setFcfaAmount(e.target.value)}
                                min={0}
                                step="1"
                                className="flex-1"
                            />
                        </div>
                        {fcfaInt > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('coinTransferModal.equivalent', { coinAmount, rate: FCFA_PER_COIN })}
                            </p>
                        )}
                    </div>

                    {coinAmount > 0 && (
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">{t('coinTransferModal.details.gross')}</span>
                                <span className="font-semibold">{coinAmount} π</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span>{t('coinTransferModal.details.commission', { percent: 5 })}</span>
                                <span>- {commissionCoins} π</span>
                            </div>
                            <div className="border-t border-blue-200 pt-2 flex justify-between font-bold text-green-700">
                                <span>{t('coinTransferModal.details.net')}</span>
                                <span>{netCoins} π ({netFcfa} FCFA)</span>
                            </div>
                        </div>
                    )}

                    {fcfaAmount !== '' && !isValid && (
                        <Alert variant="destructive" className="py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="ml-2 text-sm font-semibold">{t('coinTransferModal.errors.title')}</AlertTitle>
                            <AlertDescription className="ml-2 text-xs">
                                {coinAmount <= 0 ? t('coinTransferModal.errors.invalidAmount') : t('coinTransferModal.errors.insufficientBalance')}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>{t('coinTransferModal.buttons.cancel')}</Button>
                    <Button onClick={handleTransfer} disabled={!isValid || loading} className="gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        {t('coinTransferModal.buttons.transfer')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CoinTransferModal;