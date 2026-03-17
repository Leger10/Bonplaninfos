import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Zap, BellRing, WifiOff, Share, PlusSquare } from 'lucide-react';
import PWAImageCarousel from './PWAImageCarousel';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const PWAInstallPremiumPopup = ({ images = [] }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { isInstallable, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  useEffect(() => {
    console.log('[PWA] PWAInstallPremiumPopup checking state...');
    const isDismissed = localStorage.getItem('pwaPremiumPopupDismissed') === 'true';
    
    console.log(`[PWA] Popup state: isDismissed=${isDismissed}, isInstallable=${isInstallable}, isInstalled=${isInstalled}, isIOS=${isIOS}`);

    // Afficher la popup si ce n'est pas dismiss, pas installé, et (soit installable via Android/Chrome, soit sur iOS)
    if (!isDismissed && !isInstalled && (isInstallable || isIOS)) {
      console.log('[PWA] Conditions met to show PWA Install Popup');
      // Petit délai pour ne pas agresser l'utilisateur dès la première seconde
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    } else {
       setIsVisible(false);
    }
  }, [isInstallable, isInstalled, isIOS]);

  const handleInstall = async () => {
    console.log('[PWA] User clicked "Installer maintenant"');
    if (isIOS) {
       console.log('[PWA] User is on iOS, showing manual instructions usually handled by UI, but button clicked.');
       // Optionnel: On peut afficher un toast ou une autre modale spécifique iOS ici si besoin.
       return;
    }
    
    const accepted = await promptInstall();
    if (accepted) {
      setIsVisible(false);
      localStorage.setItem('pwaPremiumPopupDismissed', 'true');
    }
  };

  const handleDismiss = () => {
    console.log('[PWA] User dismissed the install popup');
    localStorage.setItem('pwaPremiumPopupDismissed', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Glass Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-colors-background"
            onClick={handleDismiss}
          />

          {/* Premium Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 z-10 flex flex-col max-h-[90vh]"
          >
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Section with Gradient */}
            <div className="relative pt-8 pb-6 px-6 bg-gradient-to-br from-blue-600 to-indigo-800 text-white overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-black/10"></div>
              
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-400/30 rounded-full blur-2xl"></div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4 overflow-hidden p-2">
                  <img src="/logo.svg" alt="BonPlanInfos Logo" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-2xl font-bold font-heading tracking-tight mb-2">L'App BonPlanInfos</h2>
                <p className="text-blue-100 text-sm max-w-[280px]">
                  Votre guide ultime des événements, plus rapide et accessible partout.
                </p>
              </div>
            </div>

            {/* Features & Content Section */}
            <div className="px-6 py-6 flex-grow flex flex-col gap-5 overflow-y-auto custom-scrollbar">
              
              {/* Features List */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <Zap className="w-6 h-6 text-yellow-500 mb-2" />
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Ultra-Rapide</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <BellRing className="w-6 h-6 text-blue-500 mb-2" />
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Notifications Push</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <WifiOff className="w-6 h-6 text-green-500 mb-2" />
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">Accès Hors-Ligne</span>
                </div>
              </div>

              {/* Mini Carousel */}
              {images && images.length > 0 && (
                <div className="mt-2 rounded-xl overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-800 shrink-0">
                   <PWAImageCarousel images={images} height={160} speed={2500} />
                </div>
              )}

              {/* Instructions spécifiques iOS */}
              {isIOS && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mt-2">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 text-center">
                    Pour installer sur votre iPhone/iPad :
                  </p>
                  <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-2 flex flex-col items-center justify-center">
                    <li className="flex items-center gap-2">
                      1. Appuyez sur le bouton Partager <Share className="w-4 h-4 inline" />
                    </li>
                    <li className="flex items-center gap-2">
                      2. Choisissez "Sur l'écran d'accueil" <PlusSquare className="w-4 h-4 inline" />
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Actions Section */}
            <div className="px-6 py-5 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3 shrink-0">
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Installer maintenant
                </button>
              )}
              
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isIOS ? "J'ai compris, fermer" : "Plus tard"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPremiumPopup;