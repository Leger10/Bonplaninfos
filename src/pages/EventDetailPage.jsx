import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Phone, Trash2, Loader2, Share2, ChevronDown, ChevronUp, BarChart, AlertTriangle, QrCode, TrendingUp, PieChart, Heart, MessageCircle, Bookmark, Eye, Lock, Clock, Scan, Settings, PlayCircle, PauseCircle, CheckCircle2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import SocialInteractions from '@/components/social/SocialInteractions';
import RaffleInterface from '@/components/event/RaffleInterface';
import StandRentalInterface from '@/components/event/StandRentalInterface';
import TicketingInterface from '@/components/event/TicketingInterface';
import VotingInterface from '@/components/event/VotingInterface';
import EventCountdown from '@/components/EventCountdown';
import BookmarkButton from '@/components/common/BookmarkButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { extractStoragePath, fetchWithRetry } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CommunityVerification from '@/components/event/CommunityVerification';
import TicketScannerDialog from '@/components/event/TicketScannerDialog';

// Component for Verification Stats (Organizer Only)
const VerificationStatsDialog = ({ isOpen, onClose, eventId, organizerId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      const fetchStats = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.rpc('get_verification_stats', {
            p_event_id: eventId,
            p_organizer_id: organizerId
          });
          if (error) throw error;
          setStats(data?.stats);
        } catch (err) {
          console.error("Error stats:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchStats();
    }
  }, [isOpen, eventId, organizerId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <BarChart className="w-5 h-5 text-blue-400" /> Statistiques de Validation
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            État des entrées en temps réel
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-blue-400" />
          </div>
        ) : stats ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-800">
                <p className="text-xs text-gray-400 uppercase font-bold">Billets Vendus</p>
                <p className="text-2xl font-bold text-white">{stats.total_tickets}</p>
              </div>
              <div className="bg-blue-900/20 p-4 rounded-lg text-center border border-blue-800/50">
                <p className="text-xs text-blue-400 uppercase font-bold">Validés / Entrés</p>
                <p className="text-2xl font-bold text-blue-400">{stats.verified_tickets}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Taux de présence</span>
                <span className="font-bold text-white">{stats.verification_rate}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${stats.verification_rate}%` }}
                ></div>
              </div>
            </div>

            {stats.duplicate_scans > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-900/20 p-3 rounded-lg border border-yellow-800/30">
                <AlertTriangle className="w-4 h-4" />
                <span>{stats.duplicate_scans} tentatives de doublons détectées</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500">Aucune donnée disponible</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

// TikTok-like Action Buttons Component
const TikTokActionButtons = ({ event, onRefresh, user }) => {
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
        title: "Connexion requise",
        description: "Veuillez vous connecter pour interagir.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newLikedState = !isLiked;
      const likeChange = newLikedState ? 1 : -1;

      setLikes(prev => prev + likeChange);
      setIsLiked(newLikedState);

      await supabase.rpc('toggle_event_like', {
        p_event_id: event.id,
        p_user_id: user.id
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error toggling like:", error);
      setLikes(prev => prev - (isLiked ? 1 : -1));
      setIsLiked(!isLiked);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const shareData = {
      title: event.title,
      text: event.description ? event.description.substring(0, 100) + '...' : `Découvrez ${event.title}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Lien copié", description: "Lien copié dans le presse-papier." });
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  return (
    <div className="absolute right-4 bottom-4 flex flex-col items-center gap-4 z-30">
      {/* Vue Count */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-xs drop-shadow-md">{event?.views_count || 0}</span>
      </div>

      {/* Favorite Button */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 flex items-center justify-center">
          <BookmarkButton
            eventId={event?.id}
            variant="ghost"
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 hover:border-white/40 text-white p-0"
          />
        </div>
        <span className="text-white font-bold text-xs drop-shadow-md">Favoris</span>
      </div>

      {/* Comment Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          onClick={() => {
            document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 hover:border-white/40"
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </Button>
        <span className="text-white font-bold text-xs drop-shadow-md">{comments}</span>
      </div>

      {/* Share Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          onClick={handleShare}
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 hover:border-white/40"
        >
          <Share2 className="w-5 h-5 text-white" />
        </Button>
        <span className="text-white font-bold text-xs drop-shadow-md">Partager</span>
      </div>
    </div>
  );
};

// Expandable Description Component
const ExpandableDescription = ({ description }) => {
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
            <>Voir moins <ChevronUp className="ml-1 w-4 h-4" /></>
          ) : (
            <>Voir plus <ChevronDown className="ml-1 w-4 h-4" /></>
          )}
        </Button>
      )}
    </div>
  );
};

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, forceRefreshUserProfile } = useData();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingSales, setTogglingSales] = useState(false);

  // Organizer specific states
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [standStats, setStandStats] = useState({
    total_rented: 0,
    gross_revenue: 0,
    organizer_net: 0,
    platform_fee: 0,
    loading: false
  });

  const userId = user?.id;

  const fetchEventData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    console.log("Fetching event data for ID:", id);
    try {
      const { data: fetchedEvent, error: eventError } = await fetchWithRetry(() =>
        supabase.from('events')
          .select('*, organizer:organizer_id(full_name), category:category_id(name, slug)')
          .eq('id', id)
          .maybeSingle()
      );

      if (eventError) throw eventError;

      if (!fetchedEvent) {
        console.error("Event not found");
        setEvent(null);
        return;
      }

      setEvent(fetchedEvent);

      let specificEventData = null;
      if (fetchedEvent.event_type === 'raffle') {
        const { data } = await supabase.from('raffle_events').select('*').eq('event_id', id).maybeSingle();
        specificEventData = data;
      } else if (fetchedEvent.event_type === 'stand_rental') {
        const { data } = await supabase.from('stand_events').select('*').eq('event_id', id).maybeSingle();
        specificEventData = data;
      } else if (fetchedEvent.event_type === 'ticketing') {
        const { data: ticketingDetails } = await supabase.from('ticketing_events').select('*').eq('event_id', id).maybeSingle();
        specificEventData = ticketingDetails;
        const { data: types } = await supabase.from('ticket_types').select('*').eq('event_id', id).eq('is_active', true);
        setTicketTypes(types || []);
      }
      setEventData(specificEventData);

    } catch (error) {
      console.error("Error fetching event:", error);
      setEvent(null);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchEventData(); }, [fetchEventData]);

  // Track view when component mounts
  useEffect(() => {
    if (!id || !event) return;

    const trackView = async () => {
      try {
        const { data, error } = await supabase.rpc('track_event_view', {
          p_event_id: id,
          p_user_id: userId || null
        });

        if (error) {
          console.error("Error tracking view:", error);
          return;
        }

        if (data && data.new_views_count !== undefined) {
          const { data: updatedEvent } = await supabase
            .from('events')
            .select('views_count')
            .eq('id', id)
            .single();

          if (updatedEvent) {
            setEvent(prev => prev ? {
              ...prev,
              views_count: updatedEvent.views_count
            } : prev);
          }
        }
      } catch (error) {
        console.error("Exception while tracking view:", error);
      }
    };

    const timeoutId = setTimeout(trackView, 1000);
    return () => clearTimeout(timeoutId);
  }, [id, event, userId]);

  const isOwner = user && event?.organizer_id === user.id;

  useEffect(() => {
    if (isOwner && event?.event_type === 'stand_rental') {
      const fetchStandStats = async () => {
        setStandStats(prev => ({ ...prev, loading: true }));
        try {
          const { count } = await supabase
            .from('stand_rentals')
            .select('*', { count: 'exact', head: true })
            .in('stand_event_id', (await supabase.from('stand_events').select('id').eq('event_id', event.id)).data.map(e => e.id))
            .eq('status', 'confirmed');

          const { data: earnings } = await supabase
            .from('organizer_earnings')
            .select('earnings_coins, platform_commission, amount_pi')
            .eq('event_id', event.id)
            .eq('transaction_type', 'stand_rental');

          const gross = earnings?.reduce((acc, curr) => acc + (curr.amount_pi || 0), 0) || 0;
          const net = earnings?.reduce((acc, curr) => acc + (curr.earnings_coins || 0), 0) || 0;
          const fee = earnings?.reduce((acc, curr) => acc + (curr.platform_commission || 0), 0) || 0;

          setStandStats({
            total_rented: count || 0,
            gross_revenue: gross,
            organizer_net: net,
            platform_fee: fee,
            loading: false
          });
        } catch (err) {
          console.error("Failed to fetch stand stats", err);
          setStandStats(prev => ({ ...prev, loading: false }));
        }
      };
      fetchStandStats();
    }
  }, [isOwner, event]);

  const handleDataRefresh = () => { fetchEventData(); if (forceRefreshUserProfile) forceRefreshUserProfile(); };

  const handleDeleteEvent = async () => {
    if (!event) return;
    setIsDeleting(true);
    try {
      if (event.cover_image) {
        const storageInfo = extractStoragePath(event.cover_image);
        if (storageInfo) {
          await supabase.storage.from(storageInfo.bucket).remove([storageInfo.path]);
        }
      }

      const { error } = await supabase.rpc('delete_event_completely', { p_event_id: event.id });
      if (error) throw error;

      toast({ title: "Succès", description: "Événement supprimé avec succès." });
      navigate('/events');
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'événement.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleToggleSales = async () => {
    if (!isOwner) return;
    setTogglingSales(true);
    
    // Toggle the current status
    const newStatus = !event.is_sales_closed;
    
    console.log(`[EventDetail] Toggling sales. Old: ${event.is_sales_closed}, New: ${newStatus}`);
    
    try {
        // Optimistic update - Update UI immediately
        setEvent(prev => ({ ...prev, is_sales_closed: newStatus }));
        
        const { error } = await supabase
            .from('events')
            .update({ is_sales_closed: newStatus })
            .eq('id', event.id);
            
        if (error) {
            // Revert on error
            setEvent(prev => ({ ...prev, is_sales_closed: !newStatus }));
            throw error;
        }
        
        toast({
            title: newStatus ? "Ventes fermées" : "Ventes rouvertes",
            description: newStatus ? "Les participants ne peuvent plus acheter." : "Les ventes sont de nouveau ouvertes.",
            className: newStatus ? "bg-amber-600 text-white" : "bg-green-600 text-white"
        });
    } catch (err) {
        console.error("Error toggling sales", err);
        toast({ title: "Erreur", description: "Impossible de modifier le statut des ventes", variant: "destructive" });
    } finally {
        setTogglingSales(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-blue-400" /></div>;
  if (!event) return <div className="min-h-screen bg-black text-center p-8"><h1 className="text-2xl text-red-400">Événement non trouvé</h1></div>;

  const optimizedImageUrl = event.cover_image || "https://images.unsplash.com/photo-1509930854872-0f61005b282e";
  const canDelete = isOwner || (userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type));

  // --- UPDATED DATE LOGIC ---
  const now = new Date();
  let closingDate;
  
  // Utiliser la date de fin si elle existe, sinon utiliser event_date + 1 jour
  if (event.end_date) {
      closingDate = new Date(event.end_date);
  } else if (event.event_date) {
      closingDate = new Date(event.event_date);
      closingDate.setHours(23, 59, 59, 999);
  } else {
      closingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Demain par défaut
  }

  // Event is considered strictly "closed" if date passed
  const isDateClosed = now > closingDate;
  // Final state for components: date closed OR manually closed
  const isSalesClosed = isDateClosed || event.is_sales_closed === true;
  
  console.log(`[EventDetail] Render cycle. 
    Event Date: ${event.event_date}
    End Date: ${event.end_date}
    Closing Date: ${closingDate}
    isDateClosed: ${isDateClosed}
    isSalesClosed (manual): ${event.is_sales_closed}
    Final isSalesClosed: ${isSalesClosed}`);

  return (
    <div className="min-h-screen bg-black">
      <MultilingualSeoHead pageData={{ title: event.title, description: event.description, ogImage: optimizedImageUrl }} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-300 hover:text-white hover:bg-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />Retour
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
                Supprimer
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Image Section */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl group aspect-video md:aspect-[2/1]">
              <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={event.title} src={optimizedImageUrl} />

              {/* Subtle gradient at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

              {/* Action Buttons Overlay */}
              <TikTokActionButtons
                event={event}
                onRefresh={handleDataRefresh}
                user={user}
              />
            </div>

            {/* Title & Category Section */}
            <div className="flex flex-col gap-4 px-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <Badge className="bg-blue-900/40 text-blue-300 hover:bg-blue-800/40 border-blue-700/50 text-sm px-3 py-1 w-fit">
                    {event.category?.name || event.event_type}
                  </Badge>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-white tracking-tight">
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

            {/* Countdown Timer with End Date Support */}
            {event.event_date && (
              <div className="flex justify-center w-full py-2">
                <EventCountdown
                  eventDate={event.event_date}
                  eventEndDate={closingDate} // Pass end_date to allow "Ongoing" state
                  showMotivation={true}
                  size="large"
                  className="w-full justify-center"
                />
              </div>
            )}

            {/* Main Content Card */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800 shadow-xl">
                <CardContent className="p-6 md:p-8">
                  {/* Metadata Section */}
                  <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-800">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-gray-800 shadow-sm flex-1 min-w-[200px]">
                      <div className="p-2 rounded-full bg-blue-900/30 text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Date</p>
                        <p className="font-semibold text-sm text-white">
                          {new Date(event.event_date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-gray-800 shadow-sm flex-1 min-w-[200px]">
                      <div className="p-2 rounded-full bg-blue-900/30 text-blue-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Lieu</p>
                        <p className="font-semibold text-sm text-white">{event.city}, {event.country}</p>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-xl mb-3 text-white">À propos</h3>
                  <ExpandableDescription description={event.description} />
                </CardContent>
              </Card>

              {/* Status Messages */}
              {isDateClosed && (
                <Alert className="bg-amber-950/50 border-amber-800/50 text-amber-300">
                  <Clock className="h-4 w-4" />
                  <AlertTitle className="text-amber-200">Événement Terminé</AlertTitle>
                  <AlertDescription className="text-amber-400">
                    Cet événement est terminé. Les participations ne sont plus possibles.
                  </AlertDescription>
                </Alert>
              )}
              
              {!isDateClosed && event.is_sales_closed && (
                <Alert className="bg-red-950/50 border-red-800/50 text-red-300">
                  <Lock className="h-4 w-4" />
                  <AlertTitle className="text-red-200">Ventes Fermées</AlertTitle>
                  <AlertDescription className="text-red-400">
                    L'organisateur a fermé les ventes pour le moment.
                  </AlertDescription>
                </Alert>
              )}

              {/* Community Verification */}
              <CommunityVerification eventId={event.id} eventDate={event.event_date} />

              {event.event_type === 'voting' && (
                <VotingInterface
                  event={event}
                  isUnlocked={true}
                  onRefresh={handleDataRefresh}
                  isClosed={isSalesClosed} // Use combined closed status which is dynamic
                />
              )}
              {event.event_type === 'raffle' && (
                <RaffleInterface
                  raffleData={eventData}
                  eventId={event.id}
                  event={event} 
                  isUnlocked={true}
                  onPurchaseSuccess={handleDataRefresh}
                  isClosed={isSalesClosed} // Use combined closed status
                />
              )}
              {event.event_type === 'stand_rental' && (
                <StandRentalInterface
                  event={event}
                  isUnlocked={true}
                  onRefresh={handleDataRefresh}
                  isClosed={isSalesClosed} // Use combined closed status
                />
              )}
              {event.event_type === 'ticketing' && (
                <div id="tickets-section" className="scroll-mt-20">
                  <TicketingInterface
                    event={event}
                    ticketingData={eventData}
                    ticketTypes={ticketTypes}
                    isUnlocked={true}
                    onRefresh={handleDataRefresh}
                    isClosed={isSalesClosed} // Use combined closed status
                  />
                </div>
              )}

              {/* Comments Section */}
              <div id="comments-section" className="scroll-mt-20">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-white">Commentaires</h2>
                    <SocialInteractions event={event} isUnlocked={true} variant="horizontal" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Organizer Dashboard General Control */}
            {isOwner && (
                <Card className="bg-gray-900/80 backdrop-blur-sm border-blue-800/50 shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-3 border-b border-blue-800/30">
                      <h3 className="font-bold text-blue-300 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Administration
                      </h3>
                    </div>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col gap-3 bg-black/20 p-3 rounded-lg border border-white/10">
                            <div className="flex justify-between items-center">
                                <p className="font-medium text-white">Statut des Ventes</p>
                                {event.is_sales_closed ? (
                                    <Badge variant="destructive" className="bg-red-600 text-white">Actuellement fermées</Badge>
                                ) : (
                                    <Badge variant="default" className="bg-green-600 text-white hover:bg-green-700">Actuellement ouvertes</Badge>
                                )}
                            </div>
                            
                            {event.is_sales_closed ? (
                                <Button 
                                    size="sm" 
                                    onClick={handleToggleSales}
                                    disabled={togglingSales}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                                >
                                    {togglingSales ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Rouvrir les ventes
                                </Button>
                            ) : (
                                <Button 
                                    size="sm" 
                                    onClick={handleToggleSales}
                                    disabled={togglingSales}
                                    variant="destructive"
                                    className="w-full font-bold"
                                >
                                    {togglingSales ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                                    Fermer les ventes
                                </Button>
                            )}
                            
                            <p className="text-[10px] text-gray-400 text-center italic">
                                {event.is_sales_closed 
                                    ? "Les participants ne peuvent plus acheter de tickets/votes." 
                                    : "Les participants peuvent acheter des tickets/votes."}
                            </p>
                        </div>
                        
                        {event.event_type === 'ticketing' && (
                            <>
                                <Button
                                    onClick={() => setShowScannerModal(true)}
                                    className="w-full font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg"
                                    size="lg"
                                >
                                    <Scan className="w-5 h-5 mr-2" /> Vérifier Billets
                                </Button>

                                <Button
                                    onClick={() => setShowStatsModal(true)}
                                    variant="outline"
                                    className="w-full border-blue-800/50 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300"
                                >
                                    <BarChart className="w-4 h-4 mr-2" /> Statistiques Entrées
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {isOwner && event.event_type === 'stand_rental' && (
              <Card className="bg-gray-900/80 backdrop-blur-sm border-blue-800/50 shadow-xl overflow-hidden animate-in fade-in">
                <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 p-3 border-b border-blue-800/30">
                  <h3 className="font-bold text-blue-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Tableau de bord Stands
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
                        <span className="text-sm text-gray-400">Stands Loués</span>
                        <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-700/50 text-lg px-3">
                          {standStats.total_rented}
                        </Badge>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-gray-800">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-300">Revenus Bruts</span>
                          <span className="font-medium text-white">{standStats.gross_revenue} pièces</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-red-400 flex items-center gap-1">
                            <PieChart className="w-3 h-3" /> Frais (5%)
                          </span>
                          <span className="text-red-400">-{standStats.platform_fee} pièces</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-700">
                          <span className="font-bold text-green-400">Vos Gains Nets (95%)</span>
                          <span className="font-bold text-xl text-green-400">{standStats.organizer_net} pièces</span>
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
                  <h3 className="font-bold text-lg mb-2 text-white">Organisé par</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                      {event.organizer.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-white">{event.organizer.full_name}</p>
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-black border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 border-0"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Dialog */}
      <VerificationStatsDialog
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        eventId={event?.id}
        organizerId={user?.id}
      />

      {/* Ticket Scanner Dialog */}
      <TicketScannerDialog
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        eventId={event?.id}
      />
    </div>
  );
};

export default EventDetailPage;