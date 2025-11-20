import React, { Suspense } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProviderWithData } from '@/contexts/SupabaseAuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import MainLayout from '@/components/layout/MainLayout';
import HomePage from '@/pages/HomePage';
import AuthPage from '@/pages/AuthPage';
import ProfilePage from '@/pages/ProfilePage';
import EventsPage from '@/pages/EventsPage';
import CreateEventPage from '@/pages/CreateEventPage';
import EventDetailPage from '@/pages/EventDetailPage';
import AdminDashboard from '@/pages/AdminDashboard';
import SecretaryDashboard from '@/pages/SecretaryDashboard';
import WalletPage from '@/pages/WalletPage';
import SettingsPage from '@/pages/SettingsPage';
import PromotionsPage from '@/pages/PromotionsPage';
import CreatePromotionPage from '@/pages/CreatePromotionPage';
import NotificationsPage from '@/pages/NotificationsPage';
import TermsPage from '@/pages/TermsPage';
import NewsPage from '@/pages/NewsPage';
import BoostPage from '@/pages/BoostPage';
import MarketingPage from '@/pages/MarketingPage';
import PartnerSignupPage from '@/pages/PartnerSignupPage';
import MandatoryVideoPopup from '@/components/video/MandatoryVideoPopup';
import AboutPage from '@/pages/AboutPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import HelpCenterPage from '@/pages/HelpCenterPage';
import LegalMentionsPage from '@/pages/LegalMentionsPage';
import HowItWorksPage from '@/pages/HowItWorksPage';
import PricingPage from '@/pages/PricingPage';
import PaymentSuccessPage from '@/pages/PaymentSuccessPage';
import PaymentCancelPage from '@/pages/PaymentCancelPage';
import ContestsPage from '@/pages/ContestsPage';
import ContestDetailPage from '@/pages/ContestDetailPage';
import DiscoverPage from '@/pages/DiscoverPage';
import CoinPacksPage from '@/pages/CoinPacksPage';
import PaymentRedirectPage from '@/pages/PaymentRedirectPage';
import CreateRaffleEventPage from '@/pages/CreateRaffleEventPage';
import CreateVotingEventPage from '@/pages/CreateVotingEventPage';
import CreateStandEventPage from '@/pages/CreateStandEventPage';
import CreateTicketingEventPage from '@/pages/CreateTicketingEventPage';
import PaymentCheckoutPage from '@/pages/PaymentCheckoutPage';
import CreateSimpleEventPage from '@/pages/CreateSimpleEventPage';
import AddLocationPage from '@/pages/AddLocationPage';
import VerifyTicketPage from '@/pages/VerifyTicketPage';
import DataProtectionPage from '@/pages/DataProtectionPage';
import UserGuidePage from '@/pages/UserGuidePage';
import FaqPage from '@/pages/FaqPage';
import SponsorsPage from '@/pages/SponsorsPage';
import PushNotificationManager from '@/components/PushNotificationManager';
import WelcomePopup from '@/components/WelcomePopup';
import FloatingActionButton from '@/components/layout/FloatingActionButton';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProviderWithData>
            <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/add-location" element={<AddLocationPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/create-event" element={<CreateEventPage />} />
                  <Route path="/create-simple-event" element={<CreateSimpleEventPage />} />
                  <Route path="/create-raffle-event" element={<CreateRaffleEventPage />} />
                  <Route path="/create-voting-event" element={<CreateVotingEventPage />} />
                  <Route path="/create-stand-event" element={<CreateStandEventPage />} />
                  <Route path="/create-ticketing-event" element={<CreateTicketingEventPage />} />
                  <Route path="/event/:id" element={<EventDetailPage />} />
                  <Route path="/contests" element={<ContestsPage />} />
                  <Route path="/contest/:id" element={<ContestDetailPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/secretary" element={<SecretaryDashboard />} />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/promotions" element={<PromotionsPage />} />
                  <Route path="/create-promotion" element={<CreatePromotionPage />} />
                  <Route path="/news" element={<NewsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/conditions-utilisation" element={<TermsPage />} />
                  <Route path="/boost" element={<BoostPage />} />
                  <Route path="/marketing" element={<MarketingPage />} />
                  <Route path="/partner-signup" element={<PartnerSignupPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/politique-confidentialite" element={<PrivacyPolicyPage />} />
                  <Route path="/protection-donnees" element={<DataProtectionPage />} />
                  <Route path="/help-center" element={<HelpCenterPage />} />
                  <Route path="/aide" element={<HelpCenterPage />} />
                  <Route path="/guide-utilisation" element={<UserGuidePage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/sponsors" element={<SponsorsPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/packs" element={<CoinPacksPage />} />
                  <Route path="/buy/:packSlug" element={<PaymentRedirectPage />} />
                  <Route path="/payment/checkout" element={<PaymentCheckoutPage />} />
                  <Route path="/paiement/success" element={<PaymentSuccessPage />} />
                  <Route path="/paiement/cancel" element={<PaymentCancelPage />} />
                  <Route path="/verify-ticket" element={<VerifyTicketPage />} />
                  <Route path="/legal-mentions" element={<LegalMentionsPage />} />
                </Routes>
                <Toaster />
                <MandatoryVideoPopup />
                <PushNotificationManager />
                <WelcomePopup />
                <FloatingActionButton />
              </MainLayout>
            </Suspense>
        </AuthProviderWithData>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;