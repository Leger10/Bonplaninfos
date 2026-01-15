import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  RefreshCw, 
  AlertCircle, 
  Wallet,
  ArrowUpRight,
  Activity,
  Coins
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { fetchWithRetry, formatCurrency } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data States
  const [stats, setStats] = useState({
    totalCommissions: 0,
    estimatedRevenue: 0,
    totalTransactions: 0,
    pendingWithdrawals: 0,
    totalUsers: 0,
    newUsers: 0,
    activeEvents: 0,
    totalSalesFcfa: 0
  });
  
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [userActivityData, setUserActivityData] = useState([]);
  const [revenueByType, setRevenueByType] = useState([]);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // 1. Fetch Key Stats from new RPC
      const { data: rpcData, error: rpcError } = await fetchWithRetry(() => 
        supabase.rpc('get_super_admin_dashboard_stats')
      );

      if (rpcError) throw rpcError;

      // 2. Fetch Recent Transactions
      const { data: transactionsData } = await fetchWithRetry(() => 
        supabase.from('transactions')
          .select('*, user:user_id(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(5)
      );

      // 3. Fetch Data for Charts (Activity over 30 days)
      const { data: profilesData } = await fetchWithRetry(() => 
        supabase.from('profiles')
          .select('created_at')
          .gte('created_at', subDays(new Date(), 30).toISOString())
      );

      // 4. Fetch Revenue Breakdown (Simulated from coin_spending for now or use existing rpc if available)
      const { data: spendingData } = await fetchWithRetry(() => 
        supabase.from('coin_spending')
          .select('purpose, amount')
          .gte('created_at', subDays(new Date(), 90).toISOString())
      );

      // --- Process Data ---

      // Process Activity Chart
      const activityMap = {};
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const dateKey = format(subDays(today, i), 'yyyy-MM-dd');
        activityMap[dateKey] = 0;
      }
      (profilesData || []).forEach(profile => {
        const dateKey = format(new Date(profile.created_at), 'yyyy-MM-dd');
        if (activityMap[dateKey] !== undefined) activityMap[dateKey]++;
      });
      const formattedActivityData = Object.entries(activityMap).map(([date, count]) => ({
        date: format(new Date(date), 'dd MMM', { locale: fr }),
        users: count
      }));

      // Process Revenue Pie Chart
      const typeMap = {};
      (spendingData || []).forEach(item => {
        const type = item.purpose || 'Autre';
        typeMap[type] = (typeMap[type] || 0) + (item.amount || 0);
      });
      const formattedRevenueType = Object.entries(typeMap).map(([name, value]) => ({
        name: name === 'ticket_purchase' ? 'Billetterie' : 
              name === 'vote_participation' ? 'Votes' : 
              name === 'raffle_participation' ? 'Tombola' : 
              name === 'stand_rental' ? 'Stands' :
              name === 'event_access' ? 'Év. Protégés' : name,
        value
      })).sort((a, b) => b.value - a.value);

      // Update State
      setStats({
        totalCommissions: rpcData?.total_commissions || 0,
        estimatedRevenue: rpcData?.total_user_balance || 0, // Corresponds to user balance sum (Circulating Supply)
        totalTransactions: rpcData?.total_transactions || 0,
        pendingWithdrawals: rpcData?.pending_withdrawals || 0,
        totalUsers: rpcData?.total_users || 0,
        newUsers: rpcData?.new_users || 0,
        activeEvents: rpcData?.active_events || 0,
        totalSalesFcfa: rpcData?.total_sales_fcfa || 0
      });

      setRecentTransactions(transactionsData || []);
      setUserActivityData(formattedActivityData);
      setRevenueByType(formattedRevenueType);

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Impossible de charger les données. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-destructive/20 rounded-xl bg-destructive/5 text-destructive animate-in fade-in">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h3 className="text-xl font-bold">Erreur de chargement</h3>
        <p className="mb-4">{error}</p>
        <Button onClick={() => fetchDashboardData(true)} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
        </Button>
      </div>
    );
  }

  const StatCard = ({ title, value, subtext, icon: Icon, colorClass, borderClass }) => (
    <Card className={`relative overflow-hidden ${borderClass ? `border-l-4 ${borderClass}` : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${colorClass}`} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
          <p className="text-muted-foreground">Vue d'ensemble et métriques clés de la plateforme.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => fetchDashboardData(true)} 
            variant="outline" 
            disabled={refreshing || loading}
            className="shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Mise à jour...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {(loading && !refreshing) ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 1. Commissions */}
          <StatCard
            title="Commissions Totales"
            value={`${stats.totalCommissions.toLocaleString()} pièces`}
            subtext="Cumul commissions plateforme (5%)"
            icon={Coins}
            colorClass="text-yellow-500"
            borderClass="border-l-yellow-500"
          />

          {/* 2. Estimated Revenue (User Holdings) */}
          <StatCard
            title="Masse Monétaire (Utilisateurs)"
            value={`${stats.estimatedRevenue.toLocaleString()} pièces`}
            subtext="Total solde actuel des utilisateurs"
            icon={Wallet}
            colorClass="text-blue-500"
            borderClass="border-l-blue-500"
          />

          {/* 3. Registered Users */}
          <StatCard
            title="Utilisateurs Inscrits"
            value={stats.totalUsers.toLocaleString()}
            subtext={`+${stats.newUsers} nouveaux (30j)`}
            icon={Users}
            colorClass="text-green-500"
            borderClass="border-l-green-500"
          />

          {/* 4. Pending Withdrawals */}
          <StatCard
            title="Retraits en Attente"
            value={stats.pendingWithdrawals}
            subtext="Demandes à traiter"
            icon={AlertCircle}
            colorClass="text-red-500"
            borderClass="border-l-red-500"
          />
        </div>
      )}

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Chiffre d'Affaires (Ventes)"
          value={formatCurrency(stats.totalSalesFcfa)}
          subtext="Total achats de packs et licences"
          icon={TrendingUp}
          colorClass="text-emerald-600"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions.toLocaleString()}
          subtext="Volume global d'opérations"
          icon={CreditCard}
          colorClass="text-purple-500"
        />
        <StatCard
          title="Événements Actifs"
          value={stats.activeEvents}
          subtext="En ligne actuellement"
          icon={Activity}
          colorClass="text-indigo-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-7">
        {/* Activity Chart */}
        <Card className="col-span-4 shadow-md">
          <CardHeader>
            <CardTitle>Activité Utilisateurs</CardTitle>
            <CardDescription>Nouvelles inscriptions sur 30 jours</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userActivityData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  minTickGap={30} 
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} 
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Type Chart */}
        <Card className="col-span-3 shadow-md">
          <CardHeader>
            <CardTitle>Sources de Dépenses</CardTitle>
            <CardDescription>Utilisation des pièces par type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {revenueByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold text-lg">
                  Types
                </text>
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {revenueByType.map((entry, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions List */}
      <Tabs defaultValue="recent_tx" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent_tx">Dernières Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="recent_tx">
          <Card>
            <CardHeader>
              <CardTitle>Flux Récent</CardTitle>
              <CardDescription>Les 5 dernières opérations financières.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Aucune transaction récente</p>
                ) : (
                  recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${tx.amount_pi > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {tx.amount_pi > 0 ? <TrendingUp className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tx.description || tx.transaction_type}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{tx.user?.full_name || 'Utilisateur'}</span>
                            <span>•</span>
                            <span>{format(new Date(tx.created_at), 'dd MMM HH:mm', { locale: fr })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${tx.amount_pi > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.amount_pi > 0 ? '+' : ''}{tx.amount_pi} pièces
                        </div>
                        {tx.amount_fcfa && (
                          <div className="text-xs text-muted-foreground">
                            {Math.abs(tx.amount_fcfa).toLocaleString()} FCFA
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;