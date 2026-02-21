import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle, Users, History } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { refundService } from '@/services/refundService';

const RefundConfirmationModal = ({ 
  isOpen, 
  onClose, 
  event, 
  onConfirm, 
  adminId 
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalAmount: 0, count: 0 });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isOpen && event?.id) {
      loadStats();
    }
  }, [isOpen, event?.id]);

  const loadStats = async () => {
    // Check potential refund using total_amount_pi via service
    const { totalRefundAmount, participants } = await refundService.getParticipantsForEvent(event.id);
    setStats({ totalAmount: totalRefundAmount, count: participants.length });
    
    // Check history
    const logs = await refundService.verifyRefundStatus(event.id);
    setHistory(logs);
  };

  const handleRefund = async () => {
    setLoading(true);
    try {
      const result = await refundService.processRefund(event.id, adminId);
      
      if (result.success) {
        toast({
          title: "✅ Remboursement global effectué",
          description: `${result.count} tickets remboursés (${result.totalAmount} pièces).`,
          className: "bg-green-600 text-white"
        });
        onConfirm();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "❌ Erreur",
        description: "Échec du remboursement: " + err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white dark:bg-gray-900 border-red-200 dark:border-red-900 max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmer le remboursement global
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2 text-gray-700 dark:text-gray-300">
            <p className="font-semibold">
              Vous êtes sur le point de rembourser tous les participants éligibles de "{event?.title}".
            </p>

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-100 dark:border-red-800">
              <h4 className="font-medium mb-2">Simulation :</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Participants restants à rembourser :</span>
                  <span className="font-bold">{stats.count}</span>
                </li>
                <li className="flex justify-between">
                  <span>Montant total estimé :</span>
                  <span className="font-bold text-red-600">{stats.totalAmount} pièces (total_amount_pi)</span>
                </li>
              </ul>
            </div>

            {history.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-xs">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <History className="h-3 w-3" /> Historique récent
                </h4>
                {history.slice(0, 3).map(log => (
                  <div key={log.id} className="flex justify-between text-gray-500 py-1 border-b border-gray-700 last:border-0">
                    <span>{new Date(log.created_at).toLocaleDateString()}</span>
                    <span>{log.refunded_user_count} remboursés ({log.total_amount} π)</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-amber-600">
              ⚠️ Cette action utilise une transaction sécurisée RPC. Elle est irréversible.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); handleRefund(); }}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={loading || stats.count === 0}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Traitement...</>
            ) : (
              <><Users className="h-4 w-4 mr-2" /> Confirmer le remboursement ({stats.totalAmount} π)</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RefundConfirmationModal;