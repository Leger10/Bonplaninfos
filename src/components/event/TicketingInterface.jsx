import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Coins, Plus, Minus, ShoppingCart, Sparkles, Info, Crown, Zap, Target, Users, TrendingUp, Star, Gift } from 'lucide-react';
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

const TicketTypeCard = ({ ticketType, quantity, onQuantityChange, index }) => {
    const isAvailable = ticketType.quantity_available > (ticketType.tickets_sold || 0);
    const availableTickets = ticketType.quantity_available - (ticketType.tickets_sold || 0);
    const canAdd = isAvailable && quantity < availableTickets;

    const cardGradients = [
        'from-blue-500/10 to-cyan-500/10 border-blue-500/30',
        'from-purple-500/10 to-pink-500/10 border-purple-500/30',
        'from-emerald-500/10 to-teal-500/10 border-emerald-500/30',
        'from-orange-500/10 to-red-500/10 border-orange-500/30'
    ];

    const iconColors = ['text-blue-500', 'text-purple-500', 'text-emerald-500', 'text-orange-500'];
    const gradient = cardGradients[index % cardGradients.length];
    const iconColor = iconColors[index % iconColors.length];

    const progress = ((ticketType.tickets_sold || 0) / ticketType.quantity_available) * 100;

    return (
        <div className={`bg-gradient-to-br ${gradient} border-2 rounded-xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-lg group ${!isAvailable && 'opacity-60'}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/20 backdrop-blur-sm ${iconColor}`}>
                        <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                            {ticketType.name}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3" />
                            {availableTickets} place(s) disponible(s)
                        </p>
                    </div>
                </div>
                <Badge className={`text-xs font-bold ${isAvailable ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                    {isAvailable ? '🎟️ DISPO' : '❌ COMPLET'}
                </Badge>
            </div>

            {/* Barre de progression */}
            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-green-600">{availableTickets} restant(s)</span>
                    <span className="text-muted-foreground">{ticketType.tickets_sold || 0}/{ticketType.quantity_available} vendu(s)</span>
                </div>
                <Progress value={progress} className="h-2 bg-muted/50" />
            </div>

            {/* Features */}
            {ticketType.features && ticketType.features.length > 0 && (
                <div className="mb-4 space-y-2">
                    {ticketType.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                            <Sparkles className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Prix et sélection */}
            <div className="flex items-center justify-between pt-3 border-t border-white/20">
                <div className="text-center">
                    <p className="text-2xl font-bold text-primary flex items-center gap-1">
                        {ticketType.price_coins} <Coins className="w-5 h-5" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {ticketType.price.toLocaleString()} FCFA
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onQuantityChange(ticketType.id, -1)}
                        disabled={quantity === 0}
                        className="rounded-full border-2"
                    >
                        <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-bold text-lg w-8 text-center bg-white/20 rounded-lg py-1">
                        {quantity}
                    </span>
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onQuantityChange(ticketType.id, 1)}
                        disabled={!canAdd}
                        className="rounded-full border-2"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Message d'urgence si peu de tickets */}
            {isAvailable && availableTickets <= 5 && (
                <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-xs text-orange-700 text-center font-medium flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3" />
                        Plus que {availableTickets} place(s) à ce tarif !
                    </p>
                </div>
            )}
        </div>
    );
};

const ParticipantView = ({ event, ticketingData, ticketTypes, onPurchaseSuccess }) => {
    const { user } = useAuth();
    const [cart, setCart] = useState({});
    const [loading, setLoading] = useState(false);
    const [showWalletInfo, setShowWalletInfo] = useState(false);
    const navigate = useNavigate();
    const [confirmation, setConfirmation] = useState({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });

    const handleQuantityChange = (ticketTypeId, change) => {
        setCart(prev => {
            const currentQty = prev[ticketTypeId] || 0;
            const newQty = Math.max(0, currentQty + change);
            const finalQty = { ...prev, [ticketTypeId]: newQty };
            return Object.fromEntries(Object.entries(finalQty).filter(([_, v]) => v > 0));
        });
    };

    const { totalPi, totalFcfa, totalTickets } = useMemo(() => {
        return Object.entries(cart).reduce((acc, [ticketTypeId, quantity]) => {
            if (quantity > 0) {
                const ticketType = ticketTypes.find(tt => tt.id === ticketTypeId);
                if (ticketType) {
                    acc.totalPi += ticketType.price_coins * quantity;
                    acc.totalFcfa += ticketType.price * quantity;
                    acc.totalTickets += quantity;
                }
            }
            return acc;
        }, { totalPi: 0, totalFcfa: 0, totalTickets: 0 });
    }, [cart, ticketTypes]);

    const handlePurchaseConfirmation = () => {
        setConfirmation({
            isOpen: true,
            cost: totalPi,
            costFcfa: totalFcfa,
            onConfirm: handlePurchase,
        });
    };

    const handlePurchase = async () => {
        setConfirmation({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('purchase_tickets', {
                p_user_id: user.id,
                p_event_id: event.id,
                p_cart: cart
            });

            if (error) throw error;

            if (data.success) {
                toast({
                    title: "🎉 Félicitations !",
                    description: `Vous avez réservé ${totalTickets} place(s) ! Un email de confirmation vous a été envoyé.`,
                    className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                });
                onPurchaseSuccess();
                setCart({});
            } else {
                toast({ title: "Erreur d'achat", description: data.message, variant: "destructive" });
                if (data.message.includes('Solde')) {
                    setShowWalletInfo(true);
                }
            }
        } catch (error) {
            toast({ title: "Erreur d'achat", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const totalTicketsSold = ticketTypes.reduce((sum, tt) => sum + (tt.tickets_sold || 0), 0);
    const totalTicketsAvailable = ticketTypes.reduce((sum, tt) => sum + tt.quantity_available, 0);
    const globalProgress = (totalTicketsSold / totalTicketsAvailable) * 100;

    return (
        <>
            <Card className="glass-effect border-2 border-primary/20 shadow-xl">
                <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-3">
                        <div className="relative">
                            <Ticket className="w-10 h-10 text-primary" />
                            <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                        </div>
                    </div>
                    <CardTitle className="flex items-center justify-center gap-3 text-2xl">
                        <Target className="w-6 h-6 text-red-500" />
                        RÉSERVEZ VOS PLACES MAINTENANT !
                        <Target className="w-6 h-6 text-red-500" />
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Ne manquez pas cet événement exceptionnel - Les places partent vite !
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Progression globale */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-green-600">🚀 {totalTicketsSold} places déjà vendues</span>
                            <span className="text-primary font-bold">{Math.round(globalProgress)}% complet</span>
                        </div>
                        <Progress value={globalProgress} className="w-full h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>🎯 {totalTicketsAvailable - totalTicketsSold} places restantes</span>
                            <span>⏰ Dépêchez-vous !</span>
                        </div>
                    </div>

                    {/* Types de billets */}
                    <div className="grid grid-cols-1 gap-4">
                        {ticketTypes.map((tt, index) => (
                            <TicketTypeCard
                                key={tt.id}
                                ticketType={tt}
                                quantity={cart[tt.id] || 0}
                                onQuantityChange={handleQuantityChange}
                                index={index}
                            />
                        ))}
                    </div>

                    {/* Panier */}
                    {totalTickets > 0 && (
                        <div className="pt-6 border-t border-primary/20 space-y-4">
                            <div className="text-center p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                                <p className="font-bold text-lg flex items-center justify-center gap-2">
                                    <ShoppingCart className="w-5 h-5" />
                                    VOTRE SÉLECTION
                                    <ShoppingCart className="w-5 h-5" />
                                </p>
                                <div className="flex justify-between items-center mt-3 font-bold text-xl">
                                    <span>Total {totalTickets} place(s)</span>
                                    <div className="text-right">
                                        <span className="flex items-center justify-end gap-2 text-primary">
                                            {totalPi} <Coins className="w-6 h-6" />
                                        </span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            ({totalFcfa.toLocaleString()} FCFA)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handlePurchaseConfirmation}
                                disabled={loading || totalTickets === 0}
                                size="lg"
                                className="w-full py-6 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin w-6 h-6" />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                        <span>ACHETER MAINTENANT</span>
                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                    </div>
                                )}
                            </Button>

                            {/* Message d'encouragement */}
                            <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <p className="text-sm font-medium flex items-center justify-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    Vous allez vivre un moment inoubliable !
                                    <Star className="w-4 h-4 text-yellow-500" />
                                </p>
                            </div>
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
                                    <Ticket className="w-12 h-12 text-yellow-500" />
                                </div>
                                <p className="text-lg font-medium">
                                    Vous investissez <strong className="text-2xl text-primary">{confirmation.cost}π</strong>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Équivalent à {confirmation.costFcfa?.toLocaleString('fr-FR')} FCFA
                                </p>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm w-full">
                                    <div className="flex items-start gap-2">
                                        <Gift className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <div className="text-left">
                                            <p className="font-medium text-green-900">✨ Expérience garantie !</p>
                                            <p className="text-green-700 mt-1">
                                                Votre réservation vous garantit une place pour cet événement unique.
                                                Vous soutenez également les organisateurs et la communauté BonPlanInfos.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 w-full text-xs">
                                    <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                                        <p className="font-semibold text-blue-700">🎯 Places réservées</p>
                                        <p className="text-blue-600">{totalTickets}</p>
                                    </div>
                                    <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
                                        <p className="font-semibold text-purple-700">🌟 Soutien communauté</p>
                                        <p className="text-purple-600">Actif</p>
                                    </div>
                                </div>
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
                                    Confirmer l'achat
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

const OwnerView = ({ event, ticketingData, ticketTypes }) => {
    const { data: orders, error, loading } = useSWR(event.id, async (eventId) => {
        const { data, error } = await supabase
            .from('ticket_orders')
            .select('*, user:profiles(full_name, email)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    });

    const totalRevenuePi = useMemo(() => {
        return orders?.reduce((sum, order) => sum + (order.status === 'completed' ? order.total_amount_coins : 0), 0) || 0;
    }, [orders]);

    const totalTicketsSold = ticketTypes.reduce((sum, tt) => sum + (tt.tickets_sold || 0), 0);
    const totalTicketsAvailable = ticketTypes.reduce((sum, tt) => sum + tt.quantity_available, 0);
    const progress = (totalTicketsSold / totalTicketsAvailable) * 100;

    return (
        <Card className="glass-effect border-2 border-primary/30 shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                    <Crown className="w-7 h-7 text-yellow-500" />
                    Tableau de Bord Billetterie
                    <Crown className="w-7 h-7 text-yellow-500" />
                </CardTitle>
                <CardDescription className="text-base">
                    Supervisez les ventes de votre événement
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Statistiques */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl text-center border border-green-500/20">
                        <p className="text-2xl font-bold text-green-600">{totalTicketsSold}</p>
                        <p className="text-sm text-muted-foreground font-medium">🎟️ Places Vendues</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl text-center border border-yellow-500/20">
                        <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                            {totalRevenuePi} <Coins className="w-5 h-5" />
                        </p>
                        <p className="text-sm text-muted-foreground font-medium">💰 Revenu Total</p>
                    </div>
                </div>

                {/* Progression globale */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-green-600">Progression des ventes</span>
                        <span className="text-primary font-bold">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{totalTicketsSold}/{totalTicketsAvailable} vendus</span>
                        <span>{totalTicketsAvailable - totalTicketsSold} restants</span>
                    </div>
                </div>

                {/* Dernières commandes */}
                <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Dernières Réservations ({orders?.length || 0})
                    </h4>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                            {(orders || []).map(o => (
                                <div key={o.id} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-lg border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                                    <div>
                                        <p className="font-medium">{o.user?.full_name || 'Anonyme'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(o.created_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-primary">{o.ticket_count} place(s)</span>
                                        <p className="text-sm text-muted-foreground">{o.total_amount_coins}π</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-destructive text-sm text-center">Erreur de chargement des commandes</p>
                        </div>
                    )}
                    {!loading && (!orders || orders.length === 0) && (
                        <div className="text-center py-8">
                            <Ticket className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-muted-foreground">Aucune réservation pour le moment</p>
                            <p className="text-sm text-muted-foreground mt-1">Les premières places attendent leurs propriétaires !</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const TicketingInterface = ({ event, ticketingData, ticketTypes, isUnlocked, isOwner, onRefresh }) => {
    if (!isUnlocked) return null;

    if (!ticketingData || !ticketTypes) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
                <span className="text-lg">Chargement des données de billetterie...</span>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-8">
            {/* En-tête motivante */}
            {!isOwner && (
                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                        🎊 RÉSERVEZ VOTRE EXPÉRIENCE UNIQUE 🎊
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Ne laissez pas passer cette occasion exceptionnelle - Rejoignez-nous pour un moment inoubliable !
                    </p>
                    <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">🌟 Expérience premium</span>
                        <span className="flex items-center gap-1">🎯 Networking exclusif</span>
                        <span className="flex items-center gap-1">💫 Moments magiques</span>
                    </div>
                </div>
            )}

            {/* Interface principale */}
            {isOwner ? (
                <OwnerView event={event} ticketingData={ticketingData} ticketTypes={ticketTypes} />
            ) : (
                <ParticipantView event={event} ticketingData={ticketingData} ticketTypes={ticketTypes} onPurchaseSuccess={onRefresh} />
            )}
        </div>
    );
};

export default TicketingInterface;




// import React, { useState, useMemo, useEffect } from 'react';
// import { supabase } from '@/lib/customSupabaseClient';
// import { useAuth } from '@/contexts/SupabaseAuthContext';
// import { toast } from '@/components/ui/use-toast';
// import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Loader2, Ticket, Coins, Plus, Minus, ShoppingCart, Check, Download } from 'lucide-react';
// import { Badge } from '@/components/ui/badge';
// import { generateTicketPDF } from '@/utils/generateTicketPDF';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// const TicketingInterface = ({ event, ticketingData, ticketTypes, isUnlocked, onRefresh }) => {
//     const { user } = useAuth();
//     const [cart, setCart] = useState({});
//     const [loading, setLoading] = useState(false);
//     const [purchasedTickets, setPurchasedTickets] = useState(null);
//     const [showSuccessModal, setShowSuccessModal] = useState(false);

//     // Safe logging
//     useEffect(() => {
//         if (ticketTypes) {
//             console.log("TicketingInterface rendered with types:", ticketTypes.length);
//         } else {
//             console.log("TicketingInterface rendered with no types");
//         }
//     }, [ticketTypes]);

//     // Determine Active Price (J-0 vs J-1)
//     const isPresale = useMemo(() => {
//         if (!event || !event.event_date) return false;
//         const eventDate = new Date(event.event_date);
//         const now = new Date();
//         return now < eventDate; 
//     }, [event]);

//     const handleQuantityChange = (typeId, delta) => {
//         setCart(prev => {
//             const current = prev[typeId] || 0;
//             const next = Math.max(0, current + delta);
//             const newCart = { ...prev, [typeId]: next };
//             if (next === 0) delete newCart[typeId];
//             return newCart;
//         });
//     };

//     const getActivePrice = (type) => {
//         if (!type) return 0;
//         if (isPresale && type.presale_price_pi && type.presale_price_pi > 0) return type.presale_price_pi;
//         return type.price_coins || type.price_pi || 0; 
//     };

//     const cartTotal = useMemo(() => {
//         if (!ticketTypes) return 0;
//         const total = Object.entries(cart).reduce((sum, [id, qty]) => {
//             const type = ticketTypes.find(t => t.id === id);
//             if (!type) return sum;
//             return sum + (getActivePrice(type) * qty);
//         }, 0);
//         return total;
//     }, [cart, ticketTypes, isPresale]);

//     const handlePurchase = async () => {
//         if (!user) return toast({ title: "Connexion requise", variant: "destructive" });
//         setLoading(true);
//         try {
//             const { data, error } = await supabase.rpc('purchase_tickets_v2', {
//                 p_user_id: user.id,
//                 p_event_id: event.id,
//                 p_cart: cart
//             });

//             if (error) throw error;
//             if (!data.success) throw new Error(data.message);

//             console.log("Purchase successful. Revenue split: 95% organizer, 5% platform.");

//             let ticketCounter = 0;
//             const newTickets = Object.entries(cart).flatMap(([typeId, qty]) => {
//                 const type = ticketTypes.find(t => t.id === typeId);
//                 if (!type) return [];
//                 const typeTickets = [];
//                 for(let i=0; i<qty; i++) {
//                     typeTickets.push({
//                         type_name: type.name,
//                         price: getActivePrice(type),
//                         ticket_number: data.ticket_codes?.[ticketCounter] || `TICKET-${Date.now()}-${ticketCounter}`
//                     });
//                     ticketCounter++;
//                 }
//                 return typeTickets;
//             });
            
//             setPurchasedTickets(newTickets);
//             setShowSuccessModal(true);
//             setCart({});
//             if (onRefresh) onRefresh();

//         } catch (error) {
//             console.error("Purchase error:", error);
//             toast({ title: "Erreur d'achat", description: error.message, variant: "destructive" });
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleDownloadPDF = () => {
//         if (purchasedTickets) {
//             generateTicketPDF(event, purchasedTickets, user);
//             toast({ title: "Téléchargement", description: "Votre PDF a été généré." });
//         }
//     };

//     if (!isUnlocked) return null;

//     return (
//         <div className="space-y-6 animate-in fade-in duration-500">
//             <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-lg">
//                 <h2 className="text-xl font-bold flex items-center gap-2">
//                     <Ticket className="text-primary" /> Billetterie
//                 </h2>
//                 {isPresale ? (
//                     <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 animate-pulse border-yellow-300">
//                         🌟 Tarif Prévente Actif (J-1)
//                     </Badge>
//                 ) : (
//                     <Badge variant="outline" className="bg-background">Tarif Jour J</Badge>
//                 )}
//             </div>

//             {!ticketTypes || ticketTypes.length === 0 ? (
//                 <div className="text-center py-8 text-muted-foreground">
//                     Aucun billet disponible pour le moment.
//                 </div>
//             ) : (
//                 <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
//                     {ticketTypes.map(type => {
//                         const price = getActivePrice(type);
//                         const regularPrice = type.price_coins || type.price_pi || 0;
//                         const available = (type.quantity_available || 0) - (type.quantity_sold || 0);
//                         const isSoldOut = available <= 0;
                        
//                         return (
//                             <Card key={type.id} className={`relative overflow-hidden border-l-4 border-l-primary transition-all hover:shadow-md ${isSoldOut ? 'opacity-70' : ''}`}>
//                                 <CardContent className="p-5 flex flex-col h-full justify-between">
//                                     <div className="flex justify-between items-start mb-4">
//                                         <div className="space-y-1">
//                                             <h3 className="font-bold text-lg">{type.name}</h3>
//                                             <p className="text-sm text-muted-foreground line-clamp-2">{type.description || 'Accès standard'}</p>
//                                         </div>
//                                         <div className="text-right shrink-0 ml-2">
//                                             {isPresale && regularPrice > price && (
//                                                 <span className="text-xs text-muted-foreground line-through block">{regularPrice} π</span>
//                                             )}
//                                             <div className="font-bold text-xl text-primary flex items-center justify-end gap-1">
//                                                 {price} <Coins className="w-4 h-4" />
//                                             </div>
//                                         </div>
//                                     </div>
                                    
//                                     <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
//                                         <div className="text-xs font-medium flex items-center text-muted-foreground">
//                                             <Ticket className="w-3 h-3 mr-1" />
//                                             {isSoldOut ? <span className="text-destructive">Épuisé</span> : <span>{available} dispos</span>}
//                                         </div>

//                                         <div className="flex items-center gap-3">
//                                             <Button 
//                                                 size="icon" variant="outline" className="h-8 w-8"
//                                                 onClick={() => handleQuantityChange(type.id, -1)}
//                                                 disabled={!cart[type.id] || isSoldOut}
//                                             >
//                                                 <Minus className="w-3 h-3" />
//                                             </Button>
//                                             <span className="w-8 text-center font-bold text-lg">{cart[type.id] || 0}</span>
//                                             <Button 
//                                                 size="icon" className="h-8 w-8"
//                                                 onClick={() => handleQuantityChange(type.id, 1)}
//                                                 disabled={available <= (cart[type.id] || 0) || isSoldOut}
//                                             >
//                                                 <Plus className="w-3 h-3" />
//                                             </Button>
//                                         </div>
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                         );
//                     })}
//                 </div>
//             )}

//             {/* Cart Summary */}
//             {cartTotal > 0 && (
//                 <Card className="sticky bottom-4 shadow-2xl border-t-4 border-t-primary animate-in slide-in-from-bottom-4 z-50 bg-card/95 backdrop-blur-md">
//                     <CardContent className="p-4">
//                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                             <div className="flex items-center gap-4">
//                                 <div className="bg-primary/10 p-3 rounded-full">
//                                     <ShoppingCart className="w-6 h-6 text-primary" />
//                                 </div>
//                                 <div>
//                                     <p className="text-sm text-muted-foreground">Total à payer</p>
//                                     <div className="flex items-baseline gap-2">
//                                         <p className="text-2xl font-bold text-foreground">{cartTotal} π</p>
//                                         <span className="text-xs text-muted-foreground">({(cartTotal * 10).toLocaleString()} FCFA)</span>
//                                     </div>
//                                 </div>
//                             </div>
//                             <Button size="lg" onClick={handlePurchase} disabled={loading} className="w-full sm:w-auto px-8 font-bold shadow-lg hover:shadow-xl transition-all">
//                                 {loading ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2 w-5 h-5" />}
//                                 Confirmer l'achat
//                             </Button>
//                         </div>
//                     </CardContent>
//                 </Card>
//             )}

//             {/* Success Modal with PDF Download */}
//             <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
//                 <DialogContent className="sm:max-w-md text-center">
//                     <DialogHeader>
//                         <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
//                             <Check className="w-8 h-8 text-green-600" />
//                         </div>
//                         <DialogTitle className="text-xl font-bold text-green-700">Félicitations !</DialogTitle>
//                         <DialogDescription>
//                             Vos billets ont été achetés avec succès.
//                         </DialogDescription>
//                     </DialogHeader>
//                     <div className="py-6 space-y-4">
//                         <div className="bg-muted p-4 rounded-lg text-left">
//                             <h4 className="font-semibold mb-2 text-sm">Récapitulatif :</h4>
//                             <ul className="text-sm space-y-1">
//                                 {purchasedTickets?.map((t, i) => (
//                                     <li key={i} className="flex justify-between">
//                                         <span>{t.type_name}</span>
//                                         <span className="font-mono">{t.ticket_number}</span>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </div>
                        
//                         <div className="flex flex-col gap-3">
//                             <Button onClick={handleDownloadPDF} className="w-full bg-green-600 hover:bg-green-700 text-white py-6">
//                                 <div className="flex flex-col items-center">
//                                     <div className="flex items-center">
//                                         <Download className="w-5 h-5 mr-2" /> Télécharger mes tickets (PDF)
//                                     </div>
//                                     <span className="text-[10px] font-normal opacity-90">Format validé pour impression</span>
//                                 </div>
//                             </Button>
//                             <Button variant="outline" onClick={() => setShowSuccessModal(false)} className="w-full">
//                                 Fermer
//                             </Button>
//                         </div>
//                     </div>
//                 </DialogContent>
//             </Dialog>
//         </div>
//     );
// };

// export default TicketingInterface;