import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronsRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WalletInfoModal = ({ isOpen, onClose, onProceed }) => {
  const navigate = useNavigate();

  const handleRecharge = () => {
    onClose();
    if (onProceed) {
        onProceed();
    } else {
        navigate('/packs');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-effect text-foreground">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-yellow-400" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">Solde de Pièces Insuffisant</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground pt-2">
            Oups ! Il semble que vous n'ayez pas assez de pièces pour effectuer cette action.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          <p>
            Veuillez recharger votre compte pour continuer. C'est simple et rapide !
          </p>
           <p> cliquer sur Recharger mon compte 
          </p>
           
        </div>
        <DialogFooter className="flex-col sm:flex-col sm:space-y-2">
          <Button onClick={handleRecharge} className="w-full gradient-gold text-background">
            Recharger mon compte <ChevronsRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WalletInfoModal;