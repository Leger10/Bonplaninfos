// hooks/usePromotionalBanner.js
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const usePromotionalBanner = (userProfile) => {
  const location = useLocation();
  const [shouldShowBanner, setShouldShowBanner] = useState(true);
  
  // Pages où la bannière est moins intrusive
  const subtlePages = ['/events', '/discover', '/profile'];
  
  // Pages où la bannière est pertinente
  const relevantPages = [
    '/', '/create-event', '/boost', '/wallet', '/packs',
    '/marketing', '/partner-signup'
  ];

  useEffect(() => {
    // Ne pas montrer la bannière si l'utilisateur vient de fermer
    const bannerDismissed = localStorage.getItem('bannerDismissed');
    if (bannerDismissed === 'true') {
      // Réinitialiser après 4 heures
      const dismissalTime = localStorage.getItem('bannerDismissedTime');
      if (dismissalTime) {
        const timePassed = Date.now() - parseInt(dismissalTime);
        if (timePassed < 4 * 60 * 60 * 1000) {
          setShouldShowBanner(false);
          return;
        } else {
          // Effacer après 4 heures
          localStorage.removeItem('bannerDismissed');
          localStorage.removeItem('bannerDismissedTime');
        }
      }
    }

    // Afficher uniquement sur les pages pertinentes
    const shouldShow = relevantPages.includes(location.pathname);
    setShouldShowBanner(shouldShow);
  }, [location.pathname]);

  const dismissBanner = () => {
    localStorage.setItem('bannerDismissed', 'true');
    localStorage.setItem('bannerDismissedTime', Date.now().toString());
    setShouldShowBanner(false);
  };

  const showBanner = () => {
    localStorage.removeItem('bannerDismissed');
    localStorage.removeItem('bannerDismissedTime');
    setShouldShowBanner(true);
  };

  return {
    shouldShowBanner,
    dismissBanner,
    showBanner
  };
};