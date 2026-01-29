import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, Hourglass, Check, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EventCountdown = ({
  eventDate,
  eventEndDate,
  eventStartTime,
  showIcon = true,
  showMotivation = false,
  className = '',
  onCountdownEnd
}) => {
  const timerRef = useRef(null);
  
  const calculateTimeLeft = () => {
    if (!eventDate) return { status: 'unknown' };

    const now = new Date();
    const startDate = new Date(eventDate);

    // Handle specific start time if provided (legacy support)
    if (eventStartTime) {
      const [hours, minutes] = eventStartTime.split(':');
      startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    // DÉTERMINATION DE LA DATE DE FIN
    let endDate;
    if (eventEndDate) {
      endDate = new Date(eventEndDate);
    } else {
      // Si pas de date de fin, utiliser la fin de la journée du début
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }

    console.log(`[EventCountdown] Debug:`, {
      now: now.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      eventDate,
      eventEndDate,
      isPastEvent: now > endDate,
      isBeforeStart: now < startDate
    });

    // LOGIQUE DES 3 ÉTATS CORRIGÉE :
    if (now > endDate) {
      // Événement terminé - arrêter tout compte à rebours
      return {
        status: 'finished',
        days: 0, 
        hours: 0, 
        minutes: 0, 
        seconds: 0, 
        totalMs: 0,
        target: 'Terminé'
      };
    } 
    else if (now >= startDate && now <= endDate) {
      // Événement en cours - compte à rebours jusqu'à la fin
      const difference = endDate.getTime() - now.getTime();
      return {
        status: 'ongoing',
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        totalMs: difference,
        target: 'Termine dans'
      };
    }
    else {
      // Événement à venir - compte à rebours jusqu'au début
      const difference = startDate.getTime() - now.getTime();
      return {
        status: 'upcoming',
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        totalMs: difference,
        target: 'Commence dans'
      };
    }
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  
  useEffect(() => {
    // Nettoyer tout timer existant
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const newTime = calculateTimeLeft();
    setTimeLeft(newTime);
    
    // Si l'événement est terminé, ne pas démarrer de timer
    if (newTime.status === 'finished') {
      if (onCountdownEnd) onCountdownEnd();
      return;
    }

    // Démarrer le timer uniquement pour les événements non terminés
    timerRef.current = setInterval(() => {
      const updatedTime = calculateTimeLeft();
      setTimeLeft(updatedTime);
      
      // Si l'événement vient de se terminer, arrêter le timer
      if (updatedTime.status === 'finished') {
        clearInterval(timerRef.current);
        if (onCountdownEnd) onCountdownEnd();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [eventDate, eventEndDate, eventStartTime, onCountdownEnd]);

  // --- Motivational Messages & Styles ---
  const getMotivationalMessage = () => {
    if (timeLeft.status === 'finished') return "Événement terminé";
    if (timeLeft.status === 'ongoing') {
      if (timeLeft.hours < 1 && timeLeft.minutes < 30) return "Derniers instants !";
      if (timeLeft.hours < 3) return "Ça se termine bientôt !";
      return "En cours !";
    }

    // Messages pour upcoming
    if (timeLeft.days > 7) return "À venir !";
    if (timeLeft.days >= 2) return "Préparez-vous !";
    if (timeLeft.days === 1) return "Demain seulement !";
    if (timeLeft.days === 0) {
      if (timeLeft.hours > 1) return "C'est pour aujourd'hui !";
      if (timeLeft.hours === 1) return "Dans 1 heure !";
      if (timeLeft.minutes < 30) return "Imminent !";
      return "Dépêchez-vous !";
    }
    return "À venir !";
  };

  // Styling logic
  const isUrgent = timeLeft.status === 'upcoming' && timeLeft.days === 0 && timeLeft.hours < 5;
  const isOngoing = timeLeft.status === 'ongoing';
  const isFinished = timeLeft.status === 'finished';

  // Dynamic styles
  const containerBaseStyles = `
    inline-flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-3 font-bold transition-all duration-300 
    backdrop-blur-md shadow-lg border border-white/10
  `;

  const urgentStyles = "bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-[length:200%_200%] animate-gradient-x text-white shadow-red-500/20";
  const ongoingStyles = "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-500/20";
  const normalStyles = "bg-black/40 text-white";
  const finishedStyles = "bg-gray-800/90 text-gray-300 border-gray-700";

  const getContainerStyles = () => {
    if (isFinished) return finishedStyles;
    if (isOngoing) return ongoingStyles;
    if (isUrgent) return urgentStyles;
    return normalStyles;
  };

  const formatTimeLeft = () => {
    if (timeLeft.status === 'unknown') return '...';
    if (timeLeft.status === 'finished') return 'Terminé';
    
    // Formatting pour les événements non terminés
    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}j`);
    if (timeLeft.hours > 0 || (timeLeft.days === 0 && timeLeft.minutes > 0)) parts.push(`${timeLeft.hours}h`);
    if (timeLeft.days < 7) parts.push(`${timeLeft.minutes}m`);
    if ((timeLeft.days === 0 && timeLeft.hours === 0) || isOngoing) parts.push(`${timeLeft.seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  // Si l'événement est terminé, vous pouvez choisir de ne rien afficher
  // ou d'afficher un message. Ici, on affiche "Terminé"
  if (timeLeft.status === 'finished' && !showMotivation) {
    // Option: Ne rien afficher pour les événements terminés
    // return null;
    
    // Option: Afficher un badge "Terminé"
    return (
      <div className={className}>
        <div className={`${containerBaseStyles} ${finishedStyles}`}>
          {showIcon && (
            <div className="p-1.5 sm:p-2 rounded-full bg-white/10">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
          )}
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80">
              Événement
            </span>
            <span className="text-lg sm:text-2xl md:text-3xl font-mono tracking-tight">
              Terminé
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (timeLeft.status === 'unknown') return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${containerBaseStyles} ${getContainerStyles()}`}>
        {showIcon && (
          <div className={`p-1.5 sm:p-2 rounded-full bg-white/10 ${isUrgent ? 'animate-ping-slow' : ''}`}>
            {isFinished ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" /> : 
             isOngoing ? <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" /> :
             isUrgent ? <Hourglass className="w-4 h-4 sm:w-5 sm:h-5" /> : 
             <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />}
          </div>
        )}

        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80">
            {timeLeft.target}
          </span>
          <span className="text-lg sm:text-2xl md:text-3xl font-mono tracking-tight tabular-nums">
            {formatTimeLeft()}
          </span>
        </div>
      </div>

      {/* Motivational Message Component */}
      <AnimatePresence mode='wait'>
        {showMotivation && (
          <motion.div
            key={`motivation-${timeLeft.status}`}
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`
              mt-2 text-xs sm:text-sm font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm
              ${isFinished ? 'bg-gray-800 text-gray-300' : 
                isUrgent ? 'bg-red-100 text-red-700 animate-bounce-slow' : 
                isOngoing ? 'bg-green-100 text-green-800' : 'bg-white/90 text-blue-600'}
            `}
          >
            {isUrgent && <AlertTriangle className="w-3 h-3 inline-block mr-1 -mt-0.5" />}
            {getMotivationalMessage()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventCountdown;