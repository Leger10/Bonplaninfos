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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Vote, Plus, Trash, User, Coins, Calendar, MapPin, Users, Settings, Award, Crown, Star } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const CreateVotingEventPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [step, setStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState('custom');

    // Taux de conversion pour l'affichage
    const conversionRates = {
        XOF: { USD: 0.0017, EUR: 0.0015, XOF: 1 },
        USD: { XOF: 590, EUR: 0.85, USD: 1 },
        EUR: { XOF: 655, USD: 1.18, EUR: 1 }
    };

    // Prix en pièces
    const coinConversion = {
        XOF: 0.15,
        EUR: 100,
        USD: 85
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
    const [isPublic, setIsPublic] = useState(true);
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [maxVotesPerUser, setMaxVotesPerUser] = useState(1);
    const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);

    // Voting Details
    const [votePricePi, setVotePricePi] = useState(1);
    const [votePriceXOF, setVotePriceXOF] = useState(7); // 1 pièce = ~7 FCFA
    const [voteCurrency, setVoteCurrency] = useState('XOF');
    const [votingType, setVotingType] = useState('paid');
    const [candidates, setCandidates] = useState([{ 
        id: uuidv4(), 
        name: '', 
        description: '',
        image: null,
        category: ''
    }]);

    // Coûts prévus
    const [plannedCosts, setPlannedCosts] = useState([{
        id: uuidv4(),
        name: 'Prix du gagnant',
        amount: 50000,
        currency: 'XOF',
        category: 'prize'
    }]);

    // Templates de concours prédéfinis
    const votingTemplates = {
        talent: [
            {
                id: uuidv4(),
                name: 'Meilleur Artiste',
                description: 'Artiste talentueux en compétition',
                category: 'art'
            },
            {
                id: uuidv4(),
                name: 'Meilleur Chanteur',
                description: 'Voix exceptionnelle en compétition',
                category: 'music'
            },
            {
                id: uuidv4(),
                name: 'Meilleur Danseur',
                description: 'Talentueux danseur en compétition',
                category: 'dance'
            }
        ],
        miss: [
            {
                id: uuidv4(),
                name: 'Candidate 1',
                description: 'Candidate au concours de beauté',
                category: 'beauty'
            },
            {
                id: uuidv4(),
                name: 'Candidate 2',
                description: 'Candidate au concours de beauté',
                category: 'beauty'
            },
            {
                id: uuidv4(),
                name: 'Candidate 3',
                description: 'Candidate au concours de beauté',
                category: 'beauty'
            }
        ],
        business: [
            {
                id: uuidv4(),
                name: 'Startup Innovante',
                description: 'Jeune entreprise prometteuse',
                category: 'startup'
            },
            {
                id: uuidv4(),
                name: 'Projet Social',
                description: 'Initiative à impact social',
                category: 'social'
            },
            {
                id: uuidv4(),
                name: 'Innovation Tech',
                description: 'Solution technologique innovante',
                category: 'technology'
            }
        ]
    };

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
            setCandidates(votingTemplates[templateKey].map(candidate => ({
                ...candidate,
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

    // Mise à jour du prix du vote
    useEffect(() => {
        if (votingType === 'paid') {
            if (voteCurrency === 'XOF') {
                setVotePricePi(convertToCoins(votePriceXOF, 'XOF'));
            } else if (voteCurrency === 'USD') {
                setVotePricePi(convertToCoins(votePriceXOF, 'USD'));
            } else if (voteCurrency === 'EUR') {
                setVotePricePi(convertToCoins(votePriceXOF, 'EUR'));
            }
        } else {
            setVotePricePi(0);
        }
    }, [votePriceXOF, voteCurrency, votingType]);

    const handleCandidateChange = (id, field, value) => {
        setCandidates(candidates.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const addCandidate = () => {
        setCandidates([...candidates, { 
            id: uuidv4(), 
            name: '', 
            description: '',
            image: null,
            category: ''
        }]);
    };

    const removeCandidate = (id) => {
        setCandidates(candidates.filter(c => c.id !== id));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'Erreur', description: 'Vous devez être connecté.', variant: 'destructive' });
            return;
        }
        if (candidates.length < 2) {
            toast({ title: 'Erreur', description: 'Ajoutez au moins 2 candidats.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
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
                    event_type: 'voting', 
                    category_id: categoryId, 
                    status: 'active',
                    is_public: isPublic,
                    requires_approval: requiresApproval
                })
                .select()
                .single();

            if (eventError) throw eventError;

            const newEventId = eventData.id;

            const { error: settingsError } = await supabase.from('event_settings').insert({
                event_id: newEventId,
                vote_price_pi: votePricePi,
                voting_enabled: true,
                max_votes_per_user: maxVotesPerUser,
                allow_multiple_votes: allowMultipleVotes,
                voting_type: votingType
            });
            if (settingsError) throw settingsError;

            const candidatesToInsert = candidates.map(c => ({
                event_id: newEventId,
                name: c.name,
                description: c.description,
                category: c.category
            }));
            const { error: candidatesError } = await supabase.from('candidates').insert(candidatesToInsert);
            if (candidatesError) throw candidatesError;

            // Create Planned Costs
            const costsToInsert = plannedCosts.map(cost => ({
                ...cost,
                event_id: newEventId,
                coin_value: convertToCoins(cost.amount, cost.currency)
            }));
            const { error: costsError } = await supabase.from('event_planned_costs').insert(costsToInsert);
            if (costsError) throw costsError;

            toast({ title: 'Succès', description: 'Concours de vote créé avec succès!' });
            navigate(`/event/${newEventId}`);

        } catch (error) {
            console.error('Error creating voting event:', error);
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

    const formPart1 = (
        <>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Titre du concours *</Label>
                        <Input 
                            id="title" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            placeholder="Ex: Concours du Meilleur Artiste 2024"
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
                    <Label htmlFor="description">Description du concours</Label>
                    <Textarea 
                        id="description" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Décrivez le concours, les règles, les prix..."
                        rows={4}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="eventDate">Date de début des votes *</Label>
                        <Input 
                            id="eventDate" 
                            type="datetime-local" 
                            value={eventDate} 
                            onChange={(e) => setEventDate(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="endDate">Date de fin des votes *</Label>
                        <Input 
                            id="endDate" 
                            type="datetime-local" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            required 
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
                        <Label htmlFor="address">Lieu (si applicable)</Label>
                        <Input 
                            id="address" 
                            value={address} 
                            onChange={(e) => setAddress(e.target.value)} 
                            placeholder="Lieu de la remise des prix"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Type de vote</Label>
                            <Select value={votingType} onValueChange={setVotingType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">Vote payant</SelectItem>
                                    <SelectItem value="free">Vote gratuit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {votingType === 'paid' && (
                            <div className="space-y-2">
                                <Label>Prix par vote</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium">Montant</div>
                                        <Input 
                                            type="number" 
                                            value={votePriceXOF} 
                                            onChange={(e) => setVotePriceXOF(parseInt(e.target.value, 10))}
                                            min="1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium">Devise</div>
                                        <Select value={voteCurrency} onValueChange={setVoteCurrency}>
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
                                <div className="text-sm text-muted-foreground">
                                    Équivalent: <Badge variant="secondary">{votePricePi} pièces</Badge>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Votes maximum par utilisateur</Label>
                            <Input 
                                type="number" 
                                value={maxVotesPerUser} 
                                onChange={(e) => setMaxVotesPerUser(parseInt(e.target.value, 10))}
                                min="1"
                                max="100"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="isPublic">Concours public</Label>
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
                                <Label htmlFor="allowMultipleVotes">Votes multiples</Label>
                                <div className="text-sm text-muted-foreground">
                                    Permettre plusieurs votes pour le même candidat
                                </div>
                            </div>
                            <Switch 
                                id="allowMultipleVotes"
                                checked={allowMultipleVotes}
                                onCheckedChange={setAllowMultipleVotes}
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

                {/* Affichage du prix du vote */}
                {votingType === 'paid' && (
                    <Card className="bg-muted/50">
                        <CardContent className="p-4">
                            <div className="text-sm font-medium mb-2">Prix du vote - Équivalents</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <CurrencyDisplay 
                                    amount={voteCurrency === 'XOF' ? votePriceXOF : convertCurrency(votePriceXOF, voteCurrency, 'XOF')} 
                                    currency="XOF" 
                                />
                                <CurrencyDisplay 
                                    amount={voteCurrency === 'USD' ? votePriceXOF : convertCurrency(votePriceXOF, voteCurrency, 'USD')} 
                                    currency="USD" 
                                />
                                <CurrencyDisplay 
                                    amount={voteCurrency === 'EUR' ? votePriceXOF : convertCurrency(votePriceXOF, voteCurrency, 'EUR')} 
                                    currency="EUR" 
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}
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
            <Tabs defaultValue="candidates" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="candidates">Candidats</TabsTrigger>
                    <TabsTrigger value="costs">Prix & Coûts</TabsTrigger>
                </TabsList>

                <TabsContent value="candidates" className="space-y-6">
                    {/* Sélection de template */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Modèles de concours prédéfinis</CardTitle>
                            <CardDescription>
                                Choisissez un modèle ou créez vos propres candidats
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={selectedTemplate} onValueChange={applyTemplate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <RadioGroupItem value="custom" id="custom" className="sr-only" />
                                    <Label
                                        htmlFor="custom"
                                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                                            selectedTemplate === 'custom' ? 'border-primary' : ''
                                        }`}
                                    >
                                        <User className="mb-3 h-6 w-6" />
                                        <span className="text-sm font-medium">Personnalisé</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="talent" id="talent" className="sr-only" />
                                    <Label
                                        htmlFor="talent"
                                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                                            selectedTemplate === 'talent' ? 'border-primary' : ''
                                        }`}
                                    >
                                        <Star className="mb-3 h-6 w-6" />
                                        <span className="text-sm font-medium">Talents</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="miss" id="miss" className="sr-only" />
                                    <Label
                                        htmlFor="miss"
                                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                                            selectedTemplate === 'miss' ? 'border-primary' : ''
                                        }`}
                                    >
                                        <Crown className="mb-3 h-6 w-6" />
                                        <span className="text-sm font-medium">Concours Beauté</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="business" id="business" className="sr-only" />
                                    <Label
                                        htmlFor="business"
                                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                                            selectedTemplate === 'business' ? 'border-primary' : ''
                                        }`}
                                    >
                                        <Award className="mb-3 h-6 w-6" />
                                        <span className="text-sm font-medium">Business</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {candidates.map((c, index) => (
                            <Card key={c.id} className="bg-card/50">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                                {index + 1}
                                            </div>
                                            <Label className="text-lg font-bold">Candidat #{index + 1}</Label>
                                        </div>
                                        {candidates.length > 2 && (
                                            <Button variant="ghost" size="icon" onClick={() => removeCandidate(c.id)}>
                                                <Trash className="w-4 h-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nom du candidat *</Label>
                                            <Input 
                                                value={c.name} 
                                                onChange={e => handleCandidateChange(c.id, 'name', e.target.value)}
                                                placeholder="Ex: Marie Koné"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Catégorie</Label>
                                            <Input 
                                                value={c.category} 
                                                onChange={e => handleCandidateChange(c.id, 'category', e.target.value)}
                                                placeholder="Ex: Musique, Danse, Art..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Description/Biographie *</Label>
                                        <Textarea 
                                            value={c.description} 
                                            onChange={e => handleCandidateChange(c.id, 'description', e.target.value)}
                                            placeholder="Décrivez le candidat, ses talents, ses réalisations..."
                                            rows={3}
                                            required
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    
                    <Button variant="outline" onClick={addCandidate} className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un candidat
                    </Button>

                    {candidates.length < 2 && (
                        <Card className="bg-yellow-50 border-yellow-200">
                            <CardContent className="p-4">
                                <div className="text-yellow-800 text-sm">
                                    ⚠️ Ajoutez au moins 2 candidats pour pouvoir créer le concours.
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="costs" className="space-y-6">
                    <div className="space-y-4">
                        {plannedCosts.map((cost) => (
                            <Card key={cost.id} className="bg-card/50">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Nom du prix/coût</Label>
                                                <Input 
                                                    value={cost.name} 
                                                    onChange={e => handleCostChange(cost.id, 'name', e.target.value)}
                                                    placeholder="Ex: Prix du gagnant, Frais d'organisation..."
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
                                                        <SelectItem value="prize">Prix du gagnant</SelectItem>
                                                        <SelectItem value="organization">Frais d'organisation</SelectItem>
                                                        <SelectItem value="marketing">Marketing</SelectItem>
                                                        <SelectItem value="logistics">Logistique</SelectItem>
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
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un prix ou coût
                    </Button>

                    {/* Résumé des coûts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                Budget du Concours
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
                                <div className="text-sm text-muted-foreground">
                                    Ces coûts représentent les prix à remporter et les frais d'organisation.
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
                <Button onClick={handleSubmit} disabled={loading || candidates.length < 2} size="lg">
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Vote className="w-4 h-4 mr-2" />
                    )} 
                    Créer le concours
                </Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Helmet>
                <title>Créer un Concours de Vote - BonPlanInfos</title>
                <meta name="description" content="Créez et configurez votre concours de vote avec système de pièces." />
            </Helmet>
            <main className="container mx-auto max-w-6xl px-4 py-8">
                <Card className="glass-effect">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold font-heading flex items-center justify-center">
                            <Vote className="w-8 h-8 mr-3 text-primary"/>
                            Créer un concours de vote
                        </CardTitle>
                        <CardDescription className="text-lg">
                            {step === 1 ? "Détails de base de votre concours" : "Configurez les candidats et les prix"}
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
                                    Étape 2: Candidats
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

export default CreateVotingEventPage;