import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  Trash2,
  Loader2,
  Share2,
  ChevronDown,
  ChevronUp,
  BarChart,
  AlertTriangle,
  Scan,
  TrendingUp,
  PieChart,
  Heart,
  MessageCircle,
  Bookmark,
  Eye,
  Lock,
  Clock,
  Settings,
  PlayCircle,
  Ban,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  Tag,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MultilingualSeoHead from "@/components/MultilingualSeoHead";
import SocialInteractions from "@/components/social/SocialInteractions";
import RaffleInterface from "@/components/event/RaffleInterface";
import StandRentalInterface from "@/components/event/StandRentalInterface";
import TicketingInterface from "@/components/event/TicketingInterface";
import VotingInterface from "@/components/event/VotingInterface";
import EventCountdown from "@/components/EventCountdown";
import BookmarkButton from "@/components/common/BookmarkButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { extractStoragePath, fetchWithRetry } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CommunityVerification from "@/components/event/CommunityVerification";
import TicketScannerDialog from "@/components/event/TicketScannerDialog";
import { PromoCodeGenerator } from "../components/influencer/PromoCodeGenerator.jsx";

// Composant pour les statistiques de validation (organisateur)
const VerificationStatsDialog = ({ isOpen, onClose, eventId, organizerId }) => {
  const { t } = useTranslation("security");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && eventId && organizerId) {
      const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
          console.log("Fetching stats for event:", eventId);
          const eventIdStr = String(eventId);

          const { count: totalTickets, error: ticketsError } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventIdStr);

          if (ticketsError) {
            console.error("Erreur tickets:", ticketsError);
          }

          const { count: usedTickets, error: usedError } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventIdStr)
            .eq("status", "used");

          if (usedError) {
            console.error("Erreur used tickets:", usedError);
          }

          const verifiedCount = usedTickets || 0;

          let activeSessions = 0;
          const { count: sessionsCount, error: sessionsError } = await supabase
            .from("verification_sessions")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventIdStr)
            .eq("is_active", true);

          if (!sessionsError) {
            activeSessions = sessionsCount || 0;
          }

          const total = totalTickets || 0;
          const verified = verifiedCount;
          const verificationRate = total > 0 ? (verified / total) * 100 : 0;

          setStats({
            total_tickets: total,
            verified_tickets: verified,
            duplicate_scans: 0,
            active_sessions: activeSessions,
            verification_rate: Math.round(verificationRate * 100) / 100,
          });
        } catch (err) {
          console.error("Erreur stats:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, eventId, organizerId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <BarChart className="w-5 h-5 text-blue-400" />{" "}
            {t("verificationStats.title") || "Statistiques de vérification"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t("verificationStats.description") ||
              "Taux de validation des billets"}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">
              Veuillez réessayer plus tard
            </p>
          </div>
        ) : stats ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-800">
                <p className="text-xs text-gray-400 uppercase font-bold">
                  {t("verificationStats.ticketsSold") || "Billets vendus"}
                </p>
                <p className="text-2xl font-bold text-white">
                  {stats.total_tickets || 0}
                </p>
              </div>
              <div className="bg-blue-900/20 p-4 rounded-lg text-center border border-blue-800/50">
                <p className="text-xs text-blue-400 uppercase font-bold">
                  {t("verificationStats.validated") || "Validés / Entrés"}
                </p>
                <p className="text-2xl font-bold text-blue-400">
                  {stats.verified_tickets || 0}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">
                  {t("verificationStats.attendanceRate") || "Taux de présence"}
                </span>
                <span className="font-bold text-white">
                  {stats.verification_rate || 0}%
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${stats.verification_rate || 0}%` }}
                ></div>
              </div>
            </div>
            {(stats.active_sessions || 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 p-3 rounded-lg border border-green-800/30">
                <Scan className="w-4 h-4" />
                <span>{stats.active_sessions} scanner(s) actif(s)</span>
              </div>
            )}
            {(stats.duplicate_scans || 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-900/20 p-3 rounded-lg border border-yellow-800/30">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {stats.duplicate_scans} tentative(s) de scan en double
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            {t("verificationStats.noData") || "Aucune donnée disponible"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Boutons d'action style TikTok
const TikTokActionButtons = ({ event, onRefresh, user }) => {
  const { t } = useTranslation();
  const [likes, setLikes] = useState(event?.likes_count || 0);
  const [comments, setComments] = useState(event?.comments_count || 0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (event) {
      setLikes(event.likes_count || 0);
      setComments(event.comments_count || 0);
    }
  }, [event]);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: t("eventDetail.toast.loginRequired"),
        description: t("eventDetail.toast.loginRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    try {
      const newLikedState = !isLiked;
      const likeChange = newLikedState ? 1 : -1;
      setLikes((prev) => prev + likeChange);
      setIsLiked(newLikedState);

      await supabase.rpc("toggle_event_like", {
        p_event_id: event.id,
        p_user_id: user.id,
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error toggling like:", error);
      setLikes((prev) => prev - (isLiked ? 1 : -1));
      setIsLiked(!isLiked);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const shareData = {
      title: event.title,
      text: event.description
        ? event.description.substring(0, 100) + "..."
        : `Découvrez ${event.title}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: t("common.copyLink"),
          description: t("eventDetail.toast.copySuccess"),
        });
      }
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  return (
    <div className="absolute right-4 bottom-4 flex flex-col items-center gap-4 z-30">
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-xs drop-shadow-md">
          {event?.views_count || 0}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 flex items-center justify-center">
          <BookmarkButton
            eventId={event?.id}
            variant="ghost"
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 hover:border-white/40 text-white p-0"
          />
        </div>
        <span className="text-white font-bold text-xs drop-shadow-md">
          {t("eventDetail.favorites")}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button
          onClick={() =>
            document
              .getElementById("comments-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 hover:border-white/40"
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </Button>
        <span className="text-white font-bold text-xs drop-shadow-md">
          {comments}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Button
          onClick={handleShare}
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 hover:border-white/40"
        >
          <Share2 className="w-5 h-5 text-white" />
        </Button>
        <span className="text-white font-bold text-xs drop-shadow-md">
          {t("common.share")}
        </span>
      </div>
    </div>
  );
};

// Description extensible
const ExpandableDescription = ({ description }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 300;

  if (!description) return null;

  const shouldTruncate = description.length > maxLength;
  const content = isExpanded ? description : description.slice(0, maxLength);

  return (
    <div className="prose prose-invert max-w-none">
      <p className="whitespace-pre-line leading-relaxed text-gray-300">
        {content}
        {!isExpanded && shouldTruncate && "..."}
      </p>
      {shouldTruncate && (
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 p-0 h-auto font-semibold text-blue-400 hover:text-blue-300 hover:bg-transparent flex items-center"
        >
          {isExpanded ? (
            <>
              {t("eventDetail.seeLess")} <ChevronUp className="ml-1 w-4 h-4" />
            </>
          ) : (
            <>
              {t("eventDetail.seeMore")}{" "}
              <ChevronDown className="ml-1 w-4 h-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};

// Affichage des dates
const DateDisplay = ({ event }) => {
  const { t } = useTranslation();
  const formatDate = (dateString) => {
    if (!dateString) return t("eventDetail.dateNotSpecified");
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!event.event_start_at) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-gray-300">
        <CalendarDays className="w-4 h-4 text-[#C9A227]" />
        <span className="font-medium">{formatDate(event.event_start_at)}</span>
      </div>
      {event.event_end_at && (
        <div className="flex items-center gap-2 text-gray-400 text-sm ml-6">
          <CalendarRange className="w-3 h-3 text-[#C9A227]" />
          <span>
            {t("eventDetail.until")} {formatDate(event.event_end_at)}
          </span>
        </div>
      )}
    </div>
  );
};

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, forceRefreshUserProfile } = useData();
  const { user } = useAuth();
  const { t } = useTranslation(["translation", "security"]);

  const [event, setEvent] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingSales, setTogglingSales] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [standStats, setStandStats] = useState({
    total_rented: 0,
    gross_revenue: 0,
    organizer_net: 0,
    platform_fee: 0,
    loading: false,
  });

  const [promoConfig, setPromoConfig] = useState(null);
  const [promoConfigLoading, setPromoConfigLoading] = useState(false);

  const userId = user?.id;

  const fetchPromoConfig = useCallback(async () => {
    if (!event?.id) return;
    setPromoConfigLoading(true);
    try {
      const { data, error } = await supabase
        .from("event_promo_config")
        .select("*")
        .eq("event_id", event.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching promo config:", error);
        setPromoConfig({ enabled: false });
      } else {
        setPromoConfig(data || { enabled: false });
      }
    } catch (error) {
      console.error("Error fetching promo config:", error);
      setPromoConfig({ enabled: false });
    } finally {
      setPromoConfigLoading(false);
    }
  }, [event?.id]);

  const fetchEventData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    console.log("Fetching event data for ID:", id);
    try {
      const { data: fetchedEvent, error: eventError } = await fetchWithRetry(
        () =>
          supabase
            .from("events")
            .select(
              "*, organizer:organizer_id(full_name), category:category_id(name, slug)",
            )
            .eq("id", id)
            .maybeSingle(),
      );

      if (eventError) throw eventError;
      if (!fetchedEvent) {
        console.error("Event not found");
        setEvent(null);
        return;
      }

      setEvent(fetchedEvent);

      let specificEventData = null;
      if (fetchedEvent.event_type === "raffle") {
        const { data } = await supabase
          .from("raffle_events")
          .select("*")
          .eq("event_id", id)
          .maybeSingle();
        specificEventData = data;
      } else if (fetchedEvent.event_type === "stand_rental") {
        const { data } = await supabase
          .from("stand_events")
          .select("*")
          .eq("event_id", id)
          .maybeSingle();
        specificEventData = data;
      } else if (fetchedEvent.event_type === "ticketing") {
        const { data: ticketingDetails } = await supabase
          .from("ticketing_events")
          .select("*")
          .eq("event_id", id)
          .maybeSingle();
        specificEventData = ticketingDetails;
        const { data: types } = await supabase
          .from("ticket_types")
          .select("*")
          .eq("event_id", id)
          .eq("is_active", true);
        setTicketTypes(types || []);
      }
      setEventData(specificEventData);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast({
        title: t("common.error"),
        description: t("eventDetail.toast.loadError"),
        variant: "destructive",
      });
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  useEffect(() => {
    if (event) {
      fetchPromoConfig();
    }
  }, [event, fetchPromoConfig]);

  useEffect(() => {
    if (!id || !event) return;
    const trackView = async () => {
      try {
        const { data, error } = await supabase.rpc("track_event_view", {
          p_event_id: id,
          p_user_id: userId || null,
        });
        if (error) {
          console.error("Error tracking view:", error);
          return;
        }
        if (data && data.new_views_count !== undefined) {
          setEvent((prev) =>
            prev ? { ...prev, views_count: data.new_views_count } : prev,
          );
        }
      } catch (error) {
        console.error("Exception while tracking view:", error);
      }
    };
    const timeoutId = setTimeout(trackView, 1000);
    return () => clearTimeout(timeoutId);
  }, [id, event, userId]);

  const isOwner = user && event?.organizer_id === user.id;
  const isInfluencer = user && event?.organizer_id !== user.id;

  useEffect(() => {
    if (isOwner && event?.event_type === "stand_rental") {
      const fetchStandStats = async () => {
        setStandStats((prev) => ({ ...prev, loading: true }));
        try {
          const { count } = await supabase
            .from("stand_rentals")
            .select("*", { count: "exact", head: true })
            .in(
              "stand_event_id",
              (
                await supabase
                  .from("stand_events")
                  .select("id")
                  .eq("event_id", event.id)
              ).data.map((e) => e.id),
            )
            .eq("status", "confirmed");

          const { data: earnings } = await supabase
            .from("organizer_earnings")
            .select("earnings_coins, platform_commission, amount_pi")
            .eq("event_id", event.id)
            .eq("transaction_type", "stand_rental");

          const gross =
            earnings?.reduce((acc, curr) => acc + (curr.amount_pi || 0), 0) ||
            0;
          const net =
            earnings?.reduce(
              (acc, curr) => acc + (curr.earnings_coins || 0),
              0,
            ) || 0;
          const fee =
            earnings?.reduce(
              (acc, curr) => acc + (curr.platform_commission || 0),
              0,
            ) || 0;

          setStandStats({
            total_rented: count || 0,
            gross_revenue: gross,
            organizer_net: net,
            platform_fee: fee,
            loading: false,
          });
        } catch (err) {
          console.error("Failed to fetch stand stats", err);
          setStandStats((prev) => ({ ...prev, loading: false }));
        }
      };
      fetchStandStats();
    }
  }, [isOwner, event]);

  const handleDataRefresh = () => {
    fetchEventData();
    if (forceRefreshUserProfile) forceRefreshUserProfile();
  };

  // ========== FONCTION DE SUPPRESSION CORRIGÉE AVEC RECHARGEMENT FORCÉ ==========
  const handleDeleteEvent = async () => {
    if (!event) return;
    setIsDeleting(true);
    try {
      console.log("Tentative de suppression de l'événement:", event.id);

      // Supprimer l'image de couverture si elle existe
      if (event.cover_image) {
        const storageInfo = extractStoragePath(event.cover_image);
        if (storageInfo) {
          await supabase.storage
            .from(storageInfo.bucket)
            .remove([storageInfo.path])
            .catch((err) => console.warn("Erreur suppression image:", err));
        }
      }

      // Appeler la fonction RPC
      const { data, error } = await supabase.rpc("delete_event_completely", {
        p_event_id: event.id,
      });

      if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message);
      }

      console.log("Résultat de la suppression:", data);

      toast({
        title: "✅ Événement supprimé",
        description: data?.message || "L'événement a été supprimé avec succès",
        className: "bg-green-600 text-white",
      });

      // Redirection VERS LA LISTE avec flag de refresh
      navigate("/events", { 
        state: { 
          refresh: true, 
          timestamp: Date.now() 
        } 
      });
      
    } catch (error) {
      console.error("Delete error détaillé:", error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de supprimer l'événement",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  // ========== FIN DE LA FONCTION CORRIGÉE ==========

  const handleToggleSales = async () => {
    if (!isOwner) return;
    setTogglingSales(true);
    const newStatus = !event.is_sales_closed;
    try {
      setEvent((prev) => ({ ...prev, is_sales_closed: newStatus }));
      const { error } = await supabase
        .from("events")
        .update({ is_sales_closed: newStatus })
        .eq("id", event.id);
      if (error) {
        setEvent((prev) => ({ ...prev, is_sales_closed: !newStatus }));
        throw error;
      }
      toast({
        title: newStatus
          ? t("eventDetail.toast.salesClosed")
          : t("eventDetail.toast.salesReopened"),
        description: newStatus
          ? t("eventDetail.toast.salesClosedDesc")
          : t("eventDetail.toast.salesReopenedDesc"),
        className: newStatus
          ? "bg-amber-600 text-white"
          : "bg-green-600 text-white",
      });
    } catch (err) {
      console.error("Error toggling sales", err);
      toast({
        title: t("common.error"),
        description: t("eventDetail.toast.salesToggleError"),
        variant: "destructive",
      });
    } finally {
      setTogglingSales(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
        <span className="sr-only">{t("eventDetail.loading")}</span>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="min-h-screen bg-black text-center p-8">
        <h1 className="text-2xl text-red-400">{t("eventDetail.notFound")}</h1>
      </div>
    );
  }

  const optimizedImageUrl =
    event.cover_image ||
    "https://images.unsplash.com/photo-1509930854872-0f61005b282e";
  const canDelete =
    isOwner ||
    (userProfile &&
      ["super_admin", "admin", "secretary"].includes(userProfile.user_type));

  const now = new Date();
  const eventStartDate = new Date(event.event_start_at);
  const eventEndDate = event.event_end_at ? new Date(event.event_end_at) : null;
  const closingDate =
    eventEndDate ||
    (() => {
      const c = new Date(eventStartDate);
      c.setHours(23, 59, 59, 999);
      return c;
    })();
  const isEventFinished = now > closingDate;
  const isEventStarted = now >= eventStartDate;
  const isEventOngoing = isEventStarted && !isEventFinished;
  const isPresale = now < eventStartDate && !isEventFinished;
  const isSalesClosed = isEventFinished || event.is_sales_closed === true;

  return (
    <div className="min-h-screen bg-black">
      <MultilingualSeoHead
        pageData={{
          title: event.title,
          description: event.description,
          ogImage: optimizedImageUrl,
          event: {
            ...event,
            ticket_types: ticketTypes,
          },
        }}
      />

      <style>{`
        @keyframes slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .sliding-image-container {
          animation: slide 30s linear infinite;
          width: 200%;
          height: 100%;
          display: flex;
          position: absolute;
          top: 0;
          left: 0;
          background-color: #111;
          align-items: center;
        }
        .sliding-image-container img {
          width: 50%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white hover:bg-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
          <div className="flex gap-2">
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 border-0"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("common.delete")}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* ========== IMAGE DE COUVERTURE AGRANDIE ========== */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black">
              {/* Image agrandie avec hauteur fixe */}
              <div className="w-full h-[350px] sm:h-[400px] md:h-[500px] lg:h-[550px] xl:h-[600px] relative">
                <img 
                  src={optimizedImageUrl} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1509930854872-0f61005b282e';
                  }}
                />
                
                {/* Gradient overlay pour améliorer la lisibilité */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                
                {/* Badge en haut à gauche */}
                <div className="absolute top-4 left-4 z-20">
                  <Badge className="bg-black/60 backdrop-blur-sm text-white border-white/20 text-sm px-3 py-1.5">
                    {event.category?.name || event.event_type}
                  </Badge>
                </div>
                
                {/* Titre superposé en bas */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white drop-shadow-lg leading-tight">
                    {event.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-300 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.event_start_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.city}, {event.country}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* TikTok actions buttons repositionnées */}
              <TikTokActionButtons
                event={event}
                onRefresh={handleDataRefresh}
                user={user}
              />
            </div>
            {/* ========== FIN IMAGE AGRANDIE ========== */}

            <div className="flex flex-col gap-4 px-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  {/* Badge déjà affiché sur l'image, on le cache ici pour éviter doublon */}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-white tracking-tight hidden">
                    {event.title}
                  </h1>
                </div>
                <div className="flex items-center gap-3 md:pt-2">
                  <div className="hidden md:block">
                    <BookmarkButton eventId={event.id} />
                  </div>
                </div>
              </div>
            </div>

            {event.event_start_at && (
              <div className="flex justify-center w-full py-2">
                <EventCountdown
                  eventDate={event.event_start_at}
                  eventEndDate={event.event_end_at}
                  showMotivation={true}
                  size="large"
                  className="w-full justify-center"
                />
              </div>
            )}

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 shadow-xl">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-800">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-gray-800 shadow-sm flex-1 min-w-[200px]">
                      <div className="p-2 rounded-full bg-blue-900/30 text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          {t("eventDetail.date")}
                        </p>
                        <DateDisplay event={event} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-gray-800 shadow-sm flex-1 min-w-[200px]">
                      <div className="p-2 rounded-full bg-blue-900/30 text-blue-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          {t("eventDetail.location")}
                        </p>
                        <p className="font-semibold text-sm text-white">
                          {event.city}, {event.country}
                        </p>
                        {event.address && (
                          <p className="text-xs text-gray-400 mt-1">
                            {event.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-xl mb-3 text-white">
                    {t("eventDetail.about")}
                  </h3>
                  <ExpandableDescription description={event.description} />
                </CardContent>
              </Card>

              {isEventFinished && (
                <Alert className="bg-amber-950/50 border-amber-800/50 text-amber-300">
                  <Clock className="h-4 w-4" />
                  <AlertTitle className="text-amber-200">
                    {t("eventDetail.eventFinished")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-400">
                    {t("eventDetail.eventFinishedDescription", {
                      date: new Date(
                        eventEndDate || eventStartDate,
                      ).toLocaleDateString("fr-FR"),
                    })}
                  </AlertDescription>
                </Alert>
              )}

              {!isEventFinished && event.is_sales_closed && (
                <Alert className="bg-red-950/50 border-red-800/50 text-red-300">
                  <Lock className="h-4 w-4" />
                  <AlertTitle className="text-red-200">
                    {t("eventDetail.salesClosed")}
                  </AlertTitle>
                  <AlertDescription className="text-red-400">
                    {t("eventDetail.salesClosedDescription")}
                  </AlertDescription>
                </Alert>
              )}

              {isPresale && !event.is_sales_closed && (
                <Alert className="bg-green-950/50 border-green-800/50 text-green-300">
                  <Calendar className="h-4 w-4" />
                  <AlertTitle className="text-green-200">
                    {t("eventDetail.presaleActive")}
                  </AlertTitle>
                  <AlertDescription className="text-green-400">
                    {t("eventDetail.presaleDescription", {
                      date: new Date(eventStartDate).toLocaleDateString(
                        "fr-FR",
                      ),
                    })}
                  </AlertDescription>
                </Alert>
              )}

              {isEventOngoing && !event.is_sales_closed && (
                <Alert className="bg-blue-950/50 border-blue-800/50 text-blue-300">
                  <PlayCircle className="h-4 w-4" />
                  <AlertTitle className="text-blue-200">
                    {t("eventDetail.eventOngoing")}
                  </AlertTitle>
                  <AlertDescription className="text-blue-400">
                    {t("eventDetail.eventOngoingDescription")}
                  </AlertDescription>
                </Alert>
              )}

              <CommunityVerification
                eventId={event.id}
                eventDate={event.event_start_at}
              />

              {/* SECTION VOTE */}
              {event.event_type === "voting" && (
                <>
                  {isEventFinished && (
                    <Card className="bg-gradient-to-r from-amber-950/30 to-orange-950/30 border-amber-800/50 p-6 text-center mb-4">
                      <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                      <h3 className="text-xl font-bold text-white mb-2">
                        🎉 Concours terminé ! 🎉
                      </h3>
                      <p className="text-gray-300">
                        Ce vote est maintenant clos. Vous pouvez consulter
                        ci-dessous le classement final et les résultats
                        détaillés.
                      </p>
                      <p className="text-amber-400 text-sm mt-2">
                        Merci à tous les participants pour votre engagement !
                      </p>
                    </Card>
                  )}

                  <VotingInterface
                    event={event}
                    isUnlocked={true}
                    onRefresh={handleDataRefresh}
                    isClosed={isEventFinished || isSalesClosed}
                  />
                </>
              )}

              {event.event_type === "raffle" && (
                <RaffleInterface
                  raffleData={eventData}
                  eventId={event.id}
                  event={event}
                  isUnlocked={true}
                  onPurchaseSuccess={handleDataRefresh}
                  isClosed={isSalesClosed}
                />
              )}
              {event.event_type === "stand_rental" && (
                <StandRentalInterface
                  event={event}
                  isUnlocked={true}
                  onRefresh={handleDataRefresh}
                  isClosed={isSalesClosed}
                />
              )}
              {event.event_type === "ticketing" && (
                <div id="tickets-section" className="scroll-mt-20">
                  <TicketingInterface
                    event={event}
                    ticketingData={eventData}
                    ticketTypes={ticketTypes}
                    isUnlocked={true}
                    onRefresh={handleDataRefresh}
                    isClosed={isSalesClosed}
                  />
                </div>
              )}

              {promoConfig?.enabled && isInfluencer && !isEventFinished && (
                <div className="mt-8">
                  <PromoCodeGenerator
                    eventId={event.id}
                    eventTitle={event.title}
                    onCodeGenerated={(code) => {
                      console.log("Code genere:", code);
                      toast({
                        title: "Code genere !",
                        description: `Votre code ${code} est pret a etre partage`,
                        className: "bg-green-600 text-white",
                      });
                    }}
                  />
                </div>
              )}

              <div id="comments-section" className="scroll-mt-20">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-white">
                      {t("eventDetail.comments")}
                    </h2>
                    <SocialInteractions
                      event={event}
                      isUnlocked={true}
                      variant="horizontal"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {isOwner && (
              <Card className="bg-gray-900/80 backdrop-blur-sm border-blue-800/50 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-3 border-b border-blue-800/30">
                  <h3 className="font-bold text-blue-300 flex items-center gap-2">
                    <Settings className="w-4 h-4" />{" "}
                    {t("eventDetail.admin.title")}
                  </h3>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col gap-3 bg-black/20 p-3 rounded-lg border border-white/10">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-white">
                          {t("eventDetail.admin.eventStatus")}
                        </p>
                        {isEventFinished ? (
                          <Badge
                            variant="destructive"
                            className="bg-amber-600 text-white"
                          >
                            {t("eventDetail.admin.status.finished")}
                          </Badge>
                        ) : isEventOngoing ? (
                          <Badge
                            variant="default"
                            className="bg-green-600 text-white"
                          >
                            {t("eventDetail.admin.status.ongoing")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-blue-600 text-white"
                          >
                            {t("eventDetail.admin.status.upcoming")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-white">
                          {t("eventDetail.admin.salesStatus")}
                        </p>
                        {isSalesClosed ? (
                          <Badge
                            variant="destructive"
                            className="bg-red-600 text-white"
                          >
                            {t("eventDetail.admin.sales.closed")}
                          </Badge>
                        ) : isPresale ? (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-600 text-white"
                          >
                            {t("eventDetail.admin.sales.presale")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="bg-green-600 text-white"
                          >
                            {t("eventDetail.admin.sales.open")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {!isEventFinished && (
                      <Button
                        size="sm"
                        onClick={handleToggleSales}
                        disabled={togglingSales}
                        className={`w-full font-bold ${
                          event.is_sales_closed
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                      >
                        {togglingSales ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : event.is_sales_closed ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {t("eventDetail.admin.reopenSales")}
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            {t("eventDetail.admin.closeSales")}
                          </>
                        )}
                      </Button>
                    )}

                    <p className="text-[10px] text-gray-400 text-center italic">
                      {isEventFinished
                        ? t("eventDetail.admin.salesClosedPermanent")
                        : event.is_sales_closed
                          ? t("eventDetail.admin.salesClosedManual")
                          : isPresale
                            ? t("eventDetail.admin.salesPresale")
                            : t("eventDetail.admin.salesNormal")}
                    </p>
                  </div>

                  {event.event_type === "ticketing" && (
                    <>
                      <Button
                        onClick={() => setShowScannerModal(true)}
                        className="w-full font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg"
                        size="lg"
                      >
                        <Scan className="w-5 h-5 mr-2" />{" "}
                        {t("eventDetail.admin.scanTickets")}
                      </Button>
                      <Button
                        onClick={() => setShowStatsModal(true)}
                        variant="outline"
                        className="w-full border-blue-800/50 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300"
                      >
                        <BarChart className="w-4 h-4 mr-2" />{" "}
                        {t("eventDetail.admin.entryStats")}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {isOwner && promoConfig?.enabled && (
              <Card className="bg-gray-900/80 backdrop-blur-sm border-green-800/50 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-3 border-b border-green-800/30">
                  <h3 className="font-bold text-green-300 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Codes de réduction
                  </h3>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Statut</span>
                      <Badge className="bg-green-600 text-white">Actif</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Réduction</span>
                      <span className="text-white font-medium">
                        {promoConfig.discount_type === "fixed"
                          ? `${promoConfig.discount_value.toLocaleString()} FCFA`
                          : `${promoConfig.discount_value}%`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">
                        Commission influenceur
                      </span>
                      <span className="text-white font-medium">
                        {promoConfig.commission_rate}%
                      </span>
                    </div>
                    {promoConfig.usage_limit && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">
                          Limite d'utilisation
                        </span>
                        <span className="text-white font-medium">
                          {promoConfig.usage_limit} utilisations/code
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {isOwner && event.event_type === "stand_rental" && (
              <Card className="bg-gray-900/80 backdrop-blur-sm border-blue-800/50 shadow-xl overflow-hidden animate-in fade-in">
                <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 p-3 border-b border-blue-800/30">
                  <h3 className="font-bold text-blue-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />{" "}
                    {t("eventDetail.standDashboard.title")}
                  </h3>
                </div>
                <CardContent className="p-4 space-y-4">
                  {standStats.loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin text-blue-400" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {t("eventDetail.standDashboard.rented")}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-blue-900/30 text-blue-300 border-blue-700/50 text-lg px-3"
                        >
                          {standStats.total_rented}
                        </Badge>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-gray-800">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-300">
                            {t("eventDetail.standDashboard.grossRevenue")}
                          </span>
                          <span className="font-medium text-white">
                            {standStats.gross_revenue} pièces
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-red-400 flex items-center gap-1">
                            <PieChart className="w-3 h-3" />{" "}
                            {t("eventDetail.standDashboard.fees")}
                          </span>
                          <span className="text-red-400">
                            -{standStats.platform_fee} pièces
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {event.organizer && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2 text-white">
                    {t("eventDetail.organizer")}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                      {event.organizer.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {event.organizer.full_name}
                      </p>
                      {event.contact_phone && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {event.contact_phone}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-black border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">
              {t("eventDetail.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {t("eventDetail.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 border-0"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VerificationStatsDialog
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        eventId={event?.id}
        organizerId={user?.id}
      />

      <TicketScannerDialog
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        eventId={event?.id}
      />
    </div>
  );
};

export default EventDetailPage;