import React, { useState } from "react";
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
import { 
  AlertTriangle, 
  Loader2, 
  Trash2, 
  CheckCircle2,
  Database,
  Coins,
  Ticket,
  Wallet
} from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/SupabaseAuthContext";

const ResetDataModal = ({ open, onOpenChange, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("warning");
  const [selectedAction, setSelectedAction] = useState("all");
  const [checks, setChecks] = useState({
    transactions: false,
    earnings: false,
    tickets: false,
    balances: false,
    irreversible: false,
  });

  // Toggle pour tout sélectionner/désélectionner
  const toggleAll = (checked) => {
    setChecks({
      transactions: checked,
      earnings: checked,
      tickets: checked,
      balances: checked,
      irreversible: checked,
    });
  };

  const allChecked = Object.values(checks).every(Boolean);
  const someChecked = Object.values(checks).some(Boolean) && !allChecked;
  
  // Vérifier si au moins une action est sélectionnée (hors "irreversible")
  const hasActionSelected = checks.transactions || checks.earnings || checks.tickets || checks.balances;
  
  const isConfirmTextValid = confirmText === "SUPPRIMER";
  const canReset = hasActionSelected && checks.irreversible && isConfirmTextValid;

  const handleCheck = (key) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAction = (action) => {
    setSelectedAction(action);
    switch(action) {
      case "all":
        toggleAll(true);
        break;
      case "transactions":
        setChecks(prev => ({ ...prev, transactions: true, earnings: false, tickets: false, balances: false }));
        break;
      case "earnings":
        setChecks(prev => ({ ...prev, transactions: false, earnings: true, tickets: false, balances: false }));
        break;
      case "tickets":
        setChecks(prev => ({ ...prev, transactions: false, earnings: false, tickets: true, balances: false }));
        break;
      case "balances":
        setChecks(prev => ({ ...prev, transactions: false, earnings: false, tickets: false, balances: true }));
        break;
      default:
        break;
    }
  };

  const handleReset = async () => {
    if (!user) return;

    setIsLoading(true);
    setStep("processing");
    setProgress(10);

    let progressInterval;

    try {
      // Simuler la progression pour l'UX
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Vérifier si l'utilisateur a tout sélectionné (cas spécial pour l'ancienne fonction)
      const isFullReset = checks.transactions && checks.earnings && checks.tickets && checks.balances;

      // Si l'utilisateur a tout sélectionné, on peut utiliser l'ancienne fonction
      if (isFullReset) {
        console.log("Réinitialisation complète demandée - utilisation de l'ancienne fonction");
        
        const { error } = await supabase.rpc("reset_transactional_data", {
          p_admin_id: user.id,
        });
        
        if (error) {
          // Si l'ancienne fonction échoue aussi
          if (error.message.includes("function") || error.code === '42703') {
            throw new Error("Aucune fonction de réinitialisation n'est disponible. Contactez l'administrateur pour configurer les fonctions RPC.");
          }
          throw error;
        }
      } else {
        // Réinitialisation sélective - essayer d'abord la nouvelle fonction
        console.log("Réinitialisation sélective demandée");
        
        const resetParams = {
          p_admin_id: user.id,
          p_reset_transactions: checks.transactions,
          p_reset_earnings: checks.earnings,
          p_reset_tickets: checks.tickets,
          p_reset_balances: checks.balances,
        };

        console.log("Envoi des paramètres de réinitialisation:", resetParams);

        const { error } = await supabase.rpc("reset_transactional_data_with_options", resetParams);

        if (error) {
          // Si la fonction avec options n'existe pas, on ne peut pas continuer
          if (error.message.includes("function") || error.code === '42703') {
            throw new Error("La fonction de réinitialisation sélective n'est pas disponible. Contactez l'administrateur pour activer cette fonctionnalité.");
          }
          throw error;
        }
      }

      clearInterval(progressInterval);
      setProgress(100);

      // Message personnalisé en fonction des actions
      let actionDescription = "";
      if (checks.transactions && checks.earnings && checks.tickets && checks.balances) {
        actionDescription = "Toutes les données transactionnelles ont été réinitialisées.";
      } else {
        const actions = [];
        if (checks.transactions) actions.push("transactions et historiques");
        if (checks.earnings) actions.push("revenus organisateurs");
        if (checks.tickets) actions.push("tickets, votes et participations");
        if (checks.balances) actions.push("soldes de pièces");
        actionDescription = `Les données suivantes ont été réinitialisées: ${actions.join(", ")}.`;
      }

      setStep("success");
      
      toast({
        title: "Réinitialisation réussie",
        description: actionDescription,
        variant: "success",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erreur de réinitialisation:", error);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setStep("warning");
      setProgress(0);
      
      // Message d'erreur plus clair
      let errorMessage = error.message || "Impossible de réinitialiser les données.";
      
      // Ajouter une suggestion si la fonction sélective n'est pas disponible
      if (error.message.includes("fonction de réinitialisation sélective")) {
        errorMessage += " Vous pouvez essayer de réinitialiser toutes les données à la place.";
      }
      
      toast({
        title: "Erreur de réinitialisation",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setStep("warning");
    setProgress(0);
    setConfirmText("");
    setSelectedAction("all");
    setChecks({
      transactions: false,
      earnings: false,
      tickets: false,
      balances: false,
      irreversible: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isLoading && resetState()}>
      <DialogContent className="sm:max-w-[600px] border-destructive/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6" />
            Réinitialisation Sélective des Données
          </DialogTitle>
          <DialogDescription className="text-base">
            Sélectionnez les catégories à réinitialiser. Cette action est destructrice mais conserve les comptes utilisateurs et les événements créés.
          </DialogDescription>
        </DialogHeader>

        {step === "warning" && (
          <div className="space-y-6 py-4">
            {/* Sélecteur rapide d'actions */}
            <div className="space-y-3">
              <Label className="text-muted-foreground">Sélection rapide :</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button
                  type="button"
                  variant={selectedAction === "all" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleSelectAction("all")}
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  Tout
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === "transactions" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleSelectAction("transactions")}
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  Transactions
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === "earnings" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleSelectAction("earnings")}
                  className="flex items-center gap-2"
                >
                  <Coins className="h-4 w-4" />
                  Revenus
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === "tickets" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleSelectAction("tickets")}
                  className="flex items-center gap-2"
                >
                  <Ticket className="h-4 w-4" />
                  Tickets
                </Button>
                <Button
                  type="button"
                  variant={selectedAction === "balances" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleSelectAction("balances")}
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  Soldes
                </Button>
              </div>
            </div>

            {/* Cases à cocher détaillées */}
            <div className="space-y-4 border p-4 rounded-lg bg-destructive/5 border-destructive/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={allChecked}
                    onCheckedChange={(checked) => toggleAll(checked)}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someChecked;
                      }
                    }}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer font-bold">
                    Sélectionner tout
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(!allChecked)}
                  className="h-auto p-0 text-xs"
                >
                  {allChecked ? "Tout désélectionner" : "Tout sélectionner"}
                </Button>
              </div>

              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="transactions"
                    checked={checks.transactions}
                    onCheckedChange={() => handleCheck("transactions")}
                  />
                  <div className="flex-1">
                    <Label htmlFor="transactions" className="cursor-pointer font-medium">
                      Supprimer toutes les transactions et historiques
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Efface l'historique des crédits, paiements, et activités transactionnelles.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="earnings"
                    checked={checks.earnings}
                    onCheckedChange={() => handleCheck("earnings")}
                  />
                  <div className="flex-1">
                    <Label htmlFor="earnings" className="cursor-pointer font-medium">
                      Remettre à zéro tous les revenus organisateurs
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Réinitialise les gains, commissions et revenus des administrateurs et organisateurs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tickets"
                    checked={checks.tickets}
                    onCheckedChange={() => handleCheck("tickets")}
                  />
                  <div className="flex-1">
                    <Label htmlFor="tickets" className="cursor-pointer font-medium">
                      Supprimer tous les tickets, votes et participations
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Efface les tickets d'événements, votes, et participations aux concours.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="balances"
                    checked={checks.balances}
                    onCheckedChange={() => handleCheck("balances")}
                  />
                  <div className="flex-1">
                    <Label htmlFor="balances" className="cursor-pointer font-medium">
                      Réinitialiser les soldes de pièces de tous les utilisateurs
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Remet à zéro les portefeuilles et soldes en pièces de tous les utilisateurs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note importante sur la disponibilité des fonctions */}
            <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
              <p className="text-sm font-medium text-amber-800 mb-1">
                <span className="font-bold">Note importante :</span> La réinitialisation sélective nécessite que la fonction RPC correspondante soit configurée dans la base de données.
              </p>
              <p className="text-sm text-amber-700">
                Si vous obtenez une erreur, essayez de sélectionner "Tout" pour utiliser la fonction de réinitialisation complète.
              </p>
            </div>

            {/* Confirmation irréversible */}
            <div className="border border-destructive rounded-lg p-4 bg-destructive/10">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="irreversible"
                  checked={checks.irreversible}
                  onCheckedChange={() => handleCheck("irreversible")}
                  className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="irreversible" className="cursor-pointer font-bold text-destructive">
                    Je comprends que cette action est irréversible
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les données supprimées ne pourront pas être récupérées. Cette action impacte directement la production.
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation par texte */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Pour confirmer, écrivez <strong>SUPPRIMER</strong> ci-dessous :
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                className="border-destructive focus-visible:ring-destructive uppercase"
                placeholder="SUPPRIMER"
              />
              {!isConfirmTextValid && confirmText && (
                <p className="text-sm text-destructive">
                  Vous devez écrire exactement "SUPPRIMER"
                </p>
              )}
            </div>

            {/* Résumé des actions */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium mb-2">Résumé des actions sélectionnées :</p>
              <ul className="text-sm space-y-1">
                {checks.transactions && <li className="flex items-center gap-2"><div className="w-2 h-2 bg-destructive rounded-full"></div>Suppression des transactions et historiques</li>}
                {checks.earnings && <li className="flex items-center gap-2"><div className="w-2 h-2 bg-destructive rounded-full"></div>Réinitialisation des revenus organisateurs</li>}
                {checks.tickets && <li className="flex items-center gap-2"><div className="w-2 h-2 bg-destructive rounded-full"></div>Suppression des tickets, votes et participations</li>}
                {checks.balances && <li className="flex items-center gap-2"><div className="w-2 h-2 bg-destructive rounded-full"></div>Réinitialisation des soldes de pièces</li>}
                {!hasActionSelected && <li className="text-muted-foreground italic">Aucune action sélectionnée</li>}
              </ul>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
              <div className="absolute inset-0 border-4 border-destructive rounded-full border-t-transparent animate-spin"></div>
              <span className="font-bold text-lg">{progress}%</span>
            </div>
            <p className="text-muted-foreground animate-pulse text-center">
              {checks.transactions && checks.earnings && checks.tickets && checks.balances
                ? "Nettoyage complet de la base de données en cours..."
                : "Réinitialisation sélective en cours..."}
            </p>
            {!checks.transactions || !checks.earnings || !checks.tickets || !checks.balances ? (
              <p className="text-xs text-amber-600 text-center">
                Utilisation de la fonction de réinitialisation sélective...
              </p>
            ) : null}
          </div>
        )}

        {step === "success" && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-700">
              Opération terminée !
            </h3>
            <p className="text-muted-foreground max-w-[300px]">
              {checks.transactions && checks.earnings && checks.tickets && checks.balances
                ? "La base de données a été nettoyée. Les événements et utilisateurs sont conservés, mais toutes les données transactionnelles ont été effacées."
                : "La réinitialisation sélective a été effectuée avec succès. Seules les données sélectionnées ont été affectées."}
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-between gap-2">
          {step === "warning" ? (
            <>
              <Button 
                variant="outline" 
                onClick={resetState}
                className="border-muted-foreground/30"
              >
                Annuler
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={!canReset}
                  onClick={handleReset}
                  className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto min-w-[180px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : checks.transactions && checks.earnings && checks.tickets && checks.balances ? (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Tout Réinitialiser
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Réinitialiser Sélection
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : step === "success" ? (
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={resetState}
            >
              Fermer
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetDataModal;





// import React, { useState } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { AlertTriangle, Loader2, Trash2, CheckCircle2, ListChecks } from "lucide-react";
// import { supabase } from '@/lib/customSupabaseClient';
// import { useToast } from "@/components/ui/use-toast";
// import { useAuth } from '@/contexts/SupabaseAuthContext';
// import { Card } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';

// const ResetDataModal = ({ open, onOpenChange, onSuccess }) => {
//   const { user } = useAuth();
//   const { toast } = useToast();
//   const [isLoading, setIsLoading] = useState(false);
//   const [confirmText, setConfirmText] = useState("");
//   const [progress, setProgress] = useState(0);
//   const [step, setStep] = useState('selection'); // selection, confirmation, processing, success
  
//   const [options, setOptions] = useState({
//     transactions: false,
//     revenues: false,
//     tickets: false,
//     balances: false
//   });

//   const [deleteCounts, setDeleteCounts] = useState(null);

//   const resetState = () => {
//     setStep('selection');
//     setProgress(0);
//     setConfirmText("");
//     setOptions({
//       transactions: false,
//       revenues: false,
//       tickets: false,
//       balances: false
//     });
//     setDeleteCounts(null);
//     onOpenChange(false);
//   };

//   const handleOptionChange = (key) => {
//     setOptions(prev => ({ ...prev, [key]: !prev[key] }));
//   };

//   const toggleSelectAll = () => {
//     const allSelected = Object.values(options).every(Boolean);
//     setOptions({
//       transactions: !allSelected,
//       revenues: !allSelected,
//       tickets: !allSelected,
//       balances: !allSelected
//     });
//   };

//   const selectedCount = Object.values(options).filter(Boolean).length;
//   const isConfirmTextValid = confirmText === "SUPPRIMER";

//   const handleInitiateReset = () => {
//     if (selectedCount === 0) return;
//     setStep('confirmation');
//   };

//   const handleReset = async () => {
//     if (!user) return;
    
//     console.log("Reset initiated:", options);
//     setIsLoading(true);
//     setStep('processing');
//     setProgress(10);

//     try {
//       // Simulate progress for UX
//       const interval = setInterval(() => {
//         setProgress(prev => (prev >= 90 ? 90 : prev + 10));
//       }, 300);

//       const { data, error } = await supabase.rpc('reset_selective_data', {
//         p_admin_id: user.id,
//         p_reset_transactions: options.transactions,
//         p_reset_revenues: options.revenues,
//         p_reset_tickets: options.tickets,
//         p_reset_balances: options.balances
//       });

//       clearInterval(interval);
//       setProgress(100);

//       if (error) throw error;
//       if (data && !data.success) throw new Error(data.message);

//       console.log("Reset completed successfully", data);
//       if (data.counts) {
//         console.log("Transactions deleted:", data.counts.transactions);
//         console.log("Revenues reset:", data.counts.revenues);
//         console.log("Tickets deleted:", data.counts.tickets);
//         console.log("Balances reset:", data.counts.balances);
//         setDeleteCounts(data.counts);
//       }

//       setStep('success');
//       toast({
//         title: "Réinitialisation réussie",
//         description: "Les données sélectionnées ont été supprimées.",
//         variant: "success"
//       });
      
//       if (onSuccess) onSuccess();

//     } catch (error) {
//       console.error("Reset error:", error);
//       setStep('selection');
//       setProgress(0);
//       toast({
//         title: "Erreur critique",
//         description: error.message || "Impossible de réinitialiser les données.",
//         variant: "destructive"
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const getSummaryText = () => {
//     const parts = [];
//     if (options.tickets) parts.push("Billets & Participations");
//     if (options.revenues) parts.push("Revenus & Gains");
//     if (options.transactions) parts.push("Historique Transactions");
//     if (options.balances) parts.push("Soldes Utilisateurs");
//     return parts;
//   };

//   return (
//     <Dialog open={open} onOpenChange={(val) => !isLoading && (val ? null : resetState())}>
//       <DialogContent className="sm:max-w-[550px] border-destructive/20">
//         <DialogHeader>
//           <DialogTitle className="text-destructive flex items-center gap-2 text-xl">
//             <AlertTriangle className="h-6 w-6" />
//             Nettoyage Sélectif des Données
//           </DialogTitle>
//           <DialogDescription className="text-base">
//             Sélectionnez les catégories de données à supprimer définitivement. 
//             Cette action est <strong className="text-destructive">IRRÉVERSIBLE</strong>.
//           </DialogDescription>
//         </DialogHeader>

//         {step === 'selection' && (
//           <div className="space-y-6 py-2">
//             <div className="flex justify-between items-center border-b pb-2">
//               <span className="text-sm font-medium text-muted-foreground">{selectedCount} catégories sélectionnées</span>
//               <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8 text-xs">
//                 <ListChecks className="w-3 h-3 mr-2" />
//                 {selectedCount === 4 ? "Tout désélectionner" : "Tout sélectionner"}
//               </Button>
//             </div>

//             <div className="grid grid-cols-1 gap-3">
//               <Card className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-accent/50 ${options.tickets ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`} onClick={() => handleOptionChange('tickets')}>
//                 <div className="flex items-start space-x-3">
//                   <Checkbox checked={options.tickets} onCheckedChange={() => handleOptionChange('tickets')} />
//                   <div>
//                     <Label className="font-bold cursor-pointer">Billets, Votes & Participations</Label>
//                     <p className="text-xs text-muted-foreground mt-1">Supprime tous les tickets, scans, votes, participations et remet à zéro les compteurs d'événements.</p>
//                   </div>
//                 </div>
//               </Card>

//               <Card className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-accent/50 ${options.revenues ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`} onClick={() => handleOptionChange('revenues')}>
//                 <div className="flex items-start space-x-3">
//                   <Checkbox checked={options.revenues} onCheckedChange={() => handleOptionChange('revenues')} />
//                   <div>
//                     <Label className="font-bold cursor-pointer">Revenus & Gains</Label>
//                     <p className="text-xs text-muted-foreground mt-1">Supprime l'historique des gains organisateurs, les demandes de retrait et les commissions admin.</p>
//                   </div>
//                 </div>
//               </Card>

//               <Card className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-accent/50 ${options.transactions ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`} onClick={() => handleOptionChange('transactions')}>
//                 <div className="flex items-start space-x-3">
//                   <Checkbox checked={options.transactions} onCheckedChange={() => handleOptionChange('transactions')} />
//                   <div>
//                     <Label className="font-bold cursor-pointer">Historique des Transactions</Label>
//                     <p className="text-xs text-muted-foreground mt-1">Supprime toutes les traces d'achats de pièces, transferts et dépenses dans les logs.</p>
//                   </div>
//                 </div>
//               </Card>

//               <Card className={`p-4 border-l-4 cursor-pointer transition-all hover:bg-accent/50 ${options.balances ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`} onClick={() => handleOptionChange('balances')}>
//                 <div className="flex items-start space-x-3">
//                   <Checkbox checked={options.balances} onCheckedChange={() => handleOptionChange('balances')} />
//                   <div>
//                     <Label className="font-bold cursor-pointer">Soldes & Portefeuilles</Label>
//                     <p className="text-xs text-muted-foreground mt-1">Remet à zéro tous les soldes de pièces utilisateurs et les portefeuilles organisateurs.</p>
//                   </div>
//                 </div>
//               </Card>
//             </div>
//           </div>
//         )}

//         {step === 'confirmation' && (
//           <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-4">
//             <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
//               <h4 className="font-bold text-destructive flex items-center gap-2 mb-2">
//                 <AlertTriangle className="w-5 h-5" /> Attention Action Destructrice
//               </h4>
//               <p className="text-sm mb-2">Vous êtes sur le point de supprimer définitivement :</p>
//               <ul className="list-disc list-inside text-sm space-y-1 mb-4 font-medium">
//                 {getSummaryText().map((text, i) => (
//                   <li key={i}>{text}</li>
//                 ))}
//               </ul>
//               <p className="text-xs text-muted-foreground">Les utilisateurs et les événements eux-mêmes ne seront PAS supprimés, seules leurs données associées le seront.</p>
//             </div>

//             <div className="space-y-2">
//               <Label className="text-foreground font-semibold">
//                 Pour confirmer, écrivez <span className="text-destructive font-black">SUPPRIMER</span> ci-dessous :
//               </Label>
//               <Input 
//                 value={confirmText}
//                 onChange={(e) => setConfirmText(e.target.value)}
//                 className="border-destructive focus-visible:ring-destructive font-mono tracking-wider"
//                 placeholder="SUPPRIMER"
//                 autoFocus
//               />
//             </div>
//           </div>
//         )}

//         {step === 'processing' && (
//           <div className="py-12 flex flex-col items-center justify-center space-y-6">
//             <div className="relative w-24 h-24 flex items-center justify-center">
//               <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
//               <div 
//                 className="absolute inset-0 border-4 border-destructive rounded-full border-t-transparent animate-spin"
//                 style={{ animationDuration: '1s' }}
//               ></div>
//               <span className="font-bold text-xl">{progress}%</span>
//             </div>
//             <div className="text-center space-y-2">
//               <h3 className="text-lg font-semibold">Nettoyage en cours...</h3>
//               <p className="text-sm text-muted-foreground">Veuillez ne pas fermer cette fenêtre.</p>
//             </div>
//           </div>
//         )}

//         {step === 'success' && (
//           <div className="py-8 flex flex-col items-center justify-center space-y-6 text-center animate-in zoom-in-95 duration-300">
//             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-lg">
//               <CheckCircle2 className="w-12 h-12 text-green-600" />
//             </div>
//             <div className="space-y-2">
//               <h3 className="text-2xl font-bold text-green-700">Nettoyage Terminé !</h3>
//               <p className="text-muted-foreground">La base de données a été mise à jour avec succès.</p>
//             </div>
            
//             {deleteCounts && (
//               <div className="grid grid-cols-2 gap-3 w-full bg-muted/30 p-4 rounded-lg text-sm">
//                 <div className="flex justify-between"><span>Transactions:</span> <Badge variant="outline">{deleteCounts.transactions || 0}</Badge></div>
//                 <div className="flex justify-between"><span>Revenus:</span> <Badge variant="outline">{deleteCounts.revenues || 0}</Badge></div>
//                 <div className="flex justify-between"><span>Tickets:</span> <Badge variant="outline">{deleteCounts.tickets || 0}</Badge></div>
//                 <div className="flex justify-between"><span>Comptes Reset:</span> <Badge variant="outline">{deleteCounts.balances || 0}</Badge></div>
//               </div>
//             )}
//           </div>
//         )}

//         <DialogFooter className="sm:justify-between gap-2 pt-4 border-t mt-2">
//           {step === 'selection' ? (
//             <>
//               <Button variant="outline" onClick={resetState}>Annuler</Button>
//               <Button 
//                 variant="default" 
//                 disabled={selectedCount === 0}
//                 onClick={handleInitiateReset}
//                 className="w-full sm:w-auto"
//               >
//                 Continuer ({selectedCount})
//               </Button>
//             </>
//           ) : step === 'confirmation' ? (
//             <>
//               <Button variant="outline" onClick={() => setStep('selection')}>Retour</Button>
//               <Button 
//                 variant="destructive" 
//                 disabled={!isConfirmTextValid}
//                 onClick={handleReset}
//                 className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all"
//               >
//                 <Trash2 className="w-4 h-4 mr-2" />
//                 Confirmer la suppression
//               </Button>
//             </>
//           ) : step === 'success' ? (
//             <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={resetState}>
//               Fermer et Actualiser
//             </Button>
//           ) : null}
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default ResetDataModal;