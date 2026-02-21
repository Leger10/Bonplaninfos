import React, { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useData } from "@/contexts/DataContext";
import {
  Loader2,
  Clock,
  Wallet,
  Percent,
  AlertCircle,
  Coins,
  ArrowRight,
  LogIn
} from "lucide-react";

import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfilePageContent from "@/components/profile/ProfilePageContent";
import TransferModal from "@/components/profile/TransferModal";
import CoinTransferModal from "@/components/profile/CoinTransferModal";
import TransferHistory from "@/components/profile/TransferHistory";

import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { fetchWithRetry } from "@/lib/utils";
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, session } = useAuth();
  const {
    userProfile,
    getEvents,
    forceRefreshUserProfile,
  } = useData();
  const navigate = useNavigate();

  const [userEvents, setUserEvents] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [totalPending, setTotalPending] = useState(0);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [coinTransferModalOpen, setCoinTransferModalOpen] = useState(false);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);

  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "events";

  // Redirection de sécurité si pas de session
  useEffect(() => {
    if (!authLoading && (!user || !session)) {
        const timer = setTimeout(() => {
            navigate('/auth?redirect=/profile');
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [user, session, authLoading, navigate]);

  /* ===================== GAINS EN ATTENTE ===================== */
  const fetchAllEventEarnings = useCallback(async () => {
    if (!user || !session) return;

    try {
      const { data, error } = await fetchWithRetry(() =>
        supabase
          .from("organizer_earnings")
          .select("earnings_coins")
          .eq("organizer_id", user.id)
          .eq("status", "pending")
      );

      if (error) throw error;

      const total = (data || []).reduce((sum, item) => sum + Number(item.earnings_coins || 0), 0);
      setTotalPending(total);
    } catch (err) {
      console.error("[ProfilePage] Error fetching earnings:", err);
      setTotalPending(0);
    }
  }, [user, session]);

  /* ===================== PAGE DATA ===================== */
  const fetchPageData = useCallback(async () => {
    if (!user || !session) return;

    setIsPageLoading(true);

    try {
      const [eventsRes, transRes] = await Promise.all([
        getEvents({ organizer_id: user.id }),
        fetchWithRetry(() =>
          supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50)
        ),
      ]);

      if (transRes.error) console.error("Transaction fetch error:", transRes.error);
      setUserTransactions(transRes.data || []);
      setUserEvents(eventsRes || []);
    } catch (e) {
      console.error("Critical Error:", e);
      setUserEvents([]);
      setUserTransactions([]);
    } finally {
      setIsPageLoading(false);
    }
  }, [user, session, getEvents]);

  useEffect(() => {
    if (!authLoading && user && session) {
      fetchAllEventEarnings();
      fetchPageData();
    }
  }, [authLoading, user, session, fetchAllEventEarnings, fetchPageData]);

  const handleGlobalRefresh = async () => {
    if (!user) return;
    await Promise.all([
      forceRefreshUserProfile(),
      fetchAllEventEarnings(),
      fetchPageData()
    ]);
    setRefreshHistoryTrigger(prev => prev + 1);
  };

  /* ===================== TRANSFERT EARNINGS -> AVAILABLE ===================== */
  const confirmTransfer = async () => {
    if (!user || !session) {
        toast({ title: "Erreur", description: "Session expirée", variant: "destructive" });
        return;
    }
    
    setTransferring(true);
    try {
      // Appel de la fonction RPC sécurisée avec le bon paramètre
      const { data, error } = await supabase.rpc('transfer_pending_earnings_to_available', {
        p_user_id: user.id
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message || "Erreur lors du transfert");
      }

      toast({ 
        title: "Succès du transfert", 
        description: `Brut: ${data.total_gross}π | Frais: ${data.platform_fee}π | Net ajouté: ${data.total_net}π`, 
        className: "bg-green-600 text-white" 
      });

      await handleGlobalRefresh();
      setTransferModalOpen(false);
    } catch (err) {
      console.error("Transfer error:", err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10" /></div>;
  }

  // Affichage si non connecté (Fallback)
  if (!user || !session) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
              <div className="text-center space-y-4 max-w-md">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                  <h1 className="text-2xl font-bold">Connexion requise</h1>
                  <p className="text-muted-foreground">Votre session a expiré ou vous n'êtes pas connecté. Veuillez vous reconnecter pour accéder à votre profil.</p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                      <LogIn className="mr-2 h-4 w-4" /> Se connecter
                  </Button>
              </div>
          </div>
      );
  }

  const pendingFee = Math.ceil(totalPending * 0.05);
  const pendingNet = totalPending - pendingFee;
  const balanceCfa = (userProfile?.coin_balance || 0) * COIN_TO_FCFA_RATE;

  return (
    <div className="min-h-screen pb-20">
      <Helmet><title>{userProfile?.full_name || "Profil"}</title></Helmet>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <ProfileHeader user={userProfile} />
        <ProfileStats userProfile={userProfile} eventCount={userEvents.length} />

        {/* --- SECTION SOLDE PIÈCES --- */}
        <Card className="mt-6 border-l-4 border-l-blue-500 shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-blue-900">
                    <Coins className="w-6 h-6 text-blue-600" />
                    Mon Solde de Pièces
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <div className="text-3xl font-extrabold text-blue-700">
                            {userProfile?.coin_balance || 0} <span className="text-lg text-blue-500">pièces</span>
                        </div>
                        <p className="text-sm font-semibold text-blue-600">
                            ≈ {balanceCfa.toLocaleString()} FCFA
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Pièces achetées ou gagnées, utilisables pour événements ou convertibles en gains.
                        </p>
                    </div>
                    
                    {userProfile?.coin_balance > 0 && (
                        <Button 
                            onClick={() => setCoinTransferModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                        >
                            Transférer les pièces <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* --- SECTION GAINS EN ATTENTE (ORGANISATEUR) --- */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock /> Gains en attente de transfert
              </h2>
              <Badge variant="outline" className="flex items-center gap-1">
                <Percent className="w-3 h-3" /> Frais: 5%
              </Badge>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-sm sm:text-base">
                <span className="text-gray-500">Total en attente:</span>
                <span className="font-bold">{totalPending} pièces ({(totalPending * COIN_TO_FCFA_RATE).toLocaleString()} F)</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Net à recevoir:</span>
                <span className="text-2xl font-bold text-green-600">{pendingNet} pièces ({(pendingNet * COIN_TO_FCFA_RATE).toLocaleString()} F)</span>
              </div>
            </div>

            <Button
              onClick={() => setTransferModalOpen(true)}
              disabled={!totalPending || totalPending <= 0 || transferring}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {transferring ? <Loader2 className="animate-spin mr-2" /> : <Wallet className="mr-2" />}
              {totalPending > 0 ? "Transférer vers mon portefeuille" : "Aucun gain à transférer"}
            </Button>
            
            {totalPending === 0 && (
              <Alert className="mt-4 bg-gray-50 border-gray-200">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <AlertTitle className="text-gray-600">Aucun gain en attente</AlertTitle>
                <AlertDescription className="text-gray-500">
                  Les revenus de vos événements terminés apparaîtront ici.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* --- HISTORIQUE DES TRANSFERTS (NOUVEAU) --- */}
        <TransferHistory refreshTrigger={refreshHistoryTrigger} />

        {/* --- RESTE DU CONTENU --- */}
        <div className="mt-8">
            <ProfilePageContent
            userProfile={userProfile}
            userEvents={userEvents}
            userTransactions={userTransactions}
            activeTab={activeTab}
            />
        </div>
      </main>

      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        totalAmount={totalPending}
        totalNetAmount={pendingNet}
        loading={transferring}
        onConfirm={confirmTransfer}
      />

      <CoinTransferModal 
        isOpen={coinTransferModalOpen}
        onClose={() => setCoinTransferModalOpen(false)}
        balance={userProfile?.coin_balance || 0}
        onSuccess={handleGlobalRefresh}
      />
    </div>
  );
};

export default React.memo(ProfilePage);