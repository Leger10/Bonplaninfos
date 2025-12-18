import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Ticket, Trash, Coins, Save, ArrowRight, ArrowLeft, CheckCircle, MessageSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ImageUpload from '@/components/ImageUpload';

const TICKET_COLORS = [
    { name: 'Bleu (Standard)', value: 'blue', hex: 'bg-blue-500' },
    { name: 'Bronze', value: 'bronze', hex: 'bg-amber-600' },
    { name: 'Argent', value: 'silver', hex: 'bg-slate-400' },
    { name: 'Or', value: 'gold', hex: 'bg-yellow-500' },
    { name: 'Violet (VIP)', value: 'purple', hex: 'bg-purple-600' },
    { name: 'Rouge', value: 'red', hex: 'bg-red-500' },
    { name: 'Vert', value: 'green', hex: 'bg-green-500' },
    { name: 'Noir', value: 'black', hex: 'bg-slate-900' },
];

const CreateTicketingEventPage = () => {
    const { user } = useAuth();
    const { adminConfig } = useData();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [step, setStep] = useState(1);

    // Pricing Configuration
    const COIN_RATE = adminConfig?.coin_to_fcfa_rate || 10; 

    // Event Details
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [address, setAddress] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [maxAttendees, setMaxAttendees] = useState(1000);
    const [isPublic, setIsPublic] = useState(true);
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [coverImage, setCoverImage] = useState('');

    // Ticketing Details
    const [ticketTypes, setTicketTypes] = useState([{ 
        id: uuidv4(), 
        name: 'Standard', 
        price: 5000, 
        presale_price: 3000, 
        quantity_available: 100, 
        sales_start_date: '', 
        sales_end_date: '',
        description: 'Accès standard à l\'événement',
        color: 'blue'
    }]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('event_categories').select('*').eq('is_active', true);
            if (error) console.error('Error fetching categories:', error);
            else setCategories(data || []);
        };
        fetchCategories();
    }, []);

    const handleTicketTypeChange = (id, field, value) => {
        setTicketTypes(ticketTypes.map(tt => tt.id === id ? { ...tt, [field]: value } : tt));
    };

    const addTicketType = () => {
        setTicketTypes([...ticketTypes, { 
            id: uuidv4(), 
            name: 'Nouveau Billet', 
            price: 0,
            presale_price: 0,
            quantity_available: 50, 
            sales_start_date: '', 
            sales_end_date: '',
            description: '',
            color: 'blue'
        }]);
    };

    const removeTicketType = (id) => {
        if (ticketTypes.length <= 1) {
            toast({ title: "Impossible", description: "Il faut au moins un type de billet.", variant: "destructive" });
            return;
        }
        setTicketTypes(ticketTypes.filter(tt => tt.id !== id));
    };

    const convertToCoins = (fcfa) => Math.ceil(parseInt(fcfa || 0, 10) / COIN_RATE);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'Erreur', description: 'Vous devez être connecté.', variant: 'destructive' });
            return;
        }
        
        if (!title || !eventDate || !city || !categoryId) {
            toast({ title: 'Erreur', description: 'Veuillez remplir les champs obligatoires (Titre, Date, Ville, Catégorie).', variant: 'destructive' });
            return;
        }

        setLoading(true);

        try {
            console.log("Creating event with image:", title);
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .insert({
                    title,
                    description,
                    event_date: eventDate || null,
                    end_date: endDate || null,
                    city,
                    country,
                    address,
                    cover_image: coverImage,
                    organizer_id: user.id,
                    event_type: 'ticketing', 
                    category_id: categoryId,
                    status: 'active',
                    max_attendees: parseInt(maxAttendees, 10) || null,
                    is_public: isPublic,
                    requires_approval: requiresApproval
                })
                .select()
                .single();

            if (eventError) throw eventError;
            const newEventId = eventData.id;

            const totalTickets = ticketTypes.reduce((acc, tt) => acc + parseInt(tt.quantity_available || 0, 10), 0);
            
            // Create entry in ticketing_events
            const { error: ticketingError } = await supabase
                .from('ticketing_events')
                .insert({
                    event_id: newEventId,
                    total_tickets: totalTickets,
                    tickets_sold: 0,
                });
            if (ticketingError) throw ticketingError;

            const ticketTypesToInsert = ticketTypes.map(tt => ({
                event_id: newEventId,
                name: tt.name,
                description: tt.description,
                quantity_available: parseInt(tt.quantity_available, 10),
                price: parseInt(tt.price, 10),
                price_coins: convertToCoins(tt.price),
                price_pi: convertToCoins(tt.price),
                presale_price_fcfa: parseInt(tt.presale_price, 10),
                presale_price_pi: convertToCoins(tt.presale_price),
                sales_start: tt.sales_start_date || new Date().toISOString(),
                sales_end: tt.sales_end_date || eventDate,
                is_active: true,
                color: tt.color || 'blue'
            }));

            const { error: typesError } = await supabase.from('ticket_types').insert(ticketTypesToInsert);
            if (typesError) throw typesError;
            
            toast({ title: 'Succès', description: 'Événement billetterie créé avec succès!' });
            
            // Use a slight delay to ensure database propagation before redirect
            setTimeout(() => {
                navigate(`/event/${newEventId}`);
            }, 1000);

        } catch (error) {
            console.error('Error creating event:', error);
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 pb-20">
            <Helmet><title>Créer Billetterie - BonPlanInfos</title></Helmet>
            <Card className="max-w-4xl mx-auto glass-effect shadow-xl border-none">
                <CardHeader className="border-b border-border/50 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-primary/10">
                            <Ticket className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold">Créer une Billetterie</CardTitle>
                            <CardDescription>Configurez votre événement, vos billets et vos tarifs.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <Tabs value={String(step)} onValueChange={(v) => setStep(parseInt(v))}>
                        <div className="relative mb-8">
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-muted rounded-full"></div>
                            <div 
                                className="absolute bottom-0 left-0 h-1 bg-primary rounded-full transition-all duration-300 ease-in-out"
                                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                            ></div>
                            <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
                                <TabsTrigger value="1" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-base md:text-lg font-medium border-b-2 border-transparent rounded-none pb-2">1. Informations</TabsTrigger>
                                <TabsTrigger value="2" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-base md:text-lg font-medium border-b-2 border-transparent rounded-none pb-2">2. Billets</TabsTrigger>
                                <TabsTrigger value="3" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-base md:text-lg font-medium border-b-2 border-transparent rounded-none pb-2">3. Confirmation</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="1" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* ... (Previous content for step 1 remains the same) ... */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-base">Image de couverture</Label>
                                        <ImageUpload onImageUploaded={setCoverImage} existingImage={coverImage} />
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Titre de l'événement *</Label>
                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Concert Géant..." className="bg-background/50" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Pays</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} className="bg-background/50" /></div>
                                        <div className="space-y-2"><Label>Ville *</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-background/50" /></div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Adresse précise</Label>
                                        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Lieu, Salle, Rue..." className="bg-background/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Catégorie *</Label>
                                        <Select onValueChange={setCategoryId} value={categoryId}>
                                            <SelectTrigger className="bg-background/50"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                                            <SelectContent>
                                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détaillez votre événement..." className="min-h-[150px] bg-background/50" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><Label>Début *</Label><Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="bg-background/50" /></div>
                                <div className="space-y-2"><Label>Fin</Label><Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background/50" /></div>
                            </div>

                            <div className="flex justify-end mt-8">
                                <Button onClick={() => setStep(2)} className="px-8">Suivant <ArrowRight className="ml-2 w-4 h-4" /></Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="2" className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* ... (Previous content for step 2 remains the same) ... */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 text-sm flex gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full h-fit">
                                    <Coins className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div>
                                    <p className="font-bold text-base text-blue-800 dark:text-blue-300">Conversion Automatique</p>
                                    <p className="text-muted-foreground">Le système calcule automatiquement le prix en Pièces (10 FCFA = 1 π). Les revenus sont partagés à 95% pour vous.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {ticketTypes.map((tt, index) => (
                                    <motion.div 
                                        key={tt.id} 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Card className="border-l-4 overflow-hidden hover:shadow-md transition-all" style={{ borderLeftColor: TICKET_COLORS.find(c => c.value === tt.color)?.hex.replace('bg-', '') || 'gray' }}>
                                            <CardContent className="p-6 space-y-6">
                                                <div className="flex justify-between items-center border-b pb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="text-sm px-3 py-1">Billet #{index + 1}</Badge>
                                                        <Input 
                                                            value={tt.name} 
                                                            onChange={(e) => handleTicketTypeChange(tt.id, 'name', e.target.value)} 
                                                            className="font-bold text-lg border-none shadow-none focus-visible:ring-0 px-0 w-auto min-w-[200px]"
                                                            placeholder="Nom du billet (ex: VIP)" 
                                                        />
                                                    </div>
                                                    {ticketTypes.length > 1 && (
                                                        <Button variant="ghost" size="icon" onClick={() => removeTicketType(tt.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                            <Trash className="w-5 h-5" />
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                    <div className="space-y-4 lg:col-span-2">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Quantité disponible</Label>
                                                                <Input type="number" value={tt.quantity_available} onChange={(e) => handleTicketTypeChange(tt.id, 'quantity_available', e.target.value)} className="bg-background/50" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Couleur du billet</Label>
                                                                <Select value={tt.color} onValueChange={(val) => handleTicketTypeChange(tt.id, 'color', val)}>
                                                                    <SelectTrigger className="bg-background/50">
                                                                        <SelectValue placeholder="Choisir une couleur">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`w-4 h-4 rounded-full ${TICKET_COLORS.find(c => c.value === tt.color)?.hex}`}></div>
                                                                                <span>{TICKET_COLORS.find(c => c.value === tt.color)?.name}</span>
                                                                            </div>
                                                                        </SelectValue>
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {TICKET_COLORS.map(c => (
                                                                            <SelectItem key={c.value} value={c.value}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className={`w-4 h-4 rounded-full ${c.hex}`}></div>
                                                                                    <span>{c.name}</span>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Description courte</Label>
                                                            <Input value={tt.description} onChange={(e) => handleTicketTypeChange(tt.id, 'description', e.target.value)} placeholder="Avantages inclus..." className="bg-background/50" />
                                                        </div>
                                                    </div>

                                                    <div className="bg-muted/30 p-4 rounded-xl space-y-4 border border-border/50">
                                                        <div className="space-y-3">
                                                            <Label className="text-orange-600 font-bold flex items-center gap-2">
                                                                <span>Prix Prévente (J-1)</span>
                                                                <Badge variant="secondary" className="text-[10px] h-5">Promo</Badge>
                                                            </Label>
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative flex-grow">
                                                                    <Input type="number" value={tt.presale_price} onChange={(e) => handleTicketTypeChange(tt.id, 'presale_price', e.target.value)} className="pr-12 bg-background" />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">FCFA</span>
                                                                </div>
                                                                <Badge variant="outline" className="h-10 px-3 text-base font-medium min-w-[80px] justify-center">{convertToCoins(tt.presale_price)} π</Badge>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-3 pt-2 border-t border-dashed border-border">
                                                            <Label className="text-green-600 font-bold">Prix Jour J (J-0)</Label>
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative flex-grow">
                                                                    <Input type="number" value={tt.price} onChange={(e) => handleTicketTypeChange(tt.id, 'price', e.target.value)} className="pr-12 bg-background" />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">FCFA</span>
                                                                </div>
                                                                <Badge variant="outline" className="h-10 px-3 text-base font-medium min-w-[80px] justify-center">{convertToCoins(tt.price)} π</Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>

                            <Button variant="outline" onClick={addTicketType} className="w-full py-8 border-dashed border-2 hover:border-primary hover:text-primary transition-all group">
                                <div className="flex flex-col items-center gap-2">
                                    <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    <span>Ajouter un autre type de billet</span>
                                </div>
                            </Button>

                            <div className="flex justify-between pt-8 border-t border-border">
                                <Button variant="outline" onClick={() => setStep(1)} className="px-6"><ArrowLeft className="mr-2 w-4 h-4" /> Retour</Button>
                                <Button onClick={() => setStep(3)} className="px-8">Suivant <ArrowRight className="ml-2 w-4 h-4" /></Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="3" className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <Card className="border-dashed border-2">
                                <CardContent className="p-8 text-center space-y-4">
                                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold">Prêt à publier ?</h3>
                                    <p className="text-muted-foreground max-w-md mx-auto">
                                        Votre événement <strong>{title}</strong> est prêt. 
                                        <br/>
                                        <span className="flex items-center justify-center gap-2 font-medium text-green-600 mt-2">
                                            <MessageSquare className="w-4 h-4" /> 
                                            Livraison automatique via WhatsApp
                                        </span>
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left bg-muted/30 p-4 rounded-lg">
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Date</span>
                                            <span className="font-medium">{new Date(eventDate).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Lieu</span>
                                            <span className="font-medium">{city}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-xs text-muted-foreground block">Billets</span>
                                            <span className="font-medium">{ticketTypes.reduce((acc, t) => acc + parseInt(t.quantity_available), 0)} total</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep(2)} className="px-6"><ArrowLeft className="mr-2 w-4 h-4" /> Retour</Button>
                                <Button onClick={handleSubmit} disabled={loading} size="lg" className="px-8 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />} 
                                    Confirmer et Publier
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateTicketingEventPage;