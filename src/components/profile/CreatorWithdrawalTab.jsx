import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import WithdrawalModal from '@/components/common/WithdrawalModal';

const CreatorWithdrawalTab = ({ availableBalanceFcfa = 0, onRefresh }) => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
        
        // Realtime subscription for history updates
        const channel = supabase.channel('withdrawal_updates')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'organizer_withdrawal_requests',
                filter: `organizer_id=eq.${user?.id}`
            }, () => {
                fetchHistory();
                if(onRefresh) onRefresh();
            })
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const fetchHistory = async () => {
        if (!user) return;
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizer_withdrawal_requests')
                .select('*')
                .eq('organizer_id', user.id)
                .order('requested_at', { ascending: false });
            
            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error("History fetch error", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSuccess = () => {
        fetchHistory();
        if (onRefresh) onRefresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Retraits</h2>
                    <p className="text-muted-foreground">Gérez vos demandes et consultez votre historique.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <DollarSign className="w-4 h-4 mr-2" /> Demander un retrait
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" /> Historique des transactions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {historyLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>Aucune demande de retrait effectuée.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Montant Brut</TableHead>
                                        <TableHead>Frais (5%)</TableHead>
                                        <TableHead>Net à Recevoir</TableHead>
                                        <TableHead>Statut</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map(req => {
                                        // Fallback calculations if columns are null (legacy records)
                                        const gross = req.amount_fcfa || 0;
                                        const fees = req.fees || Math.floor(gross * 0.05);
                                        const net = req.net_amount || (gross - fees);

                                        return (
                                            <TableRow key={req.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {format(new Date(req.requested_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                                </TableCell>
                                                <TableCell>{gross.toLocaleString()} FCFA</TableCell>
                                                <TableCell className="text-red-500">-{fees.toLocaleString()} FCFA</TableCell>
                                                <TableCell className="font-bold text-emerald-600">{net.toLocaleString()} FCFA</TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        req.status === 'approved' || req.status === 'paid' ? 'success' : 
                                                        req.status === 'rejected' ? 'destructive' : 'secondary'
                                                    }>
                                                        {req.status === 'approved' ? 'Validé' : 
                                                         req.status === 'paid' ? 'Payé' : 
                                                         req.status === 'rejected' ? 'Rejeté' : 'En attente'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <WithdrawalModal 
                open={isModalOpen} 
                onOpenChange={setIsModalOpen}
                availableBalance={availableBalanceFcfa}
                userId={user?.id}
                userType="organizer"
                onSuccess={handleSuccess}
            />
        </div>
    );
};

export default CreatorWithdrawalTab;