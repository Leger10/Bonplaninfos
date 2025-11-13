import React from 'react';
import { Coins, Package, Upload, Download, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TransactionsTab = ({ userTransactions }) => {
  
  const getTransactionDetails = (transaction) => {
    let text, icon, color, amount;

    if (transaction.transaction_type) { // From `transactions` table
      switch (transaction.transaction_type) {
        case 'earning':
          icon = Gift;
          color = 'text-green-400';
          text = transaction.description || 'Gain de pièces';
          amount = transaction.amount_pi;
          break;
        case 'manual_credit':
          icon = Download;
          color = 'text-blue-400';
          text = transaction.description || 'Crédit manuel';
          amount = transaction.amount_pi;
          break;
        case 'credit_reversal':
          icon = Upload;
          color = 'text-red-400';
          text = transaction.description || 'Annulation de crédit';
          amount = transaction.amount_pi; // Amount is already negative
          break;
        default:
          icon = Coins;
          color = 'text-gray-400';
          text = transaction.description || `Transaction`;
          amount = transaction.amount_pi;
      }
    } else if (transaction.purpose) { // From `coin_spending` table
      icon = Upload;
      color = 'text-red-400';
      text = `Dépense: ${transaction.purpose}`;
      amount = -transaction.amount;
    } else { // From `user_coin_transactions` table (purchases)
      icon = Package;
      color = 'text-blue-400';
      text = `Achat de ${transaction.total_coins} pièces`;
      amount = transaction.total_coins;
    }
    
    return { icon, color, text, amount };
  };
  
  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Historique des transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {userTransactions && userTransactions.length > 0 ? (
          <div className="space-y-4">
            {userTransactions.slice(0, 25).map((transaction) => {
              const { icon: Icon, color, text, amount } = getTransactionDetails(transaction);
              const isCredit = amount > 0;
              
              let bgColor = 'bg-red-500';
              if (color === 'text-green-400') bgColor = 'bg-green-500';
              if (color === 'text-blue-400') bgColor = 'bg-blue-500';

              return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-opacity-20 ${bgColor}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="font-medium">
                      {text}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className={`font-bold ${color}`}>
                  {isCredit ? '+' : ''}{amount} pièces
                </div>
              </div>
            );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Coins className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune transaction pour le moment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionsTab;