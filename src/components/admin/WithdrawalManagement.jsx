import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Check, X, RefreshCw, Search, Download
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import * as XLSX from 'xlsx';

const WithdrawalManagement = () => {
  const { user } = useAuth();
  const { userProfile } = useData();

  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const isSuperAdmin = userProfile?.user_type === 'super_admin';
  const isAdmin = isSuperAdmin || userProfile?.user_type === 'admin';

  // -------------------------------------------------------------
  // 🔥 1. Chargement des données
  // -------------------------------------------------------------
  const fetchWithdrawalRequests = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);

    try {
      let query = supabase
        .from('organizer_withdrawal_requests')
        .select(`
          *,
          organizer:organizer_id (full_name, email, country, phone),
          reviewer:reviewed_by_admin (full_name)
        `)
        .order('requested_at', { ascending: false });

      if (!isSuperAdmin && userProfile?.country) {
        query = query.eq('organizer.country', userProfile.country);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRequests(data || []);
      setFiltered(data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isSuperAdmin, userProfile]);

  useEffect(() => {
    if (userProfile && isAdmin) fetchWithdrawalRequests();
  }, [userProfile, isAdmin, fetchWithdrawalRequests]);

  // -------------------------------------------------------------
  // 🔎 2. Recherche multicritères
  // -------------------------------------------------------------
  useEffect(() => {
    let result = [...requests];

    if (search.trim().length > 0) {
      const s = search.toLowerCase();
      result = result.filter(req =>
        req.organizer?.full_name?.toLowerCase().includes(s) ||
        req.organizer?.email?.toLowerCase().includes(s) ||
        req.organizer?.phone?.toLowerCase().includes(s)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(req => req.status === statusFilter);
    }

    setFiltered(result);
  }, [search, statusFilter, requests]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setFiltered(requests);
  };

  // -------------------------------------------------------------
  // 💵 3. Traitement des demandes
  // -------------------------------------------------------------
  const handleProcessRequest = async (requestId, status, reason = null) => {
    setProcessingId(requestId);

    try {
      const { data, error } = await supabase.rpc('process_organizer_withdrawal', {
        p_request_id: requestId,
        p_status: status,
        p_notes: reason
      });

      if (error) throw error;

      if (data && !data.success) throw new Error(data.message);

      toast({
        title: 'Succès',
        description: `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'}.`
      });

      await fetchWithdrawalRequests();

    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
      setIsRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
    }
  };

  const openRejectionDialog = (req) => {
    setSelectedRequest(req);
    setIsRejectionDialogOpen(true);
  };

  // -------------------------------------------------------------
  // 📤 4. Export Excel
  // -------------------------------------------------------------
  const exportToExcel = () => {
    const rows = filtered.map(r => ({
      Organisateur: r.organizer?.full_name,
      Email: r.organizer?.email,
      Téléphone: r.organizer?.phone,
      Pays: r.organizer?.country,
      Montant_PI: r.amount_pi,
      Montant_FCFA: r.amount_fcfa,
      Moyen: r.payment_details?.method,
      Identifiant: r.payment_details?.number,
      Statut: r.status,
      Date: new Date(r.requested_at).toLocaleString('fr-FR')
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retraits');

    XLSX.writeFile(wb, 'withdrawals.xlsx');
    toast({ title: "Export réussi", description: "Le fichier Excel a été généré." });
  };

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  const getStatusBadge = (status) => {
    const mapping = {
      pending: 'bg-yellow-500/20 text-yellow-300',
      approved: 'bg-green-500/20 text-green-300',
      rejected: 'bg-red-500/20 text-red-300',
      paid: 'bg-blue-500/20 text-blue-300',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${mapping[status] || ''}`}>
        {status === 'pending' ? 'En attente'
          : status === 'approved' ? 'Approuvé'
          : status === 'rejected' ? 'Rejeté'
          : 'Payé'}
      </span>
    );
  };

  if (!isAdmin)
    return (
      <div className="text-center p-8">
        <p className="text-destructive font-semibold">
          Accès interdit. Réservé aux administrateurs.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">

      {/* 🔎 Barre de recherche & filtres */}
      <div className="flex gap-3 items-center">
        <div className="relative w-72">
          <input
            className="w-full px-3 py-2 border rounded-md pl-9 bg-background"
            placeholder="Rechercher un organisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="w-4 h-4 absolute left-2 top-3 text-muted-foreground" />
        </div>

        <select
          className="px-3 py-2 border rounded-md bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Rejeté</option>
          <option value="paid">Payé</option>
        </select>

        <Button variant="outline" onClick={resetFilters}>Réinitialiser</Button>

        <Button onClick={exportToExcel} className="flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Excel
        </Button>

        <Button
          onClick={fetchWithdrawalRequests}
          variant="outline"
          disabled={loading}
          className="flex items-center gap-2 ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* 🧾 Tableau */}
      <div className="rounded-md border">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisateur</TableHead>
                <TableHead>Montant (π)</TableHead>
                <TableHead>Montant (FCFA)</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length > 0 ? (
                filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.organizer?.full_name}</div>
                      <div className="text-sm text-muted-foreground">{req.organizer?.email}</div>
                      <div className="text-xs text-blue-400">{req.organizer?.phone}</div>
                      {isSuperAdmin && (
                        <div className="text-xs text-green-400">{req.organizer?.country}</div>
                      )}
                    </TableCell>

                    <TableCell>{req.amount_pi.toLocaleString('fr-FR')} π</TableCell>
                    <TableCell>{req.amount_fcfa.toLocaleString('fr-FR')} FCFA</TableCell>

                    <TableCell>
                      <div className="font-medium">
                        {req.payment_details?.method || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {req.payment_details?.number || req.payment_details?.account_number || '—'}
                      </div>
                    </TableCell>

                    <TableCell>{getStatusBadge(req.status)}</TableCell>

                    <TableCell>
                      {new Date(req.requested_at).toLocaleDateString('fr-FR')}
                      <div className="text-xs text-muted-foreground">
                        {new Date(req.requested_at).toLocaleTimeString('fr-FR')}
                      </div>
                    </TableCell>

                    <TableCell className="text-right space-x-2">
                      {req.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleProcessRequest(req.id, 'approved')}
                            disabled={processingId === req.id}
                          >
                            {processingId === req.id ?
                              <Loader2 className="h-4 w-4 animate-spin" /> :
                              <Check className="h-4 w-4 text-green-500" />
                            }
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRejectionDialog(req)}
                            disabled={processingId === req.id}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Aucun résultat trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ❌ Dialog rejet */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Une raison est obligatoire et sera visible par l’organisateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Organisateur:</strong> {selectedRequest.organizer?.full_name}</p>
                <p><strong>Montant:</strong> {selectedRequest.amount_pi} π</p>
                <p><strong>Paiement:</strong> {selectedRequest.payment_details?.method}</p>
              </div>
            )}

            <Textarea
              rows={4}
              placeholder="Ex: informations incorrectes…"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectionDialogOpen(false)}
            >
              Annuler
            </Button>

            <Button
              variant="destructive"
              onClick={() =>
                handleProcessRequest(selectedRequest?.id, 'rejected', rejectionReason)
              }
              disabled={!rejectionReason.trim() || processingId === selectedRequest?.id}
            >
              {processingId === selectedRequest?.id &&
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              }
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default WithdrawalManagement;
