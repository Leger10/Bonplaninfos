import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Plus, ArrowRight, Loader2, Coins, Info, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import WalletInfoModal from '@/components/WalletInfoModal';
import { CoinService } from '@/services/CoinService';
import WelcomePopup from '@/components/WelcomePopup';
import AnimatedBadgesBanner from '@/components/AnimatedBadgesBanner';
import EventTypeFilters from '@/components/homepage/EventTypeFilters';
import EventCard from '@/components/EventCard';
import NearbyEvents from '@/components/NearbyEvents';
import PromotionalBanner from '@/components/PromotionalBanner';
import { promotionalRoutes } from '@/config/promotionalMessages';

const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { userProfile, adminConfig, forceRefreshUserProfile, hasFetchError } = useData();
    const { user } = useAuth();
    const [promotedEvents, setPromotedEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unlockedEvents, setUnlockedEvents] = useState(new Set());
    const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
    const [confirmation, setConfirmation] = useState({ isOpen: false, event: null, cost: 0, costFcfa: 0, onConfirm: null });
    const [showPromoBanner, setShowPromoBanner] = useState(false);

    const fetchInitialData = useCallback(async () => {
        if (hasFetchError) {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const { data: promotionsRes, error: promotionsError } = await supabase
                .from('event_promotions')
                .select(`
                    *,
                    event:event_id (
                        *,
                        organizer:organizer_id(full_name),
                        category:category_id(name, slug)
                    ),
                    promotion_pack:promotion_pack_id(name)
                `)
                .eq('status', 'active')
                .gt('end_date', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(8);

            if (promotionsError) throw promotionsError;
            
            const formattedEvents = promotionsRes
                .filter(promo => promo.event)
                .map(promo => ({
                    ...promo.event,
                    promotion_id: promo.id,
                    is_promoted: true,
                    promotion_end: promo.end_date,
                    pack_name: promo.promotion_pack?.name || 'Pack Promotion',
                    category_name: promo.event.category?.name,
                    category_slug: promo.event.category?.slug,
                    organizer_name: promo.event.organizer?.full_name,
                }));

            setPromotedEvents(formattedEvents || []);

            if (user) {
                const { data, error } = await supabase
                    .from('protected_event_access')
                    .select('event_id')
                    .eq('user_id', user.id)
                    .eq('status', 'active');

                if (error) {
                    console.error('Error fetching unlocked events:', error);
                } else {
                    setUnlockedEvents(new Set(data.map(item => item.event_id)));
                }
            }

        } catch (error) {
            console.error('Error fetching promoted events:', error);
            toast({ 
                title: t('common.error_title'), 
                description: t('home_page.loading_error.description'), 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    }, [hasFetchError, user, t]);

    // Gestion de l'apparition aléatoire de la bannière promo
    useEffect(() => {
        const shouldShowBanner = () => {
            // Vérifier si la route actuelle est dans les routes promotionnelles
            const isPromotionalRoute = promotionalRoutes.includes(location.pathname);
            if (!isPromotionalRoute) return false;

            // Ne pas montrer si l'utilisateur a récemment fermé la bannière pour cette route
            const lastClosed = localStorage.getItem(`promoBannerLastClosed_${location.pathname}`);
            if (lastClosed) {
                const timeSinceLastClose = Date.now() - parseInt(lastClosed);
                // Réapparaît après 45 minutes pour cette route spécifique
                if (timeSinceLastClose < 45 * 60 * 1000) return false;
            }

            // 60% de chance d'apparaître sur la page d'accueil, 40% pour les autres routes
            const chance = location.pathname === '/' ? 0.6 : 0.4;
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

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const executeUnlock = async (event) => {
        if (!user) {
            navigate('/auth');
            return;
        }

        const cost = 2;
        await CoinService.handleAction({
            userId: user.id,
            requiredCoins: cost,
            onSuccess: async () => {
                try {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('access_protected_event', { p_event_id: event.id, p_user_id: user.id }, {method: 'POST'});
                    if (rpcError) throw rpcError;
                    if (!rpcData.success) throw new Error(rpcData.message);

                    setUnlockedEvents(prev => new Set(prev).add(event.id));
                    await forceRefreshUserProfile?.();
                    toast({ title: t('events_page.unlock_modal.success_title'), description: t('events_page.unlock_modal.success_desc', { title: event.title }) });
                    navigate(`/event/${event.id}`);
                } catch (error) {
                    toast({ title: t('common.error_title'), description: error.message, variant: "destructive" });
                }
            },
            onInsufficientBalance: () => setShowWalletInfoModal(true),
        });
    };

    const handleEventClick = async (event) => {
        if (!user) {
            navigate('/auth');
            return;
        }

        const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
        const isUnlocked = unlockedEvents.has(event.id) || event.organizer_id === user.id || isAdmin;

        if (event.event_type === 'protected' && !isUnlocked) {
            const cost = 2;
            const costFcfa = cost * (adminConfig?.coin_to_fcfa_rate || 10);
            setConfirmation({
                isOpen: true,
                event,
                cost,
                costFcfa,
                onConfirm: () => executeUnlock(event),
            });
        } else {
            navigate(`/event/${event.id}`);
        }
    };

    const handleWalletModalProceed = () => {
        setShowWalletInfoModal(false);
        navigate('/wallet');
    };

    const handleRetry = () => {
        window.location.reload();
    };

    const canCreateEvent = userProfile && ['organizer', 'admin', 'super_admin'].includes(userProfile.user_type);

    return (
        <div className="min-h-screen bg-background">
            <Helmet>
                <title>{t('nav.home')} - BonPlanInfos</title>
                <meta name="description" content={t('footer.tagline')} />
            </Helmet>

            {/* Bannière promotionnelle contextuelle */}
            {showPromoBanner && (
                <PromotionalBanner 
                    userProfile={userProfile} 
                    onClose={handlePromoBannerClose}
                />
            )}

            {!hasFetchError && <WelcomePopup />}
            {!hasFetchError && <AnimatedBadgesBanner />}

            <main className="container mx-auto px-4 pt-8 pb-24">
                <EventTypeFilters />
                <NearbyEvents />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="my-12"
                >
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Zap className="text-primary" />
                            {t('home_page.sponsored_events')}
                        </h2>
                        {canCreateEvent && (
                            <Button onClick={() => navigate('/boost')} variant="premium">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('home_page.boost_event')}
                            </Button>
                        )}
                    </div>

                    {hasFetchError ? (
                        <div className="text-center py-16">
                            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-destructive mb-2">{t('home_page.loading_error.title')}</h3>
                            <p className="text-muted-foreground max-w-md mx-auto mb-4">{t('home_page.loading_error.description')}</p>
                            <Button onClick={handleRetry}><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('common.retry')}</Button>
                        </div>
                    ) : loading ? (
                        <div className="text-center text-muted-foreground mt-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin mr-2" />{t('common.loading')}</div>
                    ) : promotedEvents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {promotedEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    isUnlocked={unlockedEvents.has(event.id) || (user && event.organizer_id === user.id) || (userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type))}
                                    onClick={() => handleEventClick(event)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-card/50 rounded-lg border border-dashed border-border">
                            <Zap className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-muted-foreground mb-2">{t('home_page.no_sponsored_events.title')}</h3>
                            <p className="text-muted-foreground max-w-md mx-auto mb-4">{t('home_page.no_sponsored_events.description')}</p>
                            {canCreateEvent && (
                                <Button onClick={() => navigate('/boost')} variant="premium"><Plus className="w-4 h-4 mr-2" />{t('home_page.no_sponsored_events.button')}</Button>
                            )}
                        </div>
                    )}
                </motion.div>

                <div className="mt-12 text-center">
                    <Button variant="outline" onClick={() => navigate('/events')}>
                        {t('home_page.view_all_events')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </main>

            <WalletInfoModal isOpen={showWalletInfoModal} onClose={() => setShowWalletInfoModal(false)} onProceed={handleWalletModalProceed} />

            <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, event: null, cost: 0, costFcfa: 0, onConfirm: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('events_page.unlock_modal.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="flex flex-col items-center justify-center text-center p-4">
                                <Coins className="w-12 h-12 text-primary mb-4" />
                                <p className="text-lg">{t('events_page.unlock_modal.description', { title: confirmation.event?.title, cost: confirmation.cost, costFcfa: confirmation.costFcfa?.toLocaleString('fr-FR') })}</p>
                                <div className="mt-4 text-xs text-muted-foreground p-2 bg-muted rounded flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{t('events_page.unlock_modal.info')}</span>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmation.onConfirm}>{t('common.confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default HomePage;