import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, AlertCircle, CalendarClock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { isWithdrawalOpen, getNextWithdrawalDate } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const WithdrawalModal = ({ 
    open, 
    onOpenChange, 
    availableBalance = 0, 
    userType = 'organizer', // 'organizer' | 'admin'
    userId,
    onSuccess 
}) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [withdrawalConfig, setWithdrawalConfig] = useState({ withdrawal_dates: [5, 20] });
    const [canWithdraw, setCanWithdraw] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);
    
    // Constants
    const FEE_PERCENT = 0.05;
    const MIN_NET_AMOUNT = 500;
    
    // Calculations
    const requestedAmount = parseFloat(amount) || 0;
    const fees = Math.ceil(requestedAmount * FEE_PERCENT);
    const netAmount = requestedAmount - fees;

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
            
            // Ensure withdrawal_dates is an array
            if (!config.withdrawal_dates && config.withdrawal_available_date) {
                config.withdrawal_dates = [config.withdrawal_available_date];
            } else if (!config.withdrawal_dates) {
                config.withdrawal_dates = [5, 20];
            }
            
            setWithdrawalConfig(config);
            setCanWithdraw(isWithdrawalOpen(config.withdrawal_dates));
        } catch (error) {
            console.error("Config fetch error", error);
        } finally {
            setConfigLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!canWithdraw && userType !== 'admin') { // Admins might override schedule
             toast({ title: "Retraits fermés", description: "Veuillez attendre la date d'ouverture.", variant: "destructive" });
             return;
        }

        if (requestedAmount > availableBalance) {
            toast({ title: "Solde insuffisant", description: "Le montant dépasse votre solde disponible.", variant: "destructive" });
            return;
        }

        if (netAmount < MIN_NET_AMOUNT) {
            toast({ 
                title: "Montant trop faible", 
                description: `Le montant net doit être d'au moins ${MIN_NET_AMOUNT} FCFA après frais.`, 
                variant: "destructive" 
            });
            return;
        }

        if (!method || !details) {
            toast({ title: "Informations manquantes", description: "Veuillez remplir tous les champs de paiement.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Use the secure RPC for creators/organizers to ensure atomic balance deduction
            if (userType !== 'admin') {
                const { data, error } = await supabase.rpc('create_withdrawal_request_secure', {
                    p_organizer_id: userId,
                    p_amount_fcfa: requestedAmount,
                    p_method: method,
                    p_details: { number: details, account_name: details }
                });

                if (error) throw error;
                if (!data.success) throw new Error(data.message);

            } else {
                // Admin flow (direct insert usually, or different logic)
                const { error } = await supabase.from('admin_withdrawal_requests').insert({
                    admin_id: userId,
                    amount_fcfa: requestedAmount,
                    amount_pi: Math.ceil(requestedAmount / 10),
                    fees: fees,
                    net_amount: netAmount,
                    status: 'pending',
                    method: method,
                    payment_details: { number: details },
                    requested_at: new Date().toISOString()
                });
                if (error) throw error;
            }

            toast({ 
                title: "Demande envoyée", 
                description: `Retrait de ${netAmount.toLocaleString()} FCFA (Net) soumis avec succès.`, 
                variant: "success" 
            });
            
            if (onSuccess) onSuccess();
            onOpenChange(false);
            setAmount('');
            setDetails('');
        } catch (error) {
            console.error("Withdrawal error:", error);
            toast({ title: "Erreur", description: error.message || "Impossible de traiter la demande.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const nextDate = getNextWithdrawalDate(withdrawalConfig.withdrawal_dates);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Effectuer un retrait</DialogTitle>
                    <DialogDescription>
                        Solde disponible : <span className="font-bold text-emerald-600 text-lg">{availableBalance.toLocaleString()} FCFA</span>
                    </DialogDescription>
                </DialogHeader>

                {configLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4 py-2">
                        {!canWithdraw && userType !== 'admin' && (
                            <Alert variant="warning" className="bg-yellow-500/10 border-yellow-500/50 text-yellow-700">
                                <CalendarClock className="h-4 w-4" />
                                <AlertTitle>Retraits fermés aujourd'hui</AlertTitle>
                                <AlertDescription>
                                    Les retraits sont disponibles le : <strong>{withdrawalConfig.withdrawal_dates.join(', ')}</strong> du mois.
                                    <br />
                                    Prochaine date : <strong>{nextDate ? format(nextDate, 'd MMMM yyyy', { locale: fr }) : '...'}</strong>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="amount">Montant à retirer (FCFA)</Label>
                            <div className="relative">
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-8 text-lg font-semibold"
                                    placeholder="0"
                                    disabled={(!canWithdraw && userType !== 'admin') || loading}
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">F</span>
                            </div>
                        </div>

                        {requestedAmount > 0 && (
                            <div className="bg-muted/50 p-4 rounded-lg border space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Montant demandé</span>
                                    <span>{requestedAmount.toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex justify-between text-orange-600">
                                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Frais (5%)</span>
                                    <span>- {fees.toLocaleString()} FCFA</span>
                                </div>
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                                    <span>Net à recevoir</span>
                                    <span className={netAmount < MIN_NET_AMOUNT ? "text-destructive" : "text-emerald-600"}>
                                        {netAmount.toLocaleString()} FCFA
                                    </span>
                                </div>
                                {netAmount < MIN_NET_AMOUNT && (
                                    <div className="text-destructive text-xs flex items-center gap-1 mt-1 font-medium justify-end">
                                        <AlertCircle className="w-3 h-3" /> Minimum requis : {MIN_NET_AMOUNT} FCFA
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="method">Méthode de paiement</Label>
                            <Select onValueChange={setMethod} disabled={(!canWithdraw && userType !== 'admin') || loading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une méthode" />
                                </SelectTrigger>
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
                            <Label htmlFor="details">Numéro / RIB</Label>
                            <Input
                                id="details"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Ex: 0707..."
                                disabled={(!canWithdraw && userType !== 'admin') || loading}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={loading || (!canWithdraw && userType !== 'admin') || requestedAmount > availableBalance || netAmount < MIN_NET_AMOUNT || !amount || !method || !details}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Confirmer le retrait
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WithdrawalModal;