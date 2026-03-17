import { useState, useEffect } from 'react';

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    console.log('[PWA] Hook useInstallPrompt initialized');
    
    // Détection de l'appareil et du navigateur
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);
    console.log(`[PWA] Device detection: isIOS=${isIosDevice}, UserAgent=${userAgent}`);

    // Vérifier si l'application est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      console.log('[PWA] App is already installed (standalone mode detected)');
      setIsInstalled(true);
    }

    // Gérer l'événement d'installation disponible (Ne se déclenche pas sur iOS Safari)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt event fired and captured');
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Gérer l'événement d'installation réussie
    const handleAppInstalled = () => {
      console.log('[PWA] appinstalled event fired. App was successfully installed!');
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      // Mettre à jour le localStorage pour ne plus afficher les popups
      localStorage.setItem('pwaPremiumPopupDismissed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    console.log('[PWA] promptInstall called');
    if (!deferredPrompt) {
      console.warn("[PWA] L'installation n'est pas disponible pour le moment (deferredPrompt is null).");
      return false;
    }
    
    // Afficher l'invite d'installation native
    console.log('[PWA] Showing native install prompt');
    deferredPrompt.prompt();
    
    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Résultat de l'invite d'installation : ${outcome}`);
    
    // Réinitialiser le prompt
    setDeferredPrompt(null);
    setIsInstallable(false);
    
    return outcome === 'accepted';
  };

  return { isInstallable, isInstalled, isIOS, promptInstall };
};