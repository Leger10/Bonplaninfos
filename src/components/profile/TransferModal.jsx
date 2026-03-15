import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Wallet, 
  ArrowRight,
  Percent,
  Calculator,
  Shield,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const TransferModal = ({ isOpen, onClose, totalAmount, totalNetAmount, loading, onConfirm }) => {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [showFeesInfo, setShowFeesInfo] = useState(false);
  
  const PLATFORM_FEE_PERCENT = 5;
  
  const platformFee = Math.ceil(totalAmount * (PLATFORM_FEE_PERCENT / 100));
  const netAmount = totalNetAmount || Math.floor(totalAmount - platformFee);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md mx-2 sm:mx-0 p-3 sm:p-6 rounded-lg sm:rounded-xl">
        <DialogHeader className="px-1 sm:px-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            {t('transferModal.title')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t('transferModal.description', { percent: PLATFORM_FEE_PERCENT })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 sm:py-4 space-y-3 sm:space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 sm:p-6 rounded-xl border border-primary/20 text-center space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground uppercase font-semibold tracking-wider">
              {t('transferModal.netAmount')}
            </p>
            <div className="flex items-center justify-center">
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary">
                {netAmount}
              </span>
              <span className="text-lg sm:text-2xl text-muted-foreground ml-2">pièces</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('transferModal.afterFees')}
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full flex items-center justify-between text-sm sm:text-base"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              {showDetails ? t('transferModal.hideDetails') : t('transferModal.showDetails')}
            </span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          
          {showDetails && (
            <div className="pt-3 space-y-2 animate-in fade-in-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 sm:p-3 bg-green-50 text-green-800 rounded-lg border border-green-100 text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{t('transferModal.details.gross')}</span>
                  </span>
                  <span className="font-bold text-sm sm:text-base">+{totalAmount}</span>
                </div>
                
                <div className="flex items-center justify-between p-2 sm:p-3 bg-red-50 text-red-800 rounded-lg border border-red-100 text-sm">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="whitespace-nowrap">{t('transferModal.details.fee', { percent: PLATFORM_FEE_PERCENT })}</span>
                  </span>
                  <span className="font-bold text-sm sm:text-base">-{platformFee}</span>
                </div>

                <Separator className="my-1 sm:my-2" />

                <div className="flex items-center justify-between p-3 sm:p-4 bg-primary/10 text-primary font-bold rounded-lg border border-primary/20 text-sm sm:text-base">
                  <span className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{t('transferModal.details.net')}</span>
                  </span>
                  <span className="text-sm sm:text-lg">+{netAmount} pièces</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <button 
                onClick={() => setShowFeesInfo(!showFeesInfo)}
                className="text-xs sm:text-sm text-muted-foreground text-left hover:text-foreground transition-colors"
              >
                {t('transferModal.feeInfo.button')} {showFeesInfo ? t('transferModal.feeInfo.hide') : t('transferModal.feeInfo.show')}
              </button>
              
              {showFeesInfo && (
                <Alert className="mt-2 bg-blue-50 border-blue-100 text-blue-800 text-xs sm:text-sm animate-in fade-in-50">
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1">
                      <li className="leading-tight">{t('transferModal.feeInfo.content.line1', { percent: PLATFORM_FEE_PERCENT })}</li>
                      <li className="leading-tight">{t('transferModal.feeInfo.content.line2', { amount: netAmount })}</li>
                      <li className="leading-tight">{t('transferModal.feeInfo.content.line3')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-1 sm:gap-2">
              <div className="text-muted-foreground">{t('transferModal.summary.gross')}:</div>
              <div className="text-right font-medium">{totalAmount} pièces</div>
              
              <div className="text-muted-foreground">{t('transferModal.summary.fee')}:</div>
              <div className="text-right font-medium text-red-600">-{platformFee} pièces</div>
              
              <div className="col-span-2 border-t border-gray-300 pt-1 mt-1">
                <div className="flex justify-between font-bold">
                  <div>{t('transferModal.summary.net')}:</div>
                  <div className="text-green-600">+{netAmount} pièces</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="w-full sm:w-auto sm:flex-1 order-2 sm:order-1 text-sm sm:text-base py-2 sm:py-2"
            size="sm"
          >
            {t('transferModal.actions.cancel')}
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading || netAmount <= 0}
            className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto sm:flex-1 min-w-[140px] order-1 sm:order-2 text-sm sm:text-base py-2 sm:py-2"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span className="text-xs sm:text-sm">{t('transferModal.actions.processing')}</span>
              </>
            ) : (
              <>
                <span className="text-xs sm:text-sm">{t('transferModal.actions.transfer', { amount: netAmount })}</span>
                <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;