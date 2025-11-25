import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Coins, Search, UserPlus, RotateCcw, User, Mail, Calendar } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

const CreditManagement = ({ onRefresh, users: propUsers, userProfile: propUserProfile }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userProfile: contextUserProfile } = useData();
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

  // Utiliser les utilisateurs passés en props ou les récupérer localement
  const currentUsers = propUsers || users;
  const currentUserProfile = propUserProfile || contextUserProfile;

  const fetchUsers = useCallback(async () => {
    // Si les utilisateurs sont passés en props, ne pas les récupérer
    if (propUsers) return;
    
    try {
      let query = supabase.from('profiles').select('*');
      // Si l'utilisateur est un secrétaire, ne récupérer que les utilisateurs de son pays
      if (currentUserProfile?.user_type === 'secretary') {
        query = query.eq('country', currentUserProfile.country);
      }
      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({ 
        title: t('common.error_title'), 
        description: "Impossible de charger les utilisateurs.", 
        variant: 'destructive' 
      });
    }
  }, [t, currentUserProfile, propUsers]);

  const fetchCreditHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      console.log('🔍 Récupération historique crédits pour:', {
        userId: user.id,
        userType: currentUserProfile?.user_type
      });

      // Récupérer les logs de crédit
      let query = supabase
        .from('admin_logs')
        .select('*')
        .eq('action_type', 'user_credited')
        .order('created_at', { ascending: false })
        .limit(10);

      // Si l'utilisateur n'est pas super_admin, ne récupérer que ses crédits
      if (currentUserProfile?.user_type !== 'super_admin') {
        query = query.eq('actor_id', user.id);
      }

      const { data: logs, error: logsError } = await query;
      
      if (logsError) {
        console.error('❌ Erreur logs:', logsError);
        throw logsError;
      }

      console.log('📊 Logs récupérés:', logs);

      if (!logs || logs.length === 0) {
        console.log('ℹ️ Aucun log trouvé');
        setCreditHistory([]);
        return;
      }

      // Récupérer les informations des utilisateurs cibles
      const userIds = [...new Set(logs.map(log => log.target_id).filter(Boolean))];
      console.log('👥 IDs utilisateurs cibles:', userIds);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ Erreur utilisateurs:', usersError);
        throw usersError;
      }

      console.log('👤 Données utilisateurs:', usersData);

      // Récupérer les informations des créditeurs (acteurs)
      const actorIds = [...new Set(logs.map(log => log.actor_id).filter(Boolean))];
      const { data: actorsData, error: actorsError } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type')
        .in('id', actorIds);

      if (actorsError) {
        console.error('❌ Erreur acteurs:', actorsError);
        throw actorsError;
      }

      // Fusionner les données
      const historyWithUsers = logs.map(log => {
        const targetUser = usersData?.find(u => u.id === log.target_id) || { 
          full_name: 'Utilisateur inconnu', 
          email: 'N/A',
          user_type: 'unknown'
        };
        
        const actorUser = actorsData?.find(u => u.id === log.actor_id) || {
          full_name: 'Créditeur inconnu',
          email: 'N/A',
          user_type: 'unknown'
        };

        return {
          ...log,
          target_user: targetUser,
          actor_user: actorUser
        };
      });

      // Filtrer les crédits non annulés
      const validCredits = historyWithUsers.filter(log => !log.details?.reversed) || [];
      console.log('✅ Crédits valides:', validCredits);
      
      setCreditHistory(validCredits);
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      toast({ 
        title: t('common.error_title'), 
        description: "Impossible de charger l'historique des crédits.", 
        variant: 'destructive' 
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [user.id, currentUserProfile?.user_type, t]);

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
    const filteredData = currentUsers.filter(user =>
      user.full_name?.toLowerCase().includes(lowercasedFilter) ||
      user.email?.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredUsers(filteredData);
  }, [searchTerm, currentUsers]);

  const handleCredit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !amount || parseInt(amount) <= 0) {
      toast({ 
        title: t('common.error_title'), 
        description: 'Veuillez remplir tous les champs.', 
        variant: 'destructive' 
      });
      return;
    }
    setLoading(true);
    try {
      console.log('💳 Tentative de crédit:', {
        userId: selectedUser.id,
        amount: parseInt(amount),
        reason,
        creditor: user.id
      });

      const { data: rpcData, error } = await supabase.rpc('credit_user_coins', {
        p_user_id: selectedUser.id,
        p_amount: parseInt(amount),
        p_reason: reason,
        p_creditor_id: user.id
      });
      
      if (error) {
        console.error('❌ Erreur RPC:', error);
        throw new Error(error.message);
      }
      
      if (!rpcData.success) {
        console.error('❌ RPC échoué:', rpcData);
        throw new Error(rpcData.message);
      }

      console.log('✅ Crédit réussi:', rpcData);

      toast({ 
        title: 'Succès', 
        description: `${selectedUser.full_name} a été crédité de ${amount} pièces.` 
      });
      
      setSelectedUser(null);
      setAmount('');
      setReason('');
      setSearchTerm('');
      
      // Recharger l'historique
      fetchCreditHistory();
      if(onRefresh) onRefresh();
    } catch (error) {
      console.error('❌ Erreur crédit:', error);
      toast({ 
        title: t('common.error_title'), 
        description: error.message, 
        variant: 'destructive' 
      });
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

      toast({ 
        title: 'Succès', 
        description: 'Le crédit a été annulé avec succès.' 
      });
      
      // Recharger l'historique
      fetchCreditHistory();
      if(onRefresh) onRefresh();
    } catch (error) {
      toast({ 
        title: t('common.error_title'), 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
      setLogToReverse(null);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      user: 'bg-blue-500/20 text-blue-300',
      organizer: 'bg-yellow-500/20 text-yellow-300',
      secretary: 'bg-purple-500/20 text-purple-300',
      admin: 'bg-orange-500/20 text-orange-300',
      super_admin: 'bg-red-500/20 text-red-300',
      unknown: 'bg-gray-500/20 text-gray-300'
    };
    return colors[role] || colors.unknown;
  };

  const getRoleLabel = (role) => {
    const labels = {
      user: 'Utilisateur',
      organizer: 'Organisateur',
      secretary: 'Secrétaire',
      admin: 'Admin',
      super_admin: 'Super Admin',
      unknown: 'Inconnu'
    };
    return labels[role] || role;
  };

  const canReverseCredit = (log) => {
    // Seuls les super_admin et les secrétaires peuvent annuler les crédits
    return currentUserProfile?.user_type === 'super_admin' || currentUserProfile?.user_type === 'secretary';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulaire de crédit */}
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
              
              {searchTerm && filteredUsers.length > 0 && (
                <div>
                  <Label htmlFor="user-select">{t('secretary_dashboard.credit_form.user_label')}</Label>
                  <Select onValueChange={(value) => setSelectedUser(currentUsers.find(u => u.id === value))}>
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder={t('secretary_dashboard.credit_form.select_user_placeholder')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {filteredUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex flex-col gap-1 py-1">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{u.full_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span>{u.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getRoleColor(u.user_type)}>
                                {getRoleLabel(u.user_type)}
                              </Badge>
                              {u.city && (
                                <span className="text-xs text-muted-foreground">{u.city}</span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {searchTerm && filteredUsers.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2" />
                  <p>Aucun utilisateur trouvé</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="amount">{t('secretary_dashboard.credit_form.amount_label')}</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder={t('secretary_dashboard.credit_form.amount_placeholder')} 
                  min="1"
                />
              </div>
              
              <div>
                <Label htmlFor="reason">{t('secretary_dashboard.credit_form.reason_label')}</Label>
                <Input 
                  id="reason" 
                  type="text" 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder={t('secretary_dashboard.credit_form.reason_placeholder')} 
                />
              </div>
              
              <Button type="submit" disabled={loading || !selectedUser} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {t('secretary_dashboard.credit_form.submit_button')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Historique des crédits */}
      <div className="lg:col-span-2">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>
              {currentUserProfile?.user_type === 'super_admin' 
                ? 'Historique des crédits (Tous les utilisateurs)' 
                : 'Mes crédits récents'}
            </CardTitle>
            <CardDescription>
              {currentUserProfile?.user_type === 'super_admin'
                ? 'Liste de tous les crédits récents - Super Admin'
                : 'Liste de vos crédits les plus récents'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
              </div>
            ) : creditHistory.length > 0 ? (
              <div className="space-y-4">
                {creditHistory.map(log => (
                  <div key={log.id} className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Informations de l'utilisateur crédité */}
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">{log.target_user?.full_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getRoleColor(log.target_user?.user_type)}>
                                {getRoleLabel(log.target_user?.user_type)}
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {log.target_user?.email}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Informations du créditeur */}
                        {currentUserProfile?.user_type === 'super_admin' && (
                          <div className="flex items-center gap-3 mb-2 text-sm text-muted-foreground">
                            <span>Crédité par:</span>
                            <span className="font-medium">{log.actor_user?.full_name}</span>
                            <Badge variant="outline" className={getRoleColor(log.actor_user?.user_type)}>
                              {getRoleLabel(log.actor_user?.user_type)}
                            </Badge>
                          </div>
                        )}

                        {/* Détails du crédit */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold">{log.details?.amount || 0} π</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>

                          {log.details?.reason && (
                            <div className="md:col-span-3">
                              <span className="text-muted-foreground">Raison: </span>
                              <span>{log.details.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bouton d'annulation */}
                      {canReverseCredit(log) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setLogToReverse(log)}
                          className="flex-shrink-0 ml-4"
                          disabled={loading}
                        >
                          <RotateCcw className="w-4 h-4 text-red-500"/>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {currentUserProfile?.user_type === 'super_admin'
                    ? 'Aucun crédit effectué dans le système.'
                    : 'Aucun crédit effectué récemment.'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Les crédits que vous effectuez apparaîtront ici.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogue de confirmation d'annulation */}
      <AlertDialog open={!!logToReverse} onOpenChange={() => setLogToReverse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'annulation du crédit</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler ce crédit de <strong>{logToReverse?.details?.amount} π</strong> 
              attribué à <strong>{logToReverse?.target_user?.full_name}</strong> ?
              <br /><br />
              <span className="text-red-500 font-semibold">
                Cette action est irréversible et déduira le montant du solde de l'utilisateur.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReverseCredit}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer l\'annulation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreditManagement;