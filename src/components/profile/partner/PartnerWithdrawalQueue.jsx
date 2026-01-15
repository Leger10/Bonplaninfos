import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatCurrencySimple } from '@/lib/utils';

const PartnerWithdrawalQueue = ({ country }) => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Action states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    if (!country) return;
    setLoading(true);
    try {
      // Fetch organizer withdrawal requests for this country
      // Requires joining with organizer profile to filter by country
      const { data, error } = await supabase
        .from('organizer_withdrawal_requests')
        .select(`
          *,
          organizer:organizer_id!inner (
            id,
            full_name,
            email,
            country
          )
        `)
        .eq('organizer.country', country)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast({ title: "Erreur", description: "Impossible de charger les demandes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleApprove = async (requestId) => {
    if (!window.confirm("Confirmer l'approbation de ce retrait ?")) return;
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('process_organizer_withdrawal', {
        p_request_id: requestId,
        p_status: 'approved',
        p_notes: 'Approuvé par le partenaire'
      });

      if (error) throw error;
      toast({ title: "Approuvé", description: "Le retrait a été validé." });
      fetchWithdrawals();
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('process_organizer_withdrawal', {
        p_request_id: selectedRequest.id,
        p_status: 'rejected',
        p_notes: rejectReason
      });

      if (error) throw error;
      toast({ title: "Rejeté", description: "La demande a été rejetée et les fonds remboursés." });
      setRejectDialogOpen(false);
      setRejectReason('');
      fetchWithdrawals();
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => 
    activeTab === 'all' ? true : w.status === activeTab
  );

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approuvé</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejeté</Badge>;
      case 'paid': return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Payé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Queue de Retraits ({country})</h3>
        <Button variant="outline" size="sm" onClick={fetchWithdrawals} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualiser"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvés</TabsTrigger>
          <TabsTrigger value="rejected">Rejetés</TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisateur</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucune demande trouvée dans cette catégorie.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWithdrawals.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="font-medium">{req.organizer?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{req.organizer?.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">{formatCurrencySimple(req.amount_fcfa)}</div>
                        <div className="text-xs text-muted-foreground">{req.amount_pi} pièces</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {req.payment_details?.method || 'N/A'}
                        </Badge>
                        <div className="text-xs mt-1 font-mono">{req.payment_details?.number}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(req.requested_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 h-8 px-2"
                              onClick={() => handleApprove(req.id)}
                              disabled={processing}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="h-8 px-2"
                              onClick={() => { setSelectedRequest(req); setRejectDialogOpen(true); }}
                              disabled={processing}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {req.status === 'rejected' && req.admin_notes && (
                          <Button variant="ghost" size="sm" title={req.admin_notes}>
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du rejet. Les fonds seront remboursés au solde de l'organisateur.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Raison du rejet (ex: Numéro incorrect)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={!rejectReason.trim() || processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerWithdrawalQueue;