import React, { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useData } from "@/contexts/DataContext";
import {
  Loader2,
  Ticket,
  BarChart3,
  Vote,
  Store,
  RefreshCcw,
  AlertCircle,
  ArrowRight,
  Clock,
  Wallet
} from "lucide-react";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfilePageContent from "@/components/profile/ProfilePageContent";
import EarningsDetailsModal from "@/components/profile/EarningsDetailsModal";
import TransferModal from "@/components/profile/TransferModal";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const {
    userProfile,
    loadingProfile,
    getEvents,
    refreshUserProfile,
    adminConfig,
    forceRefreshUserProfile
  } = useData();
  
  // --- Local State ---
  const [userEvents, setUserEvents] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [referralData, setReferralData] = useState({ count: 0, coins: 0 });
  const [organizerStats, setOrganizerStats] = useState(null);
  
  // Earnings State
  const [earningsData, setEarningsData] = useState({
    raffle: [],
    vote: [],
    ticket: [],
    stand: [],
    legacy_raffle: [] // Special case for legacy structure
  });
  const [totalPending, setTotalPending] = useState(0);

  // Modal States
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Loading & Error States
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [timeoutError, setTimeoutError] = useState(false);
  
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'events';
  
  // Timeout Ref
  const loadTimeoutRef = useRef(null);

  // --- Fetching Logic ---

  const fetchAllEventEarnings = useCallback(async () => {
    if (!user) return;
    setLoadingEarnings(true);
    
    try {
      // Parallel Fetching of Earnings Data
      const [pendingRes, rafflesRes] = await Promise.all([
        supabase
          .from('organizer_earnings')
          .select('earnings_coins, transaction_type, created_at, status, id')
          .eq('organizer_id', user.id)
          .eq('status', 'pending'),
        
        supabase
          .from("raffle_events")
          .select("id, calculated_price_pi, tickets_sold, earnings_transferred, created_at")
          .eq("organizer_id", user.id)
          .eq("status", "completed")
          .eq("earnings_transferred", false)
      ]);

      if (pendingRes.error) throw pendingRes.error;
      if (rafflesRes.error) throw rafflesRes.error;

      const newEarnings = {
        raffle: [],
        vote: [],
        ticket: [],
        stand: [],
        legacy_raffle: []
      };

      let calculatedTotal = 0;

      // Process standard pending earnings
      pendingRes.data?.forEach(item => {
        const amount = item.earnings_coins || 0;
        const formattedItem = {
            id: item.id,
            amount: amount,
            date: item.created_at,
            source: item.transaction_type,
            status: item.status
        };

        calculatedTotal += amount;
        
        if (item.transaction_type === 'vote' || item.transaction_type === 'vote_participation') newEarnings.vote.push(formattedItem);
        else if (item.transaction_type === 'ticket_sale' || item.transaction_type === 'ticket_purchase') newEarnings.ticket.push(formattedItem);
        else if (item.transaction_type === 'stand_rental') newEarnings.stand.push(formattedItem);
        else if (item.transaction_type === 'raffle_participation' || item.transaction_type === 'raffle_ticket') newEarnings.raffle.push(formattedItem);
      });

      // Process legacy raffle earnings
      rafflesRes.data?.forEach(r => {
        const gross = (r.tickets_sold || 0) * (r.calculated_price_pi || 0);
        const net = Math.floor(gross * 0.95);
        if (net > 0) {
            calculatedTotal += net;
            newEarnings.raffle.push({
                id: r.id,
                amount: net,
                date: r.created_at,
                source: 'Tombola terminée (Legacy)',
                status: 'pending'
            });
            newEarnings.legacy_raffle.push(r.id); // Keep track for specific transfer call if needed
        }
      });

      setEarningsData(newEarnings);
      setTotalPending(calculatedTotal);

      // Console Logs as requested
      console.log(`Pending Tombolas: ${newEarnings.raffle.reduce((sum, i) => sum + i.amount, 0)}`);
      console.log(`Pending Votes: ${newEarnings.vote.reduce((sum, i) => sum + i.amount, 0)}`);
      console.log(`Pending Billetterie: ${newEarnings.ticket.reduce((sum, i) => sum + i.amount, 0)}`);
      console.log(`Pending Stands: ${newEarnings.stand.reduce((sum, i) => sum + i.amount, 0)}`);
      console.log(`Total pending: ${calculatedTotal}`);

    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoadingEarnings(false);
    }
  }, [user]);

  const fetchPageData = useCallback(async () => {
    if (!user) return;
    
    setIsPageLoading(true);
    setLoadError(null);
    setTimeoutError(false);
    console.time("profilePageLoad");

    // 10 Second Timeout Logic
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
        if (setIsPageLoading) { 
            setTimeoutError(true);
            setIsPageLoading(false);
            console.warn("Profile load timed out");
        }
    }, 10000);

    try {
        const isOrganizer = userProfile && ["organizer", "admin", "super_admin"].includes(userProfile.user_type);
        
        // Parallel Fetching of all page data
        const [eventsRes, transRes, orgStatsRes, referralRes] = await Promise.all([
            getEvents({ organizer_id: user.id }), 
            supabase.from("transactions").select("*").eq("user_id", user.id).order('created_at', { ascending: false }).limit(50),
            isOrganizer ? supabase.from("organizer_balances").select("*").eq("organizer_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
            supabase.from("referral_rewards").select("referrer_reward", { count: 'exact' }).eq("referrer_id", user.id)
        ]);

        // Clear timeout on success
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

        setUserEvents(eventsRes || []);
        setUserTransactions(transRes.data || []);
        setOrganizerStats(orgStatsRes.data);
        
        if (referralRes.data) {
            const count = referralRes.count || referralRes.data.length;
            const coins = referralRes.data.reduce((acc, curr) => acc + (curr.referrer_reward || 0), 0);
            setReferralData({ count, coins });
        }

    } catch(e) { 
        console.error("Profile page load error:", e);
        setLoadError(e.message || "Erreur de chargement");
    } finally { 
        setIsPageLoading(false);
        console.timeEnd("profilePageLoad");
    }
  }, [user, userProfile, getEvents]);

  // --- Effects ---

  useEffect(() => {
    if (!authLoading && user) {
        fetchAllEventEarnings();
        fetchPageData();
    }
    return () => {
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [authLoading, user, fetchPageData, fetchAllEventEarnings]);

  // --- Handlers ---

  const openDetails = (category) => {
      setSelectedCategory(category);
      setDetailsModalOpen(true);
  };

  const handleTransferRequest = () => {
      setTransferModalOpen(true);
  };

  const confirmTransfer = async () => {
    setTransferring(true);
    try {
      console.log("Transfer request created");
      
      // Transfer Standard Pending Earnings
      const { data, error } = await supabase.rpc('transfer_pending_earnings', {
          p_organizer_id: user.id,
          p_event_type: 'all'
      });
      
      if (error) throw error;

      // Transfer Legacy Raffle Earnings if any
      if (earningsData.legacy_raffle.length > 0) {
         await supabase.rpc('transfer_raffle_earnings');
      }

      if (data.success || earningsData.legacy_raffle.length > 0) {
           toast({ 
               title: "Transfert réussi", 
               description: `Vos gains ont été transférés vers votre solde disponible.` 
           });
      } else {
          toast({ title: "Info", description: "Aucun nouveau gain à transférer." });
      }

      await refreshUserProfile();
      await fetchAllEventEarnings(); // Refresh local state
      setTransferModalOpen(false);

    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  const handleRetry = () => {
      forceRefreshUserProfile();
      fetchPageData();
      fetchAllEventEarnings();
  };

  // --- Helpers ---
  const getCategorySum = (list) => list.reduce((sum, item) => sum + item.amount, 0);

  // --- Render Components ---

  const CategoryButton = ({ category, label, icon: Icon, list, colorClass }) => (
      <Button
          variant="outline"
          className={`h-auto py-3 px-4 flex flex-col items-start gap-1 border-l-4 ${colorClass} hover:bg-muted/50 transition-all w-full`}
          onClick={() => openDetails(category)}
      >
          <div className="flex justify-between w-full items-center">
              <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
              </div>
              <Badge variant="outline" className="text-xs font-normal bg-yellow-50 text-yellow-700 border-yellow-200">
                  En attente
              </Badge>
          </div>
          <div className="text-xl font-bold mt-1">
              {getCategorySum(list)} π
          </div>
      </Button>
  );

  const ProfileStatsSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
    </div>
  );

  if (authLoading) {
      return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{userProfile?.full_name || 'Profil'} - BonPlanInfos</title>
      </Helmet>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <ProfileHeader />
        
        {/* Error / Timeout Feedback */}
        {(loadError || timeoutError) && (
            <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Problème de chargement</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>
                        {timeoutError 
                            ? "Le chargement prend trop de temps. Vérifiez votre connexion." 
                            : "Une erreur est survenue lors du chargement des données."}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleRetry} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Réessayer
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <div className="my-8">
            {loadingProfile ? (
                <ProfileStatsSkeleton />
            ) : (
                <ProfileStats userProfile={userProfile} eventCount={userEvents.length} />
            )}
        </div>

        {/* Earnings Dashboard for Organizers */}
        {userProfile && ["organizer", "admin", "super_admin"].includes(userProfile.user_type) && (
            <div className="mb-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="text-primary" />
                        Tableau de Bord Revenus
                    </h2>
                    <Button onClick={() => fetchAllEventEarnings()} variant="ghost" size="icon" disabled={loadingEarnings}>
                        <RefreshCcw className={`w-4 h-4 ${loadingEarnings ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {loadingEarnings ? (
                    <div className="space-y-4">
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* New Hero Section: Total Pending */}
                        <Card className="border-none shadow-lg bg-gradient-to-r from-primary/90 to-primary text-primary-foreground overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-10 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="space-y-2 text-center md:text-left">
                                        <h3 className="text-lg font-medium opacity-90 flex items-center justify-center md:justify-start gap-2">
                                            <Clock className="w-5 h-5" />
                                            Total en attente de transfert
                                        </h3>
                                        <div className="text-5xl font-bold tracking-tight">
                                            {totalPending} <span className="text-3xl opacity-80">π</span>
                                        </div>
                                        <p className="text-sm opacity-75">
                                            ≈ {(totalPending * (adminConfig?.coin_to_fcfa_rate || 10)).toLocaleString()} FCFA
                                        </p>
                                        
                                        {/* Breakdown Text */}
                                        <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-xs opacity-80 mt-2 pt-2 border-t border-white/20">
                                            <span>Tombolas: {getCategorySum(earningsData.raffle)}π</span>
                                            <span>Votes: {getCategorySum(earningsData.vote)}π</span>
                                            <span>Billetterie: {getCategorySum(earningsData.ticket)}π</span>
                                            <span>Stands: {getCategorySum(earningsData.stand)}π</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 w-full md:w-auto">
                                        <Button 
                                            size="lg" 
                                            variant="secondary"
                                            className="w-full md:w-auto font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                            onClick={handleTransferRequest}
                                            disabled={totalPending === 0}
                                        >
                                            <Wallet className="mr-2 h-5 w-5" />
                                            Demander le transfert
                                        </Button>
                                        <p className="text-[10px] text-center opacity-60 max-w-[200px]">
                                            Transfère les gains vers votre solde disponible pour retrait.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Buttons Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <CategoryButton 
                                category="raffle" 
                                label="Tombolas" 
                                icon={Ticket} 
                                list={earningsData.raffle} 
                                colorClass="border-l-purple-500" 
                            />
                            <CategoryButton 
                                category="vote" 
                                label="Votes" 
                                icon={Vote} 
                                list={earningsData.vote} 
                                colorClass="border-l-blue-500" 
                            />
                            <CategoryButton 
                                category="ticket" 
                                label="Billetterie" 
                                icon={Ticket} 
                                list={earningsData.ticket} 
                                colorClass="border-l-green-500" 
                            />
                            <CategoryButton 
                                category="stand" 
                                label="Stands" 
                                icon={Store} 
                                list={earningsData.stand} 
                                colorClass="border-l-orange-500" 
                            />
                        </div>
                    </>
                )}
            </div>
        )}

        {isPageLoading ? (
             <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-32 rounded-md flex-shrink-0" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
                </div>
             </div>
        ) : (
            <ProfilePageContent 
                userProfile={userProfile} 
                userEvents={userEvents} 
                userTransactions={userTransactions}
                loadingEvents={isPageLoading} 
                referralData={referralData}
                activeTab={activeTab}
                organizerStats={organizerStats}
                loadingOrganizerStats={isPageLoading}
            />
        )}
      </main>

      {/* Modals */}
      <EarningsDetailsModal 
        isOpen={detailsModalOpen} 
        onClose={() => setDetailsModalOpen(false)} 
        category={selectedCategory} 
        transactions={selectedCategory ? earningsData[selectedCategory] : []} 
      />

      <TransferModal 
        isOpen={transferModalOpen} 
        onClose={() => setTransferModalOpen(false)} 
        onConfirm={confirmTransfer} 
        totalAmount={totalPending}
        loading={transferring}
      />

    </div>
  );
};

export default React.memo(ProfilePage);