// hooks/useInstallPrompt.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useInstallPrompt = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

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
                     : 'other';
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

  // Vérifier l'état de la bannière au chargement
  useEffect(() => {
    const dismissed = localStorage.getItem('pwaBannerDismissed') === 'true';
    if (!dismissed) {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
      if (!standalone) {
        setIsBannerVisible(true);
      }
    }
  }, []);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('pwaBannerDismissed', 'true');
      setIsBannerVisible(false);
      recordInstall('app_installed_event');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [recordInstall]);

  // Déclencher l'installation (appelée par la bannière)
  const triggerInstall = useCallback(async () => {
    if (isIOS) {
      await recordInstall('ios_guide');
      setGuideVisible(true);
      setIsBannerVisible(false);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        await recordInstall('native_prompt');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsBannerVisible(false);
      localStorage.setItem('pwaBannerDismissed', 'true');
    }
  }, [isIOS, deferredPrompt, recordInstall]);

  const closeBanner = useCallback(() => {
    setIsBannerVisible(false);
    localStorage.setItem('pwaBannerDismissed', 'true');
  }, []);

  const closeGuide = useCallback(() => {
    setGuideVisible(false);
    localStorage.setItem('pwaGuideDismissed', 'true');
  }, []);

  const showGuide = useCallback(() => {
    setGuideVisible(true);
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isBannerVisible,
    guideVisible,
    triggerInstall,
    closeBanner,
    closeGuide,
    showGuide,
    // Pour compatibilité avec les composants existants
    promptInstall: triggerInstall,
  };
};