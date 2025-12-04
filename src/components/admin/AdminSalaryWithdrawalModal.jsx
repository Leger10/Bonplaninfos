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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet, Info, AlertCircle } from "lucide-react";
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

  const minAmount = config?.min_withdrawal_amount || 1000;
  const maxAmount = config?.max_withdrawal_amount || 500000;
  const availableMethods = config?.withdrawal_methods || ['Orange Money', 'Bank Transfer'];

  // Normalize method values for select options
  const methodOptions = Array.isArray(availableMethods) 
    ? availableMethods.map(m => ({ value: m.toLowerCase().replace(/ /g, '_'), label: m }))
    : [];

  const handleWithdraw = async () => {
    const numAmount = Number(amount);
    
    if (!amount || numAmount <= 0) {
      toast({ title: "Erreur", description: "Montant invalide", variant: "destructive" });
      return;
    }
    
    if (numAmount < minAmount) {
        toast({ title: "Erreur", description: `Le retrait minimum est de ${minAmount.toLocaleString()} FCFA`, variant: "destructive" });
        return;
    }

    if (numAmount > maxAmount) {
        toast({ title: "Erreur", description: `Le retrait maximum est de ${maxAmount.toLocaleString()} FCFA`, variant: "destructive" });
        return;
    }

    if (numAmount > availableAmount) {
      toast({ title: "Erreur", description: "Fonds insuffisants (Solde total dépassé)", variant: "destructive" });
      return;
    }

    if (!method) {
        toast({ title: "Erreur", description: "Veuillez choisir une méthode de paiement", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const isBank = method.includes('bank') || method.includes('virement');
      const isMobile = method.includes('orange') || method.includes('moov') || method.includes('mtn') || method.includes('money');

      if (isBank && (!details.bank_name || !details.bank_account)) {
          throw new Error("Veuillez remplir les détails bancaires");
      }
      if (isMobile && !details.phone) {
          throw new Error("Veuillez entrer le numéro de téléphone");
      }

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
          notes: `Retrait avec estimation incluse. Est: ${estimatedAmount} FCFA, Val: ${validatedAmount} FCFA`
        });

      if (error) throw error;

      console.log('Estimation included in withdrawal');

      toast({
        title: "Demande envoyée",
        description: "Votre demande de retrait a été enregistrée avec succès.",
        variant: "success"
      });
      
      if (onSuccess) onSuccess();
      onOpenChange(false);
      setAmount('');
      setDetails({ phone: '', bank_account: '', bank_name: '' });

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

  const isBankMethod = method.includes('bank') || method.includes('virement');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Demander un retrait
          </DialogTitle>
          <DialogDescription>
            Montant total disponible : <span className="font-bold text-primary">{availableAmount.toLocaleString()} FCFA</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Breakdown Alert */}
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-sm font-semibold ml-2">Détail du solde</AlertTitle>
            <AlertDescription className="text-xs ml-2 mt-1">
              <ul className="list-disc list-inside space-y-1">
                <li>Solde validé : <strong>{validatedAmount.toLocaleString()} FCFA</strong></li>
                <li>Estimation du mois : <strong>{estimatedAmount.toLocaleString()} FCFA</strong></li>
              </ul>
              <p className="mt-2 italic opacity-80">L'estimation du mois en cours est incluse et disponible pour retrait.</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2 mt-2">
            <Label htmlFor="amount">Montant à retirer (FCFA)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min: ${minAmount}`}
              min={minAmount}
              max={availableAmount} // User can withdraw up to total available (inc. estimation)
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {minAmount.toLocaleString()}</span>
              <span>Max: {Math.min(maxAmount, availableAmount).toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Méthode de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une méthode" />
              </SelectTrigger>
              <SelectContent>
                {methodOptions.length > 0 ? (
                    methodOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))
                ) : (
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {method && (
              isBankMethod ? (
                <>
                  <div className="space-y-2">
                    <Label>Nom de la banque</Label>
                    <Input 
                      value={details.bank_name} 
                      onChange={e => setDetails({...details, bank_name: e.target.value})} 
                      placeholder="Ex: Ecobank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro de compte / RIB</Label>
                    <Input 
                      value={details.bank_account} 
                      onChange={e => setDetails({...details, bank_account: e.target.value})} 
                      placeholder="TR34..."
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Numéro de téléphone</Label>
                  <Input 
                    value={details.phone} 
                    onChange={e => setDetails({...details, phone: e.target.value})} 
                    placeholder="+225..."
                  />
                </div>
              )
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleWithdraw} disabled={loading || !amount || !method}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminSalaryWithdrawalModal;