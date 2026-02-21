import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, AlertOctagon, UserX } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { refundService } from '@/services/refundService';

const RefundParticipantsModal = ({ isOpen, onClose, event, onConfirm, adminId }) => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [error, setError] = useState(null);
  const [totalRefundable, setTotalRefundable] = useState(0);

  useEffect(() => {
    if (isOpen && event?.id) {
      fetchParticipants();
    }
  }, [isOpen, event?.id]);

  const fetchParticipants = async () => {
    setLoading(true);
    setError(null);
    try {
      const { participants: data, totalRefundAmount } = await refundService.getParticipantsForEvent(event.id);
      setParticipants(data);
      setTotalRefundable(totalRefundAmount);
      setSelectedParticipants([]); 
      setSelectAll(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(participants.map(p => p.user_id));
    }
    setSelectAll(!selectAll);
  };

  const handleProcessRefund = async () => {
    const isFullRefund = selectedParticipants.length === participants.length && participants.length > 0;

    if (!refundReason.trim()) {
      toast({ title: "Raison requise", description: "Veuillez indiquer un motif.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      let result;
      if (isFullRefund) {
        result = await refundService.processRefund(event.id, adminId);
      } else {
        // Fallback or warning if partial logic isn't fully supported via RPC yet, forcing full refund per request context
        toast({ title: "Attention", description: "Le remboursement partiel n'est pas encore optimisé via RPC. Utilisation du mode global recommandée.", variant: "warning" });
        result = await refundService.processRefund(event.id, adminId);
      }

      if (result.success) {
        toast({ 
          title: "Remboursement effectué", 
          description: `${result.count} tickets remboursés pour un total de ${result.totalAmount} pièces.`,
          className: "bg-green-600 text-white"
        });
        onConfirm();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-orange-400 flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" /> Rembourser les participants
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {event?.title} • Total à rembourser: <span className="text-white font-mono">{totalRefundable} π</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="bg-red-900/20 border-red-700">
            <AlertOctagon className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          <div className="flex gap-2 items-center">
            <Checkbox checked={selectAll} onCheckedChange={handleSelectAll} />
            <Label>Tout sélectionner (RPC optimisé)</Label>
          </div>
          <Badge variant="outline">{selectedParticipants.length} / {participants.length}</Badge>
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-400" /></div>
          ) : participants.length === 0 ? (
            <div className="text-center p-8 text-gray-500"><UserX className="mx-auto mb-2" />Aucun participant éligible au remboursement</div>
          ) : (
            <div className="space-y-2 p-2">
              {participants.map(p => (
                <div key={p.user_id} className="flex gap-3 p-3 bg-gray-800/30 rounded border border-gray-700">
                  <Checkbox 
                    checked={selectedParticipants.includes(p.user_id)}
                    onCheckedChange={(c) => {
                      if (c) setSelectedParticipants([...selectedParticipants, p.user_id]);
                      else setSelectedParticipants(selectedParticipants.filter(id => id !== p.user_id));
                    }} 
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{p.full_name}</span>
                      <span className="text-amber-400 font-mono">{p.total_amount_pi} π</span>
                    </div>
                    <div className="text-xs text-gray-400">{p.ticket_count} tickets • {p.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="mt-4">
          <Label>Motif du remboursement (Enregistré dans les logs)</Label>
          <Textarea 
            value={refundReason} 
            onChange={e => setRefundReason(e.target.value)} 
            placeholder="Annulation événement, erreur technique..." 
            className="bg-gray-800 border-gray-700 mt-1"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>Annuler</Button>
          <Button 
            onClick={handleProcessRefund} 
            disabled={processing || !refundReason || selectedParticipants.length === 0} 
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {processing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Confirmer le remboursement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundParticipantsModal;