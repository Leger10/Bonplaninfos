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

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u =>
      u.country === userProfile?.country &&
      (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       u.user_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       u.affiliate_code?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm, userProfile?.country]);

  const paginatedUsers = useMemo(() => {
    const start = pagination.page * pagination.size;
    const end = start + pagination.size;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, pagination]);

  const pageCount = Math.ceil(filteredUsers.length / pagination.size);

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

      toast({ title: 'Succès', description: data.message || `Utilisateur ${selectedUser.full_name} crédité de ${amount} pièces.` });
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
        <h2 className="text-xl font-bold">Gestion des Utilisateurs ({userProfile?.country})</h2>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, email, code)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-sm"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Solde</TableHead>
              <TableHead>Code Parrainage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && paginatedUsers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : paginatedUsers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun utilisateur trouvé.</TableCell></TableRow>
            ) : (
              paginatedUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="font-medium">
                        <div>{u.full_name || 'Sans nom'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "success" : "destructive"} className="text-[10px]">
                      {u.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.user_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                        <span className="font-semibold">{u.coin_balance || 0} π (Payant)</span>
                        <span className="text-muted-foreground">{u.free_coin_balance || 0} π (Gratuit)</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.affiliate_code ? (
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{u.affiliate_code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(u.affiliate_code)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground italic">Non généré</span>}
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
                        
                        <DropdownMenuItem onClick={() => handleOpenCreditDialog(u)}>
                          <Coins className="mr-2 h-4 w-4 text-primary" /> Créditer
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleStatusChange(u)} disabled={loading}>
                          {u.is_active ? (
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