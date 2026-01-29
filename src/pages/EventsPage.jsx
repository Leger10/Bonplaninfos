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
import { Loader2, Search, SlidersHorizontal, AlertTriangle, RefreshCcw, X } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { useData } from '@/contexts/DataContext';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';
import { fetchWithRetry } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
            // Fetch events directly from the 'events' table to ensure we get 'event_end_at'
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
            const mappedEvents = (eventsRes.data || []).map(eventItem => ({
                ...eventItem,
                category_name: eventItem.category?.name,
                category_slug: eventItem.category?.slug,
                organizer_name: eventItem.organizer?.full_name,
                // Ensure date fields are properly formatted
                event_start_at: eventItem.event_start_at,
                event_end_at: eventItem.event_end_at || null,
            }));

            // Debug log pour vérifier les dates
            console.log("Event dates check (first 3 events):", mappedEvents.slice(0, 3).map(eventItem => ({
                id: eventItem.id,
                title: eventItem.title,
                event_start_at: eventItem.event_start_at,
                event_end_at: eventItem.event_end_at,
                now: new Date().toISOString(),
                isPast: eventItem.event_start_at ? new Date(eventItem.event_start_at) < new Date() : false
            })));

            setEvents(mappedEvents);
            setCategories(categoriesRes.data || []);
        } catch (error) {
            console.error("Error fetching events:", error);
            toast({ 
                title: t("common.error_title"), 
                description: "Impossible de charger les événements.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    }, [hasFetchError, t]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (location.state?.preselectedEventTypes) {
            setFilters(prev => ({ 
                ...prev, 
                selectedEventTypes: location.state.preselectedEventTypes 
            }));
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    const handleFilterChange = (type, value) => {
        setFilters(prev => ({ 
            ...prev, 
            [type]: prev[type].includes(value) 
                ? prev[type].filter(item => item !== value) 
                : [...prev[type], value] 
        }));
    };

    const removeFilter = (type, value) => {
        setFilters(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item !== value)
        }));
    };

    const handleQuickFilter = (value) => {
        setFilters(prev => ({ 
            ...prev, 
            quickFilter: prev.quickFilter === value ? null : value 
        }));
    };

    const resetFilters = () => {
        setFilters({ 
            selectedCategories: [], 
            selectedCountries: [], 
            selectedCities: [], 
            selectedEventTypes: [], 
            priceRange: [0, 50000], 
            quickFilter: null 
        });
        setSearchTerm('');
    };

    const filteredAndSortedEvents = useMemo(() => {
        let filtered = events.filter(eventItem => {
            const searchTermMatch = searchTerm === '' || 
                eventItem.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (eventItem.description && eventItem.description.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const categoryMatch = filters.selectedCategories.length === 0 || 
                filters.selectedCategories.includes(eventItem.category_slug);
            
            const countryMatch = filters.selectedCountries.length === 0 || 
                filters.selectedCountries.includes(eventItem.country);
            
            const cityMatch = filters.selectedCities.length === 0 || 
                filters.selectedCities.includes(eventItem.city);
            
            const typeMatch = filters.selectedEventTypes.length === 0 || 
                filters.selectedEventTypes.includes(eventItem.event_type);

            return searchTermMatch && categoryMatch && countryMatch && cityMatch && typeMatch;
        });

        // Apply quick filters
        if (filters.quickFilter) {
            const now = new Date();
            const oneDayAgo = new Date(now);
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            const oneWeekFromNow = new Date(now);
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

            switch (filters.quickFilter) {
                case 'trending':
                    filtered = filtered.sort((a, b) => 
                        (b.views_count || 0) - (a.views_count || 0)
                    );
                    break;
                case 'popular_by_category':
                    // Group by category and sort by views
                    const categoryViews = {};
                    filtered.forEach(eventItem => {
                        const category = eventItem.category_slug;
                        categoryViews[category] = (categoryViews[category] || 0) + (eventItem.views_count || 0);
                    });
                    filtered = filtered.sort((a, b) => 
                        (categoryViews[b.category_slug] || 0) - (categoryViews[a.category_slug] || 0)
                    );
                    break;
                case 'free_weekend':
                    // Filter events on weekends that are free or low cost
                    filtered = filtered.filter(eventItem => {
                        const eventDate = new Date(eventItem.event_start_at);
                        const dayOfWeek = eventDate.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        // Assuming we have a price field - you might need to adjust this
                        const isLowCost = (eventItem.price || 0) <= 1000; // Adjust threshold as needed
                        return isWeekend && isLowCost;
                    });
                    break;
                case 'ending_soon':
                    // Filter events ending soon (within next week)
                    filtered = filtered.filter(eventItem => {
                        const endDate = eventItem.event_end_at ? new Date(eventItem.event_end_at) : new Date(eventItem.event_start_at);
                        return endDate > now && endDate < oneWeekFromNow;
                    }).sort((a, b) => {
                        const endDateA = a.event_end_at ? new Date(a.event_end_at) : new Date(a.event_start_at);
                        const endDateB = b.event_end_at ? new Date(b.event_end_at) : new Date(b.event_start_at);
                        return endDateA - endDateB;
                    });
                    break;
                default:
                    break;
            }
        }

        // Default sorting: new events first, then by date
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        return filtered.sort((a, b) => {
            const isANew = new Date(a.created_at) > oneDayAgo;
            const isBNew = new Date(b.created_at) > oneDayAgo;
            if (isANew && !isBNew) return -1;
            if (!isANew && isBNew) return 1;

            return new Date(a.event_start_at) - new Date(b.event_start_at);
        });
    }, [events, searchTerm, filters]);

    const handleEventClick = async (clickedEvent) => {
        navigate(`/event/${clickedEvent.id}`);
    };

    const availableCities = useMemo(() => {
        if (filters.selectedCountries.length === 0) {
            return Object.values(CITIES_BY_COUNTRY)
                .flat()
                .slice(0, 100);
        }
        return filters.selectedCountries.reduce((acc, country) => 
            acc.concat(CITIES_BY_COUNTRY[country] || []), 
            []
        );
    }, [filters.selectedCountries]);

    const eventTypes = useMemo(() => [
        { name: t('home_page.event_types.standard'), value: 'standard' }, 
        { name: t('home_page.event_types.raffles'), value: 'raffle' }, 
        { name: t('home_page.event_types.voting'), value: 'voting' },
        { name: t('home_page.event_types.stands'), value: 'stand_rental' }, 
        { name: t('home_page.event_types.ticketing'), value: 'ticketing' }, 
        { name: "Protégé", value: 'protected' },
    ], [t]);

    const activeFilterCount = filters.selectedCategories.length + 
        filters.selectedCountries.length + 
        filters.selectedCities.length + 
        filters.selectedEventTypes.length + 
        (filters.quickFilter ? 1 : 0);

    // Create a list of active filters for display
    const activeFilters = useMemo(() => {
        const filtersList = [];
        
        if (filters.quickFilter) {
            const quickFilter = QUICK_FILTERS.find(qf => qf.value === filters.quickFilter);
            if (quickFilter) {
                filtersList.push({
                    type: 'quickFilter',
                    label: quickFilter.label,
                    value: filters.quickFilter
                });
            }
        }

        filters.selectedEventTypes.forEach(value => {
            const eventType = eventTypes.find(et => et.value === value);
            if (eventType) {
                filtersList.push({
                    type: 'eventType',
                    label: eventType.name,
                    value
                });
            }
        });

        filters.selectedCategories.forEach(value => {
            const category = categories.find(cat => cat.slug === value);
            if (category) {
                filtersList.push({
                    type: 'category',
                    label: category.name,
                    value
                });
            }
        });

        filters.selectedCountries.forEach(value => {
            filtersList.push({
                type: 'country',
                label: value,
                value
            });
        });

        filters.selectedCities.forEach(value => {
            filtersList.push({
                type: 'city',
                label: value,
                value
            });
        });

        return filtersList;
    }, [filters, QUICK_FILTERS, eventTypes, categories]);

    return (
        <div className="min-h-screen bg-background">
            <Helmet>
                <title>{t('events_page.title')} - BonPlanInfos</title>
                <meta name="description" content={t('events_page.subtitle')} />
            </Helmet>
            
            <main className="container mx-auto max-w-7xl px-4 py-8">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
                        {t('events_page.title')}
                    </h1>
                    <p className="text-muted-foreground mb-6 text-lg">
                        {t('events_page.subtitle')}
                    </p>

                    {/* Search and Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-grow">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input 
                                placeholder={t('events_page.search_placeholder')} 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="pl-12 h-12 rounded-full bg-card border-border focus-visible:ring-primary"
                            />
                        </div>
                        
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="h-12 rounded-full relative px-6">
                                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                                    {t('events_page.filters')} 
                                    {activeFilterCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0">
                                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                                    <SheetTitle className="text-xl">
                                        {t('events_page.filters')}
                                    </SheetTitle>
                                </SheetHeader>
                                
                                <div className="py-4 space-y-6 flex-grow overflow-y-auto px-6">
                                    {/* Event Types */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">
                                            {t('events_page.event_types')}
                                        </h3>
                                        <div className="space-y-2">
                                            {eventTypes.map(type => (
                                                <div key={type.value} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`type-${type.value}`} 
                                                        checked={filters.selectedEventTypes.includes(type.value)} 
                                                        onCheckedChange={() => handleFilterChange('selectedEventTypes', type.value)} 
                                                    />
                                                    <Label 
                                                        htmlFor={`type-${type.value}`} 
                                                        className="cursor-pointer text-sm"
                                                    >
                                                        {type.name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Categories */}
                                    {categories.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3">
                                                {t('events_page.categories')}
                                            </h3>
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                {categories.map(cat => (
                                                    <div key={cat.id} className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id={`cat-${cat.id}`} 
                                                            checked={filters.selectedCategories.includes(cat.slug)} 
                                                            onCheckedChange={() => handleFilterChange('selectedCategories', cat.slug)} 
                                                        />
                                                        <Label 
                                                            htmlFor={`cat-${cat.id}`} 
                                                            className="cursor-pointer text-sm"
                                                        >
                                                            {cat.name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Countries */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">
                                            {t('events_page.countries')}
                                        </h3>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                            {COUNTRIES.map(country => (
                                                <div key={country.code} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`country-${country.code}`} 
                                                        checked={filters.selectedCountries.includes(country.name)} 
                                                        onCheckedChange={() => handleFilterChange('selectedCountries', country.name)} 
                                                    />
                                                    <Label 
                                                        htmlFor={`country-${country.code}`} 
                                                        className="cursor-pointer text-sm"
                                                    >
                                                        {country.name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cities */}
                                    {availableCities.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3">
                                                {t('events_page.cities')}
                                            </h3>
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                {availableCities.map(city => (
                                                    <div key={city} className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id={`city-${city}`} 
                                                            checked={filters.selectedCities.includes(city)} 
                                                            onCheckedChange={() => handleFilterChange('selectedCities', city)} 
                                                        />
                                                        <Label 
                                                            htmlFor={`city-${city}`} 
                                                            className="cursor-pointer text-sm"
                                                        >
                                                            {city}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <SheetFooter className="px-6 py-4 border-t bg-muted/50">
                                    <div className="flex justify-between w-full">
                                        <Button 
                                            variant="outline" 
                                            onClick={resetFilters}
                                            className="flex-1 mr-2"
                                        >
                                            {t('events_page.reset')}
                                        </Button>
                                        <Button className="flex-1 ml-2">
                                            {t('events_page.apply_filters')}
                                        </Button>
                                    </div>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Active Filters Display */}
                    {activeFilters.length > 0 && (
                        <div className="mb-6">
                            <div className="flex flex-wrap gap-2">
                                {activeFilters.map((filter, index) => (
                                    <Badge 
                                        key={`${filter.type}-${filter.value}-${index}`}
                                        variant="secondary"
                                        className="px-3 py-1.5 text-sm"
                                    >
                                        {filter.label}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 ml-2 hover:bg-transparent"
                                            onClick={() => removeFilter(filter.type, filter.value)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {t('events_page.clear_all')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Quick Filters */}
                    <div className="flex gap-2 flex-wrap mb-8">
                        {QUICK_FILTERS.map(qf => (
                            <Button 
                                key={qf.value} 
                                variant={filters.quickFilter === qf.value ? 'default' : 'secondary'} 
                                size="sm" 
                                onClick={() => handleQuickFilter(qf.value)} 
                                className="rounded-full"
                            >
                                {qf.icon && (
                                    <qf.icon className={`w-4 h-4 mr-2 ${qf.value === 'ending_soon' ? 'text-red-400' : ''}`} />
                                )} 
                                {qf.label}
                            </Button>
                        ))}
                    </div>
                </motion.div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : hasFetchError ? (
                    /* Error State */
                    <div className="text-center py-16 flex flex-col items-center">
                        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
                        <h3 className="text-xl font-semibold mb-2 text-destructive">
                            {t('home_page.loading_error.title')}
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            {t('home_page.loading_error.description')}
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            {t('common.retry')}
                        </Button>
                    </div>
                ) : filteredAndSortedEvents.length > 0 ? (
                    /* Events Grid */
                    <motion.div 
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ staggerChildren: 0.05 }}
                    >
                        {filteredAndSortedEvents.map(eventItem => (
                            <EventCard 
                                key={eventItem.id} 
                                event={eventItem} 
                                onClick={() => handleEventClick(eventItem)} 
                            />
                        ))}
                    </motion.div>
                ) : (
                    /* No Results State */
                    <div className="text-center py-16 flex flex-col items-center">
                        <AlertTriangle className="w-16 h-16 text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                            {t('events_page.no_events_found.title')}
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            {t('events_page.no_events_found.description')}
                        </p>
                        <Button onClick={resetFilters}>
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            {t('events_page.no_events_found.reset_button')}
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default EventsPage;