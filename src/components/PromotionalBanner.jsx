// components/PromotionalBanner.jsx (Version ultra-mobile)
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { promotionalMessages } from '@/config/promotionalMessages';

const PromotionalBanner = ({ userProfile, onClose }) => {
  const location = useLocation();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const routeMessages = promotionalMessages[location.pathname] || [];
  const filteredMessages = routeMessages.filter(message => 
    message.targetUserTypes.includes(userProfile?.user_type || 'user')
  );

  useEffect(() => {
    if (filteredMessages.length === 0) {
      setIsVisible(false);
      return;
    }

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % filteredMessages.length);
    }, 8000);

    return () => clearInterval(messageInterval);
  }, [filteredMessages.length, location.pathname]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleAction = () => {
    const currentMsg = filteredMessages[currentMessageIndex];
    if (currentMsg && currentMsg.action) {
      currentMsg.action();
    }
  };

  if (!isVisible || filteredMessages.length === 0) return null;

  const currentMsg = filteredMessages[currentMessageIndex];

  return (
    <div className="fixed top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-50 w-[98vw] sm:w-[95vw] max-w-lg mx-auto px-1 sm:px-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMessageIndex}
          initial={{ opacity: 0, y: -30 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            transition: {
              type: "spring",
              stiffness: 400,
              damping: 30
            }
          }}
          exit={{ 
            opacity: 0, 
            y: -30,
            transition: {
              duration: 0.2
            }
          }}
          className={`bg-gradient-to-r ${currentMsg.color} rounded-lg sm:rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm overflow-hidden w-full`}
        >
          <div className="p-2 sm:p-3">
            {/* Structure unique optimisée mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {/* Ligne 1 : En-tête avec icône, titre et bouton fermer */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="text-white bg-white/20 p-1 sm:p-1.5 rounded-full flex-shrink-0">
                    {React.cloneElement(currentMsg.icon, { 
                      className: "w-3 h-3 sm:w-4 sm:h-4" 
                    })}
                  </div>
                  <h3 className="text-white font-bold text-[13px] sm:text-sm leading-tight flex-1 min-w-0 line-clamp-2">
                    {currentMsg.title}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="text-white hover:bg-white/20 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 min-w-5 sm:min-w-6"
                >
                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </Button>
              </div>

              {/* Ligne 2 : Description */}
              <p className="text-white/90 text-[11px] sm:text-xs leading-relaxed line-clamp-2 sm:line-clamp-3 ml-7 sm:ml-0 -mt-1 sm:mt-0">
                {currentMsg.description}
              </p>

              {/* Ligne 3 : Bouton d'action */}
              <div className="flex justify-center sm:justify-start sm:ml-7">
                <Button 
                  onClick={handleAction}
                  size="sm"
                  className="bg-white text-gray-900 hover:bg-white/90 font-semibold text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 h-7 sm:h-8 w-full sm:w-auto min-w-[120px] sm:min-w-[140px]"
                >
                  {currentMsg.button}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Barre de progression */}
          <motion.div
            className="h-0.5 sm:h-1 bg-white/30 relative overflow-hidden"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ 
              duration: 8, 
              ease: "linear" 
            }}
          >
            <div className="h-full bg-white/90 absolute top-0 left-0 w-full" />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PromotionalBanner;