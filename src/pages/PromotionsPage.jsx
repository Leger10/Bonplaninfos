import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Search, Plus, Tag, MapPin, Lock, Coins, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import PaymentModal from '@/components/PaymentModal';
import WalletInfoModal from '@/components/WalletInfoModal';
import { CoinService } from '@/services/CoinService';

const PromotionCard = ({ promotion, isUnlocked, onClick, adminConfig }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!promotion.pack_expires_at) {
        setTimeLeft('');
        return;
      }
      const endDate = new Date(promotion.pack_expires_at);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Terminé");
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if(days > 0) {
        setTimeLeft(`${days}j`);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        setTimeLeft(`${hours}h`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 3600000); // Mettre à jour toutes les heures
    return () => clearInterval(interval);
  }, [promotion.pack_expires_at]);

  return (
    <motion.div
      onClick={onClick}
      className="cursor-pointer h-full"
      whileHover={{ y: -5 }}
    >
      <Card className="h-full flex flex-col bg-card border-border overflow-hidden hover:border-primary transition-all shadow-lg">
        <div className="relative">
          <img
            className="w-full h-48 object-cover"
            alt={`Aperçu pour ${promotion.title}`}
            src={promotion.cover_image || "https://images.unsplash.com/photo-1509930854872-0f61005b282e?auto=format&fit=crop&w=400&h=300&q=75"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {timeLeft && (
            <Badge variant="secondary" className="absolute top-3 left-3 bg-black/50 text-white backdrop-blur-sm">
              <Clock className="w-3 h-3 mr-1" />
              {timeLeft}
            </Badge>
          )}

          <Badge variant="secondary" className="absolute top-3 right-3 bg-primary text-primary-foreground">
            {promotion.pack_name || 'Promo'}
          </Badge>

          {!isUnlocked && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
              <Lock className="w-8 h-8 text-accent mb-2" />
              <p className="text-white font-bold">Détails verrouillés</p>
              <div className="flex items-center text-xs text-amber-300 mt-1">
                <Coins className="w-3 h-3 mr-1" />
                <span>{adminConfig?.interaction_cost_pi || 2} pour voir</span>
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-4 flex-grow flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-foreground line-clamp-2 font-heading">
              {promotion.title}
            </h3>
            {isUnlocked ? (
              <>
                <div className="flex items-center text-muted-foreground text-sm">
                  <Tag className="w-4 h-4 mr-2 text-primary" />
                  {promotion.category}
                </div>
                <div className="flex items-center text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  {promotion.city}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Connectez-vous pour voir tous les détails.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const PromotionsPage = () => {
  const navigate = useNavigate();
  const { getPromotions, userProfile, adminConfig, forceRefreshUserProfile } = useData();
  const { user } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [unlockedPromotions, setUnlockedPromotions] = useState(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({ amountFcfa: 0, packId: null, action: '' });

  useEffect(() => {
    const fetchPromotions = async () => {
      setLoading(true);
      const data = await getPromotions({ status: 'active' });
      setPromotions(data);
      setLoading(false);
    };
    fetchPromotions();
  }, [getPromotions]);

  useEffect(() => {
    const fetchUnlockedPromotions = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('user_interactions')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('interaction_type', 'view');
        
        if (error) {
          console.error("Error fetching unlocked promotions:", error);
        } else {
          const unlockedIds = new Set(data.map(item => item.event_id));
          setUnlockedPromotions(unlockedIds);
        }
      }
    };
    fetchUnlockedPromotions();
  }, [user]);

  const handlePromotionClick = async (promotion) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour voir les détails.", variant: "destructive" });
      navigate('/auth');
      return;
    }

    const isUnlocked = unlockedPromotions.has(promotion.event_id) || promotion.organizer_id === user.id;
    if (isUnlocked) {
      navigate(`/event/${promotion.event_id}`);
      return;
    }

    const cost = adminConfig?.interaction_cost_pi || 2;

    const onSuccess = async () => {
      try {
        await CoinService.debitCoins(user.id, cost, `Déblocage promotion: ${promotion.title}`, promotion.event_id, 'event');
        const { error: interactionError } = await supabase.from('user_interactions').insert({
          event_id: promotion.event_id,
          user_id: user.id,
          interaction_type: 'view',
          cost_paid: cost,
        });
        if (interactionError) throw interactionError;

        setUnlockedPromotions(prev => new Set(prev).add(promotion.event_id));
        forceRefreshUserProfile();
        toast({ title: "Promotion débloquée!", description: `Vous pouvez maintenant voir les détails de "${promotion.title}".` });
        navigate(`/event/${promotion.event_id}`);
      } catch (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      }
    };

    const onInsufficientBalance = () => {
      setShowWalletInfoModal(true);
    };

    await CoinService.handleAction({
      userId: user.id,
      requiredCoins: cost,
      onSuccess,
      onInsufficientBalance,
    });
  };

  const filteredPromotions = useMemo(() => {
    const searchFiltered = searchTerm
      ? promotions.filter(promo =>
          promo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (promo.description && promo.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          promo.category.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : promotions;

    return searchFiltered.sort((a, b) => {
      const aUnlocked = unlockedPromotions.has(a.event_id) || (user && a.organizer_id === user.id);
      const bUnlocked = unlockedPromotions.has(b.event_id) || (user && b.organizer_id === user.id);
      if (aUnlocked && !bUnlocked) return 1;
      if (!aUnlocked && bUnlocked) return -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [promotions, searchTerm, unlockedPromotions, user]);


  const canCreatePromotion = userProfile && ['organizer', 'admin', 'super_admin'].includes(userProfile.user_type);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Promotions - BonPlaninfos</title>
        <meta name="description" content="Découvrez les meilleures promotions et offres spéciales." />
      </Helmet>

      <main className="container mx-auto px-4 pt-8 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <h1 className="text-3xl font-bold text-foreground">
            Promotions
          </h1>
          {canCreatePromotion && (
            <Button
              onClick={() => navigate('/create-event')}
              className="bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" /> Créer un événement
            </Button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Rechercher une promotion, une catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-full bg-card border-border focus-visible:ring-primary"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <p className="text-center text-muted-foreground mt-8">Chargement des promotions...</p>
          ) : filteredPromotions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPromotions.map((promo) => (
                <PromotionCard
                  key={promo.id}
                  promotion={promo}
                  isUnlocked={unlockedPromotions.has(promo.event_id) || (user && promo.organizer_id === user.id)}
                  onClick={() => handlePromotionClick(promo)}
                  adminConfig={adminConfig}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                Aucune promotion trouvée
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Essayez de modifier votre recherche ou revenez plus tard.
              </p>
            </div>
          )}
        </motion.div>
      </main>
      <WalletInfoModal 
        isOpen={showWalletInfoModal} 
        onClose={() => setShowWalletInfoModal(false)}
        onProceed={() => {
          setShowWalletInfoModal(false);
          setPaymentDetails({ amountFcfa: 0, packId: null, action: 'buy_coins' });
          setShowPaymentModal(true);
        }}
      />
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        amountFcfa={paymentDetails.amountFcfa}
        packId={paymentDetails.packId}
        action={paymentDetails.action}
      />
    </div>
  );
};

export default PromotionsPage;