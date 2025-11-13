import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, TrendingUp, Coins, RefreshCw, BarChart3, Activity, Star, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AnalyticsDashboard = () => {
  const { getAnalyticsData } = useData();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');

  const processData = useCallback((data) => {
    if (!data) return null;
    const { users, transactions, events, totalSpent, totalPurchased, adminCredits } = data;
    
    const totalUsers = users?.length || 0;
    const payingUsers = new Set(transactions?.map(t => t.user_id)).size;
    
    const revenueByCountry = adminCredits?.reduce((acc, log) => {
        const country = log.target_user?.country || 'Inconnu';
        const amount = log.details?.amount || 0;
        if (!acc[country]) {
            acc[country] = 0;
        }
        acc[country] += amount;
        return acc;
    }, {});

    const userActivity = events?.reduce((acc, e) => {
        const date = new Date(e.created_at).toISOString().split('T')[0];
        if(!acc[date]) {
            acc[date] = { date, eventsCreated: 0 };
        }
        acc[date].eventsCreated++;
        return acc;
    }, {});

    const userDemographics = users?.reduce((acc, u) => {
        if (u.country) acc.byCountry[u.country] = (acc.byCountry[u.country] || 0) + 1;
        if (u.city) acc.byCity[u.city] = (acc.byCity[u.city] || 0) + 1;
        return acc;
    }, { byCountry: {}, byCity: {} });
    
    return {
        totalUsers,
        payingUsers,
        totalRevenue: transactions?.reduce((sum, t) => sum + t.amount_fcfa, 0) || 0,
        conversionRate: totalUsers > 0 ? ((payingUsers / totalUsers) * 100).toFixed(2) : 0,
        revenueByCountry: Object.entries(revenueByCountry || {}).map(([country, revenue]) => ({ country, revenue })),
        userActivity: Object.values(userActivity || {}).sort((a,b) => new Date(a.date) - new Date(b.date)),
        userDemographics,
        totalSpent,
        totalPurchased,
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAnalyticsData(dateRange);
        setAnalyticsData(processData(data));
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        toast({ title: "Erreur de chargement des analytiques", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, getAnalyticsData, processData]);


  if (loading) {
    return <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-primary" /></div>;
  }

  if (!analyticsData) {
    return <div className="text-center p-8 text-gray-400">Aucune donnée analytique disponible</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Analytiques Globales</h2>
        <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">3 derniers mois</SelectItem>
                <SelectItem value="1y">Cette année</SelectItem>
            </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-blue-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">{analyticsData.totalUsers}</p><p className="text-xs text-gray-400">Utilisateurs</p></CardContent></Card>
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20"><CardContent className="p-4 text-center"><UserCheck className="w-6 h-6 text-green-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">{analyticsData.payingUsers}</p><p className="text-xs text-gray-400">Clients payants</p></CardContent></Card>
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20"><CardContent className="p-4 text-center"><TrendingUp className="w-6 h-6 text-yellow-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">{analyticsData.conversionRate}%</p><p className="text-xs text-gray-400">Taux de conversion</p></CardContent></Card>
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20"><CardContent className="p-4 text-center"><Coins className="w-6 h-6 text-purple-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">{analyticsData.totalRevenue.toLocaleString()} FCFA</p><p className="text-xs text-gray-400">Revenu total</p></CardContent></Card>
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20"><CardContent className="p-4 text-center"><ShoppingBag className="w-6 h-6 text-indigo-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">{analyticsData.totalPurchased?.toLocaleString() || 0} π</p><p className="text-xs text-gray-400">Pièces Achetées</p></CardContent></Card>
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20"><CardContent className="p-4 text-center"><ShoppingCart className="w-6 h-6 text-rose-400 mx-auto mb-1" /><p className="text-lg font-bold text-white">{analyticsData.totalSpent?.toLocaleString() || 0} π</p><p className="text-xs text-gray-400">Pièces Dépensées</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-primary" /> Revenu par Pays (Pièces créditées)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.revenueByCountry}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="country" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                <Bar dataKey="revenue" name="Pièces créditées" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center"><Activity className="w-5 h-5 mr-2 text-primary" /> Activité des utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.userActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                <Legend />
                <Line type="monotone" dataKey="eventsCreated" name="Événements créés" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-effect shadow-lg rounded-xl border-primary/20 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center"><Star className="w-5 h-5 mr-2 text-primary" /> Démographie des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Par Pays</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={Object.entries(analyticsData.userDemographics.byCountry).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {Object.entries(analyticsData.userDemographics.byCountry).map((entry, index) => <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff8042'][index % 4]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Par Ville (Top 5)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={Object.entries(analyticsData.userDemographics.byCity).sort((a,b) => b[1] - a[1]).slice(0,5).map(([name, value]) => ({ name, value }))}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;