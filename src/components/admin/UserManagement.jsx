import React, { useState, useMemo } from 'react';
import { Edit, Ban, CheckCircle, Loader2, Shield, Search, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UserManagement = ({ users, onRefresh }) => {
  const { userProfile } = useData();
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const isSuperAdmin = userProfile?.user_type === 'super_admin';

  const handleOpenDialog = (user) => {
    setSelectedUser(user);
    setNewRole(user.user_type);
    setIsDialogOpen(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_user_role_securely', {
        p_user_id: selectedUser.id,
        p_new_role: newRole,
        p_caller_id: userProfile.id,
      });
      if (error) throw error;
      toast({ title: 'Succès', description: 'Le rôle a été mis à jour.' });
      onRefresh();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (user, newStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Succès', description: `L'utilisateur a été ${newStatus ? 'activé' : 'bloqué'}.` });
      onRefresh();
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (targetUser) => {
    if (targetUser.user_type === 'super_admin') {
      toast({ title: "Action non autorisée", description: "Vous ne pouvez pas vous faire passer pour un autre super administrateur.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase.auth.impersonate(targetUser.email);
    if(error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive"});
    } else {
      toast({ title: "Mode d'emprunt d'identité activé", description: `Vous naviguez maintenant en tant que ${targetUser.full_name}`});
      window.location.reload();
    }
    setLoading(false);
  }

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

  const roleOptions = [
    { value: 'user', label: 'Utilisateur' },
    { value: 'organizer', label: 'Organisateur' },
    { value: 'secretary', label: 'Secrétaire' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <>
      <Card className="glass-effect border-primary/20">
        <CardHeader>
          <CardTitle>Gestion des Utilisateurs</CardTitle>
          <CardDescription>Gérez les rôles et statuts des utilisateurs.</CardDescription>
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
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-lg gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge className={getRoleColor(user.user_type)}>{getRoleLabel(user.user_type)}</Badge>
                      <Badge variant={user.is_active ? 'success' : 'destructive'}>{user.is_active ? 'Actif' : 'Bloqué'}</Badge>
                      {user.user_type === 'admin' && (
                        <Badge variant="outline"><Shield className="w-3 h-3 mr-1" /> Nommé par Super Admin</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleStatusChange(user, !user.is_active)}>
                      {user.is_active ? <Ban className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                    </Button>
                    {userProfile.id !== user.id && (
                      <Button variant="ghost" size="icon" onClick={() => handleImpersonate(user)}>
                        <Key className="w-4 h-4 text-orange-400" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle de {selectedUser?.full_name}</DialogTitle>
            <DialogDescription>
              Attention, la modification du rôle d'un utilisateur impacte ses permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleRoleChange} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;