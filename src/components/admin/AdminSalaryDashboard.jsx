import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, Activity, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import WithdrawalRequestForm from './WithdrawalRequestForm';

const AdminSalaryDashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [stats, setStats] = useState({ revenue: 0, score: 0, projectedSalary: 0 });
    const [history, setHistory] = useState([]);
    const [availableSalary, setAvailableSalary] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
    };

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch current month revenue
            const today = new Date();
            const firstDay = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
            
            const { data: revenueData, error: revenueError } = await supabase
                .from('admin_revenue')
                .select('amount_fcfa')
                .eq('admin_id', user.id)
                .gte('created_at', firstDay);

            if (revenueError) throw revenueError;
            const currentRevenue = revenueData.reduce((sum, r) => sum + r.amount_fcfa, 0);

            // Fetch current score and license rate
            const { data: scoreData, error: scoreError } = await supabase
                .from('personal_score')
                .select('score')
                .eq('admin_id', user.id)
                .order('calculation_date', { ascending: false })
                .limit(1)
                .maybeSingle(); // Use maybeSingle to handle no rows
            if (scoreError) throw scoreError;
            const currentScore = scoreData?.score || 1.0; // Default to 1.0 if no score found

            const { data: partnerData, error: partnerError } = await supabase
                .from('partners')
                .select('license:license_id(commission_rate)')
                .eq('user_id', user.id)
                .maybeSingle(); // Use maybeSingle to handle no rows
            if (partnerError) throw partnerError;
            const licenseRate = (partnerData?.license?.commission_rate || 0) / 100; // Default to 0 if no license found
            
            const projectedSalary = currentRevenue * licenseRate * currentScore;

            // Fetch salary history
            const { data: historyData, error: historyError } = await supabase
                .from('admin_salary_history')
                .select('*')
                .eq('admin_id', user.id)
                .order('month', { ascending: false });

            if (historyError) throw historyError;
            setHistory(historyData || []);

            // Calculate available salary
            const unpaidSalary = (historyData || []).filter(h => !h.is_paid).reduce((sum, h) => sum + h.final_salary, 0);
            setAvailableSalary(unpaidSalary);

            setStats({ revenue: currentRevenue, score: currentScore, projectedSalary });

        } catch (error) {
            console.error("Error fetching salary data:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_dashboard.salary_dashboard.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('admin_dashboard.salary_dashboard.current_month_revenue')}</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('admin_dashboard.salary_dashboard.personal_score')}</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.score.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('admin_dashboard.salary_dashboard.projected_salary')}</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats.projectedSalary)}</div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div>
                        <p className="text-lg font-semibold">{t('admin_dashboard.withdrawal_form.available_salary')}: {formatCurrency(availableSalary)}</p>
                    </div>
                    <Button onClick={() => setShowWithdrawalForm(true)} disabled={availableSalary <= 0}>
                        {t('admin_dashboard.salary_dashboard.request_withdrawal')}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('admin_dashboard.salary_dashboard.history_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin_dashboard.salary_dashboard.month')}</TableHead>
                                <TableHead>{t('admin_dashboard.salary_dashboard.revenue')}</TableHead>
                                <TableHead>{t('admin_dashboard.salary_dashboard.license_rate')}</TableHead>
                                <TableHead>{t('admin_dashboard.salary_dashboard.score')}</TableHead>
                                <TableHead>{t('admin_dashboard.salary_dashboard.salary')}</TableHead>
                                <TableHead>{t('admin_dashboard.salary_dashboard.status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{format(new Date(item.month), 'MMMM yyyy', { locale: fr })}</TableCell>
                                    <TableCell>{formatCurrency(item.revenue_fcfa)}</TableCell>
                                    <TableCell>{(item.license_rate * 100).toFixed(0)}%</TableCell>
                                    <TableCell>{item.personal_score.toFixed(2)}</TableCell>
                                    <TableCell className="font-bold">{formatCurrency(item.final_salary)}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.is_paid ? 'success' : 'outline'}>
                                            {item.is_paid ? t('admin_dashboard.salary_dashboard.paid') : t('admin_dashboard.salary_dashboard.unpaid')}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {showWithdrawalForm && (
                <WithdrawalRequestForm
                    availableSalary={availableSalary}
                    onClose={() => setShowWithdrawalForm(false)}
                    onSuccess={() => {
                        setShowWithdrawalForm(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default AdminSalaryDashboard;