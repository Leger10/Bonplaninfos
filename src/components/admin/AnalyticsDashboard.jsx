import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertCircle, 
  Wallet,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { fetchWithRetry } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data States - Initialized with 0s
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    totalRevenue: 0,
    activeEvents: 0,
    totalTransactions: 0,
    pendingWithdrawals: 0
  });
  
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [userActivityData, setUserActivityData] = useState([]);
  const [revenueByType, setRevenueByType] = useState([]);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Parallel Fetching with Retry
      const [
        analyticsRpc,
        transactionsRes,
        withdrawalsRes,
        announcementsRes,
        profilesRes,
        pendingWithdrawalsCount
      ] = await Promise.all([
        fetchWithRetry(() => supabase.rpc('get_global_analytics')),
        fetchWithRetry(() => supabase.from('transactions').select('*, user:user_id(full_name, email)').order('created_at', { ascending: false }).limit(10)),
        fetchWithRetry(() => supabase.from('withdrawal_requests').select('*, user:user_id(full_name)').order('requested_at', { ascending: false }).limit(10)),
        fetchWithRetry(() => supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)),
        fetchWithRetry(() => supabase.from('profiles').select('created_at').gte('created_at', subDays(new Date(), 30).toISOString())),
        fetchWithRetry(() => supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'))
      ]);

      if (analyticsRpc.error) throw analyticsRpc.error;
      
      // Process RPC Data - Handle empty array safely
      const analyticsData = (analyticsRpc.data && analyticsRpc.data[0]) ? analyticsRpc.data[0] : {};
      
      // Process Revenue Chart Data
      const rawRevenueData = analyticsData.monthly_revenue || [];
      const formattedRevenueData = rawRevenueData.map(item => ({
        name: format(new Date(item.month), 'MMM yyyy', { locale: fr }),
        revenue: (item.total_pi || 0) * 10 
      }));

      // Process User Activity Chart
      const activityMap = {};
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        activityMap[format(date, 'yyyy-MM-dd')] = 0;
      }
      
      (profilesRes.data || []).forEach(profile => {
        const dateKey = format(new Date(profile.created_at), 'yyyy-MM-dd');
        if (activityMap[dateKey] !== undefined) {
          activityMap[dateKey]++;
        }
      });

      const formattedActivityData = Object.entries(activityMap).map(([date, count]) => ({
        date: format(new Date(date), 'dd MMM', { locale: fr }),
        users: count
      }));

      setGlobalStats({
        totalUsers: analyticsData.total_users || 0,
        newUsers: analyticsData.new_users_last_30_days || 0,
        totalRevenue: (analyticsData.total_revenue_pi || 0) * 10,
        activeEvents: analyticsData.active_events || 0,
        totalTransactions: analyticsData.total_coins_purchased || 0,
        pendingWithdrawals: pendingWithdrawalsCount.count || 0
      });

      setRecentTransactions(transactionsRes.data || []);
      setRecentWithdrawals(withdrawalsRes.data || []);
      setRecentAnnouncements(announcementsRes.data || []);
      setRevenueData(formattedRevenueData);
      setUserActivityData(formattedActivityData);
      setRevenueByType(analyticsData.revenue_by_type || []);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      // We only set error if it's a critical failure, otherwise we show 0s
      if (err.message?.includes('fetch') || err.message?.includes('connection')) {
          setError("Erreur de connexion. Vérifiez votre internet.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 text-center p-8 border rounded-xl bg-destructive/5">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h3 className="text-xl font-bold text-destructive">Erreur de chargement</h3>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => fetchDashboardData(true)} variant="outline" className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Tableau de Bord</h2>
          <p className="text-muted-foreground">
            Vue d'ensemble des performances et de l'activité de la plateforme.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchDashboardData(true)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Chargement...' : 'Actualiser'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenu Total (Estimé)</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalStats.totalRevenue.toLocaleString()} F CFA</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" /> 
                  Basé sur les dépenses en pièces
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs Inscrits</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalStats.totalUsers}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                  +{globalStats.newUsers} ce mois-ci
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions Totales</CardTitle>
                <CreditCard className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalStats.totalTransactions}</div>
                <p className="text-xs text-muted-foreground mt-1">Achats et crédits de pièces</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retraits en Attente</CardTitle>
                <Wallet className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{globalStats.pendingWithdrawals}</div>
                <p className="text-xs text-muted-foreground mt-1">Demandes à traiter</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Activité des Inscriptions</CardTitle>
            <CardDescription>Nouveaux utilisateurs sur les 30 derniers jours</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={userActivityData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Répartition par Type</CardTitle>
            <CardDescription>Sources de revenus</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={revenueByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total_pi"
                  >
                    {revenueByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="transactions">Transactions Récentes</TabsTrigger>
          <TabsTrigger value="withdrawals">Retraits Récents</TabsTrigger>
          <TabsTrigger value="announcements">Annonces Récentes</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transactions Récentes</CardTitle>
              <CardDescription>Les 10 dernières transactions effectuées sur la plateforme.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Aucune transaction récente.</div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${transaction.amount_pi > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {transaction.amount_pi > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description || 'Transaction sans description'}</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.user?.full_name || 'Utilisateur inconnu'} • {format(new Date(transaction.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${transaction.amount_pi > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {transaction.amount_pi > 0 ? '+' : ''}{transaction.amount_pi} π
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Retraits Récents</CardTitle></CardHeader>
                <CardContent>
                    {recentWithdrawals.length === 0 ? <div className="text-center py-4 text-muted-foreground">Aucun retrait récent.</div> : (
                        <div className="space-y-2">
                            {recentWithdrawals.map(w => (
                                <div key={w.id} className="flex justify-between p-2 border rounded">
                                    <span>{w.user?.full_name}</span>
                                    <span className="font-bold">{w.amount_pi} π</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
            <Card>
                <CardHeader><CardTitle>Annonces Récentes</CardTitle></CardHeader>
                <CardContent>
                    {recentAnnouncements.length === 0 ? <div className="text-center py-4 text-muted-foreground">Aucune annonce récente.</div> : (
                        <div className="space-y-2">
                            {recentAnnouncements.map(a => (
                                <div key={a.id} className="flex justify-between p-2 border rounded items-center">
                                    <span className="font-medium">{a.title}</span>
                                    <Badge>{a.type}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;