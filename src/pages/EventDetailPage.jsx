import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Phone, Trash2, Loader2, Lock, Coins, Share2, ChevronDown, ChevronUp, BarChart, AlertTriangle, QrCode, Store, TrendingUp, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PaymentModal from '@/components/PaymentModal';
import WalletInfoModal from '@/components/WalletInfoModal';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import SocialInteractions from '@/components/social/SocialInteractions';
import RaffleInterface from '@/components/event/RaffleInterface';
import StandRentalInterface from '@/components/event/StandRentalInterface';
import TicketingInterface from '@/components/event/TicketingInterface';
import VotingInterface from '@/components/event/VotingInterface';
import EventCountdown from '@/components/EventCountdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { extractStoragePath } from '@/lib/utils';
import { CoinService } from '@/services/CoinService';

// Component for Verification Stats
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BarChart className="w-5 h-5 text-primary" /> Statistiques de Validation</DialogTitle>
          <DialogDescription>État des entrées en temps réel</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : stats ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-xs text-muted-foreground uppercase font-bold">Billets Vendus</p>
                <p className="text-2xl font-bold">{stats.total_tickets}</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg text-center border border-primary/20">
                <p className="text-xs text-primary uppercase font-bold">Validés / Entrés</p>
                <p className="text-2xl font-bold text-primary">{stats.verified_tickets}</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Taux de présence</span>
                <span className="font-bold">{stats.verification_rate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${stats.verification_rate}%` }}></div>
              </div>
            </div>

            {stats.duplicate_scans > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                <AlertTriangle className="w-4 h-4" />
                <span>{stats.duplicate_scans} tentatives de doublons détectées</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Aucune donnée disponible</p>
        )}
      </DialogContent>
    </Dialog>
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
    <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
      <p className="whitespace-pre-line">
        {content}
        {!isExpanded && shouldTruncate && "..."}
      </p>
      {shouldTruncate && (
        <Button 
          variant="ghost" 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="mt-2 p-0 h-auto font-semibold text-primary hover:text-primary/80 hover:bg-transparent flex items-center"
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

// Utility for fetch retries
const fetchWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 1.5);
  }
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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
  const [confirmation, setConfirmation] = useState({ isOpen: false, type: null, cost: 0, costFcfa: 0, breakdown: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Organizer specific states
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [standStats, setStandStats] = useState({
    total_rented: 0,
    gross_revenue: 0,
    organizer_net: 0,
    platform_fee: 0,
    loading: false
  });

  const userId = user?.id;
  const userType = userProfile?.user_type;

  const fetchEventData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Use maybeSingle() to avoid PGRST116 error when event is not found
      const { data: fetchedEvent, error: eventError } = await fetchWithRetry(() => 
        supabase.from('events')
          .select('*, organizer:organizer_id(full_name), category:category_id(name, slug)')
          .eq('id', id)
          .maybeSingle()
      );
      
      if (eventError) throw eventError;
      
      if (!fetchedEvent) {
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

      const isOwner = userId && fetchedEvent.organizer_id === userId;
      const isAdmin = userType && ['super_admin', 'admin', 'secretary'].includes(userType);

      if (isOwner || isAdmin || fetchedEvent.event_type !== 'protected') {
        setIsUnlocked(true);
      } else if (userId) {
        // Safe check for unlock
        const { data: accessData } = await supabase
            .from('protected_event_access')
            .select('status, expires_at')
            .eq('event_id', id)
            .eq('user_id', userId)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();
            
        setIsUnlocked(!!accessData);
      } else {
        setIsUnlocked(false);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      setEvent(null);
    } finally { setLoading(false); }
  }, [id, userId, userType]);

  useEffect(() => { fetchEventData(); }, [fetchEventData]);

  const isOwner = user && event?.organizer_id === user.id;

  // --- Fetch Stand Stats for Organizer ---
  useEffect(() => {
    if (isOwner && event?.event_type === 'stand_rental') {
      const fetchStandStats = async () => {
        setStandStats(prev => ({ ...prev, loading: true }));
        try {
          // Get basic count
          const { count } = await supabase
            .from('stand_rentals')
            .select('*', { count: 'exact', head: true })
            .in('stand_event_id', (await supabase.from('stand_events').select('id').eq('event_id', event.id)).data.map(e => e.id))
            .eq('status', 'confirmed');

          // Get Earnings from organizer_earnings table
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

  const executeUnlock = async () => {
    if (!user || !event) return;
    setActionLoading(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('access_protected_event', { p_event_id: event.id, p_user_id: user.id });
      if (rpcError) throw rpcError;
      if (!rpcData.success) throw new Error(rpcData.message);
      
      toast({ title: "Accès accordé !", description: `L'événement a été débloqué avec succès.`, className: "bg-green-600 text-white" });
      setIsUnlocked(true);
      handleDataRefresh();
    } catch (error) {
      if (error.message.includes('Solde insuffisant')) setShowWalletInfoModal(true);
      else toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setConfirmation({ isOpen: false, type: null, cost: 0, costFcfa: 0, breakdown: null, action: null });
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    setIsDeleting(true);
    console.log(`EventDetailPage: Deleting event ${event.id}`);
    try {
      // 1. Delete image from storage if exists
      if (event.cover_image) {
        const storageInfo = extractStoragePath(event.cover_image);
        if (storageInfo) {
          const { error: storageError } = await supabase.storage
            .from(storageInfo.bucket)
            .remove([storageInfo.path]);
          if (storageError) console.warn("Image delete warning:", storageError);
        }
      }

      // 2. Delete event from DB
      const { error } = await supabase.rpc('delete_event_completely', { p_event_id: event.id });
      if (error) throw error;

      toast({ title: "Succès", description: "Événement supprimé avec succès." });
      navigate('/events'); // Redirect to events list
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer l'événement. " + error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleUnlockClick = async () => {
    if (!user) { navigate('/auth'); return; }
    
    // Fetch fresh balances
    const balances = await CoinService.getWalletBalances(user.id);
    const cost = 2; // Hardcoded cost for now as per RPC default
    
    if (balances.total < cost) {
        setShowWalletInfoModal(true);
        return;
    }
    
    // Calculate Breakdown
    const freeUsed = Math.min(balances.free_coin_balance, cost);
    const paidUsed = cost - freeUsed;
    
    setConfirmation({ 
        isOpen: true, 
        type: "Débloquer cet événement", 
        cost: cost,
        breakdown: { free: freeUsed, paid: paidUsed },
        action: executeUnlock 
    });
  };

  const handleScanClick = () => {
    navigate('/verify-ticket');
  };

  const handleShare = async () => {
    if (!event) return;
    
    const shareData = {
      title: event.title,
      text: event.description ? event.description.substring(0, 100) + '...' : `Découvrez ${event.title} sur BonPlanInfos`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Lien copié", description: "Le lien a été copié dans le presse-papier." });
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!event) return <div className="min-h-screen bg-background text-center p-8"><h1 className="text-2xl text-red-500">Événement non trouvé</h1></div>;

  const optimizedImageUrl = event.cover_image || "https://images.unsplash.com/photo-1509930854872-0f61005b282e";
  const canDelete = isOwner || (userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type));

  return (
    <div className="min-h-screen bg-background">
      <MultilingualSeoHead pageData={{ title: event.title, description: event.description, ogImage: optimizedImageUrl }} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image Card */}
            <div className="relative rounded-lg overflow-hidden shadow-lg group">
              <img className="w-full h-64 md:h-96 object-cover transition-transform duration-700 group-hover:scale-105" alt={event.title} src={optimizedImageUrl} />

              {!isUnlocked && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm p-6 text-center">
                  <Lock className="w-16 h-16 text-primary mb-4 animate-bounce" />
                  <h3 className="text-2xl font-bold text-white mb-2">Contenu Verrouillé</h3>
                  <p className="text-gray-200 mb-6 max-w-md">Cet événement est protégé. Accédez à tous les détails et fonctionnalités exclusives.</p>
                  <Button onClick={handleUnlockClick} size="lg" className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold shadow-lg transform hover:scale-105 transition-all"><Coins className="mr-2 h-5 w-5" /> Débloquer (2π)</Button>
                </div>
              )}
            </div>
            
            {/* Event Countdown moved below the cover image */}
            {isUnlocked && event.event_date && (
                <div className="flex justify-center mt-4"> {/* Added margin-top for spacing */}
                  <EventCountdown
                    eventDate={event.event_date}
                    showMotivation={true}
                    size="large"
                    className="justify-center"
                  />
                </div>
              )}

            {isUnlocked ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-none shadow-md overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                      <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">{event.title}</h1>
                        <div className="flex flex-wrap gap-3 text-muted-foreground mt-3">
                          <Badge variant="secondary" className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(event.event_date).toLocaleDateString()}</Badge>
                          <Badge variant="secondary" className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.city}, {event.country}</Badge>
                        </div>
                      </div>
                    </div>
                    <ExpandableDescription description={event.description} />
                  </CardContent>
                </Card>

                {event.event_type === 'voting' && <VotingInterface event={event} isUnlocked={isUnlocked} onRefresh={handleDataRefresh} />}
                {event.event_type === 'raffle' && (
                  <RaffleInterface
                    raffleData={eventData}
                    eventId={event.id}
                    isUnlocked={isUnlocked}
                    onPurchaseSuccess={handleDataRefresh}
                  />
                )}
                {event.event_type === 'stand_rental' && <StandRentalInterface event={event} isUnlocked={isUnlocked} onRefresh={handleDataRefresh} />}
                {event.event_type === 'ticketing' && (
                  <div id="tickets-section" className="scroll-mt-20">
                    <TicketingInterface
                      event={event}
                      ticketingData={eventData}
                      ticketTypes={ticketTypes}
                      isUnlocked={isUnlocked}
                      onRefresh={handleDataRefresh}
                    />
                  </div>
                )}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-muted"><CardContent className="p-12 text-center text-muted-foreground"><p>Débloquez l'événement pour voir le programme, acheter des billets ou participer.</p></CardContent></Card>
            )}
          </div>

          <div className="space-y-6">
            {/* ORGANIZER DASHBOARD PANEL - ONLY FOR TICKETING EVENTS */}
            {isOwner && event.event_type === 'ticketing' && (
              <Card className="border-primary/50 bg-primary/5 shadow-lg overflow-hidden">
                <div className="bg-primary/10 p-3 border-b border-primary/20 flex items-center justify-between">
                  <h3 className="font-bold text-primary flex items-center gap-2"><Lock className="w-4 h-4" /> Espace Organisateur</h3>
                </div>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground mb-2">Gérez les entrées pour cet événement.</p>

                  <Button onClick={handleScanClick} className="w-full font-bold" size="lg">
                    <QrCode className="w-5 h-5 mr-2" /> Scanner Billets
                  </Button>

                  <Button onClick={() => setShowStatsModal(true)} variant="outline" className="w-full">
                    <BarChart className="w-4 h-4 mr-2" /> Statistiques Entrées
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ORGANIZER PANEL - ONLY FOR STAND RENTAL EVENTS */}
            {isOwner && event.event_type === 'stand_rental' && (
              <Card className="border-blue-500/50 bg-blue-50/10 shadow-lg overflow-hidden animate-in fade-in">
                <div className="bg-blue-500/10 p-3 border-b border-blue-500/20">
                  <h3 className="font-bold text-blue-700 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Tableau de bord Stands</h3>
                </div>
                <CardContent className="p-4 space-y-4">
                  {standStats.loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-blue-500" /></div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stands Loués</span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-lg px-3">
                          {standStats.total_rented}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t border-blue-100">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Revenus Bruts</span>
                          <span className="font-medium">{standStats.gross_revenue} π</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-red-500 flex items-center gap-1"><PieChart className="w-3 h-3"/> Frais (5%)</span>
                          <span className="text-red-500">-{standStats.platform_fee} π</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                          <span className="font-bold text-green-700">Vos Gains Nets (95%)</span>
                          <span className="font-bold text-xl text-green-700">{standStats.organizer_net} π</span>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 mt-2">
                        Les gains sont automatiquement crédités sur votre compte organisateur après chaque réservation.
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <SocialInteractions event={event} isUnlocked={isUnlocked} />

            {/* Organizer Info */}
            {event.organizer && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">Organisé par</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {event.organizer.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{event.organizer.full_name}</p>
                      {event.contact_phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {event.contact_phone}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <WalletInfoModal isOpen={showWalletInfoModal} onClose={() => setShowWalletInfoModal(false)} onProceed={() => { setShowWalletInfoModal(false); setShowPaymentModal(true); }} />
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />

      <AlertDialog open={confirmation.isOpen} onOpenChange={(o) => !o && setConfirmation({ isOpen: false, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation.type}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>Coût total : <span className="font-bold text-primary text-lg">{confirmation.cost}π</span></p>
                {confirmation.breakdown && (
                  <div className="text-sm bg-muted p-3 rounded-md border border-border/50">
                    <p className="font-semibold mb-2">Détail du paiement :</p>
                    <ul className="space-y-1">
                      {confirmation.breakdown.free > 0 && (
                        <li className="flex justify-between text-green-600 font-medium">
                          <span>• Pièces gratuites (Bonus/Parrainage) :</span>
                          <span>-{confirmation.breakdown.free}π</span>
                        </li>
                      )}
                      {confirmation.breakdown.paid > 0 && (
                        <li className="flex justify-between text-blue-600 font-medium">
                          <span>• Pièces achetées :</span>
                          <span>-{confirmation.breakdown.paid}π</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Les pièces gratuites sont utilisées en priorité.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmation.action} disabled={actionLoading} className="bg-primary">
              {actionLoading ? <Loader2 className="animate-spin mr-2" /> : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible et effacera toutes les données associées (billets, participants, statistiques).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verification Stats Modal */}
      <VerificationStatsDialog
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        eventId={event?.id}
        organizerId={user?.id}
      />
    </div>
  );
};

export default EventDetailPage;