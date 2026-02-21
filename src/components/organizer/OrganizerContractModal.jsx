import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText, Download, CheckCircle, AlertTriangle, ArrowDownCircle, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

const CONTRACT_TEXT = `
CONTRAT D'ORGANISATEUR D'ÉVÉNEMENT - BONPLANINFOS

ENTRE :
La plateforme BonPlanInfos, ci-après dénommée "La Plateforme evenementielle intermédiaire entre vous et les participants"
ET
L'Organisateur de l'événement: vous, ci-après dénommé "L'Organisateur"

ARTICLE 1 : OBJET
Le présent contrat définit les conditions dans lesquelles l'Organisateur est autorisé à publier, promouvoir et monétiser des événements sur la Plateforme.

ARTICLE 2 : ENGAGEMENTS DE L'ORGANISATEUR
2.1 L'Organisateur certifie sur l'honneur que l'événement publié est réel, licite et conforme aux lois en vigueur de son pays.
2.2 L'Organisateur s'engage à assurer le bon déroulement de l'événement tel que décrit sur la Plateforme.
2.3 En cas d'annulation ou de modification majeure, l'Organisateur doit en informer immédiatement la Plateforme et les participants.

ARTICLE 3 : VÉRIFICATION COMMUNAUTAIRE ET RETRAITS
3.1 Pour lutter contre la fraude, la Plateforme met en place un système de "Vérification Communautaire".
3.2 Les fonds générés par l'événement (billetterie, votes, etc.) ne seront disponibles au retrait qu'après confirmation que l'événement a bien eu lieu.
3.3 Cette confirmation nécessite la validation par au moins 5 membres de la communauté présents à l'événement ou pouvant attester de sa tenue.
3.4 La Plateforme se réserve le droit de bloquer les fonds indéfiniment en cas de suspicion de fraude avérée ou d'absence de validation communautaire.

ARTICLE 4 : COMMISSIONS ET FRAIS
4.1 La Plateforme prélève une commission sur les transactions (voir grille tarifaire en vigueur).
4.2 Les frais de retrait sont à la charge de l'Organisateur.

ARTICLE 5 : RESPONSABILITÉ
L'Organisateur est seul responsable de son événement. La Plateforme agit uniquement comme intermédiaire technique et ne saurait être tenue responsable des incidents survenant lors de l'événement.

ARTICLE 6 : RÉSILIATION
La Plateforme se réserve le droit de suspendre ou de supprimer le compte d'un Organisateur en cas de non-respect des présentes conditions, sans préavis ni indemnité.

ARTICLE 7 : DROIT APPLICABLE
Le présent contrat est soumis au droit en vigueur dans le pays d'immatriculation de la Plateforme. En cas de litige, les tribunaux compétents seront seuls habilités à trancher.

En cochant la case « J’ai lu et j’accepte », je reconnais avoir pris connaissance de l’intégralité du présent contrat et l’accepter sans réserve.
`;

const OrganizerContractModal = ({ open, onOpenChange, onAccept }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const scrollRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setScrollProgress(0);
      setIsAtBottom(false);
      setIsChecked(false);
    }
  }, [open]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Calculate progress percentage
    const totalScroll = scrollHeight - clientHeight;
    const currentProgress = (scrollTop / totalScroll) * 100;
    setScrollProgress(Math.min(100, Math.max(0, currentProgress)));

    // Check if at bottom (with 10px threshold)
    const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    
    setIsAtBottom(isBottom);
    
    // If user scrolls away from bottom, hide checkbox and uncheck
    if (!isBottom && isChecked) {
      setIsChecked(false);
    }
  };

  const handleAccept = () => {
    if (isAtBottom && isChecked) {
      onAccept();
      onOpenChange(false);
      toast({
        title: "Contrat signé",
        description: "Vous avez accepté les conditions organisateur.",
        variant: "success",
        className: "bg-green-600 text-white"
      });
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Contrat Organisateur - BonPlanInfos", 20, 20);
    doc.setFontSize(10);
    
    const splitText = doc.splitTextToSize(CONTRACT_TEXT, 170);
    doc.text(splitText, 20, 40);
    
    doc.save("contrat-organisateur-bonplaninfos.pdf");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white/10 backdrop-blur-xl border-white/20 text-white shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 bg-black/40 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <FileText className="h-6 w-6 text-blue-400" />
            Contrat Organisateur
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Conditions générales d'utilisation pour les organisateurs
          </DialogDescription>
          
          {/* Progress Bar */}
          <div className="w-full mt-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider">
              <span>Progression de lecture</span>
              <span className={cn("font-bold transition-colors", isAtBottom ? "text-green-400" : "text-blue-400")}>
                {Math.round(scrollProgress)}%
              </span>
            </div>
            <Progress value={scrollProgress} className={cn("h-1.5 transition-all", isAtBottom ? "bg-gray-700" : "bg-gray-800")}>
              <div 
                className={cn("h-full transition-all duration-300", isAtBottom ? "bg-green-500" : "bg-blue-500")} 
                style={{ width: `${scrollProgress}%` }}
              />
            </Progress>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 relative bg-black/20">
          <div 
            className="absolute inset-0 overflow-y-auto p-6 text-sm leading-relaxed text-gray-300 font-mono scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
            onScroll={handleScroll}
            ref={scrollRef}
          >
            <div className="whitespace-pre-wrap pb-20">
              {CONTRACT_TEXT}
            </div>
          </div>

          {/* Floating Notice when not at bottom */}
          {!isAtBottom && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
              <div className="bg-blue-600/90 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-blue-400/30">
                <ArrowDownCircle className="w-4 h-4" />
                Veuillez lire le contrat en entier pour continuer
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={cn(
          "p-6 border-t border-white/10 transition-colors duration-500",
          isAtBottom ? "bg-green-900/20" : "bg-black/40"
        )}>
          <div className="space-y-6">
            {/* Conditional Checkbox Area */}
            <div className="h-12 flex items-center justify-center transition-all duration-300">
              {isAtBottom ? (
                <div className="flex items-center space-x-3 bg-green-500/10 p-3 rounded-lg border border-green-500/30 animate-in fade-in slide-in-from-bottom-2">
                  <Checkbox 
                    id="terms" 
                    checked={isChecked} 
                    onCheckedChange={setIsChecked}
                    className="border-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
                  />
                  <Label 
                    htmlFor="terms" 
                    className="text-sm font-medium text-green-100 cursor-pointer select-none"
                  >
                    Je certifie avoir lu et j'accepte l'intégralité du contrat
                  </Label>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500 text-sm italic">
                  <Lock className="w-4 h-4" />
                  La signature sera disponible à la fin du document
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 items-center sm:justify-between w-full">
              <Button 
                variant="outline" 
                type="button" 
                onClick={downloadPDF} 
                className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-white/10 hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger PDF
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full sm:w-auto">
                      <Button 
                        type="button" 
                        onClick={handleAccept} 
                        disabled={!isAtBottom || !isChecked}
                        className={cn(
                          "w-full sm:w-auto transition-all duration-300 shadow-lg",
                          isAtBottom && isChecked
                            ? "bg-green-600 hover:bg-green-700 text-white scale-105"
                            : "bg-gray-800 text-gray-500 cursor-not-allowed"
                        )}
                      >
                        {isAtBottom && isChecked ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approuver et Signer
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Signature en attente
                          </>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {(!isAtBottom || !isChecked) && (
                    <TooltipContent className="bg-red-900 border-red-800 text-white">
                      <p>Lisez le contrat jusqu'au bout et cochez la case pour continuer.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizerContractModal;