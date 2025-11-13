import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Coins, Plus, Minus, ShoppingCart, Sparkles, Info } from 'lucide-react';
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

const TicketTypeCard = ({ ticketType, quantity, onQuantityChange, index }) => {
    const isAvailable = ticketType.quantity_available > ticketType.quantity_sold;
    const canAdd = isAvailable && quantity < (ticketType.quantity_available - ticketType.quantity_sold);
    const badgeColors = ['bg-blue-500/20 text-blue-300', 'bg-purple-500/20 text-purple-300', 'bg-teal-500/20 text-teal-300', 'bg-pink-500/20 text-pink-300'];
    const badgeColor = badgeColors[index % badgeColors.length];

    return (
        <div className={`p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isAvailable ? 'bg-muted/50' : 'bg-muted/20 text-muted-foreground'}`}>
            <div className="flex-grow">
                <p className={`font-bold flex items-center gap-2`}><div className={`w-2.5 h-2.5 rounded-full ${badgeColor.split(' ')[0]}`}></div>{ticketType.name}</p>
                {ticketType.features && ticketType.features.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {ticketType.features.map((feature, i) => (
                            <span key={i} className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                <Sparkles className="w-3 h-3 inline-block mr-1" /> {feature}
                            </span>
                        ))}
                    </div>
                )}
                 <p className="text-sm font-semibold flex items-center gap-2 mt-2">
                    <span className={badgeColor.split(' ')[1]}>{ticketType.calculated_price_pi} <Coins className="w-3 h-3 inline-block" /></span>
                    <span className="text-sm font-normal text-muted-foreground">({ticketType.base_price.toLocaleString()} FCFA)</span>
                </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <Button size="icon" variant="ghost" onClick={() => onQuantityChange(ticketType.id, -1)} disabled={quantity === 0}>
                    <Minus className="w-4 h-4" />
                </Button>
                <span className="font-bold w-6 text-center">{quantity}</span>
                <Button size="icon" variant="ghost" onClick={() => onQuantityChange(ticketType.id, 1)} disabled={!canAdd}>
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
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
                    acc.totalPi += ticketType.calculated_price_pi * quantity;
                    acc.totalFcfa += ticketType.base_price * quantity;
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
                toast({ title: "Achat réussi!", description: `Vous avez acheté ${totalTickets} billet(s). Un email de confirmation a été envoyé.` });
                onPurchaseSuccess();
                setCart({});
            } else {
                 toast({ title: "Erreur d'achat", description: data.message, variant: "destructive" });
                if (data.message.includes('Solde')) {
                    setShowWalletInfo(true);
                }
            }
        } catch(error) {
             toast({ title: "Erreur d'achat", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle>Acheter des Billets</CardTitle>
                    <CardDescription>Sélectionnez les billets que vous souhaitez acheter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {ticketTypes.map((tt, index) => (
                        <TicketTypeCard key={tt.id} ticketType={tt} quantity={cart[tt.id] || 0} onQuantityChange={handleQuantityChange} index={index}/>
                    ))}

                    {totalTickets > 0 && (
                        <div className="pt-4 border-t border-primary/20">
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <div className="text-right">
                                    <span className="flex items-center justify-end gap-1 text-primary">{totalPi} <Coins className="w-5 h-5" /></span>
                                    <span className="text-sm font-normal text-muted-foreground">({totalFcfa.toLocaleString()} FCFA)</span>
                                </div>
                            </div>
                            <Button onClick={handlePurchaseConfirmation} disabled={loading || totalTickets === 0} size="lg" className="w-full mt-4 gradient-gold text-primary-foreground">
                                {loading ? <Loader2 className="animate-spin" /> : 
                                <><ShoppingCart className="w-5 h-5 mr-2" /> Payer</>}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => {setShowWalletInfo(false); navigate('/packs');}}/>
            <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, cost: 0, costFcfa: 0, onConfirm: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer votre achat ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="flex flex-col items-center justify-center text-center p-4">
                                <Coins className="w-12 h-12 text-primary mb-4" />
                                <p className="text-lg">
                                    Vous êtes sur le point de dépenser <strong className="text-foreground">{confirmation.cost}π</strong> ({confirmation.costFcfa?.toLocaleString('fr-FR')} FCFA).
                                </p>
                                <div className="mt-4 text-xs text-muted-foreground p-2 bg-muted rounded flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Votre action permet aux organisateurs de créer plus de contenu. Vous pouvez aussi devenir organisateur en postant des contenus pour bénéficier de la rémunération sur BonPlanInfos.</span>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmation.onConfirm} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : "Confirmer et Payer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

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
        return orders?.reduce((sum, order) => sum + (order.order_status === 'confirmed' ? order.total_amount_pi : 0), 0) || 0;
    }, [orders]);

    return (
        <Card className="glass-effect border-primary/50">
            <CardHeader>
                <CardTitle>Tableau de bord Billetterie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold">{ticketingData.tickets_sold || 0} / {ticketingData.total_tickets}</p>
                        <p className="text-sm text-muted-foreground">Billets Vendus</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold flex items-center justify-center gap-1">{totalRevenuePi} <Coins className="w-5 h-5"/></p>
                        <p className="text-sm text-muted-foreground">Revenu Brut</p>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold mb-2">Dernières Commandes</h4>
                     {loading ? <Loader2 className="animate-spin"/> : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                           {(orders || []).map(o => (
                                <div key={o.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded">
                                    <div>
                                        <p>{o.user?.full_name || 'Anonyme'}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString('fr-FR')}</p>
                                    </div>
                                    <span className="font-semibold">{o.ticket_count} billet(s) - {o.total_amount_pi}π</span>
                                </div>
                            ))}
                        </div>
                    )}
                     {error && <p className="text-destructive text-sm">Erreur de chargement des commandes.</p>}
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

const TicketingInterface = ({ event, ticketingData, ticketTypes, isUnlocked, isOwner, onRefresh }) => {
    if (!isUnlocked) return null;

    if (!ticketingData || !ticketTypes) {
      return <div className="text-center p-4"><Loader2 className="animate-spin" /> Chargement des données de billetterie...</div>
    }

    return (
        <div className="mt-6 space-y-6">
            {isOwner ? (
                <OwnerView event={event} ticketingData={ticketingData} ticketTypes={ticketTypes} />
            ) : (
                <ParticipantView event={event} ticketingData={ticketingData} ticketTypes={ticketTypes} onPurchaseSuccess={onRefresh} />
            )}
        </div>
    );
};

export default TicketingInterface;