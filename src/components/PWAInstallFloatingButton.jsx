import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const PWAInstallFloatingButton = () => {
  const { isBannerVisible, isIOS, installCount, triggerInstall, closeBanner } = useInstallPrompt();

  const handleClick = async () => {
    await triggerInstall();
  };

  return (
    <AnimatePresence>
      {isBannerVisible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 140 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]"
        >
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl">
            <button onClick={handleClick} className="flex items-center gap-2 font-semibold">
              <Download className="w-5 h-5" />
              {isIOS ? 'Installer (Guide)' : `Installer maintenant (${installCount})`}
            </button>
            <button onClick={closeBanner}>
              <X className="w-4 h-4 opacity-80 hover:opacity-100" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallFloatingButton;