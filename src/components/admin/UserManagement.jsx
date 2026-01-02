import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, Loader2, Copy, Ban, CheckCircle, Edit, Trash2, ShieldAlert, KeyRound, Eye, EyeOff, Search, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

import UserReportsTab from './UserReportsTab';
import UserReactivationsTab from './UserReactivationsTab';

// Helper to mask sensitive info
const maskEmail = (email) => {
  if (!email) return '';
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}***@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone) return '';
  return `${phone.substring(0, 4)}****${phone.substring(phone.length - 2)}`;
};

const UserForm = ({ userToEdit, onSave, onCancel }) => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    user_type: 'user',
    country: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        full_name: userToEdit.full_name || '',
        email: userToEdit.email || '',
        phone: userToEdit.phone || '',
        user_type: userToEdit.user_type || 'user',
        country: userToEdit.country || '',
        city: userToEdit.city || '',
      });
    }
  }, [userToEdit]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (userToEdit) {
        // Securely update existing user role/profile
        const { error: roleError } = await supabase.rpc('update_user_role_securely', {
          p_user_id: userToEdit.id,
          p_new_role: formData.user_type,
          p_caller_id: currentUser.id
        });
        if (roleError) throw roleError;

        const { error: profileError } = await supabase.from('profiles').update({
          full_name: formData.full_name,
          phone: formData.phone,
          country: formData.country,
          city: formData.city,
        }).eq('id', userToEdit.id);
        if (profileError) throw profileError;
      }
      toast({ title: 'Succès', description: `Utilisateur mis à jour avec succès.` });
      onSave();
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="full_name" placeholder="Nom complet" value={formData.full_name} onChange={handleChange} required />
      <Input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required disabled={!!userToEdit} />
      <Input name="phone" placeholder="Téléphone" value={formData.phone} onChange={handleChange} />
      <Select name="user_type" value={formData.user_type} onValueChange={(val) => setFormData(p => ({ ...p, user_type: val }))}>
        <SelectTrigger><SelectValue placeholder="Type d'utilisateur" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="user">Utilisateur</SelectItem>
          <SelectItem value="organizer">Organisateur</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="secretary">Secrétaire</SelectItem>
        </SelectContent>
      </Select>
      <Input name="country" placeholder="Pays" value={formData.country} onChange={handleChange} />
      <Input name="city" placeholder="Ville" value={formData.city} onChange={handleChange} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Mettre à jour'}</Button>
      </DialogFooter>
    </form>
  );
};

const ReportDialog = ({ userToReport, isOpen, onClose }) => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    if (!reason) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un motif.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('content_reports').insert({
        reporter_id: currentUser.id,
        target_type: 'user',
        target_id: userToReport.id,
        reason: reason,
        status: 'pending',
        content: description
      });

      if (error) throw error;

      toast({ title: "Signalement envoyé", description: "Le super administrateur examinera ce profil." });
      onClose();
    } catch (error) {
      console.error("Report error", error);
      toast({ title: "Erreur", description: "Impossible d'envoyer le signalement.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler l'utilisateur</DialogTitle>
          <DialogDescription>
            Signalez ce profil au Super Administrateur pour examen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Motif du signalement" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spam">Spam / Faux profil</SelectItem>
              <SelectItem value="harassment">Harcèlement</SelectItem>
              <SelectItem value="inappropriate">Contenu inapproprié</SelectItem>
              <SelectItem value="fraud">Fraude / Arnaque</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
          <Textarea 
            placeholder="Détails supplémentaires (optionnel)" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="destructive" onClick={handleReport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Signaler"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UserManagement = ({ onRefresh, userProfile }) => {
  const { toast } = useToast();
  const { invokeFunction } = useAuth();
  
  // Permissions Logic
  const isSuperAdmin = userProfile?.user_type === 'super_admin';
  const isSuperSecretary = userProfile?.user_type === 'secretary' && userProfile?.appointed_by_super_admin;
  const canManageUsers = isSuperAdmin || isSuperSecretary; 
  const canViewSensitiveInfo = canManageUsers;

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ 
    user_type: 'all',
    country: '',
    city: '',
    status: 'all' 
  });
  
  // Users List State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 0, size: 20 });
  const [totalUsers, setTotalUsers] = useState(0);

  // Tab Counts State
  const [reportCount, setReportCount] = useState(0);
  const [reactivationCount, setReactivationCount] = useState(0);

  // Actions State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToReport, setUserToReport] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Password Reset State
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // --- Users Fetching ---
  const fetchUsers = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' });

    // Hierarchy Filtering
    if (!canManageUsers) {
      if (userProfile.country) query = query.eq('country', userProfile.country);
      if (userProfile.city) query = query.eq('city', userProfile.city);
    }

    // Dynamic Filters
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,affiliate_code.ilike.%${searchTerm}%`);
    }
    if (filters.user_type !== 'all') {
      query = query.eq('user_type', filters.user_type);
    }
    if (filters.status !== 'all') {
      query = query.eq('is_active', filters.status === 'active');
    }
    if (filters.country) {
      query = query.ilike('country', `%${filters.country}%`);
    }
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(pagination.page * pagination.size, (pagination.page + 1) * pagination.size - 1);

    if (error) {
      console.error("Fetch users error:", error);
      toast({ title: 'Erreur', description: "Impossible de charger les utilisateurs", variant: 'destructive' });
    } else {
      setUsers(data || []);
      setTotalUsers(count || 0);
    }
    setLoading(false);
  }, [searchTerm, filters, pagination, toast, userProfile, canManageUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Initial fetch for counters (optional, as tabs will trigger it, but good for initial load)
  useEffect(() => {
    const fetchCounters = async () => {
        // Fetch initial report count
        const { count: reports } = await supabase
            .from('content_reports')
            .select('*', { count: 'exact', head: true })
            .eq('target_type', 'user');
        setReportCount(reports || 0);

        // Fetch initial reactivation count
        const { count: reactivations } = await supabase
            .from('reactivation_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        setReactivationCount(reactivations || 0);
    };
    fetchCounters();
  }, []);

  const handleSave = () => {
    setIsFormOpen(false);
    fetchUsers();
    if (onRefresh) onRefresh();
  };

  const handleToggleStatus = async (user) => {
    if (!canManageUsers) return;
    if (user.user_type === 'super_admin') {
      toast({ title: 'Action interdite', description: 'Le Super Admin ne peut pas être désactivé.', variant: 'destructive' });
      return;
    }

    try {
        const newStatus = !user.is_active;
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: newStatus })
            .eq('id', user.id);
        
        if (error) throw error;
        
        toast({
            title: newStatus ? "Utilisateur réactivé" : "Utilisateur désactivé",
            description: `Le compte de ${user.full_name || user.email} est maintenant ${newStatus ? 'actif' : 'inactif'}.`,
            variant: newStatus ? "success" : "destructive"
        });
        
        fetchUsers();
    } catch (err) {
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    if (!canManageUsers) return;

    setDeleteLoading(true);
    try {
        const { error } = await supabase.rpc('delete_user_securely', {
            p_user_id: userToDelete.id,
            p_caller_id: userProfile.id
        });
        
        if (error) throw error;
        
        toast({ title: 'Succès', description: 'Utilisateur supprimé définitivement.' });
        fetchUsers();
        setUserToDelete(null);
    } catch (err) {
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
        setDeleteLoading(false);
    }
  };

  const confirmResetPassword = async () => {
    if (!resetUser || !newPassword) return;
    setResetLoading(true);
    try {
        const { data, error } = await invokeFunction('admin-reset-password', {
            body: JSON.stringify({ userId: resetUser.id, newPassword: newPassword })
        });

        if (error || (data && data.error)) {
            throw new Error(error?.message || data?.error);
        }

        toast({ 
            title: "Mot de passe réinitialisé", 
            description: `Nouveau mot de passe pour ${resetUser.full_name || 'utilisateur'} : ${newPassword}`,
            variant: "success",
            duration: 10000 
        });
        setResetPasswordDialog(false);
    } catch (err) {
        toast({ 
            title: 'Erreur', 
            description: err.message || "Erreur technique.", 
            variant: 'destructive' 
        });
    } finally {
        setResetLoading(false);
    }
  };

  const copyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({ title: "Copié", description: "Code copié" });
  }

  const pageCount = Math.ceil(totalUsers / pagination.size);

  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="users">
            Utilisateurs ({totalUsers})
        </TabsTrigger>
        <TabsTrigger value="reports">
            Utilisateurs Signalés ({reportCount})
        </TabsTrigger>
        <TabsTrigger value="reactivations">
            Demandes de Réactivation ({reactivationCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-4">
        {/* Filters & Search */}
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                
                <div className="flex flex-wrap gap-2 w-full">
                    <Select value={filters.user_type} onValueChange={(val) => setFilters(prev => ({...prev, user_type: val}))}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Rôle" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les rôles</SelectItem>
                            <SelectItem value="user">Utilisateur</SelectItem>
                            <SelectItem value="organizer">Organisateur</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="secretary">Secrétaire</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filters.status} onValueChange={(val) => setFilters(prev => ({...prev, status: val}))}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous statuts</SelectItem>
                            <SelectItem value="active">Actif</SelectItem>
                            <SelectItem value="inactive">Inactif</SelectItem>
                        </SelectContent>
                    </Select>

                    <Input 
                        placeholder="Filtrer par Pays" 
                        value={filters.country}
                        onChange={(e) => setFilters(prev => ({...prev, country: e.target.value}))}
                        className="w-[140px]"
                    />
                    
                    <Input 
                        placeholder="Filtrer par Ville" 
                        value={filters.city}
                        onChange={(e) => setFilters(prev => ({...prev, city: e.target.value}))}
                        className="w-[140px]"
                    />
                </div>
            </div>
            <div className="text-sm text-muted-foreground text-right">
                Total: {totalUsers} utilisateurs
            </div>
        </div>

        {/* Users Table */}
        <div className="rounded-md border bg-card overflow-hidden">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Coordonnées</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun utilisateur trouvé.</TableCell></TableRow>
                ) : (
                users.map(user => (
                    <TableRow key={user.id}>
                    <TableCell>
                        <div className="font-medium">{user.full_name || 'Sans nom'}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            Code: <code className="bg-muted px-1 rounded">{user.affiliate_code || 'N/A'}</code>
                            <Copy className="h-3 w-3 cursor-pointer hover:text-primary" onClick={() => copyCode(user.affiliate_code)} />
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm">
                            {canViewSensitiveInfo ? user.email : maskEmail(user.email)}
                        </div>
                        {user.phone && (
                            <div className="text-xs text-muted-foreground">
                                {canViewSensitiveInfo ? user.phone : maskPhone(user.phone)}
                            </div>
                        )}
                    </TableCell>
                    <TableCell>
                        <Badge variant={user.is_active ? "outline" : "destructive"} className={user.is_active ? "bg-green-100 text-green-800 border-green-200" : "text-[10px]"}>
                        {user.is_active ? "Actif" : "Inactif"}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="capitalize">{user.user_type}</Badge>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm">{user.country}</div>
                        <div className="text-xs text-muted-foreground">{user.city}</div>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {canManageUsers ? (
                                <>
                                    <DropdownMenuItem onClick={() => { setUserToEdit(user); setIsFormOpen(true); }}>
                                    <Edit className="mr-2 h-4 w-4" /> Modifier infos
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => { setResetUser(user); setNewPassword('000000'); setResetPasswordDialog(true); }}>
                                        <KeyRound className="mr-2 h-4 w-4" /> Réinit. mot de passe
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => handleToggleStatus(user)} disabled={user.user_type === 'super_admin'}>
                                    {user.is_active ? (
                                        <><Ban className="mr-2 h-4 w-4 text-orange-500" /> <span className="text-orange-500">Désactiver</span></>
                                    ) : (
                                        <><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> <span className="text-green-500">Réactiver</span></>
                                    )}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                        onClick={() => setUserToDelete(user)}
                                        disabled={user.user_type === 'super_admin'}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <DropdownMenuItem onClick={() => setUserToReport(user)}>
                                    <Flag className="mr-2 h-4 w-4 text-orange-500" /> Signaler
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
            <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: Math.max(0, p.page - 1) }))} disabled={pagination.page === 0}>Précédent</Button>
            <span className="text-sm text-muted-foreground">Page {pagination.page + 1} sur {pageCount || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: Math.min(pageCount - 1, p.page + 1) }))} disabled={pagination.page >= pageCount - 1}>Suivant</Button>
        </div>
      </TabsContent>

      <TabsContent value="reports">
        <UserReportsTab onCountChange={setReportCount} />
      </TabsContent>

      <TabsContent value="reactivations">
        <UserReactivationsTab onCountChange={setReactivationCount} />
      </TabsContent>

      {/* Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier utilisateur</DialogTitle></DialogHeader>
          <UserForm userToEdit={userToEdit} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <ReportDialog 
        isOpen={!!userToReport} 
        onClose={() => setUserToReport(null)} 
        userToReport={userToReport} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <ShieldAlert className="h-5 w-5" /> Suppression définitive
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. L'utilisateur <strong>{userToDelete?.full_name}</strong> et toutes ses données seront supprimés.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                <DialogDescription>Définissez un nouveau mot de passe pour cet utilisateur.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="flex gap-2 relative">
                    <Input 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nouveau mot de passe"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-24 top-1/2 -translate-y-1/2 text-muted-foreground px-2">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <Button variant="outline" onClick={() => setNewPassword('Temp' + Math.floor(1000 + Math.random() * 9000))}>Générer</Button>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setResetPasswordDialog(false)}>Annuler</Button>
                <Button onClick={confirmResetPassword} disabled={resetLoading}>
                    {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default UserManagement;