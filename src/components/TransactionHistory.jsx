import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, CreditCard, ArrowRightLeft } from 'lucide-react';

const TransactionHistory = ({ userId }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransactions();
    }, [userId]);

    const loadTransactions = async () => {
        if (!userId) return;
        
        try {
            // Charger les transferts de pièces
            const { data: transfers, error: transfersError } = await supabase
                .from('coin_transfers')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            // Charger les retraits
            const { data: withdrawals, error: withdrawalsError } = await supabase
                .from('withdrawals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!transfersError && !withdrawalsError) {
                // Combiner et trier toutes les transactions
                const allTransactions = [
                    ...(transfers || []).map(t => ({ ...t, type: 'transfer' })),
                    ...(withdrawals || []).map(w => ({ ...w, type: 'withdrawal' }))
                ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                setTransactions(allTransactions);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-12 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historique des Transactions</CardTitle>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>Aucune transaction pour le moment</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        transaction.type === 'transfer' ? 'bg-green-100' : 'bg-blue-100'
                                    }`}>
                                        {transaction.type === 'transfer' ? (
                                            <ArrowRightLeft className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <CreditCard className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {transaction.type === 'transfer' 
                                                ? transaction.description || 'Transfert de pièces'
                                                : `Retrait ${transaction.method}`
                                            }
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${
                                        transaction.type === 'transfer' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {transaction.type === 'transfer' ? '+' : '-'}{transaction.amount} pièces
                                    </p>
                                    {transaction.type === 'withdrawal' && (
                                        <Badge variant="outline" className={
                                            transaction.status === 'completed' ? 'bg-green-50 text-green-700' :
                                            transaction.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                                            'bg-red-50 text-red-700'
                                        }>
                                            {transaction.status === 'completed' ? 'Complété' :
                                             transaction.status === 'pending' ? 'En attente' :
                                             transaction.status}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TransactionHistory;