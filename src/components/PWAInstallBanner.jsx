// components/PWAInstallBanner.tsx
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
                     p-4 flex items-center gap-3 
                     max-w-md md:max-w-lg"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {isIOS
                ? 'Installer BonPlanInfos'
                : 'Installer l’application'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isIOS
                ? 'Partager → Ajouter à l’écran d’accueil'
                : 'Accédez rapidement aux événements et notifications.'}
            </p>
          </div>

          <Button
            onClick={triggerInstall}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
          >
            {isIOS ? 'Guide' : 'Installer'}
            <ArrowDown className="w-4 h-4" />
          </Button>

          <button
            onClick={closeBanner}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;