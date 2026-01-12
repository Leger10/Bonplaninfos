import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Coins, Plus, Minus, ShoppingCart, Check, Download, CheckCircle2, Crown, Star, Bell, Trash2, X, Wallet, Package, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateTicketPDF } from '@/utils/generateTicketPDF';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';

// Ticket Colors constant
const TICKET_COLORS = {
    blue: { bg: 'bg-gradient-to-br from-blue-600 to-blue-700', border: 'border-blue-700', hover: 'hover:from-blue-700 hover:to-blue-800', text: 'text-white', badge: 'bg-blue-500 text-white' },
    bronze: { bg: 'bg-gradient-to-br from-amber-700 to-amber-800', border: 'border-amber-800', hover: 'hover:from-amber-800 hover:to-amber-900', text: 'text-white', badge: 'bg-amber-600 text-white' },
    silver: { bg: 'bg-gradient-to-br from-slate-500 to-slate-600', border: 'border-slate-600', hover: 'hover:from-slate-600 hover:to-slate-700', text: 'text-white', badge: 'bg-slate-400 text-slate-900' },
    gold: { bg: 'bg-gradient-to-br from-yellow-600 to-yellow-700', border: 'border-yellow-700', hover: 'hover:from-yellow-700 hover:to-yellow-800', text: 'text-white', badge: 'bg-yellow-500 text-slate-900' },
    purple: { bg: 'bg-gradient-to-br from-purple-600 to-purple-700', border: 'border-purple-700', hover: 'hover:from-purple-700 hover:to-purple-800', text: 'text-white', badge: 'bg-purple-500 text-white' },
    red: { bg: 'bg-gradient-to-br from-red-600 to-red-700', border: 'border-red-700', hover: 'hover:from-red-700 hover:to-red-800', text: 'text-white', badge: 'bg-red-500 text-white' },
    green: { bg: 'bg-gradient-to-br from-green-600 to-green-700', border: 'border-green-700', hover: 'hover:from-green-700 hover:to-green-800', text: 'text-white', badge: 'bg-green-500 text-white' },
    black: { bg: 'bg-gradient-to-br from-slate-800 to-slate-900', border: 'border-slate-900', hover: 'hover:from-slate-900 hover:to-black', text: 'text-white', badge: 'bg-slate-700 text-white' },
};

const TicketingInterface = ({ event, ticketingData, ticketTypes, isUnlocked, onRefresh, isClosed }) => {
    const { user } = useAuth();
    const { userProfile, forceRefreshUserProfile } = useData();
    
    // Initialize cart from localStorage
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
    const [showNotification, setShowNotification] = useState(false);
    const [showCartDetails, setShowCartDetails] = useState(false);
    const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
    const [userBalance, setUserBalance] = useState(userProfile?.coin_balance || 0);
    const [isCheckingBalance, setIsCheckingBalance] = useState(false);

    // Clear cart if event is closed
    useEffect(() => {
        if (isClosed) {
            setCart({});
            localStorage.removeItem(`cart_${event?.id}`);
        }
    }, [isClosed, event?.id]);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (event?.id && !isClosed) {
            localStorage.setItem(`cart_${event.id}`, JSON.stringify(cart));
        }
    }, [cart, event?.id, isClosed]);

    // Update user balance when userProfile changes
    useEffect(() => {
        if (userProfile?.coin_balance !== undefined) {
            setUserBalance(userProfile.coin_balance);
        }
    }, [userProfile]);

    const isPresale = useMemo(() => {
        if (!event || !event.event_date) return false;
        return new Date() < new Date(event.event_date);
    }, [event]);

    const handleQuantityChange = (typeId, delta) => {
        if (isClosed) {
            toast({ title: "Ventes fermées", description: "La billetterie est actuellement fermée.", variant: "destructive" });
            return;
        }
        setCart(prev => {
            const current = prev[typeId] || 0;
            const type = ticketTypes?.find(t => t.id === typeId);
            
            if (!type) return prev;
            
            // Calculate available tickets
            const available = (type.quantity_available || 0) - (type.quantity_sold || 0);
            
            // Calculate new quantity
            let next;
            if (delta > 0) {
                // Adding tickets - check if we exceed available
                next = Math.min(current + delta, available);
            } else {
                // Removing tickets - minimum is 0
                next = Math.max(0, current + delta);
            }
            
            const newCart = { ...prev };
            
            if (next === 0) {
                delete newCart[typeId];
                toast({
                    title: "Retiré du panier",
                    description: `${type.name} a été retiré de votre panier`,
                });
            } else {
                newCart[typeId] = next;
                
                // Show feedback when adding/removing
                if (delta > 0 && next > current) {
                    toast({
                        title: "Ajouté au panier",
                        description: `${delta} x ${type.name} ajouté(s)`,
                    });
                } else if (delta < 0 && next < current) {
                    toast({
                        title: "Retiré du panier",
                        description: `${Math.abs(delta)} x ${type.name} retiré(s)`,
                    });
                }
            }
            
            return newCart;
        });
    };

    const handleAddMultiple = (typeId, quantity) => {
        if (isClosed) {
            toast({ title: "Ventes fermées", description: "La billetterie est actuellement fermée.", variant: "destructive" });
            return;
        }
        const type = ticketTypes?.find(t => t.id === typeId);
        if (!type) return;
        
        const available = (type.quantity_available || 0) - (type.quantity_sold || 0);
        const current = cart[typeId] || 0;
        
        if (quantity <= 0) {
            setCart(prev => {
                const newCart = { ...prev };
                delete newCart[typeId];
                return newCart;
            });
            toast({
                title: "Retiré du panier",
                description: `${type.name} a été retiré de votre panier`,
            });
            return;
        }
        
        const maxToAdd = Math.min(quantity, available - current);
        
        if (maxToAdd <= 0) {
            toast({
                title: "Quantité non disponible",
                description: `Seulement ${available} places disponibles pour ${type.name}`,
                variant: "destructive"
            });
            return;
        }
        
        setCart(prev => ({
            ...prev,
            [typeId]: (prev[typeId] || 0) + maxToAdd
        }));
        
        toast({
            title: "Ajouté au panier",
            description: `${maxToAdd} x ${type.name} ajouté(s)`,
        });
    };

    const removeFromCart = (typeId) => {
        const type = ticketTypes?.find(t => t.id === typeId);
        setCart(prev => {
            const newCart = { ...prev };
            delete newCart[typeId];
            return newCart;
        });
        
        if (type) {
            toast({
                title: "Retiré du panier",
                description: `${type.name} a été retiré de votre panier`,
            });
        }
    };

    const clearCart = () => {
        if (Object.keys(cart).length === 0) return;
        
        setCart({});
        toast({
            title: "Panier vidé",
            description: "Tous les billets ont été retirés de votre panier",
        });
    };

    const getActivePrice = (type) => {
        if (!type) return 0;
        // Utiliser price_pi au lieu de price_coins
        if (isPresale && type.presale_price_pi && type.presale_price_pi > 0) return type.presale_price_pi;
        return type.price_pi || 0;
    };

    // Calculate cart totals
    const cartItems = useMemo(() => {
        if (!ticketTypes) return [];
        
        return Object.entries(cart)
            .map(([id, qty]) => {
                const type = ticketTypes.find(t => t.id === id);
                if (!type) return null;
                
                const unitPrice = getActivePrice(type);
                const total = unitPrice * qty;
                const totalFcfa = total * 10;
                
                return {
                    id,
                    type,
                    quantity: qty,
                    unitPrice,
                    total,
                    totalFcfa
                };
            })
            .filter(Boolean);
    }, [cart, ticketTypes, isPresale]);

    const cartTotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.total, 0);
    }, [cartItems]);

    const cartTotalFcfa = useMemo(() => {
        return cartTotal * 10;
    }, [cartTotal]);

    const totalTicketsInCart = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.quantity, 0);
    }, [cartItems]);

    const hasSufficientBalance = useMemo(() => {
        return userBalance >= cartTotal;
    }, [userBalance, cartTotal]);

    const balanceDeficit = useMemo(() => {
        return Math.max(0, cartTotal - userBalance);
    }, [userBalance, cartTotal]);

    const redirectToPacks = () => {
        setShowInsufficientBalanceModal(false);
        setShowCheckoutModal(false);
        window.location.href = '/packs';
    };

    const handlePurchase = async () => {
        if (isClosed) {
            toast({ title: "Impossible", description: "Les ventes sont fermées.", variant: "destructive" });
            return;
        }
        if (!user) {
            toast({ 
                title: "Connexion requise", 
                description: "Veuillez vous connecter pour acheter des billets",
                variant: "destructive" 
            });
            setShowCheckoutModal(false);
            return;
        }

        if (totalTicketsInCart === 0) {
            toast({
                title: "Panier vide",
                description: "Veuillez ajouter des billets à votre panier",
                variant: "destructive"
            });
            return;
        }

        if (!hasSufficientBalance) {
            setShowInsufficientBalanceModal(true);
            return;
        }
 setLoading(true);
    try {
        console.log("💰 Achat avec commissions...");

        // Utiliser la fonction AVEC commissions
        const { data, error } = await supabase.rpc('purchase_tickets_with_commission', {
            p_user_id: user.id,
            p_event_id: event.id,
            p_cart: cart
        });

        console.log("Réponse commission:", data, error);

        if (error) {
            console.error("Erreur:", error);
            // Essayer la version simplifiée
            const { data: simpleData, error: simpleError } = await supabase.rpc('purchase_tickets_basic_commission', {
                p_user_id: user.id,
                p_event_id: event.id,
                p_cart: cart
            });
            
            if (simpleError) throw simpleError;
            if (!simpleData.success) throw new Error(simpleData.message);
            
            await handlePurchaseSuccess(simpleData);
            return;
        }
        
        if (!data.success) {
            throw new Error(data.message);
        }

        // Afficher les détails des commissions
        toast({
            title: "🎫 Achat réussi avec commissions",
            description: (
                <div className="text-sm">
                    <div>Total: {data.total} π</div>
                    <div className="text-green-600">Organisateur: {data.organizer_amount} π (95%)</div>
                    <div className="text-blue-600">Plateforme: {data.platform_commission} π (5%)</div>
                </div>
            ),
            duration: 6000,
        });

        await handlePurchaseSuccess(data);

    } catch (error) {
        console.error("Erreur:", error);
        toast({ 
            title: "Erreur d'achat", 
            description: error.message, 
            variant: "destructive" 
        });
    } finally {
        setLoading(false);
    }
};

    const handleDownloadPDF = async () => {
        if (purchasedTickets && purchasedTickets.length > 0) {
            toast({ 
                title: "Génération en cours...", 
                description: "Préparation de votre PDF de billets." 
            });
            try {
                await generateTicketPDF(event, purchasedTickets, user);
                toast({ 
                    title: "✅ Succès", 
                    description: "Vos billets ont été téléchargés." 
                });
            } catch (error) {
                toast({ 
                    title: "Erreur", 
                    description: "Impossible de télécharger les billets", 
                    variant: "destructive" 
                });
            }
        }
    };

    const getTicketIcon = (color) => {
        switch (color) {
            case 'gold': return <Crown className="w-5 h-5 text-yellow-300" />;
            case 'silver': return <Star className="w-5 h-5 text-slate-300" />;
            default: return <Ticket className="w-5 h-5 text-white" />;
        }
    };

    // Quick add buttons for common quantities
    const quickAddOptions = [1, 2, 3, 5];

    if (!isUnlocked) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative px-2 sm:px-0">
            {/* Notification flottante */}
            {showNotification && (
                <div className="fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-500 w-[90vw] sm:w-auto">
                    <Alert className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-xl max-w-md mx-auto">
                        <CheckCircle2 className="h-5 w-5" />
                        <AlertTitle className="text-white">Commande confirmée !</AlertTitle>
                        <AlertDescription className="text-white/90">
                            Vos billets sont disponibles dans l'onglet <strong>"Mes Billets"</strong> de votre profil.
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-primary/10 to-purple-500/10 p-4 sm:p-6 rounded-xl border border-primary/20 gap-3 sm:gap-0">
                <div className="w-full sm:w-auto">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
                        <Ticket className="text-primary h-5 w-5 sm:h-6 sm:w-6" /> Billetterie
                    </h2>
                    <p className="text-muted-foreground text-sm">Sélectionnez vos billets ci-dessous</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    {isPresale ? (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300 animate-pulse text-xs sm:text-sm">
                            🌟 Prévente
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-xs sm:text-sm">Tarif Normal</Badge>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 sm:py-2 bg-primary/10 rounded-lg">
                        <Wallet className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium whitespace-nowrap">
                            Solde: <span className="font-bold">{userBalance.toFixed(2)} π</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Ticket Grid */}
            {!ticketTypes || ticketTypes.length === 0 ? (
                <Alert>
                    <AlertTitle>Aucun billet disponible</AlertTitle>
                    <AlertDescription>La billetterie est fermée ou les billets sont épuisés.</AlertDescription>
                </Alert>
            ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {ticketTypes.map(type => {
                        const price = getActivePrice(type);
                        const available = (type.quantity_available || 0) - (type.quantity_sold || 0);
                        const isSoldOut = available <= 0;
                        const inCart = cart[type.id] || 0;
                        const style = TICKET_COLORS[type.color] || TICKET_COLORS.blue;

                        return (
                            <Card key={type.id} className={`relative overflow-hidden transition-all hover:shadow-xl ${style.bg} ${style.border} ${isSoldOut || isClosed ? 'opacity-80 grayscale' : 'hover:scale-[1.02]'} group`}>
                                <CardContent className="p-4 sm:p-6 flex flex-col h-full justify-between gap-3 sm:gap-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0">
                                        <div className="flex items-center gap-2">
                                            {getTicketIcon(type.color)}
                                            <h3 className={`font-bold text-lg sm:text-xl ${style.text} break-words`}>{type.name}</h3>
                                        </div>
                                        <div className="text-right w-full sm:w-auto">
                                            <div className={`font-bold text-xl sm:text-2xl ${style.text} flex items-center justify-end sm:justify-end`}>
                                                {price.toFixed(2)} <Coins className="w-4 h-4 sm:w-5 sm:h-5 ml-1 text-yellow-300" />
                                            </div>
                                            <div className={`text-xs sm:text-sm ${style.text} opacity-80`}>
                                                {(price * 10).toLocaleString()} FCFA
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {type.description && (
                                        <p className={`text-xs sm:text-sm ${style.text} opacity-90 mt-2 line-clamp-2`}>
                                            {type.description}
                                        </p>
                                    )}
                                    
                                    <div className="space-y-3">
                                        {/* Stock info */}
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs ${style.text} font-medium ${isSoldOut ? 'text-red-200' : ''} truncate`}>
                                                {isClosed ? '🚫 Terminé' : isSoldOut ? '🚫 Épuisé' : `🎟️ ${available} places`}
                                            </span>
                                            {inCart > 0 && !isClosed && (
                                                <Badge variant="secondary" className={`${style.badge} text-xs px-2`}>
                                                    {inCart} dans le panier
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Quick add buttons - Disabled if Closed */}
                                        {!isSoldOut && !isClosed && (
                                            <div className="flex flex-wrap gap-1">
                                                {quickAddOptions.map(qty => (
                                                    <Button
                                                        key={qty}
                                                        size="sm"
                                                        variant="outline"
                                                        className={`h-6 sm:h-7 px-2 text-xs ${style.text} border-white/30 hover:bg-white/20`}
                                                        onClick={() => handleAddMultiple(type.id, qty)}
                                                        disabled={available < (inCart + qty)}
                                                    >
                                                        +{qty}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Quantity controls */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t border-white/20 gap-3 sm:gap-0">
                                            {isClosed ? (
                                                <div className="w-full text-center py-2 bg-black/20 rounded-lg text-white font-medium text-sm">
                                                    Billetterie fermée
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2 sm:gap-3 bg-black/20 p-1 rounded-lg backdrop-blur-sm w-full sm:w-auto justify-center">
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20 transition-colors" 
                                                            onClick={() => handleQuantityChange(type.id, -1)} 
                                                            disabled={!inCart || isSoldOut}
                                                        >
                                                            <Minus className="w-3 h-3 sm:w-3 sm:h-3" />
                                                        </Button>
                                                        <span className={`w-8 text-center font-bold ${style.text} text-lg`}>
                                                            {inCart || 0}
                                                        </span>
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20 transition-colors" 
                                                            onClick={() => handleQuantityChange(type.id, 1)} 
                                                            disabled={available <= inCart || isSoldOut}
                                                        >
                                                            <Plus className="w-3 h-3 sm:w-3 sm:h-3" />
                                                        </Button>
                                                    </div>
                                                    
                                                    {/* Remove all button */}
                                                    {inCart > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className={`h-7 px-2 text-xs ${style.text} hover:bg-white/20 w-full sm:w-auto mt-2 sm:mt-0`}
                                                            onClick={() => removeFromCart(type.id)}
                                                        >
                                                            <X className="w-3 h-3 mr-1" />
                                                            Retirer
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Floating Cart - Hidden if Closed */}
            {totalTicketsInCart > 0 && !isClosed && (
                <>
                    {/* Cart Details Panel */}
                    {showCartDetails && (
                        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCartDetails(false)}>
                            <div className="fixed bottom-0 left-0 right-0 sm:bottom-24 sm:left-1/2 sm:transform sm:-translate-x-1/2 w-full sm:max-w-md max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                <Card className="bg-card shadow-2xl border-t-4 border-t-primary rounded-t-2xl sm:rounded-xl h-full overflow-hidden">
                                    <CardContent className="p-4 h-full flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-lg">Votre panier ({totalTicketsInCart} billet{totalTicketsInCart > 1 ? 's' : ''})</h3>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-sm">
                                                    <Wallet className="w-3 h-3" />
                                                    <span className="font-medium">{userBalance.toFixed(2)} π</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={clearCart}
                                                    className="text-destructive hover:text-destructive p-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span className="sr-only sm:not-sr-only sm:ml-1">Vider</span>
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <ScrollArea className="flex-1 pr-2 sm:pr-4">
                                            {cartItems.map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-3 mb-2 bg-muted/30 rounded-lg">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{item.type.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {item.unitPrice.toFixed(2)} π × {item.quantity}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-3 ml-2">
                                                        <div className="text-right">
                                                            <div className="font-bold text-sm sm:text-base">{item.total.toFixed(2)} π</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.totalFcfa.toLocaleString()} FCFA
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive flex-shrink-0"
                                                            onClick={() => removeFromCart(item.id)}
                                                        >
                                                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                        
                                        <div className="mt-4 pt-4 border-t">
                                            {!hasSufficientBalance && (
                                                <Alert variant="destructive" className="mb-3">
                                                    <AlertTitle className="text-sm">Solde insuffisant</AlertTitle>
                                                    <AlertDescription className="text-xs">
                                                        Il vous manque {balanceDeficit.toFixed(2)} π
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                            
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="min-w-0">
                                                    <span className="font-bold text-sm sm:text-base">Total</span>
                                                    <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                                        Solde disponible: {userBalance.toFixed(2)} π
                                                    </div>
                                                </div>
                                                <div className="text-right ml-2">
                                                    <div className="text-xl sm:text-2xl font-bold text-primary">{cartTotal.toFixed(2)} π</div>
                                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                                        {cartTotalFcfa.toLocaleString()} FCFA
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={() => {
                                                    setShowCartDetails(false);
                                                    if (!hasSufficientBalance) {
                                                        setShowInsufficientBalanceModal(true);
                                                    } else {
                                                        setShowCheckoutModal(true);
                                                    }
                                                }}
                                                className="w-full"
                                                size="lg"
                                            >
                                                {!hasSufficientBalance ? (
                                                    <>
                                                        <Package className="w-5 h-5 mr-2" />
                                                        <span className="truncate">Recharger mon solde</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShoppingCart className="w-5 h-5 mr-2" />
                                                        <span className="truncate">Commander maintenant</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Floating Cart Button */}
                    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-3 sm:px-4 animate-in slide-in-from-bottom duration-500">
                        <div className="flex flex-col sm:flex-row items-center gap-2 bg-card/95 backdrop-blur-md rounded-2xl sm:rounded-full shadow-2xl border-t-4 border-t-primary p-3 sm:p-2 sm:pl-4 w-full max-w-md sm:max-w-none">
                            <div className="flex items-center gap-3 mb-2 sm:mb-0 w-full sm:w-auto justify-between sm:justify-start">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <ShoppingCart className="w-6 h-6 text-primary" />
                                        {totalTicketsInCart > 0 && (
                                            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                                                {totalTicketsInCart}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium whitespace-nowrap">{totalTicketsInCart} billet{totalTicketsInCart > 1 ? 's' : ''}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-primary whitespace-nowrap">{cartTotal.toFixed(2)} π</p>
                                            {!hasSufficientBalance && (
                                                <Badge variant="destructive" className="h-4 px-1 text-[10px] whitespace-nowrap">
                                                    Solde insuffisant
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCartDetails(true)}
                                    className="h-9 rounded-full flex-1 sm:flex-none text-xs sm:text-sm"
                                >
                                    Voir détails
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={() => {
                                        if (!hasSufficientBalance) {
                                            setShowInsufficientBalanceModal(true);
                                        } else {
                                            setShowCheckoutModal(true);
                                        }
                                    }}
                                    className={`rounded-full flex-1 sm:flex-none text-xs sm:text-sm ${!hasSufficientBalance ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90'}`}
                                >
                                    {!hasSufficientBalance ? 'Recharger' : 'Commander'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Checkout Modal */}
            <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
                <DialogContent className="w-[95vw] max-w-lg mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">Validation de commande</DialogTitle>
                        <DialogDescription>
                            Vérifiez et modifiez votre commande avant de finaliser
                        </DialogDescription>
                    </DialogHeader>
                    
                    {/* User Balance Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">Votre solde</p>
                                    <p className="text-xl sm:text-2xl font-bold text-primary">{userBalance.toFixed(2)} π</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">Total panier</p>
                                <p className={`text-xl sm:text-2xl font-bold ${hasSufficientBalance ? 'text-green-600' : 'text-destructive'}`}>
                                    {cartTotal.toFixed(2)} π
                                </p>
                            </div>
                        </div>
                        {!hasSufficientBalance && (
                            <Alert variant="destructive" className="mt-3">
                                <AlertTitle className="text-sm">Solde insuffisant</AlertTitle>
                                <AlertDescription className="text-xs">
                                    Il vous manque {balanceDeficit.toFixed(2)} π pour valider cette commande.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    
                    <ScrollArea className="max-h-[40vh] sm:max-h-[50vh] pr-2 sm:pr-4">
                        <div className="space-y-3 sm:space-y-4 py-2">
                            {cartItems.length === 0 ? (
                                <div className="text-center py-8">
                                    <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">Votre panier est vide</p>
                                </div>
                            ) : (
                                cartItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-base sm:text-lg truncate">{item.type.name}</div>
                                            <div className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-1">
                                                {item.type.description || 'Billet standard'}
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7 sm:h-8 sm:w-8"
                                                        onClick={() => handleQuantityChange(item.id, -1)}
                                                        disabled={item.quantity <= 1}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="font-bold w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7 sm:h-8 sm:w-8"
                                                        onClick={() => handleQuantityChange(item.id, 1)}
                                                        disabled={((item.type.quantity_available || 0) - (item.type.quantity_sold || 0)) <= item.quantity}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-7 sm:h-8 px-2"
                                                    onClick={() => removeFromCart(item.id)}
                                                >
                                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span className="sr-only sm:not-sr-only sm:ml-1">Supprimer</span>
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-right ml-2">
                                            <div className="text-base sm:text-lg font-bold">{item.total.toFixed(2)} π</div>
                                            <div className="text-xs sm:text-sm text-muted-foreground">
                                                {item.totalFcfa.toLocaleString()} FCFA
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {item.unitPrice.toFixed(2)} π / billet
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                    
                    {cartItems.length > 0 && (
                        <>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pt-4 border-t">
                                    <div className="min-w-0">
                                        <span className="text-base sm:text-lg font-bold">Total ({totalTicketsInCart} billet{totalTicketsInCart > 1 ? 's' : ''})</span>
                                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                            {cartItems.length} type{cartItems.length > 1 ? 's' : ''} de billet
                                        </div>
                                    </div>
                                    <div className="text-right ml-2">
                                        <span className="text-xl sm:text-2xl font-bold text-primary block">{cartTotal.toFixed(2)} π</span>
                                        <span className="text-xs sm:text-sm text-muted-foreground">
                                            {cartTotalFcfa.toLocaleString()} FCFA
                                        </span>
                                    </div>
                                </div>
                                
                                {!hasSufficientBalance && (
                                    <Alert className="bg-amber-50 border-amber-200">
                                        <AlertDescription className="text-xs sm:text-sm text-amber-800">
                                            <Package className="w-4 h-4 inline mr-2" />
                                            Votre solde est insuffisant. <strong>Rechargez vos π pour continuer.</strong>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                
                                <Alert className="bg-blue-50 border-blue-200">
                                    <AlertDescription className="text-xs sm:text-sm text-blue-700">
                                        <Bell className="w-4 h-4 inline mr-2" />
                                        Après paiement, vos billets seront disponibles dans votre profil.
                                    </AlertDescription>
                                </Alert>
                            </div>
                            
                            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                                <div className="flex flex-col sm:flex-row gap-2 w-full">
                                    <Button
                                        variant="destructive"
                                        onClick={clearCart}
                                        className="w-full sm:flex-1"
                                        disabled={cartItems.length === 0}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Vider le panier
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowCheckoutModal(false)}
                                        className="w-full sm:flex-1"
                                    >
                                        Continuer mes achats
                                    </Button>
                                </div>
                                <Button
                                    onClick={hasSufficientBalance ? handlePurchase : () => setShowInsufficientBalanceModal(true)}
                                    disabled={loading || cartItems.length === 0 || !hasSufficientBalance}
                                    className={`w-full sm:w-48 ${hasSufficientBalance ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                                    size="lg"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2 w-5 h-5" />
                                            <span className="truncate">Traitement...</span>
                                        </>
                                    ) : hasSufficientBalance ? (
                                        <>
                                            <Check className="mr-2 w-5 h-5" />
                                            <span className="truncate">Payer {cartTotal.toFixed(2)} π</span>
                                        </>
                                    ) : (
                                        <>
                                            <Package className="mr-2 w-5 h-5" />
                                            <span className="truncate">Recharger mon solde</span>
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Insufficient Balance Modal */}
            <Dialog open={showInsufficientBalanceModal} onOpenChange={setShowInsufficientBalanceModal}>
                <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
                    <DialogHeader>
                        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
                            <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl text-center text-amber-700">Solde insuffisant</DialogTitle>
                        <DialogDescription className="text-center text-sm sm:text-base">
                            Votre solde actuel de <strong>{userBalance.toFixed(2)} π</strong> ne permet pas d'acheter
                            le panier de <strong>{cartTotal.toFixed(2)} π</strong>.
                            <br />
                            <br />
                            Il vous manque <strong className="text-destructive">{balanceDeficit.toFixed(2)} π</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                            <AlertTitle className="text-amber-800 text-sm sm:text-base">💡 Solution rapide</AlertTitle>
                            <AlertDescription className="text-amber-700 text-xs sm:text-sm">
                                Rechargez votre compte avec un pack de π pour finaliser votre achat et profiter de l'événement !
                            </AlertDescription>
                        </Alert>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-14 sm:h-16 flex-col gap-1"
                                onClick={() => setShowInsufficientBalanceModal(false)}
                            >
                                <X className="w-5 h-5" />
                                <span className="text-xs">Annuler</span>
                            </Button>
                            <Button
                                onClick={redirectToPacks}
                                className="h-14 sm:h-16 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 flex-col gap-1"
                            >
                                <Package className="w-5 h-5" />
                                <span className="text-xs font-bold">Voir les packs</span>
                            </Button>
                        </div>
                        
                        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                            <p>
                                💎 Les packs π vous permettent d'acheter des billets et de participer à tous les événements.
                                <br />
                                🎁 Profitez de promotions exclusives sur les gros packs !
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6 text-center">
                    <DialogHeader>
                        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-500">
                            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl text-green-700">🎉 Félicitations !</DialogTitle>
                        <DialogDescription className="text-sm sm:text-base">
                            Votre commande a été effectuée avec succès !
                            <br />
                            <strong className="text-primary font-semibold">
                                Vos billets sont disponibles dans l'onglet "Mes Billets" de votre profil
                            </strong> pour un téléchargement ultérieur.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 sm:py-6 space-y-3">
                        <Button
                            onClick={handleDownloadPDF}
                            className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold shadow-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                        >
                            <Download className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                            <span className="truncate">Télécharger les Billets (PDF)</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowSuccessModal(false)}
                        >
                            Continuer la navigation
                        </Button>
                    </div>
                    <div className="text-xs text-muted-foreground pt-4 border-t">
                        <p>
                            📍 Les billets sont également sauvegardés dans votre compte.
                            <br />
                            🔄 Vous pouvez y accéder à tout moment depuis votre profil.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TicketingInterface;