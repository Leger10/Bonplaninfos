import React from 'react';
import { 
    Coins, 
    Package, 
    Upload, 
    Download, 
    Gift, 
    ArrowRightLeft, 
    Percent, 
    AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const TransactionsTab = ({ transactions }) => {
    const { t } = useTranslation();

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

    // --- LOGIQUE POUR HISTORIQUE GÉNÉRAL ---
    const getTransactionDetails = (transaction) => {
        let icon, color, text, amount;

        if (transaction.transaction_type) {
            switch (transaction.transaction_type) {
                case 'earning':
                    icon = Gift;
                    color = 'text-green-400';
                    text = t('transactionsTab.other.types.earning');
                    amount = transaction.amount_pi;
                    break;
                case 'manual_credit':
                    icon = Download;
                    color = 'text-blue-400';
                    text = t('transactionsTab.other.types.manual_credit');
                    amount = transaction.amount_pi;
                    break;
                case 'credit_reversal':
                    icon = Upload;
                    color = 'text-red-400';
                    text = t('transactionsTab.other.types.credit_reversal');
                    amount = transaction.amount_pi;
                    break;
                case 'earnings_transfer_to_wallet':
                    icon = ArrowRightLeft;
                    color = 'text-green-500';
                    text = t('transactionsTab.other.types.earnings_transfer_to_wallet');
                    amount = transaction.amount_pi;
                    break;
                case 'platform_fee':
                    icon = Percent;
                    color = 'text-red-500';
                    text = t('transactionsTab.other.types.platform_fee');
                    amount = transaction.amount_pi;
                    break;
                default:
                    icon = Coins;
                    color = 'text-gray-400';
                    text = transaction.description || t('transactionsTab.other.types.default');
                    amount = transaction.amount_pi;
            }
        } else if (transaction.purpose) {
            icon = Upload;
            color = 'text-red-400';
            text = t('transactionsTab.other.types.expense', { purpose: transaction.purpose });
            amount = -transaction.amount;
        } else {
            icon = Package;
            color = 'text-blue-400';
            text = t('transactionsTab.other.types.default');
            amount = transaction.total_coins;
        }

        return { icon, color, text, amount };
    };

    const generalTransactions = (transactions || []).filter(item => 
        !transferTypes.includes(item.transaction_type)
    );

    return (
        <div className="space-y-6">
            {/* --- TABLEAU: HISTORIQUE DES TRANSFERTS ET FRAIS --- */}
            <Card className="shadow-sm border-t-4 border-t-indigo-500">
                <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                        {t('transactionsTab.transfers.title')}
                    </CardTitle>
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

            {/* --- LISTE: AUTRES TRANSACTIONS --- */}
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle className="text-lg">{t('transactionsTab.other.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {generalTransactions.length > 0 ? (
                        <div className="space-y-4">
                            {generalTransactions.slice(0, 25).map((transaction) => {
                                const { icon: Icon, color, text, amount } = getTransactionDetails(transaction);
                                const isCredit = amount > 0;

                                let bgColor = 'bg-red-500';
                                if (color === 'text-green-400') bgColor = 'bg-green-500';
                                if (color === 'text-blue-400') bgColor = 'bg-blue-500';

                                return (
                                    <div
                                        key={transaction.id || Math.random()}
                                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-opacity-20 ${bgColor}`}>
                                                <Icon className={`w-5 h-5 ${color}`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm sm:text-base">
                                                    {text}
                                                </p>
                                                <p className="text-xs sm:text-sm text-muted-foreground">
                                                    {formatDate(transaction.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`font-bold whitespace-nowrap ${color}`}>
                                            {isCredit ? '+' : ''}{formatNumber(amount)} π
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Coins className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">{t('transactionsTab.other.empty')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TransactionsTab;