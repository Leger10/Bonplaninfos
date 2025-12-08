import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Ticket, 
  Vote, 
  Store, 
  Calendar, 
  Coins, 
  Percent,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const getCategoryIcon = (category) => {
  switch (category) {
    case 'tombolas': return Ticket;
    case 'votes': return Vote;
    case 'billetterie': return Ticket;
    case 'stands': return Store;
    default: return FileText;
  }
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'tombolas': return 'purple';
    case 'votes': return 'blue';
    case 'billetterie': return 'green';
    case 'stands': return 'orange';
    default: return 'gray';
  }
};

const EarningsDetailsModal = ({ isOpen, onClose, category, transactions = [], split95_5 = true }) => {
  const Icon = getCategoryIcon(category);
  const color = getCategoryColor(category);
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  // Safe check for transactions array to prevent crash
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const calculateTotals = () => {
    let totalBrut = 0;
    let totalNet = 0;
    let totalFees = 0;
    
    safeTransactions.forEach(transaction => {
      totalBrut += transaction.brut || transaction.amount || 0;
      totalNet += transaction.net || (transaction.amount || 0) * 0.95;
      totalFees += transaction.fees || (transaction.amount || 0) * 0.05;
    });

    return { totalBrut, totalNet, totalFees };
  };

  const totals = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            Détails des gains - {category}
            <Badge className={`ml-2 ${colorClasses[color]}`}>
              {safeTransactions.length} transaction{safeTransactions.length > 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Liste détaillée des gains en attente avec répartition 95%/5%
          </DialogDescription>
        </DialogHeader>

        {/* Totaux en en-tête */}
        {split95_5 && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded border">
                <div className="text-sm text-gray-600">Total brut</div>
                <div className="text-xl font-bold text-gray-800">{Math.floor(totals.totalBrut)} π</div>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="text-sm text-green-600">Net (95%)</div>
                <div className="text-xl font-bold text-green-700">{Math.floor(totals.totalNet)} π</div>
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <div className="text-sm text-red-600">Frais (5%)</div>
                <div className="text-xl font-bold text-red-700">{Math.floor(totals.totalFees)} π</div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des transactions */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {safeTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune transaction disponible</p>
            </div>
          ) : (
            safeTransactions.map((transaction) => (
              <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {transaction.description || `Transaction #${transaction.id.slice(0, 8)}`}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {transaction.date ? format(new Date(transaction.date), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'Date inconnue'}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    En attente
                  </Badge>
                </div>

                {split95_5 ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Montant brut :</span>
                      </div>
                      <span className="font-semibold">{transaction.brut || transaction.amount} π</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Percent className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-700">Net (95%) :</span>
                          </div>
                          <span className="font-bold text-green-700">
                            {transaction.net || Math.floor((transaction.brut || transaction.amount) * 0.95)} π
                          </span>
                        </div>
                      </div>
                      <div className="p-2 bg-red-50 rounded border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Percent className="w-3 h-3 text-red-600" />
                            <span className="text-xs text-red-700">Frais (5%) :</span>
                          </div>
                          <span className="font-bold text-red-700">
                            {transaction.fees || Math.floor((transaction.brut || transaction.amount) * 0.05)} π
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Montant :</span>
                      </div>
                      <span className="font-bold text-blue-700">{transaction.amount} π</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EarningsDetailsModal;