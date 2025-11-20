import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Zap, AlertTriangle, CheckCircle, Play } from 'lucide-react';

const EventCountdown = ({ 
  eventDate, 
  eventStartTime, 
  eventEndTime,
  eventStatus = 'upcoming',
  size = 'medium',
  variant = 'default',
  showIcon = true,
  showTime = false,
  showProgress = false,
  className = '',
  onCountdownEnd,
  onCountdownUpdate
}) => {
  const calculateTimeLeft = () => {
    if (!eventDate) return { days: null };
    
    const now = new Date();
    const eventDateTime = new Date(eventDate);
    
    // Si l'heure de début est fournie, l'ajouter à la date
    if (eventStartTime) {
      const [hours, minutes] = eventStartTime.split(':');
      eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    const difference = eventDateTime.getTime() - now.getTime();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        totalMs: difference
      };
    } else {
      timeLeft = { days: -1, totalMs: difference };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // Callback pour les mises à jour
      if (onCountdownUpdate) {
        onCountdownUpdate(newTimeLeft);
      }
      
      // Callback quand le compte à rebours se termine
      if (newTimeLeft.days === -1 && timeLeft.days !== -1 && onCountdownEnd) {
        onCountdownEnd();
      }
    }, 1000); // Mise à jour chaque seconde pour plus de précision

    return () => clearInterval(timer);
  }, [eventDate, eventStartTime, eventEndTime]);

  // Déterminer le statut de l'événement
  const getEventStatus = () => {
    if (timeLeft.days === null) return 'scheduled';
    if (timeLeft.days < 0) return 'finished';
    if (timeLeft.days === 0 && timeLeft.hours <= 1) return 'starting';
    if (timeLeft.days === 0) return 'today';
    if (timeLeft.days <= 1) return 'tomorrow';
    if (timeLeft.days <= 3) return 'soon';
    return 'upcoming';
  };

  const formatTimeLeft = () => {
    const status = getEventStatus();
    
    switch (status) {
      case 'scheduled':
        return 'Programmé';
      case 'finished':
        return 'Terminé';
      case 'starting':
        return `Commence dans ${timeLeft.minutes}min`;
      case 'today':
        return showTime && timeLeft.hours > 0 
          ? `Aujourd'hui • ${timeLeft.hours}h` 
          : `Aujourd'hui`;
      case 'tomorrow':
        return 'Demain';
      case 'soon':
        return `J-${timeLeft.days}`;
      case 'upcoming':
        return timeLeft.days <= 7 
          ? `J-${timeLeft.days}` 
          : `Dans ${timeLeft.days}j`;
      default:
        return 'Date à venir';
    }
  };

  const getIcon = () => {
    const status = getEventStatus();
    switch (status) {
      case 'starting':
        return <Play className="w-3 h-3" />;
      case 'today':
        return <Zap className="w-3 h-3" />;
      case 'soon':
        return <AlertTriangle className="w-3 h-3" />;
      case 'finished':
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getVariantStyles = () => {
    const status = getEventStatus();
    const baseStyles = {
      default: {
        starting: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg animate-pulse',
        today: 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md',
        soon: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
        upcoming: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white',
        finished: 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-200',
        scheduled: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
      },
      minimal: {
        starting: 'bg-green-100 text-green-800 border border-green-300',
        today: 'bg-red-100 text-red-800 border border-red-300',
        soon: 'bg-amber-100 text-amber-800 border border-amber-300',
        upcoming: 'bg-blue-100 text-blue-800 border border-blue-300',
        finished: 'bg-gray-100 text-gray-600 border border-gray-300',
        scheduled: 'bg-purple-100 text-purple-800 border border-purple-300'
      },
      outline: {
        starting: 'border-2 border-green-500 text-green-600 bg-white/90',
        today: 'border-2 border-red-500 text-red-600 bg-white/90',
        soon: 'border-2 border-amber-500 text-amber-600 bg-white/90',
        upcoming: 'border-2 border-blue-500 text-blue-600 bg-white/90',
        finished: 'border-2 border-gray-500 text-gray-600 bg-white/90',
        scheduled: 'border-2 border-purple-500 text-purple-600 bg-white/90'
      }
    };

    return baseStyles[variant]?.[status] || baseStyles.default.upcoming;
  };

  const getSizeStyles = () => {
    const sizes = {
      small: 'px-2 py-1 text-xs gap-1',
      medium: 'px-3 py-1.5 text-sm gap-1.5',
      large: 'px-4 py-2 text-base gap-2'
    };
    return sizes[size] || sizes.medium;
  };

  // Calcul du pourcentage de progression (pour les événements en cours)
  const calculateProgress = () => {
    if (!eventStartTime || !eventEndTime || timeLeft.days >= 0) return 0;
    
    const start = new Date(`${eventDate}T${eventStartTime}`);
    const end = new Date(`${eventDate}T${eventEndTime}`);
    const now = new Date();
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const progress = calculateProgress();
  const status = getEventStatus();
  const isLive = status === 'starting' || (timeLeft.days < 0 && progress > 0 && progress < 100);

  if (timeLeft.days === null) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Compte à rebours principal */}
      <div className={`
        inline-flex items-center rounded-full font-semibold transition-all duration-300 
        backdrop-blur-sm shadow-sm hover:shadow-md
        ${getVariantStyles()} 
        ${getSizeStyles()}
        ${isLive ? 'animate-pulse' : ''}
      `}>
        {showIcon && (
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
        )}
        
        <span className="whitespace-nowrap">
          {formatTimeLeft()}
        </span>

        {/* Badge LIVE pour événements en cours */}
        {isLive && (
          <div className="flex items-center gap-1 ml-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-xs font-bold">LIVE</span>
          </div>
        )}
      </div>

      {/* Barre de progression pour événements en cours */}
      {showProgress && isLive && progress > 0 && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Tooltip avec informations détaillées */}
      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap transition-opacity duration-200 pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(eventDate).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        {eventStartTime && (
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3" />
            <span>
              {eventStartTime}
              {eventEndTime && ` - ${eventEndTime}`}
            </span>
          </div>
        )}
        {timeLeft.days >= 0 && (
          <div className="mt-1 text-gray-300">
            {timeLeft.days > 0 && `${timeLeft.days} jour${timeLeft.days > 1 ? 's' : ''} `}
            {timeLeft.hours > 0 && `${timeLeft.hours} heure${timeLeft.hours > 1 ? 's' : ''} `}
            {timeLeft.days === 0 && timeLeft.minutes > 0 && `${timeLeft.minutes} minute${timeLeft.minutes > 1 ? 's' : ''}`}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant wrapper avec group pour le tooltip
const EventCountdownWithTooltip = (props) => (
  <div className="group relative inline-block">
    <EventCountdown {...props} />
  </div>
);

export default EventCountdownWithTooltip;

// Export des variantes pour une utilisation facile
export { EventCountdown as EventCountdownBase };