import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter
} from "@/components/ui/sheet";
import { Loader2, Search, SlidersHorizontal, AlertTriangle, Coins, Info, RefreshCcw } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import WalletInfoModal from '@/components/WalletInfoModal';
import { CoinService } from '@/services/CoinService';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';
import PaymentModal from '@/components/PaymentModal';
import { fetchWithRetry } from '@/lib/utils';

const EventsPage = () => {
    const { t } = useTranslation();
    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        selectedCategories: [],
        selectedCountries: [],
        selectedCities: [],
        selectedEventTypes: [],
        priceRange: [0, 50000],
        quickFilter: null,
    });

    const location = useLocation();
    const navigate = useNavigate();
    const { userProfile, adminConfig, forceRefreshUserProfile, hasFetchError } = useData();
    const { user } = useAuth();
    const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [unlockedEvents, setUnlockedEvents] = useState(new Set());
    const [confirmation, setConfirmation] = useState({ isOpen: false, event: null, cost: 0, costFcfa: 0, onConfirm: null });

    const QUICK_FILTERS = useMemo(() => [
        { label: t("events_page.quick_filters.trending"), value: "trending" },
        { label: t("events_page.quick_filters.popular_by_category"), value: "popular_by_category" },
        { label: t("events_page.quick_filters.free_weekend"), value: "free_weekend" },
        { label: t("events_page.quick_filters.ending_soon"), value: "ending_soon", icon: AlertTriangle },
    ], [t]);


    const fetchUnlockedEvents = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await fetchWithRetry(() => supabase.from('protected_event_access').select('event_id').eq('user_id', user.id).eq('status', 'active'));
            if (error) throw error;
            const unlockedSet = new Set(data.map(item => item.event_id));
            setUnlockedEvents(unlockedSet);
        } catch (err) {
            console.error('Error fetching unlocked events:', err);
        }
    }, [user]);

    const fetchInitialData = useCallback(async () => {
        if (hasFetchError) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [eventsRes, categoriesRes] = await Promise.all([
                fetchWithRetry(() => supabase.from('events_with_categories').select('*').eq('status', 'active')),
                fetchWithRetry(() => supabase.from('event_categories').select('*').eq('is_active', true).order('name'))
            ]);
            if (eventsRes.error) throw eventsRes.error;
            if (categoriesRes.error) throw categoriesRes.error;
            setEvents(eventsRes.data || []);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            toast({ title: t("common.error_title"), description: "Impossible de charger les événements.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [hasFetchError, t]);

    useEffect(() => {
        fetchInitialData();
        fetchUnlockedEvents();
    }, [fetchInitialData, fetchUnlockedEvents]);

    useEffect(() => {
        if (location.state?.preselectedEventTypes) {
            setFilters(prev => ({ ...prev, selectedEventTypes: location.state.preselectedEventTypes }));
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    const handleFilterChange = (type, value) => setFilters(prev => ({ ...prev, [type]: prev[type].includes(value) ? prev[type].filter(item => item !== value) : [...prev[type], value] }));
    const handleQuickFilter = (value) => setFilters(prev => ({ ...prev, quickFilter: prev.quickFilter === value ? null : value }));
    const resetFilters = () => {
        setFilters({ selectedCategories: [], selectedCountries: [], selectedCities: [], selectedEventTypes: [], priceRange: [0, 50000], quickFilter: null });
        setSearchTerm('');
    };

    const filteredAndSortedEvents = useMemo(() => {
        let filtered = events.filter(event => {
            const searchTermMatch = searchTerm === '' || event.title.toLowerCase().includes(searchTerm.toLowerCase()) || (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const categoryMatch = filters.selectedCategories.length === 0 || filters.selectedCategories.includes(event.category_slug);
            const countryMatch = filters.selectedCountries.length === 0 || filters.selectedCountries.includes(event.country);
            const cityMatch = filters.selectedCities.length === 0 || filters.selectedCities.includes(event.city);
            const typeMatch = filters.selectedEventTypes.length === 0 || filters.selectedEventTypes.includes(event.event_type);

            return searchTermMatch && categoryMatch && countryMatch && cityMatch && typeMatch;
        });

        if (filters.quickFilter) { /* Quick filter logic here */ }

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        return filtered.sort((a, b) => {
            const isAUnlocked = unlockedEvents.has(a.id);
            const isBUnlocked = unlockedEvents.has(b.id);
            if (isAUnlocked && !isBUnlocked) return 1;
            if (!isAUnlocked && isBUnlocked) return -1;
            
            const isANew = new Date(a.created_at) > oneDayAgo;
            const isBNew = new Date(b.created_at) > oneDayAgo;
            if (isANew && !isBNew) return -1;
            if (!isANew && isBNew) return 1;

            return new Date(a.event_date) - new Date(b.event_date);
        });
    }, [events, searchTerm, filters, unlockedEvents]);

    const executeUnlock = async (event) => {
        await CoinService.handleAction({
            userId: user.id,
            requiredCoins: 2,
            onSuccess: async () => {
                try {
                    const { data: rpcData, error: rpcError } = await fetchWithRetry(() => supabase.rpc('access_protected_event', { p_event_id: event.id, p_user_id: user.id }, {method: 'POST'}));
                    if (rpcError) throw rpcError;
                    if (!rpcData.success) throw new Error(rpcData.message);
                    setUnlockedEvents(prev => new Set(prev).add(event.id));
                    await forceRefreshUserProfile();
                    toast({ title: t('events_page.unlock_modal.success_title'), description: t('events_page.unlock_modal.success_desc', { title: event.title }) });
                    navigate(`/event/${event.id}`);
                } catch (error) {
                    toast({ title: t("common.error_title"), description: error.message, variant: "destructive" });
                }
            },
            onInsufficientBalance: () => setShowWalletInfoModal(true),
        });
    };

    const handleEventClick = async (event) => {
        if (!user) { navigate('/auth'); return; }

        if (!unlockedEvents.has(event.id) && event.event_type !== 'protected') {
            try {
                await supabase.from('user_interactions').insert({ user_id: user.id, event_id: event.id, interaction_type: 'view' });
            } catch (error) { console.error("Failed to log view interaction:", error); }
        }

        const isAdmin = userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type);
        const isOwner = user && event.organizer_id === user.id;
        const isUnlocked = unlockedEvents.has(event.id) || isOwner || isAdmin || event.event_type !== 'protected';

        if (!isUnlocked) {
            const cost = 2;
            const costFcfa = cost * (adminConfig?.coin_to_fcfa_rate || 10);
            setConfirmation({ isOpen: true, event, cost, costFcfa, onConfirm: () => executeUnlock(event) });
        } else {
            navigate(`/event/${event.id}`);
        }
    };

    const availableCities = useMemo(() => {
        if (filters.selectedCountries.length === 0) return Object.values(CITIES_BY_COUNTRY).flat().slice(0, 100);
        return filters.selectedCountries.reduce((acc, country) => acc.concat(CITIES_BY_COUNTRY[country] || []), []);
    }, [filters.selectedCountries]);

    const eventTypes = [
        { name: t('home_page.event_types.standard'), value: 'standard' }, 
        { name: t('home_page.event_types.raffles'), value: 'raffle' }, 
        { name: t('home_page.event_types.voting'), value: 'voting' },
        { name: t('home_page.event_types.stands'), value: 'stand_rental' }, 
        { name: t('home_page.event_types.ticketing'), value: 'ticketing' }, 
        { name: "Protégé", value: 'protected' },
    ];

    const activeFilterCount = filters.selectedCategories.length + filters.selectedCountries.length + filters.selectedCities.length + filters.selectedEventTypes.length + (filters.quickFilter ? 1 : 0);

    return (
        <div className="min-h-screen bg-background">
            <Helmet>
                <title>{t('events_page.title')} - BonPlanInfos</title>
                <meta name="description" content={t('events_page.subtitle')} />
            </Helmet>
            <main className="container mx-auto max-w-7xl px-4 py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-bold mb-2">{t('events_page.title')}</h1>
                    <p className="text-muted-foreground mb-6">{t('events_page.subtitle')}</p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-grow">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input placeholder={t('events_page.search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-12 rounded-full bg-card border-border focus-visible:ring-primary" />
                        </div>
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="h-12 rounded-full relative"><SlidersHorizontal className="w-4 h-4 mr-2" />{t('events_page.filters')} {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{activeFilterCount}</span>}</Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col">
                                <SheetHeader><SheetTitle>{t('events_page.filters')}</SheetTitle></SheetHeader>
                                <div className="py-4 space-y-6 flex-grow overflow-y-auto pr-4">
                                    <div><h3 className="text-lg font-semibold mb-3">{t('events_page.event_types')}</h3><div className="space-y-2">{eventTypes.map(type => (<div key={type.value} className="flex items-center space-x-2"><Checkbox id={`type-${type.value}`} checked={filters.selectedEventTypes.includes(type.value)} onCheckedChange={() => handleFilterChange('selectedEventTypes', type.value)} /><Label htmlFor={`type-${type.value}`} className="cursor-pointer">{type.name}</Label></div>))}</div></div>
                                    <div><h3 className="text-lg font-semibold mb-3">{t('events_page.categories')}</h3><div className="space-y-2 max-h-40 overflow-y-auto">{categories.map(cat => (<div key={cat.id} className="flex items-center space-x-2"><Checkbox id={`cat-${cat.id}`} checked={filters.selectedCategories.includes(cat.slug)} onCheckedChange={() => handleFilterChange('selectedCategories', cat.slug)} /><Label htmlFor={`cat-${cat.id}`} className="cursor-pointer">{cat.name}</Label></div>))}</div></div>
                                    <div><h3 className="text-lg font-semibold mb-3">{t('events_page.countries')}</h3><div className="space-y-2 max-h-40 overflow-y-auto">{COUNTRIES.map(country => (<div key={country.code} className="flex items-center space-x-2"><Checkbox id={`country-${country.code}`} checked={filters.selectedCountries.includes(country.name)} onCheckedChange={() => handleFilterChange('selectedCountries', country.name)} /><Label htmlFor={`country-${country.code}`} className="cursor-pointer">{country.name}</Label></div>))}</div></div>
                                    {availableCities.length > 0 && (<div><h3 className="text-lg font-semibold mb-3">{t('events_page.cities')}</h3><div className="space-y-2 max-h-40 overflow-y-auto">{availableCities.map(city => (<div key={city} className="flex items-center space-x-2"><Checkbox id={`city-${city}`} checked={filters.selectedCities.includes(city)} onCheckedChange={() => handleFilterChange('selectedCities', city)} /><Label htmlFor={`city-${city}`} className="cursor-pointer">{city}</Label></div>))}</div></div>)}
                                </div>
                                <SheetFooter><Button variant="outline" onClick={resetFilters}>{t('events_page.reset')}</Button></SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-6">{QUICK_FILTERS.map(qf => (<Button key={qf.value} variant={filters.quickFilter === qf.value ? 'default' : 'secondary'} size="sm" onClick={() => handleQuickFilter(qf.value)} className="rounded-full">{qf.icon && <qf.icon className={`w-4 h-4 mr-2 ${qf.value === 'ending_soon' ? 'text-red-400' : ''}`} />} {qf.label}</Button>))}</div>
                </motion.div>

                {loading ? (<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>) : hasFetchError ? (<div className="text-center py-16 flex flex-col items-center"><AlertTriangle className="w-16 h-16 text-destructive mb-4" /><h3 className="text-xl font-semibold mb-2 text-destructive">{t('home_page.loading_error.title')}</h3><p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('home_page.loading_error.description')}</p><Button onClick={() => window.location.reload()}><RefreshCcw className="w-4 h-4 mr-2" />{t('common.retry')}</Button></div>) : filteredAndSortedEvents.length > 0 ? (<motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.05 }}>
                    {filteredAndSortedEvents.map(event => (<EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} isUnlocked={unlockedEvents.has(event.id) || (user && event.organizer_id === user.id) || (userProfile && ['super_admin', 'admin', 'secretary'].includes(userProfile.user_type))} />))}
                </motion.div>) : (<div className="text-center py-16 flex flex-col items-center"><AlertTriangle className="w-16 h-16 text-muted-foreground/50 mb-4" /><h3 className="text-xl font-semibold mb-2">{t('events_page.no_events_found.title')}</h3><p className="text-muted-foreground mb-6">{t('events_page.no_events_found.description')}</p><Button onClick={resetFilters}><RefreshCcw className="w-4 h-4 mr-2" />{t('events_page.no_events_found.reset_button')}</Button></div>)}
            </main>
            <WalletInfoModal isOpen={showWalletInfoModal} onClose={() => setShowWalletInfoModal(false)} onProceed={() => {setShowWalletInfoModal(false); setShowPaymentModal(true);}} />
            <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
            <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, event: null, cost: 0, costFcfa: 0, onConfirm: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('events_page.unlock_modal.title')}</AlertDialogTitle>
                        <AlertDialogDescription><div className="flex flex-col items-center justify-center text-center p-4"><Coins className="w-12 h-12 text-primary mb-4" /><p className="text-lg">{t('events_page.unlock_modal.description', { title: confirmation.event?.title, cost: confirmation.cost, costFcfa: confirmation.costFcfa?.toLocaleString('fr-FR') })}</p><div className="mt-4 text-xs text-muted-foreground p-2 bg-muted rounded flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{t('events_page.unlock_modal.info')}</span></div></div></AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={confirmation.onConfirm}>{t('common.confirm')}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default EventsPage;