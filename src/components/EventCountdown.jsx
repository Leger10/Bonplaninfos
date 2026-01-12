import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Hourglass, Check, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EventCountdown = ({
  eventDate,
  eventEndDate, // New prop to handle duration
  eventStartTime,
  showIcon = true,
  showMotivation = false,
  className = '',
  onCountdownEnd
}) => {
  const calculateTimeLeft = () => {
    if (!eventDate) return { status: 'unknown' };

    const now = new Date();
    const startDate = new Date(eventDate);

    // Handle specific start time if provided (legacy support)
    if (eventStartTime) {
      const [hours, minutes] = eventStartTime.split(':');
      startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    // Determine the effective end date
    // If no end_date is provided, we assume the event ends at the end of the start day (23:59:59)
    let endDate;
    if (eventEndDate) {
      endDate = new Date(eventEndDate);
    } else {
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    }

    // Phase 1: Before Start
    if (now < startDate) {
      const difference = startDate.getTime() - now.getTime();
      return {
        status: 'upcoming',
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        totalMs: difference
      };
    } 
    // Phase 2: Ongoing (Between Start and End)
    else if (now >= startDate && now <= endDate) {
      const difference = endDate.getTime() - now.getTime();
      return {
        status: 'ongoing',
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        totalMs: difference
      };
    } 
    // Phase 3: Finished
    else {
      return {
        status: 'finished',
        days: -1, hours: 0, minutes: 0, seconds: 0, totalMs: -1
      };
    }
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  
  useEffect(() => {
    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft(newTime);
      
      // Trigger callback only once when moving to finished state
      if (newTime.status === 'finished' && timeLeft.status !== 'finished') {
        if (onCountdownEnd) onCountdownEnd();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [eventDate, eventEndDate, eventStartTime, onCountdownEnd]);

  // --- Motivational Messages & Styles ---
  const getMotivationalMessage = () => {
    if (timeLeft.status === 'finished') return null;
    if (timeLeft.status === 'ongoing') return "Derniers instants !";

    if (timeLeft.days > 7) return "Ne manquez pas ça !";
    if (timeLeft.days >= 2) return "Préparez-vous !";
    if (timeLeft.days === 1) return "Demain seulement !";
    if (timeLeft.days === 0) {
      if (timeLeft.hours > 1) return "C'est pour aujourd'hui !";
      return "Dépêchez-vous !";
    }
    return "C'est imminent !";
  };

  // Styling logic
  const isUrgent = timeLeft.status === 'upcoming' && timeLeft.days === 0 && timeLeft.hours < 5;
  const isOngoing = timeLeft.status === 'ongoing';

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
    if (timeLeft.status === 'finished') return finishedStyles;
    if (isOngoing) return ongoingStyles;
    if (isUrgent) return urgentStyles;
    return normalStyles;
  };

  const formatTimeLeft = () => {
    if (timeLeft.status === 'unknown') return '...';
    if (timeLeft.status === 'finished') return 'Terminé';
    
    // Formatting logic shared for upcoming and ongoing
    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}j`);
    if (timeLeft.hours > 0 || (timeLeft.days === 0 && timeLeft.minutes > 0)) parts.push(`${timeLeft.hours}h`);
    if (timeLeft.days < 7) parts.push(`${timeLeft.minutes}m`);
    if ((timeLeft.days === 0 && timeLeft.hours === 0) || isOngoing) parts.push(`${timeLeft.seconds}s`);

    return parts.join(' : ');
  };

  if (timeLeft.status === 'unknown') return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${containerBaseStyles} ${getContainerStyles()}`}>
        {showIcon && (
          <div className={`p-1.5 sm:p-2 rounded-full bg-white/10 ${isUrgent ? 'animate-ping-slow' : ''}`}>
            {timeLeft.status === 'finished' ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" /> : 
             isOngoing ? <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" /> :
             isUrgent ? <Hourglass className="w-4 h-4 sm:w-5 sm:h-5" /> : 
             <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />}
          </div>
        )}

        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80">
            {timeLeft.status === 'finished' ? 'Statut' : 
             timeLeft.status === 'ongoing' ? 'Fin dans' : 'Commence dans'}
          </span>
          <span className="text-lg sm:text-2xl md:text-3xl font-mono tracking-tight tabular-nums">
            {formatTimeLeft()}
          </span>
        </div>
      </div>

      {/* Motivational Message Component */}
      <AnimatePresence mode='wait'>
        {showMotivation && timeLeft.status !== 'finished' && (
          <motion.div
            key="motivation"
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`
                    mt-2 text-xs sm:text-sm font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm
                    ${isUrgent ? 'bg-red-100 text-red-700 animate-bounce-slow' : 
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