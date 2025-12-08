import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  CheckCircle2,
  Coins,
  Percent,
  ArrowRight,
  Loader2,
  Wallet,
  Trophy,
  Shield,
  Info,
  Calendar
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/customSupabaseClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TransferModal = ({ 
  isOpen, 
  onClose, 
  transactions = [],
  totalAmount = 0,
  loading = false,
  onConfirm
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  
  // Calcul des totaux avec répartition 95%/5%
  const calculateTotals = () => {
    let totalBrut = 0;
    let totalNet = 0;
    let totalFees = 0;
    
    // Si nous avons des transactions détaillées
    if (transactions.length > 0) {
      transactions.forEach(transaction => {
        const brut = transaction.brut || transaction.amount || 0;
        const net = Math.floor(brut * 0.95);
        const fees = Math.floor(brut * 0.05);
        
        totalBrut += brut;
        totalNet += net;
        totalFees += fees;
      });
    } else {
      // Si nous avons seulement le totalAmount
      totalBrut = totalAmount;
      totalNet = Math.floor(totalAmount * 0.95);
      totalFees = Math.floor(totalAmount * 0.05);
    }

    return { totalBrut, totalNet, totalFees };
  };

  const totals = calculateTotals();
  
  // Réinitialiser l'état quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTransferSuccess(false);
      setIsConfirming(false);
    }
  }, [isOpen]);

  const handleTransfer = async () => {
    if (totals.totalNet <= 0) {
      toast.error("Aucun montant à transférer");
      return;
    }

    setIsLoading(true);
    
    try {
      if (onConfirm) {
        await onConfirm();
      } else {
        // Logique de transfert par défaut si aucune fonction n'est fournie
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        // Logique de transfert...
      }
      
      setTransferSuccess(true);
      toast.success(`Transfert réussi : ${totals.totalNet} π transférés`);
      
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(`Erreur lors du transfert: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    setIsConfirming(true);
  };

  const handleBack = () => {
    setIsConfirming(false);
  };

  const handleClose = () => {
    setTransferSuccess(false);
    setIsConfirming(false);
    onClose();
  };

  // Composant de récapitulatif
  const renderSummary = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Chargement des transactions...</span>
        </div>
      );
    }

    if (totals.totalBrut <= 0) {
      return (
        <div className="text-center py-8">
          <Coins className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucune transaction en attente de transfert</p>
        </div>
      );
    }

    return (
      <>
        {/* Totaux en en-tête */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-white rounded border">
              <div className="text-sm text-gray-600">Total brut</div>
              <div className="text-xl font-bold text-gray-800">{totals.totalBrut} π</div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="text-sm text-green-600">Net (95%)</div>
              <div className="text-xl font-bold text-green-700">{totals.totalNet} π</div>
            </div>
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="text-sm text-red-600">Frais (5%)</div>
              <div className="text-xl font-bold text-red-700">{totals.totalFees} π</div>
            </div>
          </div>
        </div>

        {/* Détails des transactions si disponibles */}
        {transactions.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Détails des transactions ({transactions.length})
            </h4>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {transactions.map((transaction, index) => {
                const brut = transaction.brut || transaction.amount || 0;
                const net = Math.floor(brut * 0.95);
                const fees = Math.floor(brut * 0.05);
                
                return (
                  <div key={transaction.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {transaction.description || `Transaction #${transaction.id?.slice(0, 8) || index + 1}`}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {transaction.date ? format(new Date(transaction.date), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'Date non disponible'}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        À transférer
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">Montant brut :</span>
                        </div>
                        <span className="font-semibold">{brut} π</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Percent className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-700">Net (95%) :</span>
                            </div>
                            <span className="font-bold text-green-700">
                              {net} π
                            </span>
                          </div>
                        </div>
                        <div className="p-2 bg-red-50 rounded border border-red-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Percent className="w-3 h-3 text-red-600" />
                              <span className="text-xs text-red-700">Frais (5%) :</span>
                            </div>
                            <span className="font-bold text-red-700">
                              {fees} π
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Avertissement */}
        <Alert className="mb-2 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            <strong>Note :</strong> Seuls les gains nets (95%) seront crédités dans votre portefeuille. 
            Les frais (5%) seront retenus.
          </AlertDescription>
        </Alert>
      </>
    );
  };

  // Composant de confirmation
  const renderConfirmation = () => (
    <div className="text-center space-y-6 py-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
        <Shield className="w-8 h-8 text-blue-600" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-4">Confirmer le transfert</h3>
        
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Montant total brut :</span>
              <span className="font-bold">{totals.totalBrut} π</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Frais (5%) :</span>
              <span className="font-bold text-red-600">-{totals.totalFees} π</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-700 font-semibold">Montant net à transférer :</span>
              <span className="text-xl font-bold text-green-600">{totals.totalNet} π</span>
            </div>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cette action est irréversible. Une fois confirmé, les gains seront transférés vers votre solde disponible.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );

  // Composant de succès
  const renderSuccess = () => (
    <div className="text-center space-y-6 py-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-green-600 mb-2">Transfert réussi !</h3>
        <p className="text-gray-600 mb-6">
          Vos gains ont été transférés vers votre solde disponible
        </p>
        
        <div className="space-y-4 max-w-md mx-auto">
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-700">Montant transféré :</span>
              <span className="text-2xl font-bold text-green-600">{totals.totalNet} π</span>
            </div>
            <div className="text-sm text-gray-600 text-left space-y-1">
              <div className="flex justify-between">
                <span>Total brut :</span>
                <span>{totals.totalBrut} π</span>
              </div>
              <div className="flex justify-between">
                <span>Frais retenus (5%) :</span>
                <span className="text-red-600">-{totals.totalFees} π</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span>Nombre de transactions :</span>
                <span>{transactions.length > 0 ? transactions.length : '1'}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Montant net transféré :</span>
              </div>
              <span className="text-xl font-bold text-blue-800">{totals.totalNet} π</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {transferSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Transfert terminé
              </>
            ) : isConfirming ? (
              <>
                <Shield className="w-5 h-5 text-blue-600" />
                Confirmation
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                Transfert des gains
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {transferSuccess 
              ? "Vos gains ont été transférés vers votre solde disponible"
              : isConfirming
                ? "Vérifiez les détails avant de confirmer"
                : `Transférer ${totals.totalBrut} π vers votre solde disponible`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {transferSuccess 
            ? renderSuccess()
            : isConfirming
              ? renderConfirmation()
              : renderSummary()
          }
        </div>

        <DialogFooter className="mt-6 pt-4 border-t">
          {transferSuccess ? (
            <Button 
              onClick={handleClose}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              Fermer
            </Button>
          ) : isConfirming ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={isLoading}
              >
                Retour
              </Button>
              <Button 
                onClick={handleTransfer}
                disabled={isLoading}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmer le transfert
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleClose}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={loading || totals.totalBrut <= 0}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <ArrowRight className="w-4 h-4" />
                Continuer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;