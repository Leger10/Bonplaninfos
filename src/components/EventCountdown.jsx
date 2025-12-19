import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Hourglass, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EventCountdown = ({
  eventDate,
  eventStartTime,
  showIcon = true,
  showMotivation = false,
  className = '',
  onCountdownEnd
}) => {
  const calculateTimeLeft = () => {
    if (!eventDate) return { days: null };

    const now = new Date();
    const eventDateTime = new Date(eventDate);

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
      if (newTimeLeft.days === -1 && timeLeft.days !== -1 && onCountdownEnd) {
        onCountdownEnd();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [eventDate, eventStartTime]);

  // --- Motivational Messages & Styles ---
  const getMotivationalMessage = () => {
    if (timeLeft.days === null || timeLeft.days < 0) return null;

    if (timeLeft.days > 7) return "Ne manquez pas ça !";
    if (timeLeft.days >= 2) return "Préparez-vous !";
    if (timeLeft.days === 1) return "Demain seulement !";
    if (timeLeft.days === 0) {
      if (timeLeft.hours > 1) return "C'est pour aujourd'hui !";
      return "Dépêchez-vous, ça commence !";
    }
    return "C'est imminent !";
  };

  // Styling logic based on urgency
  const isUrgent = timeLeft.days !== null && timeLeft.days < 2;
  const isVeryUrgent = timeLeft.days === 0 && timeLeft.hours < 5;

  // Dynamic styles
  const containerBaseStyles = `
    inline-flex items-center gap-2 sm:gap-3 rounded-xl p-2 sm:p-3 font-bold transition-all duration-300 
    backdrop-blur-md shadow-lg border border-white/10
  `;

  const urgentStyles = "bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-[length:200%_200%] animate-gradient-x text-white shadow-red-500/20";
  const normalStyles = "bg-black/40 text-white";
  const finishedStyles = "bg-gray-800/80 text-gray-300";

  const getContainerStyles = () => {
    if (timeLeft.days === -1) return finishedStyles;
    if (isUrgent) return urgentStyles;
    return normalStyles;
  };

  const formatTimeLeft = () => {
    if (timeLeft.days === null) return 'Programmé';
    if (timeLeft.days < 0) return 'Terminé';

    // Responsive Formatting: concise on mobile
    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}j`);

    // Always show hours if relevant
    if (timeLeft.hours > 0 || (timeLeft.days === 0 && timeLeft.minutes > 0)) parts.push(`${timeLeft.hours}h`);

    // Show minutes if less than a week
    if (timeLeft.days < 7) parts.push(`${timeLeft.minutes}m`);

    // Show seconds ONLY if very urgent (less than 24h)
    if (timeLeft.days === 0) parts.push(`${timeLeft.seconds}s`);

    return parts.join(' : ');
  };

  if (timeLeft.days === null) return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${containerBaseStyles} ${getContainerStyles()} ${isVeryUrgent ? 'animate-pulse' : ''}`}>
        {showIcon && (
          <div className={`p-1.5 sm:p-2 rounded-full bg-white/10 ${isUrgent ? 'animate-ping-slow' : ''}`}>
            {isUrgent ? <Hourglass className="w-4 h-4 sm:w-5 sm:h-5" /> : <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />}
          </div>
        )}

        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80">Temps restant</span>
          <span className="text-lg sm:text-2xl md:text-3xl font-mono tracking-tight tabular-nums">
            {formatTimeLeft()}
          </span>
        </div>
      </div>

      {/* Motivational Message Component */}
      <AnimatePresence mode='wait'>
        {showMotivation && timeLeft.days >= 0 && (
          <motion.div
            key="motivation"
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`
                    mt-2 text-xs sm:text-sm font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm
                    ${isUrgent ? 'bg-red-100 text-red-700 animate-bounce-slow' : 'bg-white/90 text-blue-600'}
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