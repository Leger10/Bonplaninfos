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
import { Loader2, Vote, Plus, Trash, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';

const CreateVotingEventPage = () => {
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

    // Voting Details
    const [votePricePi, setVotePricePi] = useState(1);
    const [candidates, setCandidates] = useState([{ id: uuidv4(), name: '', description: '' }]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('event_categories').select('*');
            if (error) console.error('Error fetching categories:', error);
            else setCategories(data);
        };
        fetchCategories();
    }, []);

    const handleCandidateChange = (id, field, value) => {
        setCandidates(candidates.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const addCandidate = () => {
        setCandidates([...candidates, { id: uuidv4(), name: '', description: '' }]);
    };

    const removeCandidate = (id) => {
        setCandidates(candidates.filter(c => c.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'Erreur', description: 'Vous devez être connecté.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .insert({
                    title, description, event_date: eventDate, city, country, address,
                    organizer_id: user.id, event_type: 'voting', category_id: categoryId, status: 'active'
                })
                .select()
                .single();

            if (eventError) throw eventError;

            const newEventId = eventData.id;

            const { error: settingsError } = await supabase.from('event_settings').insert({
                event_id: newEventId,
                vote_price_pi: votePricePi,
                voting_enabled: true
            });
            if (settingsError) throw settingsError;

            const candidatesToInsert = candidates.map(c => ({
                event_id: newEventId,
                name: c.name,
                description: c.description
            }));
            const { error: candidatesError } = await supabase.from('candidates').insert(candidatesToInsert);
            if (candidatesError) throw candidatesError;

            toast({ title: 'Succès', description: 'Concours de vote créé avec succès!' });
            navigate(`/event/${newEventId}`);

        } catch (error) {
            console.error('Error creating voting event:', error);
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    const formPart1 = (
        <>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="title">Titre du concours</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                    <div><Label htmlFor="category">Catégorie</Label><Select onValueChange={setCategoryId} value={categoryId}><SelectTrigger><SelectValue placeholder="Sélectionnez une catégorie" /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="eventDate">Date de fin des votes</Label><Input id="eventDate" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required /></div>
                    <div><Label htmlFor="vote_price">Prix par vote (en pièces π)</Label><Input id="vote_price" type="number" value={votePricePi} onChange={(e) => setVotePricePi(parseInt(e.target.value, 10))} required min="1" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="country">Pays</Label><Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} required /></div>
                    <div><Label htmlFor="city">Ville</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required /></div>
                </div>
                 <div><Label htmlFor="address">Lieu (si applicable)</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            </div>
            <div className="flex justify-end mt-6"><Button onClick={() => setStep(2)}>Suivant</Button></div>
        </>
    );
    
    const formPart2 = (
        <>
            <div className="space-y-6">
                {candidates.map((c, index) => (
                    <Card key={c.id} className="bg-card/50">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <Label className="text-lg font-bold">Candidat #{index + 1}</Label>
                                {candidates.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeCandidate(c.id)}><Trash className="w-4 h-4 text-destructive" /></Button>}
                            </div>
                            <div><Label>Nom du candidat</Label><Input value={c.name} onChange={e => handleCandidateChange(c.id, 'name', e.target.value)} /></div>
                            <div><Label>Description/Biographie</Label><Textarea value={c.description} onChange={e => handleCandidateChange(c.id, 'description', e.target.value)} /></div>
                        </CardContent>
                    </Card>
                ))}
                <Button variant="outline" onClick={addCandidate} className="w-full"><Plus className="w-4 h-4 mr-2" /> Ajouter un candidat</Button>
            </div>
            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>Précédent</Button>
                <Button onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Vote className="w-4 h-4 mr-2" />} Créer le concours</Button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Helmet><title>Créer un Concours de Vote - BonPlanInfos</title></Helmet>
            <main className="container mx-auto max-w-4xl px-4 py-12">
                <Card className="glass-effect">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-heading flex items-center"><Vote className="w-6 h-6 mr-3 text-primary"/>Créer un concours de vote</CardTitle>
                        <CardDescription>{step === 1 ? "Détails de base de votre concours." : "Ajoutez les candidats en lice."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`flex-1 text-center p-2 rounded-lg ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Étape 1: Détails</div>
                            <div className="flex-1 border-t border-dashed"></div>
                            <div className={`flex-1 text-center p-2 rounded-lg ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Étape 2: Candidats</div>
                        </div>
                        <form>{step === 1 ? formPart1 : formPart2}</form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default CreateVotingEventPage;