import React, { useState, useMemo } from 'react';
    import { Ban, CheckCircle, Trash2, Coins, Loader2, Search } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Badge } from '@/components/ui/badge';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
    import { Label } from '@/components/ui/label';
    import { Input } from '@/components/ui/input';
    import { toast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useData } from '@/contexts/DataContext';
    import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
    } from "@/components/ui/select";
    import { notificationService } from '@/services/notificationService';

    const SecretaryUserManagementTab = ({ users, onRefresh }) => {
      const { userProfile } = useData();
      const [creditAmount, setCreditAmount] = useState('');
      const [creditReason, setCreditReason] = useState('');
      const [selectedUser, setSelectedUser] = useState(null);
      const [actionLoading, setActionLoading] = useState(null);
      const [showCreditDialog, setShowCreditDialog] = useState(false);
      const [searchTerm, setSearchTerm] = useState('');

      const filteredUsers = useMemo(() => {
        return users.filter(user =>
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }, [users, searchTerm]);

      const logAction = async (action_type, target_id, details) => {
        await supabase.from('admin_logs').insert({
          actor_id: userProfile.id,
          action_type,
          target_id,
          details,
        });
      };

      const handleUserAction = async (userId, action) => {
        const targetUser = users.find(u => u.id === userId);
        if (targetUser && (targetUser.user_type === 'admin' || targetUser.user_type === 'super_admin')) {
          toast({ title: "Action non autorisée", description: "Vous ne pouvez pas modifier un compte administrateur.", variant: "destructive" });
          return;
        }

        setActionLoading(userId);
        try {
          let updateData = {};
          let successMessage = '';
          let logType = '';

          switch (action) {
            case 'block':
              updateData = { is_active: false };
              successMessage = 'Utilisateur bloqué';
              logType = 'user_blocked';
              break;
            case 'unblock':
              updateData = { is_active: true };
              successMessage = 'Utilisateur débloqué';
              logType = 'user_unblocked';
              break;
            case 'delete':
              const { error: deleteError } = await supabase.rpc('delete_user_completely', { p_user_id: userId });
              if (deleteError) throw deleteError;
              successMessage = 'Utilisateur supprimé';
              logType = 'user_deleted';
              break;
            default:
              throw new Error('Action non reconnue');
          }

          if (action !== 'delete') {
            const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
            if (error) throw error;
          }
          
          await logAction(logType, userId);
          toast({ title: successMessage });
          onRefresh();
        } catch (error) {
          toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
          setActionLoading(null);
        }
      };

      const handleCreditUser = async () => {
        if (!selectedUser || !creditAmount || parseInt(creditAmount) <= 0) {
          toast({ title: "Erreur", description: "Veuillez sélectionner un utilisateur et saisir un montant valide.", variant: "destructive" });
          return;
        }

        setActionLoading(selectedUser.id);
        try {
          const reason = creditReason || `Crédit par secrétaire ${userProfile.full_name}`;
          const { error } = await supabase.rpc('credit_user_coins', {
            p_user_id: selectedUser.id,
            p_amount: parseInt(creditAmount),
            p_reason: reason,
            p_creditor_id: userProfile.id
          });
          if (error) throw error;

          await logAction('user_credited', selectedUser.id, { amount: parseInt(creditAmount), reason });
          toast({ title: "Crédit effectué", description: `${creditAmount} pièces ont été ajoutées au compte de ${selectedUser.full_name}.` });
          
          const notifMessage = `Vous avez été crédité de ${creditAmount} pièces. Raison: ${reason}`;
          await notificationService.saveNotification(selectedUser.id, notifMessage, 'earning');

          onRefresh();
          setShowCreditDialog(false);
          setCreditAmount('');
          setCreditReason('');
          setSelectedUser(null);
        } catch (error) {
          toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
          setActionLoading(null);
        }
      };

      const getRoleColor = (role) => ({
        user: 'bg-blue-500', organizer: 'bg-yellow-500', secretary: 'bg-purple-500', admin: 'bg-red-500', super_admin: 'bg-red-700'
      }[role] || 'bg-gray-500');

      const getRoleLabel = (role) => ({
        user: 'Utilisateur', organizer: 'Organisateur', secretary: 'Secrétaire', admin: 'Admin', super_admin: 'Super Admin'
      }[role] || 'Inconnu');

      return (
        <>
          <Card className="glass-effect border-purple-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Liste des utilisateurs</CardTitle>
                <Button onClick={() => setShowCreditDialog(true)} className="bg-purple-500 hover:bg-purple-600 text-white">
                  <Coins className="w-4 h-4 mr-2" />
                  Créditer un compte
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="space-y-4">
                {filteredUsers.map((userItem) => (
                  <div key={userItem.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12"><AvatarImage src={userItem.avatar_url} /><AvatarFallback className="bg-primary">{userItem.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium text-white">{userItem.full_name}</p>
                        <p className="text-sm text-gray-400">{userItem.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`${getRoleColor(userItem.user_type)} text-white text-xs`}>{getRoleLabel(userItem.user_type)}</Badge>
                          <Badge className={`${userItem.is_active ? 'bg-green-500' : 'bg-red-500'} text-white text-xs`}>{userItem.is_active ? 'Actif' : 'Bloqué'}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-primary font-medium">{(userItem.coin_balance || 0) + (userItem.free_coin_balance || 0)} pièces</span>
                      {actionLoading === userItem.id ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <div className="flex items-center space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => handleUserAction(userItem.id, userItem.is_active ? 'block' : 'unblock')} className={`hover:${userItem.is_active ? 'text-red-400' : 'text-green-400'}`} disabled={userItem.user_type === 'admin' || userItem.user_type === 'super_admin'}>
                            {userItem.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleUserAction(userItem.id, 'delete')} className="hover:text-red-400" disabled={userItem.user_type === 'admin' || userItem.user_type === 'super_admin'}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créditer un compte utilisateur</DialogTitle>
                <DialogDescription>Sélectionnez un utilisateur et entrez le montant de pièces à créditer.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="user-select">Utilisateur</Label>
                  <Select onValueChange={(value) => setSelectedUser(users.find(u => u.id === value))}>
                      <SelectTrigger id="user-select">
                          <SelectValue placeholder="Choisir un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                          {users.filter(u => u.user_type === 'user' || u.user_type === 'organizer').map((user) => (
                              <SelectItem key={user.id} value={user.id}>{user.full_name} ({user.email})</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="credit-amount">Montant à créditer</Label>
                  <Input id="credit-amount" type="number" placeholder="Nombre de pièces" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="credit-reason">Raison du crédit</Label>
                    <Input id="credit-reason" type="text" placeholder="Ex: Gain concours, bonus..." value={creditReason} onChange={(e) => setCreditReason(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreditDialog(false)}>Annuler</Button>
                <Button onClick={handleCreditUser} disabled={actionLoading || !selectedUser || !creditAmount}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créditer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    };

    export default SecretaryUserManagementTab;