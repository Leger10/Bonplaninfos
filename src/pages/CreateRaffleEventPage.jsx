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
import { Loader2, Ticket, Gift, Plus, Trash } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';

const CreateRaffleEventPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [step, setStep] = useState(1);

    // Event Details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [drawDate, setDrawDate] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [address, setAddress] = useState('');
    const [categoryId, setCategoryId] = useState('');

    // Raffle Details
    const [ticketPrice, setTicketPrice] = useState(500);
    const [totalTickets, setTotalTickets] = useState(100);
    const [prizes, setPrizes] = useState([{ id: uuidv4(), rank: 1, description: '' }]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('event_categories').select('*');
            if (error) console.error('Error fetching categories:', error);
            else setCategories(data);
        };
        fetchCategories();
    }, []);

    const handlePrizeChange = (id, field, value) => {
        setPrizes(prizes.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const addPrize = () => {
        setPrizes([...prizes, { id: uuidv4(), rank: prizes.length + 1, description: '' }]);
    };
    
    const removePrize = (id) => {
        setPrizes(prizes.filter(p => p.id !== id).map((p, index) => ({...p, rank: index + 1})));
    };

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
                    title, description, event_date: drawDate, city, country, address,
                    organizer_id: user.id, event_type: 'raffle', category_id: categoryId, status: 'active'
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
                    draw_date: drawDate,
                    base_price: ticketPrice,
                    base_currency: 'XOF',
                    total_tickets: totalTickets,
                }).select().single();
            if (raffleError) throw raffleError;
            
            // 3. Insert event_settings
            const { error: settingsError } = await supabase
                .from('event_settings')
                .insert({
                    event_id: newEventId,
                    raffle_enabled: true,
                    raffle_price_fcfa: ticketPrice,
                });
            if (settingsError) throw settingsError;

            // 4. Create Prizes
            const prizesToInsert = prizes.map(p => ({
                event_id: newEventId,
                raffle_event_id: raffleEventData.id,
                rank: p.rank,
                description: p.description
            }));
            const { error: prizesError } = await supabase.from('raffle_prizes').insert(prizesToInsert);
            if (prizesError) throw prizesError;
            
            toast({ title: 'Succès', description: 'Tombola créée avec succès!' });
            navigate(`/event/${newEventId}`);

        } catch (error) {
            console.error('Error creating raffle event:', error);
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    const formPart1 = (
        <>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="title">Titre de la tombola</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                    <div><Label htmlFor="category">Catégorie</Label><Select onValueChange={setCategoryId} value={categoryId}><SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="drawDate">Date du tirage</Label><Input id="drawDate" type="datetime-local" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} required /></div>
                     <div><Label htmlFor="ticket_price">Prix du ticket (FCFA)</Label><Input id="ticket_price" type="number" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} required /></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="total_tickets">Nombre total de tickets</Label><Input id="total_tickets" type="number" value={totalTickets} onChange={(e) => setTotalTickets(e.target.value)} required /></div>
                    <div><Label htmlFor="country">Pays</Label><Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} required /></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="city">Ville</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required /></div>
                    <div><Label htmlFor="address">Lieu (si applicable)</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                </div>
            </div>
            <div className="flex justify-end mt-6"><Button onClick={() => setStep(2)}>Suivant</Button></div>
        </>
    );

    const formPart2 = (
        <>
            <div className="space-y-6">
                {prizes.map((p) => (
                    <Card key={p.id} className="bg-card/50">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <Label className="text-lg font-bold">Lot N°{p.rank}</Label>
                                {prizes.length > 1 && <Button variant="ghost" size="icon" onClick={() => removePrize(p.id)}><Trash className="w-4 h-4 text-destructive" /></Button>}
                            </div>
                            <div><Label>Description du lot</Label><Textarea value={p.description} onChange={e => handlePrizeChange(p.id, 'description', e.target.value)} /></div>
                        </CardContent>
                    </Card>
                ))}
                <Button variant="outline" onClick={addPrize} className="w-full"><Plus className="w-4 h-4 mr-2" /> Ajouter un lot</Button>
            </div>
            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>Précédent</Button>
                <Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />} Créer la tombola</Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Helmet><title>Créer une Tombola - BonPlanInfos</title></Helmet>
            <main className="container mx-auto max-w-4xl px-4 py-12">
                <Card className="glass-effect">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-heading flex items-center"><Ticket className="w-6 h-6 mr-3 text-primary"/>Créer une Tombola</CardTitle>
                        <CardDescription>{step === 1 ? "Détails de base de votre tombola." : "Listez les lots à gagner."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`flex-1 text-center p-2 rounded-lg ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Étape 1: Détails</div>
                            <div className="flex-1 border-t border-dashed"></div>
                            <div className={`flex-1 text-center p-2 rounded-lg ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Étape 2: Lots</div>
                        </div>
                        <form>{step === 1 ? formPart1 : formPart2}</form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default CreateRaffleEventPage;