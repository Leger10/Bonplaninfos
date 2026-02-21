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

const CoinTransferModal = ({ isOpen, onClose, balance, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    // Conversion en entier pour le calcul (les pièces sont souvent des entiers)
    const amountInt = parseInt(amount) || 0;
    
    // Calculs automatiques
    const commission = Math.floor(amountInt * 0.05);
    const netAmount = amountInt - commission;
    
    const isValid = amountInt > 0 && amountInt <= balance;

    const handleTransfer = async () => {
        if (!user) return;
        if (!isValid) {
            toast({ variant: "destructive", title: "Montant invalide", description: "Vérifiez votre solde et le montant saisi." });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('convert_coins_to_earnings', {
                p_user_id: user.id,
                p_amount: amountInt
            });

            if (error) throw error;

            if (data?.success) {
                toast({
                    title: "Transfert réussi !",
                    description: `${amountInt} pièces transférées. Vous avez reçu ${data.net_amount} en gains.`,
                    className: "bg-green-600 text-white"
                });
                setAmount('');
                if (onSuccess) onSuccess(); 
                onClose();
            } else {
                throw new Error(data?.message || "Erreur lors du transfert");
            }
        } catch (err) {
            console.error("Transfer error:", err);
            toast({
                variant: "destructive",
                title: "Erreur technique",
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
                        Transférer des Pièces
                    </DialogTitle>
                    <DialogDescription>
                        Convertissez vos pièces en gains retirables.
                        Une commission de 5% est appliquée sur le montant transféré.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-medium">Solde disponible :</span>
                        <span className="text-lg font-bold text-primary flex items-center gap-1">
                            <Coins className="w-4 h-4" /> {balance}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Montant à transférer (Pièces)</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="Ex: 100"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={balance}
                            min={0}
                            step="1"
                        />
                    </div>

                    {amountInt > 0 && (
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Montant brut :</span>
                                <span className="font-semibold">{amountInt} π</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span>Commission (5%) :</span>
                                <span>- {commission} π</span>
                            </div>
                            <div className="border-t border-blue-200 pt-2 flex justify-between font-bold text-green-700">
                                <span>Montant Net (Gains) :</span>
                                <span>+ {netAmount} π</span>
                            </div>
                        </div>
                    )}

                    {!isValid && amount !== '' && (
                        <Alert variant="destructive" className="py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="ml-2 text-sm font-semibold">Erreur</AlertTitle>
                            <AlertDescription className="ml-2 text-xs">
                                {amountInt > balance ? "Solde insuffisant." : "Le montant doit être supérieur à 0."}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
                    <Button onClick={handleTransfer} disabled={!isValid || loading} className="gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Transférer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CoinTransferModal;