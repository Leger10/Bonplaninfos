import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCcw, AlertOctagon, UserX, CheckCircle, Users, History, Calendar, Lock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { refundService } from '@/services/refundService';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';

const RefundParticipantsModal = ({ isOpen, onClose, event, onConfirm }) => {
  const { userProfile, user } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Vérification des permissions
  const canRefund = React.useMemo(() => {
    if (!userProfile) return false;
    return userProfile.user_type === 'super_admin' || 
           (userProfile.user_type === 'secretary' && userProfile.appointed_by_super_admin === true);
  }, [userProfile]);
  
  const [toRefundList, setToRefundList] = useState([]);
  const [refundedList, setRefundedList] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('to_refund');

  useEffect(() => {
    if (isOpen && event?.id) {
      fetchAllData();
    }
  }, [isOpen, event?.id]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await refundService.getParticipantsForEvent(event.id);
      const allParticipants = result?.participants || [];
      const refundedRecords = await refundService.getRefundedParticipants(event.id) || [];
      
      const refundedMap = new Map(refundedRecords.map(r => [r.user_id, r]));
      
      const pending = [];
      const completed = [];

      allParticipants.forEach(p => {
        if (refundedMap.has(p.user_id)) {
          const record = refundedMap.get(p.user_id);
          completed.push({
            ...p,
            refunded_at: record.processed_at || record.created_at,
            refunded_amount: record.amount || p.total_amount_pi
          });
        } else {
          pending.push(p);
        }
      });

      // Tri
      pending.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      completed.sort((a, b) => new Date(b.refunded_at || 0) - new Date(a.refunded_at || 0));

      setToRefundList(pending);
      setRefundedList(completed);
      setSelectedParticipants([]);
      setSelectAll(false);
      
    } catch (err) {
      console.error("Erreur chargement:", err);
      setError("Impossible de charger les listes.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (!canRefund) return;
    setSelectAll(checked === true);
    setSelectedParticipants(checked ? toRefundList.map(p => p.user_id) : []);
  };

  const handleToggleParticipant = (userId, checked) => {
    if (!canRefund) return;
    
    if (refundedList.some(r => r.user_id === userId)) {
      toast({ title: "Action impossible", description: "Déjà remboursé.", variant: "destructive" });
      return;
    }

    setSelectedParticipants(prev => 
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
    setSelectAll(false);
  };

  const calculateSelectedAmount = () => {
    return toRefundList
      .filter(p => selectedParticipants.includes(p.user_id))
      .reduce((sum, p) => sum + (p.total_amount_pi || 0), 0);
  };

  const calculatePendingTotal = () => toRefundList.reduce((acc, p) => acc + (p.total_amount_pi || 0), 0);
  const calculateRefundedTotal = () => refundedList.reduce((acc, p) => acc + (p.refunded_amount || p.total_amount_pi || 0), 0);

  const handleProcessRefund = async () => {
    if (!canRefund) {
      toast({ title: "Accès refusé", description: "Permissions insuffisantes.", variant: "destructive" });
      return;
    }

    if (selectedParticipants.length === 0) {
      toast({ title: "Aucune sélection", description: "Sélectionnez au moins un participant.", variant: "destructive" });
      return;
    }

    if (!refundReason.trim()) {
      toast({ title: "Raison requise", description: "Indiquez un motif.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const result = await refundService.processRefund(
        event.id, 
        user?.id, 
        selectedParticipants, 
        refundReason
      );

      if (result?.success) {
        toast({ 
          title: "Succès", 
          description: `${result.count || selectedParticipants.length} participant(s) remboursé(s).`,
          className: "bg-green-600 text-white"
        });
        
        onConfirm?.();
        await fetchAllData();
        setRefundReason('');
        
        if (toRefundList.length === selectedParticipants.length) {
          setActiveTab('refunded');
        }
      }
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !processing && onClose(open)}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col bg-gray-900 border-gray-700 text-white p-0">
        <DialogHeader className="p-6 border-b border-gray-700">
          <DialogTitle className="text-orange-400 flex items-center gap-2 text-xl">
            <RefreshCcw className="h-6 w-6" /> Gestion des Remboursements
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Événement : <span className="text-white font-medium">{event?.title}</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mx-6 mt-2">
            <AlertOctagon className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 py-2 bg-gray-800/50 border-y border-gray-700">
            <TabsList className="bg-gray-900 border border-gray-700 w-full">
              <TabsTrigger value="to_refund" className="flex-1 data-[state=active]:bg-orange-600">
                <Users className="w-4 h-4 mr-2" />
                À rembourser ({toRefundList.length})
              </TabsTrigger>
              <TabsTrigger value="refunded" className="flex-1 data-[state=active]:bg-green-600">
                <History className="w-4 h-4 mr-2" />
                Remboursés ({refundedList.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="to_refund" className="flex-1 overflow-hidden flex flex-col p-0 m-0">
            {toRefundList.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 bg-gray-800/30 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    disabled={!canRefund}
                    className="border-orange-500 data-[state=checked]:bg-orange-500"
                  />
                  <Label htmlFor="select-all" className="text-gray-300">Tout sélectionner</Label>
                </div>
                <div className="text-sm text-gray-400">
                  Sélectionné: <span className="text-orange-400 font-bold">{calculateSelectedAmount()} π</span>
                  <span className="mx-2">|</span>
                  Total: <span className="text-white font-bold">{calculatePendingTotal()} π</span>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-orange-400 h-8 w-8" />
                  </div>
                ) : toRefundList.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
                    <p>Aucun participant en attente</p>
                  </div>
                ) : (
                  toRefundList.map(p => (
                    <div
                      key={p.user_id}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                        selectedParticipants.includes(p.user_id)
                          ? "bg-orange-950/20 border-orange-500/50"
                          : "bg-gray-800/40 border-gray-700 hover:bg-gray-800/80"
                      )}
                    >
                      <Checkbox
                        checked={selectedParticipants.includes(p.user_id)}
                        onCheckedChange={(c) => handleToggleParticipant(p.user_id, c)}
                        disabled={!canRefund}
                        className="border-gray-500 data-[state=checked]:bg-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{p.full_name || 'Nom inconnu'}</div>
                            <div className="text-xs text-gray-400">{p.email}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-orange-400 font-bold">{p.total_amount_pi || 0} π</div>
                            <div className="text-xs text-gray-500">{p.ticket_count || 1} ticket(s)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="refunded" className="flex-1 overflow-hidden flex flex-col p-0 m-0">
            <div className="px-6 py-3 bg-gray-800/30 border-b border-gray-700">
              <span className="text-sm text-gray-400">
                Total remboursé: <span className="text-green-400 font-bold">{calculateRefundedTotal()} π</span>
              </span>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-green-400 h-8 w-8" />
                  </div>
                ) : refundedList.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Aucun historique</p>
                  </div>
                ) : (
                  refundedList.map(p => (
                    <div key={p.user_id} className="p-3 rounded-lg border bg-gray-900/40 border-gray-800 opacity-75">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium text-gray-400 line-through">{p.full_name}</div>
                          <div className="text-xs text-gray-600">{p.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-500/80 font-bold line-through">
                            {p.refunded_amount || p.total_amount_pi} π
                          </div>
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {p.refunded_at ? new Date(p.refunded_at).toLocaleDateString('fr-FR') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {activeTab === 'to_refund' && (
          <div className="p-6 border-t border-gray-700 bg-gray-900 space-y-4">
            {!canRefund && (
              <Alert className="bg-blue-900/20 border-blue-700">
                <Lock className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-400">Lecture seule</AlertTitle>
                <AlertDescription className="text-blue-200">
                  Rôle: {userProfile?.user_type || 'Non connecté'}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reason" className="text-gray-300 text-xs font-bold uppercase">
                  Motif <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Annulation, erreur technique..."
                  className="bg-gray-800 border-gray-600 focus:border-orange-500 text-white mt-1"
                  disabled={!canRefund || processing}
                />
              </div>

              <div className="flex justify-end items-end gap-3">
                <Button variant="ghost" onClick={() => onClose(false)} disabled={processing}>
                  Fermer
                </Button>
                {canRefund && (
                  <Button
                    onClick={handleProcessRefund}
                    disabled={processing || !refundReason.trim() || selectedParticipants.length === 0}
                    className="bg-orange-600 hover:bg-orange-700 min-w-[180px]"
                  >
                    {processing ? (
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    ) : (
                      <RefreshCcw className="mr-2 h-4 w-4" />
                    )}
                    Rembourser ({selectedParticipants.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RefundParticipantsModal;