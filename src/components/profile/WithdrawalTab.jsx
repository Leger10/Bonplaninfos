import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2, DollarSign, History, RefreshCw, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WithdrawalTab = () => {
  const { user } = useAuth();
  // Correctly use appSettings instead of adminConfig
  const { userProfile, forceRefreshUserProfile, appSettings, loading: globalLoading } = useData();
  
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Use appSettings with fallbacks
  const minWithdrawal = appSettings?.min_withdrawal_pi || 50;
  const rate = appSettings?.coin_to_fcfa_rate || 10;
  
  // Safe access to earnings
  const availableEarnings = userProfile?.available_earnings || 0;

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);

    try {
      const { data, error } = await supabase
        .from('organizer_withdrawal_requests')
        .select('*')
        .eq('organizer_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setWithdrawalHistory(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      toast({
        title: "Erreur historique",
        description: "Impossible de charger l'historique.",
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

    if (!user) return;

    const withdrawalAmount = parseInt(amount);

    // Validation Rules
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast({ title: "Montant invalide", description: "Veuillez entrer un montant positif.", variant: "destructive" });
      return;
    }

    if (withdrawalAmount < minWithdrawal) {
      toast({ title: "Minimum non atteint", description: `Le retrait minimum est de ${minWithdrawal}π.`, variant: "destructive" });
      return;
    }

    if (withdrawalAmount > availableEarnings) {
      toast({ title: "Solde insuffisant", description: "Vous dépassez vos gains disponibles.", variant: "destructive" });
      return;
    }

    if (!paymentMethod || !accountNumber.trim()) {
      toast({ title: "Détails manquants", description: "Veuillez remplir les informations de paiement.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('request_organizer_withdrawal', {
        p_amount_pi: withdrawalAmount,
        p_payment_details: {
          method: paymentMethod,
          number: accountNumber.trim()
        }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      toast({
        title: "Demande envoyée !",
        description: "Votre demande de retrait est en cours de traitement.",
        variant: "success" // Using custom variant if available, else default
      });

      // Reset Form
      setAmount('');
      setPaymentMethod('');
      setAccountNumber('');

      // Refresh Data
      if (forceRefreshUserProfile) await forceRefreshUserProfile();
      await fetchHistory();

    } catch (error) {
      console.error('Erreur retrait:', error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de la demande de retrait.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (globalLoading && !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Chargement des données financières...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Balance Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Gains Disponibles
          </CardTitle>
          <CardDescription>Convertibles en FCFA selon le taux en vigueur</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-8">
            <div>
              <p className="text-4xl font-bold text-primary tracking-tight">
                {availableEarnings.toLocaleString('fr-FR')} <span className="text-2xl">π</span>
              </p>
              <p className="text-muted-foreground font-medium mt-1">
                ≈ {(availableEarnings * rate).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            {availableEarnings < minWithdrawal && (
              <Alert variant="warning" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">Minimum requis: {minWithdrawal}π</AlertTitle>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Withdrawal Form */}
        <Card className="shadow-sm h-full">
          <CardHeader>
            <CardTitle>Nouvelle Demande</CardTitle>
            <CardDescription>Initiez un transfert vers votre compte</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant à retirer (π)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min. ${minWithdrawal}`}
                    min={minWithdrawal}
                    max={availableEarnings}
                    className="pl-9"
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground text-sm">π</div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Correspondance: {amount ? (parseInt(amount) * rate).toLocaleString() : 0} FCFA</span>
                  <button 
                    type="button" 
                    onClick={() => setAmount(availableEarnings)}
                    className="text-primary hover:underline font-medium"
                  >
                    Max: {availableEarnings}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orange Money">Orange Money</SelectItem>
                    <SelectItem value="Moov Money">Moov Money</SelectItem>
                    <SelectItem value="Wave">Wave</SelectItem>
                    <SelectItem value="MTN Money">MTN Money</SelectItem>
                    <SelectItem value="Virement Bancaire">Virement Bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Numéro / RIB</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Ex: +225 07..."
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full font-bold"
                disabled={loading || availableEarnings < minWithdrawal || !amount || !paymentMethod}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                Confirmer le retrait
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* History */}
        <Card className="shadow-sm h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Historique</CardTitle>
              <CardDescription>Vos dernières demandes</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchHistory} disabled={loadingHistory}>
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px] pr-2">
            {loadingHistory && withdrawalHistory.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : withdrawalHistory.length > 0 ? (
              <div className="space-y-3">
                {withdrawalHistory.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{req.amount_pi} π</span>
                        <span className="text-xs text-muted-foreground">({(req.amount_pi * rate).toLocaleString()} FCFA)</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <History className="h-3 w-3" />
                        {new Date(req.requested_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs font-medium text-foreground/80">
                        {req.payment_details?.method} • {req.payment_details?.number}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={
                        req.status === 'approved' || req.status === 'paid' ? 'success' : 
                        req.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {req.status === 'approved' ? 'Validé' : 
                         req.status === 'paid' ? 'Payé' : 
                         req.status === 'rejected' ? 'Rejeté' : 'En attente'}
                      </Badge>
                      {req.rejection_reason && (
                        <span className="text-[10px] text-red-500 max-w-[100px] truncate" title={req.rejection_reason}>
                          {req.rejection_reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun historique disponible</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalTab;