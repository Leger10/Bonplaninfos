import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Coins, Plus, Minus, ShoppingCart, Check, Download, AlertCircle, Gift, Mail, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { generateTicketPDF } from '@/utils/generateTicketPDF';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TicketingInterface = ({ event, ticketingData, ticketTypes, isUnlocked, onRefresh }) => {
    const { user } = useAuth();
    const [cart, setCart] = useState({});
    const [loading, setLoading] = useState(false);
    const [purchasedTickets, setPurchasedTickets] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // Gift/Recipient State
    const [isGift, setIsGift] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [finalRecipient, setFinalRecipient] = useState('');

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
        if (!user) return toast({ title: "Connexion requise", variant: "destructive" });
        
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

            let ticketCounter = 0;
            const newTickets = Object.entries(cart).flatMap(([typeId, qty]) => {
                const type = ticketTypes.find(t => t.id === typeId);
                if (!type) return [];
                const typeTickets = [];
                for (let i = 0; i < qty; i++) {
                    typeTickets.push({
                        type_name: type.name,
                        price: getActivePrice(type),
                        ticket_number: data.ticket_codes?.[ticketCounter] || `TICKET-${Date.now()}-${ticketCounter}`
                    });
                    ticketCounter++;
                }
                return typeTickets;
            });

            setPurchasedTickets(newTickets);
            setShowSuccessModal(true);
            setCart({});
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
                    <Badge variant="outline" className="bg-background">Tarif Jour J</Badge>
                )}
            </div>

            {!ticketTypes || ticketTypes.length === 0 ? (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Aucun billet</AlertTitle>
                    <AlertDescription>
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

                        return (
                            <Card key={type.id} className={`relative overflow-hidden border-l-4 border-l-primary transition-all hover:shadow-lg hover:-translate-y-1 ${isSoldOut ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                                <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-xl text-foreground">{type.name}</h3>
                                            <div className="text-right shrink-0 ml-2">
                                                {isPresale && regularPrice > price && (
                                                    <span className="text-xs text-muted-foreground line-through block">{regularPrice} π</span>
                                                )}
                                                <div className="font-bold text-2xl text-primary flex items-center justify-end gap-1">
                                                    {price} <Coins className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[3rem]">{type.description || 'Accès standard à l\'événement.'}</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                                        <div className="text-xs font-medium flex items-center">
                                            {isSoldOut ? 
                                                <Badge variant="destructive" className="uppercase tracking-wide">Épuisé</Badge> 
                                                : 
                                                <span className={`flex items-center ${available < 10 ? 'text-orange-500 font-bold' : 'text-muted-foreground'}`}>
                                                    <Ticket className="w-3 h-3 mr-1" />
                                                    {available} restants
                                                </span>
                                            }
                                        </div>

                                        <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-lg">
                                            <Button
                                                size="icon" variant="ghost" className="h-8 w-8 hover:bg-background shadow-sm"
                                                onClick={() => handleQuantityChange(type.id, -1)}
                                                disabled={!cart[type.id] || isSoldOut}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </Button>
                                            <span className="w-8 text-center font-bold text-lg">{cart[type.id] || 0}</span>
                                            <Button
                                                size="icon" variant="ghost" className="h-8 w-8 hover:bg-background shadow-sm"
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

            {/* Cart Summary & Options */}
            {cartTotal > 0 && (
                <div className="fixed bottom-6 left-0 right-0 z-50 px-4 md:px-0 flex justify-center pointer-events-none">
                    <Card className="shadow-2xl border-t-4 border-t-primary animate-in slide-in-from-bottom-10 bg-card/95 backdrop-blur-md w-full max-w-2xl pointer-events-auto">
                        <CardContent className="p-4">
                            
                            {/* Gift Option Section */}
                            <div className="mb-4 pb-4 border-b border-border/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Gift className="w-4 h-4 text-purple-500" />
                                        <Label htmlFor="gift-mode" className="text-sm font-medium cursor-pointer">Offrir ces billets à un ami ?</Label>
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
                                                    className="pl-9" 
                                                    value={recipientEmail}
                                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 ml-1">Le billet sera envoyé directement à cette adresse.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-full">
                                        <ShoppingCart className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Total à payer</p>
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-2xl font-bold text-foreground">{cartTotal} π</p>
                                            <span className="text-xs text-muted-foreground">({(cartTotal * 10).toLocaleString()} FCFA)</span>
                                        </div>
                                    </div>
                                </div>
                                <Button size="lg" onClick={handlePurchase} disabled={loading} className="w-full sm:w-auto px-8 font-bold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-purple-600 border-0">
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2 w-5 h-5" />}
                                    {isGift ? "Offrir les billets" : "Confirmer l'achat"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Success Modal with PDF Download */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-md text-center">
                    <DialogHeader>
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-green-700 mb-2">Achat Réussi !</DialogTitle>
                        <DialogDescription className="text-base text-gray-600 dark:text-gray-300">
                            Félicitations! Un email vous a été envoyé. Présentez le jour-J.
                            {finalRecipient && (
                                <span className="block mt-4 font-medium text-primary bg-primary/10 dark:bg-primary/20 py-2 px-3 rounded-lg text-sm border border-primary/20">
                                    Email de confirmation envoyé à : {finalRecipient}
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg text-left border border-border/50">
                            <h4 className="font-semibold mb-2 text-sm flex items-center gap-2"><Ticket className="w-4 h-4"/> Récapitulatif :</h4>
                            <ul className="text-sm space-y-2">
                                {purchasedTickets?.map((t, i) => (
                                    <li key={i} className="flex justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                        <span className="text-muted-foreground">{t.type_name}</span>
                                        <span className="font-mono font-bold">{t.ticket_number}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button onClick={handleDownloadPDF} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 shadow-md hover:shadow-lg transition-all group">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center text-lg font-bold">
                                        <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" /> Télécharger mes tickets (PDF)
                                    </div>
                                    <span className="text-[10px] font-normal opacity-90">Format validé pour impression</span>
                                </div>
                            </Button>
                            <Button variant="outline" onClick={() => setShowSuccessModal(false)} className="w-full">
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