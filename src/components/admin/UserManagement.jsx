import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal, Loader2, Copy, RefreshCw, Ban, CheckCircle, Edit, Trash2, AlertTriangle, UserCheck, XCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Badge } from '@/components/ui/badge';
import ImpersonationBanner from '@/components/layout/ImpersonationBanner';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Helper component for user form
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
      } else {
        throw new Error("La création directe d'utilisateur n'est pas supportée depuis cette interface.");
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

const UserManagementTab = ({ onRefresh }) => {
  const { toast } = useToast();
  const { userProfile } = useData(); // Use useData to get the robust user profile
  
  // Tabs state
  const [activeTab, setActiveTab] = useState('users');

  // Users List State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 0, size: 20 });
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState({ user_type: 'all' });
  const [impersonatingUser, setImpersonatingUser] = useState(null);

  // Reactivation Requests State
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState(null);

  // Check super admin status
  const isSuperAdmin = userProfile?.user_type === 'super_admin';

  // --- Users Fetching ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' });

    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,affiliate_code.ilike.%${searchTerm}%`);
    }
    if (filters.user_type !== 'all') {
      query = query.eq('user_type', filters.user_type);
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
  }, [searchTerm, filters, pagination, toast]);

  // --- Requests Fetching ---
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
        const { data, error } = await supabase
            .from('reactivation_requests')
            .select(`
                *,
                user:user_id (id, full_name, email, avatar_url, user_type)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(data || []);
    } catch (err) {
        console.error("Fetch requests error:", err);
        toast({ title: 'Erreur', description: "Impossible de charger les demandes", variant: 'destructive' });
    } finally {
        setLoadingRequests(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchRequests();
  }, [fetchUsers, fetchRequests]);

  // --- Actions ---

  const handleSave = () => {
    setIsFormOpen(false);
    fetchUsers();
    if (onRefresh) onRefresh();
  };

  const handleToggleStatus = async (user) => {
    if (user.user_type === 'super_admin') {
      toast({ title: 'Action interdite', description: 'Le Super Admin ne peut pas être désactivé.', variant: 'destructive' });
      return;
    }

    try {
        setToggleLoading(true);
        const newStatus = !user.is_active;
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: newStatus })
            .eq('id', user.id);
        
        if (error) throw error;
        
        toast({
            title: newStatus ? "Utilisateur réactivé" : "Utilisateur désactivé",
            description: `Le compte de ${user.full_name || user.email} est maintenant ${newStatus ? 'actif' : 'inactif'}.`,
            variant: newStatus ? "default" : "destructive"
        });
        
        fetchUsers();
    } catch (err) {
        console.error("Toggle status error:", err);
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
        setToggleLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Explicitly check userProfile instead of currentUser for reliability
    if (userProfile?.user_type !== 'super_admin') {
        toast({ title: 'Non autorisé', description: "Seul le Super Admin peut supprimer un utilisateur.", variant: 'destructive' });
        return;
    }

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
        console.error("Delete error:", err);
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
        setDeleteLoading(false);
    }
  };

  const handleRequestAction = async (requestId, userId, action) => {
    setRequestActionLoading(requestId);
    try {
        if (action === 'approve') {
            // 1. Activate User
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ is_active: true })
                .eq('id', userId);
            if (profileError) throw profileError;

            // 2. Update Request Status
            const { error: reqError } = await supabase
                .from('reactivation_requests')
                .update({ 
                    status: 'approved', 
                    reviewed_by: userProfile.id, 
                    reviewed_at: new Date().toISOString() 
                })
                .eq('id', requestId);
            if (reqError) throw reqError;

            toast({ title: "Approuvé", description: "Utilisateur réactivé avec succès." });
        } else {
            // Reject
            const { error: reqError } = await supabase
                .from('reactivation_requests')
                .update({ 
                    status: 'rejected', 
                    reviewed_by: userProfile.id, 
                    reviewed_at: new Date().toISOString() 
                })
                .eq('id', requestId);
            if (reqError) throw reqError;

            toast({ title: "Rejeté", description: "Demande de réactivation rejetée." });
        }
        
        // Refresh both lists
        fetchRequests();
        fetchUsers();
    } catch (err) {
        console.error("Request action error:", err);
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
        setRequestActionLoading(null);
    }
  };

  const copyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({ title: "Copié", description: "Code copié" });
  }

  const pageCount = Math.ceil(totalUsers / pagination.size);

  return (
    <div>
      {impersonatingUser && <ImpersonationBanner user={impersonatingUser} onRevert={() => window.location.reload()} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestion des Utilisateurs</h2>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchUsers(); fetchRequests(); }}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading || loadingRequests ? 'animate-spin' : ''}`} />
                Actualiser
            </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-4">
            <TabsTrigger value="users">
                Utilisateurs
                <Badge variant="secondary" className="ml-2 text-xs">{totalUsers}</Badge>
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative">
                Demandes Réactivation
                {requests.length > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs animate-pulse">{requests.length}</Badge>
                )}
            </TabsTrigger>
        </TabsList>

        {/* --- USERS TAB --- */}
        <TabsContent value="users">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <Input
                placeholder="Rechercher (nom, email, code)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                />
                <Select value={filters.user_type} onValueChange={(val) => setFilters({ user_type: val })}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="organizer">Organisateur</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="secretary">Secrétaire</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Code Parrainage</TableHead>
                    <TableHead>Filleuls</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading && users.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                    ) : users.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Aucun utilisateur trouvé.</TableCell></TableRow>
                    ) : (
                    users.map(user => (
                        <TableRow key={user.id}>
                        <TableCell>
                            <div className="font-medium">{user.full_name || 'Sans nom'}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground flex gap-1 items-center">
                                {user.country} {user.city && `• ${user.city}`}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={user.is_active ? "success" : "destructive"} className="text-[10px]">
                            {user.is_active ? "Actif" : "Inactif"}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={user.user_type === 'super_admin' ? 'destructive' : 'outline'} className="gap-1">
                                {user.user_type}
                                {user.admin_type && ` (${user.admin_type})`}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {user.affiliate_code ? (
                            <div className="flex items-center gap-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{user.affiliate_code}</code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(user.affiliate_code)}><Copy className="h-3 w-3" /></Button>
                            </div>
                            ) : <span className="text-xs text-muted-foreground italic">Non généré</span>}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1">
                            <span className="font-bold">{user.referral_count || 0}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
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
                                
                                <DropdownMenuItem onClick={() => { setUserToEdit(user); setIsFormOpen(true); }}>
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                                
                                {/* Deactivate/Reactivate - Available to all admins */}
                                <DropdownMenuItem onClick={() => handleToggleStatus(user)} disabled={toggleLoading || user.user_type === 'super_admin'}>
                                {user.is_active ? (
                                    <>
                                    <Ban className="mr-2 h-4 w-4 text-orange-500" /> 
                                    <span className="text-orange-500">Désactiver</span>
                                    </>
                                ) : (
                                    <>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    <span className="text-green-500">Réactiver</span>
                                    </>
                                )}
                                </DropdownMenuItem>

                                {/* Delete - ONLY Super Admin */}
                                {isSuperAdmin && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/20"
                                            onClick={() => setUserToDelete(user)}
                                            disabled={user.user_type === 'super_admin'}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                        </DropdownMenuItem>
                                    </>
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

        {/* --- REACTIVATION REQUESTS TAB --- */}
        <TabsContent value="requests">
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Utilisateur</TableHead>
                            <TableHead>Message / Motif</TableHead>
                            <TableHead>Date de la demande</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingRequests ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                        ) : requests.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Aucune demande de réactivation en attente.</TableCell></TableRow>
                        ) : (
                            requests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="font-medium">{req.user?.full_name || 'Inconnu'}</div>
                                        <div className="text-xs text-muted-foreground">{req.user?.email}</div>
                                        <Badge variant="outline" className="mt-1">{req.user?.user_type}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <div className="flex gap-2 items-start">
                                            <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                                            <span className="text-sm italic text-muted-foreground">"{req.request_message || 'Pas de message'}"</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                                onClick={() => handleRequestAction(req.id, req.user_id, 'approve')}
                                                disabled={!!requestActionLoading}
                                            >
                                                {requestActionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
                                                Approuver
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleRequestAction(req.id, req.user_id, 'reject')}
                                                disabled={!!requestActionLoading}
                                            >
                                                {requestActionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                                Rejeter
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userToEdit ? "Modifier" : "Créer"} un utilisateur</DialogTitle>
          </DialogHeader>
          <UserForm userToEdit={userToEdit} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert (Super Admin Only) */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Confirmer la suppression
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete?.full_name || userToDelete?.email}</strong> ?
                    <br /><br />
                    Cette action est irréversible et supprimera toutes les données associées (transactions, événements, etc.).
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleDeleteUser} 
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    disabled={deleteLoading}
                >
                    {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Supprimer définitivement
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagementTab;