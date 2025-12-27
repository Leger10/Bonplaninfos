import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, MapPin, Calendar, Wallet, UserCog, DollarSign, Activity, AlertTriangle, Building } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatCurrencySimple } from '@/lib/utils';

// Sub-components
import PartnerOverviewStats from './partner/PartnerOverviewStats';
import PartnerSecretaryManager from './partner/PartnerSecretaryManager';
import PartnerWithdrawalQueue from './partner/PartnerWithdrawalQueue';
import PartnerZoneEvents from './partner/PartnerZoneEvents';
import PartnerZoneUsers from './partner/PartnerZoneUsers';
import PartnerZoneVenues from './partner/PartnerZoneVenues';
import PartnerSalaryHistory from './partner/PartnerSalaryHistory';
import PartnerContractCard from './partner/PartnerContractCard';

const PartnerDashboardTab = () => {
  const { user } = useAuth();
  const { userProfile } = useData();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [partnerData, setPartnerData] = useState(null);
  const [zoneStats, setZoneStats] = useState({
    usersCount: 0,
    activeUsers: 0,
    newUsers: 0,
    eventsCount: 0,
    activeEvents: 0,
    venuesCount: 0,
    pendingWithdrawals: 0,
    currentSalary: 0
  });

  const fetchDashboardData = useCallback(async () => {
    // Critical fix: Check if user exists before accessing user.id
    if (!userProfile?.country || !user?.id) return;
    
    setLoading(true);
    try {
      const country = userProfile.country;

      // 0. Fetch Partner Record for Contract Info
      const { data: partnerRecord } = await supabase
        .from('partners')
        .select(`
          *,
          partner_licenses:license_id (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      setPartnerData(partnerRecord);

      // 1. Users Stats
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('country', country);
        
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('country', country)
        .eq('is_active', true);

      // New users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('country', country)
        .gte('created_at', startOfMonth.toISOString());

      // 2. Events Stats
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('country', country);
        
      const { count: activeEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('country', country)
        .eq('status', 'active');

      // 3. Venues Stats
      const { count: totalVenues } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('country', country);

      // 4. Pending Withdrawals
      const { data: withdrawalData } = await supabase
        .from('organizer_withdrawal_requests')
        .select('id, organizer:organizer_id!inner(country)')
        .eq('status', 'pending')
        .eq('organizer.country', country);
        
      const pendingWithdrawals = withdrawalData?.length || 0;

      // 5. Calculate estimated salary
      const { data: salaryData } = await supabase
        .rpc('get_admin_salary_stats', { p_admin_id: user.id });

      setZoneStats({
        usersCount: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsers: newUsers || 0,
        eventsCount: totalEvents || 0,
        activeEvents: activeEvents || 0,
        venuesCount: totalVenues || 0,
        pendingWithdrawals,
        currentSalary: salaryData?.total_salary_fcfa || 0
      });

    } catch (error) {
      console.error("Error fetching partner dashboard data:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.country, user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, user]);

  // Critical fix: Handle null user state to prevent crash
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile?.country) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center text-red-700">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-bold">Configuration incomplète</h3>
          <p>Votre profil n'est pas associé à une zone (pays). Veuillez contacter le support.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Contract Info */}
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border-blue-400/30">
                    <MapPin className="w-3 h-3 mr-1" /> Zone : {userProfile.country}
                  </Badge>
                  <Badge variant="outline" className="text-white border-white/30">
                    Espace Partenaire
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold">Tableau de Bord DG</h1>
                <p className="text-blue-200 text-sm mt-1">
                  Pilotez votre zone, gérez vos équipes et suivez la rentabilité.
                </p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-xs text-blue-300 uppercase font-bold tracking-wider">Salaire estimé (Mois)</p>
                <div className="text-3xl font-bold text-white flex items-center justify-end gap-1">
                  {formatCurrencySimple(zoneStats.currentSalary)}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        </div>

        {/* Contract Details Card */}
        {partnerData && (
          <PartnerContractCard partner={partnerData} onRenew={fetchDashboardData} />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 h-auto p-1 bg-muted/50 rounded-xl gap-1">
          <TabsTrigger value="overview" className="rounded-lg py-2 text-xs md:text-sm">
            <Activity className="w-4 h-4 mr-2 hidden md:inline" /> Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg py-2 text-xs md:text-sm">
            <Users className="w-4 h-4 mr-2 hidden md:inline" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg py-2 text-xs md:text-sm">
            <Calendar className="w-4 h-4 mr-2 hidden md:inline" /> Événements
          </TabsTrigger>
          <TabsTrigger value="venues" className="rounded-lg py-2 text-xs md:text-sm">
            <Building className="w-4 h-4 mr-2 hidden md:inline" /> Lieux
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="rounded-lg py-2 text-xs md:text-sm">
            <Wallet className="w-4 h-4 mr-2 hidden md:inline" /> Retraits
            {zoneStats.pendingWithdrawals > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white rounded-full text-[10px]">
                {zoneStats.pendingWithdrawals}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="secretaries" className="rounded-lg py-2 text-xs md:text-sm">
            <UserCog className="w-4 h-4 mr-2 hidden md:inline" /> Secrétaires
          </TabsTrigger>
          <TabsTrigger value="salary" className="rounded-lg py-2 text-xs md:text-sm">
            <DollarSign className="w-4 h-4 mr-2 hidden md:inline" /> Salaire
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <PartnerOverviewStats stats={zoneStats} loading={loading} />
          </TabsContent>
          
          <TabsContent value="users">
            <PartnerZoneUsers country={userProfile.country} />
          </TabsContent>
          
          <TabsContent value="events">
            <PartnerZoneEvents country={userProfile.country} />
          </TabsContent>

          <TabsContent value="venues">
            <PartnerZoneVenues country={userProfile.country} />
          </TabsContent>
          
          <TabsContent value="withdrawals">
            <PartnerWithdrawalQueue country={userProfile.country} />
          </TabsContent>
          
          <TabsContent value="secretaries">
            <PartnerSecretaryManager country={userProfile.country} />
          </TabsContent>
          
          <TabsContent value="salary">
            <PartnerSalaryHistory userId={user.id} currentSalary={zoneStats.currentSalary} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default PartnerDashboardTab;