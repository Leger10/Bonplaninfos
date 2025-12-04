import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Coins, Search, UserPlus, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslation } from 'react-i18next';

const CreditManagement = ({ onRefresh }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userProfile } = useData();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [creditHistory, setCreditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [logToReverse, setLogToReverse] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      let query = supabase.from('profiles').select('*');
      // If the user is a secretary, only fetch users from their country
      if (userProfile?.user_type === 'secretary') {
        query = query.eq('country', userProfile.country);
      }
      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({ title: t('common.error_title'), description: "Impossible de charger les utilisateurs.", variant: 'destructive' });
    }
  }, [t, userProfile]);

  const fetchCreditHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select(`id, created_at, details, target_user:target_id (full_name, email)`)
        .eq('actor_id', user.id)
        .eq('action_type', 'user_credited')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setCreditHistory(data.filter(log => !(log.details?.reversed)) || []);
    } catch (error) {
      toast({ title: t('common.error_title'), description: "Impossible de charger l'historique.", variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  }, [user.id, t]);

  useEffect(() => {
    fetchUsers();
    fetchCreditHistory();
  }, [fetchUsers, fetchCreditHistory]);

  useEffect(() => {
    if (searchTerm === '') {
        setFilteredUsers([]);
        return;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = users.filter(user =>
      user.full_name?.toLowerCase().includes(lowercasedFilter) ||
      user.email?.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredUsers(filteredData);
  }, [searchTerm, users]);

  const handleCredit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !amount || parseInt(amount) <= 0) {
      toast({ title: t('common.error_title'), description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: rpcData, error } = await supabase.rpc('credit_user_coins', {
        p_user_id: selectedUser.id,
        p_amount: parseInt(amount),
        p_reason: reason,
        p_creditor_id: user.id
      });
      
      if (error) throw new Error(error.message);
      if (!rpcData.success) throw new Error(rpcData.message);

      toast({ title: 'Succès', description: `${selectedUser.full_name} a été crédité de ${amount} pièces.` });
      setSelectedUser(null);
      setAmount('');
      setReason('');
      setSearchTerm('');
      fetchCreditHistory();
      if(onRefresh) onRefresh();
    } catch (error) {
      toast({ title: t('common.error_title'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReverseCredit = async () => {
    if (!logToReverse) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('reverse_credit', {
        p_log_id: logToReverse.id,
        p_reverser_id: user.id
      });

      if (error) throw new Error(error.message);
      if(!data.success) throw new Error(data.message);

      toast({ title: 'Succès', description: 'Le crédit a été annulé.' });
      fetchCreditHistory();
      if(onRefresh) onRefresh();
    } catch (error) {
      toast({ title: t('common.error_title'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setLogToReverse(null);
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>{t('secretary_dashboard.credit_form.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCredit} className="space-y-4">
              <div className='space-y-2'>
                <Label htmlFor="user-search">{t('secretary_dashboard.credit_form.search_user_label')}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="user-search"
                    placeholder={t('secretary_dashboard.credit_form.search_user_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {searchTerm && (
                <div>
                  <Label htmlFor="user-select">{t('secretary_dashboard.credit_form.user_label')}</Label>
                  <Select onValueChange={(value) => setSelectedUser(users.find(u => u.id === value))}>
                    <SelectTrigger id="user-select"><SelectValue placeholder={t('secretary_dashboard.credit_form.select_user_placeholder')} /></SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="amount">{t('secretary_dashboard.credit_form.amount_label')}</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('secretary_dashboard.credit_form.amount_placeholder')} />
              </div>
              <div>
                <Label htmlFor="reason">{t('secretary_dashboard.credit_form.reason_label')}</Label>
                <Input id="reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('secretary_dashboard.credit_form.reason_placeholder')} />
              </div>
              <Button type="submit" disabled={loading || !selectedUser} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {t('secretary_dashboard.credit_form.submit_button')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Mes 10 derniers crédits</CardTitle>
            <CardDescription>Liste de vos crédits les plus récents qui n'ont pas été annulés.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : creditHistory.length > 0 ? (
              <div className="space-y-3">
                {creditHistory.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">{log.target_user?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold flex items-center gap-1">{log.details.amount} <Coins className="w-4 h-4 text-yellow-400" /></div>
                      <Button variant="ghost" size="sm" onClick={() => setLogToReverse(log)}>
                        <RotateCcw className="w-4 h-4 text-red-500"/>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucun crédit effectué récemment.</p>
            )}
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={!!logToReverse} onOpenChange={() => setLogToReverse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment annuler ce crédit de {logToReverse?.details.amount} pièces pour {logToReverse?.target_user?.full_name}? Cette action est irréversible et déduira le montant du solde de l'utilisateur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleReverseCredit}>Oui, annuler</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreditManagement;