import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { MoreHorizontal, Loader2, UserPlus, Shield, User, ChevronsUpDown, Check, Key } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { COUNTRIES } from '@/constants/countries';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ImpersonationBanner from '@/components/layout/ImpersonationBanner';


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
        } else {
            setFormData({ full_name: '', email: '', password: '', phone: '', user_type: 'user', country: '', city: '' });
        }
    }, [userToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let result;
            if (userToEdit) {
                const { data, error } = await supabase.rpc('update_user_role_securely', {
                    p_user_id: userToEdit.id,
                    p_new_role: formData.user_type,
                    p_caller_id: currentUser.id
                });
                
                // This RPC only updates the role, so we need a separate update for other profile data.
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formData.full_name,
                        phone: formData.phone,
                        country: formData.country,
                        city: formData.city,
                    })
                    .eq('id', userToEdit.id)
                    .select()
                    .single();
                
                if (profileError) throw profileError;
                
                result = { data: profileData, error: null };

            } else {
                const { data, error } = await supabase.rpc('create_user_with_role', {
                    p_name: formData.full_name,
                    p_email: formData.email,
                    p_password: formData.password,
                    p_phone: formData.phone,
                    p_country: formData.country,
                    p_city: formData.city,
                    p_role: formData.user_type
                });
                
                if (error) throw error;
                // Since this RPC returns a simple success message, we need to fetch the newly created user to pass it to onSave
                const {data: newUser, error: fetchError} = await supabase.from('profiles').select('*').eq('email', formData.email).single();
                if(fetchError) throw fetchError;
                result = {data: newUser, error: null};
            }

            toast({ title: 'Succès', description: `Utilisateur ${userToEdit ? 'mis à jour' : 'créé'} avec succès.` });
            onSave(result.data, !!userToEdit);
        } catch (error) {
            console.error('Error saving user:', error);
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="full_name" placeholder="Nom complet" value={formData.full_name} onChange={handleChange} required />
            <Input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required disabled={!!userToEdit} />
            {!userToEdit && <Input name="password" type="password" placeholder="Mot de passe" value={formData.password} onChange={handleChange} required />}
            <Input name="phone" placeholder="Téléphone" value={formData.phone} onChange={handleChange} />
            <Select name="user_type" value={formData.user_type} onValueChange={(value) => handleSelectChange('user_type', value)}>
                <SelectTrigger><SelectValue placeholder="Type d'utilisateur" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="organizer">Organisateur</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="secretary">Secrétaire</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
            </Select>
            <Input name="country" placeholder="Pays" value={formData.country} onChange={handleChange} />
            <Input name="city" placeholder="Ville" value={formData.city} onChange={handleChange} />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : (userToEdit ? 'Mettre à jour' : 'Créer')}
                </Button>
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
  const [filters, setFilters] = useState({ user_type: 'all', country: 'all' });
  const [availableCountries, setAvailableCountries] = useState([]);
  const [impersonatingUser, setImpersonatingUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*', { count: 'exact' });

    if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    if (filters.user_type !== 'all') {
        query = query.eq('user_type', filters.user_type);
    }
    if (filters.country !== 'all') {
        query = query.eq('country', filters.country);
    }

    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(pagination.page * pagination.size, (pagination.page + 1) * pagination.size - 1);

    if (error) {
        toast({ title: 'Erreur', description: 'Impossible de charger les utilisateurs.', variant: 'destructive' });
    } else {
        setUsers(data);
        setTotalUsers(count);
    }
    setLoading(false);
  }, [searchTerm, filters, pagination, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  useEffect(() => {
    async function getCountries() {
        const { data } = await supabase.rpc('get_distinct_countries_from_credits');
        if (data) {
            setAvailableCountries(data.map(c => c.country).filter(Boolean));
        }
    }
    getCountries();
  }, []);

  const handleSave = (savedUser, isUpdate) => {
    if (isUpdate) {
        setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
    } else {
        fetchUsers();
    }
    setIsFormOpen(false);
    setUserToEdit(null);
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
      setImpersonatingUser(targetUser);
      toast({ title: "Mode d'emprunt d'identité activé", description: `Vous naviguez maintenant en tant que ${targetUser.full_name}`});
      // La session va changer, ce qui devrait provoquer un re-render global
    }
    setLoading(false);
  }
  
  const handleStopImpersonating = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.revert();
    if(error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive"});
    } else {
      setImpersonatingUser(null);
      toast({ title: "Retour à la normale", description: "Vous êtes revenu à votre compte."});
    }
    setLoading(false);
  }

  const handleDeleteUser = async (userId, userEmail) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('delete_user_securely', { p_user_id: userId, p_caller_id: currentUser.id });
      if (error) throw error;
      toast({ title: 'Utilisateur supprimé', description: `L'utilisateur ${userEmail} a été supprimé.` });
      fetchUsers();
    } catch(error) {
      toast({ title: "Erreur", description: `Impossible de supprimer l'utilisateur: ${error.message}`, variant: "destructive"});
    } finally {
      setLoading(false);
    }
  }


  const pageCount = Math.ceil(totalUsers / pagination.size);

  return (
    <div>
      {impersonatingUser && <ImpersonationBanner user={impersonatingUser} onRevert={handleStopImpersonating} />}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Gestion des Utilisateurs</h2>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setUserToEdit(null)}><UserPlus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{userToEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
            </DialogHeader>
            <UserForm userToEdit={userToEdit} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Input
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
        />
        <Select value={filters.user_type} onValueChange={(value) => setFilters(f => ({...f, user_type: value}))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrer par rôle" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="organizer">Organisateur</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="secretary">Secrétaire</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
        </Select>
        <Select value={filters.country} onValueChange={(value) => setFilters(f => ({...f, country: value}))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrer par pays" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Tous les pays</SelectItem>
                {availableCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Pays / Ville</TableHead>
              <TableHead>Pièces</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun utilisateur trouvé.</TableCell></TableRow>
            ) : (
              users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><Badge variant={user.user_type === 'super_admin' ? 'destructive' : 'secondary'}>{user.user_type}</Badge></TableCell>
                  <TableCell>{user.country}{user.city && `, ${user.city}`}</TableCell>
                  <TableCell>{(user.coin_balance || 0) + (user.free_coin_balance || 0)} π</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setUserToEdit(user); setIsFormOpen(true); }}>Modifier</DropdownMenuItem>
                        {currentUser.user_type === 'super_admin' && currentUser.id !== user.id && (
                           <DropdownMenuItem onClick={() => handleImpersonate(user)} className="text-orange-500">
                             <Key className="mr-2 h-4 w-4"/> Emprunter l'identité
                           </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-500">
                          <AlertDialog>
                            <AlertDialogTrigger asChild><span className="w-full h-full cursor-pointer">Supprimer</span></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Vraiment supprimer {user.full_name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action supprimera définitivement l'utilisateur et toutes ses données associées. C'est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.email)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
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
        <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
            disabled={pagination.page === 0}
        >
            Précédent
        </Button>
        <span className="text-sm">Page {pagination.page + 1} sur {pageCount}</span>
        <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
            disabled={pagination.page >= pageCount - 1}
        >
            Suivant
        </Button>
      </div>
    </div>
  );
};

export default UserManagementTab;