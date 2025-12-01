import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Ticket, Coins, Users, AlertCircle, CheckCircle, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TicketPurchaseInterface = ({ eventData, ticketType, onPurchaseSuccess }) => {
    const { user } = useAuth();
    const { userProfile, forceRefreshUserProfile } = useData();
    const { toast } = useToast();
    const navigate = useNavigate();
    
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    // Calculs des coûts et répartition
    const totalCost = useMemo(() => {
        return (ticketType?.price_pi || 0) * quantity;
    }, [ticketType, quantity]);

    const platformFee = useMemo(() => Math.floor(totalCost * 0.05), [totalCost]);
    const organizerAmount = useMemo(() => totalCost - platformFee, [totalCost, platformFee]);

    const hasSufficientBalance = (userProfile?.coin_balance || 0) >= totalCost;
    const availableTickets = (ticketType?.quantity_available || 0) - (ticketType?.quantity_sold || 0);
    const progressPercentage = ((ticketType?.quantity_sold || 0) / (ticketType?.quantity_available || 1)) * 100;

    const handlePurchase = async () => {
        if (!user) {
            toast({
                title: "Non connecté",
                description: "Veuillez vous connecter pour acheter des billets",
                variant: "destructive"
            });
            return;
        }

        if (!hasSufficientBalance) {
            navigate('/packs');
            return;
        }

        if (availableTickets < quantity) {
            toast({
                title: "Billets insuffisants",
                description: `Il ne reste que ${availableTickets} billet(s) disponible(s)`,
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            console.log("🎟️ Appel achat billets RPC...", {
                user_id: user.id,
                event_id: eventData?.id,
                ticket_type_id: ticketType?.id,
                quantity: quantity
            });

            const { data, error } = await supabase.rpc('purchase_event_tickets_final', {
                p_user_id: user.id,
                p_event_id: eventData.id,
                p_ticket_type_id: ticketType.id,
                p_quantity: quantity
            });

            if (error) throw new Error(error.message);

            if (data?.success) {
                toast({
                    title: "🎟️ Achat réussi !",
                    description: (
                        <div>
                            <p>{data.message}</p>
                            <p className="text-sm mt-1">
                                <strong>Codes de vos billets :</strong> {data.ticket_codes?.join(', ')}
                            </p>
                            <p className="text-sm mt-1">
                                Un email de confirmation vous a été envoyé.
                            </p>
                            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs text-blue-700">
                                    <strong>Répartition :</strong> {data.organizer_amount}π pour l'organisateur (95%) + {data.platform_fee}π frais plateforme (5%)
                                </p>
                            </div>
                        </div>
                    ),
                    className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white",
                    duration: 6000
                });

                await forceRefreshUserProfile();
                if (onPurchaseSuccess) onPurchaseSuccess();
                setQuantity(1);
            } else {
                throw new Error(data?.message || "Erreur inconnue");
            }
        } catch (err) {
            console.error("💥 Erreur achat billets :", err);
            toast({
                title: "Erreur d'achat",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (!eventData || !ticketType) {
        return (
            <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Données non disponibles</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Carte d'information du billet */}
            <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Ticket className="w-6 h-6 text-primary" />
                        {ticketType.name}
                    </CardTitle>
                    <CardDescription>
                        {ticketType.description || "Billet d'accès à l'événement"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Coins className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                            <p className="text-lg font-bold text-blue-700">{ticketType.price_pi}π</p>
                            <p className="text-sm text-blue-600">Prix par billet</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                            <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
                            <p className="text-lg font-bold text-green-700">{availableTickets}</p>
                            <p className="text-sm text-green-600">Billets disponibles</p>
                        </div>
                    </div>

                    {/* Barre de progression */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Billets vendus</span>
                            <span className="text-muted-foreground">
                                {ticketType.quantity_sold || 0} / {ticketType.quantity_available}
                            </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            {/* Carte du solde utilisateur */}
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <Coins className="w-5 h-5 text-blue-100" />
                        Mon Portefeuille
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white mb-2">
                            {userProfile?.coin_balance || 0}π
                        </div>
                        <div className="text-sm font-medium text-blue-100">
                            Solde total disponible
                        </div>
                    </div>
                    {!hasSufficientBalance && (
                        <Button
                            onClick={() => navigate('/packs')}
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
                            size="sm"
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Recharger mes π
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Interface d'achat */}
            <Card className="border-2 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-primary" />
                        Acheter des billets
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        {/* Sélection de la quantité */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-lg border-2 border-primary/20">
                            <span className="font-semibold text-primary">Quantité de billets</span>
                            <div className="flex items-center space-x-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    disabled={quantity <= 1 || loading}
                                    className="w-10 h-10 p-0 border-2 border-primary/40 text-primary hover:bg-primary hover:text-white"
                                >
                                    -
                                </Button>
                                <span className="text-xl font-bold w-12 text-center text-primary bg-primary/10 py-2 rounded-lg">
                                    {quantity}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQuantity(q => Math.min(availableTickets, q + 1))}
                                    disabled={quantity >= availableTickets || loading}
                                    className="w-10 h-10 p-0 border-2 border-primary/40 text-primary hover:bg-primary hover:text-white"
                                >
                                    +
                                </Button>
                            </div>
                        </div>

                        {/* Coût total */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-blue-700">Coût total :</span>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-600 flex items-center gap-1">
                                        {totalCost} <Coins className="w-5 h-5" />
                                    </div>
                                    <div className="text-sm text-blue-500">
                                        {ticketType.price_pi}π × {quantity} billet{quantity > 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Détail de la répartition 95%/5% */}
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                            <h4 className="font-semibold text-green-800 mb-3 text-center">
                                Détail de la répartition 95%/5%
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-green-700">Pour l'organisateur (95%) :</span>
                                    <span className="text-sm font-bold text-green-700">{organizerAmount}π</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-blue-700">Frais plateforme (5%) :</span>
                                    <span className="text-sm font-bold text-blue-700">{platformFee}π</span>
                                </div>
                                <div className="border-t border-green-200 pt-2 mt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-700">Total débité :</span>
                                        <span className="text-sm font-bold text-gray-700">{totalCost}π</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alertes */}
                        {!hasSufficientBalance && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-3 text-red-700">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold">Solde insuffisant</p>
                                        <p className="text-sm">
                                            Vous avez {userProfile?.coin_balance || 0}π, mais il vous faut {totalCost}π
                                        </p>
                                        <p className="text-sm mt-1">
                                            <Button 
                                                variant="link" 
                                                className="p-0 text-red-700 h-auto font-bold"
                                                onClick={() => navigate('/packs')}
                                            >
                                                Cliquez ici pour recharger →
                                            </Button>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {availableTickets < 10 && availableTickets > 0 && (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-center gap-2 text-orange-700">
                                    <AlertCircle className="w-4 h-4" />
                                    <p className="text-sm">
                                        <strong>Derniers billets !</strong> Plus que {availableTickets} billet(s) disponible(s)
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Bouton d'achat */}
                        <Button
                            onClick={handlePurchase}
                            disabled={loading || quantity === 0 || availableTickets === 0 || !hasSufficientBalance}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-6 text-lg font-bold transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
                            size="lg"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Traitement en cours...</span>
                                </div>
                            ) : availableTickets === 0 ? (
                                "Plus de billets disponibles"
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Ticket className="w-5 h-5" />
                                    <span>Acheter {quantity} billet{quantity > 1 ? 's' : ''} pour {totalCost}π</span>
                                    <Badge variant="secondary" className="ml-2">
                                        {quantity} billet{quantity > 1 ? 's' : ''}
                                    </Badge>
                                </div>
                            )}
                        </Button>

                        {/* Information supplémentaire */}
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Paiement sécurisé • Billets immédiats • Support 24/7</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TicketPurchaseInterface;