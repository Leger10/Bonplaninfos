import React from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import FloatingActionButton from './FloatingActionButton';
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

const MainLayout = ({ children }) => {
  const { user, hasFetchError } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  const noNavRoutes = ['/auth'];
  const showBottomNav = user && !noNavRoutes.some(route => location.pathname.startsWith(route));

  const handleReload = () => window.location.reload();

  return (
    <div className="flex flex-col min-h-screen">
      <ScreenCaptureBlocker />
      <GlobalEffects />
      <ImpersonationBanner />
      <Navbar />

      {hasFetchError && (
        <Alert variant="destructive" className="fixed top-[70px] left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 animate-in fade-in-0 slide-in-from-top-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t("auth.fetch_error.title")}</AlertTitle>
          <AlertDescription>
            {t("auth.fetch_error.description")}
            <Button onClick={handleReload} variant="secondary" size="sm" className="ml-4">
              Rafraîchir
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <main className={`flex-grow pt-20 ${showBottomNav ? 'pb-20' : ''}`}>
        {children}
      </main>

      {showBottomNav && <BottomNav />}
      {showBottomNav && <FloatingActionButton />}
      <CookieBanner />
    </div>
  );
};

export default MainLayout;