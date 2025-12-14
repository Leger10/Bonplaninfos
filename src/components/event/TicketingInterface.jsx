import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Coins, Plus, Minus, ShoppingCart, Check, Download, AlertCircle, Gift, Mail, CheckCircle2, Trash2, Star, Crown, Zap, Sparkles, Gem, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { generateTicketPDF } from '@/utils/generateTicketPDF';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// MODIFICATION COMPLÈTE : Couleurs vibrantes avec du texte blanc
const TICKET_COLORS = {
    blue: {
        bg: 'bg-gradient-to-br from-blue-600 to-blue-700',
        border: 'border-blue-700',
        hover: 'hover:from-blue-700 hover:to-blue-800',
        text: 'text-white',
        badge: 'bg-blue-500 text-white'
    },
    bronze: {
        bg: 'bg-gradient-to-br from-amber-700 to-amber-800',
        border: 'border-amber-800',
        hover: 'hover:from-amber-800 hover:to-amber-900',
        text: 'text-white',
        badge: 'bg-amber-600 text-white'
    },
    silver: {
        bg: 'bg-gradient-to-br from-slate-500 to-slate-600',
        border: 'border-slate-600',
        hover: 'hover:from-slate-600 hover:to-slate-700',
        text: 'text-white',
        badge: 'bg-slate-400 text-slate-900'
    },
    gold: {
        bg: 'bg-gradient-to-br from-yellow-600 to-yellow-700',
        border: 'border-yellow-700',
        hover: 'hover:from-yellow-700 hover:to-yellow-800',
        text: 'text-white',
        badge: 'bg-yellow-500 text-slate-900'
    },
    purple: {
        bg: 'bg-gradient-to-br from-purple-600 to-purple-700',
        border: 'border-purple-700',
        hover: 'hover:from-purple-700 hover:to-purple-800',
        text: 'text-white',
        badge: 'bg-purple-500 text-white'
    },
    red: {
        bg: 'bg-gradient-to-br from-red-600 to-red-700',
        border: 'border-red-700',
        hover: 'hover:from-red-700 hover:to-red-800',
        text: 'text-white',
        badge: 'bg-red-500 text-white'
    },
    green: {
        bg: 'bg-gradient-to-br from-green-600 to-green-700',
        border: 'border-green-700',
        hover: 'hover:from-green-700 hover:to-green-800',
        text: 'text-white',
        badge: 'bg-green-500 text-white'
    },
    black: {
        bg: 'bg-gradient-to-br from-slate-800 to-slate-900',
        border: 'border-slate-900',
        hover: 'hover:from-slate-900 hover:to-black',
        text: 'text-white',
        badge: 'bg-slate-700 text-white'
    },
};

const TicketingInterface = ({ event, ticketingData, ticketTypes, isUnlocked, onRefresh }) => {
    const { user } = useAuth();

    // Load cart from localStorage or start empty
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(`cart_${event?.id}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    });

    const [loading, setLoading] = useState(false);
    const [purchasedTickets, setPurchasedTickets] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);

    // Gift/Recipient State
    const [isGift, setIsGift] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [finalRecipient, setFinalRecipient] = useState('');

    // Save cart on change
    useEffect(() => {
        if (event?.id) {
            localStorage.setItem(`cart_${event.id}`, JSON.stringify(cart));
        }
    }, [cart, event?.id]);

    // Determine Active Price (J-0 vs J-1)
    const isPresale = useMemo(() => {
        if (!event || !event.event_date) return false;
        const eventDate = new Date(event.event_date);
        const now = new Date();
        return now < eventDate;
    }, [event]);

    const handleQuantityChange = (typeId, delta) => {
        setCart(prev => {
            const current = prev[typeId] || 0;
            const next = Math.max(0, current + delta);
            const newCart = { ...prev, [typeId]: next };
            if (next === 0) delete newCart[typeId];
            return newCart;
        });
    };

    const getActivePrice = (type) => {
        if (!type) return 0;
        if (isPresale && type.presale_price_pi && type.presale_price_pi > 0) return type.presale_price_pi;
        return type.price_coins || type.price_pi || 0;
    };

    const cartTotal = useMemo(() => {
        if (!ticketTypes) return 0;
        const total = Object.entries(cart).reduce((sum, [id, qty]) => {
            const type = ticketTypes.find(t => t.id === id);
            if (!type) return sum;
            return sum + (getActivePrice(type) * qty);
        }, 0);
        return total;
    }, [cart, ticketTypes, isPresale]);

    const handlePurchase = async () => {
        if (!user) {
            toast({ title: "Connexion requise", variant: "destructive" });
            setShowCheckoutModal(false);
            return;
        }

        // Validation for Gift Email
        if (isGift && !recipientEmail) {
            return toast({ title: "Email manquant", description: "Veuillez entrer l'email du destinataire.", variant: "destructive" });
        }
        if (isGift && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
            return toast({ title: "Email invalide", description: "Veuillez entrer une adresse email valide.", variant: "destructive" });
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('purchase_tickets_v2', {
                p_user_id: user.id,
                p_event_id: event.id,
                p_cart: cart,
                p_recipient_email: isGift ? recipientEmail : null
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            setFinalRecipient(data.recipient_email || (isGift ? recipientEmail : user.email));

            // Process returned tickets
            const generatedTickets = data.tickets || [];
            let ticketCounter = 0;

            const newTickets = Object.entries(cart).flatMap(([typeId, qty]) => {
                const type = ticketTypes.find(t => t.id === typeId);
                if (!type) return [];
                const typeTickets = [];
                for (let i = 0; i < qty; i++) {
                    const ticketData = generatedTickets[ticketCounter] || {};

                    typeTickets.push({
                        type_name: type.name,
                        price: getActivePrice(type),
                        ticket_number: ticketData.number || `TICKET-${Date.now()}-${ticketCounter}`,
                        ticket_code_short: ticketData.short_code || 'PENDING',
                        color: type.color
                    });
                    ticketCounter++;
                }
                return typeTickets;
            });

            setPurchasedTickets(newTickets);
            setShowCheckoutModal(false);
            setShowSuccessModal(true);

            // Clear cart
            setCart({});
            localStorage.removeItem(`cart_${event.id}`);

            setIsGift(false);
            setRecipientEmail('');
            if (onRefresh) onRefresh();

        } catch (error) {
            console.error("Purchase error:", error);
            toast({ title: "Erreur d'achat", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (purchasedTickets) {
            generateTicketPDF(event, purchasedTickets, user);
            toast({ title: "Téléchargement", description: "Votre PDF a été généré." });
        }
    };

    // Icônes pour chaque type de billet
    const getTicketIcon = (color) => {
        switch (color) {
            case 'gold': return <Crown className="w-5 h-5 text-yellow-300" />;
            case 'silver': return <Star className="w-5 h-5 text-slate-300" />;
            case 'bronze': return <Trophy className="w-5 h-5 text-amber-300" />;
            case 'purple': return <Gem className="w-5 h-5 text-purple-300" />;
            case 'blue': return <Sparkles className="w-5 h-5 text-blue-300" />;
            case 'red': return <Zap className="w-5 h-5 text-red-300" />;
            case 'green': return <Sparkles className="w-5 h-5 text-green-300" />;
            case 'black': return <Star className="w-5 h-5 text-slate-300" />;
            default: return <Ticket className="w-5 h-5 text-white" />;
        }
    };

    if (!isUnlocked) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 rounded-xl border border-primary/20">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        <Ticket className="text-primary h-6 w-6" /> Billetterie
                    </h2>
                    <p className="text-muted-foreground text-sm">Sélectionnez vos billets ci-dessous</p>
                </div>
                {isPresale ? (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 animate-pulse border-yellow-300 px-3 py-1 text-xs md:text-sm">
                        🌟 Tarif Prévente Actif (J-1)
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-background text-foreground">Tarif Jour J</Badge>
                )}
            </div>

            {!ticketTypes || ticketTypes.length === 0 ? (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-foreground">Aucun billet</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                        Aucun type de billet n'est disponible pour le moment. Revenez plus tard !
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {ticketTypes.map(type => {
                        const price = getActivePrice(type);
                        const regularPrice = type.price_coins || type.price_pi || 0;
                        const available = (type.quantity_available || 0) - (type.quantity_sold || 0);
                        const isSoldOut = available <= 0;
                        const colorStyle = TICKET_COLORS[type.color] || TICKET_COLORS.blue;

                        return (
                            <Card key={type.id} className={`relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 transform duration-300 ${colorStyle.bg} ${colorStyle.border} ${colorStyle.hover} ${isSoldOut ? 'opacity-80 grayscale-[0.3]' : ''}`}>
                                <div className={`absolute top-0 right-0 ${colorStyle.bg} text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10`}>
                                    {type.color.charAt(0).toUpperCase() + type.color.slice(1)}
                                </div>

                                <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                {getTicketIcon(type.color)}
                                                <h3 className={`font-bold text-xl ${colorStyle.text} flex items-center gap-2`}>
                                                    {type.name}
                                                </h3>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                {isPresale && regularPrice > price && (
                                                    <span className={`text-xs ${colorStyle.text} opacity-80 line-through block`}>{regularPrice} π</span>
                                                )}
                                                <div className={`font-bold text-2xl ${colorStyle.text} flex items-center justify-end gap-1`}>
                                                    {price} <Coins className="w-6 h-6 text-yellow-300" />
                                                </div>
                                            </div>
                                        </div>
                                        <p className={`text-sm ${colorStyle.text} opacity-90 line-clamp-3 mb-4 min-h-[3rem]`}>
                                            {type.description || 'Accès standard à l\'événement.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/30 mt-auto">
                                        <div className="text-xs font-medium flex items-center">
                                            {isSoldOut ?
                                                <Badge variant="destructive" className="uppercase tracking-wide text-white bg-red-600 border-red-700">
                                                    Épuisé
                                                </Badge>
                                                :
                                                <span className={`flex items-center ${available < 10 ? 'text-yellow-300 font-bold' : colorStyle.text} opacity-90`}>
                                                    <Ticket className="w-3 h-3 mr-1" />
                                                    {available} restants
                                                </span>
                                            }
                                        </div>

                                        <div className="flex items-center gap-3 bg-white/20 p-1 rounded-lg backdrop-blur-sm">
                                            <Button
                                                size="icon" variant="ghost"
                                                className="h-8 w-8 hover:bg-white/30 text-white shadow-sm"
                                                onClick={() => handleQuantityChange(type.id, -1)}
                                                disabled={!cart[type.id] || isSoldOut}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </Button>
                                            <span className={`w-8 text-center font-bold text-lg ${colorStyle.text}`}>
                                                {cart[type.id] || 0}
                                            </span>
                                            <Button
                                                size="icon" variant="ghost"
                                                className="h-8 w-8 hover:bg-white/30 text-white shadow-sm"
                                                onClick={() => handleQuantityChange(type.id, 1)}
                                                disabled={available <= (cart[type.id] || 0) || isSoldOut}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Sticky Cart Summary */}
            {cartTotal > 0 && (
                <div className="fixed bottom-6 left-0 right-0 z-50 px-4 md:px-0 flex justify-center pointer-events-none">
                    <Card className="shadow-2xl border-t-4 border-t-primary animate-in slide-in-from-bottom-10 bg-card/95 backdrop-blur-md w-full max-w-2xl pointer-events-auto">
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full relative">
                                    <ShoppingCart className="w-6 h-6 text-primary" />
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                                        {Object.values(cart).reduce((a, b) => a + b, 0)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Total Panier</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-bold text-foreground">{cartTotal} π</p>
                                        <span className="text-xs text-muted-foreground">({(cartTotal * 10).toLocaleString()} FCFA)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => setCart({})} className="text-foreground">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                                <Button size="lg" onClick={() => setShowCheckoutModal(true)} className="flex-1 sm:w-auto px-8 font-bold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-purple-600 text-white border-0">
                                    Commander
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Checkout Modal */}
            <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Récapitulatif de la commande</DialogTitle>
                        <DialogDescription className="text-muted-foreground">Vérifiez vos billets avant le paiement.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg space-y-3 max-h-[40vh] overflow-y-auto">
                            {Object.entries(cart).map(([id, qty]) => {
                                const type = ticketTypes.find(t => t.id === id);
                                if (!type) return null;
                                const colorStyle = TICKET_COLORS[type.color] || TICKET_COLORS.blue;
                                return (
                                    <div key={id} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-bold text-foreground flex items-center gap-2">
                                                {type.name}
                                                <span className={`text-xs px-2 py-0.5 rounded ${colorStyle.badge} font-semibold`}>
                                                    {type.color}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">{qty} x {getActivePrice(type)} π</p>
                                        </div>
                                        <span className="font-mono font-medium text-foreground">{qty * getActivePrice(type)} π</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between items-center text-lg font-bold border-t pt-4 text-foreground">
                            <span>Total à payer</span>
                            <span className="text-primary">{cartTotal} π</span>
                        </div>

                        {/* Gift Option Section */}
                        <div className="pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-purple-500" />
                                    <Label htmlFor="gift-mode" className="text-sm font-medium text-foreground cursor-pointer">Offrir ces billets ?</Label>
                                </div>
                                <Switch id="gift-mode" checked={isGift} onCheckedChange={setIsGift} />
                            </div>

                            {isGift && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 mt-2">
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Email du destinataire"
                                                className="pl-9 text-foreground bg-background"
                                                value={recipientEmail}
                                                onChange={(e) => setRecipientEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 ml-1">Les billets seront envoyés à cette adresse.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCheckoutModal(false)} className="text-foreground">Annuler</Button>
                        <Button onClick={handlePurchase} disabled={loading} className="bg-primary text-white font-bold">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2 w-4 h-4" />}
                            Confirmer {cartTotal} π
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success Modal with PDF Download */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md text-center">
                    <DialogHeader>
                        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                            Commande Validée !
                        </DialogTitle>
                        <DialogDescription className="text-base text-gray-700 dark:text-gray-300 space-y-3">
                            <p className="font-medium">
                                Votre commande a bien été effectuée, les billets sont envoyés à l'adresse email.
                                <span className="block mt-1 font-semibold">Allez-y vérifier !</span>
                            </p>

                            {finalRecipient && (
                                <div className="mt-4 font-medium text-primary bg-primary/10 dark:bg-primary/20 py-2 px-3 rounded-lg text-sm border border-primary/20">
                                    <Mail className="inline w-4 h-4 mr-2" />
                                    Envoyé à : <span className="font-semibold">{finalRecipient}</span>
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="bg-muted/50 dark:bg-muted/30 p-4 rounded-lg text-left border border-border/50 max-h-60 overflow-y-auto">
                            <h4 className="font-semibold mb-2 text-sm flex items-center gap-2 text-foreground">
                                <Ticket className="w-4 h-4" /> Vos Codes :
                            </h4>
                            <ul className="text-sm space-y-2">
                                {purchasedTickets?.map((t, i) => {
                                    const colorStyle = TICKET_COLORS[t.color] || TICKET_COLORS.blue;
                                    return (
                                        <li key={i} className="flex justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0 items-center">
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground text-xs">{t.type_name}</span>
                                                <span className="font-mono font-bold text-base tracking-wider text-primary">
                                                    {t.ticket_code_short || t.ticket_number}
                                                </span>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded ${colorStyle.badge} font-semibold`}>
                                                {t.color}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleDownloadPDF}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 shadow-md hover:shadow-lg transition-all group"
                            >
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center text-lg font-bold">
                                        <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                                        Télécharger Billets (PDF)
                                    </div>
                                    <span className="text-[10px] font-normal opacity-90">Avec QR & Codes Courts</span>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full text-foreground"
                            >
                                Fermer
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TicketingInterface;