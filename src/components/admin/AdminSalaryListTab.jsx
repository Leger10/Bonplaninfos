import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, History, Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminSalaryListTab = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [grandTotalWithdrawals, setGrandTotalWithdrawals] = useState(0);
    const [selectedAdminHistory, setSelectedAdminHistory] = useState(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch all admins/secretaries
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, user_type, country')
                .in('user_type', ['admin', 'secretary']);

            if (profilesError) throw profilesError;

            // 2. Fetch salary history (earnings)
            const { data: earnings, error: earningsError } = await supabase
                .from('paiements_admin')
                .select('admin_id, montant_a_payer, statut');

            if (earningsError) throw earningsError;

            // 3. Fetch withdrawals
            const { data: withdrawals, error: withdrawalsError } = await supabase
                .from('admin_withdrawal_requests')
                .select('admin_id, amount_fcfa, status, requested_at');

            if (withdrawalsError) throw withdrawalsError;

            // Process data
            let totalGlobalWithdrawals = 0;

            const processedAdmins = profiles.map(admin => {
                // Calculate Total Salary Earned (Validated)
                const adminEarnings = earnings.filter(e => e.admin_id === admin.id);
                const totalEarned = adminEarnings.reduce((sum, e) => sum + (e.montant_a_payer || 0), 0);

                // Calculate Total Withdrawals (Approved/Paid)
                const adminWithdrawals = withdrawals.filter(w => w.admin_id === admin.id);
                const totalWithdrawn = adminWithdrawals
                    .filter(w => w.status === 'approved' || w.status === 'paid')
                    .reduce((sum, w) => sum + (w.amount_fcfa || 0), 0);

                totalGlobalWithdrawals += totalWithdrawn;

                // Pending Balance (Earned - Withdrawn)
                const balance = Math.max(0, totalEarned - totalWithdrawn);

                return {
                    ...admin,
                    totalEarned,
                    totalWithdrawn,
                    balance,
                    withdrawalHistory: adminWithdrawals
                };
            });

            setAdmins(processedAdmins);
            setGrandTotalWithdrawals(totalGlobalWithdrawals);

            console.log("Admin list loaded: [count]", processedAdmins.length);
            console.log("Total admin withdrawals: [amount]", totalGlobalWithdrawals);

        } catch (error) {
            console.error("Error fetching admin salary list:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openHistory = (admin) => {
        setSelectedAdminHistory(admin);
        setIsHistoryOpen(true);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary">Total Retraits Global</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{grandTotalWithdrawals.toLocaleString()} FCFA</div>
                        <p className="text-xs text-muted-foreground mt-1">Tous administrateurs confondus</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Liste des Salaires Administrateurs
                    </CardTitle>
                    <CardDescription>Vue d'ensemble des gains et retraits par administrateur.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Administrateur</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead className="text-right">Total Gagné (Cumulé)</TableHead>
                                <TableHead className="text-right">Total Retiré</TableHead>
                                <TableHead className="text-right">Solde Théorique</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {admins.map((admin) => (
                                <TableRow key={admin.id}>
                                    <TableCell>
                                        <div className="font-medium">{admin.full_name}</div>
                                        <div className="text-xs text-muted-foreground">{admin.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{admin.user_type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {admin.totalEarned.toLocaleString()} FCFA
                                    </TableCell>
                                    <TableCell className="text-right text-orange-600">
                                        {admin.totalWithdrawn.toLocaleString()} FCFA
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-green-600">
                                        {admin.balance.toLocaleString()} FCFA
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openHistory(admin)}>
                                            <History className="h-4 w-4 mr-2" /> Historique
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Historique des Retraits - {selectedAdminHistory?.full_name}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Montant</TableHead>
                                    <TableHead>Statut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedAdminHistory?.withdrawalHistory && selectedAdminHistory.withdrawalHistory.length > 0 ? (
                                    selectedAdminHistory.withdrawalHistory.map((w, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{format(new Date(w.requested_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                                            <TableCell className="font-medium">{w.amount_fcfa.toLocaleString()} FCFA</TableCell>
                                            <TableCell>
                                                <Badge variant={w.status === 'approved' ? 'success' : w.status === 'rejected' ? 'destructive' : 'secondary'}>
                                                    {w.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Aucun retrait trouvé.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminSalaryListTab;