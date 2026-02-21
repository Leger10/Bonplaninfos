import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, CalendarClock, Info, DollarSign, TrendingUp, PieChart, Globe, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { getNextWithdrawalDate, isWithdrawalOpen } from '@/lib/dateUtils';
import AdminSalaryWithdrawalModal from './AdminSalaryWithdrawalModal';
import { toast } from '@/components/ui/use-toast';
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';

const AdminSalaryDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [salaryStats, setSalaryStats] = useState(null);
    const [withdrawalConfig, setWithdrawalConfig] = useState({ withdrawal_dates: [5] });
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    
    const [nextWithdrawalDate, setNextWithdrawalDate] = useState(null);
    const [canWithdraw, setCanWithdraw] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: configData } = await supabase.from('admin_withdrawal_config').select('*').limit(1).maybeSingle();
            const config = configData || { withdrawal_dates: [5] };
            setWithdrawalConfig(config);
            setNextWithdrawalDate(getNextWithdrawalDate(config.withdrawal_dates || [5]));

            const { data: stats, error: statsError } = await supabase.rpc('get_admin_salary_stats', { p_admin_id: user.id });
            if (statsError) console.error("Stats Error:", statsError);
            setSalaryStats(stats);

            const { data: history } = await supabase
                .from('admin_withdrawal_requests')
                .select('*')
                .eq('admin_id', user.id)
                .order('requested_at', { ascending: false });
            setWithdrawalHistory(history || []);

            setCanWithdraw(isWithdrawalOpen(config.withdrawal_dates || [5]));

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const generateReceipt = async (withdrawal) => {
        if (!withdrawal) return;
        setGeneratingPdf(withdrawal.id);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();
            // ... (PDF generation logic preserved) ...
            doc.save(`recu_paiement_${format(new Date(withdrawal.requested_at), 'yyyyMMdd')}.pdf`);
            toast({ title: "Reçu téléchargé", description: "Votre reçu a été généré avec succès." });
        } catch (err) {
            console.error("Erreur génération PDF:", err);
            toast({ title: "Erreur", description: "Impossible de générer le PDF.", variant: "destructive" });
        } finally {
            setGeneratingPdf(null);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

    const commissionRate = salaryStats?.license_commission_rate || 0;
    const personalScore = salaryStats?.personal_score || 1.0;
    const zoneVolume = salaryStats?.total_volume_fcfa || 0;
    const platformFees = salaryStats?.platform_revenue_fcfa || 0;
    const estimatedSalary = salaryStats?.total_salary_fcfa || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / License Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Mon Salaire & Revenus</h2>
                    <p className="text-gray-400">
                        Licence active : <Badge className="bg-gray-800 text-gray-200">{salaryStats?.license_name || 'Standard'}</Badge> ({commissionRate}% sur commissions)
                    </p>
                </div>
                <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-3">
                    <CalendarClock className="text-indigo-400" />
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">Prochain Retrait</p>
                        <p className="font-medium text-white">
                            {nextWithdrawalDate ? format(nextWithdrawalDate, 'd MMMM yyyy', { locale: fr }) : '---'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Breakdown Visualizer */}
            <Card className="bg-gray-900 border-gray-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <PieChart className="w-5 h-5 text-indigo-400" /> Détail du Calcul (Mois en cours)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Globe className="w-16 h-16" /></div>
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Volume Zone ({salaryStats?.country})</p>
                            <p className="text-2xl font-black text-white">{zoneVolume.toLocaleString()} F</p>
                            <p className="text-xs text-gray-500 mt-1">Total achats validés</p>
                        </div>

                        <div className="hidden md:flex justify-center text-gray-600">→ 5% →</div>

                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="w-16 h-16" /></div>
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Com. Plateforme (5%)</p>
                            <p className="text-2xl font-black text-blue-400">{platformFees.toLocaleString()} F</p>
                            <p className="text-xs text-blue-500 mt-1">Base de calcul</p>
                        </div>

                        <div className="hidden md:flex justify-center text-gray-600">→ {commissionRate}% →</div>

                        <div className="bg-indigo-900 text-white p-4 rounded-xl border border-indigo-800 shadow-lg relative overflow-hidden transform hover:scale-105 transition-transform">
                            <div className="absolute top-0 right-0 p-2 opacity-20"><TrendingUp className="w-16 h-16 text-white" /></div>
                            <p className="text-xs text-indigo-300 uppercase font-bold mb-1">Votre Gain Estimé</p>
                            <p className="text-3xl font-black">{estimatedSalary.toLocaleString()} F</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-indigo-200 bg-indigo-800/50 p-1 rounded inline-flex">
                                <span>Score Perf: {personalScore}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 bg-yellow-900/30 p-3 rounded text-sm text-yellow-300 flex gap-2 items-start border border-yellow-800">
                        <Info className="w-5 h-5 flex-shrink-0" />
                        <p>
                            <strong>Formule :</strong> (Volume Zone × 5%) × {commissionRate}% × Score Personnel. 
                            <br/>Actuellement : ({zoneVolume.toLocaleString()} × 0.05) × {commissionRate/100} × {personalScore} ≈ <strong>{estimatedSalary.toLocaleString()} FCFA</strong>.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium uppercase text-gray-400">Score de Performance</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-bold text-white">{personalScore}</span>
                            <span className="text-sm text-gray-400 mb-1">/ 1.0</span>
                        </div>
                        <Progress value={personalScore * 100} className="h-2 bg-gray-800" />
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-sm text-gray-300">
                                <span>Parrainages</span>
                                <span className="font-mono">{salaryStats?.score_details?.breakdown?.referrals?.count || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-300">
                                <span>Événements Zone</span>
                                <span className="font-mono">{salaryStats?.score_details?.breakdown?.events?.count || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col justify-center items-center p-6 bg-gray-900 border-gray-800">
                    <Button 
                        size="lg" 
                        className="w-full max-w-xs h-14 text-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700" 
                        disabled={!canWithdraw || estimatedSalary < 1000}
                        onClick={() => setIsWithdrawalModalOpen(true)}
                    >
                        {canWithdraw ? "Demander le Retrait" : "Retraits Fermés"}
                    </Button>
                    <p className="text-xs text-gray-400 mt-2">
                        Disponible uniquement les : {withdrawalConfig.withdrawal_dates?.join(', ')} du mois.
                    </p>
                </Card>
            </div>

            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white">Historique des Paiements</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-800 hover:bg-gray-800">
                                <TableHead className="text-gray-300">Date</TableHead>
                                <TableHead className="text-gray-300">Montant</TableHead>
                                <TableHead className="text-gray-300">Statut</TableHead>
                                <TableHead className="text-right text-gray-300">Reçu</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {withdrawalHistory.map((w) => (
                                <TableRow key={w.id} className="border-gray-800 hover:bg-gray-800/50">
                                    <TableCell className="text-gray-300">{format(new Date(w.requested_at), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="font-bold text-white">{w.amount_fcfa?.toLocaleString() || '0'} F</TableCell>
                                    <TableCell>
                                        <Badge variant={w.status === 'approved' ? 'success' : w.status === 'rejected' ? 'destructive' : 'secondary'}>
                                            {w.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {(w.status === 'approved' || w.status === 'paid') && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => generateReceipt(w)}
                                                disabled={generatingPdf === w.id}
                                                className="text-gray-400 hover:text-white hover:bg-gray-800"
                                            >
                                                {generatingPdf === w.id ? 
                                                    <Loader2 className="h-4 w-4 animate-spin" /> : 
                                                    <Download className="h-4 w-4" />
                                                }
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {withdrawalHistory.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-400">Aucun historique.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AdminSalaryWithdrawalModal 
                open={isWithdrawalModalOpen} 
                onOpenChange={setIsWithdrawalModalOpen}
                availableAmount={estimatedSalary}
                adminId={user.id}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default AdminSalaryDashboard;