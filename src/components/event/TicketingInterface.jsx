import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useData } from "@/contexts/DataContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Ticket,
  Coins,
  Plus,
  Minus,
  ShoppingCart,
  Check,
  Download,
  CheckCircle2,
  Crown,
  Star,
  Bell,
  Trash2,
  X,
  Wallet,
  Package,
  Tag,
  Smartphone,
  Phone,
  Lock,
  Info,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateTicketPDF } from "@/utils/generateTicketPDF";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CoinService } from "@/services/CoinService";
import { usePromoCode } from "@/hooks/usePromoCode";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const FCFA_PER_COIN = 10;
const MONEYFUSION_FEE_RATE = 0.04; // 4% de frais

// Ticket Colors constant
const TICKET_COLORS = {
  blue: {
    bg: "bg-gradient-to-br from-blue-600 to-blue-700",
    border: "border-blue-700",
    hover: "hover:from-blue-700 hover:to-blue-800",
    text: "text-white",
    badge: "bg-blue-500 text-white",
  },
  bronze: {
    bg: "bg-gradient-to-br from-amber-700 to-amber-800",
    border: "border-amber-800",
    hover: "hover:from-amber-800 hover:to-amber-900",
    text: "text-white",
    badge: "bg-amber-600 text-white",
  },
  silver: {
    bg: "bg-gradient-to-br from-slate-500 to-slate-600",
    border: "border-slate-600",
    hover: "hover:from-slate-600 hover:to-slate-700",
    text: "text-white",
    badge: "bg-slate-400 text-slate-900",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-600 to-yellow-700",
    border: "border-yellow-700",
    hover: "hover:from-yellow-700 hover:to-yellow-800",
    text: "text-white",
    badge: "bg-yellow-500 text-slate-900",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-600 to-purple-700",
    border: "border-purple-700",
    hover: "hover:from-purple-700 hover:to-purple-800",
    text: "text-white",
    badge: "bg-purple-500 text-white",
  },
  red: {
    bg: "bg-gradient-to-br from-red-600 to-red-700",
    border: "border-red-700",
    hover: "hover:from-red-700 hover:to-red-800",
    text: "text-white",
    badge: "bg-red-500 text-white",
  },
  green: {
    bg: "bg-gradient-to-br from-green-600 to-green-700",
    border: "border-green-700",
    hover: "hover:from-green-700 hover:to-green-800",
    text: "text-white",
    badge: "bg-green-500 text-white",
  },
  black: {
    bg: "bg-gradient-to-br from-slate-800 to-slate-900",
    border: "border-slate-900",
    hover: "hover:from-slate-900 hover:to-black",
    text: "text-white",
    badge: "bg-slate-700 text-white",
  },
};

const TicketingInterface = ({
  event,
  ticketingData,
  ticketTypes,
  isUnlocked,
  onRefresh,
  isClosed,
}) => {
  const { user } = useAuth();
  const { userProfile } = useData();
  const { applyPromoCode, removePromoCode, promoConfig } = usePromoCode(event?.id);

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoDiscountAmount, setPromoDiscountAmount] = useState(0);
  const [promoCommissionAmount, setPromoCommissionAmount] = useState(0);
  const [appliedPromoCodeId, setAppliedPromoCodeId] = useState(null);
  const [promoCodeError, setPromoCodeError] = useState("");
  const [applyingPromoCode, setApplyingPromoCode] = useState(false);
  const [appliedInfluencerId, setAppliedInfluencerId] = useState(null);
  const [pendingCommissionAmount, setPendingCommissionAmount] = useState(0);
  const [appliedDiscountValue, setAppliedDiscountValue] = useState(0);
  const [appliedDiscountType, setAppliedDiscountType] = useState(null);
  const isPurchasingRef = useRef(false);
  
  // Initialize cart from localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`cart_${event?.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [loading, setLoading] = useState(false);
  const [purchasedTickets, setPurchasedTickets] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [promoDiscountValue, setPromoDiscountValue] = useState(0);
  const [promoDiscountType, setPromoDiscountType] = useState(null);
  
  // États pour le paiement sans compte
  const [isTicketPaymentProcessing, setIsTicketPaymentProcessing] = useState(false);
  
  // 🔥 MODIFICATION : Un seul modal avec 2 champs
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
  const [attendeeName, setAttendeeName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isInfoRequired, setIsInfoRequired] = useState(false);
  
  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  // Fetch user balance
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (!user) return;
      setIsCheckingBalance(true);
      try {
        const balances = await CoinService.getWalletBalances(user.id);
        setUserBalance(balances.coin_balance);
      } catch (error) {
        console.error("Error fetching user balance:", error);
        if (userProfile?.coin_balance !== undefined) {
          setUserBalance(userProfile.coin_balance);
        }
      } finally {
        setIsCheckingBalance(false);
      }
    };

    if (showCheckoutModal || showCartDetails) {
      fetchUserBalance();
    } else if (userProfile?.coin_balance !== undefined) {
      setUserBalance(userProfile.coin_balance);
    }
  }, [user, showCheckoutModal, showCartDetails, userProfile]);

  // 🔥 Récupérer les infos sauvegardées
  useEffect(() => {
    const savedName = localStorage.getItem('guest_name');
    if (savedName) {
      setAttendeeName(savedName);
    }
    
    const savedPhone = localStorage.getItem('guest_phone');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
    }
  }, []);

  // 🔥 Récupérer le nom de l'utilisateur connecté
  useEffect(() => {
    if (user) {
      const userName = user?.full_name || user?.user_metadata?.full_name || '';
      if (userName) {
        setAttendeeName(userName);
      }
      // Récupérer le téléphone du profil
      const fetchUserPhone = async () => {
        if (user?.id) {
          const { data, error } = await supabase
            .from("profiles")
            .select("phone")
            .eq("id", user.id)
            .maybeSingle();
          if (data && !error && data.phone) {
            setPhoneNumber(data.phone);
          }
        }
      };
      fetchUserPhone();
    }
  }, [user]);

  const isPresale = useMemo(() => {
    if (!event || !event.event_start_at) return false;
    return new Date() < new Date(event.event_start_at);
  }, [event]);

  const handleQuantityChange = (typeId, delta) => {
    if (isClosed) {
      toast({
        title: "Ventes fermees",
        description: "La billetterie est actuellement fermee.",
        variant: "destructive",
      });
      return;
    }
    setCart((prev) => {
      const current = prev[typeId] || 0;
      const type = ticketTypes?.find((t) => t.id === typeId);
      if (!type) return prev;
      const available = (type.quantity_available || 0) - (type.quantity_sold || 0);
      let next;
      if (delta > 0) {
        next = Math.min(current + delta, available);
      } else {
        next = Math.max(0, current + delta);
      }
      const newCart = { ...prev };
      if (next === 0) {
        delete newCart[typeId];
      } else {
        newCart[typeId] = next;
      }
      return newCart;
    });
  };

  const handleAddMultiple = (typeId, quantity) => {
    if (isClosed) {
      toast({
        title: "Ventes fermees",
        description: "La billetterie est actuellement fermee.",
        variant: "destructive",
      });
      return;
    }
    const type = ticketTypes?.find((t) => t.id === typeId);
    if (!type) return;
    const available = (type.quantity_available || 0) - (type.quantity_sold || 0);
    const current = cart[typeId] || 0;
    if (quantity <= 0) {
      setCart((prev) => {
        const newCart = { ...prev };
        delete newCart[typeId];
        return newCart;
      });
      return;
    }
    const maxToAdd = Math.min(quantity, available - current);
    if (maxToAdd <= 0) {
      toast({
        title: "Quantite non disponible",
        description: `Seulement ${available} places disponibles pour ${type.name}`,
        variant: "destructive",
      });
      return;
    }
    setCart((prev) => ({
      ...prev,
      [typeId]: (prev[typeId] || 0) + maxToAdd,
    }));
  };

  const removeFromCart = (typeId) => {
    const type = ticketTypes?.find((t) => t.id === typeId);
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[typeId];
      return newCart;
    });
    if (type) {
      toast({
        title: "Retire du panier",
        description: `${type.name} a ete retire de votre panier`,
      });
    }
  };

  const clearCart = () => {
    if (Object.keys(cart).length === 0) return;
    setCart({});
    toast({
      title: "Panier vide",
      description: "Tous les billets ont ete retires de votre panier",
    });
  };

  const getActivePrice = (type) => {
    if (!type) return 0;
    if (isPresale && type.presale_price_pi && type.presale_price_pi > 0)
      return type.presale_price_pi;
    return type.price_coins || type.price_pi || 0;
  };

  const cartItems = useMemo(() => {
    if (!ticketTypes) return [];
    return Object.entries(cart)
      .map(([id, qty]) => {
        const type = ticketTypes.find((t) => t.id === id);
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
          totalFcfa,
        };
      })
      .filter(Boolean);
  }, [cart, ticketTypes, isPresale]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const cartTotal = useMemo(() => {
    return Math.max(0, subtotal - promoDiscountAmount);
  }, [subtotal, promoDiscountAmount]);

  const cartTotalFcfa = useMemo(() => cartTotal * 10, [cartTotal]);
  
  const cartTotalWithFees = useMemo(() => {
    const totalWithFees = cartTotalFcfa * (1 + MONEYFUSION_FEE_RATE);
    return Math.ceil(totalWithFees);
  }, [cartTotalFcfa]);

  const totalTicketsInCart = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const hasSufficientBalance = useMemo(() => (userBalance || 0) >= cartTotal, [userBalance, cartTotal]);
  const balanceDeficit = useMemo(() => Math.max(0, cartTotal - (userBalance || 0)), [userBalance, cartTotal]);
  const userBalanceCfa = (userBalance || 0) * FCFA_PER_COIN;
  const deficitCfa = balanceDeficit * FCFA_PER_COIN;

  // Handle promo code application
  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      setPromoCodeError("Veuillez entrer un code");
      return;
    }

    setApplyingPromoCode(true);
    setPromoCodeError("");

    try {
      const result = await applyPromoCode(promoCodeInput, subtotal, user?.id);

      if (!result.codeId) {
        setPromoCodeError(result.message || "Code promo invalide");
        toast({
          title: "Code promo invalide",
          description: result.message || "Verifiez que le code est correct",
          variant: "destructive",
        });
        setApplyingPromoCode(false);
        return;
      }

      if (result.newTotal !== subtotal && result.codeId) {
        setIsPromoApplied(true);
        setPromoDiscountAmount(subtotal - result.newTotal);
        setPromoCommissionAmount(result.commissionAmount);
        setAppliedPromoCodeId(result.codeId);
        setAppliedInfluencerId(result.influencerId);
        setPendingCommissionAmount(result.commissionAmount);
        setAppliedDiscountValue(result.discountValue);
        setAppliedDiscountType(result.discountType);
        setPromoCodeInput("");

        if (result.influencerId === user?.id) {
          toast({
            title: "Code promo applique",
            description: "Reduction appliquee, mais vous ne recevrez pas de commission",
            className: "bg-yellow-600 text-white",
            duration: 5000,
          });
        } else {
          toast({
            title: "Code promo applique !",
            description: `Reduction de ${(subtotal - result.newTotal).toFixed(2)} pieces`,
            className: "bg-green-600 text-white",
            duration: 4000,
          });
        }
      }
    } catch (error) {
      console.error("Error applying promo code:", error);
      setPromoCodeError("Erreur lors de l'application du code");
    } finally {
      setApplyingPromoCode(false);
    }
  };

  const handleRemovePromoCode = () => {
    removePromoCode();
    setIsPromoApplied(false);
    setPromoDiscountAmount(0);
    setPromoCommissionAmount(0);
    setAppliedPromoCodeId(null);
    setAppliedInfluencerId(null);
    setPendingCommissionAmount(0);
    setAppliedDiscountValue(0);
    setAppliedDiscountType(null);
    toast({
      title: "Code promo supprime",
      description: "La reduction a ete retiree",
    });
  };

  const redirectToPacks = () => {
    setShowInsufficientBalanceModal(false);
    setShowCheckoutModal(false);
    window.location.href = "/packs";
  };

  const redirectToMyTickets = () => {
    window.location.href = "/profile?tab=tickets";
  };

  // Sauvegarder le téléphone de l'utilisateur
  const saveUserPhone = async (phone) => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from("profiles")
      .update({ phone: phone })
      .eq("id", user.id);

    if (error) {
      console.error("❌ Erreur sauvegarde téléphone:", error);
      return false;
    }

    return true;
  };

  // 🔥 SAUVEGARDER LE NOM DE L'UTILISATEUR
  const saveUserName = async (name) => {
    if (!user?.id) return false;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", user.id);

    if (error) {
      console.error("❌ Erreur sauvegarde nom:", error);
      return false;
    }

    return true;
  };

  // 🔥 Traiter le paiement du ticket - NE CRÉE PAS DE TICKET ICI
  const processTicketPayment = async () => {
    if (isTicketPaymentProcessing) {
      console.log('⏳ Paiement déjà en cours, ignore');
      return;
    }

    setIsTicketPaymentProcessing(true);

    try {
      const cartData = {};
      cartItems.forEach(item => {
        cartData[item.id] = item.quantity;
      });

      const userId = user?.id || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const orderId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const returnUrl = `${window.location.origin}/profile?tab=tickets&payment=success&order=${orderId}`;
      const amountWithFees = cartTotalWithFees;
      
      // 🔥 Utiliser le nom saisi
      let finalAttendeeName = attendeeName.trim();
      if (!finalAttendeeName && user) {
        finalAttendeeName = user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Participant';
      }
      if (!finalAttendeeName) {
        finalAttendeeName = 'Invité';
      }

      // 🔥 UTILISER LE TÉLÉPHONE SAISI
      const phoneToSend = phoneNumber.trim();
      console.log('📱 Envoi du téléphone à MoneyFusion:', phoneToSend);
      
      if (!phoneToSend || phoneToSend.length < 8) {
        toast({
          title: "Numéro requis",
          description: "Veuillez entrer un numéro de téléphone valide.",
          variant: "destructive",
        });
        setShowPaymentInfoModal(true);
        setIsTicketPaymentProcessing(false);
        return;
      }

      // Récupérer le lieu complet
      const fullAddress = event?.full_address || event?.address || event?.location || event?.city || 'Lieu non spécifié';
      const location = event?.location || event?.city || 'Lieu non spécifié';
      const city = event?.city || '';
      const country = event?.country || '';
      const address = event?.address || '';

      // STOCKER LES DONNÉES DE PAIEMENT EN ATTENTE
      const paymentData = {
        order_id: orderId,
        event_id: event.id,
        cart: cartData,
        promoCodeId: appliedPromoCodeId || null,
        commissionAmount: pendingCommissionAmount || promoCommissionAmount || 0,
        discountAmount: promoDiscountAmount || 0,
        totalFcfa: cartTotalFcfa,
        totalWithFees: amountWithFees,
        feesAmount: amountWithFees - cartTotalFcfa,
        timestamp: Date.now(),
        isGuest: !user,
        userEmail: user?.email || null,
        phone: phoneToSend,
        attendeeName: finalAttendeeName,
        event_title: event.title,
        event_start_at: event.event_start_at,
        event_end_at: event.event_end_at,
        event_location: location,
        event_full_address: fullAddress,
        event_city: city,
        event_country: country,
        event_address: address,
        userId: userId,
        ticketTypes: ticketTypes.map(t => ({
          id: t.id,
          name: t.name,
          price: t.price,
          color: t.color,
          description: t.description
        }))
      };

      // Sauvegarder dans localStorage pour le retour
      localStorage.setItem('pending_ticket_payment', JSON.stringify(paymentData));

      // APPELER MONEYFUSION POUR LE PAIEMENT
      const response = await fetch('/.netlify/functions/create-ticket-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          totalPrice: amountWithFees,
          article: [{ 
            ticket_payment: cartTotalFcfa,
            fees: amountWithFees - cartTotalFcfa,
            event_id: event.id,
            cart: cartData
          }],
          personal_Info: [{
            userId: userId,
            orderId: orderId,
            amountFcfa: cartTotalFcfa,
            amountWithFees: amountWithFees,
            eventId: event.id,
            promoCodeId: appliedPromoCodeId || null,
            commissionAmount: pendingCommissionAmount || promoCommissionAmount || 0,
            cart: cartData,
            discountAmount: promoDiscountAmount || 0,
            isGuest: !user,
            userEmail: user?.email || null,
            attendeeName: finalAttendeeName,
            event_full_address: fullAddress
          }],
          numeroSend: phoneToSend,
          nomclient: finalAttendeeName,
          return_url: returnUrl,
          webhook_url: `${window.location.origin}/.netlify/functions/moneyfusion-ticket-webhook`
        })
      });

      const responseText = await response.text();
      console.log('📥 Réponse brute:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON:', parseError);
        throw new Error('La réponse du serveur n\'est pas un JSON valide');
      }

      if (!response.ok) {
        throw new Error(result.message || `Erreur HTTP ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.message || 'Erreur lors de la création du paiement');
      }

      // REDIRECTION VERS MONEYFUSION
      if (result.redirect_url) {
        console.log('🔄 Redirection vers MoneyFusion:', result.redirect_url);
        window.location.href = result.redirect_url;
      } else {
        throw new Error('Aucune URL de redirection reçue');
      }

    } catch (error) {
      console.error('❌ Erreur paiement ticket:', error);
      
      let errorMessage = error.message || "Une erreur est survenue lors du paiement.";
      
      if (error.message.includes('fetch')) {
        errorMessage = "Impossible de contacter le serveur de paiement. Vérifiez votre connexion.";
      } else if (error.message.includes('JSON')) {
        errorMessage = "Erreur de communication avec le serveur de paiement.";
      } else if (error.message.includes('404')) {
        errorMessage = "Service de paiement temporairement indisponible. Veuillez réessayer.";
      }
      
      toast({
        title: "Erreur de paiement",
        description: errorMessage,
        variant: "destructive",
        duration: 6000,
      });
      
      setIsTicketPaymentProcessing(false);
    }
  };

  // 🔥 Paiement sans compte via MoneyFusion - Avec modal unique
  const handleTicketPaymentWithoutAccount = async () => {
    if (isTicketPaymentProcessing) {
      toast({
        title: "Paiement en cours",
        description: "Veuillez patienter, le paiement est déjà en cours.",
        variant: "default",
      });
      return;
    }

    if (totalTicketsInCart === 0) {
      toast({
        title: "Panier vide",
        description: "Veuillez ajouter des billets à votre panier.",
        variant: "destructive",
      });
      return;
    }

    if (isClosed) {
      toast({
        title: "Ventes fermees",
        description: "La billetterie est actuellement fermee.",
        variant: "destructive",
      });
      return;
    }

    // 🔥 Vérifier si les infos sont déjà renseignées
    const hasName = attendeeName.trim() && attendeeName.trim() !== 'Invité';
    const hasPhone = phoneNumber.trim() && phoneNumber.trim().length >= 8;
    
    // Pour les invités, toujours demander les infos
    if (!user || !hasName || !hasPhone) {
      console.log('👤 Affichage du modal unique pour les informations');
      setIsInfoRequired(true);
      setShowPaymentInfoModal(true);
      return;
    }

    // Si tout est OK, procéder au paiement
    setTimeout(() => {
      processTicketPayment();
    }, 300);
  };

  // 🔥 Gestionnaire pour le modal unique
  const handlePaymentInfoSubmit = async () => {
    // Valider le nom
    if (!attendeeName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez entrer votre nom complet.",
        variant: "destructive",
      });
      return;
    }

    // Valider le téléphone
    let cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.startsWith("226") && cleanPhone.length > 8) {
      cleanPhone = cleanPhone.substring(3);
    }
    if (cleanPhone.startsWith("0") && cleanPhone.length === 9) {
      cleanPhone = cleanPhone.substring(1);
    }

    if (cleanPhone.length < 8 || cleanPhone.length > 12) {
      toast({
        title: "Numéro invalide",
        description: "Veuillez entrer un numéro valide (8 à 12 chiffres).",
        variant: "destructive",
      });
      return;
    }

    // Sauvegarder les informations
    localStorage.setItem('guest_name', attendeeName.trim());
    localStorage.setItem('guest_phone', cleanPhone);
    
    setPhoneNumber(cleanPhone);
    
    // Si l'utilisateur EST connecté, sauvegarder dans la base
    if (user?.id) {
      await saveUserName(attendeeName.trim());
      await saveUserPhone(cleanPhone);
    }
    
    setShowPaymentInfoModal(false);
    setIsInfoRequired(false);
    
    // Procéder au paiement
    setTimeout(() => {
      processTicketPayment();
    }, 300);
  };

  // 🔥 handlePurchase avec compte (pièces)
  const handlePurchase = async () => {
    if (isPurchasingRef.current) {
      console.log("Achat deja en cours, ignore");
      return;
    }

    if (isClosed) {
      toast({
        title: "Impossible",
        description: "Les ventes sont fermees.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour acheter des billets",
        variant: "destructive",
      });
      setShowCheckoutModal(false);
      return;
    }

    if (totalTicketsInCart === 0) {
      toast({
        title: "Panier vide",
        description: "Veuillez ajouter des billets a votre panier",
        variant: "destructive",
      });
      return;
    }

    if (!hasSufficientBalance) {
      setShowInsufficientBalanceModal(true);
      return;
    }

    // Vérifier le nom
    const currentName = attendeeName.trim();
    const userFullName = user?.full_name || user?.user_metadata?.full_name || '';
    const hasValidName = currentName && currentName !== 'Invité' && currentName.length > 0;
    
    if (!hasValidName && !userFullName) {
      setIsInfoRequired(false);
      setShowPaymentInfoModal(true);
      return;
    }

    const userName = currentName || userFullName || user?.email?.split('@')[0] || 'Participant';

    isPurchasingRef.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("purchase_tickets_v2", {
        p_user_id: user.id,
        p_event_id: event.id,
        p_cart: cart,
        p_final_amount: cartTotal,
        p_promo_code_id: appliedPromoCodeId || null,
        p_commission_amount: pendingCommissionAmount || promoCommissionAmount || 0,
        p_payment_method: 'coins',
        p_transaction_reference: null,
        p_attendee_name: userName
      });

      if (error) {
        console.error("RPC Error:", error);
        throw new Error(error.message || "Erreur lors de l'achat");
      }
      
      if (!data.success) {
        throw new Error(data.message || "Erreur lors de l'achat");
      }

      const generatedTickets = data.tickets || [];
      const pdfTickets = generatedTickets.map((t) => ({
        ticket_number: t.qr_code || t.number,
        type_name: t.type,
        price: t.price,
        price_fcfa: t.price_fcfa || t.price * 10,
        ticket_code_short: t.qr_code?.substring(0, 8),
        qr_code: t.qr_code,
      }));

      setPurchasedTickets(pdfTickets);
      setTransactionId(data.transaction_id);
      setShowCheckoutModal(false);
      clearCart();

      setIsPromoApplied(false);
      setPromoDiscountAmount(0);
      setPromoCommissionAmount(0);
      setAppliedPromoCodeId(null);
      setAppliedInfluencerId(null);
      setPendingCommissionAmount(0);
      setPromoCodeInput("");

      toast({
        title: "Commande validee ! 🎉",
        description: (
          <div className="flex flex-col gap-1">
            <span>Votre commande a ete effectuee avec succes.</span>
            {promoDiscountAmount > 0 && (
              <div className="mt-1 p-2 bg-green-100 rounded-md">
                <span className="font-medium text-green-700">
                  Reduction appliquee : {promoDiscountAmount.toFixed(2)} pieces (
                  {Math.floor(promoDiscountAmount * 10).toLocaleString()} FCFA)
                </span>
              </div>
            )}
            <span className="font-medium text-primary mt-1">
              <Bell className="w-3 h-3 inline mr-1" />
              Redirection vers vos billets...
            </span>
          </div>
        ),
        duration: 3000,
      });

      setTimeout(() => {
        redirectToMyTickets();
      }, 2500);

      if (onRefresh) onRefresh();
      
      const newBalance = await CoinService.getWalletBalances(user.id);
      setUserBalance(newBalance.coin_balance);
      
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Erreur d'achat",
        description: error.message || "Une erreur est survenue lors de l'achat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      isPurchasingRef.current = false;
    }
  };

  const handleDownloadPDF = async () => {
    if (purchasedTickets && purchasedTickets.length > 0) {
      toast({
        title: "Generation en cours...",
        description: "Preparation de votre PDF de billets.",
      });
      try {
        await generateTicketPDF(event, purchasedTickets, user);
        toast({
          title: "Succes",
          description: "Vos billets ont ete telecharges.",
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de telecharger les billets",
          variant: "destructive",
        });
      }
    }
  };

  const getTicketIcon = (color) => {
    switch (color) {
      case "gold":
        return <Crown className="w-5 h-5 text-yellow-300" />;
      case "silver":
        return <Star className="w-5 h-5 text-slate-300" />;
      default:
        return <Ticket className="w-5 h-5 text-white" />;
    }
  };

  const quickAddOptions = [1, 2, 3, 5];

  if (!isUnlocked) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative px-2 sm:px-0">
      {/* Notification flottante */}
      {showNotification && (
        <div className="fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-500 w-[90vw] sm:w-auto">
          <Alert className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-xl max-w-md mx-auto">
            <CheckCircle2 className="h-5 w-5" />
            <AlertTitle className="text-white">Commande confirmee !</AlertTitle>
            <AlertDescription className="text-white/90">
              Vos billets sont disponibles dans l'onglet{" "}
              <strong>"Mes Billets"</strong> de votre profil.
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
          <p className="text-muted-foreground text-sm">Selectionnez vos billets ci-dessous</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {isPresale ? (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300 animate-pulse text-xs sm:text-sm">
              Prevente
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs sm:text-sm">Tarif Normal</Badge>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:py-2 bg-primary/10 rounded-lg">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium whitespace-nowrap">
              Solde: <span className="font-bold">{userBalance.toFixed(2)} pieces</span>
            </span>
          </div>
        </div>
      </div>

      {/* Ticket Grid */}
      {!ticketTypes || ticketTypes.length === 0 ? (
        <Alert>
          <AlertTitle>Aucun billet disponible</AlertTitle>
          <AlertDescription>La billetterie est fermee ou les billets sont epuises.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {ticketTypes.map((type) => {
            const price = getActivePrice(type);
            const available = (type.quantity_available || 0) - (type.quantity_sold || 0);
            const isSoldOut = available <= 0;
            const inCart = cart[type.id] || 0;
            const style = TICKET_COLORS[type.color] || TICKET_COLORS.blue;

            return (
              <Card key={type.id} className={`relative overflow-hidden transition-all hover:shadow-xl ${style.bg} ${style.border} ${isSoldOut || isClosed ? "opacity-80 grayscale" : "hover:scale-[1.02]"} group`}>
                <CardContent className="p-4 sm:p-6 flex flex-col h-full justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {getTicketIcon(type.color)}
                      <h3 className={`font-bold text-lg sm:text-xl ${style.text} break-words`}>{type.name}</h3>
                    </div>
                    <div>
                      <div className={`font-bold text-xl sm:text-2xl ${style.text} flex items-center`}>
                        {price.toFixed(2)} <Coins className="w-4 h-4 sm:w-5 sm:h-5 ml-1 text-yellow-300" />
                      </div>
                      <div className={`text-xs sm:text-sm ${style.text} opacity-80`}>{(price * 10).toLocaleString()} FCFA</div>
                    </div>
                  </div>
                  {type.description && (
                    <p className={`text-xs sm:text-sm ${style.text} opacity-90 mt-2 line-clamp-2`}>{type.description}</p>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${style.text} font-medium ${isSoldOut ? "text-red-200" : ""} truncate`}>
                        {isClosed ? "Termine" : isSoldOut ? "Epuise" : `${available} places`}
                      </span>
                      {inCart > 0 && !isClosed && (
                        <Badge variant="secondary" className={`${style.badge} text-xs px-2`}>{inCart} dans le panier</Badge>
                      )}
                    </div>
                    {!isSoldOut && !isClosed && (
                      <div className="flex flex-wrap gap-1">
                        {quickAddOptions.map((qty) => (
                          <Button key={qty} size="sm" variant="outline" className={`h-6 sm:h-7 px-2 text-xs ${style.text} border-white/30 hover:bg-white/20`} onClick={() => handleAddMultiple(type.id, qty)} disabled={available < inCart + qty}>
                            +{qty}
                          </Button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t border-white/20 gap-3 sm:gap-0">
                      {isClosed ? (
                        <div className="w-full text-center py-2 bg-black/20 rounded-lg text-white font-medium text-sm">Billetterie fermee</div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 sm:gap-3 bg-black/20 p-1 rounded-lg backdrop-blur-sm w-full sm:w-auto justify-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20 transition-colors" onClick={() => handleQuantityChange(type.id, -1)} disabled={!inCart || isSoldOut}>
                              <Minus className="w-3 h-3 sm:w-3 sm:h-3" />
                            </Button>
                            <span className={`w-8 text-center font-bold ${style.text} text-lg`}>{inCart || 0}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20 transition-colors" onClick={() => handleQuantityChange(type.id, 1)} disabled={available <= inCart || isSoldOut}>
                              <Plus className="w-3 h-3 sm:w-3 sm:h-3" />
                            </Button>
                          </div>
                          {inCart > 0 && (
                            <Button size="sm" variant="ghost" className={`h-7 px-2 text-xs ${style.text} hover:bg-white/20 w-full sm:w-auto mt-2 sm:mt-0`} onClick={() => removeFromCart(type.id)}>
                              <X className="w-3 h-3 mr-1" /> Retirer
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

      {/* Floating Cart */}
      {totalTicketsInCart > 0 && !isClosed && (
        <>
          {showCartDetails && (
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCartDetails(false)}>
              <div className="fixed bottom-0 left-0 right-0 sm:bottom-24 sm:left-1/2 sm:transform sm:-translate-x-1/2 w-full sm:max-w-md max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <Card className="bg-card shadow-2xl border-t-4 border-t-primary rounded-t-2xl sm:rounded-xl h-full overflow-hidden">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">Votre panier ({totalTicketsInCart} billet{totalTicketsInCart > 1 ? "s" : ""})</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-sm">
                          <Wallet className="w-3 h-3" />
                          <span className="font-medium">{userBalance.toFixed(2)} pieces</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive p-2">
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Vider</span>
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1 pr-2 sm:pr-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 mb-2 bg-muted/30 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.type.name}</div>
                            <div className="text-sm text-muted-foreground">{item.unitPrice.toFixed(2)} pieces x {item.quantity}</div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 ml-2">
                            <div className="text-right">
                              <div className="font-bold text-sm sm:text-base">{item.total.toFixed(2)} pieces</div>
                              <div className="text-xs text-muted-foreground">{item.totalFcfa.toLocaleString()} FCFA</div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive flex-shrink-0" onClick={() => removeFromCart(item.id)}>
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                    <div className="mt-4 pt-4 border-t">
                      {!isPromoApplied && (
                        <div className="mb-3 p-3 bg-muted/20 rounded-lg">
                          <div className="flex gap-2">
                            <input type="text" placeholder="Code promo" value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())} className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background" />
                            <Button onClick={handleApplyPromoCode} disabled={applyingPromoCode || !promoCodeInput.trim()} variant="outline" size="sm">
                              {applyingPromoCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />} Appliquer
                            </Button>
                          </div>
                          {promoCodeError && <p className="text-xs text-destructive mt-1">{promoCodeError}</p>}
                        </div>
                      )}
                      {isPromoApplied && (
                        <div className="mb-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20 animate-in zoom-in duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-green-600 animate-bounce" />
                              <span className="text-sm font-medium text-green-600">Reduction appliquee</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-green-600 animate-pulse">-{promoDiscountAmount.toFixed(2)} pieces</div>
                              <div className="text-xs text-green-600">-{Math.floor(promoDiscountAmount * 10).toLocaleString()} FCFA</div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={handleRemovePromoCode} className="h-7 px-2 text-destructive absolute right-2 top-2 hover:scale-110 transition-transform">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      {!hasSufficientBalance && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertTitle className="text-sm">Solde insuffisant</AlertTitle>
                          <AlertDescription className="text-xs">Il vous manque {balanceDeficit.toFixed(2)} pieces</AlertDescription>
                        </Alert>
                      )}
                    <div className="flex flex-col gap-3 mb-3">
  {/* Ligne principale - Total */}
  <div className="flex justify-between items-center">
    <div className="min-w-0">
      <span className="font-bold text-sm sm:text-base">Total</span>
      <div className="text-xs sm:text-sm text-muted-foreground truncate">
        Solde disponible: {userBalance.toFixed(2)} pièces
      </div>
      {isPromoApplied && (
        <div className="text-xs text-green-600 font-medium">✅ Réduction appliquée</div>
      )}
    </div>
    <div className="text-right">
      <span className="text-xl sm:text-2xl font-bold text-primary block">
        {cartTotal.toFixed(2)} pièces
      </span>
      <span className="text-xs sm:text-sm text-muted-foreground">
        {cartTotalFcfa.toLocaleString()} FCFA
      </span>
    </div>
  </div>

  {/* 🔥 Bannière d'information - Vous pouvez payer sans code promo */}
  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/50">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <div className="bg-amber-500/20 p-1.5 rounded-full">
          <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            💡 Pas de code promo ? Pas de problème !
          </span>
          <p className="text-[10px] text-muted-foreground">
            Vous pouvez payer sans code promo, le montant ci-dessous sera débité
          </p>
        </div>
      </div>
      <Badge variant="outline" className="border-amber-300 text-amber-600 dark:text-amber-400 text-[10px] whitespace-nowrap">
        Paiement direct
      </Badge>
    </div>
  </div>

  {/* 🔥 Bannière SANS COMPTE */}
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-3 border border-blue-200/50 dark:border-blue-800/50">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-0.5">
          SANS COMPTE
        </Badge>
        <div>
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Paiement rapide sans inscription
          </span>
          <p className="text-[10px] text-muted-foreground">
            Aucun compte requis, payez en quelques clics
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
          {(cartTotalWithFees).toLocaleString()} FCFA
        </span>
        <span className="text-[10px] text-muted-foreground block">
          frais 4% inclus
        </span>
      </div>
    </div>
  </div>

  {/* Économie si promo appliquée */}
  {isPromoApplied && (
    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2 border border-green-200/50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex justify-between items-center text-xs text-green-700 dark:text-green-400">
        <span className="flex items-center gap-1">
          <Tag className="w-3 h-3" />
          Économie réalisée
        </span>
        <span className="font-medium">
          {promoDiscountAmount.toFixed(2)} pièces
          <span className="text-[10px] text-muted-foreground ml-1">
            ({Math.floor(promoDiscountAmount * 10).toLocaleString()} FCFA)
          </span>
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground text-right line-through mt-0.5">
        {(subtotal * 10).toLocaleString()} FCFA sans promo
      </div>
    </div>
  )}
</div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          onClick={handleTicketPaymentWithoutAccount}
                          disabled={isTicketPaymentProcessing || isClosed}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="lg"
                        >
                          {isTicketPaymentProcessing ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          ) : (
                            <Smartphone className="w-5 h-5 mr-2" />
                          )}
                          Payer sans compte
                          <span className="ml-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                            {(cartTotalWithFees).toLocaleString()} FCFA
                          </span>
                        </Button>
                        <Button 
                          onClick={() => { 
                            setShowCartDetails(false); 
                            if (!hasSufficientBalance) {
                              setShowInsufficientBalanceModal(true);
                            } else {
                              setShowCheckoutModal(true);
                            }
                          }} 
                          className={`flex-1 ${!hasSufficientBalance ? "bg-destructive hover:bg-destructive/90" : "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"}`}
                          size="lg"
                          disabled={isCheckingBalance}
                        >
                          {isCheckingBalance ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /><span>Verification...</span></>
                          ) : !hasSufficientBalance ? (
                            <><Package className="w-5 h-5 mr-2" /><span>Recharger mon compte</span></>
                          ) : (
                            <><Wallet className="w-5 h-5 mr-2" /><span>Payer avec compte</span></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-3 sm:px-4 animate-in slide-in-from-bottom duration-500">
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-card/95 backdrop-blur-md rounded-2xl sm:rounded-full shadow-2xl border-t-4 border-t-primary p-3 sm:p-2 sm:pl-4 w-full max-w-md sm:max-w-none">
              <div className="flex items-center gap-3 mb-2 sm:mb-0 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="w-6 h-6 text-primary" />
                    {totalTicketsInCart > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">{totalTicketsInCart}</Badge>}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium whitespace-nowrap">{totalTicketsInCart} billet{totalTicketsInCart > 1 ? "s" : ""}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-primary whitespace-nowrap">{cartTotal.toFixed(2)} pieces</p>
                      {isPromoApplied && <Badge variant="secondary" className="text-[10px] bg-green-500/20">Promo</Badge>}
                      {!hasSufficientBalance && <Badge variant="destructive" className="h-4 px-1 text-[10px] whitespace-nowrap">Solde insuffisant</Badge>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center">
                <Button variant="outline" size="sm" onClick={() => setShowCartDetails(true)} className="h-9 rounded-full flex-1 sm:flex-none text-xs sm:text-sm">
                  Voir details
                </Button>
                <Button
                  size="sm"
                  onClick={handleTicketPaymentWithoutAccount}
                  disabled={isTicketPaymentProcessing || isClosed}
                  className="h-9 rounded-full flex-1 sm:flex-none text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white"
                >
                  {isTicketPaymentProcessing ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Smartphone className="w-3 h-3 mr-1 sm:w-4 sm:h-4" />
                  )}
                  Sans compte
                  <span className="ml-1 text-[8px] opacity-80">
                    +3%
                  </span>
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => { 
                    if (!hasSufficientBalance) {
                      setShowInsufficientBalanceModal(true);
                    } else {
                      setShowCheckoutModal(true);
                    }
                  }} 
                  className={`h-9 rounded-full flex-1 sm:flex-none text-xs sm:text-sm ${!hasSufficientBalance ? "bg-destructive hover:bg-destructive/90" : "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"}`}
                >
                  {!hasSufficientBalance ? "Recharger" : "Avec compte"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty Cart State */}
      {totalTicketsInCart === 0 && !isClosed && (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-3 sm:px-4">
          <Card className="bg-card/95 backdrop-blur-md border-t-4 border-t-primary shadow-lg w-full max-w-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-3">
                <ShoppingCart className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Votre panier est vide</p>
                <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="whitespace-nowrap">Ajouter des billets</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Checkout Modal - Payer avec compte */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Validation de commande</DialogTitle>
            <DialogDescription>Verifiez et modifiez votre commande avant de finaliser</DialogDescription>
          </DialogHeader>
          
          {/* Afficher le nom du titulaire */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Titulaire :</span>
              <span className="text-sm font-bold text-blue-700">
                {attendeeName || user?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Non défini'}
              </span>
              <Button 
                variant="link" 
                size="sm" 
                className="text-blue-600 p-0 h-auto ml-auto"
                onClick={() => {
                  setShowCheckoutModal(false);
                  setShowPaymentInfoModal(true);
                }}
              >
                Modifier
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Ce nom apparaîtra sur vos billets
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Votre solde</p>
                  <p className="text-xl sm:text-2xl font-bold text-primary">{userBalance.toFixed(2)} pieces</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Total panier</p>
                <p className={`text-xl sm:text-2xl font-bold ${hasSufficientBalance ? "text-green-600" : "text-destructive"}`}>{cartTotal.toFixed(2)} pieces</p>
                {isPromoApplied && <p className="text-xs text-green-600">(reduction de {promoDiscountAmount.toFixed(2)} pieces)</p>}
              </div>
            </div>
            {!hasSufficientBalance && (
              <Alert variant="destructive" className="mt-3">
                <AlertTitle className="text-sm">Solde insuffisant</AlertTitle>
                <AlertDescription className="text-xs">Il vous manque {balanceDeficit.toFixed(2)} pieces pour valider cette commande.</AlertDescription>
              </Alert>
            )}
          </div>
          <div id="promo-section" className="mb-3 p-3 bg-muted/20 rounded-lg">
            <div className="flex gap-2">
              <input id="promo-code-input" type="text" placeholder="Code promo" value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())} className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background transition-all duration-200 focus:ring-2 focus:ring-green-500" />
              <Button onClick={handleApplyPromoCode} disabled={applyingPromoCode || !promoCodeInput.trim()} variant="outline" size="sm" className={`transition-all duration-300 ${applyingPromoCode ? "opacity-70" : "hover:scale-105"}`}>
                {applyingPromoCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4 transition-transform group-hover:rotate-12" />} Appliquer
              </Button>
            </div>
            {promoCodeError && <p id="promo-error" className="text-xs text-destructive mt-1">{promoCodeError}</p>}
          </div>
          <ScrollArea className="max-h-[40vh] sm:max-h-[50vh] pr-2 sm:pr-4">
            <div className="space-y-3 sm:space-y-4 py-2">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Votre panier est vide</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base sm:text-lg truncate">{item.type.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-1">{item.type.description || "Billet standard"}</div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleQuantityChange(item.id, -1)} disabled={item.quantity <= 1}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleQuantityChange(item.id, 1)} disabled={(item.type.quantity_available || 0) - (item.type.quantity_sold || 0) <= item.quantity}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button size="sm" variant="destructive" className="h-7 sm:h-8 px-2" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Supprimer</span>
                        </Button>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-base sm:text-lg font-bold">{item.total.toFixed(2)} pieces</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{item.totalFcfa.toLocaleString()} FCFA</div>
                      <div className="text-xs text-muted-foreground mt-1">{item.unitPrice.toFixed(2)} pieces / billet</div>
                      
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
                    <span className="text-base sm:text-lg font-bold">Total ({totalTicketsInCart} billet{totalTicketsInCart > 1 ? "s" : ""})</span>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">{cartItems.length} type{cartItems.length > 1 ? "s" : ""} de billet</div>
                  </div>
                  <div className="text-right ml-2">
                    <span className="text-xl sm:text-2xl font-bold text-primary block">{cartTotal.toFixed(2)} pieces</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">{cartTotalFcfa.toLocaleString()} FCFA</span>
                    {isPromoApplied && <div className="text-xs text-green-600 line-through">(au lieu de {(subtotal * 10).toLocaleString()} FCFA)</div>}
                  </div>
                </div>
                {!hasSufficientBalance && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-xs sm:text-sm text-amber-800">
                      <Package className="w-4 h-4 inline mr-2" /> Votre solde est insuffissant. <strong>Rechargez vos pieces pour continuer.</strong>
                    </AlertDescription>
                  </Alert>
                )}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-xs sm:text-sm text-blue-700">
                    <Bell className="w-4 h-4 inline mr-2" /> Apres paiement, vos billets seront disponibles dans votre profil.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button variant="destructive" onClick={clearCart} className="w-full sm:flex-1" disabled={cartItems.length === 0}>
                    <Trash2 className="w-4 h-4 mr-2" /> Vider le panier
                  </Button>
                  <Button variant="outline" onClick={() => setShowCheckoutModal(false)} className="w-full sm:flex-1">
                    Continuer mes achats
                  </Button>
                </div>
                <Button onClick={hasSufficientBalance ? handlePurchase : () => setShowInsufficientBalanceModal(true)} disabled={loading || cartItems.length === 0 || !hasSufficientBalance} className={`w-full sm:w-48 ${hasSufficientBalance ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"}`} size="lg">
                  {loading ? (
                    <><Loader2 className="animate-spin mr-2 w-5 h-5" /><span>Traitement...</span></>
                  ) : hasSufficientBalance ? (
                    <><Check className="mr-2 w-5 h-5" /><span>Payer {cartTotal.toFixed(2)} pieces</span></>
                  ) : (
                    <><Package className="mr-2 w-5 h-5" /><span>Recharger mon compte</span></>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

     {/* Insufficient Balance Modal - CORRIGÉ */}
<Dialog open={showInsufficientBalanceModal} onOpenChange={setShowInsufficientBalanceModal}>
  <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
    <DialogHeader>
      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
        <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
      </div>
      <DialogTitle className="text-xl sm:text-2xl text-center text-amber-700">
        Solde insuffisant
      </DialogTitle>
      {/* ✅ CORRECTION : Utiliser asChild avec un div */}
      <DialogDescription asChild>
        <div className="text-center text-sm sm:text-base space-y-2">
          <div>
            Votre solde actuel de <strong>{userBalance.toLocaleString()} pièces</strong>{' '}
            <span className="text-muted-foreground">(≈ {userBalanceCfa.toLocaleString()} FCFA)</span>{' '}
            ne permet pas d'acheter le panier de{' '}
            <strong>{cartTotal.toLocaleString()} pièces</strong>{' '}
            <span className="text-muted-foreground">(≈ {cartTotalFcfa.toLocaleString()} FCFA)</span>.
          </div>
          <div>
            Il vous manque{' '}
            <strong className="text-destructive">{balanceDeficit.toLocaleString()} pièces</strong>{' '}
            <span className="text-muted-foreground">(≈ {deficitCfa.toLocaleString()} FCFA)</span>.
          </div>
        </div>
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <AlertTitle className="text-amber-800 text-sm sm:text-base">
          Solution rapide
        </AlertTitle>
        <AlertDescription className="text-amber-700 text-xs sm:text-sm">
          Rechargez votre compte avec un pack de pièces pour finaliser votre achat !
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
            <DialogTitle className="text-xl sm:text-2xl text-green-700">Felicitations !</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Votre commande a ete effectuee avec succes !<br />
              <strong className="text-primary font-semibold">Vos billets sont disponibles dans l'onglet "Mes Billets" de votre profil.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 sm:py-6 space-y-3">
            <Button onClick={handleDownloadPDF} className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold shadow-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
              <Download className="mr-2 h-5 w-5 sm:h-6 sm:w-6" /><span>Telecharger les Billets (PDF)</span>
            </Button>
            <Button variant="outline" className="w-full" onClick={redirectToMyTickets}>
              <Ticket className="mr-2 h-5 w-5" />
              Voir mes billets
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔥 MODIFICATION : Modal unique avec Nom + Numéro - CORRIGÉ */}
<Dialog open={showPaymentInfoModal} onOpenChange={(open) => {
  if (!open && !attendeeName.trim() && isInfoRequired) {
    return;
  }
  setShowPaymentInfoModal(open);
}}>
  <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6">
    <DialogHeader>
      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600/20 rounded-full flex items-center justify-center mb-4">
        <User className="w-8 h-8 text-blue-500" />
      </div>
      <DialogTitle className="text-xl text-center">👤 Informations requises</DialogTitle>
      {/* ✅ CORRECTION : Utiliser un div au lieu d'un p */}
      <DialogDescription asChild>
        <div className="text-center">
          {user 
            ? "Veuillez confirmer vos informations pour le paiement." 
            : "Veuillez renseigner vos informations pour le paiement."}
        </div>
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      {/* Champ Nom */}
      <div>
        <Label htmlFor="name-modal" className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4 text-blue-500" />
          Nom complet
        </Label>
        <Input
          id="name-modal"
          type="text"
          placeholder="Ex: Jean Dupont"
          value={attendeeName}
          onChange={(e) => setAttendeeName(e.target.value)}
          className="text-lg mt-1"
          autoFocus
        />
        <p className="text-xs text-muted-foreground mt-1">
          Ce nom sera imprimé sur vos billets.
        </p>
      </div>

      {/* Champ Numéro de téléphone */}
      <div>
        <Label htmlFor="phone-modal" className="text-sm font-medium flex items-center gap-2">
          <Phone className="w-4 h-4 text-green-500" />
          Numéro à débiter
        </Label>
        <Input
          id="phone-modal"
          type="tel"
          placeholder="Ex: 73790978"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          className="text-lg mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Format: 8 à 12 chiffres (sans espaces ni indicatif)
        </p>
        <p className="text-xs text-yellow-500 mt-1">
          🔒 Ce numéro sera utilisé pour le paiement via MoneyFusion.
        </p>
        <p className="text-xs text-blue-400 mt-1">
          💡 {user ? 'Ce numéro sera associé à votre compte.' : 'Si vous créez un compte plus tard, ce numéro vous sera associé.'}
        </p>
      </div>
      
      <div className="flex gap-3 mt-4">
        <Button 
          variant="outline" 
          onClick={() => {
            if (!isInfoRequired) {
              setShowPaymentInfoModal(false);
            } else {
              toast({
                title: "Informations requises",
                description: "Vous devez remplir tous les champs pour continuer.",
                variant: "destructive",
              });
            }
          }} 
          className="flex-1"
          disabled={isInfoRequired}
        >
          Annuler
        </Button>
        <Button 
          onClick={handlePaymentInfoSubmit} 
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          disabled={!attendeeName.trim() || !phoneNumber.trim()}
        >
          <Lock className="w-4 h-4 mr-2" />
          Paiement sécurisé
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default TicketingInterface;