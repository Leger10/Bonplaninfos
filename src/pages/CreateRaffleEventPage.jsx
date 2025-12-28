// Pages/CreateRaffleEventPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, Ticket, Gift, Plus, Trash, Coins, MapPin, Calendar, Target, Upload, X, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import OrganizerContractModal from '@/components/organizer/OrganizerContractModal';

const CreateRaffleEventPage = () => {
    const { user } = useAuth();
    const { adminConfig, userProfile } = useData();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [step, setStep] = useState(1);
    const [showContractModal, setShowContractModal] = useState(false);

    // Taux de conversion
    const exchangeRates = {
        XOF: 1,
        EUR: 655.957,
        USD: 600,
        PI: adminConfig?.pi_conversion_rate || 10
    };

    // États du formulaire avec image de couverture
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        categoryId: '',
        drawDate: '',
        coverImage: null,
        coverImageUrl: '',
        country: userProfile?.country || 'Côte d\'Ivoire',
        city: userProfile?.city || '',
        address: '',
        isOnline: false,
        ticketPrice: 500,
        ticketCurrency: 'XOF',
        totalTickets: 100,
        maxTicketsPerUser: 10,
        minTicketsRequired: 50,
        showRemainingTickets: true,
        prizes: [{ id: uuidv4(), rank: 1, description: '', value_fcfa: 0 }],
        autoDraw: true,
        notifyParticipants: true,
        showParticipants: true,
    });

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
            const { data, error } = await supabase.from('event_categories').select('*').eq('is_active', true).order('name');
            if (error) console.error('Error fetching categories:', error);
            else setCategories(data);
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        return () => {
            if (formData.coverImageUrl) {
                URL.revokeObjectURL(formData.coverImageUrl);
            }
        };
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

    const handleImageUpload = async (file) => {
        if (!file) return null;
        setUploading(true);
        try {
            if (file.size > 2 * 1024 * 1024) {
                toast({ title: 'Fichier trop volumineux', description: 'L\'image ne doit pas dépasser 2MB.', variant: 'destructive' });
                return null;
            }
            if (!file.type.startsWith('image/')) {
                toast({ title: 'Type de fichier invalide', description: 'Veuillez sélectionner une image', variant: 'destructive' });
                return null;
            }
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
            const filePath = `events/${user.id}/${uuidv4()}-${cleanFileName}`;
            const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
            return { publicUrl: urlData.publicUrl, filePath };
        } catch (error) {
            console.error('Erreur upload image:', error);
            toast({ title: 'Erreur d\'upload', description: 'Impossible de télécharger l\'image', variant: 'destructive' });
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, coverImage: file, coverImageUrl: previewUrl }));
    };

    const handleRemoveImage = () => {
        if (formData.coverImageUrl) URL.revokeObjectURL(formData.coverImageUrl);
        setFormData(prev => ({ ...prev, coverImage: null, coverImageUrl: '' }));
    };

    const initiateSubmit = (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'Erreur', description: 'Vous devez être connecté.', variant: 'destructive' });
            return;
        }
        setShowContractModal(true);
    };

    const performSubmission = async () => {
        setLoading(true);
        try {
            let coverImageUrl = '';
            if (formData.coverImage) {
                const imageData = await handleImageUpload(formData.coverImage);
                if (imageData) {
                    coverImageUrl = imageData.publicUrl;
                }
            }

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
                    is_online: formData.isOnline,
                    cover_image: coverImageUrl,
                    contract_accepted_at: new Date().toISOString(),
                    contract_version: 'v1.0'
                })
                .select()
                .single();

            if (eventError) throw eventError;
            const newEventId = eventData.id;

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
                    min_tickets_required: formData.minTicketsRequired,
                    auto_draw: formData.autoDraw
                })
                .select()
                .single();

            if (raffleError) throw raffleError;

            await supabase.from('event_settings').insert({
                event_id: newEventId,
                raffle_enabled: true,
                show_remaining_tickets: formData.showRemainingTickets,
                show_participants: formData.showParticipants,
                notify_participants: formData.notifyParticipants
            });

            const prizesToInsert = formData.prizes.map(p => ({
                event_id: newEventId,
                raffle_event_id: raffleEventData.id,
                rank: p.rank,
                description: p.description,
                value_fcfa: p.value_fcfa
            }));

            await supabase.from('raffle_prizes').insert(prizesToInsert);

            toast({ title: '🎉 Tombola créée !', description: 'Votre tombola a été créée avec succès.' });
            navigate(`/event/${newEventId}`);

        } catch (error) {
            console.error('Error creating raffle event:', error);
            toast({ title: 'Erreur de création', description: error.message || 'Une erreur est survenue lors de la création', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const Step1 = () => (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="title">Titre de la tombola *</Label>
                <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Ex: Grande Tombola de Noël"
                    required
                    className="text-lg font-bold p-4 bg-transparent border-0 border-b-2 border-input focus:ring-0 focus:border-primary transition-all duration-300 ease-in-out placeholder-muted-foreground/50 bg-gradient-to-r from-primary/5 to-accent/5"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Décrivez votre tombola..."
                    rows={4}
                />
            </div>
            <div className="space-y-2">
                <Label>Image de couverture</Label>
                {formData.coverImageUrl ? (
                    <div className="relative">
                        <div className="border-2 border-primary/20 rounded-lg overflow-hidden">
                            <img src={formData.coverImageUrl} alt="Aperçu" className="w-full h-64 object-cover" />
                        </div>
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600" onClick={handleRemoveImage}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <input type="file" id="coverImage" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        <label htmlFor="coverImage" className="cursor-pointer">
                            <div className="flex flex-col items-center justify-center space-y-3">
                                <Upload className="w-8 h-8 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Ajouter une affiche</p>
                                    <p className="text-sm text-muted-foreground mt-1">Cliquez pour sélectionner une image</p>
                                </div>
                            </div>
                        </label>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="category">Catégorie *</Label>
                    <Select onValueChange={(value) => handleInputChange('categoryId', value)} value={formData.categoryId}>
                        <SelectTrigger><SelectValue placeholder="Choisir une catégorie..." /></SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="drawDate">Date du tirage *</Label>
                    <Input id="drawDate" type="datetime-local" value={formData.drawDate} onChange={(e) => handleInputChange('drawDate', e.target.value)} required />
                </div>
            </div>
            <div className="flex justify-end mt-6"><Button onClick={() => setStep(2)}>Suivant</Button></div>
        </div>
    );

    const Step2 = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div><Label htmlFor="isOnline" className="font-semibold">Événement en ligne</Label><p className="text-sm text-muted-foreground">Cochez si 100% digital</p></div>
                <Switch checked={formData.isOnline} onCheckedChange={(checked) => handleInputChange('isOnline', checked)} />
            </div>
            {!formData.isOnline && (
                <>
                    <div className="space-y-2"><Label htmlFor="address">Lieu (Adresse) *</Label><Input id="address" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} required /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="city">Ville *</Label><Input id="city" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="country">Pays *</Label><Input id="country" value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} required /></div>
                    </div>
                </>
            )}
            <div className="flex justify-between mt-6"><Button variant="outline" onClick={() => setStep(1)}>Précédent</Button><Button onClick={() => setStep(3)}>Suivant</Button></div>
        </div>
    );

    const Step3 = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="ticketPrice">Prix du ticket</Label><div className="flex gap-2"><Input id="ticketPrice" type="number" value={formData.ticketPrice} onChange={(e) => handleInputChange('ticketPrice', e.target.value)} required /><Select value={formData.ticketCurrency} onValueChange={(value) => handleInputChange('ticketCurrency', value)}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="XOF">XOF</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div></div>
                <div className="space-y-2"><Label htmlFor="totalTickets">Nombre total *</Label><Input id="totalTickets" type="number" value={formData.totalTickets} onChange={(e) => handleInputChange('totalTickets', e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="maxTicketsPerUser">Max par personne</Label><Input id="maxTicketsPerUser" type="number" value={formData.maxTicketsPerUser} onChange={(e) => handleInputChange('maxTicketsPerUser', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="minTicketsRequired">Objectif minimum *</Label><Input id="minTicketsRequired" type="number" value={formData.minTicketsRequired} onChange={(e) => handleInputChange('minTicketsRequired', e.target.value)} min="1" max={formData.totalTickets} required /></div>
            </div>
            <div className="p-4 border rounded-lg space-y-2 text-center"><Label>Prix en π</Label><p className="text-2xl font-bold text-primary flex items-center justify-center gap-2">{calculatedPricePi} <Coins className="w-6 h-6" /></p></div>
            <div className="flex justify-between mt-6"><Button variant="outline" onClick={() => setStep(2)}>Précédent</Button><Button onClick={() => setStep(4)}>Suivant</Button></div>
        </div>
    );

    const Step4 = () => (
        <div className="space-y-6">
            <div className="space-y-4">
                {formData.prizes.map((prize) => (
                    <Card key={prize.id} className="border-2">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <Badge className="text-lg px-3 py-1 bg-primary text-white">Lot N°{prize.rank}</Badge>
                                {formData.prizes.length > 1 && <Button variant="ghost" size="icon" onClick={() => removePrize(prize.id)}><Trash className="w-4 h-4 text-destructive" /></Button>}
                            </div>
                            <div className="space-y-3">
                                <div><Label>Description *</Label><Textarea value={prize.description} onChange={e => handlePrizeChange(prize.id, 'description', e.target.value)} placeholder="Décrivez le lot..." required /></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><Label>Valeur (FCFA)</Label><Input type="number" value={prize.value_fcfa} onChange={e => handlePrizeChange(prize.id, 'value_fcfa', e.target.value)} /></div>
                                    <div className="flex items-end"><div className="p-2 bg-muted rounded-lg text-sm w-full"><p className="font-semibold">Valeur en π</p><p className="text-primary font-bold">{Math.ceil(prize.value_fcfa / exchangeRates.PI)}π</p></div></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                <Button variant="outline" onClick={addPrize} className="w-full py-6 border-2 border-dashed"><Plus className="w-5 h-5 mr-2" /> Ajouter un lot</Button>
            </div>
            <div className="flex justify-between mt-6"><Button variant="outline" onClick={() => setStep(3)}>Précédent</Button><Button onClick={() => setStep(5)}>Suivant</Button></div>
        </div>
    );

    const Step5 = () => (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg"><div><Label className="font-semibold">Tirage automatique</Label></div><Switch checked={formData.autoDraw} onCheckedChange={(checked) => handleInputChange('autoDraw', checked)} /></div>
                <div className="flex items-center justify-between p-4 border rounded-lg"><div><Label className="font-semibold">Notifier les participants</Label></div><Switch checked={formData.notifyParticipants} onCheckedChange={(checked) => handleInputChange('notifyParticipants', checked)} /></div>
                <div className="flex items-center justify-between p-4 border rounded-lg"><div><Label className="font-semibold">Afficher les participants</Label></div><Switch checked={formData.showParticipants} onCheckedChange={(checked) => handleInputChange('showParticipants', checked)} /></div>
            </div>
            <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(4)}>Précédent</Button>
                <Button onClick={initiateSubmit} disabled={loading} className="bg-primary hover:bg-primary/90">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
                    Créer la tombola
                </Button>
            </div>
        </div>
    );

    const steps = [Step1, Step2, Step3, Step4, Step5];

    return (
        <div className="min-h-screen bg-background">
            <Helmet><title>Créer une Tombola - BonPlanInfos</title></Helmet>
            <main className="container mx-auto max-w-2xl px-4 py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="w-6 h-6 text-primary" /> Créer une Tombola</CardTitle><CardDescription>Créez votre tombola en quelques étapes simples.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mb-8 relative">
                                <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 -z-10"></div>
                                {[1, 2, 3, 4, 5].map((stepNumber) => (
                                    <div key={stepNumber} className="flex flex-col items-center relative z-10">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step === stepNumber ? 'bg-primary text-primary-foreground scale-110' : step > stepNumber ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>{step > stepNumber ? '✓' : stepNumber}</div>
                                    </div>
                                ))}
                            </div>
                            <form className="space-y-6">{steps[step - 1]()}</form>
                        </CardContent>
                    </Card>
                </motion.div>
            </main>
            <OrganizerContractModal open={showContractModal} onOpenChange={setShowContractModal} onAccept={performSubmission} />
        </div>
    );
};

export default CreateRaffleEventPage;