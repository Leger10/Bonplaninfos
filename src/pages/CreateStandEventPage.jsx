import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Store, Plus, Trash, Coins, Calendar, MapPin, Users, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const CreateStandEventPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [step, setStep] = useState(1);

    // Taux de conversion (exemple)
    const conversionRates = {
        XOF: { USD: 0.0017, EUR: 0.0021, XOF: 1 },
        USD: { XOF: 555, EUR: 0.55, USD: 1 },
        EUR: { XOF: 655, USD: 1.18, EUR: 1 }
    };

    // Prix en pièces (1€ = 100 pièces, 1$ = 85 pièces, 1000 FCFA = 150 pièces)
    const coinConversion = {
        XOF: 0.10, // 1000 FCFA = 150 pièces
        EUR: 80,   // 1€ = 100 pièces
        USD: 65     // 1$ = 85 pièces
    };

    // Event Details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [address, setAddress] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [maxParticipants, setMaxParticipants] = useState(100);
    const [isPublic, setIsPublic] = useState(true);
    
    // Stand Details
    const [standTypes, setStandTypes] = useState([{ 
        id: uuidv4(), 
        name: 'Standard', 
        base_price: 15000, 
        base_currency: 'XOF',
        quantity_available: 20,
        description: '',
        size: '3x3m',
        includes: ['Table', '2 chaises', 'Éclairage basique']
    }]);

    // Coûts prévus
    const [plannedCosts, setPlannedCosts] = useState([{
        id: uuidv4(),
        name: 'Logistique',
        amount: 50000,
        currency: 'XOF',
        category: 'logistics'
    }]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('event_categories').select('*');
            if (error) console.error('Error fetching categories:', error);
            else setCategories(data);
        };
        fetchCategories();
    }, []);

    // Fonctions de conversion
    const convertCurrency = (amount, fromCurrency, toCurrency) => {
        if (fromCurrency === toCurrency) return amount;
        const rate = conversionRates[fromCurrency]?.[toCurrency];
        return rate ? Math.round(amount * rate) : amount;
    };

    const convertToCoins = (amount, currency) => {
        const rate = coinConversion[currency];
        return rate ? Math.round(amount * rate) : amount;
    };

    const formatCurrency = (amount, currency) => {
        const formatter = new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency === 'XOF' ? 'XOF' : currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return formatter.format(amount);
    };

    const handleStandTypeChange = (id, field, value) => {
        setStandTypes(standTypes.map(st => st.id === id ? { ...st, [field]: value } : st));
    };

    const addStandType = () => {
        setStandTypes([...standTypes, { 
            id: uuidv4(), 
            name: '', 
            base_price: 0, 
            base_currency: 'XOF',
            quantity_available: 10,
            description: '',
            size: '3x3m',
            includes: []
        }]);
    };
    
    const removeStandType = (id) => {
        setStandTypes(standTypes.filter(st => st.id !== id));
    };

    const handleCostChange = (id, field, value) => {
        setPlannedCosts(plannedCosts.map(cost => cost.id === id ? { ...cost, [field]: value } : cost));
    };

    const addPlannedCost = () => {
        setPlannedCosts([...plannedCosts, {
            id: uuidv4(),
            name: '',
            amount: 0,
            currency: 'XOF',
            category: 'other'
        }]);
    };

    const removePlannedCost = (id) => {
        setPlannedCosts(plannedCosts.filter(cost => cost.id !== id));
    };

    // Calcul du total des coûts en pièces
    const totalCostInCoins = plannedCosts.reduce((total, cost) => {
        return total + convertToCoins(cost.amount, cost.currency);
    }, 0);

    // Calcul des revenus potentiels en pièces
    const potentialRevenueInCoins = standTypes.reduce((total, stand) => {
        const standRevenue = stand.base_price * stand.quantity_available;
        return total + convertToCoins(standRevenue, stand.base_currency);
    }, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'Erreur', description: 'Vous devez être connecté.', variant: 'destructive' });
            return;
        }
        setLoading(true);

        try {
            // 1. Create Event
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .insert({
                    title, 
                    description, 
                    event_date: eventDate,
                    end_date: endDate,
                    city, 
                    country, 
                    address,
                    organizer_id: user.id, 
                    event_type: 'stand_rental', 
                    category_id: categoryId, 
                    status: 'active',
                    max_participants: maxParticipants,
                    is_public: isPublic
                }).select().single();

            if (eventError) throw eventError;
            const newEventId = eventData.id;

            // 2. Create Stand Event
            const { data: standEventData, error: standEventError } = await supabase
                .from('stand_events').insert({ event_id: newEventId }).select().single();
            if (standEventError) throw standEventError;
            const standEventId = standEventData.id;

            // 3. Insert event_settings
            const { error: settingsError } = await supabase
                .from('event_settings')
                .insert({
                    event_id: newEventId,
                    stands_enabled: true,
                    currency_display: true,
                    coin_system: true
                });
            if (settingsError) throw settingsError;

            // 4. Create Stand Types
            const standTypesToInsert = standTypes.map(st => ({
                ...st,
                stand_event_id: standEventId,
                event_id: newEventId,
            }));
            const { error: standTypesError } = await supabase.from('stand_types').insert(standTypesToInsert);
            if (standTypesError) throw standTypesError;

            // 5. Create Planned Costs
            const costsToInsert = plannedCosts.map(cost => ({
                ...cost,
                event_id: newEventId,
                coin_value: convertToCoins(cost.amount, cost.currency)
            }));
            const { error: costsError } = await supabase.from('event_planned_costs').insert(costsToInsert);
            if (costsError) throw costsError;
            
            toast({ title: 'Succès', description: 'Événement de location de stands créé avec succès!' });
            navigate(`/event/${newEventId}`);

        } catch (error) {
            console.error('Error creating stand event:', error);
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const CurrencyDisplay = ({ amount, currency, className = "" }) => (
        <div className={`space-y-1 ${className}`}>
            <div className="font-semibold">{formatCurrency(amount, currency)}</div>
            <div className="text-sm text-muted-foreground space-y-1">
                <div>USD: {formatCurrency(convertCurrency(amount, currency, 'USD'), 'USD')}</div>
                <div>EUR: {formatCurrency(convertCurrency(amount, currency, 'EUR'), 'EUR')}</div>
                <div className="flex items-center gap-1 text-primary font-medium">
                    <Coins className="w-3 h-3" />
                    {convertToCoins(amount, currency)} pièces
                </div>
            </div>
        </div>
    );

    const formPart1 = (
        <>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Titre du salon/foire *</Label>
                        <Input 
                            id="title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="Ex: Salon International de l'Agriculture"
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Catégorie *</Label>
                        <Select onValueChange={setCategoryId} value={categoryId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                        id="description" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Décrivez votre événement, les objectifs, les participants attendus..."
                        rows={4}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="eventDate">Date et heure de début *</Label>
                        <Input 
                            id="eventDate" 
                            type="datetime-local" 
                            value={eventDate} 
                            onChange={(e) => setEventDate(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="endDate">Date et heure de fin</Label>
                        <Input 
                            id="endDate" 
                            type="datetime-local" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="country">Pays *</Label>
                        <Input 
                            id="country" 
                            value={country} 
                            onChange={(e) => setCountry(e.target.value)} 
                            placeholder="Ex: Côte d'Ivoire"
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">Ville *</Label>
                        <Input 
                            id="city" 
                            value={city} 
                            onChange={(e) => setCity(e.target.value)} 
                            placeholder="Ex: Abidjan"
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Adresse</Label>
                        <Input 
                            id="address" 
                            value={address} 
                            onChange={(e) => setAddress(e.target.value)} 
                            placeholder="Adresse complète"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="maxParticipants">Nombre maximum de participants</Label>
                        <Input 
                            id="maxParticipants" 
                            type="number" 
                            value={maxParticipants} 
                            onChange={(e) => setMaxParticipants(e.target.value)} 
                            min="1"
                        />
                    </div>
                    <div className="flex items-center justify-between space-y-0 pt-6">
                        <div className="space-y-0.5">
                            <Label htmlFor="isPublic">Événement public</Label>
                            <div className="text-sm text-muted-foreground">
                                Visible par tous les utilisateurs
                            </div>
                        </div>
                        <Switch 
                            id="isPublic"
                            checked={isPublic}
                            onCheckedChange={setIsPublic}
                        />
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-8">
                <Button onClick={() => setStep(2)} size="lg">
                    Suivant
                </Button>
            </div>
        </>
    );

    const formPart2 = (
        <>
            <Tabs defaultValue="stands" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="stands">Types de Stands</TabsTrigger>
                    <TabsTrigger value="costs">Coûts Prévus</TabsTrigger>
                </TabsList>

                <TabsContent value="stands" className="space-y-6">
                    <div className="space-y-4">
                        {standTypes.map((st) => (
                            <Card key={st.id} className="bg-card/50">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <Input 
                                                    placeholder="Nom du type de stand (ex: Premium)" 
                                                    value={st.name} 
                                                    onChange={e => handleStandTypeChange(st.id, 'name', e.target.value)} 
                                                    className="text-lg font-bold flex-grow"
                                                />
                                                {standTypes.length > 1 && (
                                                    <Button variant="ghost" size="icon" onClick={() => removeStandType(st.id)}>
                                                        <Trash className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Prix de location</Label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium">FCFA</div>
                                                            <Input 
                                                                type="number" 
                                                                value={st.base_currency === 'XOF' ? st.base_price : convertCurrency(st.base_price, st.base_currency, 'XOF')}
                                                                onChange={e => handleStandTypeChange(st.id, 'base_price', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium">USD</div>
                                                            <Input 
                                                                type="number" 
                                                                value={st.base_currency === 'USD' ? st.base_price : convertCurrency(st.base_price, st.base_currency, 'USD')}
                                                                onChange={e => handleStandTypeChange(st.id, 'base_price', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium">EUR</div>
                                                            <Input 
                                                                type="number" 
                                                                value={st.base_currency === 'EUR' ? st.base_price : convertCurrency(st.base_price, st.base_currency, 'EUR')}
                                                                onChange={e => handleStandTypeChange(st.id, 'base_price', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label>Quantité disponible</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={st.quantity_available} 
                                                        onChange={e => handleStandTypeChange(st.id, 'quantity_available', e.target.value)} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Description du stand</Label>
                                                <Textarea 
                                                    value={st.description} 
                                                    onChange={e => handleStandTypeChange(st.id, 'description', e.target.value)}
                                                    placeholder="Décrivez les caractéristiques de ce type de stand..."
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Affichage des prix convertis */}
                                    <Card className="bg-muted/50">
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <CurrencyDisplay 
                                                    amount={st.base_currency === 'XOF' ? st.base_price : convertCurrency(st.base_price, st.base_currency, 'XOF')} 
                                                    currency="XOF" 
                                                />
                                                <CurrencyDisplay 
                                                    amount={st.base_currency === 'USD' ? st.base_price : convertCurrency(st.base_price, st.base_currency, 'USD')} 
                                                    currency="USD" 
                                                />
                                                <CurrencyDisplay 
                                                    amount={st.base_currency === 'EUR' ? st.base_price : convertCurrency(st.base_price, st.base_currency, 'EUR')} 
                                                    currency="EUR" 
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    
                    <Button variant="outline" onClick={addStandType} className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un type de stand
                    </Button>

                    {/* Résumé des revenus potentiels */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Coins className="w-5 h-5" />
                                Revenus Potentiels
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Total en pièces:</span>
                                    <Badge variant="secondary" className="text-lg">
                                        {potentialRevenueInCoins} pièces
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Basé sur la vente de tous les stands disponibles
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="costs" className="space-y-6">
                    <div className="space-y-4">
                        {plannedCosts.map((cost) => (
                            <Card key={cost.id} className="bg-card/50">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Nom du coût</Label>
                                                <Input 
                                                    value={cost.name} 
                                                    onChange={e => handleCostChange(cost.id, 'name', e.target.value)}
                                                    placeholder="Ex: Location salle, Marketing..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Catégorie</Label>
                                                <Select 
                                                    value={cost.category} 
                                                    onValueChange={value => handleCostChange(cost.id, 'category', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="logistics">Logistique</SelectItem>
                                                        <SelectItem value="marketing">Marketing</SelectItem>
                                                        <SelectItem value="personnel">Personnel</SelectItem>
                                                        <SelectItem value="materials">Matériels</SelectItem>
                                                        <SelectItem value="other">Autre</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Montant</Label>
                                                <Input 
                                                    type="number" 
                                                    value={cost.amount} 
                                                    onChange={e => handleCostChange(cost.id, 'amount', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Devise</Label>
                                                <Select 
                                                    value={cost.currency} 
                                                    onValueChange={value => handleCostChange(cost.id, 'currency', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="XOF">FCFA</SelectItem>
                                                        <SelectItem value="USD">USD</SelectItem>
                                                        <SelectItem value="EUR">EUR</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        {plannedCosts.length > 1 && (
                                            <Button variant="ghost" size="icon" onClick={() => removePlannedCost(cost.id)} className="ml-4">
                                                <Trash className="w-4 h-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {/* Affichage de la conversion */}
                                    <Card className="bg-muted/50">
                                        <CardContent className="p-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Équivalent en pièces:</span>
                                                <Badge>
                                                    <Coins className="w-3 h-3 mr-1" />
                                                    {convertToCoins(cost.amount, cost.currency)} pièces
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Button variant="outline" onClick={addPlannedCost} className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un coût prévu
                    </Button>

                    {/* Résumé des coûts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                Résumé des Coûts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span>Total des coûts en pièces:</span>
                                    <Badge variant="destructive" className="text-lg">
                                        {totalCostInCoins} pièces
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span>Bénéfice potentiel net:</span>
                                    <Badge variant={potentialRevenueInCoins - totalCostInCoins >= 0 ? "default" : "destructive"}>
                                        {potentialRevenueInCoins - totalCostInCoins} pièces
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(1)}>
                    Précédent
                </Button>
                <Button onClick={handleSubmit} disabled={loading} size="lg">
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Store className="w-4 h-4 mr-2" />
                    )} 
                    Créer l'événement
                </Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Helmet>
                <title>Créer un Événement Salon/Foire - BonPlanInfos</title>
            </Helmet>
            <main className="container mx-auto max-w-6xl px-4 py-8">
                <Card className="glass-effect">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold font-heading flex items-center justify-center">
                            <Store className="w-8 h-8 mr-3 text-primary"/>
                            Créer un événement de location de stands
                        </CardTitle>
                        <CardDescription className="text-lg">
                            {step === 1 ? "Détails de base de votre salon ou foire" : "Configurez les stands et les coûts de votre événement"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`flex-1 text-center p-3 rounded-lg transition-all ${
                                step === 1 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted'
                            }`}>
                                <div className="flex items-center justify-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Étape 1: Détails
                                </div>
                            </div>
                            <div className="flex-1 border-t-2 border-dashed border-muted-foreground/20"></div>
                            <div className={`flex-1 text-center p-3 rounded-lg transition-all ${
                                step === 2 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted'
                            }`}>
                                <div className="flex items-center justify-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Étape 2: Configuration
                                </div>
                            </div>
                        </div>
                        
                        <form className="space-y-6">
                            {step === 1 ? formPart1 : formPart2}
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default CreateStandEventPage;