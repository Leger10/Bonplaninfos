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
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Wallet, 
  ArrowRight,
  Percent,
  Calculator,
  Shield
} from "lucide-react";

const TransferModal = ({ isOpen, onClose, totalAmount, totalNetAmount, loading, onConfirm }) => {
  // Constantes pour les calculs
  const PLATFORM_FEE_PERCENT = 5;
  
  // Calculs
  const platformFee = Math.ceil(totalAmount * (PLATFORM_FEE_PERCENT / 100));
  const netAmount = totalNetAmount || Math.floor(totalAmount - platformFee);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="w-6 h-6 text-primary" />
            Transférer vos gains
          </DialogTitle>
          <DialogDescription>
            Transférez vos gains en attente vers votre solde disponible. Les frais de plateforme de {PLATFORM_FEE_PERCENT}% ont déjà été déduits.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Montant brut */}
          <div className="bg-muted/30 p-6 rounded-xl border border-border text-center space-y-2">
            <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Montant total à transférer</p>
            <div className="text-4xl font-bold text-primary">
              {netAmount} <span className="text-2xl text-muted-foreground">pièces</span>
            </div>
            <p className="text-sm text-muted-foreground">(après déduction des frais)</p>
          </div>

          {/* Détails des frais */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm p-3 bg-green-50 text-green-800 rounded-lg border border-green-100">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Montant Brut</span>
              </span>
              <span className="font-bold">+{totalAmount} pièces</span>
            </div>
            
            <div className="flex items-center justify-between text-sm p-3 bg-red-50 text-red-800 rounded-lg border border-red-100">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Frais Plateforme ({PLATFORM_FEE_PERCENT}%)</span>
              </span>
              <span className="font-bold">-{platformFee} pièces</span>
            </div>

            <Separator className="my-2" />

            <div className="flex items-center justify-between text-lg p-4 bg-primary/10 text-primary font-bold rounded-lg border border-primary/20">
              <span className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                <span>Montant Net à recevoir</span>
              </span>
              <span>+{netAmount} pièces</span>
            </div>
          </div>
          
          {/* Informations importantes */}
          <Alert className="mt-6 bg-blue-50 border-blue-100 text-blue-800">
            <Shield className="h-4 w-4" />
            <AlertTitle>Comment fonctionnent les frais ?</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              <ul className="list-disc pl-4 space-y-1">
                <li>Les frais de {PLATFORM_FEE_PERCENT}% sont déjà déduits des gains en attente</li>
                <li>Le montant net affiché ({netAmount} pièces) sera crédité sur votre solde disponible</li>
                <li>Vous pouvez utiliser ce solde pour acheter ou retirer</li>
                <li>Les frais couvrent les services de la plateforme</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="mt-4 bg-amber-50 border-amber-100 text-amber-800">
            <Calculator className="h-4 w-4" />
            <AlertTitle>Résumé</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              <div className="grid grid-cols-2 gap-2">
                <div>Total brut:</div>
                <div className="text-right font-medium">{totalAmount} pièces</div>
                
                <div>Frais ({PLATFORM_FEE_PERCENT}%):</div>
                <div className="text-right font-medium text-red-600">-{platformFee} pièces</div>
                
                <div className="col-span-2 border-t border-amber-200 pt-1 mt-1">
                  <div className="flex justify-between font-bold">
                    <div>Net à recevoir:</div>
                    <div className="text-green-600">+{netAmount} pièces</div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading || netAmount <= 0}
            className="bg-primary hover:bg-primary/90 text-white flex-1 min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                Transférer {netAmount} pièces
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;