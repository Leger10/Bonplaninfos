import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, ArrowRight } from "lucide-react";

const TransferModal = ({ isOpen, onClose, onConfirm, totalAmount, loading }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Demande de Transfert</DialogTitle>
          <DialogDescription>
            Transférez vos gains en attente vers votre solde disponible.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="flex flex-col items-center justify-center p-6 bg-primary/5 rounded-xl border-2 border-primary/10 border-dashed">
            <span className="text-sm font-medium text-muted-foreground mb-2">Montant à transférer</span>
            <span className="text-4xl font-bold text-primary">{totalAmount} π</span>
          </div>

          <div className="space-y-2">
            <Label>Destination du transfert</Label>
            <Select defaultValue="internal_wallet" disabled>
              <SelectTrigger>
                <SelectValue placeholder="Choisir la destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal_wallet">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Portefeuille Interne (Disponible)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Les fonds seront déplacés de "En attente" vers "Disponible" instantanément.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={loading || totalAmount <= 0} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            Confirmer le transfert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;