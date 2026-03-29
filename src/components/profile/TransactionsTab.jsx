import React, { useState } from 'react';
import { 
    Coins, 
    Package, 
    Upload, 
    Download, 
    Gift, 
    ArrowRightLeft, 
    Percent, 
    AlertCircle,
    Trash2,
    Loader2,
    AlertTriangle,
    RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';

const TransactionsTab = ({ transactions, onRefresh }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [clearTransferDialogOpen, setClearTransferDialogOpen] = useState(false);
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [clearing, setClearing] = useState(false);

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

    // --- LOGIQUE POUR TRANSFERTS ET FRAIS ---
    const transferTypes = ['earnings_transfer_to_wallet', 'platform_fee'];
    const transfersAndFees = (transactions || []).filter(item => 
        transferTypes.includes(item.transaction_type)
    );

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'success':
                return <Badge className="bg-green-500">{t('transactionsTab.transfers.status.completed')}</Badge>;
            case 'pending':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600">{t('transactionsTab.transfers.status.pending')}</Badge>;
            case 'failed':
            case 'error':
                return <Badge variant="destructive">{t('transactionsTab.transfers.status.failed')}</Badge>;
            default:
                return <Badge variant="secondary">{t('transactionsTab.transfers.status.unknown')}</Badge>;
        }
    };

    // Suppression logique des transferts et frais
    const handleClearTransferHistory = async () => {
        if (!user) return;
        setClearing(true);
        try {
            const { data, error } = await supabase.rpc('clear_user_transfer_history', {
                p_user_id: user.id
            });
            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            toast({
                title: "Historique vidé",
                description: "Votre historique des transferts et frais a été supprimé (masqué).",
                variant: "default",
                className: "bg-green-600 text-white",
            });
            if (onRefresh) onRefresh(); // Recharger les transactions (excluant les supprimées)
        } catch (err) {
            console.error("Clear error:", err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de vider l'historique.",
                variant: "destructive",
            });
        } finally {
            setClearing(false);
            setClearTransferDialogOpen(false);
        }
    };

    // Suppression logique de TOUTES les transactions
    const handleClearAllHistory = async () => {
        if (!user) return;
        setClearing(true);
        try {
            const { data, error } = await supabase.rpc('clear_all_user_transactions', {
                p_user_id: user.id
            });
            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            toast({
                title: "Historique complet vidé",
                description: "Toutes vos transactions ont été supprimées (masquées).",
                variant: "default",
                className: "bg-green-600 text-white",
            });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Clear all error:", err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de vider l'historique complet.",
                variant: "destructive",
            });
        } finally {
            setClearing(false);
            setClearAllDialogOpen(false);
        }
    };

    // Restauration de TOUTES les transactions (remet deleted_at = NULL)
    const handleRestoreAllHistory = async () => {
        if (!user) return;
        setClearing(true);
        try {
            const { data, error } = await supabase.rpc('restore_user_transactions', {
                p_user_id: user.id
            });
            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            toast({
                title: "Historique restauré",
                description: "Toutes vos transactions ont été restaurées.",
                variant: "default",
                className: "bg-green-600 text-white",
            });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Restore error:", err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de restaurer l'historique.",
                variant: "destructive",
            });
        } finally {
            setClearing(false);
            setRestoreDialogOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* --- TABLEAU: HISTORIQUE DES TRANSFERTS ET FRAIS --- */}
            <Card className="shadow-sm border-t-4 border-t-indigo-500">
                <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                        {t('transactionsTab.transfers.title')}
                    </CardTitle>
                    <div className="flex gap-2">
                        {transfersAndFees.length > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setClearTransferDialogOpen(true)}
                                disabled={clearing}
                                className="gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Effacer les transferts
                            </Button>
                        )}
                        {transactions && transactions.length > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setClearAllDialogOpen(true)}
                                disabled={clearing}
                                className="gap-2 bg-red-700 hover:bg-red-800"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Tout effacer
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreDialogOpen(true)}
                            disabled={clearing}
                            className="gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Restaurer l'historique
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {transfersAndFees.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>{t('transactionsTab.transfers.columns.date')}</TableHead>
                                        <TableHead>{t('transactionsTab.transfers.columns.type')}</TableHead>
                                        <TableHead>{t('transactionsTab.transfers.columns.description')}</TableHead>
                                        <TableHead className="text-right">{t('transactionsTab.transfers.columns.amountPi')}</TableHead>
                                        <TableHead className="text-right">{t('transactionsTab.transfers.columns.amountFcfa')}</TableHead>
                                        <TableHead className="text-center">{t('transactionsTab.transfers.columns.status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfersAndFees.map((transfer) => {
                                        const isFee = transfer.transaction_type === 'platform_fee';
                                        const amountPi = Number(transfer.amount_pi || 0);
                                        const amountFcfa = amountPi * COIN_TO_FCFA_RATE;
                                        const isPositive = amountPi > 0;
                                        const amountColor = isPositive ? 'text-green-600' : 'text-red-600';
                                        const sign = isPositive ? '+' : '';

                                        return (
                                            <TableRow key={transfer.id}>
                                                <TableCell className="whitespace-nowrap text-sm text-gray-600">
                                                    {formatDate(transfer.created_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {isFee ? (
                                                            <Percent className="w-4 h-4 text-red-500" />
                                                        ) : (
                                                            <ArrowRightLeft className="w-4 h-4 text-green-500" />
                                                        )}
                                                        <span className="font-medium text-sm">
                                                            {isFee
                                                                ? t('transactionsTab.transfers.types.fee')
                                                                : t('transactionsTab.transfers.types.transfer')}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm max-w-[200px] truncate" title={transfer.description}>
                                                    {transfer.description || '-'}
                                                </TableCell>
                                                <TableCell className={`text-right font-bold ${amountColor}`}>
                                                    {sign}{formatNumber(amountPi)} π
                                                </TableCell>
                                                <TableCell className={`text-right font-medium ${amountColor}`}>
                                                    {sign}{formatNumber(amountFcfa)} F
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {getStatusBadge(transfer.status)}
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
                            <p className="text-muted-foreground font-medium">{t('transactionsTab.transfers.empty.title')}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t('transactionsTab.transfers.empty.description')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialogue pour effacer les transferts/frais */}
            <AlertDialog open={clearTransferDialogOpen} onOpenChange={setClearTransferDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Effacer votre historique des transferts</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action masquera définitivement tout votre historique de transferts et frais de plateforme.
                            <br /><br />
                            Les autres transactions (gains, achats, etc.) ne seront pas affectées.
                            <br /><br />
                            Voulez-vous vraiment continuer ?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={clearing}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearTransferHistory} disabled={clearing} className="bg-red-600 hover:bg-red-700">
                            {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Oui, effacer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialogue pour effacer TOUT l'historique */}
            <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Effacer TOUT votre historique</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p className="text-red-600 font-semibold">
                                ⚠️ Attention : Cette action est irréversible !
                            </p>
                            <p>
                                Elle masquera définitivement <strong>toutes</strong> vos transactions : 
                                transferts, frais, gains, achats de pièces, crédits manuels, etc.
                            </p>
                            <p>
                                Les soldes de votre compte ne seront pas affectés, mais vous perdrez 
                                l'historique détaillé de vos opérations.
                            </p>
                            <p>
                                Voulez-vous vraiment continuer ?
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={clearing}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllHistory} disabled={clearing} className="bg-red-700 hover:bg-red-800">
                            {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Oui, tout effacer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialogue pour restaurer l'historique */}
            <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restaurer votre historique</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action réaffichera toutes vos transactions précédemment effacées (masquées).
                            <br /><br />
                            Voulez-vous vraiment restaurer votre historique complet ?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={clearing}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestoreAllHistory} disabled={clearing} className="bg-green-600 hover:bg-green-700">
                            {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Oui, restaurer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TransactionsTab;