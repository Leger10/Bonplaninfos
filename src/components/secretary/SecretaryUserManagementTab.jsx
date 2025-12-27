import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MoreHorizontal, Ban, CheckCircle, Coins, Copy } from 'lucide-react';
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
  const [pagination, setPagination] = useState({ page: 0, size: 20 });

  // DEBUG: Vérifier ce que nous recevons
  console.log('Users reçus:', users);
  console.log('UserProfile:', userProfile);
  console.log('Country du secrétaire:', userProfile?.country);

  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) {
      console.log('Aucun utilisateur reçu ou tableau vide');
      return [];
    }

    // Pour les secrétaires, filtrer par pays et exclure les admins/super_admins
    const filtered = users.filter(u => {
      // Vérifier si l'utilisateur a un pays
      const hasCountry = u.country && u.country.trim() !== '';
      const matchesCountry = userProfile?.country ? 
        u.country === userProfile.country : 
        true; // Si le secrétaire n'a pas de pays, afficher tous les utilisateurs
      
      // Exclure les super_admins et admins de la liste
      const isNotHighLevelAdmin = u.user_type !== 'super_admin' && u.user_type !== 'admin';
      
      // Recherche textuelle
      const matchesSearch = searchTerm === '' || 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.user_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.affiliate_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return hasCountry && matchesCountry && isNotHighLevelAdmin && matchesSearch;
    });

    console.log('Utilisateurs filtrés:', filtered.length, 'sur', users.length);
    console.log('Exemples filtrés:', filtered.slice(0, 3));
    
    return filtered;
  }, [users, searchTerm, userProfile?.country]);

  const paginatedUsers = useMemo(() => {
    const start = pagination.page * pagination.size;
    const end = start + pagination.size;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, pagination]);

  const pageCount = Math.ceil(filteredUsers.length / pagination.size) || 1;

  const handleStatusChange = async (targetUser) => {
    const newStatus = !targetUser.is_active;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', targetUser.id);
      
      if (error) throw error;
      
      toast({ 
        title: newStatus ? "Utilisateur réactivé" : "Utilisateur désactivé", 
        description: `Le compte de ${targetUser.full_name || targetUser.email} est maintenant ${newStatus ? 'actif' : 'inactif'}.`,
        variant: newStatus ? "default" : "destructive"
      });
      
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Status toggle error:", error);
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

      if (error) throw error;
      if (!data.success) throw new Error(data.message || 'Échec du crédit utilisateur.');

      toast({ 
        title: 'Succès', 
        description: data.message || `Utilisateur ${selectedUser.full_name} crédité de ${amount} pièces.`,
        variant: "default"
      });
      if (onRefresh) onRefresh();
      setIsCreditDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({ title: "Copié", description: "Code copié" });
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Gestion des Utilisateurs 
          {userProfile?.country && ` (${userProfile.country})`}
          {!userProfile?.country && ' - Pays non défini'}
        </h2>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher (nom, email, code)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-sm bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
          />
        </div>
      </div>

      {!userProfile?.country && (
        <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-800 rounded-lg">
          <p className="text-yellow-300 text-sm">
            ⚠️ Votre compte n'a pas de pays défini. Vous ne pourrez pas voir les utilisateurs.
            Contactez un administrateur pour définir votre pays.
          </p>
        </div>
      )}

      <div className="rounded-md border border-gray-800 bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-gray-800">
              <TableHead className="text-gray-300">Utilisateur</TableHead>
              <TableHead className="text-gray-300">Statut</TableHead>
              <TableHead className="text-gray-300">Rôle</TableHead>
              <TableHead className="text-gray-300">Solde</TableHead>
              <TableHead className="text-gray-300">Code Parrainage</TableHead>
              <TableHead className="text-right text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && paginatedUsers.length === 0 ? (
              <TableRow className="border-gray-800">
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-white" />
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length === 0 ? (
              <TableRow className="border-gray-800">
                <TableCell colSpan={6} className="h-24 text-center text-gray-400">
                  {users && users.length > 0 
                    ? "Aucun utilisateur trouvé dans votre pays." 
                    : "Aucun utilisateur à afficher."}
                  <div className="text-xs mt-2 text-gray-500">
                    {userProfile?.country 
                      ? `Pays: ${userProfile.country} | Total utilisateurs: ${users?.length || 0}`
                      : 'Pays non défini'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((u) => (
                <TableRow key={u.id} className="border-gray-800 hover:bg-gray-800/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="font-medium">
                        <div className="text-white">{u.full_name || 'Sans nom'}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                        <div className="text-xs text-gray-500 flex gap-2 mt-1">
                          {u.country && <span>Pays: {u.country}</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={u.is_active ? "success" : "destructive"} 
                      className="text-[10px] bg-gray-800"
                    >
                      {u.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-gray-700 text-gray-300">
                      {u.user_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold text-white">{u.coin_balance || 0} π (Payant)</span>
                      <span className="text-gray-400">{u.free_coin_balance || 0} π (Gratuit)</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.affiliate_code ? (
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-xs font-mono">
                          {u.affiliate_code}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={() => copyCode(u.affiliate_code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Non généré</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        className="bg-gray-900 border-gray-800 text-white"
                      >
                        <DropdownMenuLabel className="text-gray-300">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-800" />
                        
                        <DropdownMenuItem 
                          onClick={() => handleOpenCreditDialog(u)}
                          className="text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer"
                        >
                          <Coins className="mr-2 h-4 w-4 text-yellow-500" /> 
                          <span>Créditer</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(u)} 
                          disabled={loading}
                          className="text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer"
                        >
                          {u.is_active ? (
                            <>
                              <Ban className="mr-2 h-4 w-4 text-red-500" /> 
                              <span className="text-red-400">Désactiver</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              <span className="text-green-400">Réactiver</span>
                            </>
                          )}
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
          onClick={() => setPagination(p => ({ ...p, page: Math.max(0, p.page - 1) }))} 
          disabled={pagination.page === 0}
          className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          Précédent
        </Button>
        <span className="text-sm text-gray-400">
          Page {pagination.page + 1} sur {pageCount}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setPagination(p => ({ ...p, page: Math.min(pageCount - 1, p.page + 1) }))} 
          disabled={pagination.page >= pageCount - 1}
          className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          Suivant
        </Button>
      </div>

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Créditer l'utilisateur: {selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Ajouter des pièces au solde de l'utilisateur.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right text-gray-300">
                Montant (π)
              </Label>
              <Input
                id="amount"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="col-span-3 bg-gray-800 border-gray-700 text-white"
                placeholder="Ex: 100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right text-gray-300">
                Raison
              </Label>
              <Textarea
                id="reason"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                className="col-span-3 bg-gray-800 border-gray-700 text-white"
                placeholder="Raison du crédit..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreditDialogOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreditUser} 
              disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créditer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SecretaryUserManagementTab;