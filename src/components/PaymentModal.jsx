import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, ShieldCheck, Star, Gem, Copy, ExternalLink, CreditCard, Smartphone, Building } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { CoinService } from '@/services/CoinService';
import QRCode from 'qrcode.react';

const PaymentModal = ({ isOpen, onClose, amountFcfa, packId, action }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [packs, setPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');

  useEffect(() => {
    const fetchPacks = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('coin_packs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching coin packs:', error);
        toast({ title: "Erreur", description: "Impossible de charger les packs.", variant: "destructive" });
        setPacks([]);
      } else {
        setPacks(data);
        if (packId) {
          const preselectedPack = data.find(p => p.id === packId);
          if (preselectedPack) handlePackSelection(preselectedPack);
        } else if (amountFcfa) {
          // Create a custom pack if amount is specified
          const customPack = { id: 'custom', name: 'Recharge Personnalisée', fcfa_price: amountFcfa, coin_amount: CoinService.convertFcfaToCoins(amountFcfa), bonus_coins: 0 };
          handlePackSelection(customPack);
        }
      }
      setIsLoading(false);
    };

    if (isOpen) {
      fetchPacks();
    } else {
      // Reset state on close
      setSelectedPack(null);
      setPaymentUrl('');
    }
  }, [isOpen, toast, packId, amountFcfa]);

  const handlePackSelection = (pack) => {
    if (!user) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez vous connecter." });
      return;
    }
    setSelectedPack(pack);
    const url = CoinService.generateMoneyFusionLink({
      userId: user.id,
      amountFcfa: pack.fcfa_price,
      action: action || 'buy_coins',
      packId: pack.id !== 'custom' ? pack.id : null,
      email: user.email,
      phone: user.phone || ''
    });
    setPaymentUrl(url);
  };

  const handlePayment = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "Veuillez sélectionner un pack",
        description: "Choisissez un pack de pièces pour continuer.",
        variant: "default",
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentUrl);
    toast({ title: "Copié!", description: "Le lien de paiement a été copié." });
  };

  const renderPackSelection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-h-[60vh] overflow-y-auto">
      {packs.map((pack) => (
        <div
          key={pack.id}
          className={`relative p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
            pack.name.includes('Premium') || pack.name.includes('Standard') ? 'border-primary bg-primary/10' : 'border-gray-700 bg-gray-800'
          } hover:border-primary`}
          onClick={() => handlePackSelection(pack)}
        >
          {(pack.name.includes('Premium') || pack.name.includes('Standard')) && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
              <Star size={12} /> Populaire
            </div>
          )}
          <div className="flex flex-col items-center text-center pt-4">
            <h3 className="text-xl font-semibold mb-1 text-white">{pack.name}</h3>
            <p className="text-4xl font-bold text-primary my-2 flex items-center gap-2">
              <Gem size={28} />
              {pack.coin_amount + (pack.bonus_coins || 0)}
            </p>
            {pack.bonus_coins > 0 && (
              <p className="text-sm text-primary/80 font-semibold">dont {pack.bonus_coins} pièces bonus !</p>
            )}
            <p className="text-lg font-medium text-white mt-3 bg-black/20 px-4 py-1 rounded-full">{pack.fcfa_price.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderPaymentView = () => (
    <div className="p-4 space-y-6 text-center max-h-[70vh] overflow-y-auto">
      <h3 className="text-lg font-semibold">Finalisez votre paiement de {selectedPack.fcfa_price.toLocaleString('fr-FR')} FCFA</h3>
      <p className="text-muted-foreground">Scannez le QR code avec votre téléphone ou utilisez le lien ci-dessous.</p>
      <div className="p-4 bg-white rounded-lg inline-block">
        <QRCode value={paymentUrl} size={192} />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={copyToClipboard} variant="outline" className="w-full">
          <Copy className="w-4 h-4 mr-2" /> Copier le lien
        </Button>
        <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="w-full">
          <Button className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" /> Ouvrir le lien
          </Button>
        </a>
      </div>
      <Button variant="ghost" onClick={() => { setSelectedPack(null); setPaymentUrl(''); }}>Retour au choix des packs</Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Coins /> {selectedPack ? 'Finaliser le Paiement' : 'Acheter des Pièces'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {selectedPack ? 'Suivez les instructions pour recharger votre compte.' : 'Rechargez votre compte pour profiter de toutes les fonctionnalités.'}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          selectedPack ? renderPaymentView() : renderPackSelection()
        )}

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between w-full pt-6 border-t border-gray-200 dark:border-gray-700 gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-green-500" />
              <span>Sécurisé par</span>
              <span className="font-semibold text-foreground">MoneyFusion</span>
            </div>

            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

            <div className="flex items-center gap-1">
              <CreditCard size={14} />
              <Smartphone size={14} />
              <Building size={14} />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              size="sm"
            >
              Plus tard
            </Button>

            <Button
              onClick={handlePayment}
              disabled={isLoading || !selectedPack}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Payer maintenant"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;