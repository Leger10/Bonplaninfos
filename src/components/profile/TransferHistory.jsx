import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Loader2, AlertCircle, Percent } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';

const TransferHistory = ({ refreshTrigger }) => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user, refreshTrigger]);

    const fetchHistory = async () => {
        try {
            // Récupérer les transactions de type transfert de gains et frais
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .in('transaction_type', ['earnings_transfer_to_wallet', 'platform_fee'])
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching transfer history:', error);
        } finally {
            setLoading(false);
        }
    };

    // Formater les nombres avec séparateurs de milliers
    const formatNumber = (num) => {
        return new Intl.NumberFormat('fr-FR').format(num || 0);
    };

    // Formater la date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'success':
                return <Badge className="bg-green-500">Complété</Badge>;
            case 'pending':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600">En attente</Badge>;
            case 'failed':
            case 'error':
                return <Badge variant="destructive">Échoué</Badge>;
            default:
                return <Badge variant="secondary">{status || 'Inconnu'}</Badge>;
        }
    };

    if (loading) {
        return (
            <Card className="mt-8 shadow-sm border-t-4 border-t-indigo-500">
                <CardContent className="flex justify-center items-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (history.length === 0) {
        return (
            <Card className="mt-8 shadow-sm border-t-4 border-t-indigo-500">
                <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                        Historique des transferts et frais
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 px-4">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">Aucun historique de transfert</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Vos futurs transferts vers votre portefeuille apparaîtront ici.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mt-8 shadow-sm border-t-4 border-t-indigo-500">
            <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                    Historique des transferts et frais
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {history.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Montant (π)</TableHead>
                                    <TableHead className="text-right">Montant (FCFA)</TableHead>
                                    <TableHead className="text-center">Statut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((tx) => {
                                    const isFee = tx.transaction_type === 'platform_fee';
                                    const amountPi = Number(tx.amount_pi || 0);
                                    // 1 pièce = 10 FCFA (au lieu de 100)
                                    const amountFcfa = amountPi * COIN_TO_FCFA_RATE;
                                    const isPositive = amountPi > 0;
                                    
                                    const amountColor = isPositive 
                                        ? (isFee ? 'text-red-600' : 'text-green-600')
                                        : 'text-red-600';
                                    const sign = isPositive ? '+' : '';

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell className="whitespace-nowrap text-sm text-gray-600">
                                                {formatDate(tx.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {isFee ? (
                                                        <Percent className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <ArrowRightLeft className="w-4 h-4 text-green-500" />
                                                    )}
                                                    <span className="font-medium text-sm">
                                                        {isFee ? 'Frais' : 'Transfert'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[200px] truncate" title={tx.description}>
                                                {tx.description || (isFee ? 'Frais de plateforme' : 'Transfert vers portefeuille')}
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${amountColor}`}>
                                                {sign}{formatNumber(amountPi)} π
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${amountColor}`}>
                                                {sign}{formatNumber(amountFcfa)} F
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(tx.status)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8 px-4">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">Aucun historique de transfert</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Vos futurs transferts vers votre portefeuille apparaîtront ici.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TransferHistory;