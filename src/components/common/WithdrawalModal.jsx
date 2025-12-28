import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calculator, CalendarClock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { isWithdrawalOpen } from '@/lib/dateUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const WithdrawalModal = ({ 
    open, 
    onOpenChange, 
    availableBalance = 0, 
    userType = 'organizer', 
    userId,
    onSuccess 
}) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [withdrawalConfig, setWithdrawalConfig] = useState({ withdrawal_dates: [5, 20] });
    const [isPoolOpen, setIsPoolOpen] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);
    
    // Constants
    const FEE_PERCENT = 0.05;
    const MIN_WITHDRAWAL_PI = 50; 
    const RATE = 10; 

    // Derived values for UI
    const availableBalancePI = Math.floor(availableBalance / RATE); 
    const requestedAmountPI = parseInt(amount) || 0;
    const requestedAmountFCFA = requestedAmountPI * RATE;
    
    const feeAmountFCFA = Math.ceil(requestedAmountFCFA * FEE_PERCENT);
    const netAmountFCFA = requestedAmountFCFA - feeAmountFCFA;

    useEffect(() => {
        if (open) {
            fetchConfig();
        }
    }, [open]);

    const fetchConfig = async () => {
        setConfigLoading(true);
        try {
            const { data } = await supabase.from('admin_withdrawal_config').select('*').limit(1).maybeSingle();
            const config = data || { withdrawal_dates: [5, 20] };
            if (!config.withdrawal_dates) config.withdrawal_dates = [5, 20];
            
            setWithdrawalConfig(config);
            setIsPoolOpen(isWithdrawalOpen(config.withdrawal_dates));
        } catch (error) {
            console.error("Config fetch error", error);
        } finally {
            setConfigLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (requestedAmountPI > availableBalancePI) {
            toast({ title: "Solde insuffisant", description: "Le montant dépasse votre solde disponible.", variant: "destructive" });
            return;
        }

        if (requestedAmountPI < MIN_WITHDRAWAL_PI) {
            toast({ title: "Montant trop faible", description: `Minimum requis : ${MIN_WITHDRAWAL_PI} π (${MIN_WITHDRAWAL_PI * RATE} FCFA).`, variant: "destructive" });
            return;
        }

        if (!method || !details) {
            toast({ title: "Champs manquants", description: "Veuillez remplir les informations de paiement.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('request_organizer_withdrawal', {
                p_amount_pi: requestedAmountPI,
                p_payment_details: { 
                    method, 
                    number: details, 
                    account_name: details,
                    fee_percent: FEE_PERCENT * 100,
                    fee_amount_fcfa: feeAmountFCFA,
                    net_amount_fcfa: netAmountFCFA
                }
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            const newBalancePi = data.new_balance;
            const newBalanceFcfa = newBalancePi * RATE;

            toast({ 
                title: "Succès", 
                description: `Demande envoyée. Nouveau solde: ${newBalanceFcfa.toLocaleString()} FCFA`, 
                variant: "success" 
            });
            
            if (onSuccess) onSuccess();
            onOpenChange(false);
            setAmount('');
        } catch (error) {
            console.error("Withdrawal error:", error);
            toast({ title: "Erreur", description: error.message || "Échec de la demande.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Effectuer un retrait</DialogTitle>
                    <DialogDescription>
                        Solde disponible : <span className="font-bold text-emerald-600">{availableBalance.toLocaleString()} FCFA</span> ({availableBalancePI} π)
                    </DialogDescription>
                </DialogHeader>

                {configLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4 py-2">
                        {userType === 'organizer' && !isPoolOpen && (
                            <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-800 text-xs">
                                <CalendarClock className="h-4 w-4" />
                                <AlertTitle>Info Retraits</AlertTitle>
                                <AlertDescription>
                                    Les gains liés aux interactions (Vues, etc.) ne sont retirables que le {withdrawalConfig.withdrawal_dates.join(', ')} du mois.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="amount">Montant à retirer (en Pièces π)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Ex: 100"
                                    className="flex-1"
                                />
                                <div className="bg-muted px-3 py-2 rounded-md border flex items-center min-w-[80px] justify-center font-medium text-xs sm:text-sm">
                                    {requestedAmountFCFA.toLocaleString()} F
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">1 π = {RATE} FCFA</p>
                        </div>

                        {requestedAmountPI > 0 && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Montant Brut:</span>
                                    <span>{requestedAmountFCFA.toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex justify-between text-red-500">
                                    <span className="flex items-center gap-1"><Calculator className="w-3 h-3" /> Frais (5%):</span>
                                    <span>- {feeAmountFCFA.toLocaleString()} FCFA</span>
                                </div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-emerald-700 text-base">
                                    <span>Net à recevoir:</span>
                                    <span>{netAmountFCFA.toLocaleString()} FCFA</span>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="method">Méthode de paiement</Label>
                            <Select onValueChange={setMethod}>
                                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Orange Money">Orange Money</SelectItem>
                                    <SelectItem value="MTN Money">MTN Money</SelectItem>
                                    <SelectItem value="Moov Money">Moov Money</SelectItem>
                                    <SelectItem value="Wave">Wave</SelectItem>
                                    <SelectItem value="Bank Transfer">Virement Bancaire</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="details">Numéro / Compte</Label>
                            <Input id="details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="0707..." />
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={loading || !amount || !method || requestedAmountPI <= 0} className="bg-emerald-600 text-white w-full sm:w-auto">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmer le retrait
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WithdrawalModal;