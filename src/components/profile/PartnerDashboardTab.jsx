import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Users, MapPin, Calendar, Wallet, UserCog, DollarSign, Activity, AlertTriangle, Building, Lock, Unlock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatCurrencySimple } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useWalletSecurity } from '@/hooks/useWalletSecurity';
import PinVerificationModal from '@/components/common/PinVerificationModal';

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

  const { isWalletUnlocked, showPinModal, openPinModal, closePinModal, unlockWallet } = useWalletSecurity(user?.id);

  const fetchDashboardData = useCallback(async () => {
    if (!userProfile?.country || !user?.id) return;
    
    setLoading(true);
    try {
      const country = userProfile.country;

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

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('country', country);
        
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('country', country)
        .eq('is_active', true);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('country', country)
        .gte('created_at', startOfMonth.toISOString());

      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('country', country);
        
      const { count: activeEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('country', country)
        .eq('status', 'active');

      const { count: totalVenues } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('country', country);

      const { data: withdrawalData } = await supabase
        .from('organizer_withdrawal_requests')
        .select('id, organizer:organizer_id!inner(country)')
        .eq('status', 'pending')
        .eq('organizer.country', country);
        
      const pendingWithdrawals = withdrawalData?.length || 0;

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
          <p>Votre profil n'est pas associé à une zone. Veuillez contacter le support.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {!isWalletUnlocked && (
        <Alert className="bg-blue-500/10 border-blue-500/50">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Zone Sécurisée</AlertTitle>
          <AlertDescription className="text-blue-700 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Certaines données financières et de gestion sont masquées pour votre sécurité.</span>
            <Button size="sm" variant="outline" className="bg-white text-blue-700" onClick={openPinModal}>
              <Unlock className="w-3 h-3 mr-1" /> Déverrouiller
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                  {isWalletUnlocked ? formatCurrencySimple(zoneStats.currentSalary) : '***'}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        </div>

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
            <PartnerOverviewStats stats={zoneStats} loading={loading} isUnlocked={isWalletUnlocked} />
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
            {!isWalletUnlocked ? (
              <Card className="p-12 text-center flex flex-col items-center">
                <Lock className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-bold mb-2">Gestion des retraits verrouillée</h3>
                <p className="text-muted-foreground mb-6">Veuillez déverrouiller votre portefeuille pour valider les retraits.</p>
                <Button onClick={openPinModal}>Déverrouiller</Button>
              </Card>
            ) : (
              <PartnerWithdrawalQueue country={userProfile.country} />
            )}
          </TabsContent>
          
          <TabsContent value="secretaries">
            <PartnerSecretaryManager country={userProfile.country} />
          </TabsContent>
          
          <TabsContent value="salary">
            {!isWalletUnlocked ? (
              <Card className="p-12 text-center flex flex-col items-center">
                <Lock className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-bold mb-2">Historique de salaire masqué</h3>
                <Button onClick={openPinModal}>Déverrouiller</Button>
              </Card>
            ) : (
              <PartnerSalaryHistory userId={user.id} currentSalary={zoneStats.currentSalary} />
            )}
          </TabsContent>
        </div>
      </Tabs>

      <PinVerificationModal 
        isOpen={showPinModal}
        onClose={closePinModal}
        onSuccess={unlockWallet}
        userId={user?.id}
        userProfile={user?.user_metadata}
      />
    </div>
  );
};

export default PartnerDashboardTab;