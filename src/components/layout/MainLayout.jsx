import React, { useState, useEffect } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import CookieBanner from './CookieBanner';
import GlobalEffects from './GlobalEffects';
import ImpersonationBanner from './ImpersonationBanner';
import { useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import ScreenCaptureBlocker from '@/components/ScreenCaptureBlocker';
import PromotionalBanner from '@/components/PromotionalBanner';
import { promotionalRoutes } from '@/config/promotionalMessages';
import { useData } from '@/contexts/DataContext';

const MainLayout = ({ children }) => {
  const { user, hasFetchError } = useAuth();
  const { userProfile } = useData();
  const location = useLocation();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [showPromoBanner, setShowPromoBanner] = useState(false);

  const noNavRoutes = ['/auth'];
  const showBottomNav = user && !noNavRoutes.some(route => location.pathname.startsWith(route));

  // Gestion de l'apparition aléatoire de la bannière promo pour TOUTES les pages
  useEffect(() => {
    const shouldShowBanner = () => {
      // Vérifier si la route actuelle est dans les routes promotionnelles
      const isPromotionalRoute = promotionalRoutes.includes(location.pathname);
      if (!isPromotionalRoute) return false;

      // Ne pas montrer sur les pages d'administration
      if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/secretary')) {
        return false;
      }

      // Ne pas montrer si l'utilisateur a récemment fermé la bannière pour cette route
      const lastClosed = localStorage.getItem(`promoBannerLastClosed_${location.pathname}`);
      if (lastClosed) {
        const timeSinceLastClose = Date.now() - parseInt(lastClosed);
        // Réapparaît après 45 minutes pour cette route spécifique
        if (timeSinceLastClose < 45 * 60 * 1000) return false;
      }

      // Probabilités différentes selon la route
      const chances = {
        '/': 0.6,                    // Page d'accueil - 60%
        '/discover': 0.4,            // Découverte - 40%
        '/events': 0.5,              // Événements - 50%
        '/create-event': 0.7,        // Création - 70%
        '/boost': 0.8,               // Boosting - 80%
        '/wallet': 0.4,              // Portefeuille - 40%
        '/profile': 0.3,             // Profil - 30%
        '/marketing': 0.6,           // Marketing - 60%
        '/guide-utilisation': 0.5,   // Guide - 50%
        '/packs': 0.7,               // Packs - 70%
        '/create-simple-event': 0.4, // Création simple - 40%
        '/create-raffle-event': 0.5, // Tombola - 50%
        '/create-voting-event': 0.5, // Vote - 50%
        '/create-stand-event': 0.5,  // Stand - 50%
        '/create-ticketing-event': 0.6 // Billetterie - 60%
      };

      const chance = chances[location.pathname] || 0.4;
      return Math.random() < chance;
    };

    const timer = setTimeout(() => {
      if (shouldShowBanner()) {
        setShowPromoBanner(true);
      }
    }, 3000); // Apparaît après 3 secondes

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handlePromoBannerClose = () => {
    setShowPromoBanner(false);
    localStorage.setItem(`promoBannerLastClosed_${location.pathname}`, Date.now().toString());
  };

  const handleReload = () => window.location.reload();

  return (
    <div className="flex flex-col min-h-screen">
      <ScreenCaptureBlocker />
      <GlobalEffects />
      <ImpersonationBanner />
      
      {/* Bannière promotionnelle contextuelle pour TOUTES les pages */}
      {showPromoBanner && (
        <PromotionalBanner 
          userProfile={userProfile} 
          onClose={handlePromoBannerClose}
        />
      )}

      <Header isMenuOpen={isMenuOpen} setMenuOpen={setIsMenuOpen} />

      {hasFetchError && (
        <Alert variant="destructive" className="fixed top-[70px] left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-40 animate-in fade-in-0 slide-in-from-top-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t("auth.fetch_error.title")}</AlertTitle>
          <AlertDescription>
            {t("auth.fetch_error.description")}
            <Button onClick={handleReload} variant="secondary" size="sm" className="ml-4">
              {t('common.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <main className={`flex-grow ${showBottomNav ? 'pb-20 md:pb-0' : ''}`}>
        {children}
      </main>

      {showBottomNav && <BottomNav isMenuOpen={isMenuOpen} />}
      <CookieBanner />
    </div>
  );
};

export default MainLayout;