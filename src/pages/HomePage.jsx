import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Search, Plus, MapPin, ArrowRight, Loader2, SlidersHorizontal, AlertTriangle, Coins, Info, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
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
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import WalletInfoModal from '@/components/WalletInfoModal';
import { CoinService } from '@/services/CoinService';
import WelcomePopup from '@/components/WelcomePopup';
import AnimatedBadgesBanner from '@/components/AnimatedBadgesBanner';
import EventTypeFilters from '@/components/homepage/EventTypeFilters';
import EventCard from '@/components/EventCard';
import NearbyEvents from '@/components/NearbyEvents';
import { CITIES_BY_COUNTRY } from '@/constants/countries';

const HomePage = () => {
  const navigate = useNavigate();
  const { userProfile, adminConfig, forceRefreshUserProfile, hasFetchError } = useData();
  const { user } = useAuth();
  const [promotedEvents, setPromotedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlockedEvents, setUnlockedEvents] = useState(new Set());
  const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
  const [confirmation, setConfirmation] = useState({ isOpen: false, event: null, cost: 0, costFcfa: 0, onConfirm: null });

  const handleRetry = () => window.location.reload();

  const fetchInitialData = useCallback(async () => {
    if (hasFetchError) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: eventsRes, error: eventsError } = await supabase.from('events_with_categories')
          .select('*')
          .eq('status', 'active')
          .eq('is_promoted', true)
          .gt('promoted_until', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(8);

      if (eventsError) throw eventsError;
      setPromotedEvents(eventsRes || []); // Ensure it's always an array

      if (user) {
        const { data, error } = await supabase.from('protected_event_access').select('event_id').eq('user_id', user.id).eq('status', 'active');
        if (error) throw error;
        setUnlockedEvents(new Set(data.map(item => item.event_id)));
      }
    } catch (error) {
      console.error('Error fetching homepage data:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les données de la page d\'accueil', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [hasFetchError, user, toast]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const executeUnlock = async (event) => {
    const cost = 2;
    await CoinService.handleAction({
      userId: user.id,
      requiredCoins: cost,
      onSuccess: async () => {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('access_protected_event', { p_event_id: event.id, p_user_id: user.id });
          if (rpcError) throw rpcError;
          if (!rpcData.success) throw new Error(rpcData.message);
          
          setUnlockedEvents(prev => new Set(prev).add(event.id));
          await forceRefreshUserProfile();
          toast({ title: "Accès débloqué!", description: `Vous pouvez maintenant voir les détails de "${event.title}".` });
          navigate(`/event/${event.id}`);
        } catch (error) {
          toast({ title: "Erreur", description: error.message, variant: "destructive" });
        }
      },
      onInsufficientBalance: () => setShowWalletInfoModal(true),
    });
  };

  const handleEventClick = async (event) => {
    if (!user) { navigate('/auth'); return; }
    
    const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
    const isUnlocked = unlockedEvents.has(event.id) || event.organizer_id === user.id || isAdmin;

    if (event.event_type === 'protected' && !isUnlocked) {
        const cost = 2;
        const costFcfa = cost * (adminConfig?.coin_to_fcfa_rate || 10);
        setConfirmation({
            isOpen: true,
            event,
            cost,
            costFcfa,
            onConfirm: () => executeUnlock(event),
        });
    } else {
        navigate(`/event/${event.id}`);
    }
  };
  
  const handleWalletModalProceed = () => { setShowWalletInfoModal(false); navigate('/wallet'); };
  const canCreateEvent = userProfile && ['organizer', 'admin', 'super_admin'].includes(userProfile.user_type);
  
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Accueil - BonPlaninfos</title>
        <meta name="description" content="Découvrez les meilleures promotions et offres spéciales." />
      </Helmet>
      {!hasFetchError && <WelcomePopup />}
      {!hasFetchError && <AnimatedBadgesBanner />}
      <main className="container mx-auto px-4 pt-8 pb-24">

        <EventTypeFilters />
        
        <NearbyEvents />

        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }} 
            className="my-12"
        >
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Zap className="text-primary"/>
                Événements Sponsorisés
              </h2>
              {canCreateEvent && <Button onClick={() => navigate('/boost')} variant="premium"><Plus className="w-4 h-4 mr-2" /> Booster un événement</Button>}
            </div>

            {hasFetchError ? (
                <div className="text-center py-16"><h3 className="text-xl font-semibold text-destructive mb-2">Erreur de chargement</h3><p className="text-muted-foreground max-w-md mx-auto mb-4">Impossible de récupérer les événements. Vérifiez votre connexion ou les extensions de votre navigateur.</p><Button onClick={handleRetry}><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Réessayer</Button></div>
            ) : loading ? (
                <div className="text-center text-muted-foreground mt-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement des événements...</div>
            ) : promotedEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {promotedEvents.map((event) => {
                        const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
                        const isUnlocked = unlockedEvents.has(event.id) || (user && event.organizer_id === user.id) || isAdmin;
                        return <EventCard key={event.id} event={event} isUnlocked={isUnlocked} onClick={() => handleEventClick(event)} />
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-card/50 rounded-lg border border-dashed border-border">
                    <Zap className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-muted-foreground mb-2">Aucun événement sponsorisé pour le moment</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-4">Les événements boostés par les organisateurs apparaîtront ici. Soyez le premier !</p>
                    {canCreateEvent && <Button onClick={() => navigate('/boost')} variant="premium"><Plus className="w-4 h-4 mr-2" /> Booster un événement</Button>}
                </div>
            )}
        </motion.div>
        
        <div className="mt-12 text-center">
          <Button variant="outline" onClick={() => navigate('/events')}>Voir tous les autres événements <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </div>
      </main>
      <WalletInfoModal isOpen={showWalletInfoModal} onClose={() => setShowWalletInfoModal(false)} onProceed={handleWalletModalProceed} />
      <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, event: null, cost: 0, costFcfa: 0, onConfirm: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Débloquer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col items-center justify-center text-center p-4">
                <Coins className="w-12 h-12 text-primary mb-4" />
                <p className="text-lg">
                  Voir les détails de "{confirmation.event?.title}" vous coûtera <strong className="text-foreground">{confirmation.cost}π</strong> ({confirmation.costFcfa?.toLocaleString('fr-FR')} FCFA).
                </p>
                <div className="mt-4 text-xs text-muted-foreground p-2 bg-muted rounded flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Votre action permet aux organisateurs de créer plus de contenu. Vous pouvez aussi devenir organisateur en postant des contenus pour bénéficier de la rémunération sur BonPlanInfos.</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmation.onConfirm}>Confirmer et Débloquer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HomePage;