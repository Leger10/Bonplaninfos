import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Plus, Ticket, Trash, Coins, Calendar, MapPin, Users, Settings, Image as ImageIcon, Crown, Sparkles, Star } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const CreateTicketingEventPage = () => {
    const { user } = useAuth();
    const { adminConfig } = useData();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [step, setStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState('custom');

    // Taux de conversion
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
    const [maxAttendees, setMaxAttendees] = useState(100);
    const [isPublic, setIsPublic] = useState(true);
    const [requiresApproval, setRequiresApproval] = useState(false);

    // Templates de billets prédéfinis
    const ticketTemplates = {
        standard: [
            {
                id: uuidv4(),
                name: 'Standard',
                price: 5000,
                presale_price: 3000,
                base_currency: 'XOF',
                quantity_available: 100,
                sales_start_date: '',
                sales_end_date: '',
                description: 'Accès simple à l\'événement',
                benefits: ['Accès à l\'événement', 'Place standard']
            },
            {
                id: uuidv4(),
                name: 'VIP',
                price: 15000,
                presale_price: 10000,
                base_currency: 'XOF',
                quantity_available: 50,
                sales_start_date: '',
                sales_end_date: '',
                description: 'Accès privilégié avec avantages exclusifs',
                benefits: ['Accès VIP', 'Zone réservée', 'Rafraîchissements offerts', 'Rencontre avec les artistes']
            }
        ],
        concert: [
            {
                id: uuidv4(),
                name: 'Early Bird',
                price: 8000,
                presale_price: 5000,
                base_currency: 'XOF',
                quantity_available: 30,
                sales_start_date: '',
                sales_end_date: '',
                description: 'Billet prévente à prix réduit',
                benefits: ['Accès au concert', 'Place numérotée', 'Tarif early bird']
            },
            {
                id: uuidv4(),
                name: 'Standard',
                price: 10000,
                presale_price: 7000,
                base_currency: 'XOF',
                quantity_available: 100,
                sales_start_date: '',
                sales_end_date: '',
                description: 'Accès standard au concert',
                benefits: ['Accès au concert', 'Place standard']
            },
            {
                id: uuidv4(),
                name: 'Gold',
                price: 20000,
                presale_price: 15000,
                base_currency: 'XOF',
                quantity_available: 20,
                sales_start_date: '',
                sales_end_date: '',
                description: 'Expérience concert premium',
                benefits: ['Place Gold', 'Accès backstage', 'Goodies exclusifs', 'Rencontre artistes']
            }
        ],
        conference: [
            {
                id: uuidv4(),
                name: 'Étudiant',
                price: 3000,
                presale_price: 2000,
                base_currency: 'XOF',
                quantity_available: 50,
                sales_start_date: '',
                sales_end_date: '',
                description: 'Tarif spécial étudiant',
                benefits: ['Accès conférence', 'Support digital', 'Carte étudiante requise']
            },
            {
                id: uuidv4(),
                name: 'Standard',
                price: 8000,
                presale_price: 5000,
                base_currency: 'XOF',
                quantity_available: 100,
                sales_start_date: '',
                sales_end_date: '',
                description: 'Accès complet à la conférence',
                benefits: ['Accès conférence', 'Support digital', 'Certificat de participation']
            },
            {
                id: uuidv4(),
                name: 'Premium',
                price: 15000,
                presale_price: 12000,
                base_currency: 'XOF',
                quantity_available: 30,
                sales_start_date: '',
                sales_end_date: '',
                description: 'Package conférence complet',
                benefits: ['Accès conférence', 'Déjeuner inclus', 'Rencontre speakers', 'Goodies premium']
            }
        ]
    };

    // Ticketing Details
    const [ticketTypes, setTicketTypes] = useState([{ 
        id: uuidv4(), 
        name: 'Standard', 
        price: 5000,
        presale_price: 3000,
        base_currency: 'XOF',
        quantity_available: 100, 
        sales_start_date: '', 
        sales_end_date: '',
        description: 'Accès simple à l\'événement',
        benefits: ['Accès à l\'événement']
    }]);

    // Coûts prévus
    const [plannedCosts, setPlannedCosts] = useState([{
        id: uuidv4(),
        name: 'Location salle',
        amount: 50000,
        currency: 'XOF',
        category: 'venue'
    }]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('event_categories').select('*');
            if (error) console.error('Error fetching categories:', error);
            else setCategories(data);
        };
        fetchCategories();
    }, []);

    // Appliquer un template
    const applyTemplate = (templateKey) => {
        setSelectedTemplate(templateKey);
        if (templateKey !== 'custom') {
            setTicketTypes(ticketTemplates[templateKey].map(ticket => ({
                ...ticket,
                id: uuidv4() // Regénérer les IDs
            })));
        }
    };

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

    const handleTicketTypeChange = (id, field, value) => {
        setTicketTypes(ticketTypes.map(tt => tt.id === id ? { ...tt, [field]: value } : tt));
    };

    const addTicketType = () => {
        setTicketTypes([...ticketTypes, { 
            id: uuidv4(), 
            name: '', 
            price: 0,
            presale_price: 0,
            base_currency: 'XOF',
            quantity_available: 50, 
            sales_start_date: '', 
            sales_end_date: '',
            description: '',
            benefits: []
        }]);
    };

    const removeTicketType = (id) => {
        setTicketTypes(ticketTypes.filter(tt => tt.id !== id));
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
    const potentialRevenueInCoins = ticketTypes.reduce((total, ticket) => {
        const ticketRevenue = ticket.price * ticket.quantity_available;
        return total + convertToCoins(ticketRevenue, ticket.base_currency);
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
                    event_type: 'ticketing',
                    category_id: categoryId,
                    status: 'draft',
                    max_attendees: maxAttendees,
                    is_public: isPublic,
                    requires_approval: requiresApproval
                })
                .select()
                .single();

            if (eventError) throw eventError;

            const newEventId = eventData.id;

            // 2. Create Ticketing Event
            const { data: ticketingEventData, error: ticketingError } = await supabase
                .from('ticketing_events')
                .insert({
                    event_id: newEventId,
                    total_tickets: ticketTypes.reduce((acc, tt) => acc + parseInt(tt.quantity_available, 10), 0),
                    tickets_sold: 0,
                }).select().single();
            if (ticketingError) throw ticketingError;
            
            // 3. Insert event_settings
            const { error: settingsError } = await supabase
                .from('event_settings')
                .insert({
                    event_id: newEventId,
                    ticketing_enabled: true,
                });
            if (settingsError) throw settingsError;

            // 4. Create Ticket Types
            const ticketTypesToInsert = ticketTypes.map(tt => ({
                ...tt,
                event_id: newEventId,
            }));
            const { error: ticketTypesError } = await supabase.from('ticket_types').insert(ticketTypesToInsert);
            if (ticketTypesError) throw ticketTypesError;
            
            toast({ title: 'Succès', description: 'Événement de billetterie créé avec succès!' });
            navigate(`/event/${newEventId}`);

        } catch (error) {
            console.error('Error creating ticketing event:', error);
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const CurrencyDisplay = ({ amount, currency, className = "", label = "" }) => (
        <div className={`space-y-1 ${className}`}>
            {label && <div className="text-xs font-medium text-muted-foreground">{label}</div>}
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

    const PriceComparison = ({ presalePrice, basePrice, currency }) => (
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <CurrencyDisplay 
                amount={presalePrice} 
                currency={currency} 
                label="Prévente"
                className="text-center"
            />
            <CurrencyDisplay 
                amount={basePrice} 
                currency={currency} 
                label="Jour J"
                className="text-center"
            />
        </div>
    );

    const formPart1 = (
        <>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Titre de l'événement *</Label>
                        <Input 
                            id="title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="Ex: Concert de Jazz en Plein Air"
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
                        placeholder="Décrivez votre événement, le programme, les artistes..."
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
                        <Label htmlFor="maxAttendees">Nombre maximum de participants</Label>
                        <Input 
                            id="maxAttendees" 
                            type="number" 
                            value={maxAttendees} 
                            onChange={(e) => setMaxAttendees(e.target.value)} 
                            min="1"
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
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
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="requiresApproval">Validation requise</Label>
                                <div className="text-sm text-muted-foreground">
                                    Approuver chaque participant
                                </div>
                            </div>
                            <Switch 
                                id="requiresApproval"
                                checked={requiresApproval}
                                onCheckedChange={setRequiresApproval}
                            />
                        </div>
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
            <Tabs defaultValue="tickets" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tickets">Types de Billets</TabsTrigger>
                    <TabsTrigger value="costs">Coûts Prévus</TabsTrigger>
                </TabsList>

                <TabsContent value="tickets" className="space-y-6">
                    {/* Sélection de template */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Modèles de billets prédéfinis</CardTitle>
                            <CardDescription>
                                Choisissez un modèle ou créez vos propres types de billets
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={selectedTemplate} onValueChange={applyTemplate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <RadioGroupItem value="custom" id="custom" className="sr-only" />
                                    <Label
                                        htmlFor="custom"
                                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${
                                            selectedTemplate === 'custom' ? 'border-primary' : ''
                                        }`}
                                    >
                                        <Sparkles className="mb-3 h-6 w-6" />
                                        <span className="text-sm font-medium">Personnalisé</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="standard" id="standard" className="sr-only" />
                                    <Label
                                        htmlFor="standard"
                                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${
                                            selectedTemplate === 'standard' ? 'border-primary' : ''
                                        }`}
                                    >
                                        <Ticket className="mb-3 h-6 w-6" />
                                        <span className="text-sm font-medium">Standard</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="concert" id="concert" className="sr-only" />
                                    <Label
                                        htmlFor="concert"
                                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${
                                            selectedTemplate === 'concert' ? 'border-primary' : ''
                                        }`}
                                    >
                                        <Crown className="mb-3 h-6 w-6" />
                                        <span className="text-sm font-medium">Concert</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="conference" id="conference" className="sr-only" />
                                    <Label
                                        htmlFor="conference"
                                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground ${
                                            selectedTemplate === 'conference' ? 'border-primary' : ''
                                        }`}
                                    >
                                        <Star className="mb-3 h-6 w-6" />
                                        <span className="text-sm font-medium">Conférence</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {ticketTypes.map((tt) => (
                            <Card key={tt.id} className="bg-card/50">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <Input 
                                                    placeholder="Nom du type de billet (ex: VIP)" 
                                                    value={tt.name} 
                                                    onChange={e => handleTicketTypeChange(tt.id, 'name', e.target.value)} 
                                                    className="text-lg font-bold flex-grow"
                                                />
                                                {ticketTypes.length > 1 && (
                                                    <Button variant="ghost" size="icon" onClick={() => removeTicketType(tt.id)}>
                                                        <Trash className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Prix du billet</Label>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium flex items-center gap-2">
                                                                <Badge variant="outline" className="text-green-600">Prévente</Badge>
                                                                Prix avant l'événement
                                                            </div>
                                                            <Input 
                                                                type="number" 
                                                                value={tt.presale_price} 
                                                                onChange={e => handleTicketTypeChange(tt.id, 'presale_price', e.target.value)}
                                                                placeholder="Prix prévente"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium flex items-center gap-2">
                                                                <Badge variant="outline" className="text-orange-600">Jour J</Badge>
                                                                Prix le jour de l'événement
                                                            </div>
                                                            <Input 
                                                                type="number" 
                                                                value={tt.price} 
                                                                onChange={e => handleTicketTypeChange(tt.id, 'price', e.target.value)}
                                                                placeholder="Prix jour J"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label>Quantité disponible</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={tt.quantity_available} 
                                                        onChange={e => handleTicketTypeChange(tt.id, 'quantity_available', e.target.value)} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Début des ventes</Label>
                                                    <Input 
                                                        type="datetime-local" 
                                                        value={tt.sales_start_date} 
                                                        onChange={e => handleTicketTypeChange(tt.id, 'sales_start_date', e.target.value)} 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Fin des ventes</Label>
                                                    <Input 
                                                        type="datetime-local" 
                                                        value={tt.sales_end_date} 
                                                        onChange={e => handleTicketTypeChange(tt.id, 'sales_end_date', e.target.value)} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Description du billet</Label>
                                                <Textarea 
                                                    value={tt.description} 
                                                    onChange={e => handleTicketTypeChange(tt.id, 'description', e.target.value)}
                                                    placeholder="Décrivez les avantages de ce type de billet..."
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Affichage des prix convertis avec comparaison prévente/jour J */}
                                    <Card className="bg-muted/50">
                                        <CardContent className="p-4 space-y-4">
                                            <div className="text-sm font-medium">Comparaison des prix</div>
                                            <PriceComparison 
                                                presalePrice={tt.presale_price}
                                                basePrice={tt.price}
                                                currency={tt.base_currency}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-2 border-t">
                                                <CurrencyDisplay 
                                                    amount={tt.base_currency === 'XOF' ? tt.presale_price : convertCurrency(tt.presale_price, tt.base_currency, 'XOF')} 
                                                    currency="XOF" 
                                                    label="Prévente FCFA"
                                                />
                                                <CurrencyDisplay 
                                                    amount={tt.base_currency === 'USD' ? tt.presale_price : convertCurrency(tt.presale_price, tt.base_currency, 'USD')} 
                                                    currency="USD" 
                                                    label="Prévente USD"
                                                />
                                                <CurrencyDisplay 
                                                    amount={tt.base_currency === 'EUR' ? tt.presale_price : convertCurrency(tt.presale_price, tt.base_currency, 'EUR')} 
                                                    currency="EUR" 
                                                    label="Prévente EUR"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    
                    <Button variant="outline" onClick={addTicketType} className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un type de billet
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
                                    <span>Total en pièces (prix jour J):</span>
                                    <Badge variant="secondary" className="text-lg">
                                        {potentialRevenueInCoins} pièces
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Basé sur la vente de tous les billets disponibles au prix jour J
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="costs" className="space-y-6">
                    {/* ... (le contenu des coûts reste identique) */}
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
                                                    placeholder="Ex: Artistes, Sonorisation..."
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
                                                        <SelectItem value="venue">Location salle</SelectItem>
                                                        <SelectItem value="artists">Artistes</SelectItem>
                                                        <SelectItem value="equipment">Équipement</SelectItem>
                                                        <SelectItem value="marketing">Marketing</SelectItem>
                                                        <SelectItem value="personnel">Personnel</SelectItem>
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
                        <Ticket className="w-4 h-4 mr-2" />
                    )} 
                    Créer l'événement
                </Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Helmet>
                <title>Créer un Événement Billetterie - BonPlanInfos</title>
                <meta name="description" content="Créez et configurez votre événement de billetterie avec système de pièces." />
            </Helmet>
            <main className="container mx-auto max-w-6xl px-4 py-8">
                <Card className="glass-effect">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold font-heading flex items-center justify-center">
                            <Ticket className="w-8 h-8 mr-3 text-primary"/>
                            Créer un événement de billetterie
                        </CardTitle>
                        <CardDescription className="text-lg">
                            {step === 1 ? "Détails de base de votre événement" : "Configurez les billets et les coûts de votre événement"}
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

export default CreateTicketingEventPage;