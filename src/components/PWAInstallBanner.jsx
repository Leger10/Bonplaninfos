import React from 'react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { ArrowDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PWAInstallBanner = () => {
  const { isBannerVisible, triggerInstall, closeBanner, isIOS } = useInstallPrompt();

  return (
    <AnimatePresence>
      {isBannerVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 
                     bg-gray-900 text-white 
                     shadow-2xl rounded-xl border border-gray-700 
                     p-4 w-[calc(100%-2rem)] max-w-sm mx-auto"
        >
          <button
            onClick={closeBanner}
            className="absolute top-2 right-2 text-gray-400 hover:text-white transition"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>

          <div className="text-center mb-4 mt-2">
            <p className="font-semibold text-sm break-words px-2">
              {isIOS ? 'Installer BonPlanInfos' : 'Installer l’application'}
            </p>
            <p className="text-xs text-gray-400 mt-1 break-words px-2">
              {isIOS
                ? 'Partager → Ajouter à l’écran d’accueil'
                : 'Accédez rapidement aux événements.'}
            </p>
          </div>

          <div className="flex justify-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                scale: [1, 1.03, 1],
                transition: { duration: 1.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
              }}
            >
              <Button
                onClick={triggerInstall}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-md"
              >
                {isIOS ? 'Guide' : 'Installer'}
                <ArrowDown className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;