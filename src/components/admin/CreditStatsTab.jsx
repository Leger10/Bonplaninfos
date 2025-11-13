import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, Coins, Euro, BarChart3, Filter } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-date-range';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fr } from 'date-fns/locale';

const CreditStatsTab = () => {
    const { adminConfig } = useData();
    const [stats, setStats] = useState({ total_pi: 0, total_fcfa: 0, total_eur: 0, total_usd: 0 });
    const [loading, setLoading] = useState(false);
    
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);

    const [filters, setFilters] = useState({
        country: 'all',
        city: 'all',
        dateRange: [{
            startDate: addDays(new Date(), -30),
            endDate: new Date(),
            key: 'selection'
        }]
    });

    const eurRate = adminConfig?.currency_eur_rate || 655.957;
    const usdRate = adminConfig?.currency_usd_rate || 610.00;

    const fetchDistinctLocations = useCallback(async () => {
        try {
            const { data: countryData, error: countryError } = await supabase.rpc('get_distinct_countries_from_credits');
            if (countryError) throw countryError;
            setCountries(countryData.map(c => c.country));

            if (filters.country !== 'all') {
                const { data: cityData, error: cityError } = await supabase.rpc('get_distinct_cities_from_credits', { p_country: filters.country });
                if (cityError) throw cityError;
                setCities(cityData.map(c => c.city));
            } else {
                setCities([]);
            }
        } catch (error) {
            toast({ title: "Erreur de filtres", description: "Impossible de charger les localisations.", variant: "destructive" });
        }
    }, [filters.country]);
    
    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from('transactions').select('amount_pi, amount_fcfa')
                .eq('transaction_type', 'manual_credit')
                .gte('created_at', format(filters.dateRange[0].startDate, "yyyy-MM-dd'T'00:00:00"))
                .lte('created_at', format(filters.dateRange[0].endDate, "yyyy-MM-dd'T'23:59:59"));

            if (filters.country !== 'all') {
                query = query.eq('country', filters.country);
            }
            if (filters.city !== 'all') {
                query = query.eq('city', filters.city);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            
            const totalPi = data.reduce((acc, t) => acc + (t.amount_pi || 0), 0);
            const totalFcfa = data.reduce((acc, t) => acc + (t.amount_fcfa || 0), 0);

            setStats({
                total_pi: totalPi,
                total_fcfa: totalFcfa,
                total_eur: totalFcfa / eurRate,
                total_usd: totalFcfa / usdRate,
            });
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de charger les statistiques de crédits.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [filters, eurRate, usdRate]);
    
    useEffect(() => {
        fetchDistinctLocations();
        fetchStats();
    }, [fetchDistinctLocations, fetchStats]);

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'country') {
            newFilters.city = 'all'; // Reset city when country changes
        }
        setFilters(newFilters);
    };

    return (
        <Card className="glass-effect shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3/> Statistiques des Crédits</CardTitle>
                <p className="text-muted-foreground">Chiffre d'affaires généré par les crédits manuels.</p>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4 items-center mb-6 p-4 bg-muted/50 rounded-lg">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto">
                                <Filter className="mr-2 h-4 w-4" />
                                {format(filters.dateRange[0].startDate, "dd/MM/yy")} - {format(filters.dateRange[0].endDate, "dd/MM/yy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <DateRange
                                editableDateInputs={true}
                                onChange={item => handleFilterChange('dateRange', [item.selection])}
                                moveRangeOnFirstSelection={false}
                                ranges={filters.dateRange}
                                locale={fr}
                            />
                        </PopoverContent>
                    </Popover>
                    <Select value={filters.country} onValueChange={(value) => handleFilterChange('country', value)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Pays" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les pays</SelectItem>
                            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     {filters.country !== 'all' && cities.length > 0 && (
                        <Select value={filters.city} onValueChange={(value) => handleFilterChange('city', value)}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Ville" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes les villes</SelectItem>
                                {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={Coins} title="Total Pièces" value={stats.total_pi.toLocaleString()} currency="π" />
                        <StatCard icon={DollarSign} title="Total FCFA" value={stats.total_fcfa.toLocaleString()} currency="FCFA" />
                        <StatCard icon={Euro} title="Total EUR" value={stats.total_eur.toFixed(2)} currency="€" />
                        <StatCard icon={DollarSign} title="Total USD" value={stats.total_usd.toFixed(2)} currency="$" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


const StatCard = ({ icon: Icon, title, value, currency }) => (
    <Card className="bg-muted/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{currency}</p>
        </CardContent>
    </Card>
);

export default CreditStatsTab;