import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share, 
  PlusSquare, 
  MoreVertical, 
  Download, 
  X, 
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PWAInstallGuide = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [os, setOs] = useState('other');

  useEffect(() => {
    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    if (isIOS) setOs('ios');
    else if (isAndroid) setOs('android');

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    
    // Check if dismissed previously
    const dismissed = localStorage.getItem('pwaGuideDismissed') === 'true';

    // Show guide if on mobile, not installed, and not dismissed
    // We use a slight delay so it doesn't instantly pop up over everything
    if ((isIOS || isAndroid) && !isStandalone && !dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwaGuideDismissed', 'true');
  };

  const IosGuide = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
        <div className="bg-background p-2 rounded shadow-sm border">
          <Share className="w-5 h-5 text-blue-500" />
        </div>
        <p className="text-sm font-medium">1. Appuyez sur le bouton <strong>Partager</strong> dans la barre de navigation Safari.</p>
      </div>
      <div className="flex justify-center text-muted-foreground">
        <ChevronRight className="w-4 h-4 rotate-90" />
      </div>
      <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
        <div className="bg-background p-2 rounded shadow-sm border">
          <PlusSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </div>
        <p className="text-sm font-medium">2. Faites défiler et sélectionnez <strong>Sur l'écran d'accueil</strong>.</p>
      </div>
      <div className="flex justify-center text-muted-foreground">
        <ChevronRight className="w-4 h-4 rotate-90" />
      </div>
      <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
        <div className="bg-background px-3 py-1 rounded shadow-sm border font-semibold text-blue-500 text-sm">
          Ajouter
        </div>
        <p className="text-sm font-medium">3. Confirmez en appuyant sur <strong>Ajouter</strong> en haut à droite.</p>
      </div>
    </div>
  );

  const AndroidGuide = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
        <div className="bg-background p-2 rounded shadow-sm border">
          <MoreVertical className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </div>
        <p className="text-sm font-medium">1. Appuyez sur le <strong>Menu</strong> (trois points) de Chrome en haut à droite.</p>
      </div>
      <div className="flex justify-center text-muted-foreground">
        <ChevronRight className="w-4 h-4 rotate-90" />
      </div>
      <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
        <div className="bg-background p-2 rounded shadow-sm border">
          <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </div>
        <p className="text-sm font-medium">2. Sélectionnez <strong>Installer l'application</strong> ou <strong>Ajouter à l'écran d'accueil</strong>.</p>
      </div>
      <div className="flex justify-center text-muted-foreground">
        <ChevronRight className="w-4 h-4 rotate-90" />
      </div>
      <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
        <div className="bg-primary text-primary-foreground px-3 py-1 rounded shadow-sm font-semibold text-sm">
          Installer
        </div>
        <p className="text-sm font-medium">3. Confirmez l'installation sur la popup qui s'affiche.</p>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-background rounded-3xl shadow-2xl overflow-hidden border border-border z-10 flex flex-col max-h-[90vh]"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 z-20 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="px-6 pt-8 pb-4 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold font-heading tracking-tight mb-2">Installez l'Application</h2>
              <p className="text-sm text-muted-foreground">
                Ajoutez BonPlanInfos à votre écran d'accueil pour un accès rapide, même hors ligne !
              </p>
            </div>

            {/* Guide Content */}
            <div className="px-6 py-2 overflow-y-auto custom-scrollbar">
              {os === 'ios' ? <IosGuide /> : <AndroidGuide />}
            </div>

            {/* Actions */}
            <div className="px-6 py-6 mt-2">
              <Button 
                onClick={handleDismiss} 
                className="w-full"
                size="lg"
              >
                J'ai compris
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallGuide;