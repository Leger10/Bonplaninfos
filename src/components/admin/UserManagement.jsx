import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { MoreHorizontal, Loader2, UserPlus, Key, Copy, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ImpersonationBanner from '@/components/layout/ImpersonationBanner';

// Helper component for user form
const UserForm = ({ userToEdit, onSave, onCancel }) => {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
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
                password: '', 
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
                // Securely update existing user
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
                // Note: Creating users typically requires calling Supabase Admin Auth API which isn't available from client directly
                // For now, we can handle this in frontend by simple showing error or instructions
                throw new Error("La création directe d'utilisateur est réservée à l'inscription pour le moment.");
            }
            toast({ title: 'Succès', description: `Utilisateur ${userToEdit ? 'mis à jour' : 'créé'} avec succès.` });
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
                <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : (userToEdit ? 'Mettre à jour' : 'Créer')}</Button>
            </DialogFooter>
        </form>
    );
};

const UserManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [pagination, setPagination] = useState({ page: 0, size: 20 });
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState({ user_type: 'all' });
  const [impersonatingUser, setImpersonatingUser] = useState(null);

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

  // Real-time subscription
  useEffect(() => {
    fetchUsers();
    
    const channel = supabase
      .channel('admin-users-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        fetchUsers(); // Refresh on any change
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUsers]);

  const handleSave = () => {
    setIsFormOpen(false);
    fetchUsers();
  };

  const handleDeleteUser = async (userId) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('delete_user_securely', { p_user_id: userId, p_caller_id: currentUser.id });
      if (error) throw error;
      toast({ title: 'Succès', description: 'Utilisateur supprimé.' });
      fetchUsers();
    } catch(err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const copyCode = (code) => {
    if(!code) return;
    navigator.clipboard.writeText(code);
    toast({ title: "Copié", description: "Code copié" });
  }

  const pageCount = Math.ceil(totalUsers / pagination.size);

  return (
    <div>
      {impersonatingUser && <ImpersonationBanner user={impersonatingUser} onRevert={() => window.location.reload()} />}
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Gestion des Utilisateurs</h2>
            <Badge variant="secondary">{totalUsers}</Badge>
            <Button variant="ghost" size="icon" onClick={fetchUsers} title="Rafraîchir"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>

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
            </SelectContent>
        </Select>
      </div>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Code Parrainage</TableHead>
              <TableHead>Filleuls</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun utilisateur trouvé.</TableCell></TableRow>
            ) : (
              users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.full_name || 'Sans nom'}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground">{user.country}</div>
                  </TableCell>
                  <TableCell><Badge variant={user.user_type === 'super_admin' ? 'destructive' : 'outline'}>{user.user_type}</Badge></TableCell>
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
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setUserToEdit(user); setIsFormOpen(true); }}>Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">
                          <AlertDialog>
                            <AlertDialogTrigger className="w-full text-left">Supprimer</AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive">Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuItem>
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
        <Button variant="outline" size="sm" onClick={() => setPagination(p => ({...p, page: Math.max(0, p.page - 1)}))} disabled={pagination.page === 0}>Précédent</Button>
        <span className="text-sm text-muted-foreground">Page {pagination.page + 1} sur {pageCount || 1}</span>
        <Button variant="outline" size="sm" onClick={() => setPagination(p => ({...p, page: Math.min(pageCount - 1, p.page + 1)}))} disabled={pagination.page >= pageCount - 1}>Suivant</Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{userToEdit ? "Modifier" : "Créer"} un utilisateur</DialogTitle>
            </DialogHeader>
            <UserForm userToEdit={userToEdit} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementTab;