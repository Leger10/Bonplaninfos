import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Eye, Zap, Clock, Sparkles, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EventCountdown from '@/components/EventCountdown';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { differenceInDays, differenceInHours, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';

const EventCard = ({ event, onClick }) => {
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
  
  // Determine the best date to use for promotion status
  const getBestPromotionDate = () => {
    const d1 = event.promoted_until ? new Date(event.promoted_until) : null;
    const d2 = event.promotion_end ? new Date(event.promotion_end) : null;
    
    // Return the one that is in the future, or the latest one if both are present
    if (d1 && d2) return d1 > d2 ? event.promoted_until : event.promotion_end;
    if (d1) return event.promoted_until;
    if (d2) return event.promotion_end;
    return null;
  };

  const promotionTimeLeft = getBestPromotionDate() ? getPromotionTimeLeft(getBestPromotionDate()) : null;

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
                className="w-full h-48 object-cover transition-all duration-300"
                alt={`Image de l'événement ${event.title}`}
                src={event.cover_image || "https://images.unsplash.com/photo-1703269074563-938cdd3a40e5"} 
              />
          </div>
          
          {/* Synchronized Countdown: Passes end_date to allow switching to 'Ends in' mode if started */}
          <EventCountdown 
            eventDate={event.event_date} 
            eventEndDate={event.end_date} 
          />
          
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
                 {event.location || `${event.city}, ${event.country}`}
              </div>
              {event.organizer_name && (
                <div className="flex items-center text-gray-400 text-xs">
                  <User className="w-3 h-3 mr-1 text-[#C9A227]" />
                  Par {event.organizer_name}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#C9A227]/20 mt-3">
              <Badge 
                  variant="outline"
                  className="border-primary/50 text-primary"
                >
                  {event.category_name || event.event_type}
              </Badge>

              <div className="flex items-center gap-3">
                <div className="flex items-center text-xs text-gray-400" title="Vues">
                    <Eye className="w-3 h-3 mr-1" />
                    {event.views_count || 0}
                </div>
                <div className="flex items-center text-xs text-gray-400" title="Interactions">
                    <Users className="w-3 h-3 mr-1" />
                    {event.interactions_count || 0}
                </div>
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