import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2, Trash2, CheckCircle2, ListChecks } from "lucide-react";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ResetDataModal = ({ open, onOpenChange, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('selection'); // selection, confirmation, processing, success
  
  const [options, setOptions] = useState({
    transactions: false,
    revenues: false,
    tickets: false,
    balances: false
  });

  const [deleteCounts, setDeleteCounts] = useState(null);

  const resetState = () => {
    setStep('selection');
    setProgress(0);
    setConfirmText("");
    setOptions({
      transactions: false,
      revenues: false,
      tickets: false,
      balances: false
    });
    setDeleteCounts(null);
    onOpenChange(false);
  };

  const handleOptionChange = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelectAll = () => {
    const allSelected = Object.values(options).every(Boolean);
    setOptions({
      transactions: !allSelected,
      revenues: !allSelected,
      tickets: !allSelected,
      balances: !allSelected
    });
  };

  const selectedCount = Object.values(options).filter(Boolean).length;
  const isConfirmTextValid = confirmText === "SUPPRIMER";

  const handleInitiateReset = () => {
    if (selectedCount === 0) return;
    setStep('confirmation');
  };

  const handleReset = async () => {
    if (!user) return;
    
    console.log("Reset initiated:", options);
    setIsLoading(true);
    setStep('processing');
    setProgress(10);

    try {
      // Simulate progress for UX
      const interval = setInterval(() => {
        setProgress(prev => (prev >= 90 ? 90 : prev + 10));
      }, 300);

      const { data, error } = await supabase.rpc('reset_selective_data', {
        p_admin_id: user.id,
        p_reset_transactions: options.transactions,
        p_reset_revenues: options.revenues,
        p_reset_tickets: options.tickets,
        p_reset_balances: options.balances
      });

      clearInterval(interval);
      setProgress(100);

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      console.log("Reset completed successfully", data);
      if (data.counts) {
        console.log("Transactions deleted:", data.counts.transactions);
        console.log("Revenues reset:", data.counts.revenues);
        console.log("Tickets deleted:", data.counts.tickets);
        console.log("Balances reset:", data.counts.balances);
        setDeleteCounts(data.counts);
      }

      setStep('success');
      toast({
        title: "Réinitialisation réussie",
        description: "Les données sélectionnées ont été supprimées.",
        variant: "success"
      });
      
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error("Reset error:", error);
      setStep('selection');
      setProgress(0);
      toast({
        title: "Erreur critique",
        description: error.message || "Impossible de réinitialiser les données.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSummaryText = () => {
    const parts = [];
    if (options.tickets) parts.push("Billets & Participations");
    if (options.revenues) parts.push("Revenus & Gains");
    if (options.transactions) parts.push("Historique Transactions");
    if (options.balances) parts.push("Soldes Utilisateurs");
    return parts;
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isLoading && (val ? null : resetState())}>
      <DialogContent className="sm:max-w-[550px] border-destructive/20">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6" />
            Nettoyage Sélectif des Données
          </DialogTitle>
          <DialogDescription className="text-base">
            Sélectionnez les catégories de données à supprimer définitivement. 
            Cette action est <strong className="text-destructive">IRRÉVERSIBLE</strong>.
          </DialogDescription>
        </DialogHeader>

        {step === 'selection' && (
          <div className="space-y-6 py-2">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-medium text-muted-foreground">{selectedCount} catégories sélectionnées</span>
              <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8 text-xs">
                <ListChecks className="w-3 h-3 mr-2" />
                {selectedCount === 4 ? "Tout désélectionner" : "Tout sélectionner"}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Card className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-accent/50 ${options.tickets ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`} onClick={() => handleOptionChange('tickets')}>
                <div className="flex items-start space-x-3">
                  <Checkbox checked={options.tickets} onCheckedChange={() => handleOptionChange('tickets')} />
                  <div>
                    <Label className="font-bold cursor-pointer">Billets, Votes & Participations</Label>
                    <p className="text-xs text-muted-foreground mt-1">Supprime tous les tickets, scans, votes, participations et remet à zéro les compteurs d'événements.</p>
                  </div>
                </div>
              </Card>

              <Card className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-accent/50 ${options.revenues ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`} onClick={() => handleOptionChange('revenues')}>
                <div className="flex items-start space-x-3">
                  <Checkbox checked={options.revenues} onCheckedChange={() => handleOptionChange('revenues')} />
                  <div>
                    <Label className="font-bold cursor-pointer">Revenus & Gains</Label>
                    <p className="text-xs text-muted-foreground mt-1">Supprime l'historique des gains organisateurs, les demandes de retrait et les commissions admin.</p>
                  </div>
                </div>
              </Card>

              <Card className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-accent/50 ${options.transactions ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`} onClick={() => handleOptionChange('transactions')}>
                <div className="flex items-start space-x-3">
                  <Checkbox checked={options.transactions} onCheckedChange={() => handleOptionChange('transactions')} />
                  <div>
                    <Label className="font-bold cursor-pointer">Historique des Transactions</Label>
                    <p className="text-xs text-muted-foreground mt-1">Supprime toutes les traces d'achats de pièces, transferts et dépenses dans les logs.</p>
                  </div>
                </div>
              </Card>

              <Card className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-accent/50 ${options.balances ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`} onClick={() => handleOptionChange('balances')}>
                <div className="flex items-start space-x-3">
                  <Checkbox checked={options.balances} onCheckedChange={() => handleOptionChange('balances')} />
                  <div>
                    <Label className="font-bold cursor-pointer">Soldes & Portefeuilles</Label>
                    <p className="text-xs text-muted-foreground mt-1">Remet à zéro tous les soldes de pièces utilisateurs et les portefeuilles organisateurs.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-4">
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <h4 className="font-bold text-destructive flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" /> Attention Action Destructrice
              </h4>
              <p className="text-sm mb-2">Vous êtes sur le point de supprimer définitivement :</p>
              <ul className="list-disc list-inside text-sm space-y-1 mb-4 font-medium">
                {getSummaryText().map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Les utilisateurs et les événements eux-mêmes ne seront PAS supprimés, seules leurs données associées le seront.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-semibold">
                Pour confirmer, écrivez <span className="text-destructive font-black">SUPPRIMER</span> ci-dessous :
              </Label>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="border-destructive focus-visible:ring-destructive font-mono tracking-wider"
                placeholder="SUPPRIMER"
                autoFocus
              />
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-destructive rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              <span className="font-bold text-xl">{progress}%</span>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Nettoyage en cours...</h3>
              <p className="text-sm text-muted-foreground">Veuillez ne pas fermer cette fenêtre.</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-green-700">Nettoyage Terminé !</h3>
              <p className="text-muted-foreground">La base de données a été mise à jour avec succès.</p>
            </div>
            
            {deleteCounts && (
              <div className="grid grid-cols-2 gap-3 w-full bg-muted/30 p-4 rounded-lg text-sm">
                <div className="flex justify-between"><span>Transactions:</span> <Badge variant="outline">{deleteCounts.transactions || 0}</Badge></div>
                <div className="flex justify-between"><span>Revenus:</span> <Badge variant="outline">{deleteCounts.revenues || 0}</Badge></div>
                <div className="flex justify-between"><span>Tickets:</span> <Badge variant="outline">{deleteCounts.tickets || 0}</Badge></div>
                <div className="flex justify-between"><span>Comptes Reset:</span> <Badge variant="outline">{deleteCounts.balances || 0}</Badge></div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between gap-2 pt-4 border-t mt-2">
          {step === 'selection' ? (
            <>
              <Button variant="outline" onClick={resetState}>Annuler</Button>
              <Button 
                variant="default" 
                disabled={selectedCount === 0}
                onClick={handleInitiateReset}
                className="w-full sm:w-auto"
              >
                Continuer ({selectedCount})
              </Button>
            </>
          ) : step === 'confirmation' ? (
            <>
              <Button variant="outline" onClick={() => setStep('selection')}>Retour</Button>
              <Button 
                variant="destructive" 
                disabled={!isConfirmTextValid}
                onClick={handleReset}
                className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Confirmer la suppression
              </Button>
            </>
          ) : step === 'success' ? (
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={resetState}>
              Fermer et Actualiser
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetDataModal;