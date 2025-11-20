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
import { Loader2, Ticket, Gift, Plus, Trash, Coins, MapPin, Calendar, DollarSign, Euro, Landmark, Info, Sparkles, Crown, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';

const CreateRaffleEventPage = () => {
    const { user } = useAuth();
    const { adminConfig } = useData();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [step, setStep] = useState(1);

    // Taux de conversion (exemple - à remplacer par vos taux réels)
    const exchangeRates = {
        XOF: 1,      // Franc CFA (base)
        EUR: 655.957, // 1 EUR = 655.957 XOF
        USD: 555,     // 1 USD = 600 XOF (approximatif)
        PI: adminConfig?.pi_conversion_rate || 10 // 1π = 100 XOF par défaut
    };

    // États du formulaire
    const [formData, setFormData] = useState({
        // Étape 1: Informations de base
        title: '',
        description: '',
        categoryId: '',
        drawDate: '',
        
        // Étape 2: Localisation
        country: 'Côte d\'Ivoire',
        city: '',
        address: '',
        isOnline: false,
        
        // Étape 3: Configuration des tickets
        ticketPrice: 500,
        ticketCurrency: 'XOF',
        totalTickets: 100,
        maxTicketsPerUser: 10,
        showRemainingTickets: true,
        
        // Étape 4: Lots
        prizes: [{ id: uuidv4(), rank: 1, description: '', value_fcfa: 0 }],
        
        // Étape 5: Paramètres avancés
        autoDraw: true,
        notifyParticipants: true,
        showParticipants: true,
        termsAccepted: false
    });

    // Calculs dérivés
    const calculatedPricePi = useMemo(() => {
        const priceInXof = formData.ticketPrice * (exchangeRates[formData.ticketCurrency] || 1);
        return Math.ceil(priceInXof / exchangeRates.PI);
    }, [formData.ticketPrice, formData.ticketCurrency, exchangeRates]);

    const totalRevenuePi = useMemo(() => {
        return calculatedPricePi * formData.totalTickets;
    }, [calculatedPricePi, formData.totalTickets]);

    const totalPrizeValue = useMemo(() => {
        return formData.prizes.reduce((sum, prize) => sum + (prize.value_fcfa || 0), 0);
    }, [formData.prizes]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('event_categories').select('*');
            if (error) console.error('Error fetching categories:', error);
            else setCategories(data);
        };
        fetchCategories();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePrizeChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            prizes: prev.prizes.map(p => 
                p.id === id ? { ...p, [field]: field === 'value_fcfa' ? Number(value) : value } : p
            )
        }));
    };

    const addPrize = () => {
        setFormData(prev => ({
            ...prev,
            prizes: [...prev.prizes, { 
                id: uuidv4(), 
                rank: prev.prizes.length + 1, 
                description: '',
                value_fcfa: 0
            }]
        }));
    };
    
    const removePrize = (id) => {
        setFormData(prev => ({
            ...prev,
            prizes: prev.prizes.filter(p => p.id !== id).map((p, index) => ({
                ...p, 
                rank: index + 1
            }))
        }));
    };

    const CurrencyIcon = ({ currency }) => {
        switch (currency) {
            case 'EUR': return <Euro className="w-4 h-4" />;
            case 'USD': return <DollarSign className="w-4 h-4" />;
            case 'XOF': return <Landmark className="w-4 h-4" />;
            default: return <DollarSign className="w-4 h-4" />;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'Erreur', description: 'Vous devez être connecté.', variant: 'destructive' });
            return;
        }

        if (!formData.termsAccepted) {
            toast({ title: 'Erreur', description: 'Vous devez accepter les conditions.', variant: 'destructive' });
            return;
        }

        setLoading(true);

        try {
            // 1. Create Event
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .insert({
                    title: formData.title,
                    description: formData.description,
                    event_date: formData.drawDate,
                    city: formData.city,
                    country: formData.country,
                    address: formData.isOnline ? 'En ligne' : formData.address,
                    organizer_id: user.id,
                    event_type: 'raffle',
                    category_id: formData.categoryId,
                    status: 'active',
                    is_online: formData.isOnline
                })
                .select()
                .single();

            if (eventError) throw eventError;
            const newEventId = eventData.id;

            // 2. Create Raffle Event
            const { data: raffleEventData, error: raffleError } = await supabase
                .from('raffle_events')
                .insert({
                    event_id: newEventId,
                    draw_date: formData.drawDate,
                    base_price: formData.ticketPrice,
                    base_currency: formData.ticketCurrency,
                    calculated_price_pi: calculatedPricePi,
                    total_tickets: formData.totalTickets,
                    max_tickets_per_user: formData.maxTicketsPerUser,
                    auto_draw: formData.autoDraw
                })
                .select()
                .single();
            if (raffleError) throw raffleError;
            
            // 3. Insert event_settings
            const { error: settingsError } = await supabase
                .from('event_settings')
                .insert({
                    event_id: newEventId,
                    raffle_enabled: true,
                    raffle_price_fcfa: formData.ticketPrice * (exchangeRates[formData.ticketCurrency] || 1),
                    show_remaining_tickets: formData.showRemainingTickets,
                    show_participants: formData.showParticipants,
                    notify_participants: formData.notifyParticipants
                });
            if (settingsError) throw settingsError;

            // 4. Create Prizes
            const prizesToInsert = formData.prizes.map(p => ({
                event_id: newEventId,
                raffle_event_id: raffleEventData.id,
                rank: p.rank,
                description: p.description,
                value_fcfa: p.value_fcfa
            }));
            const { error: prizesError } = await supabase.from('raffle_prizes').insert(prizesToInsert);
            if (prizesError) throw prizesError;
            
            toast({ 
                title: '🎉 Tombola créée !', 
                description: 'Votre tombola a été créée avec succès.',
                className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
            });
            navigate(`/event/${newEventId}`);

        } catch (error) {
            console.error('Error creating raffle event:', error);
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // Étape 1: Informations de base
    const Step1 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    Informations de Base
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                </h3>
                <p className="text-muted-foreground">Définissez les informations principales de votre tombola</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="title" className="flex items-center gap-2 font-semibold">
                        <Target className="w-4 h-4 text-primary" />
                        Titre de la tombola *
                    </Label>
                    <Input 
                        id="title" 
                        value={formData.title} 
                        onChange={(e) => handleInputChange('title', e.target.value)} 
                        placeholder="Ex: Grande Tombola de Noël"
                        required 
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="category" className="flex items-center gap-2 font-semibold">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        Catégorie *
                    </Label>
                    <Select onValueChange={(value) => handleInputChange('categoryId', value)} value={formData.categoryId}>
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
                <Label htmlFor="description" className="flex items-center gap-2 font-semibold">
                    <Info className="w-4 h-4 text-blue-500" />
                    Description
                </Label>
                <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Décrivez votre tombola, son objectif, les règles particulières..."
                    rows={4}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="drawDate" className="flex items-center gap-2 font-semibold">
                    <Calendar className="w-4 h-4 text-green-500" />
                    Date du tirage *
                </Label>
                <Input 
                    id="drawDate" 
                    type="datetime-local" 
                    value={formData.drawDate} 
                    onChange={(e) => handleInputChange('drawDate', e.target.value)} 
                    required 
                />
            </div>

            <div className="flex justify-end mt-6">
                <Button onClick={() => setStep(2)} className="bg-gradient-to-r from-blue-500 to-purple-600">
                    Suivant
                </Button>
            </div>
        </div>
    );

    // Étape 2: Localisation
    const Step2 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <MapPin className="w-6 h-6 text-red-500" />
                    Localisation
                    <MapPin className="w-6 h-6 text-red-500" />
                </h3>
                <p className="text-muted-foreground">Où se déroulera votre événement ?</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                    <Label htmlFor="isOnline" className="font-semibold">Événement en ligne</Label>
                    <p className="text-sm text-muted-foreground">Cochez si votre tombola est 100% digitale</p>
                </div>
                <Switch 
                    checked={formData.isOnline}
                    onCheckedChange={(checked) => handleInputChange('isOnline', checked)}
                />
            </div>

            {!formData.isOnline && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="country" className="font-semibold">Pays *</Label>
                        <Input 
                            id="country" 
                            value={formData.country} 
                            onChange={(e) => handleInputChange('country', e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="city" className="font-semibold">Ville *</Label>
                        <Input 
                            id="city" 
                            value={formData.city} 
                            onChange={(e) => handleInputChange('city', e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="address" className="font-semibold">Adresse complète</Label>
                        <Input 
                            id="address" 
                            value={formData.address} 
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            placeholder="Nom du lieu, rue, numéro..."
                        />
                    </div>
                </div>
            )}

            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>Précédent</Button>
                <Button onClick={() => setStep(3)} className="bg-gradient-to-r from-blue-500 to-purple-600">
                    Suivant
                </Button>
            </div>
        </div>
    );

    // Étape 3: Configuration des tickets
    const Step3 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Ticket className="w-6 h-6 text-green-500" />
                    Configuration des Tickets
                    <Ticket className="w-6 h-6 text-green-500" />
                </h3>
                <p className="text-muted-foreground">Définissez le prix et la quantité des tickets</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="ticketPrice" className="font-semibold">Prix du ticket</Label>
                    <div className="flex gap-2">
                        <Input 
                            id="ticketPrice" 
                            type="number" 
                            value={formData.ticketPrice} 
                            onChange={(e) => handleInputChange('ticketPrice', e.target.value)} 
                            required 
                        />
                        <Select 
                            value={formData.ticketCurrency} 
                            onValueChange={(value) => handleInputChange('ticketCurrency', value)}
                        >
                            <SelectTrigger className="w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="XOF">
                                    <div className="flex items-center gap-2">
                                        <Landmark className="w-4 h-4" />
                                        XOF
                                    </div>
                                </SelectItem>
                                <SelectItem value="EUR">
                                    <div className="flex items-center gap-2">
                                        <Euro className="w-4 h-4" />
                                        EUR
                                    </div>
                                </SelectItem>
                                <SelectItem value="USD">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        USD
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="totalTickets" className="font-semibold">Nombre total de tickets *</Label>
                    <Input 
                        id="totalTickets" 
                        type="number" 
                        value={formData.totalTickets} 
                        onChange={(e) => handleInputChange('totalTickets', e.target.value)} 
                        required 
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="maxTicketsPerUser" className="font-semibold">Max tickets par personne</Label>
                    <Input 
                        id="maxTicketsPerUser" 
                        type="number" 
                        value={formData.maxTicketsPerUser} 
                        onChange={(e) => handleInputChange('maxTicketsPerUser', e.target.value)} 
                    />
                </div>

                <div className="space-y-2">
                    <Label className="font-semibold">Prix en π (Pi)</Label>
                    <div className="p-3 bg-primary/10 rounded-lg text-center">
                        <p className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
                            {calculatedPricePi} <Coins className="w-6 h-6" />
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {formData.ticketPrice} {formData.ticketCurrency} = {calculatedPricePi}π
                        </p>
                    </div>
                </div>
            </div>

            {/* Résumé financier */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-4">
                    <h4 className="font-bold text-lg mb-3 text-center">📊 Résumé Financier</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                            <p className="font-semibold">Revenu total estimé</p>
                            <p className="text-2xl font-bold text-primary">{totalRevenuePi}π</p>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold">Valeur en FCFA</p>
                            <p className="text-lg font-bold text-green-600">
                                {(totalRevenuePi * exchangeRates.PI).toLocaleString()} FCFA
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                    <Label className="font-semibold">Afficher les tickets restants</Label>
                    <p className="text-sm text-muted-foreground">Montrer le nombre de tickets disponibles</p>
                </div>
                <Switch 
                    checked={formData.showRemainingTickets}
                    onCheckedChange={(checked) => handleInputChange('showRemainingTickets', checked)}
                />
            </div>

            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(2)}>Précédent</Button>
                <Button onClick={() => setStep(4)} className="bg-gradient-to-r from-blue-500 to-purple-600">
                    Suivant
                </Button>
            </div>
        </div>
    );

    // Étape 4: Lots
    const Step4 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Gift className="w-6 h-6 text-yellow-500" />
                    Lots à Gagner
                    <Gift className="w-6 h-6 text-yellow-500" />
                </h3>
                <p className="text-muted-foreground">Définissez les lots qui seront gagnés</p>
            </div>

            <div className="space-y-4">
                {formData.prizes.map((prize) => (
                    <Card key={prize.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Badge className="text-lg px-3 py-1 bg-yellow-500 text-white">
                                        {prize.rank === 1 ? '🥇 GRAND LOT' : 
                                         prize.rank === 2 ? '🥈 SECOND LOT' : 
                                         prize.rank === 3 ? '🥉 TROISIÈME LOT' : 
                                         `Lot N°${prize.rank}`}
                                    </Badge>
                                </div>
                                {formData.prizes.length > 1 && (
                                    <Button variant="ghost" size="icon" onClick={() => removePrize(prize.id)}>
                                        <Trash className="w-4 h-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <Label>Description du lot *</Label>
                                    <Textarea 
                                        value={prize.description} 
                                        onChange={e => handlePrizeChange(prize.id, 'description', e.target.value)}
                                        placeholder="Décrivez le lot en détail..."
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Valeur estimée (FCFA)</Label>
                                        <Input 
                                            type="number" 
                                            value={prize.value_fcfa} 
                                            onChange={e => handlePrizeChange(prize.id, 'value_fcfa', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <div className="p-2 bg-muted rounded-lg text-sm w-full">
                                            <p className="font-semibold">Valeur en π</p>
                                            <p className="text-primary font-bold">
                                                {Math.ceil(prize.value_fcfa / exchangeRates.PI)}π
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                <Button variant="outline" onClick={addPrize} className="w-full py-6 border-2 border-dashed">
                    <Plus className="w-5 h-5 mr-2" /> Ajouter un lot
                </Button>
            </div>

            {/* Résumé des lots */}
            {totalPrizeValue > 0 && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-4">
                        <h4 className="font-bold text-lg mb-2 text-center">💰 Valeur Totale des Lots</h4>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-green-600">{totalPrizeValue.toLocaleString()} FCFA</p>
                                <p className="text-sm text-muted-foreground">Valeur totale</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-primary">{Math.ceil(totalPrizeValue / exchangeRates.PI)}π</p>
                                <p className="text-sm text-muted-foreground">En pièces</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(3)}>Précédent</Button>
                <Button onClick={() => setStep(5)} className="bg-gradient-to-r from-blue-500 to-purple-600">
                    Suivant
                </Button>
            </div>
        </div>
    );

    // Étape 5: Paramètres avancés
    const Step5 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    Paramètres Avancés
                    <Sparkles className="w-6 h-6 text-purple-500" />
                </h3>
                <p className="text-muted-foreground">Personnalisez le comportement de votre tombola</p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                        <Label className="font-semibold">Tirage automatique</Label>
                        <p className="text-sm text-muted-foreground">Le gagnant est tiré automatiquement à la date prévue</p>
                    </div>
                    <Switch 
                        checked={formData.autoDraw}
                        onCheckedChange={(checked) => handleInputChange('autoDraw', checked)}
                    />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                        <Label className="font-semibold">Notifier les participants</Label>
                        <p className="text-sm text-muted-foreground">Envoyer des notifications aux participants</p>
                    </div>
                    <Switch 
                        checked={formData.notifyParticipants}
                        onCheckedChange={(checked) => handleInputChange('notifyParticipants', checked)}
                    />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                        <Label className="font-semibold">Afficher les participants</Label>
                        <p className="text-sm text-muted-foreground">Montrer la liste des participants</p>
                    </div>
                    <Switch 
                        checked={formData.showParticipants}
                        onCheckedChange={(checked) => handleInputChange('showParticipants', checked)}
                    />
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Input 
                        type="checkbox" 
                        checked={formData.termsAccepted}
                        onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                        className="w-5 h-5 mt-1"
                    />
                    <div>
                        <Label className="font-semibold">J'accepte les conditions d'utilisation</Label>
                        <p className="text-sm text-muted-foreground">
                            Je certifie être le propriétaire légitime de cette tombola et m'engage à respecter 
                            les règles de BonPlanInfos. Je comprends que les transactions se font en π (Pi) 
                            et que les taux de conversion sont fixés par la plateforme.
                        </p>
                    </div>
                </div>
            </div>

            {/* Résumé final */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardContent className="p-6">
                    <h4 className="font-bold text-xl mb-4 text-center">🎯 Récapitulatif</h4>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span>Prix du ticket:</span>
                            <span className="font-bold">{calculatedPricePi}π ({formData.ticketPrice} {formData.ticketCurrency})</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total tickets:</span>
                            <span className="font-bold">{formData.totalTickets}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Revenu total estimé:</span>
                            <span className="font-bold text-primary">{totalRevenuePi}π</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Nombre de lots:</span>
                            <span className="font-bold">{formData.prizes.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Date du tirage:</span>
                            <span className="font-bold">{new Date(formData.drawDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(4)}>Précédent</Button>
                <Button 
                    onClick={handleSubmit} 
                    disabled={loading || !formData.termsAccepted}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Gift className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Création...' : 'Créer la tombola'}
                </Button>
            </div>
        </div>
    );

    const steps = [Step1, Step2, Step3, Step4, Step5];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 text-foreground">
            <Helmet>
                <title>Créer une Tombola - BonPlanInfos</title>
            </Helmet>
            
            <main className="container mx-auto max-w-4xl px-4 py-8">
                <Card className="glass-effect border-2 border-primary/20 shadow-2xl">
                    <CardHeader className="text-center pb-8">
                        <CardTitle className="text-3xl font-bold font-heading flex items-center justify-center gap-3">
                            <Ticket className="w-8 h-8 text-primary" />
                            Créer une Tombola
                            <Ticket className="w-8 h-8 text-primary" />
                        </CardTitle>
                        <CardDescription className="text-lg">
                            Créez votre tombola en quelques étapes simples et commencez à vendre des tickets !
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                        {/* Barre de progression */}
                        <div className="flex items-center justify-between mb-8 relative">
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 -z-10"></div>
                            {[1, 2, 3, 4, 5].map((stepNumber) => (
                                <div key={stepNumber} className="flex flex-col items-center relative z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                        step === stepNumber 
                                            ? 'bg-primary text-primary-foreground scale-110 shadow-lg' 
                                            : step > stepNumber 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {step > stepNumber ? '✓' : stepNumber}
                                    </div>
                                    <span className={`text-xs mt-2 font-medium ${
                                        step === stepNumber ? 'text-primary' : 'text-muted-foreground'
                                    }`}>
                                        {['Infos', 'Lieu', 'Tickets', 'Lots', 'Final'][stepNumber - 1]}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <form className="space-y-6">
                            {steps[step - 1]()}
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

// Hook useMemo manquant
const useMemo = (callback, dependencies) => {
    const [value, setValue] = React.useState(callback());
    
    React.useEffect(() => {
        setValue(callback());
    }, dependencies);
    
    return value;
};

export default CreateRaffleEventPage;