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
import { Loader2, ArrowRightLeft, AlertCircle, Coins, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';

const CoinToEarningsModal = ({ isOpen, onClose, balance, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    // Conversion en nombre flottant pour le calcul
    const amountNum = parseFloat(amount) || 0;
    
    // Estimation pour l'interface utilisateur
    const commission = (amountNum * 0.05).toFixed(2); 
    const netAmount = (amountNum - parseFloat(commission)).toFixed(2);
    
    // Valeurs CFA
    const amountCfa = amountNum * COIN_TO_FCFA_RATE;
    const commissionCfa = parseFloat(commission) * COIN_TO_FCFA_RATE;
    const netAmountCfa = parseFloat(netAmount) * COIN_TO_FCFA_RATE;
    
    const isValid = amountNum > 0 && amountNum <= balance;

    const handleTransfer = async () => {
        if (!user) return;
        if (!isValid) {
            toast({ variant: "destructive", title: "Montant invalide", description: "Vérifiez votre solde et le montant saisi." });
            return;
        }

        setLoading(true);
        try {
            // Appel à la fonction RPC
            const { data, error } = await supabase.rpc('convert_coins_to_earnings', {
                p_user_id: user.id,
                p_amount: amountNum
            });

            if (error) {
                if (error.message && error.message.includes('check constraint')) {
                    throw new Error("Erreur serveur: Type de transaction non autorisé. Contactez le support.");
                }
                if (error.message && error.message.includes('ambiguous')) {
                    throw new Error("Erreur configuration: Signature de fonction ambiguë.");
                }
                throw error;
            }

            if (data?.success) {
                toast({
                    title: "Conversion réussie !",
                    description: `${amountNum} pièces converties en ${data.net_amount} gains (${netAmountCfa.toLocaleString()} FCFA).`,
                    className: "bg-green-600 text-white"
                });
                setAmount('');
                onSuccess?.();
                onClose();
            } else {
                throw new Error(data?.error || data?.message || "Erreur lors du transfert");
            }
        } catch (err) {
            console.error("Transfer error:", err);
            toast({
                variant: "destructive",
                title: "Erreur technique",
                description: err.message
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
                        Convertir Pièces en Gains
                    </DialogTitle>
                    <DialogDescription>
                        Convertissez vos pièces achetées en solde de retrait.
                        Une commission de 5% est appliquée.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-medium">Solde disponible :</span>
                        <span className="text-lg font-bold text-primary flex items-center gap-1">
                            <Coins className="w-4 h-4" /> {balance} <span className="text-xs text-muted-foreground font-normal">({(balance * COIN_TO_FCFA_RATE).toLocaleString()} F)</span>
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Montant à convertir (en pièces)</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={balance}
                            min={0}
                            step="1"
                        />
                        {amountNum > 0 && (
                            <p className="text-xs text-muted-foreground text-right">
                                Valeur: {amountCfa.toLocaleString()} FCFA
                            </p>
                        )}
                    </div>

                    {amountNum > 0 && (
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Montant :</span>
                                <span className="font-semibold">{amountNum} ({amountCfa.toLocaleString()} F)</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span>Commission (5%) :</span>
                                <span>- {commission} ({commissionCfa.toLocaleString()} F)</span>
                            </div>
                            <div className="border-t border-blue-200 pt-2 flex justify-between font-bold text-green-700">
                                <span>Net à recevoir :</span>
                                <span>+ {netAmount} ({netAmountCfa.toLocaleString()} F)</span>
                            </div>
                        </div>
                    )}

                    {!isValid && amount !== '' && (
                        <Alert variant="destructive" className="py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="ml-2 text-sm font-semibold">Erreur</AlertTitle>
                            <AlertDescription className="ml-2 text-xs">
                                {amountNum > balance ? "Solde insuffisant." : "Le montant doit être supérieur à 0."}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
                    <Button onClick={handleTransfer} disabled={!isValid || loading} className="gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Convertir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CoinToEarningsModal;