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
  ArrowRightLeft,
  Percent,
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
import { fetchWithRetry } from "@/lib/utils";

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

  /* ===================== GAINS EN ATTENTE ===================== */
  const fetchAllEventEarnings = useCallback(async () => {
    if (!user) return;
    setLoadingEarnings(true);

    try {
      const { data, error } = await fetchWithRetry(() =>
        supabase
          .from("organizer_earnings")
          .select(
            "id, earnings_coins, transaction_type, created_at, status, event_type, description, fee_percent, platform_fee"
          )
          .eq("organizer_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      );

      if (error) throw error;

      const next = {
        raffle: [],
        vote: [],
        ticket: [],
        stand: [],
        protected: [],
      };

      let total = 0;

      data.forEach((e) => {
        const amount = Number(e.earnings_coins || 0);
        total += amount;

        const item = {
          id: e.id,
          amount,
          date: e.created_at,
          description: e.description,
          fee_percent: e.fee_percent || 5,
          platform_fee: e.platform_fee || 0,
        };

        const type = (e.event_type || e.transaction_type || "").toLowerCase();

        if (type.includes("vote")) next.vote.push(item);
        else if (type.includes("ticket")) next.ticket.push(item);
        else if (type.includes("stand")) next.stand.push(item);
        else if (type.includes("protected")) next.protected.push(item);
        else next.raffle.push(item);
      });

      setEarningsData(next);
      setTotalPending(total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEarnings(false);
    }
  }, [user]);

  /* ===================== PAGE DATA ===================== */
  const fetchPageData = useCallback(async () => {
    if (!user) return;

    setIsPageLoading(true);
    setLoadError(null);
    setTimeoutError(false);

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

      setUserEvents(eventsRes || []);
      setUserTransactions(transRes.data || []);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setIsPageLoading(false);
    }
  }, [user, getEvents]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAllEventEarnings();
      fetchPageData();
    }
  }, [authLoading, user]);

  /* ===================== TRANSFERT VERS AVAILABLE_EARNINGS ===================== */
  const confirmTransfer = async () => {
    setTransferring(true);

    try {
      // 1. Récupérer les gains en attente
      const { data: earnings, error: earningsError } = await supabase
        .from("organizer_earnings")
        .select("id, earnings_coins, fee_percent, platform_fee")
        .eq("organizer_id", user.id)
        .eq("status", "pending");

      if (earningsError) throw earningsError;
      if (!earnings.length) throw new Error("Aucun gain en attente");

      // 2. Calculer le total brut
      const totalGross = earnings.reduce((sum, e) => sum + Number(e.earnings_coins || 0), 0);
      
      // 3. Calculer les frais de plateforme (5%)
      const platformFeePercent = 5;
      const platformFee = Math.ceil(totalGross * (platformFeePercent / 100));
      
      // 4. Calculer le montant net (après déduction des frais)
      const totalNet = totalGross - platformFee;

      console.log("Transfert détail:", {
        totalGross,
        platformFee,
        totalNet,
        platformFeePercent
      });

      const ids = earnings.map((e) => e.id);
      const now = new Date().toISOString();

      // 5. Mettre à jour le statut des gains (de pending à paid)
      const { error: updateError } = await supabase
        .from("organizer_earnings")
        .update({ 
          status: "paid", 
          paid_at: now,
          platform_fee: platformFee,
          fee_percent: platformFeePercent
        })
        .in("id", ids);

      if (updateError) throw updateError;

      // 6. Récupérer le profil actuel pour obtenir le solde available_earnings
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("available_earnings")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // 7. Calculer le nouveau solde available_earnings
      const currentAvailableEarnings = Number(profile.available_earnings || 0);
      const newAvailableEarnings = currentAvailableEarnings + totalNet;

      console.log("Mise à jour available_earnings:", {
        current: currentAvailableEarnings,
        added: totalNet,
        new: newAvailableEarnings
      });

      // 8. Mettre à jour available_earnings (le portefeuille de retraits)
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ 
          available_earnings: newAvailableEarnings
        })
        .eq("id", user.id);

      if (profileUpdateError) throw profileUpdateError;

      // 9. Créer une transaction pour le transfert NET vers available_earnings
      const { error: transferTransactionError } = await supabase.from("transactions").insert({
        user_id: user.id,
        transaction_type: "earnings_transfer_to_wallet",
        amount_pi: totalNet, // Montant NET transféré vers available_earnings
        amount_fcfa: totalNet * 5,
        status: "completed",
        created_at: now,
        description: `Transfert gains vers portefeuille de retraits (après ${platformFeePercent}% frais)`,
        metadata: {
          total_gross: totalGross,
          platform_fee: platformFee,
          fee_percent: platformFeePercent,
          total_net: totalNet,
          source: "pending_earnings",
          destination: "available_earnings",
          earning_ids: ids,
          earning_count: earnings.length
        }
      });

      if (transferTransactionError) throw transferTransactionError;

      // 10. Créer une transaction pour les frais de plateforme
      const { error: feeTransactionError } = await supabase.from("transactions").insert({
        user_id: user.id,
        transaction_type: "platform_fee",
        amount_pi: -platformFee, // Montant négatif pour les frais
        amount_fcfa: -platformFee * 5,
        status: "completed",
        created_at: now,
        description: `Frais de plateforme ${platformFeePercent}% sur transfert gains`,
        metadata: {
          original_amount: totalGross,
          net_amount: totalNet,
          fee_percent: platformFeePercent,
          source: "organizer_earnings_transfer",
          deducted_from: "pending_earnings"
        }
      });

      if (feeTransactionError) throw feeTransactionError;

      // 11. Optionnel: Essayer d'enregistrer dans platform_commissions si la table existe
      try {
        const { error: checkError } = await supabase
          .from("platform_commissions")
          .select("id")
          .limit(1);

        if (!checkError) {
          await supabase.from("platform_commissions").insert({
            amount_coins: platformFee,
            source_type: "organizer_earnings_transfer",
            source_id: user.id,
            user_id: user.id,
            fee_percent: platformFeePercent,
            created_at: now,
            description: `Frais sur transfert gains vers available_earnings`,
            metadata: {
              total_gross: totalGross,
              total_net: totalNet,
              earning_ids: ids
            }
          });
        }
      } catch (tableError) {
        console.warn("Table platform_commissions non disponible:", tableError);
        // On continue sans erreur
      }

      // 12. Rafraîchir les données
      await Promise.all([
        fetchAllEventEarnings(),
        fetchPageData(),
        forceRefreshUserProfile?.(),
      ]);

      setTransferModalOpen(false);

      toast({
        title: "✅ Transfert réussi",
        description: `${totalNet} pièces transférées vers votre portefeuille de retraits (après déduction de ${platformFee} pièces de frais - ${platformFeePercent}%)`,
        className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
      });
    } catch (err) {
      console.error("Transfer error:", err);
      toast({
        title: "❌ Erreur lors du transfert",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  // Calcul des montants pour l'affichage
  const feeAmount = Math.ceil(totalPending * 0.05);
  const netAmount = totalPending - feeAmount;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{userProfile?.full_name || "Profil"}</title>
      </Helmet>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <ProfileHeader />

        <ProfileStats
          userProfile={userProfile}
          eventCount={userEvents.length}
        />

        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock /> Gains en attente de transfert
              </h2>
              <Badge variant="outline" className="flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Frais: 5%
              </Badge>
            </div>

            {/* Montants détaillés */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total en attente:</span>
                <span className="text-2xl font-bold">{totalPending} pièces</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Frais de plateforme (5%):</span>
                <span className="text-xl font-bold text-amber-600">-{feeAmount} pièces</span>
              </div>
              
              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Net vers votre portefeuille:</span>
                  <span className="text-3xl font-bold text-green-500">{netAmount} pièces</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Ce montant sera ajouté à votre <strong>portefeuille de retraits</strong> ({userProfile?.available_earnings || 0} pièces actuellement)
                </p>
              </div>
            </div>

            <Button
              onClick={() => setTransferModalOpen(true)}
              disabled={!totalPending || transferring}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {transferring ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Transfert en cours...
                </>
              ) : (
                <>
                  <Wallet className="mr-2" />
                  Transférer vers mon portefeuille
                </>
              )}
            </Button>
            
            {totalPending === 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Aucun gain en attente</AlertTitle>
                <AlertDescription>
                  Vos gains futurs apparaîtront ici une fois vos événements terminés.
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-4 text-sm text-gray-500">
              <p className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Les frais de 5% sont prélevés par la plateforme pour les frais de service.
              </p>
            </div>
          </CardContent>
        </Card>

        <ProfilePageContent
          userProfile={userProfile}
          userEvents={userEvents}
          userTransactions={userTransactions}
          activeTab={activeTab}
        />
      </main>

      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        totalAmount={totalPending}
        loading={transferring}
        onConfirm={confirmTransfer}
        feePercent={5}
        destinationWallet="available_earnings"
        currentWalletBalance={userProfile?.available_earnings || 0}
      />
    </div>
  );
};

export default React.memo(ProfilePage);