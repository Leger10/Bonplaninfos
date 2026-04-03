import { useState, useEffect, useCallback } from 'react';
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

    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem('pwaBannerDismissed');
      if (!dismissed && !isStandalone) setIsBannerVisible(true);
    }, 5000);

    const handleScroll = () => {
      const scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (scrollPercent > 0.3 && !isStandalone) {
        const dismissed = localStorage.getItem('pwaBannerDismissed');
        if (!dismissed) setIsBannerVisible(true);
      }
    };
    window.addEventListener('scroll', handleScroll);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
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
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setIsInstallable(false);
        closeBanner();
        await recordInstall('native_prompt');
        return true;
      }
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