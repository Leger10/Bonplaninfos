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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Coins, CheckCircle2, Clock } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const EarningsDetailsModal = ({ isOpen, onClose, category, transactions = [] }) => {
  const categoryLabels = {
    raffle: 'Tombolas',
    vote: 'Votes',
    ticket: 'Billetterie',
    stand: 'Stands'
  };

  const getStatusBadge = (status) => {
    if (status === 'pending') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Transféré</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Détails - {categoryLabels[category] || category}
          </DialogTitle>
          <DialogDescription>
            Historique des gains en attente pour cette catégorie.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-4 p-3 bg-muted/50 rounded-lg border">
            <span className="text-sm font-medium text-muted-foreground">Total en attente</span>
            <span className="text-xl font-bold text-primary">
              {transactions.reduce((sum, t) => sum + (t.amount || 0), 0)} π
            </span>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-accent/5 transition-colors">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                                {item.source || 'Transaction'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {item.date ? format(new Date(item.date), 'dd MMM yyyy HH:mm', { locale: fr }) : 'Date inconnue'}
                        </div>
                    </div>
                    <div className="text-right space-y-1">
                        <div className="font-bold text-primary">+{item.amount} π</div>
                        {getStatusBadge(item.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucune transaction en attente pour cette catégorie.
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="w-full">Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EarningsDetailsModal;