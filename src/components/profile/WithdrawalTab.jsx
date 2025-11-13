import React, { useState, useEffect, useCallback } from 'react';
    import { motion, AnimatePresence } from 'framer-motion';
    import { Coins, Wallet, Send, History, CheckCircle, XCircle, Clock, Loader2, MessageCircle } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { useData } from '@/contexts/DataContext';
    import { toast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';

    const WithdrawalTab = () => {
      const { userProfile, adminConfig, forceRefreshUserProfile } = useData();
      const { user } = useAuth();
      const [requests, setRequests] = useState([]);
      const [loadingHistory, setLoadingHistory] = useState(true);
      const [loadingSubmit, setLoadingSubmit] = useState(false);
      const [form, setForm] = useState({ amount_pi: '', mobile_money_operator: 'orange', mobile_money_number: '' });
      const [showSuccess, setShowSuccess] = useState(false);

      const coinToCfaRate = adminConfig?.coin_to_fcfa_rate || 10;
      const minWithdrawalCoins = adminConfig?.min_withdrawal_pi || 50;
      const cfaAmount = form.amount_pi ? (parseInt(form.amount_pi, 10) * coinToCfaRate).toLocaleString() : 0;

      const fetchRequests = useCallback(async () => {
        if (!user) return;
        setLoadingHistory(true);
        try {
          const { data, error } = await supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('requested_at', { ascending: false });
          if (error) throw error;
          setRequests(data || []);
        } catch (error) {
          toast({ title: "Erreur", description: "Impossible de charger l'historique des retraits.", variant: "destructive" });
        } finally {
          setLoadingHistory(false);
        }
      }, [user]);

      useEffect(() => {
        fetchRequests();
      }, [fetchRequests]);

      const handleWithdraw = async (e) => {
        e.preventDefault();
        const amountNum = parseInt(form.amount_pi, 10);
        if (isNaN(amountNum) || amountNum < minWithdrawalCoins) {
          toast({ title: "Montant invalide", description: `Le retrait minimum est de ${minWithdrawalCoins} pièces.`, variant: "destructive" });
          return;
        }
        if (!form.mobile_money_number) {
          toast({ title: "Numéro manquant", description: "Veuillez fournir votre numéro de mobile money.", variant: "destructive" });
          return;
        }
        if (amountNum > (userProfile?.available_earnings || 0)) {
          toast({ title: "Solde insuffisant", description: "Votre solde de gains disponibles est insuffisant.", variant: "destructive" });
          return;
        }

        setLoadingSubmit(true);
        try {
          const { error } = await supabase.from('withdrawal_requests').insert({
            user_id: user.id,
            request_type: userProfile?.user_type === 'organizer' ? 'organizer_earnings' : 'user_earnings',
            amount_pi: amountNum,
            amount_fcfa: amountNum * coinToCfaRate,
            mobile_money_operator: form.mobile_money_operator,
            mobile_money_number: form.mobile_money_number,
            status: 'pending'
          });

          if (error) throw error;

          await supabase.from('profiles').update({
            available_earnings: userProfile.available_earnings - amountNum
          }).eq('id', user.id);

          setShowSuccess(true);
          forceRefreshUserProfile();
          fetchRequests();

        } catch (error) {
           toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
          setLoadingSubmit(false);
        }
      };

      const resetWithdrawal = () => {
        setForm({ amount_pi: '', mobile_money_operator: 'orange', mobile_money_number: '' });
        setShowSuccess(false);
      };

      const getStatusIcon = (status) => {
        switch (status) {
          case 'approved': return <CheckCircle className="text-green-400" />;
          case 'rejected': return <XCircle className="text-red-400" />;
          default: return <Clock className="text-yellow-400" />;
        }
      };

      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center"><Wallet className="mr-2 text-primary" /> Demander un retrait</h3>
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-400 mb-4">Demande envoyée !</h3>
                    <p className="text-muted-foreground mb-6">
                      Votre demande est en cours de traitement. Pour accélérer, envoyez une capture d'écran sur WhatsApp.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                       <a href={adminConfig?.support_phone || '#'} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full gradient-gold text-background">
                          <MessageCircle className="w-4 h-4 mr-2" /> Envoyer sur WhatsApp
                        </Button>
                      </a>
                      <Button variant="outline" onClick={resetWithdrawal} className="w-full">Nouveau retrait</Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleWithdraw} className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">Solde de gains disponible</p>
                      <p className="text-3xl font-bold text-primary flex items-center justify-center">
                        <Coins className="w-6 h-6 mr-2" /> {(userProfile?.available_earnings || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">≈ {( (userProfile?.available_earnings || 0) * coinToCfaRate).toLocaleString()} FCFA</p>
                    </div>
                    <div>
                      <Label htmlFor="amount">Pièces à retirer</Label>
                      <Input id="amount" type="number" placeholder={`Minimum ${minWithdrawalCoins} pièces`} value={form.amount_pi} onChange={e => setForm({ ...form, amount_pi: e.target.value })} required />
                      {form.amount_pi && <p className="text-sm text-muted-foreground mt-1">≈ {cfaAmount} FCFA</p>}
                    </div>
                    <div>
                      <Label htmlFor="method">Méthode de paiement</Label>
                      <Select value={form.mobile_money_operator} onValueChange={v => setForm({ ...form, mobile_money_operator: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="orange">Orange Money</SelectItem>
                          <SelectItem value="mtn">MTN Money</SelectItem>
                          <SelectItem value="wave">Wave</SelectItem>
                           <SelectItem value="moov">Moov Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="account">Numéro de compte</Label>
                      <Input id="account" type="tel" placeholder="Votre numéro de téléphone" value={form.mobile_money_number} onChange={e => setForm({ ...form, mobile_money_number: e.target.value })} required />
                    </div>
                    <Button type="submit" className="w-full gradient-red text-white" disabled={loadingSubmit}>
                      {loadingSubmit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Soumettre la demande
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center"><History className="mr-2 text-primary" /> Historique des retraits</h3>
              {loadingHistory ? <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {requests.length > 0 ? requests.map(req => (
                    <div key={req.id} className="p-3 rounded-lg bg-muted/50 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-foreground">{req.amount_pi} pièces ({req.amount_fcfa.toLocaleString()} FCFA)</p>
                        <p className="text-xs text-muted-foreground">{new Date(req.requested_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2" title={req.status}>
                        {getStatusIcon(req.status)}
                        <span className="capitalize text-sm">{req.status}</span>
                      </div>
                    </div>
                  )) : <p className="text-muted-foreground text-center py-8">Aucun retrait pour le moment.</p>}
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <h4 className="text-lg font-semibold text-yellow-400 mb-2">Instructions importantes</h4>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1 text-sm">
              <li>Le retrait minimum est de {minWithdrawalCoins} pièces ({ (minWithdrawalCoins * coinToCfaRate).toLocaleString()} FCFA).</li>
              <li>Le taux de conversion est de 1 pièce = {coinToCfaRate} FCFA.</li>
              <li>Après confirmation, envoyez une capture d'écran sur WhatsApp pour un traitement rapide.</li>
              <li>Le traitement des demandes prend généralement entre 24 et 48 heures.</li>
            </ul>
          </div>
        </motion.div>
      );
    };

    export default WithdrawalTab;