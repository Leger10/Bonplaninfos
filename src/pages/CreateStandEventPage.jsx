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
import { Loader2, Store, Plus, Trash } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const CreateStandEventPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [step, setStep] = useState(1);

    // Event Details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [address, setAddress] = useState('');
    const [categoryId, setCategoryId] = useState('');
    
    // Stand Details
    const [standTypes, setStandTypes] = useState([{ id: uuidv4(), name: 'Standard', base_price: 15000, quantity_available: 20 }]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('event_categories').select('*');
            if (error) console.error('Error fetching categories:', error);
            else setCategories(data);
        };
        fetchCategories();
    }, []);

    const handleStandTypeChange = (id, field, value) => {
        setStandTypes(standTypes.map(st => st.id === id ? { ...st, [field]: value } : st));
    };

    const addStandType = () => {
        setStandTypes([...standTypes, { id: uuidv4(), name: '', base_price: 0, quantity_available: 10 }]);
    };
    
    const removeStandType = (id) => {
        setStandTypes(standTypes.filter(st => st.id !== id));
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
                    title, description, event_date: eventDate, city, country, address,
                    organizer_id: user.id, event_type: 'stand_rental', category_id: categoryId, status: 'active'
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
                });
            if (settingsError) throw settingsError;

            // 4. Create Stand Types
            const standTypesToInsert = standTypes.map(st => ({
                ...st,
                stand_event_id: standEventId,
                event_id: newEventId, // Keep denormalized for easier queries
                base_currency: 'XOF',
            }));
            const { error: standTypesError } = await supabase.from('stand_types').insert(standTypesToInsert);
            if (standTypesError) throw standTypesError;
            
            toast({ title: 'Succès', description: 'Événement de location de stands créé avec succès!' });
            navigate(`/event/${newEventId}`);

        } catch (error) {
            console.error('Error creating stand event:', error);
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    const formPart1 = (
        <>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="title">Titre du salon/foire</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                    <div><Label htmlFor="category">Catégorie</Label><Select onValueChange={setCategoryId} value={categoryId}><SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="eventDate">Date et heure</Label><Input id="eventDate" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required /></div>
                    <div><Label htmlFor="country">Pays</Label><Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} required /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="city">Ville</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required /></div>
                    <div><Label htmlFor="address">Adresse</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                </div>
            </div>
            <div className="flex justify-end mt-6"><Button onClick={() => setStep(2)}>Suivant</Button></div>
        </>
    );

    const formPart2 = (
        <>
            <div className="space-y-6">
                {standTypes.map((st) => (
                    <Card key={st.id} className="bg-card/50">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <Input placeholder="Nom du type de stand (ex: Premium)" value={st.name} onChange={e => handleStandTypeChange(st.id, 'name', e.target.value)} className="text-lg font-bold flex-grow" />
                                {standTypes.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeStandType(st.id)}><Trash className="w-4 h-4 text-destructive" /></Button>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><Label>Prix de location (FCFA)</Label><Input type="number" value={st.base_price} onChange={e => handleStandTypeChange(st.id, 'base_price', e.target.value)} /></div>
                                <div><Label>Quantité disponible</Label><Input type="number" value={st.quantity_available} onChange={e => handleStandTypeChange(st.id, 'quantity_available', e.target.value)} /></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                <Button variant="outline" onClick={addStandType} className="w-full"><Plus className="w-4 h-4 mr-2" /> Ajouter un type de stand</Button>
            </div>
            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>Précédent</Button>
                <Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Store className="w-4 h-4 mr-2" />} Créer l'événement</Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Helmet><title>Créer un Événement Salon/Foire - BonPlanInfos</title></Helmet>
            <main className="container mx-auto max-w-4xl px-4 py-12">
                <Card className="glass-effect">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-heading flex items-center"><Store className="w-6 h-6 mr-3 text-primary"/>Créer un événement de location de stands</CardTitle>
                        <CardDescription>{step === 1 ? "Détails de base de votre salon ou foire." : "Configurez les types de stands disponibles."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`flex-1 text-center p-2 rounded-lg ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Étape 1: Détails</div>
                            <div className="flex-1 border-t border-dashed"></div>
                            <div className={`flex-1 text-center p-2 rounded-lg ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Étape 2: Stands</div>
                        </div>
                        <form>{step === 1 ? formPart1 : formPart2}</form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default CreateStandEventPage;