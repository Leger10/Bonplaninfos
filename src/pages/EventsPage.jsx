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
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter
} from "@/components/ui/sheet";
import { Loader2, Search, SlidersHorizontal, AlertTriangle, RefreshCcw } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { useData } from '@/contexts/DataContext';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';
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
    const { hasFetchError } = useData();

    const QUICK_FILTERS = useMemo(() => [
        { label: t("events_page.quick_filters.trending"), value: "trending" },
        { label: t("events_page.quick_filters.popular_by_category"), value: "popular_by_category" },
        { label: t("events_page.quick_filters.free_weekend"), value: "free_weekend" },
        { label: t("events_page.quick_filters.ending_soon"), value: "ending_soon", icon: AlertTriangle },
    ], [t]);

    const fetchInitialData = useCallback(async () => {
        if (hasFetchError) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Fetch events directly from the 'events' table to ensure we get 'end_date'
            // and all other necessary fields that might be missing from the view
            const [eventsRes, categoriesRes] = await Promise.all([
                fetchWithRetry(() => 
                    supabase
                        .from('events')
                        .select('*, category:category_id(name, slug), organizer:organizer_id(full_name)')
                        .eq('status', 'active')
                ),
                fetchWithRetry(() => supabase.from('event_categories').select('*').eq('is_active', true).order('name'))
            ]);

            if (eventsRes.error) throw eventsRes.error;
            if (categoriesRes.error) throw categoriesRes.error;

            // Map data to flatten structure for compatibility with existing components
            const mappedEvents = (eventsRes.data || []).map(event => ({
                ...event,
                category_name: event.category?.name,
                category_slug: event.category?.slug,
                organizer_name: event.organizer?.full_name,
                // Ensure end_date is explicitly available
                end_date: event.end_date 
            }));

            setEvents(mappedEvents);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error("Error fetching events:", error);
            toast({ title: t("common.error_title"), description: "Impossible de charger les événements.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [hasFetchError, t]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

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

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        return filtered.sort((a, b) => {
            const isANew = new Date(a.created_at) > oneDayAgo;
            const isBNew = new Date(b.created_at) > oneDayAgo;
            if (isANew && !isBNew) return -1;
            if (!isANew && isBNew) return 1;

            return new Date(a.event_date) - new Date(b.event_date);
        });
    }, [events, searchTerm, filters]);

    const handleEventClick = async (event) => {
        navigate(`/event/${event.id}`);
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
                    {filteredAndSortedEvents.map(event => (<EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />))}
                </motion.div>) : (<div className="text-center py-16 flex flex-col items-center"><AlertTriangle className="w-16 h-16 text-muted-foreground/50 mb-4" /><h3 className="text-xl font-semibold mb-2">{t('events_page.no_events_found.title')}</h3><p className="text-muted-foreground mb-6">{t('events_page.no_events_found.description')}</p><Button onClick={resetFilters}><RefreshCcw className="w-4 h-4 mr-2" />{t('events_page.no_events_found.reset_button')}</Button></div>)}
            </main>
        </div>
    );
};

export default EventsPage;