import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WithdrawalTab = () => {
    const { user } = useAuth();
    const { userProfile, forceRefreshUserProfile, adminConfig } = useData();
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const minWithdrawal = adminConfig?.min_withdrawal_pi || 50;
    const rate = adminConfig?.coin_to_fcfa_rate || 10;
    const availableEarnings = userProfile?.available_earnings || 0;

    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('organizer_withdrawal_requests')
                .select('*')
                .eq('organizer_id', user.id)
                .order('requested_at', { ascending: false });

            if (error) {
                console.error('Erreur chargement historique:', error);
                toast({ 
                    title: "Erreur", 
                    description: "Impossible de charger l'historique des retraits.", 
                    variant: "destructive" 
                });
            } else {
                setWithdrawalHistory(data || []);
            }
        } catch (error) {
            console.error('Exception chargement historique:', error);
            toast({ 
                title: "Erreur", 
                description: "Erreur inattendue lors du chargement de l'historique.", 
                variant: "destructive" 
            });
        } finally {
            setLoadingHistory(false);
        }
    }, [user]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!user) {
            toast({ 
                title: "Non connecté", 
                description: "Vous devez être connecté pour effectuer un retrait.", 
                variant: "destructive" 
            });
            return;
        }

        const withdrawalAmount = parseInt(amount);

        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            toast({ 
                title: "Montant invalide", 
                description: "Veuillez entrer un montant valide.", 
                variant: "destructive" 
            });
            return;
        }

        if (withdrawalAmount < minWithdrawal) {
            toast({ 
                title: "Montant minimum non atteint", 
                description: `Le montant minimum pour un retrait est de ${minWithdrawal}π (${minWithdrawal * rate} FCFA).`, 
                variant: "destructive" 
            });
            return;
        }
        
        if (withdrawalAmount > availableEarnings) {
            toast({ 
                title: "Solde insuffisant", 
                description: "Vous n'avez pas assez de gains disponibles.", 
                variant: "destructive" 
            });
            return;
        }

        if (!paymentMethod || !accountNumber.trim()) {
            toast({ 
                title: "Informations manquantes", 
                description: "Veuillez sélectionner un moyen de paiement et entrer votre numéro.", 
                variant: "destructive" 
            });
            return;
        }

        setLoading(true);

        try {
            console.log("📤 Envoi demande de retrait:", {
                amount: withdrawalAmount,
                paymentMethod,
                accountNumber,
                user: user.id
            });

            const { data, error } = await supabase.rpc('request_organizer_withdrawal', {
                p_amount_pi: withdrawalAmount,
                p_payment_details: {
                    method: paymentMethod,
                    number: accountNumber.trim()
                }
            });

            console.log("📥 Réponse Supabase:", { data, error });

            if (error) {
                console.error("❌ Erreur RPC:", error);
                throw new Error(error.message);
            }

            // Vérifier la réponse JSON de la fonction
            if (data && !data.success) {
                throw new Error(data.message);
            }

            console.log("✅ Succès:", data);
            
            toast({ 
                title: "✅ Succès", 
                description: data?.message || "Votre demande de retrait a été envoyée." 
            });
            
            setAmount('');
            setPaymentMethod('');
            setAccountNumber('');
            
            if (forceRefreshUserProfile) {
                await forceRefreshUserProfile();
            }
            await fetchHistory();
            
        } catch (error) {
            console.error('💥 Erreur demande de retrait:', error);
            toast({ 
                title: "❌ Erreur", 
                description: error.message || "Une erreur est survenue lors de la demande de retrait.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    if (!userProfile || !adminConfig) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Chargement des données...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Demander un retrait</CardTitle>
                    <CardDescription>
                        Retirez vos gains disponibles. Le solde minimum requis est de {minWithdrawal}π 
                        (soit {minWithdrawal * rate} FCFA).
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-r-lg">
                            <p className="font-semibold text-lg">Gains disponibles pour retrait :</p>
                            <p className="text-3xl font-bold text-primary">
                                {availableEarnings.toLocaleString('fr-FR')} π
                            </p>
                            <p className="text-muted-foreground text-sm">
                                ~ {(availableEarnings * rate).toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="amount">Montant à retirer (en pièces π)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={`Minimum ${minWithdrawal}π`}
                                min={minWithdrawal}
                                max={availableEarnings}
                                disabled={availableEarnings < minWithdrawal || loading}
                            />
                            <p className="text-sm text-muted-foreground">
                                Équivalent: {amount ? (parseInt(amount) * rate).toLocaleString('fr-FR') : 0} FCFA
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="paymentMethod">Moyen de paiement</Label>
                            <Select 
                                onValueChange={setPaymentMethod} 
                                value={paymentMethod} 
                                disabled={loading}
                            >
                                <SelectTrigger id="paymentMethod">
                                    <SelectValue placeholder="Sélectionnez un moyen de paiement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Orange Money">Orange Money</SelectItem>
                                    <SelectItem value="Moov Money">Moov Money</SelectItem>
                                    <SelectItem value="Wave">Wave</SelectItem>
                                    <SelectItem value="Virement Bancaire">Virement Bancaire</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="accountNumber"> Numéro de téléphone / Compte bancaire</Label>
                            <Input
                                id="accountNumber"
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="Entrez L'indicatif suivi du numéro ou l'IBAN de votre compte Bancaire"
                                disabled={loading}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            type="submit" 
                            disabled={
                                availableEarnings < minWithdrawal || 
                                loading || 
                                !amount || 
                                !paymentMethod || 
                                !accountNumber.trim()
                            }
                            className="w-full"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <DollarSign className="mr-2 h-4 w-4" />
                            )}
                            Demander le retrait
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Historique des retraits</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingHistory ? (
                         <div className="flex justify-center items-center h-24">
                             <Loader2 className="animate-spin mr-2" />
                             Chargement de l'historique...
                         </div>
                    ) : withdrawalHistory.length > 0 ? (
                        <ul className="space-y-3">
                            {withdrawalHistory.map((item) => (
                                <li key={item.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                    <div>
                                        <p className="font-semibold">
                                            {item.amount_pi} π 
                                            (~{(item.amount_pi * rate).toLocaleString('fr-FR')} FCFA)
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(item.requested_at).toLocaleString('fr-FR')}
                                        </p>
                                        {item.payment_details && (
                                            <p className="text-xs text-muted-foreground">
                                                {item.payment_details.method} - {item.payment_details.number}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                        item.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                                        'bg-red-500/20 text-red-300'
                                    }`}>
                                        {item.status === 'pending' ? 'En attente' :
                                         item.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            Aucun retrait effectué pour le moment.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WithdrawalTab;