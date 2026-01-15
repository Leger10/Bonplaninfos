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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Wallet, ArrowRight } from "lucide-react";

const TransferModal = ({ isOpen, onClose, totalAmount, loading, onConfirm }) => {
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="w-6 h-6 text-primary" />
            Transférer vos gains
          </DialogTitle>
          <DialogDescription>
            Transférez vos gains en attente vers votre solde disponible pour pouvoir les utiliser ou les retirer.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="bg-muted/30 p-6 rounded-xl border border-border text-center space-y-2">
            <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Montant total</p>
            <div className="text-4xl font-bold text-primary">
              {totalAmount} <span className="text-2xl text-muted-foreground">pièces</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm p-3 bg-green-50 text-green-800 rounded-lg border border-green-100">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Montant Net (95%)
              </span>
              <span className="font-bold">+{Math.floor(totalAmount)} pièces</span>
            </div>
            
            <div className="flex items-center justify-between text-sm p-3 bg-red-50 text-red-800 rounded-lg border border-red-100">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Frais Plateforme (5%)
              </span>
              <span className="font-bold">-{Math.ceil(totalAmount * 0.05)} pièces</span>
            </div>
          </div>
          
          <Alert className="mt-6 bg-blue-50 border-blue-100 text-blue-800">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Note importante</AlertTitle>
            <AlertDescription className="text-xs">
              Les gains créateurs (vues & inscriptions) sont calculés et débloqués à la fin de chaque mois. Ce transfert concerne vos gains directs (billets, votes).
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading || totalAmount <= 0}
            className="bg-primary hover:bg-primary/90 text-white min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                Confirmer
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function InfoIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

export default TransferModal;