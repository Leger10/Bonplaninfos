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
      whileHover={{ 
        y: -4,
        scale: 1.02,
        transition: { duration: 0.3 }
      }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer h-full group flex flex-col"
      onClick={onClick}
    >
      <Card 
        className={`h-full card-hover glass-effect border-border/20 overflow-hidden flex flex-col flex-grow relative ${
          event.is_promoted ? 'promoted-glow' : ''
        }`}
      >
        {/* Effet de brillance pour les événements boostés */}
        {event.is_promoted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/10 to-transparent transform -skew-x-12 z-10 pointer-events-none"
          />
        )}

        <div className="relative">
          <div className="w-full h-48 bg-muted-foreground/20">
            <motion.img  
              className={`w-full h-48 object-cover transition-all duration-300 ${
                isProtectedAndLocked ? 'blur-sm group-hover:blur-none' : ''
              } ${event.is_promoted ? 'saturate-125' : ''}`}
              alt={`Image de l'événement ${event.title}`}
              src={event.cover_image || "https://images.unsplash.com/photo-1703269074563-938cdd3a40e5"} 
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <EventCountdown eventDate={event.event_date} />
          
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
            {event.is_promoted && (
              <div className="flex gap-2">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1.1, 0.8] }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <Badge className="gradient-gold text-background border-0 shadow-lg">
                    <Zap className="w-3 h-3 mr-1" />
                    Sponsorisé
                  </Badge>
                </motion.div>
                {promotionTimeLeft && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                      <Clock className="w-3 h-3 mr-1" />
                      {promotionTimeLeft}
                    </Badge>
                  </motion.div>
                )}
              </div>
            )}
            {isNew && !event.is_promoted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Nouveau
                </Badge>
              </motion.div>
            )}
          </div>

          {isProtectedAndLocked && (
            <motion.div 
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm group-hover:backdrop-blur-none transition-all duration-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <Lock className="w-10 h-10 text-primary mb-2"/>
              </motion.div>
              <h3 className="font-bold text-lg text-white">Événement Protégé</h3>
              <p className="text-sm text-yellow-300 flex items-center gap-1">
                <Coins className="w-4 h-4"/> 2π pour débloquer
              </p>
            </motion.div>
          )}
        </div>

        <CardContent className="p-4 flex-grow flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <motion.h3 
                className="font-bold text-lg text-foreground line-clamp-2"
                whileHover={{ color: event.is_promoted ? "#f59e0b" : undefined }}
                transition={{ duration: 0.2 }}
              >
                {event.title}
                {event.is_promoted && (
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="ml-1 text-yellow-500"
                  >
                    ★
                  </motion.span>
                )}
              </motion.h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-muted-foreground text-sm">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                {formatDate(event.event_date)}
              </div>
              
              <div className="flex items-center text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 mr-2 text-primary" />
                {isProtectedAndLocked ? `${event.city}, ${event.country}` : (event.location || `${event.city}, ${event.country}`)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/20 mt-3">
            <Badge 
              variant="outline"
              className="border-primary/50 text-primary"
            >
              {event.category_name || event.event_type}
            </Badge>

            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="w-3 h-3 mr-1" />
              {event.interactions_count || 0} intéressés
            </div>
          </div>
        </CardContent>

        {/* Effet de particules pour les événements boostés */}
        {event.is_promoted && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                initial={{ 
                  x: Math.random() * 300,
                  y: Math.random() * 200,
                  opacity: 0
                }}
                animate={{ 
                  y: [null, -20, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 1.5,
                  repeatDelay: Math.random() * 2
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>
        )}
      </Card>
      
      {isOwner && !event.is_promoted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            onClick={handlePromoteClick} 
            variant="premium" 
            size="sm" 
            className="mt-2 w-full"
          >
            <Zap className="w-4 h-4 mr-2"/>
            Promouvoir
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EventCard;