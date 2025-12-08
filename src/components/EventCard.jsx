import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Sparkles, Lock, Zap, Clock, Coins } from 'lucide-react';
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
    e.stopPropagation();
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
  
  const promotionTimeLeft = getPromotionTimeLeft(event.promotion_end);

  const isProtectedAndLocked = event.event_type === 'protected' && !isUnlocked;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer h-full group flex flex-col"
      onClick={onClick}
    >
      <Card 
        className="h-full card-hover glass-effect border-border/20 overflow-hidden flex flex-col flex-grow transition-all duration-200 group-hover:shadow-lg group-hover:border-primary/30"
      >
        <div className="relative">
          <div className="w-full h-48 bg-muted-foreground/20 overflow-hidden">
             <img  
                className={`w-full h-48 object-cover transition-all duration-500 ${isProtectedAndLocked ? 'blur-sm group-hover:blur-[1px]' : ''}`}
                alt={`Image de l'événement ${event.title}`}
                src={event.cover_image || "https://images.unsplash.com/photo-1703269074563-938cdd3a40e5"} 
              />
          </div>
          
          <EventCountdown eventDate={event.event_date} />
          
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
             {event.is_promoted && (
                <div className="flex gap-2">
                    <Badge className="gradient-gold text-background border-0">
                        Sponsorisé
                    </Badge>
                    {promotionTimeLeft && (
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-400/30 backdrop-blur-sm">
                            <Clock className="w-3 h-3 mr-1" />
                            {promotionTimeLeft}
                        </Badge>
                    )}
                </div>
            )}
            {isNew && !event.is_promoted && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30 backdrop-blur-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                Nouveau
              </Badge>
            )}
          </div>

          {isProtectedAndLocked && (
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/70 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm group-hover:backdrop-blur-[2px] transition-all duration-300">
                <Lock className="w-10 h-10 text-primary mb-2 group-hover:scale-110 transition-transform duration-200"/>
                <h3 className="font-bold text-lg text-white group-hover:drop-shadow-lg">Événement Protégé</h3>
                <p className="text-sm text-yellow-300 flex items-center gap-1 group-hover:drop-shadow-lg mt-1">
                  <Coins className="w-4 h-4"/> 2π pour débloquer
                </p>
                <p className="text-xs text-gray-300 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Cliquez pour débloquer l'accès
                </p>
            </div>
          )}
          
          {/* Indicateur pour l'organisateur */}
          {isOwner && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 backdrop-blur-sm">
                Mon événement
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 flex-grow flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {event.title}
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-muted-foreground text-sm">
                <Calendar className="w-4 h-4 mr-2 text-primary group-hover:scale-110 transition-transform duration-200" />
                {formatDate(event.event_date)}
              </div>
              
              <div className="flex items-center text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 mr-2 text-primary group-hover:scale-110 transition-transform duration-200" />
                <span className="group-hover:text-foreground transition-colors duration-200">
                  {isProtectedAndLocked ? `${event.city}, ${event.country}` : (event.location || `${event.city}, ${event.country}`)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-3">
              <Badge 
                  variant="outline"
                  className="border-primary/50 text-primary group-hover:border-primary group-hover:bg-primary/5 transition-all duration-200"
                >
                  {event.category_name || event.event_type}
              </Badge>

              <div className="flex items-center text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                <Users className="w-3 h-3 mr-1" />
                {event.interactions_count || 0} intéressés
              </div>
            </div>
        </CardContent>
      </Card>
      {isOwner && !event.is_promoted && (
        <Button 
          onClick={handlePromoteClick} 
          variant="premium" 
          size="sm" 
          className="mt-2 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <Zap className="w-4 h-4 mr-2"/>
          Promouvoir
        </Button>
      )}
    </motion.div>
  );
};

export default EventCard;