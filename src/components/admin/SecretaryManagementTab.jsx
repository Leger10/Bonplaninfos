import React, { useState, useMemo, useEffect } from 'react';
import { UserPlus, Trash2, UserCheck, Loader2, Building, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SecretaryManagementTab = ({ users, onRefresh }) => {
  const { userProfile } = useData();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState([]);

  const isSuperAdmin = userProfile?.user_type === 'super_admin';
  const isAdmin = userProfile?.user_type === 'admin';

  useEffect(() => {
    if (isSuperAdmin) {
      const adminUsers = users.filter(u => u.user_type === 'admin');
      setAdmins(adminUsers);
    }
  }, [users, isSuperAdmin]);

  const secretaries = useMemo(() => {
    if (isSuperAdmin) {
      return users.filter(u => u.user_type === 'secretary');
    }
    if (isAdmin) {
      return users.filter(u => u.user_type === 'secretary' && u.appointed_by === userProfile.id);
    }
    return [];
  }, [users, isSuperAdmin, isAdmin, userProfile]);

  const potentialSecretaries = useMemo(() => users.filter(u => (u.user_type === 'user' || u.user_type === 'organizer') && u.country === userProfile.country), [users, userProfile]);

  const logAction = async (action_type, target_id) => {
    await supabase.from('admin_logs').insert({
      actor_id: userProfile.id,
      action_type,
      target_id,
    });
  };

  const handleRoleChange = async (userId, newRole, appointed_by = null) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: newRole, appointed_by: newRole === 'secretary' ? appointed_by : null })
        .eq('id', userId);

      if (error) throw error;

      await logAction(newRole === 'secretary' ? 'secretary_appointed' : 'secretary_revoked', userId);

      toast({ title: 'Rôle mis à jour avec succès' });
      onRefresh();
      setShowCreateDialog(false);
      setSelectedUserId('');
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecretary = () => {
    if (!selectedUserId) {
      toast({ title: 'Veuillez sélectionner un utilisateur', variant: 'destructive' });
      return;
    }
    handleRoleChange(selectedUserId, 'secretary', userProfile.id);
  };

  const handleDemoteSecretary = (secretaryId) => {
    handleRoleChange(secretaryId, 'user');
  };

  const getAppointerInfo = (appointerId) => {
    if (!isSuperAdmin) return null;
    const admin = admins.find(a => a.id === appointerId);
    return admin ? { name: admin.full_name, country: admin.country } : null;
  };

  return (
    <>
      <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-white">Gestion des secrétaires</CardTitle>
          {(isSuperAdmin || isAdmin) && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Nommer un secrétaire
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {secretaries.map((secretary) => {
              const appointer = getAppointerInfo(secretary.appointed_by);
              return (
                <div
                  key={secretary.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-xl shadow-sm gap-4"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={secretary.avatar_url} />
                      <AvatarFallback className="bg-purple-500 text-white">
                        {secretary.full_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">{secretary.full_name}</p>
                      <p className="text-sm text-gray-400">{secretary.email}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge className="bg-purple-500 text-white text-xs">
                          Secrétaire
                        </Badge>
                        {appointer && (
                          <Badge variant="secondary" className="text-xs">
                            <Building className="w-3 h-3 mr-1" /> Nommé par: {appointer.name}
                          </Badge>
                        )}
                        {appointer?.country && (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" /> {appointer.country}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDemoteSecretary(secretary.id)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      Révoquer
                    </Button>
                  </div>
                </div>
              );
            })}

            {secretaries.length === 0 && (
              <div className="text-center py-8">
                <UserCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Aucun secrétaire nommé</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nommer un nouveau secrétaire</DialogTitle>
            <DialogDescription>
              Sélectionnez un utilisateur de votre zone pour lui attribuer le rôle de secrétaire.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un utilisateur..." />
              </SelectTrigger>
              <SelectContent>
                {potentialSecretaries.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateSecretary} disabled={loading || !selectedUserId}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SecretaryManagementTab;