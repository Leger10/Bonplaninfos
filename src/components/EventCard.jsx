import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Sparkles, Lock, Zap, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EventCountdown from '@/components/EventCountdown';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { differenceInDays, differenceInHours, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';

const EventCard = ({ event, onClick, isUnlocked }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user && event.organizer_id === user.id;

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const isNew = new Date(event.created_at) > oneDayAgo;

  const formatDate = (dateString) => {
    if (!dateString) return "Date non spécifiée";
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handlePromoteClick = (e) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    navigate('/boost', { state: { preselectedContent: `event_${event.id}` } });
  };

  const getPromotionTimeLeft = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    if (now > end) return "Terminé";
  
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now);
  
    if (days > 0) {
      return `J-${days}`;
    }
    if (hours > 0) {
      return `${hours}h restantes`;
    }
    return formatDistanceToNowStrict(end, { locale: fr, addSuffix: true });
  };
  
  const promotionTimeLeft = getPromotionTimeLeft(event.promotion_end || event.promoted_until);


  const isProtectedAndLocked = event.event_type === 'protected' && !isUnlocked;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer h-full group flex flex-col"
    >
      <Card 
        onClick={onClick}
        className="h-full card-hover glass-effect border-[#C9A227]/20 overflow-hidden flex flex-col flex-grow"
      >
        <div className="relative">
          <div className="w-full h-48 bg-muted-foreground/20">
             <img  
                className={`w-full h-48 object-cover transition-all duration-300 ${isProtectedAndLocked ? 'blur-sm group-hover:blur-none' : ''}`}
                alt={`Image de l'événement ${event.title}`}
                src={event.cover_image || "https://images.unsplash.com/photo-1703269074563-938cdd3a40e5"} 
              />
          </div>
          
          <EventCountdown eventDate={event.event_date} />
          
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
             {event.is_promoted && (
                <div className="flex gap-2">
                    <Badge className="gradient-gold text-[#0B0B0D] border-0">
                        Sponsorisé
                    </Badge>
                    {promotionTimeLeft && (
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                            <Clock className="w-3 h-3 mr-1" />
                            {promotionTimeLeft}
                        </Badge>
                    )}
                </div>
            )}
            {isNew && !event.is_promoted && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Nouveau
              </Badge>
            )}
          </div>


          {isProtectedAndLocked && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm group-hover:backdrop-blur-0 transition-all duration-300">
                <Lock className="w-10 h-10 text-primary mb-2"/>
                <h3 className="font-bold text-lg text-white">Événement Protégé</h3>
                <p className="text-sm text-amber-300">Cliquez pour débloquer</p>
            </div>
          )}
          
        </div>

        <CardContent className="p-4 flex-grow flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-lg text-white line-clamp-2">
                {event.title}
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-gray-300 text-sm">
                <Calendar className="w-4 h-4 mr-2 text-[#C9A227]" />
                {formatDate(event.event_date)}
              </div>
              
              <div className="flex items-center text-gray-300 text-sm">
                <MapPin className="w-4 h-4 mr-2 text-[#C9A227]" />
                 {isProtectedAndLocked ? `${event.city}, ${event.country}` : (event.location || `${event.city}, ${event.country}`)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#C9A227]/20 mt-3">
              <Badge 
                  variant="outline"
                  className="border-primary/50 text-primary"
                >
                  {event.category_name || event.event_type}
              </Badge>

              <div className="flex items-center text-xs text-gray-400">
                <Users className="w-3 h-3 mr-1" />
                {event.interactions_count || 0} intéressés
              </div>
            </div>
        </CardContent>
      </Card>
      {isOwner && !event.is_promoted && (
        <Button onClick={handlePromoteClick} variant="premium" size="sm" className="mt-2 w-full">
          <Zap className="w-4 h-4 mr-2"/>
          Promouvoir
        </Button>
      )}
    </motion.div>
  );
};

export default EventCard;