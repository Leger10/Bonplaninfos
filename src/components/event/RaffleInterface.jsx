// Components/RaffleInterface.jsx
import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Coins, Plus, Minus, ShoppingCart, Sparkles, Crown, Target, Users, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
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

// Composant ParticipantView
const ParticipantView = ({ raffleData, eventId, onPurchaseSuccess }) => {
    const { user } = useAuth();
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showWalletInfo, setShowWalletInfo] = useState(false);
    const navigate = useNavigate();
    const [confirmation, setConfirmation] = useState({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });

    const totalCostPi = useMemo(() => {
        return (raffleData?.calculated_price_pi || 0) * quantity;
    }, [raffleData, quantity]);

    const totalCostFcfa = useMemo(() => {
        return (raffleData?.base_price || 0) * quantity;
    }, [raffleData, quantity]);

    const handlePurchaseConfirmation = () => {
        setConfirmation({
            isOpen: true,
            cost: totalCostPi,
            costFcfa: totalCostFcfa,
            onConfirm: handlePurchase,
        });
    };

    const handlePurchase = async () => {
        setConfirmation({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null });
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('participate_in_raffle', {
                p_event_id: eventId,
                p_user_id: user.id,
                p_ticket_quantity: quantity
            });

            if (error) throw error;

            if (data.success) {
                toast({
                    title: "🎉 Participation réussie !",
                    description: `Vous avez acheté ${quantity} ticket(s) pour la tombola. Bonne chance !`,
                    className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                });
                onPurchaseSuccess();
                setQuantity(1);
            } else {
                toast({ title: "Erreur de participation", description: data.message, variant: "destructive" });
                if (data.message.includes('Solde')) {
                    setShowWalletInfo(true);
                }
            }
        } catch (error) {
            toast({ title: "Erreur de participation", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const ticketsLeft = raffleData.total_tickets - raffleData.tickets_sold;
    const progress = (raffleData.tickets_sold / raffleData.total_tickets) * 100;
    const objectiveProgress = (raffleData.tickets_sold / raffleData.min_tickets_required) * 100;

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
                        TENTEZ VOTRE CHANCE !
                        <Target className="w-6 h-6 text-red-500" />
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Achetez des tickets et gagnez des prix incroyables !
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Objectif minimum */}
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <Target className="w-6 h-6 text-orange-500" />
                            <span className="font-bold text-lg">Objectif Minimum</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span className="text-orange-600">
                                    {raffleData.tickets_sold}/{raffleData.min_tickets_required} tickets
                                </span>
                                <span className="text-orange-600 font-bold">{Math.round(objectiveProgress)}%</span>
                            </div>
                            <Progress value={objectiveProgress} className="w-full h-2 bg-orange-200" />
                            <p className="text-xs text-orange-600 text-center">
                                {objectiveProgress >= 100 ? '🎯 Objectif atteint !' : 'Le tirage nécessite cet objectif'}
                            </p>
                        </div>
                    </div>

                    {/* Progression générale */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-green-600">🚀 {raffleData.tickets_sold} tickets vendus</span>
                            <span className="text-primary font-bold">{Math.round(progress)}% complet</span>
                        </div>
                        <Progress value={progress} className="w-full h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>🎯 {ticketsLeft} tickets restants</span>
                            <span>⏰ Dépêchez-vous !</span>
                        </div>
                    </div>

                    {/* Prix du ticket */}
                    <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Ticket de Tombola</h3>
                                <p className="text-sm text-muted-foreground">Prix par ticket</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-primary flex items-center gap-1">
                                    {raffleData.calculated_price_pi} <Coins className="w-5 h-5" />
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {raffleData.base_price.toLocaleString()} FCFA
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                disabled={quantity <= 1}
                                className="rounded-full border-2"
                            >
                                <Minus className="w-4 h-4" />
                            </Button>
                            <span className="font-bold text-xl w-12 text-center bg-white/20 rounded-lg py-1">
                                {quantity}
                            </span>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => setQuantity(q => Math.min(ticketsLeft, q + 1))}
                                disabled={quantity >= ticketsLeft}
                                className="rounded-full border-2"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Panier */}
                    <div className="pt-6 border-t border-primary/20 space-y-4">
                        <div className="text-center p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                            <p className="font-bold text-lg flex items-center justify-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                VOTRE PANIER
                                <ShoppingCart className="w-5 h-5" />
                            </p>
                            <div className="flex justify-between items-center mt-3 font-bold text-xl">
                                <span>Total {quantity} ticket(s)</span>
                                <div className="text-right">
                                    <span className="flex items-center justify-end gap-2 text-primary">
                                        {totalCostPi} <Coins className="w-6 h-6" />
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({totalCostFcfa.toLocaleString()} FCFA)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handlePurchaseConfirmation}
                            disabled={loading || quantity === 0}
                            size="lg"
                            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin w-6 h-6" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 animate-pulse" />
                                    <span>PARTICIPER</span>
                                    <Sparkles className="w-6 h-6 animate-pulse" />
                                </div>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => { setShowWalletInfo(false); navigate('/packs'); }} />

            <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null })}>
                <AlertDialogContent className="border-2 border-primary/20 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center justify-center gap-2 text-xl text-center">
                            <Crown className="w-6 h-6 text-yellow-500" />
                            Confirmer votre participation ?
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

// Composant OwnerView avec tableau de bord amélioré
const OwnerView = ({ raffleData, eventId, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [participantsLoading, setParticipantsLoading] = useState(true);

    // Fonction pour lancer le tirage manuel
    const handleManualDraw = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('conduct_raffle_draw', {
                p_raffle_event_id: raffleData.id
            });

            if (error) throw error;

            if (data.success) {
                toast({
                    title: "🎉 Tirage effectué !",
                    description: data.message,
                    className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                });
            } else {
                if (data.action === 'reported') {
                    toast({
                        title: "⏳ Tirage reporté",
                        description: data.message,
                        className: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                    });
                } else {
                    toast({
                        title: "Information",
                        description: data.message,
                        variant: "default"
                    });
                }
            }
            onRefresh();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Charger les participants
    useEffect(() => {
        const fetchParticipants = async () => {
            const { data, error } = await supabase
                .from('raffle_participants')
                .select('*, user:user_id(full_name, email)')
                .eq('event_id', eventId)
                .order('participated_at', { ascending: false });

            if (!error) setParticipants(data || []);
            setParticipantsLoading(false);
        };
        fetchParticipants();
    }, [eventId]);

    const totalRevenuePi = useMemo(() => {
        return (raffleData?.tickets_sold || 0) * (raffleData?.calculated_price_pi || 0);
    }, [raffleData]);

    const progress = (raffleData.tickets_sold / raffleData.total_tickets) * 100;
    const objectiveProgress = (raffleData.tickets_sold / raffleData.min_tickets_required) * 100;

    const canDraw = new Date(raffleData.draw_date) <= new Date() && 
                   !raffleData.is_draw_conducted && 
                   !raffleData.is_postponed;

    const isObjectiveMet = raffleData.tickets_sold >= raffleData.min_tickets_required;

    return (
        <div className="space-y-6">
            <Card className="glass-effect border-2 border-primary/30 shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                        <Crown className="w-7 h-7 text-yellow-500" />
                        Tableau de Bord Tombola
                        <Crown className="w-7 h-7 text-yellow-500" />
                    </CardTitle>
                    <CardDescription className="text-base">
                        Supervisez les ventes et gérez le tirage de votre tombola
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Statistiques principales */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl text-center border border-green-500/20">
                            <p className="text-2xl font-bold text-green-600">{raffleData.tickets_sold}</p>
                            <p className="text-sm text-muted-foreground font-medium">🎟️ Tickets Vendus</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl text-center border border-yellow-500/20">
                            <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                                {totalRevenuePi} <Coins className="w-5 h-5" />
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">💰 Revenu Total</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl text-center border border-blue-500/20">
                            <p className="text-2xl font-bold text-blue-600">
                                {raffleData.min_tickets_required}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">🎯 Objectif Minimum</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl text-center border border-purple-500/20">
                            <p className="text-2xl font-bold text-purple-600">
                                {participants.length}
                            </p>
                            <p className="text-sm text-muted-foreground font-medium">👥 Participants</p>
                        </div>
                    </div>

                    {/* Objectif minimum */}
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <Target className="w-6 h-6 text-orange-500" />
                            <span className="font-bold text-lg">Progression vers l'objectif minimum</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span className="text-orange-600">
                                    {raffleData.tickets_sold}/{raffleData.min_tickets_required} tickets
                                </span>
                                <span className={`font-bold ${isObjectiveMet ? 'text-green-600' : 'text-orange-600'}`}>
                                    {Math.round(objectiveProgress)}%
                                </span>
                            </div>
                            <Progress value={objectiveProgress} className="w-full h-3 bg-orange-200" />
                            <p className={`text-sm text-center font-medium ${isObjectiveMet ? 'text-green-600' : 'text-orange-600'}`}>
                                {isObjectiveMet ? '🎯 Objectif atteint - Tirage possible !' : '⚠️ Objectif non atteint - Tirage conditionnel'}
                            </p>
                        </div>
                    </div>

                    {/* Progression générale */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-green-600">Progression des ventes</span>
                            <span className="text-primary font-bold">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="w-full h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{raffleData.tickets_sold}/{raffleData.total_tickets} vendus</span>
                            <span>{raffleData.total_tickets - raffleData.tickets_sold} restants</span>
                        </div>
                    </div>

                    {/* Bouton de tirage */}
                    {canDraw && (
                        <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                            <Button
                                onClick={handleManualDraw}
                                disabled={loading}
                                size="lg"
                                className={`w-full py-6 text-lg font-bold ${
                                    isObjectiveMet
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                                }`}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin w-6 h-6" />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Crown className="w-6 h-6" />
                                        {isObjectiveMet ? 'LANCER LE TIRAGE' : 'TENTER LE TIRAGE'}
                                        <Crown className="w-6 h-6" />
                                    </div>
                                )}
                            </Button>
                            {!isObjectiveMet && (
                                <p className="text-sm text-yellow-600 mt-2">
                                    ⚠️ L'objectif n'est pas atteint. Le tirage sera probablement reporté.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Statut du tirage */}
                    {raffleData.is_postponed && (
                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <span className="font-semibold">Tirage reporté</span>
                            </div>
                            <p className="text-sm text-orange-700">
                                {raffleData.postponed_reason}
                            </p>
                            <p className="text-sm text-orange-600 mt-1">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Nouvelle date: {new Date(raffleData.postponed_to).toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                    )}

                    {raffleData.is_draw_conducted && raffleData.winner_user_id && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="w-5 h-5 text-green-500" />
                                <span className="font-semibold">Gagnant désigné !</span>
                            </div>
                            <p className="text-sm text-green-700">
                                Ticket gagnant: <strong>#{raffleData.winning_ticket_number}</strong>
                            </p>
                            <p className="text-sm text-green-600">
                                Tirage effectué le: {new Date(raffleData.draw_conducted_at).toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                    )}

                    {/* Participants */}
                    <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            Derniers Participants ({participants.length})
                        </h4>
                        {participantsLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                                {participants.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-lg border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                                        <div>
                                            <p className="font-medium">{p.user?.full_name || 'Anonyme'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(p.participated_at).toLocaleString('fr-FR')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary">Ticket #{p.ticket_number}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!participantsLoading && participants.length === 0 && (
                            <div className="text-center py-8">
                                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium text-muted-foreground">Aucun participant pour le moment</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Composant principal
const RaffleInterface = ({ raffleData, eventId, isUnlocked, isOwner, onRefresh }) => {
    if (!isUnlocked || !raffleData) return null;

    return (
        <div className="mt-8 space-y-8">
            {isOwner ? (
                <OwnerView raffleData={raffleData} eventId={eventId} onRefresh={onRefresh} />
            ) : (
                <ParticipantView raffleData={raffleData} eventId={eventId} onPurchaseSuccess={onRefresh} />
            )}
        </div>
    );
};

export default RaffleInterface;