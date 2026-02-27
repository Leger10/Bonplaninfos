import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Vote,
  Coins,
  Plus,
  Minus,
  ShoppingCart,
  Trophy,
  Crown,
  Eye,
  BarChart3,
  UserCircle,
  Target,
  Share2,
  Filter,
  Lock,
  Printer,
  Award,
  Search,
  Calendar,
  Info,
  ChevronDown,
  Flame,
  Sparkles,
  Rocket,
  Zap,
  TrendingUp,
  Star,
  Medal,
  Gem,
  Heart,
  ThumbsUp,
  Gift,
  PartyPopper,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import WalletInfoModal from "@/components/WalletInfoModal";
import jsPDF from "jspdf";
import Confetti from "react-confetti";

const Separator = ({
  className = "",
  orientation = "horizontal",
  ...props
}) => (
  <div
    className={`${orientation === "horizontal" ? "w-full h-[1px]" : "h-full w-[1px]"} bg-gray-700 ${className}`}
    {...props}
  />
);

// Service pour créer des transactions sécurisées
const TransactionService = {
  async createTransaction(transactionData) {
    try {
      if (
        transactionData.amount_pi === undefined ||
        transactionData.amount_pi === null
      ) {
        throw new Error("amount_pi est requis pour une transaction");
      }

      if (!transactionData.user_id) {
        throw new Error("user_id est requis pour une transaction");
      }

      const safeTransactionData = {
        user_id: transactionData.user_id,
        event_id: transactionData.event_id || null,
        transaction_type: transactionData.transaction_type || "unknown",
        amount_pi: Number(transactionData.amount_pi) || 0,
        amount_fcfa:
          transactionData.amount_fcfa !== undefined
            ? Number(transactionData.amount_fcfa)
            : Math.abs(Number(transactionData.amount_pi)) * 5,
        description: transactionData.description || "",
        status: transactionData.status || "completed",
        payment_gateway_data: transactionData.payment_gateway_data || null,
        created_at: transactionData.created_at || new Date().toISOString(),
        completed_at: transactionData.completed_at || null,
        city: transactionData.city || null,
        region: transactionData.region || null,
        country: transactionData.country || null,
        metadata: transactionData.metadata || {},
        amount_coins:
          transactionData.amount_coins ||
          Math.abs(Number(transactionData.amount_pi)),
      };

      const { data, error } = await supabase
        .from("transactions")
        .insert(safeTransactionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("TransactionService.createTransaction error:", error);
      throw error;
    }
  },

  async createVoteTransaction(
    userId,
    eventId,
    voteCost,
    candidateId,
    options = {},
  ) {
    const {
      voteType = "vote_purchase",
      platformFeePercent = 5,
      description = "Achat de vote",
    } = options;

    const platformFee = Math.ceil(voteCost * (platformFeePercent / 100));
    const netCost = voteCost - platformFee;

    return await this.createTransaction({
      user_id: userId,
      event_id: eventId,
      transaction_type: voteType,
      amount_pi: -voteCost,
      amount_fcfa: -voteCost * 5,
      description: `${description} - Candidat ID: ${candidateId}`,
      status: "completed",
      metadata: {
        platform_fee: platformFee,
        fee_percent: platformFeePercent,
        net_cost: netCost,
        candidate_id: candidateId,
        source: "vote",
        timestamp: new Date().toISOString(),
      },
    });
  },
};

// Composant pour les messages motivants
const MotivationalMessage = ({
  type,
  rank,
  timeLeft,
}) => {
  const messages = {
    cart: [
      {
        icon: <Rocket className="w-5 h-5 text-orange-500" />,
        text: "🚀 Propulsez votre candidat vers la victoire ! Chaque voix compte !",
      },
      {
        icon: <Target className="w-5 h-5 text-red-500" />,
        text: "🎯 Objectif : Faire de votre candidat le numéro 1 ! Voter maintenant !",
      },
      {
        icon: <Flame className="w-5 h-5 text-yellow-500" />,
        text: "🔥 Le pouvoir est entre vos mains ! Multipliez les voix pour un impact maximal !",
      },
      {
        icon: <Zap className="w-5 h-5 text-purple-500" />,
        text: "⚡ Plus vous votez, plus votre candidat gagne en puissance !",
      },
      {
        icon: <Gift className="w-5 h-5 text-pink-500" />,
        text: "🎁 Offrez le cadeau de la victoire à votre candidat préféré !",
      },
    ],
    rankBased: [
      {
        rank: 1,
        icon: <Crown className="w-5 h-5 text-yellow-500" />,
        text: "👑 Votre candidat est en tête ! Consolidez sa position avec plus de votes !",
      },
      {
        rank: 2,
        icon: <Target className="w-5 h-5 text-blue-500" />,
        text: "🎯 À seulement quelques voix de la première place ! Chaque vote vous rapproche du sommet !",
      },
      {
        rank: 3,
        icon: <Medal className="w-5 h-5 text-amber-700" />,
        text: "🥉 Le podium est à portée de main ! Un effort supplémentaire et vous gravissez les marches !",
      },
      {
        rank: "top5",
        icon: <TrendingUp className="w-5 h-5 text-green-500" />,
        text: "📈 Vous êtes dans le top 5 ! Continuez sur cette lancée pour atteindre le podium !",
      },
      {
        rank: "other",
        icon: <Rocket className="w-5 h-5 text-gray-500" />,
        text: "💫 Tout est possible ! Une remontée spectaculaire commence par un premier vote !",
      },
    ],
    approachingEnd: [
      {
        days: 0,
        hours: 24,
        icon: <Flame className="w-5 h-5 text-red-500" />,
        text: "🔥 DERNIÈRE LIGNE DROITE ! 24h pour faire la différence !",
      },
      {
        days: 0,
        hours: 12,
        icon: <Zap className="w-5 h-5 text-yellow-500" />,
        text: "⚡ 12h restantes ! C'est le moment de frapper fort !",
      },
      {
        days: 0,
        hours: 6,
        icon: <PartyPopper className="w-5 h-5 text-purple-500" />,
        text: "🎉 Sprint final ! Chaque seconde compte pour la victoire !",
      },
      {
        days: 0,
        hours: 1,
        icon: <Rocket className="w-5 h-5 text-orange-500" />,
        text: "🚀 ULTIME CHARGE ! 60 minutes pour changer le cours de l'histoire !",
      },
    ],
  };

  let selectedMessage;

  if (type === "cart") {
    selectedMessage =
      messages.cart[Math.floor(Math.random() * messages.cart.length)];
  } else if (type === "rank") {
    if (rank === 1)
      selectedMessage = messages.rankBased.find((m) => m.rank === 1);
    else if (rank === 2)
      selectedMessage = messages.rankBased.find((m) => m.rank === 2);
    else if (rank === 3)
      selectedMessage = messages.rankBased.find((m) => m.rank === 3);
    else if (rank <= 5)
      selectedMessage = messages.rankBased.find((m) => m.rank === "top5");
    else selectedMessage = messages.rankBased.find((m) => m.rank === "other");
  } else if (type === "deadline") {
    if (timeLeft) {
      if (timeLeft.days === 0 && timeLeft.hours <= 1)
        selectedMessage = messages.approachingEnd.find((m) => m.hours === 1);
      else if (timeLeft.days === 0 && timeLeft.hours <= 6)
        selectedMessage = messages.approachingEnd.find((m) => m.hours === 6);
      else if (timeLeft.days === 0 && timeLeft.hours <= 12)
        selectedMessage = messages.approachingEnd.find((m) => m.hours === 12);
      else if (timeLeft.days === 0 && timeLeft.hours <= 24)
        selectedMessage = messages.approachingEnd.find((m) => m.hours === 24);
    }
  }

  if (!selectedMessage) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`bg-gradient-to-r ${getGradientByType(type, rank)} p-3 rounded-lg mb-4 border border-opacity-30 flex items-center gap-2`}
    >
      <div className="flex-shrink-0">{selectedMessage.icon}</div>
      <p className="text-sm font-medium flex-1">{selectedMessage.text}</p>
    </motion.div>
  );
};

const getGradientByType = (type, rank) => {
  if (type === "cart")
    return "from-purple-900/30 to-pink-900/30 border-purple-500/30";
  if (type === "rank") {
    if (rank === 1)
      return "from-yellow-900/30 to-amber-900/30 border-yellow-500/30";
    if (rank === 2)
      return "from-gray-700/30 to-slate-900/30 border-gray-500/30";
    if (rank === 3)
      return "from-orange-900/30 to-red-900/30 border-orange-500/30";
    return "from-blue-900/30 to-indigo-900/30 border-blue-500/30";
  }
  if (type === "deadline")
    return "from-red-900/40 to-orange-900/40 border-red-500/40 animate-pulse";
  return "from-gray-800 to-gray-900 border-gray-700";
};

const CountdownTimer = ({ endDate, onTimerEnd }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });
  const [showUrgency, setShowUrgency] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!endDate) return;

      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
        });
        setShowUrgency(false);
        if (onTimerEnd) onTimerEnd();
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });

      setShowUrgency(days === 0 && hours <= 24);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endDate, onTimerEnd]);

  if (timeLeft.expired)
    return (
      <div className="text-center py-4 bg-gradient-to-r from-red-900/50 to-red-800/30 border border-red-700/50 rounded-xl">
        <p className="text-red-300 font-bold text-lg">
          🎉 Le vote est terminé !
        </p>
      </div>
    );

  return (
    <motion.div
      animate={
        showUrgency
          ? {
              scale: [1, 1.02, 1],
              transition: { repeat: Infinity, duration: 2 },
            }
          : {}
      }
      className={`text-center py-4 ${showUrgency ? "bg-gradient-to-r from-red-900/40 to-orange-900/40 border-red-700/50" : "bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border-blue-700/30"} border rounded-xl`}
    >
      <h3 className="font-bold text-lg mb-3 flex items-center justify-center gap-2">
        {showUrgency ? (
          <>
            <Flame className="w-5 h-5 text-red-400 animate-pulse" />
            <span className="text-red-300">DERNIÈRE LIGNE DROITE !</span>
            <Flame className="w-5 h-5 text-red-400 animate-pulse" />
          </>
        ) : (
          <>
            <Target className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300">Temps restant</span>
          </>
        )}
      </h3>
      <div className="flex justify-center gap-2">
        {[
          { v: timeLeft.days, l: "J" },
          { v: timeLeft.hours, l: "H" },
          { v: timeLeft.minutes, l: "M" },
          { v: timeLeft.seconds, l: "S" },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            animate={
              showUrgency && item.l === "H"
                ? {
                    scale: [1, 1.1, 1],
                    transition: { repeat: Infinity, duration: 1 },
                  }
                : {}
            }
            className={`bg-gradient-to-b ${showUrgency ? "from-red-600 to-orange-500" : "from-blue-600 to-cyan-500"} p-3 rounded-xl shadow-lg min-w-[60px]`}
          >
            <div className="text-2xl font-bold text-white">{item.v}</div>
            <div className="text-xs text-white/80">{item.l}</div>
          </motion.div>
        ))}
      </div>
      {showUrgency && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-300 mt-2 font-semibold"
        >
          ⚡ Plus que {timeLeft.hours}h
          {timeLeft.minutes > 0 ? ` ${timeLeft.minutes}min` : ""} pour faire la
          différence !
        </motion.p>
      )}
    </motion.div>
  );
};

const CandidateCard = ({
  candidate,
  totalVotes,
  votePrice,
  onVote,
  isFinished,
  isSelected,
  onSelect,
  event,
  rank,
  isClosed,
  allCandidates,
}) => {
  const [voteCount, setVoteCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    onConfirm: null,
  });
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [candidateVoteCount, setCandidateVoteCount] = useState(
    candidate.vote_count || 0,
  );
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  const votePercentage =
    totalVotes > 0 ? ((candidateVoteCount || 0) / totalVotes) * 100 : 0;
  const totalCostPi = voteCount * votePrice;

  const isVotingLocked = isFinished || isClosed;

  useEffect(() => {
    setCandidateVoteCount(candidate.vote_count || 0);
  }, [candidate.vote_count]);

  const getRankInfo = () => {
    if (!allCandidates || allCandidates.length === 0)
      return { gapToNext: null };

    const sortedCandidates = [...allCandidates].sort(
      (a, b) => (b.vote_count || 0) - (a.vote_count || 0),
    );
    const index = sortedCandidates.findIndex((c) => c.id === candidate.id);

    if (index === -1) return { gapToNext: null };

    const gapToNext =
      index > 0
        ? (sortedCandidates[index - 1]?.vote_count || 0) -
          (candidateVoteCount || 0)
        : null;

    return { gapToNext };
  };

  const { gapToNext } = getRankInfo();

  const handleVote = async () => {
    if (isVotingLocked) {
      toast({
        title: "Votes fermés",
        description: isFinished
          ? "Les votes sont terminés."
          : "Les ventes sont actuellement fermées.",
        variant: "destructive",
      });
      return;
    }

    setConfirmation({ isOpen: false, onConfirm: null });
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      if ((userData?.coin_balance || 0) < totalCostPi) {
        setShowWalletInfo(true);
        setLoading(false);
        return;
      }

      const platformFeePercent = 5;
      const platformFee = Math.ceil(totalCostPi * (platformFeePercent / 100));
      const netAmount = totalCostPi - platformFee;

      const newBalance = (userData.coin_balance || 0) - totalCostPi;
      const { error: debitError } = await supabase
        .from("profiles")
        .update({ coin_balance: newBalance })
        .eq("id", user.id);

      if (debitError) throw debitError;

      await TransactionService.createVoteTransaction(
        user.id,
        event.id,
        totalCostPi,
        candidate.id,
        {
          description: `Vote pour ${candidate.name}`,
        },
      );

      const { data: existingVote, error: checkError } = await supabase
        .from("user_votes")
        .select("vote_count, vote_cost_pi, net_to_organizer, fees")
        .eq("user_id", user.id)
        .eq("candidate_id", candidate.id)
        .eq("event_id", event.id)
        .maybeSingle();

      const existingVoteCount = existingVote?.vote_count || 0;
      const existingCost = existingVote?.vote_cost_pi || 0;
      const existingNet = existingVote?.net_to_organizer || 0;
      const existingFees = existingVote?.fees || 0;

      const totalVoteCount = existingVoteCount + voteCount;
      const totalCost = existingCost + totalCostPi;
      const totalNetAmount = existingNet + netAmount;
      const totalFees = existingFees + platformFee;

      const { error: voteError } = await supabase.from("user_votes").upsert(
        {
          user_id: user.id,
          candidate_id: candidate.id,
          event_id: event.id,
          vote_count: totalVoteCount,
          vote_cost_pi: totalCost,
          vote_cost_fcfa: totalCost * 5,
          net_to_organizer: totalNetAmount,
          fees: totalFees,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "event_id, candidate_id, user_id",
        },
      );

      if (voteError) throw voteError;

      const newVoteCount = candidateVoteCount + voteCount;
      setCandidateVoteCount(newVoteCount);

      const { error: updateError } = await supabase
        .from("candidates")
        .update({ vote_count: newVoteCount })
        .eq("id", candidate.id);

      if (updateError) throw updateError;

      const { data: eventData } = await supabase
        .from("events")
        .select("organizer_id, title")
        .eq("id", event.id)
        .single();

      if (eventData?.organizer_id) {
        const { data: organizerProfile } = await supabase
          .from("profiles")
          .select("available_earnings")
          .eq("id", eventData.organizer_id)
          .single();

        if (organizerProfile) {
          const newEarnings =
            (organizerProfile.available_earnings || 0) + netAmount;

          await supabase
            .from("profiles")
            .update({
              available_earnings: newEarnings,
            })
            .eq("id", eventData.organizer_id);
        }

        await supabase.from("organizer_earnings").insert({
          organizer_id: eventData.organizer_id,
          event_id: event.id,
          earnings_coins: netAmount,
          transaction_type: "vote",
          fee_percent: platformFeePercent,
          platform_fee: platformFee,
          status: "pending",
          created_at: new Date().toISOString(),
          description: `Gains de vote: ${candidate.name} - ${eventData.title} (${voteCount} voix)`,
        });

        await TransactionService.createTransaction({
          user_id: eventData.organizer_id,
          event_id: event.id,
          transaction_type: "vote_earnings",
          amount_pi: netAmount,
          amount_fcfa: netAmount * 5,
          description: `Gains de vote: ${candidate.name}`,
          status: "completed",
          metadata: {
            candidate_id: candidate.id,
            candidate_name: candidate.name,
            gross_amount: totalCostPi,
            platform_fee: platformFee,
            fee_percent: platformFeePercent,
            net_amount: netAmount,
            source: "vote_earnings",
            vote_count: voteCount,
            is_cumulative: true,
          },
        });
      }

      toast({
        title: "🎉 Vote enregistré !",
        description: `Vous avez ajouté ${voteCount} voix à ${candidate.name}. Total: ${totalVoteCount} voix.`,
        className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white",
      });

      if (onVote) onVote();
    } catch (error) {
      console.error("Vote error:", error);
      toast({
        title: "❌ Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();

    const eventName = event?.title || "ce concours";
    const candidateName = candidate.name;

    let urgentMessage = "";
    if (rank === 1) {
      urgentMessage =
        "👑 Je suis 1er pour l'instant ! Mais l'écart est mince...";
    } else if (rank === 2) {
      const gapToFirst =
        allCandidates?.find((c) => c.vote_count > candidate.vote_count)
          ?.vote_count - candidate.vote_count || 0;
      urgentMessage = `🎯 À seulement ${gapToFirst} voix de la 1ère place ! Chaque vote peut faire basculer le résultat !`;
    } else if (rank === 3) {
      urgentMessage =
        "🥉 Je tiens le podium mais ça chauffe derrière ! J'ai besoin de vous !";
    } else {
      urgentMessage = `💪 Je suis ${rank}e/${allCandidates?.length || 0} et je compte sur vous pour remonter ! Rien n'est joué !`;
    }

const shareText = `🔥 URGENT - ${candidateName} a BESOIN DE VOUS dans ${eventName} !\n\n${urgentMessage}\n\n🚨 Chaque seconde compte ! VOTER MAINTENANT 👇\n${window.location.href}\n\n💰 1 pièce = 10 FCFA seulement\n⚡ 1 VOIX = 1 CHANCE DE GAGNER !\n💪 FAITES LA DIFFÉRENCE !\n\n🙏 Merci pour votre soutien précieux !`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Votez pour ${candidateName} ! 🗳️`,
          text: shareText,
          url: window.location.href,
        });
        toast({
          title: "📢 Merci du partage !",
          description: `Vous venez d'offrir une chance à ${candidateName} de gagner plus de voix !`,
          className:
            "bg-gradient-to-r from-green-600 to-emerald-600 text-white",
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          navigator.clipboard.writeText(
            shareText + "\n\n" + window.location.href,
          );
          toast({
            title: "📋 Lien copié !",
            description:
              "Collez-le dans vos stories ou messages pour soutenir votre candidat !",
            className:
              "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
          });
        }
      }
    } else {
      navigator.clipboard.writeText(shareText + "\n\n" + window.location.href);
      toast({
        title: "📋 Lien copié !",
        description:
          "Partagez-le maintenant sur WhatsApp, Facebook ou Instagram !",
        className: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
      });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        className={`bg-gradient-to-br from-gray-900 to-gray-800 border ${isSelected ? "border-emerald-500 ring-2 ring-emerald-500/50" : "border-gray-700"} rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/50 transition-all cursor-pointer`}
        onClick={() => setShowDetails(true)}
      >
        {candidate.category && candidate.category !== "Général" && (
          <div className="absolute top-0 right-0 z-10">
            <Badge
              variant="secondary"
              className="bg-emerald-900/80 text-emerald-200 border-0 rounded-bl-xl rounded-tr-none text-[10px] px-2"
            >
              {candidate.category}
            </Badge>
          </div>
        )}

        {rank === 1 && (
          <div className="absolute -top-1 -left-1 z-10">
            <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-br-lg shadow-lg flex items-center">
              <Crown className="w-3 h-3 mr-1" /> LEADER
            </div>
          </div>
        )}

        {rank === 2 && (
         <div className="absolute -top-1 -left-1 z-10">
  <div className="bg-purple-700 text-white text-xs font-bold px-2 py-1 rounded-br-lg shadow-lg flex items-center">
    <Target className="w-3 h-3 mr-1" /> CHASSEUR
  </div>
</div>
        )}

        {rank === 3 && (
          <div className="absolute -top-1 -left-1 z-10">
            <div className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-br-lg shadow-lg flex items-center">
              <Medal className="w-3 h-3 mr-1" /> PODIUM
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 mb-3 mt-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500/50 cursor-pointer shrink-0 shadow-lg group-hover:shadow-emerald-900/50 transition-all">
              <img
                src={candidate.photo_url || "/api/placeholder/64/64"}
                alt={candidate.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullPhoto(true);
                }}
              />
            </div>
            {rank <= 3 && (
              <div
                className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-gray-900
                  ${rank === 1 ? "bg-yellow-500 text-black" : rank === 2 ? "bg-gray-400 text-gray-900" : "bg-orange-600 text-white"}`}
              >
                {rank}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-white truncate pr-2 cursor-pointer hover:text-emerald-400 transition-colors">
                {candidate.name}
              </h4>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(true);
                  }}
                >
                  <Eye className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1 text-emerald-400">
                <span className="font-semibold">{candidateVoteCount} voix</span>
                <span>{votePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(5, votePercentage)}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-1.5 rounded-full ${rank === 1 ? "bg-yellow-500" : "bg-emerald-500"}`}
                />
              </div>
            </div>
          </div>
        </div>

        {!isVotingLocked ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-gray-800 p-1.5 rounded-lg border border-gray-700/50">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:text-emerald-400"
                onClick={() => setVoteCount((v) => Math.max(1, v - 1))}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="text-white font-bold font-mono text-lg min-w-[2ch] text-center">
                {voteCount}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:text-emerald-400"
                onClick={() => setVoteCount((v) => v + 1)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
              <Button
                onClick={() => {
                  onSelect(candidate, voteCount);
                  toast({
                    title: "✅ Ajouté au panier",
                    description: (
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">
                          {voteCount} voix pour {candidate.name}
                        </span>
                        <span className="text-xs opacity-90">
                          👍 Vous pouvez ajouter d'autres candidats
                        </span>
                      </div>
                    ),
                    className:
                      "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
                  });
                }}
                variant="outline"
                size="sm"
                className="col-span-4 text-[11px] sm:text-xs bg-transparent border-gray-600 hover:bg-gray-800 hover:text-white px-1 py-1.5 group relative"
                title="Ajouter au panier pour voter pour plusieurs candidats"
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:mr-1 group-hover:scale-110 transition-transform" />
                <span className="ml-0.5 sm:ml-1">📦</span>
                <span className="hidden sm:inline ml-1">Panier</span>
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="col-span-3 text-xs bg-transparent border-gray-600 hover:bg-gray-800 hover:text-white p-0 group relative"
                title="Partager pour mobiliser vos amis"
              >
                <Share2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="sr-only">Partager</span>
              </Button>

              <Button
                onClick={() =>
                  setConfirmation({ isOpen: true, onConfirm: handleVote })
                }
                disabled={loading}
                size="sm"
                className={`col-span-5 text-[11px] sm:text-xs text-white border-0 shadow-lg relative overflow-hidden group/vote
                  ${
                    rank === 1
                      ? "bg-yellow-600 hover:bg-yellow-700 shadow-yellow-900/20"
                      : rank === 2
                        ? "bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 shadow-gray-900/20"
                        : rank === 3
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-orange-900/20"
                          : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-900/20"
                  }`}
                title={`Voter ${voteCount} fois pour ${candidate.name}`}
              >
                {loading ? (
                  <Loader2 className="animate-spin w-3 h-3" />
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-1 group-hover/vote:animate-pulse" />
                    <span className="font-bold mr-0.5">{voteCount}</span>
                    <span className="text-[9px] sm:text-[10px] opacity-90">
                      voix
                    </span>
                    <span className="ml-1 text-[9px] opacity-75">
                      ({totalCostPi}⚡)
                    </span>
                  </>
                )}
              </Button>
            </div>

            {!isVotingLocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-400"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-purple-900/30 flex items-center justify-center">
                    <span className="text-purple-400 text-[10px] font-bold">
                      1
                    </span>
                  </div>
                  <span>Clique sur Panier</span>
                </div>
                <div className="w-4 h-[2px] bg-gray-700"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-purple-900/30 flex items-center justify-center">
                    <span className="text-purple-400 text-[10px] font-bold">
                      2
                    </span>
                  </div>
                  <span>📦 Tes candidats au choix</span>
                </div>
                <div className="w-4 h-[2px] bg-gray-700"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-purple-900/30 flex items-center justify-center">
                    <span className="text-purple-400 text-[10px] font-bold">
                      3
                    </span>
                  </div>
                  <span>💳 Ajoute+ et Payer</span>
                </div>
              </motion.div>
            )}

          {rank === 2 && gapToNext && (
  <motion.p
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="text-[11px] text-blue-400 mt-2 text-center font-bold bg-gradient-to-r from-blue-950/30 to-transparent py-2 px-3 rounded-xl border border-blue-800/40 shadow-lg"
  >
    <span className="animate-pulse inline-block mr-1">⚡</span>
    PLUS QUE {gapToNext} VOIX POUR DÉTRÔNER LE LEADER !
    <span className="animate-pulse inline-block ml-1">⚡</span>
  </motion.p>
)}

{rank === 3 && gapToNext && (
  <motion.p
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="text-[11px] text-orange-400 mt-2 text-center font-bold bg-gradient-to-r from-orange-950/30 to-transparent py-2 px-3 rounded-xl border border-orange-800/40 shadow-lg"
  >
    <span className="animate-bounce inline-block mr-1">🎯</span>
    À SEULEMENT {gapToNext} VOIX DE LA 2ÈME PLACE !
    <span className="animate-bounce inline-block ml-1">🎯</span>
  </motion.p>
)}

{rank > 3 && rank <= 5 && gapToNext && (
  <motion.p
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="text-[11px] text-green-400 mt-2 text-center font-bold bg-gradient-to-r from-green-950/30 to-transparent py-2 px-3 rounded-xl border border-green-800/40 shadow-lg"
  >
    <span className="animate-pulse inline-block mr-1">🚀</span>
    TOP 5 ! PLUS QUE {gapToNext} VOIX POUR LE PODIUM !
    <span className="animate-pulse inline-block ml-1">🚀</span>
  </motion.p>
)}

{rank === 1 && (
  <motion.p
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="text-[11px] text-yellow-400 mt-2 text-center font-bold bg-gradient-to-r from-yellow-950/30 to-transparent py-2 px-3 rounded-xl border border-yellow-800/40 shadow-lg"
  >
    <span className="animate-pulse inline-block mr-1">👑</span>
    GARDE TON TRÔNE !
    <span className="animate-pulse inline-block ml-1">👑</span>
  </motion.p>
)}
          </div>
        ) : (
          <div className="bg-gray-800/50 p-2 rounded text-center border border-gray-700/50">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              {isFinished
                ? "Votes terminés"
                : "Ventes fermées par l'organisateur"}
            </p>
            {isClosed && !isFinished && (
              <p className="text-[10px] text-amber-500 mt-1 italic">
                La période est active mais les votes sont temporairement
                suspendus.
              </p>
            )}
          </div>
        )}
      </motion.div>

      <AlertDialog open={showDetails} onOpenChange={setShowDetails}>
        <AlertDialogContent className="bg-gradient-to-b from-gray-900 to-gray-950 border-gray-700 max-w-md">
          <AlertDialogHeader>
            <div
              className="relative mx-auto mb-4 cursor-pointer group"
              onClick={() => setShowFullPhoto(true)}
            >
              <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-xl shadow-emerald-500/20 overflow-hidden">
                <img
                  src={candidate.photo_url || "/api/placeholder/160/160"}
                  className="w-full h-full rounded-full object-cover border-4 border-gray-900 transition-transform group-hover:scale-110 duration-500"
                  alt={candidate.name}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full">
                <Search className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gray-900 rounded-full p-1 border border-gray-700">
                <div
                  className={`${rank === 1 ? "bg-yellow-600" : rank === 2 ? "bg-gray-500" : rank === 3 ? "bg-orange-600" : "bg-emerald-600"} text-white text-xs font-bold px-3 py-1 rounded-full flex items-center`}
                >
                  <Trophy className="w-3 h-3 mr-1" /> #{rank}
                </div>
              </div>
            </div>

            <AlertDialogTitle className="text-2xl font-bold text-white text-center mb-1">
              {candidate.name}
            </AlertDialogTitle>

            {candidate.category && (
              <div className="flex justify-center mb-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500 text-emerald-400 bg-emerald-950/30"
                >
                  {candidate.category}
                </Badge>
              </div>
            )}

            <AlertDialogDescription className="text-center space-y-4">
              <div className="text-gray-400 text-sm max-h-32 overflow-y-auto px-2">
                {candidate.description ||
                  "Aucune description disponible pour ce candidat."}
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                  <div className="text-emerald-400 font-bold text-xl">
                    {candidateVoteCount}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                    Votes
                  </div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                  <div
                    className={`font-bold text-xl ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-orange-400" : "text-blue-400"}`}
                  >
                    #{rank}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                    Rang
                  </div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                  <div className="text-purple-400 font-bold text-xl">
                    {votePercentage.toFixed(1)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                    Score
                  </div>
                </div>
              </div>

              {!isVotingLocked && (
                <div className="space-y-2">
                  {rank === 1 && (
                    <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-800/30 rounded-xl">
                      <p className="text-yellow-200 font-medium flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        <span className="italic">
                          "Je suis en tête grâce à vous ! Continuons ensemble jusqu'à la victoire ! 👑"
                        </span>
                      </p>
                    </div>
                  )}

                  {rank === 2 && gapToNext && (
                    <div className="p-4 bg-gradient-to-r from-gray-800 to-slate-800 border border-gray-700 rounded-xl">
                      <p className="text-gray-200 font-medium flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <span className="italic">
                          "Plus que {gapToNext} voix pour détrôner le leader ! Chaque vote compte ! 🎯"
                        </span>
                      </p>
                    </div>
                  )}

                  {rank === 3 && gapToNext && (
                    <div className="p-4 bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-800/30 rounded-xl">
                      <p className="text-orange-200 font-medium flex items-center gap-2">
                        <Medal className="w-5 h-5 text-orange-400 flex-shrink-0" />
                        <span className="italic">
                          "À {gapToNext} voix de la 2ème place ! Le podium n'est pas une finalité ! 🥉"
                        </span>
                      </p>
                    </div>
                  )}

                  {rank > 3 && rank <= 5 && gapToNext && (
                    <div className="p-4 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-800/30 rounded-xl">
                      <p className="text-blue-200 font-medium flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <span className="italic">
                          "Top 5 ! Plus que {gapToNext} voix pour rejoindre le podium ! 🚀"
                        </span>
                      </p>
                    </div>
                  )}

                  {rank > 5 && (
                    <div className="p-4 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-800/30 rounded-xl">
                      <p className="text-emerald-200 font-medium flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="italic">
                          "Votez pour moi et aidez-moi à remonter le classement ! Rien n'est impossible ! 💫"
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isVotingLocked && (
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <p className="text-gray-300 font-medium">
                    {isFinished
                      ? "Le vote est terminé. Merci pour votre soutien !"
                      : "Les votes sont actuellement suspendus."}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Share2 className="w-4 h-4 mr-2" /> Partager
            </Button>
            <Button
              onClick={() => setShowFullPhoto(true)}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Eye className="w-4 h-4 mr-2" /> Voir la photo
            </Button>
            <Button
              onClick={() => setShowDetails(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            >
              Fermer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFullPhoto} onOpenChange={setShowFullPhoto}>
        <AlertDialogContent className="bg-black/95 border-gray-800 max-w-4xl p-0 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setShowFullPhoto(false)}
            >
              <span className="sr-only">Fermer</span>
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>

            <div className="max-h-[80vh] max-w-full overflow-auto">
              <img
                src={candidate.photo_url || "/api/placeholder/800/800"}
                alt={candidate.name}
                className="w-auto h-auto max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-white text-lg font-bold bg-black/50 py-2 px-4 rounded-full inline-block">
                {candidate.name} - #{rank}
              </p>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <WalletInfoModal
        isOpen={showWalletInfo}
        onClose={() => setShowWalletInfo(false)}
        onProceed={() => {
          setShowWalletInfo(false);
          navigate("/packs");
        }}
      />

      <AlertDialog
        open={confirmation.isOpen}
        onOpenChange={(o) =>
          !o && setConfirmation({ isOpen: false, onConfirm: null })
        }
      >
        <AlertDialogContent className="bg-gray-900 text-white border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le vote</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Voter pour {candidate.name} ({voteCount} voix) pour {totalCostPi}
              pièces (pièces achetées uniquement)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-black">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmation.onConfirm}
              className="bg-emerald-600 text-white"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const VotingInterface = ({ event, isUnlocked, onRefresh, isClosed }) => {
  const [candidates, setCandidates] = useState([]);
  const [settings, setSettings] = useState(null);
  const { user } = useAuth();
  const [userPaidBalance, setUserPaidBalance] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [activeTab, setActiveTab] = useState("candidates");
  const [isVoteFinished, setIsVoteFinished] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [availableCategories, setAvailableCategories] = useState(["Tous"]);
  const [rankingFilter, setRankingFilter] = useState("Tous");

  const fetchData = useCallback(async () => {
    if (!event?.id) return;

    setLoadingCandidates(true);
    try {
      const { data: cData, error: cError } = await supabase
        .from("candidates")
        .select("*")
        .eq("event_id", event.id)
        .order("vote_count", { ascending: false });

      if (cError) throw cError;

      const { data: sData, error: sError } = await supabase
        .from("events")
        .select("*")
        .eq("id", event.id)
        .maybeSingle();

      if (sError) {
        console.error("Error loading settings:", sError);
      }

      if (user) {
        const { data: uData, error: uError } = await supabase
          .from("profiles")
          .select("coin_balance")
          .eq("id", user.id)
          .single();

        if (!uError) {
          setUserPaidBalance(uData?.coin_balance || 0);
        }
      }

      if (cData) {
        setCandidates(cData);
        const cats = [...new Set(cData.map((c) => c.category).filter(Boolean))];
        if (cats.length > 0) {
          setAvailableCategories(["Tous", ...cats.sort()]);
        }
      }

      let votePrice = 1;
      if (sData) {
        const possiblePriceColumns = [
          "price_pi",
          "vote_price",
          "price",
          "vote_cost",
          "vote_price_fcfa"
        ];

        for (const col of possiblePriceColumns) {
          if (sData[col] !== undefined && sData[col] !== null) {
            votePrice = Number(sData[col]);
            break;
          }
        }
      }

      const settingsData = {
        price_pi: votePrice,
        event_end_at: sData?.event_end_at || new Date(Date.now() + 86400000).toISOString(),
        start_date: sData?.start_date || new Date().toISOString(),
      };

      setSettings(settingsData);

      const now = new Date();
      const endDate = new Date(settingsData.event_end_at);
      const isExpired = now.getTime() > endDate.getTime();

      setIsVoteFinished(isExpired);
    } catch (error) {
      console.error("Error fetching voting data:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les données des candidats.",
        variant: "destructive",
      });
    } finally {
      setLoadingCandidates(false);
    }
  }, [event?.id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData, isClosed, event?.id]);

  useEffect(() => {
    if (!settings?.event_end_at) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(settings.event_end_at).getTime();
      const distance = end - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          ),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(() => {
      const now = new Date();
      const endDate = new Date(settings.event_end_at);
      const isExpired = now.getTime() > endDate.getTime();

      if (isExpired !== isVoteFinished) {
        setIsVoteFinished(isExpired);
        if (onRefresh) onRefresh();
      }

      calculateTimeLeft();
    }, 1000);

    return () => clearInterval(interval);
  }, [settings?.event_end_at, isVoteFinished, onRefresh]);

  const handleCheckout = async () => {
    const isLocked = isVoteFinished || isClosed;

    if (!user || isLocked) {
      toast({
        title: "Action impossible",
        description: isVoteFinished
          ? "Les votes sont terminés."
          : "Les ventes sont actuellement fermées.",
        variant: "destructive",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Panier vide",
        description: "Veuillez ajouter des votes à votre panier.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingCheckout(true);

    try {
      const totalCost = cartItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      if ((userData?.coin_balance || 0) < totalCost) {
        const { dismiss } = toast({
          title: "Solde insuffisant",
          description: (
            <div className="space-y-2">
              <p className="text-sm">
                Il vous faut{" "}
                <span className="font-bold text-primary">
                  {totalCost} pièces
                </span>
                .
                <br />
                Votre solde actuel est{" "}
                <span className="font-bold">
                  {userData?.coin_balance || 0} pièces
                </span>
                .
              </p>
              <Button
                variant="default"
                className="w-full bg-primary text-white hover:bg-primary/90 mt-2"
                onClick={() => {
                  dismiss();
                  navigate("/packs");
                }}
              >
                Acheter des pièces
              </Button>
            </div>
          ),
        });
        setIsProcessingCheckout(false);
        return;
      }

      const newBalance = (userData.coin_balance || 0) - totalCost;
      await supabase
        .from("profiles")
        .update({ coin_balance: newBalance })
        .eq("id", user.id);

      const errors = [];
      const platformFeePercent = 5;

      for (const item of cartItems) {
        try {
          const itemTotalCost = item.quantity * item.price;
          const platformFee = Math.ceil(
            itemTotalCost * (platformFeePercent / 100),
          );
          const netAmount = itemTotalCost - platformFee;

          await TransactionService.createVoteTransaction(
            user.id,
            event.id,
            itemTotalCost,
            item.candidate.id,
            {
              description: `Vote pour ${item.candidate.name} (${item.quantity} voix)`,
            },
          );

          const { data: existingVote, error: checkError } = await supabase
            .from("user_votes")
            .select("vote_count, vote_cost_pi, net_to_organizer, fees")
            .eq("user_id", user.id)
            .eq("candidate_id", item.candidate.id)
            .eq("event_id", event.id)
            .maybeSingle();

          const existingVoteCount = existingVote?.vote_count || 0;
          const existingCost = existingVote?.vote_cost_pi || 0;
          const existingNet = existingVote?.net_to_organizer || 0;
          const existingFees = existingVote?.fees || 0;

          const totalVoteCount = existingVoteCount + item.quantity;
          const totalCostInc = existingCost + itemTotalCost;
          const totalNetAmount = existingNet + netAmount;
          const totalFees = existingFees + platformFee;

          const { error: voteError } = await supabase.from("user_votes").upsert(
            {
              user_id: user.id,
              candidate_id: item.candidate.id,
              event_id: event.id,
              vote_count: totalVoteCount,
              vote_cost_pi: totalCostInc,
              vote_cost_fcfa: totalCostInc * 5,
              net_to_organizer: totalNetAmount,
              fees: totalFees,
              created_at: new Date().toISOString(),
            },
            {
              onConflict: "event_id, candidate_id, user_id",
            },
          );

          if (voteError) throw voteError;

          const newVoteCount = (item.candidate.vote_count || 0) + item.quantity;

          await supabase
            .from("candidates")
            .update({ vote_count: newVoteCount })
            .eq("id", item.candidate.id);

          const { data: eventData } = await supabase
            .from("events")
            .select("organizer_id, title")
            .eq("id", event.id)
            .single();

          if (eventData?.organizer_id) {
            const { data: organizerProfile } = await supabase
              .from("profiles")
              .select("available_earnings")
              .eq("id", eventData.organizer_id)
              .single();

            if (organizerProfile) {
              const newEarnings =
                (organizerProfile.available_earnings || 0) + netAmount;

              await supabase
                .from("profiles")
                .update({
                  available_earnings: newEarnings,
                })
                .eq("id", eventData.organizer_id);
            }

            await supabase.from("organizer_earnings").insert({
              organizer_id: eventData.organizer_id,
              event_id: event.id,
              earnings_coins: netAmount,
              transaction_type: "vote",
              fee_percent: platformFeePercent,
              platform_fee: platformFee,
              status: "pending",
              created_at: new Date().toISOString(),
              description: `Gains de vote: ${item.candidate.name} - ${eventData.title} (${item.quantity} voix)`,
            });

            await TransactionService.createTransaction({
              user_id: eventData.organizer_id,
              event_id: event.id,
              transaction_type: "vote_earnings",
              amount_pi: netAmount,
              amount_fcfa: netAmount * 5,
              description: `Gains de vote: ${item.candidate.name}`,
              status: "completed",
              metadata: {
                candidate_id: item.candidate.id,
                candidate_name: item.candidate.name,
                gross_amount: itemTotalCost,
                platform_fee: platformFee,
                fee_percent: platformFeePercent,
                net_amount: netAmount,
                source: "vote_earnings",
                vote_count: item.quantity,
                is_cumulative: true,
              },
            });
          }
        } catch (itemError) {
          errors.push(
            `Erreur pour ${item.candidate.name}: ${itemError.message}`,
          );
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join("\n"));
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);

      toast({
        title: "🎉 VICTOIRE !",
        description: `Tous les votes du panier ont été enregistrés avec succès! Vous avez changé la donne !`,
        className:
          "bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold",
      });

      setCartItems([]);
      fetchData();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Checkout error:", e);
      toast({
        title: "❌ Erreur",
        description: e.message || "Erreur lors de l'enregistrement des votes",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const totalVotes = candidates.reduce(
    (sum, c) => sum + (c.vote_count || 0),
    0,
  );

  const filteredCandidates = useMemo(() => {
    let result = candidates;

    if (selectedCategory !== "Tous") {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (searchTerm) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return result;
  }, [candidates, selectedCategory, searchTerm]);

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort(
      (a, b) => (b.vote_count || 0) - (a.vote_count || 0),
    );
  }, [candidates]);

  const getRank = (id) => sortedCandidates.findIndex((c) => c.id === id) + 1;

  const rankedCandidatesFiltered = useMemo(() => {
    let result = candidates;
    if (rankingFilter !== "Tous") {
      result = result.filter((c) => c.category === rankingFilter);
    }
    return result.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
  }, [candidates, rankingFilter]);

const generateRankingPDF = (type) => {
  const doc = new jsPDF();
  let listToExport = [];
  let pdfTitle = "";
  let filename = "";

  // Fonction pour nettoyer les caractères spéciaux
  const cleanText = (text) => {
    if (!text) return "-";
    // Remplacer les caractères accentués par leurs équivalents simples
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[œŒ]/g, "oe")
      .replace(/[æÆ]/g, "ae")
      .replace(/[^a-zA-Z0-9\s\-_]/g, "");
  };

  // Nettoyer le titre de l'événement
  const cleanEventTitle = cleanText(event.title).toUpperCase();

  // Déterminer le type de classement à exporter
  if (type === "general") {
    listToExport = [...candidates].sort(
      (a, b) => (b.vote_count || 0) - (a.vote_count || 0),
    );
    pdfTitle = "CLASSEMENT GENERAL";
    filename = "classement_general";
  } 
  else if (type === "category_best") {
    const categories = [
      ...new Set(candidates.map((c) => c.category).filter(Boolean)),
    ].sort();
    listToExport = categories
      .map((cat) => {
        const catCandidates = candidates.filter((c) => c.category === cat);
        return catCandidates.sort(
          (a, b) => (b.vote_count || 0) - (a.vote_count || 0),
        )[0];
      })
      .filter(Boolean);
    listToExport.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));

    pdfTitle = "MEILLEURS PAR CATEGORIE";
    filename = "meilleurs_par_categorie";
  } 
  else if (type === "category_full") {
    const categories = [
      ...new Set(candidates.map((c) => c.category).filter(Boolean)),
    ].sort();
    
    pdfTitle = "CLASSEMENT COMPLET PAR CATEGORIE";
    filename = "classement_complet_par_categorie";
    
    // Appeler la fonction pour le classement complet par catégorie
    generateCategoryFullPDF(doc, categories, candidates, totalVotes, event, pdfTitle, filename, cleanText, cleanEventTitle);
    return;
  }
  else {
    listToExport = rankedCandidatesFiltered;
    pdfTitle = "CLASSEMENT " + (rankingFilter === "Tous" ? "GENERAL" : cleanText(rankingFilter).toUpperCase());
    filename = "classement_" + cleanText(rankingFilter);
  }

  // Style du PDF
  const primaryColor = [16, 185, 129];
  const secondaryColor = [75, 85, 99];
  const accentColor = [234, 179, 8];

  // En-tête
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(pdfTitle, 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(cleanEventTitle, 105, 30, { align: "center" });

  // Informations
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Genere le : ${dateStr}`, 14, 50);
  if (type !== "general" && type !== "category_best") {
    doc.text(`Categorie : ${cleanText(rankingFilter)}`, 14, 55);
  }
  doc.text(`Total des votes : ${totalVotes}`, 14, 60);

  let y = 70;
  const colX = { rank: 15, name: 40, cat: 110, votes: 160, share: 190 };

  // En-tête du tableau
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 6, 182, 9, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(9);
  doc.text("RANG", colX.rank, y);
  doc.text("CANDIDAT", colX.name, y);
  doc.text("CATEGORIE", colX.cat, y);
  doc.text("VOTES", colX.votes, y, { align: "right" });
  doc.text("SCORE", colX.share, y, { align: "right" });

  y += 10;

  // Remplissage du tableau
  listToExport.forEach((c, index) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${pdfTitle} - ${cleanEventTitle} (Suite)`, 14, 10);
      
      // Réafficher l'en-tête du tableau sur la nouvelle page
      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 6, 182, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(9);
      doc.text("RANG", colX.rank, y);
      doc.text("CANDIDAT", colX.name, y);
      doc.text("CATEGORIE", colX.cat, y);
      doc.text("VOTES", colX.votes, y, { align: "right" });
      doc.text("SCORE", colX.share, y, { align: "right" });
      y += 10;
    }

    const rank = index + 1;
    const share = totalVotes > 0
      ? (((c.vote_count || 0) / totalVotes) * 100).toFixed(1)
      : "0.0";

    // Mise en évidence du top 3
    if (rank <= 3) {
      doc.setFillColor(
        rank === 1 ? 255 : 250,
        rank === 1 ? 248 : 250,
        rank === 1 ? 220 : 250,
      );
      doc.setDrawColor(
        rank === 1 ? accentColor[0] : 220,
        rank === 1 ? accentColor[1] : 220,
        rank === 1 ? 0 : 220,
      );
      doc.rect(14, y - 6, 182, 10, "FD");
    }

    doc.setFontSize(10);
    if (rank === 1) doc.setTextColor(...accentColor);
    else if (rank === 2) doc.setTextColor(150, 150, 150);
    else if (rank === 3) doc.setTextColor(165, 80, 30);
    else doc.setTextColor(0, 0, 0);

    doc.setFont("helvetica", "bold");
    doc.text(`#${rank}`, colX.rank, y);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(cleanText(c.name), colX.name, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(cleanText(c.category) || "-", colX.cat, y);

    doc.setTextColor(0, 0, 0);
    doc.text((c.vote_count || 0).toString(), colX.votes, y, {
      align: "right",
    });

    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(share + "%", colX.share, y, { align: "right" });

    doc.setDrawColor(230, 230, 230);
    doc.line(14, y + 4, 196, y + 4);

    y += 12;
  });

  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `BonPlanInfos - Systeme de Vote Securise ${new Date().getFullYear()}`,
      105,
      290,
      { align: "center" },
    );
    doc.text(`Page ${i}/${pageCount}`, 196, 290, { align: "right" });
  }

  const safeName = cleanText(event.title).substring(0, 15).replace(/[^a-z0-9]/gi, "_");
  doc.save(`${filename}_${safeName}.pdf`);
  toast({
    title: "PDF genere",
    description: "Le classement a ete telecharge avec succes.",
  });
};

// Fonction pour générer le classement complet par catégorie
const generateCategoryFullPDF = (doc, categories, candidates, totalVotes, event, pdfTitle, filename, cleanText, cleanEventTitle) => {
  const primaryColor = [16, 185, 129];
  const secondaryColor = [75, 85, 99];
  
  let y = 70;
  
  // En-tête principal
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(pdfTitle, 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(cleanEventTitle, 105, 30, { align: "center" });

  // Informations
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Genere le : ${dateStr}`, 14, 50);
  doc.text(`Total des votes : ${totalVotes}`, 14, 55);
  
  // Pour chaque catégorie
  categories.forEach((category) => {
    const categoryCandidates = candidates
      .filter((c) => c.category === category)
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    
    if (categoryCandidates.length === 0) return;
    
    // Vérifier si on a besoin d'une nouvelle page
    if (y > 250) {
      doc.addPage();
      y = 20;
      
      // Ajouter un en-tête de page
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${pdfTitle} - ${cleanEventTitle} (Suite)`, 14, 10);
    }
    
    // Titre de la catégorie
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2], 0.1);
    doc.setDrawColor(...primaryColor);
    doc.rect(14, y - 6, 182, 9, "FD");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text(`>> ${cleanText(category)}`, 18, y);
    y += 10;
    
    // En-tête du tableau pour cette catégorie
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 6, 182, 9, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(9);
    doc.text("RANG", 18, y);
    doc.text("CANDIDAT", 45, y);
    doc.text("VOTES", 150, y, { align: "right" });
    doc.text("SCORE", 190, y, { align: "right" });
    
    y += 10;
    
    // Liste des candidats de la catégorie
    categoryCandidates.forEach((c, index) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        
        // Rappel du contexte
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`${pdfTitle} - ${cleanEventTitle} (Suite)`, 14, 10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text(`>> ${cleanText(category)} (suite)`, 18, y);
        y += 10;
        
        // Réafficher l'en-tête
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 6, 182, 9, "F");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(9);
        doc.text("RANG", 18, y);
        doc.text("CANDIDAT", 45, y);
        doc.text("VOTES", 150, y, { align: "right" });
        doc.text("SCORE", 190, y, { align: "right" });
        y += 10;
      }
      
      const rank = index + 1;
      const score = totalVotes > 0
        ? (((c.vote_count || 0) / totalVotes) * 100).toFixed(1)
        : "0.0";
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      // Rang
      if (rank === 1) {
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("#1", 18, y);
      } else if (rank === 2) {
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "bold");
        doc.text("#2", 18, y);
      } else if (rank === 3) {
        doc.setTextColor(165, 80, 30);
        doc.setFont("helvetica", "bold");
        doc.text("#3", 18, y);
      } else {
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(`#${rank}`, 18, y);
      }
      
      // Nom du candidat
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(cleanText(c.name), 45, y);
      
      // Votes
      doc.setTextColor(0, 0, 0);
      doc.text((c.vote_count || 0).toString(), 150, y, { align: "right" });
      
      // Score
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      doc.text(score + "%", 190, y, { align: "right" });
      
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y + 3, 196, y + 3);
      
      y += 8;
    });
    
    y += 5; // Espace entre les catégories
  });
  
  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `BonPlanInfos - Systeme de Vote Securise ${new Date().getFullYear()}`,
      105,
      290,
      { align: "center" },
    );
    doc.text(`Page ${i}/${pageCount}`, 196, 290, { align: "right" });
  }

  const safeName = cleanText(event.title).substring(0, 15).replace(/[^a-z0-9]/gi, "_");
  doc.save(`${filename}_${safeName}.pdf`);
  toast({
    title: "PDF genere",
    description: "Le classement complet par categorie a ete telecharge avec succes.",
  });
};
  if (!isUnlocked) return null;

  return (
    <div className="mt-8 space-y-6 relative">
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      {isProcessingCheckout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 p-8 rounded-2xl shadow-2xl border border-emerald-500/30 flex flex-col items-center max-w-md mx-4"
          >
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Vote className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Traitement en cours
            </h3>
            <p className="text-gray-400 text-center mb-4">
              Vos votes sont en cours de validation...
              <br />
              Préparez-vous à faire la différence !
            </p>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: ["0%", "100%"] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Vote className="w-6 h-6 text-emerald-500" />
          Espace de Vote
        </h2>
        {user && (
          <Badge
            variant="outline"
            className="text-amber-400 border-amber-400 bg-amber-950/20 px-3 py-1"
          >
            <Coins className="w-3 h-3 mr-2" />
            Solde: {userPaidBalance} pièces
          </Badge>
        )}
      </div>

      {loadingCandidates ? (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Chargement des candidats...</p>
        </div>
      ) : (
        <>
          {settings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CountdownTimer
                endDate={settings.event_end_at}
                onTimerEnd={() => {
                  setIsVoteFinished(true);
                  if (onRefresh) onRefresh();
                }}
              />

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">
                    Période de vote
                  </span>
                  <div className="flex gap-2">
                    {isVoteFinished ? (
                      <Badge className="bg-red-900/50 text-red-300 border-red-800">
                        Terminé
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-800">
                        En cours
                      </Badge>
                    )}
                    {isClosed && !isVoteFinished && (
                      <Badge className="bg-amber-900/50 text-amber-300 border-amber-800">
                        <Lock className="w-3 h-3 mr-1" /> Ventes fermées
                      </Badge>
                    )}
                  </div>
                </div>

                {!isVoteFinished &&
                  !isClosed &&
                  timeLeft.days === 0 &&
                  timeLeft.hours <= 24 && (
                    <MotivationalMessage type="deadline" timeLeft={timeLeft} />
                  )}

                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-300">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="w-16 text-gray-500">Début:</span>
                    <span>
                      {settings.start_date
                        ? new Date(settings.start_date).toLocaleDateString(
                            "fr-FR",
                          )
                        : "Immédiat"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="w-16 text-gray-500">Fin:</span>
                    <span className="text-white font-medium">
                      {new Date(settings.event_end_at).toLocaleDateString(
                        "fr-FR",
                      )}{" "}
                      à{" "}
                      {new Date(settings.event_end_at).toLocaleTimeString(
                        "fr-FR",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300 mt-2">
                    <Coins className="w-4 h-4 mr-2 text-amber-500" />
                    <span className="w-16 text-gray-500">Prix/vote:</span>
                    <span className="text-amber-400 font-medium">
                      {settings?.price_pi || 1} pièces
                    </span>
                  </div>
                  {isClosed && !isVoteFinished && (
                    <div className="flex items-center text-sm text-amber-400 mt-2 p-2 bg-amber-900/20 rounded-lg border border-amber-800/30">
                      <Info className="w-4 h-4 mr-2 text-amber-500" />
                      <span className="text-xs">
                        Les votes sont temporairement désactivés par
                        l'organisateur
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="bg-gray-800 w-full border border-gray-700 grid grid-cols-2 p-1">
                  <TabsTrigger
                    value="candidates"
                    className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                  >
                    <UserCircle className="w-4 h-4 mr-2" /> Candidats
                  </TabsTrigger>
                  <TabsTrigger
                    value="ranking"
                    className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" /> Classement
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="candidates" className="space-y-4">
                  <div className="flex flex-col gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <Input
                        placeholder="Rechercher un candidat..."
                        className="pl-9 bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    {availableCategories.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {availableCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                              selectedCategory === cat
                                ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/20"
                                : "bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-gray-200"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {filteredCandidates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCandidates.map((c, idx) => (
                        <CandidateCard
                          key={c.id}
                          candidate={c}
                          totalVotes={totalVotes}
                          votePrice={settings?.price_pi || 1}
                          onVote={() => {
                            fetchData();
                            if (onRefresh) onRefresh();
                          }}
                          isFinished={isVoteFinished}
                          isSelected={cartItems.some(
                            (i) => i.candidate.id === c.id,
                          )}
                          onSelect={(cand, qty) => {
                            setCartItems((prev) => {
                              const existingIndex = prev.findIndex(
                                (i) => i.candidate.id === cand.id,
                              );
                              if (existingIndex >= 0) {
                                const updated = [...prev];
                                updated[existingIndex].quantity += qty;
                                return updated;
                              } else {
                                return [
                                  ...prev,
                                  {
                                    candidate: cand,
                                    quantity: qty,
                                    price: settings?.price_pi || 1,
                                  },
                                ];
                              }
                            });
                          }}
                          event={event}
                          rank={getRank(c.id)}
                          isClosed={isClosed}
                          allCandidates={candidates}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700 border-dashed">
                      <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-8 h-8 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-1">
                        Aucun résultat
                      </h3>
                      <p className="text-gray-400">
                        Essayez de changer de catégorie ou de terme de
                        recherche.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ranking">
                  <Card className="bg-gray-800 border-gray-700 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700 pb-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="text-white flex items-center gap-2 text-xl">
                          <Trophy className="text-yellow-500 w-6 h-6" />
                          Classement Officiel
                        </CardTitle>

                       <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="outline"
      className="bg-emerald-600 border-0 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 w-full md:w-auto"
    >
      <Printer className="w-4 h-4 mr-2" />
      Imprimer le classement
      <ChevronDown className="w-4 h-4 ml-2" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent className="bg-gray-800 border-gray-700 text-gray-200">
    <DropdownMenuItem
      className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700 focus:text-white"
      onClick={() => generateRankingPDF("general")}
    >
      📊 Classement Général
    </DropdownMenuItem>
    <DropdownMenuItem
      className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700 focus:text-white"
      onClick={() => generateRankingPDF("category_best")}
    >
      🏆 Meilleurs par Catégorie
    </DropdownMenuItem>
    <DropdownMenuItem
      className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700 focus:text-white"
      onClick={() => generateRankingPDF("category_full")}
    >
      📋 Classement Complet par Catégorie
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
                      </div>

                      <div className="mt-6">
                        <div className="text-xs text-gray-400 uppercase font-semibold mb-2 ml-1">
                          Filtrer par catégorie
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {availableCategories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setRankingFilter(cat)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                                rankingFilter === cat
                                  ? "bg-emerald-600 text-white border-emerald-500"
                                  : "bg-gray-900/50 text-gray-400 border-gray-600 hover:border-gray-500 hover:text-gray-300"
                              }`}
                            >
                              {cat === "Tous" ? "Vue Globale" : cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-700/50">
                        {rankedCandidatesFiltered.length > 0 ? (
                          rankedCandidatesFiltered.map((c, i) => {
                            const rank = i + 1;
                            const percentage =
                              totalVotes > 0
                                ? (
                                    ((c.vote_count || 0) / totalVotes) *
                                    100
                                  ).toFixed(1)
                                : 0;
                            const gapToNext =
                              i > 0
                                ? sortedCandidates[i - 1]?.vote_count -
                                  c.vote_count
                                : null;

                            let rankBadge;
                            if (rank === 1)
                              rankBadge = (
                                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20">
                                  <Crown className="w-5 h-5" />
                                </div>
                              );
                            else if (rank === 2)
                              rankBadge = (
                                <div className="bg-gray-300 text-gray-800 w-8 h-8 rounded-full flex items-center justify-center font-bold border border-gray-400">
                                  2
                                </div>
                              );
                            else if (rank === 3)
                              rankBadge = (
                                <div className="bg-orange-700 text-orange-100 w-8 h-8 rounded-full flex items-center justify-center font-bold border border-orange-600">
                                  3
                                </div>
                              );
                            else
                              rankBadge = (
                                <span className="text-gray-500 font-mono font-bold text-lg w-8 text-center">
                                  #{rank}
                                </span>
                              );

                            return (
                              <motion.div
                                key={c.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`flex items-center p-4 transition-colors ${rank <= 3 ? "bg-gray-800/80" : "hover:bg-gray-700/30"}`}
                              >
                                <div className="flex-shrink-0 mr-4 w-10 flex justify-center">
                                  {rankBadge}
                                </div>
                                <div className="flex-shrink-0 mr-4">
                                  <img
                                    src={
                                      c.photo_url || "/api/placeholder/40/40"
                                    }
                                    className={`w-10 h-10 rounded-full object-cover border ${rank === 1 ? "border-yellow-500" : "border-gray-600"}`}
                                    alt={c.name}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`text-sm font-medium truncate ${rank === 1 ? "text-yellow-400" : "text-white"}`}
                                    >
                                      {c.name}
                                    </p>
                                    {rank === 1 && (
                                      <Award className="w-3 h-3 text-yellow-500" />
                                    )}
                                  </div>
                                  <div className="flex items-center mt-1 gap-2">
                                    <div className="flex-1 bg-gray-700 rounded-full h-1.5 max-w-[100px] overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.5 }}
                                        className={`h-1.5 rounded-full ${rank === 1 ? "bg-yellow-500" : "bg-emerald-500"}`}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-400">
                                      {percentage}%
                                    </span>
                                    {c.category && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] border-gray-600 text-gray-500 h-4 px-1 ml-auto sm:ml-0"
                                      >
                                        {c.category}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-2">
                                  <div
                                    className={`text-sm font-bold ${rank <= 3 ? "text-white" : "text-gray-300"}`}
                                  >
                                    {c.vote_count || 0}
                                  </div>
                                  <div className="text-[10px] text-gray-500 uppercase">
                                    voix
                                  </div>
                                  {gapToNext && gapToNext > 0 && rank <= 5 && (
                                    <div className="text-[8px] text-orange-400 mt-1 whitespace-nowrap">
                                      -{gapToNext} voix du #{rank - 1}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })
                        ) : (
                          <div className="p-12 text-center text-gray-500">
                            Aucun candidat trouvé pour ce filtre.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-1">
              <Card className="bg-gray-800 border-gray-700 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center">
                    <ShoppingCart className="mr-2" /> Panier ({cartItems.length}
                    )
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cartItems.length > 0 && !isClosed && !isVoteFinished && (
                    <MotivationalMessage type="cart" />
                  )}

                  {cartItems.length > 0 && !isClosed && !isVoteFinished ? (
                    <div className="space-y-3">
                      {cartItems.map((i, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex justify-between items-center text-sm bg-gray-900/50 p-2 rounded border border-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-900 flex items-center justify-center text-emerald-400 text-xs font-bold">
                              {i.quantity}
                            </div>
                            <span className="text-gray-300 truncate max-w-[120px]">
                              {i.candidate.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 ml-auto text-gray-500 hover:text-red-400"
                              onClick={() => {
                                setCartItems((prev) =>
                                  prev.filter((_, index) => index !== idx),
                                );
                              }}
                            >
                              ×
                            </Button>
                          </div>
                          <span className="text-emerald-400 font-mono">
                            {i.quantity * i.price} pièces
                          </span>
                        </motion.div>
                      ))}
                      <Separator />
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-gray-400">Total</span>
                        <span className="text-xl font-bold text-emerald-400">
                          {cartItems.reduce(
                            (s, i) => s + i.quantity * i.price,
                            0,
                          )}{" "}
                          pièces
                        </span>
                      </div>
                      <Button
                        onClick={handleCheckout}
                        disabled={isProcessingCheckout}
                        className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3"
                      >
                        {isProcessingCheckout ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Traitement...
                          </>
                        ) : (
                          "Confirmer le paiement"
                        )}
                      </Button>
                      <Button
                        onClick={() => setCartItems([])}
                        variant="ghost"
                        size="sm"
                        className="w-full text-gray-500 hover:text-red-400 h-auto py-1 text-xs"
                        disabled={isProcessingCheckout}
                      >
                        Vider le panier
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">
                        {isVoteFinished
                          ? "Les votes sont terminés"
                          : isClosed
                            ? "Les votes sont temporairement désactivés"
                            : "Votre panier est vide"}
                      </p>
                      {!isVoteFinished && !isClosed && (
                        <p className="text-xs text-emerald-500 mt-2">
                          Ajoutez des voix pour soutenir vos candidats !
                        </p>
                      )}
                      {isClosed && !isVoteFinished && (
                        <p className="text-xs text-amber-500 mt-2">
                          La période de vote est active mais les ventes sont
                          suspendues
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {!isVoteFinished &&
            !isClosed &&
            timeLeft.days === 0 &&
            timeLeft.hours <= 6 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-3 p-2 bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-800/50 rounded-lg text-center"
              >
                <p className="text-xs text-red-300 flex items-center justify-center gap-1.5 font-medium">
                  <Flame className="w-4 h-4 text-red-400 animate-pulse" />
                  ⚡ DERNIÈRE LIGNE DROITE ⚡
                  <Flame className="w-4 h-4 text-red-400 animate-pulse" />
                </p>
                <p className="text-[11px] text-orange-200 mt-1">
                  Plus que {timeLeft.hours}h
                  {timeLeft.minutes > 0 ? ` ${timeLeft.minutes}min` : ""} pour
                  faire la différence !
                </p>
              </motion.div>
            )}
        </>
      )}
    </div>
  );
};

export default VotingInterface;