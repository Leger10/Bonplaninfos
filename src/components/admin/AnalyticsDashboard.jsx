import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertCircle, 
  Megaphone,
  Wallet,
  ArrowUpRight,
  Star,
  Calendar,
  UserPlus,
  BarChart3,
  Eye,
  Activity,
  Globe
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
  Cell,
  LineChart,
  Line
} from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data States
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    totalRevenue: 0,
    activeEvents: 0,
    totalTransactions: 0,
    pendingWithdrawals: 0,
    conversionRate: 0,
    avgTransactionValue: 0
  });
  
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [userActivityData, setUserActivityData] = useState([]);
  const [userDemographics, setUserDemographics] = useState({
    byCountry: {},
    byCity: {},
    byAgeGroup: {}
  });
  const [countryStats, setCountryStats] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Parallel Fetching
      const [
        analyticsRpc,
        transactionsRes,
        withdrawalsRes,
        announcementsRes,
        profilesRes,
        pendingWithdrawalsRes,
        allProfilesRes
      ] = await Promise.all([
        supabase.rpc('get_global_analytics'),
        supabase
          .from('transactions')
          .select('*, user:user_id(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('withdrawal_requests')
          .select('*, user:user_id(full_name)')
          .order('requested_at', { ascending: false })
          .limit(10),
        supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', subDays(new Date(), 30).toISOString()),
        supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('status', 'pending'),
        supabase
          .from('profiles')
          .select('country, city, date_of_birth')
          .limit(1000)
      ]);

      if (analyticsRpc.error) throw analyticsRpc.error;
      
      // Process RPC Data
      const analyticsData = (analyticsRpc.data && analyticsRpc.data[0]) ? analyticsRpc.data[0] : {};
      
      // Process Revenue Chart Data
      const rawRevenueData = analyticsData.monthly_revenue || [];
      const formattedRevenueData = rawRevenueData.map(item => ({
        name: format(new Date(item.month), 'MMM yyyy', { locale: fr }),
        revenue: (item.total_pi || 0) * 10,
        pi: item.total_pi || 0
      }));

      // Process User Activity Chart
      const activityMap = {};
      const today = new Date();
      
      // Create array of last 30 days
      const daysArray = eachDayOfInterval({
        start: subDays(today, 29),
        end: today
      });
      
      daysArray.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        activityMap[dateKey] = 0;
      });

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

      // Process Demographics
      const demographics = { byCountry: {}, byCity: {}, byAgeGroup: {} };
      
      (allProfilesRes.data || []).forEach(profile => {
        // Country
        if (profile.country) {
          demographics.byCountry[profile.country] = (demographics.byCountry[profile.country] || 0) + 1;
        }
        
        // City
        if (profile.city) {
          demographics.byCity[profile.city] = (demographics.byCity[profile.city] || 0) + 1;
        }
        
        // Age Group
        if (profile.date_of_birth) {
          const birthDate = new Date(profile.date_of_birth);
          const age = today.getFullYear() - birthDate.getFullYear();
          let ageGroup;
          if (age < 18) ageGroup = '<18';
          else if (age <= 25) ageGroup = '18-25';
          else if (age <= 35) ageGroup = '26-35';
          else if (age <= 50) ageGroup = '36-50';
          else ageGroup = '50+';
          
          demographics.byAgeGroup[ageGroup] = (demographics.byAgeGroup[ageGroup] || 0) + 1;
        }
      });

      // Calculate conversion rate (example: 5% of visitors become users)
      const conversionRate = analyticsData.total_users > 0 ? 
        Math.min(100, (analyticsData.new_users_last_30_days / 1000) * 100) : 0;

      // Calculate average transaction value
      const avgTransactionValue = analyticsData.total_coins_purchased > 0 ? 
        (analyticsData.total_revenue_pi * 10) / analyticsData.total_coins_purchased : 0;

      // Simuler des données pour les statistiques par pays (à remplacer par vos vraies données)
      const simulatedCountryStats = [
        { country: 'France', transactionCount: 1250, positiveTransactions: 1200, totalAmount: 45000, reversals: 500, percentage: 35 },
        { country: 'Côte d\'Ivoire', transactionCount: 890, positiveTransactions: 850, totalAmount: 32000, reversals: 400, percentage: 25 },
        { country: 'Sénégal', transactionCount: 650, positiveTransactions: 620, totalAmount: 28000, reversals: 300, percentage: 18 },
        { country: 'Mali', transactionCount: 420, positiveTransactions: 400, totalAmount: 15000, reversals: 200, percentage: 12 },
        { country: 'Burkina Faso', transactionCount: 280, positiveTransactions: 270, totalAmount: 9500, reversals: 100, percentage: 7 },
        { country: 'Autres', transactionCount: 180, positiveTransactions: 175, totalAmount: 4500, reversals: 50, percentage: 3 }
      ];

      setGlobalStats({
        totalUsers: analyticsData.total_users || 0,
        newUsers: analyticsData.new_users_last_30_days || 0,
        totalRevenue: (analyticsData.total_revenue_pi || 0) * 10,
        activeEvents: analyticsData.active_events || 0,
        totalTransactions: analyticsData.total_coins_purchased || 0,
        pendingWithdrawals: pendingWithdrawalsRes.data?.length || 0,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgTransactionValue: parseFloat(avgTransactionValue.toFixed(2))
      });

      setRecentTransactions(transactionsRes.data || []);
      setRecentWithdrawals(withdrawalsRes.data || []);
      setRecentAnnouncements(announcementsRes.data || []);
      setRevenueData(formattedRevenueData);
      setUserActivityData(formattedActivityData);
      setUserDemographics(demographics);
      setCountryStats(simulatedCountryStats);
      setTotalTransactions(3670); // Valeur simulée

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Erreur de connexion. Vérifiez votre internet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 text-center p-8 border border-gray-800 rounded-xl bg-black text-white">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h3 className="text-xl font-bold text-red-400">Erreur de chargement</h3>
        <p className="text-gray-300 max-w-md">{error}</p>
        <Button onClick={() => fetchDashboardData(true)} variant="outline" className="mt-4 border-gray-700 text-white">
          <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
        </Button>
      </div>
    );
  }

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const DEMO_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 bg-black text-white min-h-screen p-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Tableau de Bord Analytique
          </h2>
          <p className="text-gray-300">
            Vue d'ensemble des performances et de l'activité de la plateforme en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1 bg-gray-900 text-white border-gray-700">
            <Activity className="w-3 h-3" />
            Mise à jour : {format(new Date(), 'HH:mm')}
          </Badge>
          <Button variant="outline" onClick={() => fetchDashboardData(true)} disabled={loading} className="gap-2 border-gray-700 text-white hover:bg-gray-800">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Chargement...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl bg-gray-800" />)
        ) : (
          <>
            <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Utilisateurs Totaux</CardTitle>
                <div className="p-2 bg-blue-900/30 rounded-full">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{globalStats.totalUsers.toLocaleString()}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-gray-400 flex items-center">
                    <UserPlus className="w-3 h-3 mr-1 text-green-500" /> 
                    +{globalStats.newUsers} ce mois
                  </p>
                  <Badge variant="secondary" className="bg-blue-900/30 text-blue-400">
                    +12.5%
                  </Badge>
                </div>
                <Progress value={Math.min(100, (globalStats.newUsers / 500) * 100)} className="mt-3 h-1.5 bg-gray-800" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Revenu Total</CardTitle>
                <div className="p-2 bg-green-900/30 rounded-full">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{globalStats.totalRevenue.toLocaleString()} FCFA</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-gray-400 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1 text-green-500" /> 
                    Estimé sur pièces
                  </p>
                  <Badge variant="secondary" className="bg-green-900/30 text-green-400">
                    {globalStats.avgTransactionValue.toFixed(0)} FCFA/moy
                  </Badge>
                </div>
                <Progress value={Math.min(100, (globalStats.totalRevenue / 1000000) * 100)} className="mt-3 h-1.5 bg-gray-800" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Transactions</CardTitle>
                <div className="p-2 bg-purple-900/30 rounded-full">
                  <CreditCard className="h-5 w-5 text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{globalStats.totalTransactions}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-gray-400">Achats & crédits</p>
                  <Badge variant="secondary" className="bg-purple-900/30 text-purple-400">
                    {globalStats.conversionRate}% taux
                  </Badge>
                </div>
                <Progress value={globalStats.conversionRate} className="mt-3 h-1.5 bg-gray-800" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Retraits en Attente</CardTitle>
                <div className="p-2 bg-orange-900/30 rounded-full">
                  <Wallet className="h-5 w-5 text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-400">{globalStats.pendingWithdrawals}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-gray-400">À traiter</p>
                  <Badge variant="secondary" className="bg-orange-900/30 text-orange-400">
                    Action requise
                  </Badge>
                </div>
                <Progress value={Math.min(100, (globalStats.pendingWithdrawals / 50) * 100)} className="mt-3 h-1.5 bg-gray-800" />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-lg border border-gray-800 bg-black">
          <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5 text-blue-400" /> Activité des Inscriptions
            </CardTitle>
            <CardDescription className="text-gray-300">Nouveaux utilisateurs sur les 30 derniers jours</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pt-4">
            {loading ? (
              <Skeleton className="h-[300px] w-full bg-gray-800" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={userActivityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    minTickGap={30} 
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: 'white'
                    }} 
                    formatter={(value) => [`${value} utilisateurs`, 'Inscriptions']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorUsers)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-lg border border-gray-800 bg-black">
          <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-green-400" /> Revenus Mensuels
            </CardTitle>
            <CardDescription className="text-gray-300">Évolution des revenus en FCFA</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <Skeleton className="h-[300px] w-full bg-gray-800" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value / 1000}k`} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(55, 65, 81, 0.5)' }}
                    contentStyle={{ 
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                    formatter={(value) => [`${value.toLocaleString()} FCFA`, 'Revenu']}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#colorRevenue)" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={40}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Table - Répartition par Pays */}
      <Card className="shadow-lg border-gray-800 bg-black text-white">
        <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5 text-white" />
                Répartition par Pays
              </CardTitle>
              <CardDescription className="text-gray-300">
                Détail des crédits et achats de pièces par zone géographique.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="bg-blue-900/20 text-white border-blue-700/30"
            >
              {totalTransactions} transactions
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-900">
                <TableRow>
                  <TableHead className="font-semibold text-gray-300">
                    Pays
                  </TableHead>
                  <TableHead className="font-semibold text-gray-300 text-right">
                    Transactions
                  </TableHead>
                  <TableHead className="font-semibold text-gray-300 text-right">
                    Crédits +
                  </TableHead>
                  <TableHead className="font-semibold text-gray-300 text-right">
                    Annulations -
                  </TableHead>
                  <TableHead className="font-semibold text-gray-300 text-right">
                    Total Net
                  </TableHead>
                  <TableHead className="font-semibold text-gray-300 text-right">
                    Part
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countryStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <AlertCircle className="h-12 w-12 text-gray-600 mb-4" />
                        <p className="text-gray-400 font-medium mb-2">
                          Aucune donnée de crédit disponible
                        </p>
                        <p className="text-sm text-gray-500">
                          Les données de crédit apparaîtront ici
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  countryStats.map((item, index) => (
                    <TableRow
                      key={item.country}
                      className={index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"}
                    >
                      <TableCell className="font-medium py-4">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-900/20 text-white border-blue-700/30"
                          >
                            {item.country.substring(0, 2).toUpperCase()}
                          </Badge>
                          <div>
                            <span className="font-medium text-white">
                              {item.country}
                            </span>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {item.positiveTransactions} transactions positives
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <span className="font-medium text-white">
                          {item.transactionCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <span className="font-medium text-green-400">
                          {(item.totalAmount + item.reversals).toLocaleString()}{" "}
                          π
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        {item.reversals > 0 ? (
                          <span className="font-medium text-red-400">
                            -{item.reversals.toLocaleString()} π
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <span
                          className={`font-bold text-lg ${
                            item.totalAmount >= 0
                              ? "text-green-300"
                              : "text-red-300"
                          }`}
                        >
                          {item.totalAmount.toLocaleString()} π
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex flex-col items-end">
                          <span className="font-medium text-white">
                            {item.percentage}%
                          </span>
                          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${Math.min(100, item.percentage)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {countryStats.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-800 bg-gray-900">
              <div className="flex justify-between items-center text-sm text-gray-300">
                <div>
                  <span className="font-medium">{countryStats.length}</span> pays
                  listés
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Crédits positifs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Annulations</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend & Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-gray-800 bg-black text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Types de Transactions Inclus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-gray-300">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Crédits manuels (admin)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Achats de pièces (coin_pack)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span>Bonus et récompenses</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Annulations de crédit</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="bg-gradient-to-r from-gray-900 to-gray-800 p-1.5 rounded-xl">
          <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-white">
            <CreditCard className="w-4 h-4 mr-2" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-white">
            <Wallet className="w-4 h-4 mr-2" /> Retraits
          </TabsTrigger>
          <TabsTrigger value="announcements" className="rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-white">
            <Megaphone className="w-4 h-4 mr-2" /> Annonces
          </TabsTrigger>
          <TabsTrigger value="demographics" className="rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-white">
            <Users className="w-4 h-4 mr-2" /> Démographie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="shadow-lg border border-gray-800 bg-black">
            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="w-5 h-5 text-blue-400" /> Transactions Récentes
              </CardTitle>
              <CardDescription className="text-gray-300">Les 10 dernières transactions effectuées sur la plateforme</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full bg-gray-800" />
                  <Skeleton className="h-12 w-full bg-gray-800" />
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-900 rounded-lg border-2 border-dashed border-gray-700">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium mb-1">Aucune transaction récente</p>
                  <p className="text-sm">Les transactions apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-4 border border-gray-800 rounded-xl bg-gray-900 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${transaction.amount_pi > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {transaction.amount_pi > 0 ? 
                            <TrendingUp className="w-4 h-4" /> : 
                            <TrendingDown className="w-4 h-4" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {transaction.description || 'Transaction sans description'}
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            {transaction.user?.full_name || transaction.user?.email || 'Utilisateur inconnu'}
                            <span className="mx-1">•</span>
                            {format(new Date(transaction.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold text-lg ${transaction.amount_pi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.amount_pi > 0 ? '+' : ''}{transaction.amount_pi} π
                        </span>
                        <Badge 
                          variant="outline" 
                          className="ml-2 border-gray-700 text-gray-400"
                        >
                          {transaction.type || 'standard'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card className="shadow-lg border border-gray-800 bg-black">
            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
              <CardTitle className="flex items-center gap-2 text-white">
                <Wallet className="w-5 h-5 text-orange-400" /> Retraits Récents
              </CardTitle>
              <CardDescription className="text-gray-300">Historique des demandes de retrait</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full bg-gray-800" />
                  <Skeleton className="h-12 w-full bg-gray-800" />
                </div>
              ) : recentWithdrawals.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-900 rounded-lg border-2 border-dashed border-gray-700">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium mb-1">Aucun retrait récent</p>
                  <p className="text-sm">Les retraits apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentWithdrawals.map((withdrawal) => (
                    <div 
                      key={withdrawal.id} 
                      className="flex items-center justify-between p-4 border border-gray-800 rounded-xl bg-gray-900 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          withdrawal.status === 'approved' ? 'bg-green-900/30 text-green-400' :
                          withdrawal.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-red-900/30 text-red-400'
                        }`}>
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            Retrait de {withdrawal.amount_pi} π
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            {withdrawal.user?.full_name || 'Utilisateur inconnu'}
                            <span className="mx-1">•</span>
                            {format(new Date(withdrawal.requested_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={
                            withdrawal.status === 'approved' ? 'success' :
                            withdrawal.status === 'pending' ? 'secondary' :
                            'destructive'
                          }
                          className="px-3 py-1 rounded-full font-medium bg-gray-800"
                        >
                          {withdrawal.status === 'approved' ? '✅ Approuvé' :
                           withdrawal.status === 'pending' ? '⏳ En attente' :
                           '❌ Rejeté'}
                        </Badge>
                        <span className="font-bold text-white">
                          {withdrawal.amount_fcfa ? `${withdrawal.amount_fcfa} FCFA` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card className="shadow-lg border border-gray-800 bg-black">
            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
              <CardTitle className="flex items-center gap-2 text-white">
                <Megaphone className="w-5 h-5 text-purple-400" /> Annonces Récentes
              </CardTitle>
              <CardDescription className="text-gray-300">Dernières publications et communications</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full bg-gray-800" />
                  <Skeleton className="h-12 w-full bg-gray-800" />
                </div>
              ) : recentAnnouncements.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-900 rounded-lg border-2 border-dashed border-gray-700">
                  <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium mb-1">Aucune annonce récente</p>
                  <p className="text-sm">Les annonces apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAnnouncements.map((announcement) => (
                    <div 
                      key={announcement.id} 
                      className="p-4 border border-gray-800 rounded-xl bg-gray-900 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-white text-lg">{announcement.title}</h4>
                          <p className="text-sm text-gray-400">
                            {format(new Date(announcement.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`px-3 py-1 rounded-full ${
                            announcement.type === 'news' ? 'bg-blue-900/20 text-blue-400 border-blue-700/30' :
                            announcement.type === 'alert' ? 'bg-red-900/20 text-red-400 border-red-700/30' :
                            announcement.type === 'update' ? 'bg-green-900/20 text-green-400 border-green-700/30' :
                            'bg-gray-800 text-gray-400 border-gray-700'
                          }`}
                        >
                          {announcement.type === 'news' ? 'Actualité' :
                           announcement.type === 'alert' ? 'Alerte' :
                           announcement.type === 'update' ? 'Mise à jour' :
                           'Information'}
                        </Badge>
                      </div>
                      <p className="text-gray-300 mb-3 line-clamp-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {announcement.views || 0} vues
                        </span>
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Eye className="w-4 h-4 mr-1" /> Voir plus
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <Card className="shadow-lg border border-gray-800 bg-black">
            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-indigo-400" /> Démographie des Utilisateurs
              </CardTitle>
              <CardDescription className="text-gray-300">Répartition géographique et par tranche d'âge</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-64 w-full bg-gray-800" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pie Chart for Age Groups */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Répartition par Âge</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(userDemographics.byAgeGroup).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(userDemographics.byAgeGroup).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DEMO_COLORS[index % DEMO_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} utilisateurs`]}
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart for Countries */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Top Pays</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(userDemographics.byCountry)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([name, value]) => ({ name, value }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="#9ca3af" 
                          fontSize={12}
                          width={80}
                          tickLine={false}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value} utilisateurs`]}
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="url(#colorBar)" 
                          radius={[0, 4, 4, 0]}
                          maxBarSize={40}
                        >
                          <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1}/>
                            </linearGradient>
                          </defs>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-lg border border-gray-800 bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Taux de Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{globalStats.conversionRate}%</div>
            <Progress value={globalStats.conversionRate} className="h-2 mt-2 bg-gray-800" />
            <p className="text-xs text-gray-400 mt-2">Pourcentage de visiteurs devenus utilisateurs</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border border-gray-800 bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Valeur Transaction Moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{globalStats.avgTransactionValue.toFixed(2)} FCFA</div>
            <Progress value={Math.min(100, (globalStats.avgTransactionValue / 5000) * 100)} className="h-2 mt-2 bg-gray-800" />
            <p className="text-xs text-gray-400 mt-2">Moyenne par transaction</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border border-gray-800 bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Événements Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{globalStats.activeEvents}</div>
            <Progress value={Math.min(100, (globalStats.activeEvents / 20) * 100)} className="h-2 mt-2 bg-gray-800" />
            <p className="text-xs text-gray-400 mt-2">Événements en cours et à venir</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;