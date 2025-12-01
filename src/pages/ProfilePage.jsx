import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useData } from "@/contexts/DataContext";
import {
  Loader2,
  Ticket,
  Coins,
  BarChart3,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfilePageContent from "@/components/profile/ProfilePageContent";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, hasFetchError: authError } = useAuth();
  const {
    userProfile,
    loadingProfile,
    getEvents,
    hasFetchError: dataContextError,
    refreshUserProfile,
    adminConfig
  } = useData();
  const [userEvents, setUserEvents] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [referralData, setReferralData] = useState({ count: 0, coins: 0 });
  const [organizerStats, setOrganizerStats] = useState(null);
  const [raffleStats, setRaffleStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalRevenue: 0,
    platformFees: 0,
    grossRevenue: 0,
    transferableRevenue: 0,
  });
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingOrganizerStats, setLoadingOrganizerStats] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'events';

  const isLoading = authLoading || loadingProfile;

  // 🔥 FONCTION CRITIQUE : Rafraîchissement forcé des stats
  const forceRefreshStats = useCallback(async () => {
    if (!user) return;
    
    console.log("🔄 Forçage du rafraîchissement des stats...");
    
    // Réinitialiser IMMÉDIATEMENT les stats côté client
    setRaffleStats({
      total: 0,
      active: 0,
      completed: 0,
      totalRevenue: 0,
      platformFees: 0,
      grossRevenue: 0,
      transferableRevenue: 0,
    });
    
    // Attendre que React mette à jour l'état, puis recharger
    setTimeout(async () => {
      try {
        console.log("📊 Rechargement des stats après transfert...");
        await fetchRaffleStats(user.id);
      } catch (error) {
        console.error("❌ Erreur rafraîchissement stats:", error);
      }
    }, 800);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel("profile-earnings-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (refreshUserProfile && typeof refreshUserProfile === 'function') {
            refreshUserProfile();
          }

          if (userProfile && payload.new.available_earnings !== userProfile.available_earnings) {
            const gain = payload.new.available_earnings - (userProfile.available_earnings || 0);
            if (gain > 0) {
              toast({
                title: "🎉 Nouveau gain !",
                description: `+${gain}π ajoutés à vos gains`,
                duration: 3000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, userProfile, refreshUserProfile, toast]);

  useEffect(() => {
    if (!user || !userProfile) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("available_earnings, coin_balance, free_coin_balance")
          .eq("id", user.id)
          .single();

        if (!error && data && userProfile) {
          if (data.available_earnings !== userProfile.available_earnings) {
            if (refreshUserProfile && typeof refreshUserProfile === 'function') {
              await refreshUserProfile();
            }
          }
        }
      } catch (error) {
        console.error("Erreur polling gains:", error);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [user, userProfile, refreshUserProfile]);

  // 🔥 FONCTION CRITIQUE : Récupération des stats AVEC filtre earnings_transferred
  const fetchRaffleStats = useCallback(async (userId) => {
    try {
      console.log("🎯 Début récupération stats tombolas pour:", userId);
      
      const { data: raffles, error } = await supabase
        .from("raffle_events")
        .select(
          `
          id,
          tickets_sold,
          calculated_price_pi,
          earnings_transferred,
          transferred_at,
          event:events!inner(
            id,
            title,
            status,
            organizer_id
          )
        `
        )
        .eq("event.organizer_id", userId);

      if (error) {
        console.error("❌ Erreur récupération tombolas:", error);
        throw error;
      }

      console.log("📦 Tombolas récupérées:", raffles?.length || 0);

      const total = raffles?.length || 0;
      const active = raffles?.filter((r) => r.event.status === "active").length || 0;
      const completed = raffles?.filter((r) => r.event.status === "completed").length || 0;

      // 🔥 FILTRE CRITIQUE : Seulement les tombolas NON TRANSFÉRÉES
      const nonTransferredRaffles = raffles?.filter(raffle => 
        raffle.earnings_transferred !== true
      ) || [];

      console.log("💰 Tombolas non transférées:", nonTransferredRaffles.length);

      // Calcul des revenus SEULEMENT sur les tombolas non transférées
      const grossRevenue = nonTransferredRaffles.reduce((sum, raffle) => {
        const ticketsSold = raffle.tickets_sold || 0;
        const pricePi = raffle.calculated_price_pi || 0;
        return sum + (ticketsSold * pricePi);
      }, 0);

      const platformFees = nonTransferredRaffles.reduce((sum, raffle) => {
        const ticketsSold = raffle.tickets_sold || 0;
        const pricePi = raffle.calculated_price_pi || 0;
        const totalSales = ticketsSold * pricePi;
        const platformFee = Math.floor(totalSales * 0.05);
        return sum + platformFee;
      }, 0);

      const totalRevenue = grossRevenue - platformFees;

      // Revenu transférable = tombolas terminées ET non transférées
      const transferableRevenue = nonTransferredRaffles
        .filter((r) => r.event.status === "completed")
        .reduce((sum, raffle) => {
          const ticketsSold = raffle.tickets_sold || 0;
          const pricePi = raffle.calculated_price_pi || 0;
          const totalSales = ticketsSold * pricePi;
          const platformFee = Math.floor(totalSales * 0.05);
          return sum + (totalSales - platformFee);
        }, 0);

      console.log("💵 Revenus calculés - Total:", totalRevenue, "Transférable:", transferableRevenue);

      setRaffleStats({
        total,
        active,
        completed,
        totalRevenue,
        platformFees,
        grossRevenue,
        transferableRevenue,
      });

    } catch (error) {
      console.error("❌ Erreur récupération stats tombolas:", error);
    }
  }, []);

  // 🔥 FONCTION CRITIQUE : Transfert automatique
  const handleTransferRevenue = async () => {
    if (!user || raffleStats.transferableRevenue <= 0) return;

    console.log("🔄 Début transfert automatique:", raffleStats.transferableRevenue);
    
    setTransferring(true);
    try {
      // 1. Mettre à jour le profil
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('available_earnings, coin_balance')
        .eq('id', user.id)
        .single();

      if (profileError) throw new Error("Erreur récupération profil");

      const newAvailableEarnings = (currentProfile.available_earnings || 0) + raffleStats.transferableRevenue;
      const newCoinBalance = (currentProfile.coin_balance || 0) + raffleStats.transferableRevenue;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          available_earnings: newAvailableEarnings,
          coin_balance: newCoinBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw new Error("Erreur mise à jour portefeuille");

      // 2. 🔥 MARQUER les tombolas terminées comme TRANSFÉRÉES
      const { data: completedRaffles, error: rafflesError } = await supabase
        .from("raffle_events")
        .select(
          `
          id,
          event:events!inner(
            id,
            status,
            organizer_id
          )
        `
        )
        .eq("event.organizer_id", user.id)
        .eq("event.status", "completed")
        .eq("earnings_transferred", false);

      if (!rafflesError && completedRaffles && completedRaffles.length > 0) {
        const raffleIds = completedRaffles.map(raffle => raffle.id);
        
        console.log("🎯 Marquage tombolas comme transférées:", raffleIds);
        
        const { error: updateRafflesError } = await supabase
          .from('raffle_events')
          .update({ 
            earnings_transferred: true,
            transferred_at: new Date().toISOString()
          })
          .in('id', raffleIds);

        if (updateRafflesError) {
          console.error("❌ Erreur marquage tombolas:", updateRafflesError);
        } else {
          console.log("✅ Tombolas marquées comme transférées");
        }
      }

      // 3. Enregistrer le transfert
      try {
        const transferRecord = {
          organizer_id: user.id,
          amount: raffleStats.transferableRevenue,
          transfer_type: 'auto_raffle_transfer',
          description: `Transfert automatique des revenus tombola - ${raffleStats.transferableRevenue} π`,
          created_at: new Date().toISOString()
        };

        const { error: transferError } = await supabase
          .from('raffle_earnings_transfers')
          .insert(transferRecord);

        if (transferError) {
          console.warn("⚠️ Erreur enregistrement transfert:", transferError.message);
        }
      } catch (recordError) {
        console.warn("⚠️ Erreur enregistrement:", recordError);
      }

      toast({
        title: "✅ Transfert réussi !",
        description: `${raffleStats.transferableRevenue}π ont été transférés vers vos gains disponibles`,
        duration: 5000,
      });

      // 4. 🔥 FORCER le rafraîchissement COMPLET
      await refreshUserProfile();
      await forceRefreshStats();

    } catch (error) {
      console.error("❌ Erreur transfert:", error);
      toast({
        title: "❌ Erreur de transfert",
        description: error.message || "Impossible de transférer les revenus",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  // 🔥 FONCTION CRITIQUE : Transfert manuel
  const handleManualTransfer = async (amount) => {
    if (!user || amount <= 0) return;

    console.log("🔄 Début transfert manuel:", amount);
    
    setTransferring(true);
    try {
      // Utiliser la fonction RPC
      const { error } = await supabase.rpc(
        'transfer_manual_raffle_earnings',
        { 
          user_id: user.id,
          amount: amount
        }
      );

      if (error) throw error;

      toast({
        title: "✅ Transfert manuel réussi !",
        description: `${amount}π ont été transférés vers vos gains disponibles`,
        duration: 5000,
      });

      // 🔥 FORCER le rafraîchissement COMPLET
      await refreshUserProfile();
      await forceRefreshStats();

    } catch (error) {
      console.error("❌ Erreur transfert manuel:", error);
      toast({
        title: "❌ Erreur de transfert",
        description: error.message || "Impossible de transférer les revenus",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const fetchPageData = useCallback(async () => {
    if (!user || !userProfile) {
      setLoadingContent(false);
      setLoadingOrganizerStats(false);
      return;
    }

    setLoadingContent(true);
    setLoadingOrganizerStats(true);
    try {
      const isOrganizer = ["organizer", "admin", "super_admin"].includes(
        userProfile.user_type
      );

      const promises = [
        getEvents({ organizer_id: user.id }),
        supabase.from("coin_spending").select("*").eq("user_id", user.id),
        supabase
          .from("user_coin_transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("transaction_type", "coin_purchase"),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .in("transaction_type", [
            "earning",
            "manual_credit",
            "credit_reversal",
          ]),
        supabase
          .from("referral_rewards")
          .select("id, referrer_reward")
          .eq("referrer_id", user.id),
        isOrganizer
          ? supabase
              .from("organizer_balances")
              .select("*")
              .eq("organizer_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ];

      const [
        eventsRes,
        spendingRes,
        purchasesRes,
        earningsRes,
        referralsRes,
        orgStatsRes,
      ] = await Promise.all(promises);

      setUserEvents(eventsRes || []);

      if (isOrganizer) {
        await fetchRaffleStats(user.id);
      }

      const allTransactions = [
        ...(spendingRes.data || []),
        ...(purchasesRes.data?.map((t) => ({
          ...t,
          transaction_type: "coin_purchase",
        })) || []),
        ...(earningsRes.data || []),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setUserTransactions(allTransactions);

      if (referralsRes.data) {
        setReferralData({
          count: referralsRes.data.length,
          coins: referralsRes.data.reduce(
            (acc, r) => acc + (r.referrer_reward || 0),
            0
          ),
        });
      }

      if (orgStatsRes.error && orgStatsRes.error.code !== "PGRST116")
        throw orgStatsRes.error;
      setOrganizerStats(orgStatsRes.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      toast({
        title: t("profile_page.loading_error_title"),
        description: t("profile_page.loading_error_desc"),
        variant: "destructive",
      });
    } finally {
      setLoadingContent(false);
      setLoadingOrganizerStats(false);
    }
  }, [user, userProfile, getEvents, fetchRaffleStats, toast, t]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast({
          title: t("profile_page.unauthorized_title"),
          description: t("profile_page.unauthorized_desc"),
          variant: "destructive",
        });
        navigate("/auth");
      } else if (userProfile) {
        fetchPageData();
      }
    }
  }, [user, authLoading, userProfile, navigate, toast, fetchPageData, t]);

  const WithdrawalCard = () => {
    if (!["organizer", "admin", "super_admin"].includes(userProfile?.user_type))
      return null;

    const availableEarnings = userProfile?.available_earnings || 0;
    const conversionRate = adminConfig?.coin_to_fcfa_rate || 10;
    const minWithdrawal = adminConfig?.min_withdrawal_pi || 50;

    const handleWithdrawal = () => {
      if (availableEarnings < minWithdrawal) {
        toast({
          title: "Montant insuffisant",
          description: `Le retrait minimum est de ${minWithdrawal}π (${
            minWithdrawal * conversionRate
          } FCFA)`,
          variant: "destructive",
        });
        return;
      }

      navigate("/profile?tab=withdrawals");
    };

    return (
      <Card className="glass-effect border-2 border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <DollarSign className="w-6 h-6 text-blue-400" />
            Retrait des Gains
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <p className="text-2xl font-bold text-blue-300">
                {availableEarnings} π
              </p>
              <p className="text-lg text-blue-200/80">
                ≈ {(availableEarnings * conversionRate).toLocaleString("fr-FR")}{ " "}
                FCFA
              </p>
              <p className="text-sm text-blue-300/60 mt-2">
                Gains disponibles pour retrait
              </p>
            </div>

            <div className="bg-amber-900/30 border border-amber-600/30 rounded-lg p-3">
              <p className="text-sm text-amber-300 text-center">
                💰 <strong>Retrait minimum : {minWithdrawal}π</strong> (
                {minWithdrawal * conversionRate} FCFA)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
                <p className="text-sm font-semibold text-blue-300">
                  Taux de conversion
                </p>
                <p className="text-lg font-bold text-blue-200">1π = {conversionRate} FCFA</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
                <p className="text-sm font-semibold text-purple-300">
                  Délai de traitement
                </p>
                <p className="text-lg font-bold text-purple-200">24-48h</p>
              </div>
            </div>

            <Button
              onClick={handleWithdrawal}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold border-2 border-blue-400/50"
              disabled={availableEarnings < minWithdrawal}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {availableEarnings >= minWithdrawal
                ? `Demander un retrait (${availableEarnings}π disponible)`
                : `Minimum ${minWithdrawal}π requis`}
            </Button>

            {availableEarnings < minWithdrawal && (
              <p className="text-xs text-center text-gray-400">
                Il vous manque {minWithdrawal - availableEarnings}π pour pouvoir
                retirer
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const RaffleStatsCard = () => {
    if (!["organizer", "admin", "super_admin"].includes(userProfile?.user_type))
      return null;

    const conversionRate = adminConfig?.coin_to_fcfa_rate || 10;

    return (
      <Card className="glass-effect border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Ticket className="w-6 h-6 text-primary" />
            Mes Tombolas - Répartition 95%/5%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
              <p className="text-2xl font-bold text-blue-600">
                {raffleStats.total}
              </p>
              <p className="text-sm text-muted-foreground font-medium">Total</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
              <p className="text-2xl font-bold text-green-600">
                {raffleStats.active}
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Actives
              </p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
              <p className="text-2xl font-bold text-purple-600">
                {raffleStats.completed}
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Terminées
              </p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                {raffleStats.totalRevenue} <Coins className="w-5 h-5" />
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Revenu Net (95%)
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {raffleStats.transferableRevenue > 0 && (
              <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                    <Coins className="w-5 h-5" />
                    Revenus Tombolas à Transférer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-green-700">
                        {raffleStats.transferableRevenue} π
                      </p>
                      <p className="text-green-600">
                        ≈{" "}
                        {(
                          raffleStats.transferableRevenue * conversionRate
                        ).toLocaleString("fr-FR")} FCFA
                      </p>
                      <p className="text-sm text-green-500 mt-1">
                        Revenus disponibles des tombolas terminées
                      </p>
                    </div>
                    <Button
                      onClick={handleTransferRevenue}
                      disabled={transferring}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {transferring ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {transferring
                        ? "Transfert en cours..."
                        : "Transférer vers mes gains"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {raffleStats.totalRevenue > 0 && (
              <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-blue-700">
                    <Coins className="w-5 h-5" />
                    Transfert Manuel du Revenu Total
                  </CardTitle>
                  <p className="text-sm text-blue-600">
                    Option alternative pour transférer l'ensemble de vos revenus tombola
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-blue-700">
                        {raffleStats.totalRevenue} π
                      </p>
                      <p className="text-blue-600">
                        ≈{" "}
                        {(
                          raffleStats.totalRevenue * conversionRate
                        ).toLocaleString("fr-FR")} FCFA
                      </p>
                      <p className="text-sm text-blue-500 mt-1">
                        Revenu net total (toutes les tombolas)
                      </p>
                    </div>
                    <Button
                      onClick={() => handleManualTransfer(raffleStats.totalRevenue)}
                      disabled={transferring}
                      variant="outline"
                      className="border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white"
                    >
                      {transferring ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      {transferring
                        ? "Transfert en cours..."
                        : "Transférer tout vers mes gains"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {raffleStats.transferableRevenue === 0 && raffleStats.completed > 0 && (
              <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Coins className="w-5 h-5" />
                    <span className="font-semibold">Revenus déjà transférés</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Vos revenus tombola ont déjà été transférés vers vos gains disponibles
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-lg mb-3 text-center text-blue-300">
              Détail de la répartition 95%/5%
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-800 rounded-lg border border-gray-600">
                <p className="text-xl font-bold text-white flex items-center justify-center gap-1">
                  {raffleStats.grossRevenue || 0}{" "}
                  <Coins className="w-4 h-4 text-yellow-400" />
                </p>
                <p className="text-sm text-gray-300">
                  Chiffre d'affaires total
                </p>
                <p className="text-xs text-gray-400">
                  ≈{" "}
                  {(raffleStats.grossRevenue * conversionRate).toLocaleString(
                    "fr-FR"
                  )} FCFA
                </p>
              </div>
              <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                <p className="text-xl font-bold text-blue-200 flex items-center justify-center gap-1">
                  {raffleStats.totalRevenue || 0}{" "}
                  <Coins className="w-4 h-4 text-blue-300" />
                </p>
                <p className="text-sm text-blue-300">Revenu organisateur</p>
                <p className="text-xs text-blue-400">95% du CA</p>
                <p className="text-xs text-blue-300/80">
                  ≈{" "}
                  {(raffleStats.totalRevenue * conversionRate).toLocaleString(
                    "fr-FR"
                  )} FCFA
                </p>
              </div>
              <div className="text-center p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
                <p className="text-xl font-bold text-purple-200 flex items-center justify-center gap-1">
                  {raffleStats.platformFees || 0}{" "}
                  <Coins className="w-4 h-4 text-purple-300" />
                </p>
                <p className="text-sm text-purple-300">Frais plateforme</p>
                <p className="text-xs text-purple-400">5% du CA</p>
                <p className="text-xs text-purple-300/80">
                  ≈{" "}
                  {(raffleStats.platformFees * conversionRate).toLocaleString(
                    "fr-FR"
                  )} FCFA
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-300">
                  Organisateur (95%)
                </span>
                <span className="text-sm font-bold text-blue-200">
                  {raffleStats.totalRevenue}π (
                  {(raffleStats.totalRevenue * conversionRate).toLocaleString(
                    "fr-FR"
                  )} FCFA)
                </span>
              </div>
              <Progress value={95} className="h-3 bg-blue-900/50" />

              <div className="flex items-center justify-between mt-3 mb-2">
                <span className="text-sm font-medium text-purple-300">
                  Plateforme (5%)
                </span>
                <span className="text-sm font-bold text-purple-200">
                  {raffleStats.platformFees}π (
                  {(raffleStats.platformFees * conversionRate).toLocaleString(
                    "fr-FR"
                  )} FCFA)
                </span>
              </div>
              <Progress value={5} className="h-3 bg-purple-900/50" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/create-raffle-event")}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Ticket className="w-4 h-4 mr-2" />
              Nouvelle Tombola
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/events")}
              className="flex-1"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Voir Les événements
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authError || dataContextError || !userProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <p className="text-destructive font-bold text-lg mb-4">
          {t("profile_page.connection_failed_title")}
        </p>
        <p className="text-muted-foreground mb-6">
          {t("profile_page.connection_failed_desc")}
        </p>
        <Button onClick={() => navigate("/auth")}>
          {t("profile_page.go_to_login")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>
          {t("profile_page.helmet_title", {
            name: userProfile.full_name || "Mon Profil",
          })}{ " "}
          - BonPlanInfos
        </title>
        <meta
          name="description"
          content={t("profile_page.helmet_desc", {
            name: userProfile.full_name,
          })}
        />
      </Helmet>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ProfileHeader />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="my-8"
        >
          <ProfileStats
            userProfile={userProfile}
            eventCount={userEvents.length}
          />
        </motion.div>

        {["organizer", "admin", "super_admin"].includes(
          userProfile?.user_type
        ) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mb-8"
          >
            <WithdrawalCard />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <RaffleStatsCard />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ProfilePageContent
            userProfile={userProfile}
            userEvents={userEvents}
            userTransactions={userTransactions}
            loadingEvents={loadingContent}
            referralData={referralData}
            organizerStats={organizerStats}
            loadingOrganizerStats={loadingOrganizerStats}
            activeTab={activeTab}
          />
        </motion.div>
      </main>
    </div>
  );
};

export default ProfilePage;