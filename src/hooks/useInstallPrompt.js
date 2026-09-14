import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useInstallPrompt = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [installCount, setInstallCount] = useState(0);

  const isInstallableRef = useRef(false);

  const recordInstall = useCallback(async (source) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('pwa_installs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) return;

      const userAgent = window.navigator.userAgent.toLowerCase();
      const platform = /iphone|ipad|ipod/.test(userAgent) ? 'ios'
                     : /android/.test(userAgent) ? 'android'
                     : 'desktop';
      const deviceType = /mobile|android|iphone|ipad|ipod/i.test(userAgent) ? 'mobile' : 'desktop';

      await supabase.from('pwa_installs').insert({
        user_id: user.id,
        platform,
        device_type: deviceType,
        source,
      });
    } catch (err) {
      console.error('[PWA] Erreur enregistrement :', err);
    }
  }, [user]);

  useEffect(() => {
    const checkExistingStandalone = async () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true;
      if (isStandalone && user) {
        await recordInstall('legacy_standalone');
        setIsInstalled(true);
        setIsBannerVisible(false);
      }
    };
    checkExistingStandalone();
  }, [user, recordInstall]);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isDesktopDevice = !/mobile|android|iphone|ipad|ipod/i.test(userAgent);
    setIsIOS(isIosDevice);
    setIsDesktop(isDesktopDevice);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const visitCount = parseInt(localStorage.getItem('pwa_visit_count') || '0');
    localStorage.setItem('pwa_visit_count', visitCount + 1);
    const base = 20;
    const randomBoost = Math.floor(Math.random() * 15);
    setInstallCount(base + visitCount + randomBoost);

    const canShow = () => {
      const dismissed = localStorage.getItem('pwaBannerDismissed');
      return !dismissed;
    };

    // Afficher le popup UNIQUEMENT quand l'installation est possible de façon
    // native (avantinstallprompt reçu) ou via le guide iOS — sinon le bouton
    // "Installer" mène à une impasse et l'expérience n'est pas fluide.
    const attemptShow = () => {
      if (canShow() && (isInstallableRef.current || isIosDevice)) {
        setIsBannerVisible(true);
      }
    };

    const timer = setTimeout(attemptShow, 5000);

    const handleScroll = () => {
      const scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (scrollPercent > 0.3) attemptShow();
    };
    window.addEventListener('scroll', handleScroll);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      isInstallableRef.current = true;
      setDeferredPrompt(e);
      setIsInstallable(true);
      // Dès que le navigateur autorise l'installation, proposer sans attendre.
      setTimeout(attemptShow, 600);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      isInstallableRef.current = false;
      setIsBannerVisible(false);
      localStorage.setItem('pwaBannerDismissed', 'true');
      recordInstall('app_installed_event');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [recordInstall]);

  const closeBanner = useCallback(() => {
    setIsBannerVisible(false);
    localStorage.setItem('pwaBannerDismissed', 'true');
  }, []);

  const triggerInstall = useCallback(async () => {
    if (isIOS) {
      setShowGuide(true);
      closeBanner();
      await recordInstall('ios_guide');
      return true;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      isInstallableRef.current = outcome === 'accepted';
      if (outcome === 'accepted') {
        setIsInstallable(false);
        closeBanner();
        await recordInstall('native_prompt');
        return true;
      }
      // Rejeté/dismissé : ne plus re-proposer ce visiteur cette session.
      closeBanner();
      return false;
    } else {
      // Pas de beforeinstallprompt : affiche un guide adapté
      setShowGuide(true);
      closeBanner();
      return false;
    }
  }, [isIOS, deferredPrompt, closeBanner, recordInstall]);

  const promptInstall = triggerInstall;
  const closeGuide = () => setShowGuide(false);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isDesktop,
    isBannerVisible,
    showGuide,
    installCount,
    triggerInstall,
    promptInstall,
    closeBanner,
    closeGuide,
    setShowGuide,
  };
};