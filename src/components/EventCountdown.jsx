import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, Hourglass, Check, PlayCircle, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EventCountdown = ({
  eventDate,
  eventEndDate,
  eventStartTime,
  showIcon = true,
  showMotivation = false,
  className = '',
  onCountdownEnd,
  // Nouvelles props pour alignement avec VotingInterface
  showStatusLabel = true,
  showFullTimer = false,
  compactMode = false
}) => {
  const timerRef = useRef(null);
  
  const calculateTimeLeft = () => {
    if (!eventDate) return { status: 'unknown', expired: false };

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

    // LOGIQUE ALIGNÉE SUR LE COMPTE À REBOURS DE VotingInterface
    const nowTime = now.getTime();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    // Si après la date de fin → Événement terminé
    if (nowTime > endTime) {
      return {
        status: 'finished',
        expired: true,
        days: 0, 
        hours: 0, 
        minutes: 0, 
        seconds: 0, 
        totalMs: 0,
        target: 'Terminé'
      };
    } 
    // Si entre la date de début et la date de fin → Événement en cours
    else if (nowTime >= startTime && nowTime <= endTime) {
      const difference = endTime - nowTime;
      return {
        status: 'ongoing',
        expired: false,
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        totalMs: difference,
        target: 'Termine dans'
      };
    }
    // Si avant la date de début → Événement à venir
    else {
      const difference = startTime - nowTime;
      return {
        status: 'upcoming',
        expired: false,
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
    if (newTime.status === 'finished' || newTime.expired) {
      if (onCountdownEnd) onCountdownEnd();
      return;
    }

    // Démarrer le timer uniquement pour les événements non terminés
    timerRef.current = setInterval(() => {
      const updatedTime = calculateTimeLeft();
      setTimeLeft(updatedTime);
      
      // Si l'événement vient de se terminer, arrêter le timer
      if (updatedTime.status === 'finished' || updatedTime.expired) {
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
      // Calculer le temps total restant en minutes
      const totalMinutesLeft = (timeLeft.days * 24 * 60) + (timeLeft.hours * 60) + timeLeft.minutes;
      
      if (totalMinutesLeft < 30) return "Derniers instants !";
      if (totalMinutesLeft < 180) return "Ça se termine bientôt !"; // 3 heures = 180 minutes
      return "En cours !";
    }

    // Messages pour upcoming
    const totalHoursUntilStart = (timeLeft.days * 24) + timeLeft.hours;
    const totalMinutesUntilStart = (totalHoursUntilStart * 60) + timeLeft.minutes;
    
    if (timeLeft.days > 7) return "À venir !";
    if (timeLeft.days >= 2) return "Préparez-vous !";
    if (timeLeft.days === 1) return "Demain seulement !";
    
    // Moins d'un jour restant
    if (totalHoursUntilStart > 1) return "C'est pour aujourd'hui !";
    if (totalHoursUntilStart === 1) return "Dans 1 heure !";
    if (totalMinutesUntilStart < 30) return "Imminent !";
    return "Dépêchez-vous !";
  };

  // Styling logic - aligné avec VotingInterface
  const isUrgent = timeLeft.status === 'upcoming' && timeLeft.days === 0 && timeLeft.hours < 5;
  const isOngoing = timeLeft.status === 'ongoing';
  const isFinished = timeLeft.status === 'finished' || timeLeft.expired;

  // Dynamic styles
  const containerBaseStyles = `
    inline-flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-3 font-bold transition-all duration-300 
    backdrop-blur-md shadow-lg border border-white/10
  `;

  const urgentStyles = "bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-[length:200%_200%] animate-gradient-x text-white shadow-red-500/20";
  const ongoingStyles = "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-500/20";
  const normalStyles = "bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border-blue-700/30 text-white";
  const finishedStyles = "bg-gray-800/90 text-gray-300 border-gray-700";

  const getContainerStyles = () => {
    if (isFinished) return finishedStyles;
    if (isOngoing) return ongoingStyles;
    if (isUrgent) return urgentStyles;
    return normalStyles;
  };

  // Formatage cohérent avec CountdownTimer dans VotingInterface
  const formatTimeLeft = () => {
    if (timeLeft.status === 'unknown') return '...';
    if (timeLeft.status === 'finished' || timeLeft.expired) {
      return compactMode ? 'Terminé' : '🎉 Terminé !';
    }
    
    if (showFullTimer || compactMode) {
      // Format similaire à CountdownTimer (avec J H M S)
      const parts = [];
      if (timeLeft.days > 0) parts.push(`${timeLeft.days}J`);
      if (timeLeft.hours > 0 || timeLeft.days === 0) parts.push(`${timeLeft.hours}H`);
      parts.push(`${timeLeft.minutes}M`);
      if (timeLeft.days === 0 && timeLeft.hours === 0) parts.push(`${timeLeft.seconds}S`);
      
      return parts.length > 0 ? parts.join(' ') : '0S';
    }
    
    // Format original pour backward compatibility
    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}j`);
    if (timeLeft.hours > 0 || (timeLeft.days === 0 && timeLeft.minutes > 0)) parts.push(`${timeLeft.hours}h`);
    if (timeLeft.days < 7) parts.push(`${timeLeft.minutes}m`);
    if ((timeLeft.days === 0 && timeLeft.hours === 0) || isOngoing) parts.push(`${timeLeft.seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  // Affichage du statut (aligné avec VotingInterface)
  const getStatusDisplay = () => {
    if (isFinished) return (
      <div className="text-center py-4 bg-gradient-to-r from-red-900/50 to-red-800/30 border border-red-700/50 rounded-xl">
        <p className="text-red-300 font-bold text-lg">🎉 Terminé !</p>
      </div>
    );
    
    if (isOngoing) {
      return (
        <div className="text-center py-4 bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-700/30 rounded-xl">
          <p className="text-green-300 font-bold text-lg">En cours</p>
        </div>
      );
    }
    
    return null;
  };

  // Si l'événement est terminé et en mode compact
  if (isFinished && compactMode) {
    return (
      <div className={`${className} ${finishedStyles} rounded-lg px-3 py-2`}>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span className="text-sm">Terminé</span>
        </div>
      </div>
    );
  }

  // Si l'événement est terminé et on ne veut pas afficher la motivation
  if (isFinished && !showMotivation && !showFullTimer) {
    return (
      <div className={className}>
        <div className={`${containerBaseStyles} ${finishedStyles}`}>
          {showIcon && (
            <div className="p-1.5 sm:p-2 rounded-full bg-white/10">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
          )}
          <div className="flex flex-col items-start leading-tight">
            {showStatusLabel && (
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80">
                Événement
              </span>
            )}
            <span className="text-lg sm:text-2xl md:text-3xl font-mono tracking-tight">
              Terminé
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Si l'événement est terminé avec affichage complet (comme dans VotingInterface)
  if (isFinished && showFullTimer) {
    return getStatusDisplay();
  }

  if (timeLeft.status === 'unknown') return null;

  // Affichage du timer complet (comme dans VotingInterface)
  if (showFullTimer) {
    return (
      <div className={`${className}`}>
        {showStatusLabel && (
          <h3 className="font-bold text-lg mb-3 flex items-center justify-center gap-2 text-blue-300">
            <Target className="w-5 h-5 text-blue-400" /> 
            {timeLeft.target === 'Termine dans' ? 'Temps restant' : timeLeft.target}
          </h3>
        )}
        
        <div className="flex justify-center gap-2">
          {[
            { value: timeLeft.days, label: 'J' },
            { value: timeLeft.hours, label: 'H' },
            { value: timeLeft.minutes, label: 'M' },
            { value: timeLeft.seconds, label: 'S' }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className={`
                p-3 rounded-xl shadow-lg min-w-[60px] text-center
                ${isOngoing ? 'bg-gradient-to-b from-green-600 to-emerald-500' : 
                  isUrgent ? 'bg-gradient-to-b from-red-600 to-orange-500' : 
                  'bg-gradient-to-b from-blue-600 to-cyan-500'}
              `}
            >
              <div className="text-2xl font-bold text-white">{item.value}</div>
              <div className="text-xs text-white/80">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Afficher le statut si demandé */}
        {showMotivation && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
              mt-4 text-xs sm:text-sm font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm text-center
              ${isOngoing ? 'bg-green-100 text-green-800' : 
                isUrgent ? 'bg-red-100 text-red-700' : 
                'bg-blue-100 text-blue-700'}
            `}
          >
            {getMotivationalMessage()}
          </motion.div>
        )}
      </div>
    );
  }

  // Affichage original (mode normal)
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
          {showStatusLabel && (
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80">
              {timeLeft.target}
            </span>
          )}
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