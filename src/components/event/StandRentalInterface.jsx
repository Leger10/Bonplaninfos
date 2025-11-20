import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Store, Coins, ShoppingCart, Sparkles, Info, Crown, Zap, Target, Users, TrendingUp, Star, Gift } from 'lucide-react';
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

const StandTypeCard = ({ standType, onSelect, isSelected }) => {
    const isAvailable = standType.quantity_available > standType.quantity_rented;
    const availableStands = standType.quantity_available - standType.quantity_rented;
    const progress = (standType.quantity_rented / standType.quantity_available) * 100;

    return (
        <div 
            className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 rounded-xl p-5 transition-all duration-300 cursor-pointer hover:shadow-lg group ${isSelected ? 'border-primary shadow-lg scale-105' : 'border-purple-500/30'} ${!isAvailable && 'opacity-60'}`}
            onClick={() => isAvailable && onSelect(standType)}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm text-purple-500">
                        <Store className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                            {standType.name}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3" />
                            {availableStands} stand(s) disponible(s)
                        </p>
                    </div>
                </div>
                <Badge className={`text-xs font-bold ${isAvailable ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                    {isAvailable ? 'DISPONIBLE' : 'COMPLET'}
                </Badge>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-green-600">{availableStands} restant(s)</span>
                    <span className="text-muted-foreground">{standType.quantity_rented}/{standType.quantity_available} loué(s)</span>
                </div>
                <Progress value={progress} className="h-2 bg-muted/50" />
            </div>

            <div className="text-sm text-muted-foreground mb-4">{standType.description}</div>

            <div className="flex items-center justify-between pt-3 border-t border-white/20">
                <div className="text-center">
                    <p className="text-2xl font-bold text-primary flex items-center gap-1">
                        {standType.calculated_price_pi} <Coins className="w-5 h-5" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {standType.base_price.toLocaleString()} FCFA
                    </p>
                </div>
                <Button variant={isSelected ? 'default' : 'outline'} size="sm">
                    {isSelected ? 'Sélectionné' : 'Sélectionner'}
                </Button>
            </div>
        </div>
    );
};

const ParticipantView = ({ event, standEventData, onPurchaseSuccess }) => {
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
    const [showWalletInfo, setShowWalletInfo] = useState(false);
    const navigate = useNavigate();
    const [confirmation, setConfirmation] = useState({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });

    const handleSelectStand = (standType) => {
        setSelectedStand(standType);
    };

    const handlePurchaseConfirmation = () => {
        if (!selectedStand) {
            toast({ title: "Aucun stand sélectionné", variant: "destructive" });
            return;
        }
        if (!companyInfo.company_name || !companyInfo.contact_person || !companyInfo.contact_email || !companyInfo.contact_phone) {
            toast({ title: "Informations requises", description: "Veuillez remplir les informations sur votre entreprise.", variant: "destructive" });
            return;
        }
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
                ...companyInfo
            });

            if (error) throw error;

            if (data.success) {
                toast({
                    title: "🎉 Stand réservé !",
                    description: `Votre stand ${data.stand_number} a été réservé avec succès.`,
                    className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                });
                onPurchaseSuccess();
                setSelectedStand(null);
            } else {
                toast({ title: "Erreur de réservation", description: data.message, variant: "destructive" });
                if (data.message.includes('Solde')) {
                    setShowWalletInfo(true);
                }
            }
        } catch (error) {
            toast({ title: "Erreur de réservation", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Card className="glass-effect border-2 border-primary/20 shadow-xl">
                <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-3">
                        <div className="relative">
                            <Store className="w-10 h-10 text-primary" />
                            <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                        </div>
                    </div>
                    <CardTitle className="flex items-center justify-center gap-3 text-2xl">
                        <Target className="w-6 h-6 text-red-500" />
                        RÉSERVEZ VOTRE STAND
                        <Target className="w-6 h-6 text-red-500" />
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Présentez vos produits et services à un public captivé.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        {standEventData.stand_types.map((st) => (
                            <StandTypeCard
                                key={st.id}
                                standType={st}
                                onSelect={handleSelectStand}
                                isSelected={selectedStand?.id === st.id}
                            />
                        ))}
                    </div>

                    {selectedStand && (
                        <div className="pt-6 border-t border-primary/20 space-y-4">
                            <h3 className="font-bold text-lg">Informations sur votre entreprise</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="company_name">Nom de l'entreprise *</Label>
                                    <Input id="company_name" value={companyInfo.company_name} onChange={e => setCompanyInfo({...companyInfo, company_name: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="contact_person">Personne de contact *</Label>
                                    <Input id="contact_person" value={companyInfo.contact_person} onChange={e => setCompanyInfo({...companyInfo, contact_person: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="contact_email">Email de contact *</Label>
                                    <Input id="contact_email" type="email" value={companyInfo.contact_email} onChange={e => setCompanyInfo({...companyInfo, contact_email: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="contact_phone">Téléphone de contact *</Label>
                                    <Input id="contact_phone" type="tel" value={companyInfo.contact_phone} onChange={e => setCompanyInfo({...companyInfo, contact_phone: e.target.value})} />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <Label htmlFor="business_description">Description de l'activité</Label>
                                    <Textarea id="business_description" value={companyInfo.business_description} onChange={e => setCompanyInfo({...companyInfo, business_description: e.target.value})} />
                                </div>
                            </div>
                            <Button
                                onClick={handlePurchaseConfirmation}
                                disabled={loading}
                                size="lg"
                                className="w-full py-6 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin w-6 h-6" />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                        <span>RÉSERVER LE STAND</span>
                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => { setShowWalletInfo(false); navigate('/packs'); }} />

            <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null })}>
                <AlertDialogContent className="border-2 border-primary/20 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center justify-center gap-2 text-xl text-center">
                            <Crown className="w-6 h-6 text-yellow-500" />
                            Confirmer votre réservation ?
                            <Crown className="w-6 h-6 text-yellow-500" />
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="flex flex-col items-center justify-center text-center p-4 space-y-4">
                                <div className="p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full">
                                    <Store className="w-12 h-12 text-yellow-500" />
                                </div>
                                <p className="text-lg font-medium">
                                    Vous investissez <strong className="text-2xl text-primary">{confirmation.cost}π</strong>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Équivalent à {confirmation.costFcfa?.toLocaleString('fr-FR')} FCFA
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-3">
                        <AlertDialogCancel className="flex-1 border-2">Retour</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmation.onConfirm}
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin w-4 h-4" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Confirmer la réservation
                                    <Sparkles className="w-4 h-4" />
                                </div>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const OwnerView = ({ event, standEventData }) => {
    const { data: rentals, error, loading } = useSWR(standEventData.id, async (standEventId) => {
        const { data, error } = await supabase
            .from('stand_rentals')
            .select('*, user:user_id(full_name, email), stand_type:stand_type_id(name)')
            .eq('stand_event_id', standEventId)
            .order('confirmed_at', { ascending: false });
        if (error) throw error;
        return data;
    });

    const totalRevenuePi = useMemo(() => {
        return rentals?.reduce((sum, rental) => sum + (rental.rental_amount_pi || 0), 0) || 0;
    }, [rentals]);

    const totalStandsRented = standEventData.stand_types.reduce((sum, st) => sum + (st.quantity_rented || 0), 0);
    const totalStandsAvailable = standEventData.stand_types.reduce((sum, st) => sum + st.quantity_available, 0);
    const progress = (totalStandsRented / totalStandsAvailable) * 100;

    return (
        <Card className="glass-effect border-2 border-primary/30 shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                    <Crown className="w-7 h-7 text-yellow-500" />
                    Tableau de Bord des Stands
                    <Crown className="w-7 h-7 text-yellow-500" />
                </CardTitle>
                <CardDescription className="text-base">
                    Supervisez la location des stands de votre événement.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl text-center border border-green-500/20">
                        <p className="text-2xl font-bold text-green-600">{totalStandsRented}</p>
                        <p className="text-sm text-muted-foreground font-medium">Stands Loués</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl text-center border border-yellow-500/20">
                        <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                            {totalRevenuePi} <Coins className="w-5 h-5" />
                        </p>
                        <p className="text-sm text-muted-foreground font-medium">Revenu Total</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-green-600">Progression des locations</span>
                        <span className="text-primary font-bold">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{totalStandsRented}/{totalStandsAvailable} loués</span>
                        <span>{totalStandsAvailable - totalStandsRented} restants</span>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Dernières Réservations ({rentals?.length || 0})
                    </h4>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                            {(rentals || []).map(r => (
                                <div key={r.id} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-lg border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                                    <div>
                                        <p className="font-medium">{r.company_name} ({r.user?.full_name})</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(r.confirmed_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-primary">{r.stand_number} ({r.stand_type.name})</span>
                                        <p className="text-sm text-muted-foreground">{r.rental_amount_pi}π</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-destructive text-sm text-center">Erreur de chargement des réservations</p>
                        </div>
                    )}
                    {!loading && (!rentals || rentals.length === 0) && (
                        <div className="text-center py-8">
                            <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-muted-foreground">Aucune réservation pour le moment</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const useSWR = (key, fetcher) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        if (key) {
            setLoading(true);
            fetcher(key)
                .then(res => setData(res))
                .catch(err => setError(err))
                .finally(() => setLoading(false));
        }
    }, [key, fetcher]);

    return { data, error, loading };
}

const StandRentalInterface = ({ event, standEventData, isUnlocked, isOwner, onRefresh }) => {
    if (!isUnlocked || !standEventData) return null;

    return (
        <div className="mt-8 space-y-8">
            {isOwner ? (
                <OwnerView event={event} standEventData={standEventData} />
            ) : (
                <ParticipantView event={event} standEventData={standEventData} onPurchaseSuccess={onRefresh} />
            )}
        </div>
    );
};

export default StandRentalInterface;