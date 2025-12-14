import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Lock, Zap, Clock, Coins, Trash2, Crown, Trophy, Shield, Star, Ticket, Vote, Gift, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EventCountdown from '@/components/EventCountdown';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { differenceInDays, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';

const EventCard = ({ event, onClick, isUnlocked, onDelete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useData();
  
  const isOwner = user && event.organizer_id === user.id;
  const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
  const canDelete = onDelete && (isOwner || isAdmin);

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

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

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(event);
  };

  const getPromotionTimeLeft = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    if (now > end) return null;
  
    const days = differenceInDays(end, now);
    if (days > 0) return `J-${days}`;
    return formatDistanceToNowStrict(end, { locale: fr, addSuffix: true });
  };
  
  const promotionTimeLeft = getPromotionTimeLeft(event.promotion_end || event.promoted_until);
  const isPromoted = event.is_promoted && promotionTimeLeft;
  
  const getBoostStyle = () => {
      if (!isPromoted) return {};
      const type = event.promotion_type || 'standard';
      switch(type) {
          case 'platinum': return { border: 'border-indigo-500', shadow: 'shadow-indigo-500/20', icon: Crown, label: 'Platinum', color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
          case 'gold': return { border: 'border-yellow-500', shadow: 'shadow-yellow-500/20', icon: Trophy, label: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-500/10' };
          case 'silver': return { border: 'border-slate-400', shadow: 'shadow-slate-400/20', icon: Star, label: 'Silver', color: 'text-slate-500', bg: 'bg-slate-500/10' };
          case 'bronze': return { border: 'border-amber-700', shadow: 'shadow-amber-700/20', icon: Shield, label: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-700/10' };
          default: return { border: 'border-primary', shadow: 'shadow-primary/20', icon: Zap, label: 'Sponsorisé', color: 'text-primary', bg: 'bg-primary/10' };
      }
  };

  const getEventTypeIcon = () => {
      switch(event.event_type) {
          case 'ticketing': return <Ticket className="w-3 h-3 mr-1" />;
          case 'voting': return <Vote className="w-3 h-3 mr-1" />;
          case 'raffle': return <Gift className="w-3 h-3 mr-1" />;
          case 'stand_rental': return <Store className="w-3 h-3 mr-1" />;
          case 'protected': return <Shield className="w-3 h-3 mr-1" />;
          default: return null;
      }
  };

  const boostStyle = getBoostStyle();
  const BoostIcon = boostStyle.icon;
  const isProtectedAndLocked = event.event_type === 'protected' && !isUnlocked && !isOwner && !isAdmin;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer h-full group flex flex-col relative"
      onClick={onClick}
    >
      <Card 
        className={`h-full card-hover glass-effect border overflow-hidden flex flex-col flex-grow transition-all duration-200 group-hover:shadow-lg ${isPromoted ? `${boostStyle.border} border-2 ${boostStyle.shadow}` : 'border-border/20 group-hover:border-primary/30'}`}
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
             {isPromoted && (
                <div className="flex gap-2">
                    <Badge className={`border-0 flex items-center gap-1 ${boostStyle.bg} ${boostStyle.color} backdrop-blur-md`}>
                        {BoostIcon && <BoostIcon className="w-3 h-3" />}
                        {boostStyle.label}
                    </Badge>
                    {promotionTimeLeft && (
                        <Badge variant="secondary" className="bg-black/40 text-white border-white/20 backdrop-blur-md">
                            <Clock className="w-3 h-3 mr-1" />
                            {promotionTimeLeft}
                        </Badge>
                    )}
                </div>
            )}
          </div>

          {/* Locked Overlay */}
          {isProtectedAndLocked && (
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/70 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm group-hover:backdrop-blur-[2px] transition-all duration-300">
                <Lock className="w-10 h-10 text-primary mb-2 group-hover:scale-110 transition-transform duration-200"/>
                <h3 className="font-bold text-lg text-white group-hover:drop-shadow-lg">Événement Protégé</h3>
                <p className="text-sm text-yellow-300 flex items-center gap-1 group-hover:drop-shadow-lg mt-1">
                  <Coins className="w-4 h-4"/> 2π pour débloquer
                </p>
            </div>
          )}
          
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
             <div className="flex gap-2">
                 {isOwner && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 backdrop-blur-sm pointer-events-auto">
                      Mon événement
                    </Badge>
                 )}
                 {/* Type Badge */}
                 <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-foreground border border-border/20 shadow-sm pointer-events-auto flex items-center">
                    {getEventTypeIcon()}
                    {event.category_name || (event.event_type === 'stand_rental' ? 'Stand' : event.event_type)}
                 </Badge>
             </div>
             
             {canDelete && (
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="h-8 w-8 rounded-full shadow-md pointer-events-auto hover:bg-red-600 transition-all ml-auto z-20"
                  onClick={handleDeleteClick}
                  title="Supprimer l'événement"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
             )}
          </div>
        </div>

        <CardContent className="p-4 flex-grow flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className={`font-bold text-lg line-clamp-2 transition-colors duration-200 ${isPromoted ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
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
                <span className="group-hover:text-foreground transition-colors duration-200 line-clamp-1">
                  {isProtectedAndLocked ? `${event.city}, ${event.country}` : (event.location || `${event.city}, ${event.country}`)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-3">
              <div className="flex items-center text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                <Users className="w-3 h-3 mr-1" />
                {event.interactions_count || 0} intéressés
              </div>
              {event.price_pi > 0 && !isProtectedAndLocked && (
                  <span className="text-sm font-bold text-primary">{event.price_pi} π</span>
              )}
            </div>
        </CardContent>
      </Card>
      {isOwner && !isPromoted && (
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