import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Store, Users, Phone, Mail, FileText, CheckCircle2, Building2, AlertCircle } from 'lucide-react';
import WalletInfoModal from '@/components/WalletInfoModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Helper to generate consistent colors based on string
const getStandColor = (str) => {
    const colors = [
        { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', icon: 'bg-blue-100 dark:bg-blue-900' },
        { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', icon: 'bg-green-100 dark:bg-green-900' },
        { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', icon: 'bg-purple-100 dark:bg-purple-900' },
        { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', icon: 'bg-orange-100 dark:bg-orange-900' },
        { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', icon: 'bg-pink-100 dark:bg-pink-900' },
        { bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', icon: 'bg-teal-100 dark:bg-teal-900' },
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const StandTypeCard = ({ standType, onSelect, isSelected }) => {
    // Determine availability
    const quantityAvailable = standType.quantity_available || 0;
    const quantityRented = standType.quantity_rented || 0;
    const availableStands = Math.max(0, quantityAvailable - quantityRented);
    const isAvailable = availableStands > 0;
    const progress = quantityAvailable > 0 
        ? (quantityRented / quantityAvailable) * 100 
        : 0;
    
    const colorTheme = getStandColor(standType.name || 'default');

    return (
        <div
            className={`
                flex flex-col h-full
                relative overflow-hidden rounded-xl p-5 border-2 transition-all duration-300 cursor-pointer group
                ${isSelected 
                    ? 'border-primary shadow-lg ring-2 ring-primary/20 bg-background scale-[1.02]' 
                    : `${colorTheme.bg} ${colorTheme.border} hover:shadow-md hover:scale-[1.01]`
                }
                ${!isAvailable ? 'opacity-70 grayscale cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''}
            `}
            onClick={() => isAvailable && onSelect(standType)}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-primary text-white' : `${colorTheme.icon} ${colorTheme.text}`} transition-colors`}>
                        <Store className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-primary' : colorTheme.text}`}>{standType.name}</h3>
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" /> {standType.size || 'Taille standard'}
                        </p>
                    </div>
                </div>
                {isAvailable ? (
                    <Badge className="bg-green-500 hover:bg-green-600 shadow-sm whitespace-nowrap">{availableStands} DISPO</Badge>
                ) : (
                    <Badge variant="destructive" className="whitespace-nowrap">COMPLET</Badge>
                )}
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-medium">
                    <span className={isAvailable ? "text-green-600" : "text-muted-foreground"}>Occupation</span>
                    <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <div className="text-sm text-muted-foreground mb-4 line-clamp-3 min-h-[3em] flex-grow">
                {standType.description || "Aucune description supplémentaire pour ce type de stand."}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5 mt-auto">
                <div>
                    <p className="text-2xl font-extrabold text-foreground flex items-baseline gap-1">
                        {standType.calculated_price_pi} <span className="text-sm font-normal text-muted-foreground">coins</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        ~ {(standType.base_price || 0).toLocaleString()} {standType.base_currency}
                    </p>
                </div>
                <Button 
                    variant={isSelected ? 'default' : 'outline'} 
                    size="sm" 
                    disabled={!isAvailable}
                    className={`
                        ${isSelected ? 'shadow-md' : 'bg-white/50 hover:bg-white'} 
                        transition-all font-semibold
                    `}
                >
                    {isSelected ? <CheckCircle2 className="w-4 h-4 mr-1" /> : null}
                    {isSelected ? 'Sélectionné' : 'Choisir'}
                </Button>
            </div>
        </div>
    );
};

const ParticipantView = ({ event, standEventId, onPurchaseSuccess }) => {
    const { user } = useAuth();
    const [selectedStand, setSelectedStand] = useState(null);
    const [companyInfo, setCompanyInfo] = useState({
        company_name: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        business_description: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetchingStands, setFetchingStands] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [showWalletInfo, setShowWalletInfo] = useState(false);
    const navigate = useNavigate();
    const [confirmation, setConfirmation] = useState({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });
    const [standTypes, setStandTypes] = useState([]);

    // Fetch stand types robustly
    const fetchStandTypes = useCallback(async () => {
        if (!event?.id) return;
        setFetchingStands(true);
        setFetchError(null);
        try {
            const { data, error } = await supabase
                .from('stand_types')
                .select('*')
                .eq('event_id', event.id)
                .order('base_price', { ascending: true });

            if (error) throw error;
            setStandTypes(data || []);
        } catch (err) {
            console.error('Error fetching stand types:', err);
            setFetchError("Impossible de charger les types de stands. Veuillez réessayer.");
        } finally {
            setFetchingStands(false);
        }
    }, [event?.id]);

    useEffect(() => {
        fetchStandTypes();

        const channel = supabase
            .channel('stand_updates_public')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'stand_types', filter: `event_id=eq.${event.id}` },
                (payload) => {
                    setStandTypes(prev => prev.map(st => 
                        st.id === payload.new.id ? { ...st, ...payload.new } : st
                    ));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [event?.id, fetchStandTypes]);

    const handleSelectStand = (standType) => {
        setSelectedStand(standType);
        if (user && !companyInfo.contact_email) {
            setCompanyInfo(prev => ({ 
                ...prev, 
                contact_email: user.email,
                contact_person: user.user_metadata?.full_name || ''
            }));
        }
    };

    const validateForm = () => {
        const errors = [];
        if (!companyInfo.company_name.trim()) errors.push("Nom de l'entreprise");
        if (!companyInfo.contact_person.trim()) errors.push("Contact");
        if (!companyInfo.contact_email.trim()) errors.push("Email");
        if (!companyInfo.contact_phone.trim()) errors.push("Téléphone");
        
        if (errors.length > 0) {
            toast({ 
                title: "Champs manquants", 
                description: `Veuillez remplir : ${errors.join(', ')}`, 
                variant: "destructive" 
            });
            return false;
        }
        return true;
    };

    const handlePurchaseConfirmation = () => {
        if (!user) {
            navigate('/auth');
            return;
        }
        if (!selectedStand) {
            toast({ title: "Aucun stand sélectionné", variant: "destructive" });
            return;
        }
        if (!validateForm()) return;

        setConfirmation({
            isOpen: true,
            cost: selectedStand.calculated_price_pi,
            costFcfa: selectedStand.base_price,
            onConfirm: handlePurchase,
        });
    };

    const handlePurchase = async () => {
        setConfirmation({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('rent_stand', {
                p_event_id: event.id,
                p_user_id: user.id,
                p_stand_type_id: selectedStand.id,
                company_name: companyInfo.company_name,
                contact_person: companyInfo.contact_person,
                contact_email: companyInfo.contact_email,
                contact_phone: companyInfo.contact_phone,
                business_description: companyInfo.business_description
            });

            if (error) throw error;

            if (data.success) {
                toast({
                    title: "🎉 Stand réservé !",
                    description: `Stand ${data.stand_number} attribué avec succès.`,
                    className: "bg-green-600 text-white border-none"
                });
                if (onPurchaseSuccess) onPurchaseSuccess();
                fetchStandTypes(); // Refresh list to update availability immediately
                setSelectedStand(null);
                setCompanyInfo({ company_name: '', contact_person: '', contact_email: '', contact_phone: '', business_description: '' });
            } else {
                toast({ title: "Erreur", description: data.message, variant: "destructive" });
                if (data.message && data.message.includes('Solde')) {
                    setShowWalletInfo(true);
                }
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur technique", description: error.message || "Une erreur inconnue est survenue", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (fetchingStands) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (fetchError) {
        return (
            <div className="p-6 text-center border rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{fetchError}</p>
                <Button variant="outline" onClick={fetchStandTypes} className="mt-4">Réessayer</Button>
            </div>
        );
    }

    if (standTypes.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
                <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-muted-foreground">Aucun stand disponible</h3>
                <p className="text-sm text-muted-foreground">L'organisateur n'a pas encore configuré les stands pour cet événement.</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold font-heading">Réservez votre emplacement</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Sélectionnez le type de stand qui correspond à vos besoins.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {standTypes.map((st) => (
                        <StandTypeCard
                            key={st.id}
                            standType={st}
                            onSelect={handleSelectStand}
                            isSelected={selectedStand?.id === st.id}
                        />
                    ))}
                </div>

                {selectedStand && (
                    <Card className="border-primary/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
                        <div className="bg-primary/5 p-6 border-b border-primary/10">
                            <h3 className="font-bold text-xl flex items-center gap-2 text-primary">
                                <FileText className="w-5 h-5" />
                                Finaliser la réservation : {selectedStand.name}
                            </h3>
                        </div>
                        
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-semibold">Nom de l'entreprise / Marque *</Label>
                                            <Input 
                                                value={companyInfo.company_name} 
                                                onChange={e => setCompanyInfo({ ...companyInfo, company_name: e.target.value })} 
                                                placeholder="Ex: Ma Super Marque"
                                                className="h-11 bg-muted/30"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-semibold">Secteur d'activité / Description</Label>
                                            <Textarea 
                                                value={companyInfo.business_description} 
                                                onChange={e => setCompanyInfo({ ...companyInfo, business_description: e.target.value })} 
                                                placeholder="Que proposez-vous sur votre stand ?"
                                                className="bg-muted/30 min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-semibold">Personne à contacter *</Label>
                                            <Input 
                                                value={companyInfo.contact_person} 
                                                onChange={e => setCompanyInfo({ ...companyInfo, contact_person: e.target.value })} 
                                                placeholder="Nom complet"
                                                className="h-11 bg-muted/30"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="font-semibold">Email *</Label>
                                                <Input 
                                                    type="email" 
                                                    value={companyInfo.contact_email} 
                                                    onChange={e => setCompanyInfo({ ...companyInfo, contact_email: e.target.value })} 
                                                    placeholder="email@pro.com"
                                                    className="h-11 bg-muted/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="font-semibold">Téléphone *</Label>
                                                <Input 
                                                    type="tel" 
                                                    value={companyInfo.contact_phone} 
                                                    onChange={e => setCompanyInfo({ ...companyInfo, contact_phone: e.target.value })} 
                                                    placeholder="+225..."
                                                    className="h-11 bg-muted/30"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex flex-col items-center md:items-start">
                                    <span className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Total à régler</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-extrabold text-primary">{selectedStand.calculated_price_pi}</span>
                                        <span className="text-xl font-medium text-muted-foreground">coins</span>
                                    </div>
                                </div>
                                
                                <Button 
                                    onClick={handlePurchaseConfirmation} 
                                    disabled={loading} 
                                    size="lg" 
                                    className="w-full md:w-auto min-w-[300px] h-14 text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all bg-gradient-to-r from-primary to-purple-600 border-0"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                    Confirmer et Payer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => { setShowWalletInfo(false); navigate('/packs'); }} />

            <AlertDialog open={confirmation.isOpen} onOpenChange={(open) => !open && setConfirmation({ ...confirmation, isOpen: false })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la réservation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous allez réserver le <strong>{selectedStand?.name}</strong> pour <strong>{confirmation.cost} π</strong>.
                            <br/><br/>
                            Cette action débitera votre solde immédiatement. Assurez-vous que vos informations de contact sont correctes.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmation.onConfirm} disabled={loading} className="bg-primary text-white">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Payer et Réserver'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const OwnerView = ({ event, standEventId }) => {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total_stands: 0, rented_stands: 0, revenue: 0 });

    const fetchData = React.useCallback(async () => {
        if (!standEventId) return;
        setLoading(true);
        try {
            // Fetch rentals
            const { data: rentalData, error: rentalError } = await supabase
                .from('stand_rentals')
                .select('*, user:user_id(full_name, email), stand_type:stand_type_id(name)')
                .eq('stand_event_id', standEventId)
                .order('confirmed_at', { ascending: false });
            
            if (rentalError) throw rentalError;
            setRentals(rentalData || []);

            // Fetch summary stats via types
            const { data: typeData, error: typeError } = await supabase
                .from('stand_types')
                .select('quantity_available, quantity_rented')
                .eq('stand_event_id', standEventId);

            if (typeError) throw typeError;

            const totalStands = typeData?.reduce((acc, st) => acc + st.quantity_available, 0) || 0;
            const rentedStands = typeData?.reduce((acc, st) => acc + (st.quantity_rented || 0), 0) || 0;
            const revenue = rentalData?.reduce((acc, r) => acc + (r.rental_amount_pi || 0), 0) || 0;

            setStats({ total_stands: totalStands, rented_stands: rentedStands, revenue });

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    }, [standEventId]);

    useEffect(() => {
        fetchData();
        
        // Listen for new rentals in real-time
        const channel = supabase
            .channel('rentals_update_owner')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stand_rentals', filter: `stand_event_id=eq.${standEventId}` }, () => {
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [standEventId, fetchData]);

    const occupancyRate = stats.total_stands > 0 ? (stats.rented_stands / stats.total_stands) * 100 : 0;

    return (
        <div className="space-y-6 mt-6">
            <Card className="border-l-4 border-l-primary shadow-md bg-gradient-to-r from-background to-primary/5">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-white dark:bg-black/20 rounded-xl shadow-sm border border-border/50">
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Revenu Total (Brut)</p>
                            <p className="text-3xl font-extrabold text-primary mt-2">{stats.revenue} π</p>
                            <p className="text-xs text-muted-foreground mt-1">~ {(stats.revenue * 10).toLocaleString()} FCFA</p>
                        </div>
                        <div className="text-center p-4 bg-white dark:bg-black/20 rounded-xl shadow-sm border border-border/50">
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Stands Loués</p>
                            <p className="text-3xl font-extrabold mt-2">{stats.rented_stands} <span className="text-lg text-muted-foreground font-normal">/ {stats.total_stands}</span></p>
                        </div>
                        <div className="text-center p-4 bg-white dark:bg-black/20 rounded-xl shadow-sm border border-border/50">
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Occupation</p>
                            <p className="text-3xl font-extrabold text-green-600 mt-2">{Math.round(occupancyRate)}%</p>
                            <Progress value={occupancyRate} className="h-2 mt-2 w-24 mx-auto" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Liste des Réservations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : rentals.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground bg-muted/10 rounded-xl border-2 border-dashed">
                            <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Aucune réservation pour le moment.</p>
                            <p className="text-sm">Partagez votre événement pour attirer des exposants !</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rentals.map((rental) => (
                                <div key={rental.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 border rounded-xl hover:bg-muted/30 transition-colors shadow-sm animate-in fade-in">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-lg text-primary">{rental.company_name}</span>
                                            <Badge variant="outline" className="bg-background font-mono">{rental.stand_number}</Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1">
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {rental.contact_person}</span>
                                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {rental.contact_email}</span>
                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {rental.contact_phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="text-xs">{rental.stand_type?.name}</Badge>
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0 text-right min-w-[140px] flex flex-col items-end">
                                        <div className="font-bold text-xl text-foreground">{rental.rental_amount_pi} π</div>
                                        <div className="text-xs text-muted-foreground mb-2">
                                            {new Date(rental.confirmed_at).toLocaleDateString()}
                                        </div>
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none px-3">Payé</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const StandRentalInterface = ({ event, standEventData, isUnlocked, isOwner, onRefresh }) => {
    // If standEventData is provided by parent (EventDetailPage), use it to get ID.
    // Otherwise we might need to fetch it if only event is provided (handled inside views if needed, but here we assume standEventData is the entry point)
    
    // Safety check: if standEventData is missing, we can't do much.
    // However, if we know event.id, we might try to find it. But usually parent does this check.
    if (!isUnlocked || !standEventData) return null;

    return (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {isOwner ? (
                <OwnerView event={event} standEventId={standEventData.id} />
            ) : (
                <ParticipantView event={event} standEventId={standEventData.id} onPurchaseSuccess={onRefresh} />
            )}
        </div>
    );
};

export default StandRentalInterface;