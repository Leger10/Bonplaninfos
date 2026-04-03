import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Zap, BellRing, WifiOff } from 'lucide-react';
import PWAImageCarousel from './PWAImageCarousel';
import PWAInstallGuide from './PWAInstallGuide';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const PWAInstallPremiumPopup = ({ images = [] }) => {
  const { isBannerVisible, isIOS, triggerInstall, closeBanner, showGuide, closeGuide } = useInstallPrompt();

  const handleInstall = async () => {
    await triggerInstall();
    // La popup se ferme dans triggerInstall (closeBanner appelé)
  };

  return (
    <>
      <AnimatePresence>
        {isBannerVisible && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeBanner}
            />

            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden z-10 border border-gray-100 dark:border-gray-800"
            >
              {/* Header */}
              <div className="pt-8 pb-6 px-6 bg-gradient-to-br from-blue-600 to-indigo-800 text-white text-center">
                <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 p-2 shadow-lg">
                  <img src="/logo1.png" alt="Logo" className="w-full h-full" />
                </div>
                <h2 className="text-2xl font-bold">BonPlanInfos App</h2>
                <p className="text-blue-100 text-sm">Installez l'application pour ne rien rater.</p>
              </div>

              {/* Contenu */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-3 gap-2">
                  <FeatureIcon icon={<Zap className="text-yellow-500" />} label="Rapide" color="text-yellow-600 dark:text-yellow-400" />
                  <FeatureIcon icon={<BellRing className="text-blue-500" />} label="Simple" color="text-blue-600 dark:text-blue-400" />
                  <FeatureIcon icon={<WifiOff className="text-green-500" />} label="Notifications" color="text-green-600 dark:text-green-400" />
                </div>

                {images.length > 0 && (
                  <div className="rounded-xl overflow-hidden shadow-inner border">
                    <PWAImageCarousel images={images} height={160} />
                  </div>
                )}
              </div>

              {/* Boutons */}
              <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t flex flex-col gap-3">
                <button
                  onClick={handleInstall}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  {isIOS ? "Voir comment installer" : "Installer maintenant"}
                </button>
                <button onClick={closeBanner} className="text-gray-500 text-sm font-medium">
                  Plus tard
                </button>
              </div>

              <button onClick={closeBanner} className="absolute top-4 right-4 text-white/70">
                <X />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guide multi-plateforme */}
      <PWAInstallGuide isOpen={showGuide} onClose={closeGuide} />
    </>
  );
};

const FeatureIcon = ({ icon, label, color = "text-gray-700 dark:text-gray-300" }) => (
  <div className="flex flex-col items-center p-2 bg-gray-100 dark:bg-slate-800 rounded-lg">
    {icon}
    <span className={`text-[10px] font-bold mt-1 uppercase tracking-tighter ${color}`}>
      {label}
    </span>
  </div>
);

export default PWAInstallPremiumPopup;