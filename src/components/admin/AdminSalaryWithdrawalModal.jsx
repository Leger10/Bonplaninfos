import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet, Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/customSupabaseClient';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AdminSalaryWithdrawalModal = ({ 
  open, 
  onOpenChange, 
  availableAmount, 
  validatedAmount = 0, 
  estimatedAmount = 0, 
  onSuccess, 
  adminId, 
  config 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [details, setDetails] = useState({ phone: '', bank_account: '', bank_name: '' });

  // Reset form on open
  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('');
      setDetails({ phone: '', bank_account: '', bank_name: '' });
    }
  }, [open]);

  const minAmount = config?.min_withdrawal_amount || 1000;
  const maxAmount = config?.max_withdrawal_amount || 500000;
  
  // Normalize methods list
  const withdrawalMethods = config?.withdrawal_methods && Array.isArray(config.withdrawal_methods) 
    ? config.withdrawal_methods 
    : ['Orange Money', 'MTN Money', 'Moov Money', 'Virement Bancaire'];

  const handleWithdraw = async () => {
    const numAmount = Number(amount);
    
    // 1. Amount Validation
    if (!amount || numAmount <= 0) {
      toast({ title: "Erreur", description: "Veuillez entrer un montant valide.", variant: "destructive" });
      return;
    }
    if (numAmount < minAmount) {
        toast({ title: "Montant insuffisant", description: `Minimum: ${minAmount.toLocaleString()} FCFA`, variant: "destructive" });
        return;
    }
    if (numAmount > maxAmount) {
        toast({ title: "Montant excessif", description: `Maximum: ${maxAmount.toLocaleString()} FCFA`, variant: "destructive" });
        return;
    }
    if (numAmount > availableAmount) {
      toast({ title: "Solde insuffisant", description: "Le montant dépasse votre solde total disponible.", variant: "destructive" });
      return;
    }

    // 2. Method Validation
    if (!method) {
        toast({ title: "Erreur", description: "Sélectionnez une méthode de paiement.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const isBank = method.toLowerCase().includes('bank') || method.toLowerCase().includes('virement') || method.toLowerCase().includes('banque');
      const isMobile = !isBank;

      // 3. Details Validation
      if (isBank && (!details.bank_name || !details.bank_account)) {
          throw new Error("Veuillez remplir les détails bancaires (Banque + Numéro).");
      }
      if (isMobile && !details.phone) {
          throw new Error("Veuillez entrer le numéro de téléphone pour le transfert.");
      }

      // 4. Create Request
      const { error } = await supabase
        .from('admin_withdrawal_requests')
        .insert({
          admin_id: adminId,
          amount_fcfa: numAmount,
          amount_pi: Math.ceil(numAmount / 10), 
          status: 'pending',
          method: method,
          mobile_money_number: isMobile ? details.phone : null,
          bank_name: isBank ? details.bank_name : null,
          account_number: isBank ? details.bank_account : null,
          requested_at: new Date().toISOString(),
          notes: `Demande partielle ou totale. Solde dispo: ${availableAmount}. Demandé: ${numAmount}.`
        });

      if (error) throw error;

      toast({
        title: "Demande envoyée !",
        description: `${numAmount.toLocaleString()} FCFA demandés via ${method}.`,
        variant: "success"
      });
      
      if (onSuccess) onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter la demande.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isBankMethod = method.toLowerCase().includes('bank') || method.toLowerCase().includes('virement') || method.toLowerCase().includes('banque');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-6 w-6 text-primary" />
            Retrait de Salaire
          </DialogTitle>
          <DialogDescription>
            Vous pouvez retirer tout ou une partie de votre solde disponible.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Information Card */}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800 py-3">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-sm font-bold ml-2">Solde Disponible: {availableAmount.toLocaleString()} FCFA</AlertTitle>
            <AlertDescription className="text-xs ml-2 opacity-90 mt-1">
              Comprend {validatedAmount.toLocaleString()} FCFA validés + {estimatedAmount.toLocaleString()} FCFA estimés.
            </AlertDescription>
          </Alert>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="font-medium">Montant à retirer (FCFA)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Entrez le montant..."
                className="pr-20 text-lg font-semibold"
              />
              <Button 
                type="button"
                variant="ghost" 
                className="absolute right-1 top-1 h-7 text-xs text-primary hover:text-primary/80"
                onClick={() => setAmount(availableAmount)}
              >
                Tout retirer
              </Button>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Min: {minAmount.toLocaleString()}</span>
              <span className={Number(amount) > availableAmount ? "text-red-500 font-bold" : ""}>
                Max: {Math.min(maxAmount, availableAmount).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Method Selection */}
          <div className="space-y-2">
            <Label className="font-medium">Méthode de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un moyen de paiement" />
              </SelectTrigger>
              <SelectContent>
                {withdrawalMethods.map((m, idx) => (
                  <SelectItem key={idx} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Details Inputs */}
          {method && (
            <div className="space-y-3 bg-muted/30 p-3 rounded-md border border-dashed border-muted-foreground/20 animate-in fade-in zoom-in-95 duration-200">
              {isBankMethod ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Nom de la banque</Label>
                    <Input 
                      className="bg-white h-9"
                      value={details.bank_name} 
                      onChange={e => setDetails({...details, bank_name: e.target.value})} 
                      placeholder="Ex: Ecobank, UBA..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">RIB / Numéro de compte</Label>
                    <Input 
                      className="bg-white h-9"
                      value={details.bank_account} 
                      onChange={e => setDetails({...details, bank_account: e.target.value})} 
                      placeholder="CI059..."
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Numéro de téléphone ({method})</Label>
                  <Input 
                    className="bg-white h-9"
                    value={details.phone} 
                    onChange={e => setDetails({...details, phone: e.target.value})} 
                    placeholder="+237..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleWithdraw} disabled={loading || !amount || !method} className="w-full sm:w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer le retrait
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminSalaryWithdrawalModal;