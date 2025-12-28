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
  Wallet,
  Clock,
  Lock,
  ArrowRightLeft
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
import { fetchWithRetry } from '@/lib/utils';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const {
    userProfile,
    loadingProfile,
    getEvents,
    forceRefreshUserProfile,
  } = useData();

  const [userEvents, setUserEvents] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [referralData, setReferralData] = useState({ count: 0, coins: 0 });

  const [earningsData, setEarningsData] = useState({
    raffle: [],
    vote: [],
    ticket: [],
    stand: [],
    protected: [],
    legacy_raffle: [],
  });
  const [totalPending, setTotalPending] = useState(0);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [timeoutError, setTimeoutError] = useState(false);

  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "events";
  const loadTimeoutRef = useRef(null);

  const fetchAllEventEarnings = useCallback(async () => {
    if (!user) return;
    setLoadingEarnings(true);

    try {
      const { data: pendingData, error } = await fetchWithRetry(() => supabase
        .from("organizer_earnings")
        .select("earnings_coins, transaction_type, created_at, status, id, raffle_event_id, event_type, description, amount_pi")
        .eq("organizer_id", user.id)
        .eq("status", "pending")
        .order('created_at', { ascending: false }));

      if (error) throw error;

      const newEarnings = {
        raffle: [],
        vote: [],
        ticket: [],
        stand: [],
        protected: [],
        legacy_raffle: [],
      };

      let calculatedTotal = 0;

      pendingData?.forEach((item) => {
        const amount = item.earnings_coins || 0;
        const formattedItem = {
          id: item.id,
          amount: amount,
          brut: item.amount_pi || Math.floor(amount / 0.95), 
          date: item.created_at,
          source: item.transaction_type,
          description: item.description,
          status: item.status,
        };

        calculatedTotal += amount;

        // Robust categorization logic
        const type = (item.event_type || item.transaction_type || '').toLowerCase();
        
        if (type.includes('vote')) {
          newEarnings.vote.push(formattedItem);
        } else if (type.includes('ticket') || type.includes('billeterie')) {
          newEarnings.ticket.push(formattedItem);
        } else if (type.includes('stand')) {
          newEarnings.stand.push(formattedItem);
        } else if (type.includes('protected') || type.includes('interaction') || type === 'protected_event' || type === 'event_access') {
          newEarnings.protected.push(formattedItem);
        } else if (type.includes('raffle') || type.includes('tombola')) {
          newEarnings.raffle.push(formattedItem);
        } else {
          // Default fallback to raffle/other if uncategorized but looks like raffle sale
          if (item.transaction_type === 'raffle_ticket_sale') {
             newEarnings.raffle.push(formattedItem);
          } else {
             // Generic fallback
             newEarnings.ticket.push(formattedItem);
          }
        }
      });

      setEarningsData(newEarnings);
      setTotalPending(calculatedTotal);

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
    
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      if (setIsPageLoading) {
        setTimeoutError(true);
        setIsPageLoading(false);
      }
    }, 10000);

    try {
      const [eventsRes, transRes, referralRes] = await Promise.all(
        [
          getEvents({ organizer_id: user.id }),
          fetchWithRetry(() => supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50)),
          fetchWithRetry(() => supabase
            .from("referral_rewards")
            .select("referrer_reward", { count: "exact" })
            .eq("referrer_id", user.id)),
        ]
      );

      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

      setUserEvents(eventsRes || []);
      setUserTransactions(transRes.data || []);

      if (referralRes.data) {
        const count = referralRes.count || referralRes.data.length;
        const coins = referralRes.data.reduce(
          (acc, curr) => acc + (curr.referrer_reward || 0),
          0
        );
        setReferralData({ count, coins });
      }
    } catch (e) {
      console.error("Profile page load error:", e);
      setLoadError(e.message || "Erreur de chargement");
    } finally {
      setIsPageLoading(false);
    }
  }, [user, userProfile, getEvents]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAllEventEarnings();
      fetchPageData();
    }
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [authLoading, user, fetchPageData, fetchAllEventEarnings]);

  const openDetails = (category) => {
    setSelectedCategory(category);
    setDetailsModalOpen(true);
  };

  const handleTransferRequest = (category = null) => {
    setSelectedCategory(category);
    setTransferModalOpen(true);
  };

  const confirmTransfer = async () => {
    setTransferring(true);
    try {
      // Determine event type for transfer
      let eventTypeFilter = 'all';
      if (selectedCategory === 'vote') eventTypeFilter = 'vote';
      if (selectedCategory === 'ticket') eventTypeFilter = 'ticket';
      if (selectedCategory === 'raffle') eventTypeFilter = 'raffle';
      if (selectedCategory === 'stand') eventTypeFilter = 'stand';
      if (selectedCategory === 'protected') eventTypeFilter = 'protected_event';

      console.log(`🔄 Transfert des gains (${eventTypeFilter})...`);
      
      const { data, error } = await fetchWithRetry(() => supabase.rpc("transfer_pending_earnings_with_commission", {
        p_organizer_id: user.id,
        p_event_type: eventTypeFilter
      }));

      if (error) throw error;
      
      processResult(data);

      if (typeof forceRefreshUserProfile === 'function') {
          await forceRefreshUserProfile();
      }
      
      await Promise.all([
        fetchAllEventEarnings(),
        fetchPageData()
      ]);
      
      setTransferModalOpen(false);
      
    } catch (error) {
      console.error("❌ Erreur transfert:", error);
      toast({
        title: "❌ Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const processResult = (data) => {
    if (data?.success) {
      const details = data.details || {};
      const netAmount = details.net_transferred || 0;
      
      toast({
        title: "✅ Transfert réussi",
        description: (
          <div>
            <p className="font-bold text-emerald-600">+{netAmount} π transférés</p>
            <p className="text-xs mt-1">Vos gains sont maintenant disponibles dans votre solde.</p>
          </div>
        ),
      });
    } else {
      toast({
        title: "ℹ️ Information",
        description: data?.message || "Aucun gain à transférer",
        variant: "default",
      });
    }
  };

  const handleRetry = () => {
    if (typeof forceRefreshUserProfile === 'function') forceRefreshUserProfile();
    fetchPageData();
    fetchAllEventEarnings();
  };

  const getCategorySum = (list) =>
    list.reduce((sum, item) => sum + item.amount, 0);

  const CategoryCard = ({ category, label, icon: Icon, list, colorClass, btnColor }) => {
    const sum = getCategorySum(list);
    return (
      <Card className={`border-l-4 ${colorClass} shadow-sm hover:shadow-md transition-all`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-full bg-opacity-10 ${btnColor.replace('text-', 'bg-')}`}>
                <Icon className={`w-4 h-4 ${btnColor}`} />
              </div>
              <span className="font-medium text-sm text-gray-600">{label}</span>
            </div>
            <Badge variant="secondary" className="text-xs font-normal bg-yellow-50 text-yellow-700 border-yellow-200">
              En attente
            </Badge>
          </div>
          
          <div className="flex flex-col gap-1 mt-2">
            <div className="text-2xl font-bold">{sum} <span className="text-sm font-normal text-muted-foreground">π</span></div>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => openDetails(category)}
                disabled={sum === 0}
              >
                Détails
              </Button>
              {sum > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs px-2 ml-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => handleTransferRequest(category)}
                >
                  <ArrowRightLeft className="w-3 h-3 mr-1" /> Transférer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProfileStatsSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{userProfile?.full_name || "Profil"} - BonPlanInfos</title>
      </Helmet>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <ProfileHeader />

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

        {userProfile && ["organizer", "admin", "super_admin"].includes(userProfile.user_type) && (
            <div className="mb-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="text-primary" />
                  Tableau de Bord Gains
                </h2>
                <Button onClick={() => fetchAllEventEarnings()} variant="ghost" size="icon" disabled={loadingEarnings}>
                  <RefreshCcw className={`w-4 h-4 ${loadingEarnings ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {loadingEarnings ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <Card className="border-none shadow-lg bg-gradient-to-r from-primary/90 to-primary text-primary-foreground overflow-hidden relative mb-6">
                    <div className="absolute top-0 right-0 p-10 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2 text-center md:text-left">
                          <h3 className="text-lg font-medium opacity-90 flex items-center justify-center md:justify-start gap-2">
                            <Clock className="w-5 h-5" />
                            Total Gains en Attente
                          </h3>
                          <div className="text-5xl font-bold tracking-tight">
                            {totalPending}{" "}
                            <span className="text-3xl opacity-80">π</span>
                          </div>
                          <p className="text-sm opacity-75">
                            Ces gains sont stockés temporairement. Transférez-les pour pouvoir les retirer.
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full md:w-auto">
                          <Button
                            size="lg"
                            variant="secondary"
                            className="w-full md:w-auto font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                            onClick={() => handleTransferRequest('all')}
                            disabled={totalPending === 0}
                          >
                            <Wallet className="mr-2 h-5 w-5" />
                            Tout transférer ({totalPending} π)
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <CategoryCard category="vote" label="Gains Votes" icon={Vote} list={earningsData.vote} colorClass="border-l-blue-500" btnColor="text-blue-600" />
                    <CategoryCard category="raffle" label="Gains Tombolas" icon={Ticket} list={earningsData.raffle} colorClass="border-l-purple-500" btnColor="text-purple-600" />
                    <CategoryCard category="ticket" label="Gains Billeterie" icon={Ticket} list={earningsData.ticket} colorClass="border-l-green-500" btnColor="text-green-600" />
                    <CategoryCard category="stand" label="Gains Stands" icon={Store} list={earningsData.stand} colorClass="border-l-orange-500" btnColor="text-orange-600" />
                    <CategoryCard category="protected" label="Gains Ev.Pool" icon={Lock} list={earningsData.protected} colorClass="border-l-indigo-500" btnColor="text-indigo-600" />
                  </div>
                </>
              )}
            </div>
          )}

        {isPageLoading ? (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-32 rounded-md flex-shrink-0" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
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
            // Organizer stats removed as per requirements
            loadingOrganizerStats={false}
          />
        )}
      </main>

      <EarningsDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        category={selectedCategory}
        transactions={selectedCategory ? earningsData[selectedCategory] : []}
      />
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        transactions={selectedCategory && selectedCategory !== 'all' ? earningsData[selectedCategory] : []}
        totalAmount={selectedCategory && selectedCategory !== 'all' ? getCategorySum(earningsData[selectedCategory]) : totalPending}
        loading={transferring}
        onConfirm={confirmTransfer}
      />
    </div>
  );
};

export default React.memo(ProfilePage);