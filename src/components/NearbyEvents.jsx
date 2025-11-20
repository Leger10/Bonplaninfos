import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2, ServerCrash, Users, Coins, Info } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { locationService } from '@/services/locationService';
import { useToast } from '@/components/ui/use-toast';
import EventCard from './EventCard';
import { useNavigate } from 'react-router-dom';
import { CoinService } from '@/services/CoinService';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WalletInfoModal from '@/components/WalletInfoModal';

const NearbyEvents = () => {
  const [localEvents, setLocalEvents] = useState([]);
  const [unlockedEvents, setUnlockedEvents] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const { user } = useAuth();
  const { userProfile, forceRefreshUserProfile, adminConfig } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [confirmation, setConfirmation] = useState({ isOpen: false, event: null, cost: 0, costFcfa: 0, onConfirm: null });
  const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);

  const fetchLocalEvents = useCallback(async (city, country) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .rpc('search_events_for_card', {
            p_cities: [city]
        })
        .limit(4);

      if (error) throw error;
      setLocalEvents(data);
    } catch (err) {
      console.error('Erreur lors de la récupération des événements locaux:', err);
      setError('Impossible de charger les événements locaux pour le moment.');
      setLocalEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchUnlockedEvents = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('protected_event_access')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (error) throw error;
      setUnlockedEvents(new Set(data.map(item => item.event_id)));
    } catch (err) {
      console.error('Error fetching unlocked events:', err);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      let userLocation;
      if (userProfile && userProfile.city && userProfile.country) {
        userLocation = { city: userProfile.city, country: userProfile.country };
      } else {
        userLocation = await locationService.detectUserLocation();
      }

      if (userLocation.city && userLocation.country) {
        setLocation(userLocation);
        fetchLocalEvents(userLocation.city, userLocation.country);
      } else {
        setLoading(false);
        setError('Impossible de déterminer votre position.');
      }
      fetchUnlockedEvents();
    };
    init();
  }, [userProfile, fetchLocalEvents, fetchUnlockedEvents]);
  
  const executeUnlock = async (event) => {
    const cost = 2; // Fixed cost for protected events
    await CoinService.handleAction({
      userId: user.id,
      requiredCoins: cost,
      onSuccess: async () => {
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('access_protected_event', { p_event_id: event.id, p_user_id: user.id });
            if (rpcError) throw rpcError;
            if (!rpcData.success) throw new Error(rpcData.message);

            toast({ title: "Contenu débloqué!", description: `Vous avez dépensé ${cost} pièces.` });
            forceRefreshUserProfile();
            setUnlockedEvents(prev => new Set(prev).add(event.id));
            navigate(`/event/${event.id}`);
          } catch (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
          }
      },
      onInsufficientBalance: () => setShowWalletInfoModal(true),
    });
  };

  const handleCardClick = (event) => {
    const eventId = event.id || event.event_id;
    if (!user) {
      toast({ title: "Connexion requise", description: "Vous devez être connecté pour voir les détails.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    
    const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
    const isUnlocked = unlockedEvents.has(eventId) || event.organizer_id === user?.id || isAdmin;

    if (event.event_type === 'protected' && !isUnlocked) {
      const cost = 2;
      const costFcfa = cost * (adminConfig?.coin_to_fcfa_rate || 10);
      setConfirmation({
        isOpen: true,
        event: { ...event, id: eventId },
        cost,
        costFcfa,
        onConfirm: () => executeUnlock({ ...event, id: eventId }),
      });
    } else {
      navigate(`/event/${eventId}`);
    }
  };

  const memoizedLocalEvents = useMemo(() => localEvents, [localEvents]);

  if (loading) {
    return (
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center font-heading">
            <MapPin className="mr-2 text-primary" />
            Événements à proximité
          </h2>
        </div>
        <div className="flex justify-center items-center h-48 bg-card rounded-lg border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-bold flex items-center font-heading mb-4">
          <MapPin className="mr-2 text-primary" />
          Événements à {location?.city || 'proximité'}
        </h2>
        <div className="text-center py-16 bg-card rounded-lg border-dashed border-destructive/50">
          <ServerCrash className="w-16 h-16 text-destructive/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-destructive mb-2">Oops! Une erreur est survenue.</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </section>
    );
  }

  if (localEvents.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-12"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center font-heading">
          <MapPin className="mr-2 text-primary" />
          À la une à {location?.city}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {memoizedLocalEvents.map(event => {
          const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
          const eventId = event.id || event.event_id;
          const isUnlocked = unlockedEvents.has(eventId) || (user && event.organizer_id === user.id) || isAdmin;
          return (
            <EventCard
              key={eventId}
              event={{...event, id: eventId}}
              onClick={() => handleCardClick(event)}
              isUnlocked={isUnlocked}
            />
          );
        })}
      </div>
      <WalletInfoModal 
            isOpen={showWalletInfoModal} 
            onClose={() => setShowWalletInfoModal(false)}
            onProceed={() => {
              setShowWalletInfoModal(false);
              navigate('/wallet');
            }}
          />
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
            <AlertDialogAction onClick={confirmation.onConfirm}>Confirmer et Payer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.section>
  );
};

export default NearbyEvents;