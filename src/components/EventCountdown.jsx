import React, { useState, useEffect } from 'react';

const EventCountdown = ({ eventDate }) => {
  const calculateTimeLeft = () => {
    if (!eventDate) return { days: null };
    const difference = new Date(eventDate).getTime() - new Date().getTime();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      };
    } else {
      timeLeft = { days: -1 };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(timer);
  }, [eventDate]);

  const formatTimeLeft = () => {
    if (timeLeft.days === null) {
        return 'Date à venir';
    }
    if (timeLeft.days < 0) {
        return 'Événement terminé';
    }
    if (timeLeft.days === 0) {
      return `Aujourd'hui`;
    }
    if (timeLeft.days === 1) {
      return `Demain`;
    }
    return `J-${timeLeft.days}`;
  };
  
  const isUrgent = timeLeft.days >= 0 && timeLeft.days <= 3;
  const isFinished = timeLeft.days < 0;

  if (timeLeft.days === null) return null;

  return (
    <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold text-white rounded-full flex items-center gap-1.5 transition-all duration-300 shadow-lg backdrop-blur-sm ${isFinished ? 'bg-gray-700/80' : isUrgent ? 'bg-red-500/80 animate-pulse' : 'bg-black/50'}`}>
      ⏳ {formatTimeLeft()}
    </div>
  );
};

export default EventCountdown;