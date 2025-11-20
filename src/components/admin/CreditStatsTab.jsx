import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Coins, Calendar, Globe, MapPin } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays, format } from 'date-fns';

const CreditStatsTab = () => {
    const { adminConfig } = useData();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [dateRange, setDateRange] = useState({
        from: addDays(new Date(), -30),
        to: new Date(),
    });

    const fetchDistinctLocations = useCallback(async () => {
        try {
            const { data: countryData, error: countryError } = await supabase.rpc('get_distinct_countries_from_credits');
            if (countryError) throw countryError;
            setCountries(countryData || []);

            if (selectedCountry) {
                const { data: cityData, error: cityError } = await supabase.rpc('get_distinct_cities_from_credits', { p_country: selectedCountry });
                if (cityError) throw cityError;
                setCities(cityData || []);
            } else {
                setCities([]);
            }
        } catch (error) {
            toast({ title: 'Erreur', description: "Impossible de charger les localisations.", variant: 'destructive' });
        }
    }, [selectedCountry]);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const fromDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : format(addDays(new Date(), -30), 'yyyy-MM-dd');
            const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

            const { data, error } = await supabase.rpc('get_monthly_credit_stats', {
                start_date: fromDate,
                end_date: toDate,
                p_country: selectedCountry || null,
                p_city: selectedCity || null,
            });

            if (error) throw error;
            setStats(data || []);
        } catch (error) {
            toast({ title: 'Erreur', description: "Impossible de charger les statistiques de crédit.", variant: 'destructive' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedCountry, selectedCity]);

    useEffect(() => {
        fetchDistinctLocations();
    }, [fetchDistinctLocations]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const chartData = useMemo(() => {
        return stats.map(stat => ({
            name: new Date(stat.month_start).toLocaleString('default', { month: 'short', year: 'numeric' }),
            Pièces: stat.total_pi,
            FCFA: stat.total_fcfa,
        }));
    }, [stats]);

    const totals = useMemo(() => {
        return stats.reduce((acc, curr) => {
            acc.pi += Number(curr.total_pi);
            acc.fcfa += Number(curr.total_fcfa);
            return acc;
        }, { pi: 0, fcfa: 0 });
    }, [stats]);
    
    const formatCurrency = (value, currency) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const eurRate = adminConfig?.currency_eur_rate || 655;
    const usdRate = adminConfig?.currency_usd_rate || 600;
    const totalEur = totals.fcfa / eurRate;
    const totalUsd = totals.fcfa / usdRate;

    return (
        <div className="space-y-6">
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart className="w-6 h-6" />
                        Statistiques des Crédits Manuels
                    </CardTitle>
                    <CardDescription>
                        Visualisez le chiffre d'affaires généré par les crédits manuels par zone.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                        <Select value={selectedCountry} onValueChange={value => { setSelectedCountry(value); setSelectedCity(''); }}>
                            <SelectTrigger><Globe className="w-4 h-4 mr-2" />{selectedCountry || 'Tous les pays'}</SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tous les pays</SelectItem>
                                {countries.map(c => <SelectItem key={c.country} value={c.country}>{c.country}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedCountry}>
                            <SelectTrigger><MapPin className="w-4 h-4 mr-2" />{selectedCity || 'Toutes les villes'}</SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Toutes les villes</SelectItem>
                                {cities.map(c => <SelectItem key={c.city} value={c.city}>{c.city}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pièces</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totals.pi.toLocaleString('fr-FR')} π</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total FCFA</CardTitle>
                        <span className="text-muted-foreground font-bold">XOF</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totals.fcfa, 'XOF').replace('XOF', '')}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total EUR</CardTitle>
                         <span className="text-muted-foreground font-bold">EUR</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalEur, 'EUR').replace('€', '')}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total USD</CardTitle>
                         <span className="text-muted-foreground font-bold">USD</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalUsd, 'USD').replace('$', '')}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
                    ) : (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Pièces (π)', angle: -90, position: 'insideLeft' }}/>
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'FCFA', angle: -90, position: 'insideRight' }} />
                                <Tooltip formatter={(value, name) => [value.toLocaleString('fr-FR'), name]} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="Pièces" fill="#8884d8" />
                                <Bar yAxisId="right" dataKey="FCFA" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CreditStatsTab;