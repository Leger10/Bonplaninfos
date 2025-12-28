import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';

const CONTRACT_TEXT = `
CONTRAT D'ORGANISATEUR D'ÉVÉNEMENT - BONPLANINFOS

ENTRE :
La plateforme BonPlanInfos, ci-après dénommée "La Plateforme"
ET
L'Organisateur de l'événement, ci-après dénommé "L'Organisateur"

ARTICLE 1 : OBJET
Le présent contrat définit les conditions dans lesquelles l'Organisateur est autorisé à publier, promouvoir et monétiser des événements sur la Plateforme.

ARTICLE 2 : ENGAGEMENTS DE L'ORGANISATEUR
2.1 L'Organisateur certifie sur l'honneur que l'événement publié est réel, licite et conforme aux lois en vigueur.
2.2 L'Organisateur s'engage à assurer le bon déroulement de l'événement tel que décrit sur la Plateforme.
2.3 En cas d'annulation ou de modification majeure, l'Organisateur doit en informer immédiatement la Plateforme et les participants.

ARTICLE 3 : VÉRIFICATION COMMUNAUTAIRE ET RETRAITS
3.1 Pour lutter contre la fraude, la Plateforme met en place un système de "Vérification Communautaire".
3.2 Les fonds générés par l'événement (billetterie, votes, etc.) ne seront disponibles au retrait qu'après confirmation que l'événement a bien eu lieu.
3.3 Cette confirmation nécessite la validation par au moins 3 membres de la communauté présents à l'événement ou pouvant attester de sa tenue.
3.4 La Plateforme se réserve le droit de bloquer les fonds indéfiniment en cas de suspicion de fraude avérée ou d'absence de validation communautaire.

ARTICLE 4 : COMMISSIONS ET FRAIS
4.1 La Plateforme prélève une commission sur les transactions (voir grille tarifaire en vigueur).
4.2 Les frais de retrait sont à la charge de l'Organisateur.

ARTICLE 5 : RESPONSABILITÉ
L'Organisateur est seul responsable de son événement. La Plateforme agit uniquement comme intermédiaire technique et ne saurait être tenue responsable des incidents survenant lors de l'événement.

En cochant la case "J'ai lu et j'accepte", l'Organisateur reconnait avoir pris connaissance de l'intégralité de ce contrat et l'accepte sans réserve.
`;

const OrganizerContractModal = ({ open, onOpenChange, onAccept }) => {
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Check if scrolled to bottom (with small buffer)
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasReadToBottom(true);
    }
  };

  const handleAccept = () => {
    if (isAccepted && hasReadToBottom) {
      onAccept();
      onOpenChange(false);
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
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Contrat Organisateur & Conditions
          </DialogTitle>
          <DialogDescription>
            Veuillez lire attentivement les conditions avant de publier votre événement.
            Le défilement jusqu'en bas est obligatoire pour valider.
          </DialogDescription>
        </DialogHeader>

        <div 
          className="flex-1 overflow-y-auto p-4 border rounded-md bg-muted/30 text-sm leading-relaxed whitespace-pre-wrap font-mono text-justify"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          {CONTRACT_TEXT}
        </div>

        <div className="space-y-4 pt-4 border-t">
          {!hasReadToBottom && (
            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-2 rounded justify-center">
              <AlertTriangle className="h-3 w-3" />
              Veuillez faire défiler le contrat jusqu'en bas pour pouvoir l'accepter.
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="terms" 
              checked={isAccepted} 
              onCheckedChange={setIsAccepted}
              disabled={!hasReadToBottom}
            />
            <Label 
              htmlFor="terms" 
              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${!hasReadToBottom ? 'text-muted-foreground' : ''}`}
            >
              J'ai lu et j'accepte le contrat Organisateur et le processus de vérification communautaire.
            </Label>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" type="button" onClick={downloadPDF} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Télécharger PDF
            </Button>
            <Button 
              type="button" 
              onClick={handleAccept} 
              disabled={!isAccepted || !hasReadToBottom}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Signer et Publier
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizerContractModal;