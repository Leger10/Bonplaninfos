import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2, ServerCrash, Users, Coins, Info, Sparkles, TrendingUp, Star } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { locationService } from '@/services/locationService';
import { useToast } from '@/components/ui/use-toast';
import EventCard from './EventCard';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WalletInfoModal from '@/components/WalletInfoModal';

// Simple retry helper
const fetchWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 1.5);
  }
};

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
  const [headerMessage, setHeaderMessage] = useState('');

  // Liste des messages variés pour le header
  const headerMessages = useMemo(() => [
    { 
      text: (city) => `À la une à ${city}`,
      icon: Sparkles,
      color: 'text-primary'
    },
    { 
      text: (city) => `Les incontournables de ${city}`,
      icon: Star,
      color: 'text-amber-500'
    },
    { 
      text: (city) => `Les plus populaires à ${city}`,
      icon: TrendingUp,
      color: 'text-green-500'
    },
    { 
      text: (city) => `Découvrez cet événement à ${city}`,
      icon: MapPin,
      color: 'text-blue-500'
    },
    { 
      text: (city) => `L'actualité à ${city}`,
      icon: Sparkles,
      color: 'text-purple-500'
    },
    { 
      text: (city) => `Les événements du moment à ${city}`,
      icon: Users,
      color: 'text-pink-500'
    },
    { 
      text: (city) => `Les bons plans à ${city}`,
      icon: Coins,
      color: 'text-yellow-500'
    },
    { 
      text: (city) => `${city} vous attend`,
      icon: Star,
      color: 'text-red-500'
    },
    { 
      text: (city) => `Les tendances à ${city}`,
      icon: TrendingUp,
      color: 'text-indigo-500'
    },
    { 
      text: (city) => `Explorez ${city}`,
      icon: MapPin,
      color: 'text-teal-500'
    }
  ], []);

  // Sélectionner un message aléatoire
  const getRandomHeaderMessage = useCallback((city) => {
    const randomIndex = Math.floor(Math.random() * headerMessages.length);
    const message = headerMessages[randomIndex];
    return {
      text: message.text(city),
      Icon: message.icon,
      color: message.color
    };
  }, [headerMessages]);

  const fetchLocalEvents = useCallback(async (city, country) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchWithRetry(() => 
        supabase
          .rpc('search_events_for_card', {
              p_cities: [city]
          })
          .limit(4)
      );

      if (error) throw error;
      setLocalEvents(data);
      
      // Mettre à jour le message du header une fois les événements chargés
      if (city) {
        const newMessage = getRandomHeaderMessage(city);
        setHeaderMessage(newMessage);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des événements locaux:', err);
      // Don't show error to user immediately if it's just a fetch error, maybe just empty state
      // setError('Impossible de charger les événements locaux pour le moment.');
      setLocalEvents([]);
    } finally {
      setLoading(false);
    }
  }, [getRandomHeaderMessage]);
  
  const fetchUnlockedEvents = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await fetchWithRetry(() => 
        supabase
          .from('protected_event_access')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
      );
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
        // setError('Impossible de déterminer votre position.');
      }
      fetchUnlockedEvents();
    };
    init();
  }, [userProfile, fetchLocalEvents, fetchUnlockedEvents]);
  
  // Fonction pour rafraîchir le message du header
  const refreshHeaderMessage = useCallback(() => {
    if (location?.city) {
      const newMessage = getRandomHeaderMessage(location.city);
      setHeaderMessage(newMessage);
    }
  }, [location, getRandomHeaderMessage]);

  const executeUnlock = async (event) => {
    try {
      // Appeler la fonction RPC qui gère le débit ET la rémunération de l'organisateur
      const { data: rpcData, error: rpcError } = await supabase.rpc('access_protected_event', { 
        p_event_id: event.id, 
        p_user_id: user.id 
      });
      
      if (rpcError) throw rpcError;
      
      if (!rpcData.success) {
        // Si le solde est insuffisant, on montre la modal du portefeuille
        if (rpcData.message && rpcData.message.includes('Solde insuffisant')) {
          setShowWalletInfoModal(true);
          return;
        }
        throw new Error(rpcData.message);
      }

      // Succès : l'utilisateur a été débité de 2pièces et l'organisateur a reçu 1pièces
      const amountPaid = rpcData.amount_paid || 2;
      
      toast({ 
        title: "Contenu débloqué!", 
        description: `Vous avez dépensé ${amountPaid}pièces. 1pièces a été transféré à l'organisateur.`,
        duration: 3000
      });
      
      // Rafraîchir le profil utilisateur pour mettre à jour le solde
      forceRefreshUserProfile();
      
      // Ajouter l'événement à la liste des événements débloqués
      setUnlockedEvents(prev => new Set(prev).add(event.id));
      
      // Naviguer vers la page de l'événement
      navigate(`/event/${event.id}`);
      
    } catch (error) {
      console.error('Erreur lors du déblocage:', error);
      
      // Ne pas afficher de toast si c'est une erreur de solde insuffisant
      // (déjà géré par l'affichage de la modal)
      if (!error.message?.includes('Solde insuffisant')) {
        toast({ 
          title: "Erreur lors du déblocage", 
          description: error.message || "Une erreur inattendue est survenue", 
          variant: "destructive",
          duration: 5000
        });
      }
    }
  };

  const handleCardClick = (event) => {
    const eventId = event.id || event.event_id;
    
    // Vérifier si l'utilisateur est connecté
    if (!user) {
      toast({ 
        title: "Connexion requise", 
        description: "Vous devez être connecté pour voir les détails.", 
        variant: "destructive" 
      });
      navigate('/auth');
      return;
    }
    
    // Vérifier les autorisations
    const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
    const isUnlocked = unlockedEvents.has(eventId) || event.organizer_id === user?.id || isAdmin;

    // Si l'événement est protégé et non débloqué, afficher la confirmation de paiement
    if (event.event_type === 'protected' && !isUnlocked) {
      const cost = 2; // Coût fixe selon la fonction RPC
      const costFcfa = cost * (adminConfig?.coin_to_fcfa_rate || 10);
      
      setConfirmation({
        isOpen: true,
        event: { ...event, id: eventId },
        cost,
        costFcfa,
        onConfirm: () => executeUnlock({ ...event, id: eventId }),
      });
    } else {
      // Si déjà débloqué ou événement public, naviguer directement
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
        <div className="flex items-center space-x-2">
          <button 
            onClick={refreshHeaderMessage}
            className="p-1 hover:bg-muted rounded-full transition-colors"
            title="Changer le message"
            aria-label="Changer le message d'en-tête"
          >
            <Sparkles className="w-4 h-4 text-muted-foreground" />
          </button>
          <h2 className="text-2xl font-bold flex items-center font-heading">
            {headerMessage.Icon && (
              <headerMessage.Icon className={`mr-2 ${headerMessage.color}`} />
            )}
            {headerMessage.text || `À la une à ${location?.city}`}
          </h2>
        </div>
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
      
      {/* Modal d'information sur le portefeuille (solde insuffisant) */}
      <WalletInfoModal 
        isOpen={showWalletInfoModal} 
        onClose={() => setShowWalletInfoModal(false)}
        onProceed={() => {
          setShowWalletInfoModal(false);
          navigate('/wallet');
        }}
      />
      
      {/* Dialogue de confirmation pour le déblocage */}
      <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, event: null, cost: 0, costFcfa: 0, onConfirm: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Débloquer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex flex-col items-center justify-center text-center p-4">
                <Coins className="w-12 h-12 text-primary mb-4" />
                <p className="text-lg">
                  Voir les détails de "<strong className="text-foreground">{confirmation.event?.title}</strong>" vous coûtera{' '}
                  <strong className="text-foreground">{confirmation.cost}pièces</strong> ({confirmation.costFcfa?.toLocaleString('fr-FR')} FCFA).
                </p>
                <div className="mt-4 text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <div className="text-left">
                      <p className="font-medium mb-2 text-foreground">Comment fonctionne la rémunération :</p>
                      <ul className="space-y-2 text-xs md:text-sm">
                        <li className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">2pièces</span>
                          <span>sont déduits de votre solde</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-semibold">1pièces</span>
                          <span>est transféré à l'organisateur de l'événement</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded font-semibold">1pièces</span>
                          <span>reste dans l'écosystème BonPlanInfos</span>
                        </li>
                      </ul>
                      <p className="mt-3 text-xs italic">
                        En débloquant cet événement, vous soutenez directement l'organisateur !
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="mt-2 sm:mt-0">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmation.onConfirm}
              className="bg-primary hover:bg-primary/90"
            >
              Confirmer et Payer {confirmation.cost}pièces
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.section>
  );
};

export default NearbyEvents;