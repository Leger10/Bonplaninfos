import React, { useState, useEffect } from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { toast } from '@/components/ui/use-toast';
    import { Search, Download, ArrowUp, ArrowDown, Coins, Loader2 } from 'lucide-react';
    import { Badge } from '@/components/ui/badge';
    import { exportToExcel } from '@/lib/exportToExcel';

    const TransactionsTable = ({ transactions: initialTransactions }) => {
      const [transactions, setTransactions] = useState([]);
      const [filteredTransactions, setFilteredTransactions] = useState([]);
      const [typeFilter, setTypeFilter] = useState('all');
      const [searchTerm, setSearchTerm] = useState('');
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        if(initialTransactions) {
            setTransactions(initialTransactions);
            setFilteredTransactions(initialTransactions);
            setLoading(false);
        }
      }, [initialTransactions]);

      useEffect(() => {
        let filtered = transactions || [];

        if (searchTerm) {
          const lowercasedTerm = searchTerm.toLowerCase();
          filtered = filtered.filter(transaction =>
            transaction.user_full_name?.toLowerCase().includes(lowercasedTerm) ||
            transaction.user_email?.toLowerCase().includes(lowercasedTerm) ||
            transaction.description?.toLowerCase().includes(lowercasedTerm) ||
            transaction.id.toString().includes(searchTerm)
          );
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(transaction => transaction.type === typeFilter);
        }
        setFilteredTransactions(filtered);
      }, [transactions, searchTerm, typeFilter]);

      const getTransactionIcon = (amount) => {
        // For coin_spending, a positive amount is a debit, negative is a credit.
        return amount > 0 ? <ArrowUp className="w-4 h-4 text-red-400" /> : <ArrowDown className="w-4 h-4 text-green-400" />;
      };

      const getTransactionColor = (amount) => {
        return amount > 0 ? 'text-red-400' : 'text-green-400';
      };
      
      const handleExport = () => {
        if (filteredTransactions.length === 0) {
          toast({ title: 'Aucune donnée à exporter', variant: 'destructive' });
          return;
        }

        const dataToExport = filteredTransactions.map(t => ({
            id: t.id,
            user_full_name: t.user_full_name,
            user_email: t.user_email,
            description: t.description,
            amount: t.amount,
            type: t.type,
            created_at: new Date(t.created_at).toLocaleString('fr-FR'),
            status: t.status,
        }));
        
        const headers = [
            { label: 'ID', key: 'id' },
            { label: 'Utilisateur', key: 'user_full_name' },
            { label: 'Email', key: 'user_email' },
            { label: 'Description', key: 'description' },
            { label: 'Montant (pièces)', key: 'amount' },
            { label: 'Type', key: 'type' },
            { label: 'Date', key: 'created_at' },
            { label: 'Statut', key: 'status' },
        ];

        exportToExcel({
            data: dataToExport,
            headers: headers,
            sheetName: 'Transactions',
            fileName: 'export_transactions.xlsx',
        });
        toast({ title: "Exportation réussie", description: "Le fichier Excel a été téléchargé." });
      };

      return (
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="text-white">💳 Transactions de Pièces</CardTitle>
             <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Tous les types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="manual_credit">Crédit (Manuel)</SelectItem>
                  <SelectItem value="raffle_ticket">Ticket Tombola</SelectItem>
                  <SelectItem value="vote">Vote</SelectItem>
                  <SelectItem value="ticket_purchase">Achat Ticket</SelectItem>
                  <SelectItem value="stand_rental">Location Stand</SelectItem>
                  <SelectItem value="event_access">Accès Événement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-400 uppercase bg-background/50">
                    <tr>
                        <th className="px-6 py-3 text-left">Transaction</th>
                        <th className="px-6 py-3 text-left">Utilisateur</th>
                        <th className="px-6 py-3 text-left">Description</th>
                        <th className="px-6 py-3 text-left">Montant</th>
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-left">Statut</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.amount)}
                            <span className="text-sm font-mono text-white">...{transaction.id.substring(transaction.id.length - 8)}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-white">{transaction.user_full_name}</p>
                            <p className="text-sm text-gray-400">{transaction.user_email}</p>
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-white">{transaction.description || transaction.type}</p>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                             <span className={`${getTransactionColor(transaction.amount)} font-bold`}>{transaction.amount > 0 ? `-${transaction.amount}` : `+${Math.abs(transaction.amount)}`}</span>
                            <Coins className="w-4 h-4 text-primary" />
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-white">{new Date(transaction.created_at).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-400">{new Date(transaction.created_at).toLocaleTimeString()}</p>
                        </td>
                        <td className="px-6 py-4">
                            <Badge variant={
                            transaction.status === 'completed' ? 'success'
                            : transaction.status === 'pending' ? 'warning'
                            : 'destructive'
                            }>
                            {transaction.status}
                            </Badge>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
          </CardContent>
        </Card>
      );
    };

    export default TransactionsTable;