import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Ban, CheckCircle, Coins, DollarSign, Edit, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SecretaryUserManagementTab = ({ users, onRefresh }) => {
  const { userProfile } = useData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u =>
      u.country === userProfile?.country &&
      (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       u.user_type?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm, userProfile?.country]);

  const handleStatusChange = async (targetUser, newStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', targetUser.id);
      if (error) throw error;
      toast({ title: 'Succès', description: `L'utilisateur a été ${newStatus ? 'activé' : 'bloqué'}.` });
      onRefresh();
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreditDialog = (user) => {
    setSelectedUser(user);
    setCreditAmount('');
    setCreditReason('');
    setIsCreditDialogOpen(true);
  };

  const handleCreditUser = async () => {
    if (!selectedUser || !creditAmount || loading) return;
    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Erreur', description: 'Veuillez entrer un montant valide.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('credit_user_coins', {
        p_user_id: selectedUser.id,
        p_amount: amount,
        p_reason: creditReason,
        p_creditor_id: user.id,
      });

      if (error) {
        throw error;
      }
      if (!data.success) {
        throw new Error(data.message || 'Échec du crédit utilisateur.');
      }

      toast({ title: 'Succès', description: data.message || `Utilisateur ${selectedUser.full_name} crédité de ${amount} pièces.` });
      onRefresh();
      setIsCreditDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      user: 'bg-blue-500/20 text-blue-300',
      organizer: 'bg-yellow-500/20 text-yellow-300',
      secretary: 'bg-purple-500/20 text-purple-300',
      admin: 'bg-orange-500/20 text-orange-300',
      super_admin: 'bg-red-500/20 text-red-300'
    };
    return colors[role] || 'bg-gray-500/20 text-gray-300';
  };

  const getRoleLabel = (role) => {
    const labels = {
      user: 'Utilisateur',
      organizer: 'Organisateur',
      secretary: 'Secrétaire',
      admin: 'Admin',
      super_admin: 'Super Admin'
    };
    return labels[role] || role;
  };

  return (
    <>
      <Card className="glass-effect border-purple-500/20">
        <CardHeader>
          <CardTitle>Gestion des Utilisateurs ({userProfile?.country})</CardTitle>
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
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucun utilisateur trouvé dans votre pays.</p>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-lg gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback>{u.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{u.full_name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge className={getRoleColor(u.user_type)}>{getRoleLabel(u.user_type)}</Badge>
                        <Badge variant={u.is_active ? 'success' : 'destructive'}>{u.is_active ? 'Actif' : 'Bloqué'}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Coins className="w-3 h-3" /> {u.coin_balance || 0}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> {u.available_earnings || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenCreditDialog(u)}>
                      <Coins className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleStatusChange(u, !u.is_active)}>
                      {u.is_active ? <Ban className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créditer l'utilisateur: {selectedUser?.full_name}</DialogTitle>
            <DialogDescription>
              Ajouter des pièces au solde de l'utilisateur.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Montant (π)
              </Label>
              <Input
                id="amount"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Raison
              </Label>
              <Textarea
                id="reason"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreditUser} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créditer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SecretaryUserManagementTab;