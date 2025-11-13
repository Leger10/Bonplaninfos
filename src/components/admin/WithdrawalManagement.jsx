import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Search, Coins, Eye, RefreshCw, XCircle, Check, Ban } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
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

const WithdrawalManagement = () => {
  const { adminConfig, userProfile } = useData();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const canProcessWithdrawals = userProfile?.user_type === 'super_admin' || (userProfile?.user_type === 'secretary' && userProfile?.appointed_by_super_admin);

  const convertirEnFCFA = useCallback((pieces) => {
    if (!adminConfig?.coin_to_fcfa_rate) return 0;
    return pieces * adminConfig.coin_to_fcfa_rate;
  }, [adminConfig]);

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("organizer_withdrawal_requests")
        .select(`*, user:organizer_id (full_name, email, phone, country)`)
        .order("requested_at", { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (userProfile?.user_type === 'admin' && userProfile?.country) {
        query = query.eq('user.country', userProfile.country);
      }
      
      if (searchTerm) {
        query = query.or(`user.full_name.ilike.%${searchTerm}%,user.email.ilike.%${searchTerm}%,mobile_money_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading withdrawals:", error);
      toast({ title: "Erreur lors du chargement des retraits", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, userProfile?.user_type, userProfile?.country]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const handleUpdateStatus = async (withdrawal, status, reason = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('process_withdrawal_request', {
        p_request_id: withdrawal.id,
        p_processor_id: user.id,
        p_status: status,
        p_rejection_reason: reason
      });
      
      if (error) throw error;

      toast({ title: "Statut du retrait mis à jour", variant: "success" });
      loadWithdrawals();
      setSelectedRequest(null);
      setRejectionReason('');

    } catch (error) {
      console.error("Error updating withdrawal status:", error);
      toast({ title: "Erreur lors de la mise à jour", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
      <CardHeader>
        <CardTitle className="text-white">💸 Gestion des Retraits</CardTitle>
         <CardDescription>Gérez les demandes de retrait des organisateurs.</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher par nom, email, numéro..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase bg-background/50">
              <tr>
                <th className="px-6 py-3 text-left">Demande</th>
                <th className="px-6 py-3 text-left">Utilisateur</th>
                <th className="px-6 py-3 text-left">Montant</th>
                <th className="px-6 py-3 text-left">Coordonnées</th>
                <th className="px-6 py-3 text-left">Statut</th>
                {canProcessWithdrawals && <th className="px-6 py-3 text-left">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((withdrawal) => (
                <tr key={withdrawal.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <p className="font-mono text-sm text-white">#{withdrawal.id.substring(0, 8)}</p>
                    <p className="text-xs text-gray-400">{new Date(withdrawal.requested_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white">{withdrawal.user?.full_name}</p>
                    <p className="text-sm text-gray-400">{withdrawal.user?.email}</p>
                    <p className="text-xs text-gray-400">{withdrawal.user?.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white">{withdrawal.amount_pi}</span>
                      <Coins className="w-4 h-4 text-primary" />
                      <span className="text-sm text-gray-400">(≈ {convertirEnFCFA(withdrawal.amount_pi).toLocaleString()} FCFA)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-semibold">{withdrawal.mobile_money_provider || withdrawal.bank_name}</p>
                    <p className="text-gray-400">{withdrawal.mobile_money_number || withdrawal.account_number}</p>
                     <p className="text-gray-400 text-xs">{withdrawal.account_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      withdrawal.status === "approved" ? "bg-green-500/20 text-green-400"
                      : withdrawal.status === "pending" ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                    }`}>
                      {withdrawal.status === 'pending' ? 'En attente' : withdrawal.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  </td>
                  {canProcessWithdrawals && (
                    <td className="px-6 py-4">
                      {withdrawal.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => handleUpdateStatus(withdrawal, "approved")}>
                            <Check className="w-4 h-4 mr-2" /> Approuver
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setSelectedRequest(withdrawal)}>
                            <Ban className="w-4 h-4 mr-2" /> Rejeter
                          </Button>
                        </div>
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && <p className="text-center text-gray-400 py-8">Aucune demande de retrait trouvée.</p>}
        </div>

        {selectedRequest && (
          <AlertDialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rejeter la demande de retrait ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Veuillez fournir une raison pour le rejet. Cette raison sera visible par l'organisateur.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input 
                placeholder="Raison du rejet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                  disabled={!rejectionReason}
                  onClick={() => handleUpdateStatus(selectedRequest, "rejected", rejectionReason)}
                >
                  Confirmer le rejet
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalManagement;