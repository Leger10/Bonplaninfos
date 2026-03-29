import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRightLeft, Loader2, AlertCircle, Percent, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';

const TransferHistory = ({ refreshTrigger }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user, refreshTrigger]);

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .in('transaction_type', ['earnings_transfer_to_wallet', 'platform_fee'])
                .order('created_at', { ascending: false })
                .limit(50); // Limite pour éviter de charger trop de données d'un coup

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching transfer history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!user) return;
        setClearing(true);
        try {
            // Appeler une RPC qui supprime les transactions de l'utilisateur
            const { data, error } = await supabase.rpc('clear_user_transfer_history', {
                p_user_id: user.id
            });
            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            toast({
                title: "Historique vidé",
                description: "Votre historique des transferts a été supprimé.",
                variant: "default",
                className: "bg-green-600 text-white",
            });
            // Recharger l'historique (qui sera maintenant vide)
            await fetchHistory();
        } catch (err) {
            console.error("Clear error:", err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de vider l'historique.",
                variant: "destructive",
            });
        } finally {
            setClearing(false);
            setClearDialogOpen(false);
        }
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('fr-FR').format(num || 0);
    };

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
                return <Badge className="bg-green-500">{t('transferHistory.status.completed')}</Badge>;
            case 'pending':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600">{t('transferHistory.status.pending')}</Badge>;
            case 'failed':
            case 'error':
                return <Badge variant="destructive">{t('transferHistory.status.failed')}</Badge>;
            default:
                return <Badge variant="secondary">{status || t('transferHistory.status.unknown')}</Badge>;
        }
    };

    if (loading) {
        return (
            <Card className="mt-8 shadow-sm border-t-4 border-t-indigo-500">
                <CardContent className="flex justify-center items-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2">{t('transferHistory.loading')}</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mt-8 shadow-sm border-t-4 border-t-indigo-500">
            <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                    {t('transferHistory.title')}
                </CardTitle>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setClearDialogOpen(true)}
                    disabled={clearing || history.length === 0}
                    className="gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Effacer mon historique
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {history.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">Aucun historique</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Vos transferts apparaîtront ici.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>{t('transferHistory.table.date')}</TableHead>
                                    <TableHead>{t('transferHistory.table.type')}</TableHead>
                                    <TableHead>{t('transferHistory.table.description')}</TableHead>
                                    <TableHead className="text-right">{t('transferHistory.table.amount')}</TableHead>
                                    <TableHead className="text-right">{t('transferHistory.table.amountFcfa')}</TableHead>
                                    <TableHead className="text-center">{t('transferHistory.table.status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((tx) => {
                                    const isFee = tx.transaction_type === 'platform_fee';
                                    const amountPi = Number(tx.amount_pi || 0);
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
                                                        {isFee ? 'Frais de plateforme' : 'Transfert de gains'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[200px] truncate" title={tx.description}>
                                                {tx.description || (isFee ? 'Frais de transfert (5%)' : 'Transfert vers le portefeuille')}
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
                )}
            </CardContent>

            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Effacer votre historique</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action supprimera définitivement tout votre historique de transferts (gains vers portefeuille et frais de plateforme).
                            <br /><br />
                            Voulez-vous vraiment continuer ?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={clearing}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory} disabled={clearing} className="bg-red-600 hover:bg-red-700">
                            {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Oui, effacer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

export default TransferHistory;