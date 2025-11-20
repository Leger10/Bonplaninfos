import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, MapPin,
  Phone, Trash2, Loader2, Lock, Coins, Gift, Store, Shield, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogTrigger,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PaymentModal from '@/components/PaymentModal';
import WalletInfoModal from '@/components/WalletInfoModal';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import SocialInteractions from '@/components/social/SocialInteractions';
import { CoinService } from '@/services/CoinService';
import RaffleInterface from '@/components/event/RaffleInterface';
import StandRentalInterface from '@/components/event/StandRentalInterface';
import TicketingInterface from '@/components/event/TicketingInterface';
import VotingInterface from '@/components/event/VotingInterface';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, adminConfig, forceRefreshUserProfile } = useData();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
  const [confirmation, setConfirmation] = useState({ isOpen: false, type: null, cost: 0, costFcfa: 0, action: null });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*, organizer:organizer_id(full_name), category:category_id(name, slug)')
        .eq('id', id)
        .single();
      
      if (eventError) throw eventError;
      setEvent(eventData);

      let specificEventData = null;
      if (eventData.event_type === 'raffle') {
        const { data: raffleData, error: raffleError } = await supabase.from('raffle_events').select('*').eq('event_id', id).single();
        if(raffleError && raffleError.code !== 'PGRST116') throw raffleError;
        const { data: prizesData, error: prizesError } = await supabase.from('raffle_prizes').select('*').eq('event_id', id);
        if(prizesError) throw prizesError;
        specificEventData = raffleData ? { ...raffleData, prizes: prizesData || [] } : null;
      } else if (eventData.event_type === 'stand_rental') {
        const { data: standEventData, error: standEventError } = await supabase.from('stand_events').select('*').eq('event_id', id).single();
        if (standEventError && standEventError.code !== 'PGRST116') throw standEventError;
        const { data: standTypesData, error: standTypesError } = await supabase.from('stand_types').select('*').eq('event_id', id);
        if (standTypesError) throw standTypesError;
        specificEventData = standEventData ? { ...standEventData, stand_types: standTypesData || [] } : null;
      } else if (eventData.event_type === 'ticketing') {
        const { data: ticketingData, error: ticketingError } = await supabase.from('ticketing_events').select('*').eq('event_id', id).single();
        if (ticketingError && ticketingError.code !== 'PGRST116') throw ticketingError;
        const { data: ticketTypesData, error: ticketTypesError } = await supabase.from('ticket_types').select('*').eq('event_id', id);
        if (ticketTypesError) throw ticketTypesError;
        specificEventData = ticketingData ? { ...ticketingData, ticket_types: ticketTypesData || [] } : null;
      } else if (eventData.event_type === 'voting') {
        specificEventData = {};
      }

      setEventData(specificEventData);

      const isOwner = user && eventData.organizer_id === user.id;
      const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
      
      if (isOwner || isAdmin || eventData.event_type !== 'protected') {
        setIsUnlocked(true);
      } else if (user) {
          const { data, error } = await supabase.rpc('access_protected_event', { p_event_id: eventData.id, p_user_id: user.id });
          if(error) {
              console.warn("Could not check event access status, assuming locked.", error);
              setIsUnlocked(false);
          } else {
              setIsUnlocked(data?.has_access || false);
          }
      } else {
        setIsUnlocked(false);
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
      if (error.code === 'PGRST116') { // No rows found
         setEvent(null);
      } else {
         toast({ title: "Erreur", description: "Impossible de charger les détails de l'événement.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [id, user, userProfile]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleActionConfirmation = (type, costPi, costFcfa) => {
    if (!user) {
      toast({ title: "Connexion requise", variant: "destructive" });
      navigate('/auth');
      return;
    }
    setConfirmation({ isOpen: true, type, cost: costPi, costFcfa: costFcfa, action: executeUnlock });
  };

  const executeUnlock = async () => {
    const cost = confirmation.cost;
    if (!user || !event) return;
    setActionLoading(true);

    const onInsufficientBalance = () => {
        setShowWalletInfoModal(true);
    };

    const onSuccess = async () => {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('access_protected_event', { p_event_id: event.id, p_user_id: user.id }, {method: 'POST'});
        if (rpcError) throw rpcError;
        if (!rpcData.success) throw new Error(rpcData.message);
        
        toast({ title: "Accès accordé!", description: `Vous avez dépensé ${cost} pièces.` });
        setIsUnlocked(true);
        await forceRefreshUserProfile();
      } catch (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      }
    };
    
    await CoinService.handleAction({
        userId: user.id,
        requiredCoins: cost,
        onSuccess,
        onInsufficientBalance,
    });
    setConfirmation({ isOpen: false, type: null, cost: 0, costFcfa: 0, action: null });
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      const { error } = await supabase.rpc('delete_event_completely', { p_event_id: event.id });
      if (error) throw error;
      toast({ title: "Événement supprimé" });
      navigate('/discover');
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'événement.", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const shareData = {
      title: event.title,
      text: event.description ? event.description.substring(0, 100) + '...' : `Découvrez l'événement ${event.title} sur BonPlanInfos !`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({ title: "Partagé !", description: "L'événement a été partagé avec succès." });
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast({ title: "Erreur de partage", description: "Impossible de partager l'événement.", variant: "destructive" });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Lien copié !", description: "Le lien de l'événement a été copié dans votre presse-papiers." });
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de copier le lien.", variant: "destructive" });
      }
    }
  };

  const canDelete = user && (userProfile?.user_type === 'super_admin' || userProfile?.user_type === 'admin' || event?.organizer_id === user.id);
  const getCategoryColor = (category) => ({soiree:'bg-purple-600',mariage:'bg-pink-600',concert:'bg-blue-600',bar:'bg-orange-600',promo:'bg-green-600',raffle:'bg-teal-600',salon:'bg-indigo-600',ticketing:'bg-sky-600',voting:'bg-yellow-600',protected:'bg-rose-600',autre:'bg-gray-600'})[category] || 'bg-gray-600';
  const getCategoryLabel = (category) => ({soiree:'Soirée',mariage:'Mariage',concert:'Concert',bar:'Bar/Club',promo:'Promotion',raffle:'Tombola',salon:'Salon/Foire',ticketing:'Billetterie',voting:'Vote',protected:'Protégé',autre:'Autre'})[category] || 'Autre';
  const formatDate = (dateString) => { const d = new Date(dateString); return { date: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }};
  
  if (loading || !adminConfig) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!event) return <div className="min-h-screen bg-background text-center p-8"><h1 className="text-2xl text-red-500">Événement non trouvé</h1><p className="text-muted-foreground">Il se peut que cet événement ait été supprimé.</p></div>;

  const optimizedImageUrl = event.cover_image ? event.cover_image : "https://images.unsplash.com/photo-1509930854872-0f61005b282e";

  const renderEventSpecificContent = () => {
    const isOwner = user && user.id === event.organizer_id;
    const commonProps = { isUnlocked, isOwner, onRefresh: fetchEventData };

    switch(event.event_type) {
      case 'raffle':
        return <RaffleInterface raffleData={eventData} eventId={event.id} {...commonProps} />;
      case 'stand_rental':
        return <StandRentalInterface event={event} standEventData={eventData} {...commonProps} />;
      case 'ticketing':
        return <TicketingInterface event={event} ticketingData={eventData} ticketTypes={eventData?.ticket_types} {...commonProps} />;
      case 'voting':
        return <VotingInterface event={event} {...commonProps} />;
      default:
        if (event.description && event.description.trim() !== '') {
          return (
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
              <AccordionItem value="item-1" className="border-border">
                <AccordionTrigger className="text-lg font-semibold">Description</AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }
        return null;
    }
  };
  
  const unlockCostPi = event.event_type === 'protected' ? 2 : 0;
  const unlockCostFcfa = unlockCostPi * (adminConfig.coin_to_fcfa_rate || 10);

  return (
    <div className="min-h-screen bg-background">
      <MultilingualSeoHead pageData={{ title: event.title, description: event.description, ogImage: optimizedImageUrl }} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-primary"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
          {canDelete && <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-2" />Supprimer</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible et supprimera l'événement ainsi que toutes ses données associées (tickets, votes, etc.).</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirmer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-lg overflow-hidden shadow-lg">
              <img className="w-full h-64 md:h-96 object-cover" alt={`Image de l'événement ${event.title}`} src={optimizedImageUrl} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <Badge className={`absolute top-4 right-4 ${getCategoryColor(event.category?.slug)} text-white border-0`}>{event.category?.name || getCategoryLabel(event.event_type)}</Badge>
              {!isUnlocked && (unlockCostPi > 0) && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                  <Lock className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-white">Contenu verrouillé</h3>
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-effect">
                <CardContent className="p-6">
                  <h1 className="text-3xl font-bold text-foreground mb-4">{event.title}</h1>
                  {isUnlocked ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center text-muted-foreground"><Calendar className="w-5 h-5 mr-3 text-primary" /><div><p className="font-medium text-foreground">{formatDate(event.event_date).date}</p><p className="text-sm">{formatDate(event.event_date).time}</p></div></div>
                        <div className="flex items-center text-muted-foreground"><MapPin className="w-5 h-5 mr-3 text-primary" /><div><p className="font-medium text-foreground">{event.address}, {event.city}</p></div></div>
                      </div>
                      {renderEventSpecificContent()}
                    </>
                  ) : (
                    <div className="text-center py-10 bg-muted/50 rounded-lg flex flex-col items-center">
                      <Lock className="w-12 h-12 text-primary mb-4" />
                      <h3 className="text-xl font-bold text-foreground">{event.event_type === 'protected' ? 'Événement Protégé' : 'Contenu verrouillé'}</h3>
                      <p className="text-muted-foreground mb-4">Débloquez les détails pour {unlockCostPi} π ({unlockCostFcfa.toLocaleString('fr-FR')} FCFA).</p>
                      <Button onClick={() => handleActionConfirmation("Débloquer les détails", unlockCostPi, unlockCostFcfa)} className="gradient-gold text-background">
                        <Coins className="w-4 h-4 mr-2" />Débloquer les détails
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-effect">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Interactions</h3>
                  <SocialInteractions event={event} isUnlocked={isUnlocked} handleShare={handleShare} />
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="glass-effect">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Organisateur</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 gradient-red rounded-full flex items-center justify-center"><span className="text-white font-bold text-xl">{event.organizer?.full_name?.charAt(0)?.toUpperCase() || 'O'}</span></div>
                    <div><p className="font-medium text-foreground">{event.organizer?.full_name || 'Organisateur Anonyme'}</p><p className="text-sm text-muted-foreground">Membre vérifié</p></div>
                  </div>
                  {isUnlocked && event.contact_phone && (<a href={`tel:${event.contact_phone}`} className="w-full mt-4"><Button variant="outline" size="sm" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"><Phone className="w-4 h-4 mr-2" />{event.contact_phone}</Button></a>)}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
      <WalletInfoModal isOpen={showWalletInfoModal} onClose={() => setShowWalletInfoModal(false)} onProceed={() => {setShowWalletInfoModal(false); setShowPaymentModal(true);}} />
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
      
      <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, type: null, cost: 0, costFcfa: 0, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation.type} ?</AlertDialogTitle>
            <AlertDialogDescription>
                <div>Cette action vous coûtera {confirmation.cost} π ({confirmation.costFcfa.toLocaleString('fr-FR')} FCFA).</div>
                <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted rounded flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Seule l'utilisation de pièces <strong>payantes</strong> génère une récompense pour l'organisateur.</span>
                </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmation.action} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="animate-spin" /> : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventDetailPage;