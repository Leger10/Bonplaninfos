// Task 7: Ajout des commentaires explicites sur la logique de protection
import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, Landmark, DollarSign, Wallet as WalletIcon, RefreshCw, ShoppingCart, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';
import { useWalletPin } from '@/hooks/useWalletPin';
import PinVerificationModal from '@/components/common/PinVerificationModal';
import { useToast } from '@/components/ui/use-toast';

const WalletPage = () => {
  const { user } = useAuth();
  const { userProfile, loadingProfile, adminConfig, forceRefreshUserProfile } = useData();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Task 3: Utilisation des états pour la vérification PIN
  const { isUnlocked, unlock, lock } = useWalletPin(user?.id);
  const [showPinModal, setShowPinModal] = useState(false);
  
  // État pour mémoriser l'action en attente après déverrouillage
  const [pendingAction, setPendingAction] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await forceRefreshUserProfile();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Task 6: Fonction d'interception des opérations sensibles
  const requireUnlock = (actionCallback) => {
    if (!isUnlocked) {
      setPendingAction(() => actionCallback); // Stocker le callback
      setShowPinModal(true); // Afficher le modal PIN
    } else {
      actionCallback(); // Exécuter directement si déjà déverrouillé
    }
  };

  const handleUnlockSuccess = () => {
    unlock();
    setShowPinModal(false);
    
    // Si une action était en attente, on l'exécute
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleWithdrawalRequest = () => {
    // Cette fonction sera exécutée uniquement si le portefeuille est déverrouillé
    toast({
      title: "🚧 Cette fonctionnalité n'est pas encore implémentée.",
      description: "L'interface de retrait détaillée sera disponible prochainement !",
    });
  };

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="p-4 text-center">
        <p>{t('profile_page.unauthorized_desc')}</p>
        <Button onClick={() => navigate('/auth')}>{t('auth.login.button')}</Button>
      </div>
    );
  }

  const { free_coin_balance, coin_balance, available_earnings } = userProfile;
  const totalCoins = (free_coin_balance || 0) + (coin_balance || 0);
  
  // Task 2: Masquer les valeurs par défaut
  const formatCoin = (val) => isUnlocked ? `${val?.toLocaleString() || 0} π` : '*** π';
  const formatFull = (val) => isUnlocked 
    ? `${val?.toLocaleString() || 0} pièces (${((val || 0) * COIN_TO_FCFA_RATE).toLocaleString()} FCFA)`
    : '🔒 Verrouillé';

  const StatCard = ({ icon, title, value, color, description }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className={`overflow-hidden bg-gradient-to-br ${color} text-white relative`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {isUnlocked ? icon : <Lock className="h-5 w-5 text-white/60" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono">
            {value}
          </div>
          {description && <p className="text-xs text-white/80 mt-1 font-mono">{description}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{t('wallet_page.title')}</h1>
          {isUnlocked && (
            <Button variant="ghost" size="sm" onClick={lock} className="text-muted-foreground hover:text-destructive text-xs h-8">
              <Lock className="w-3 h-3 mr-1" /> Reverrouiller
            </Button>
          )}
        </div>
        <Button onClick={handleRefresh} variant="ghost" size="icon" disabled={isRefreshing}>
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {/* Bannière de verrouillage globale pour la page Wallet */}
      {!isUnlocked && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/10 shadow-sm">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-full">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-500">Portefeuille verrouillé</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400/80">Déverrouillez pour voir vos soldes et effectuer des transactions.</p>
              </div>
            </div>
            <Button onClick={() => setShowPinModal(true)} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white">
              <Unlock className="w-4 h-4 mr-2" /> Déverrouiller
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard
          icon={<WalletIcon className="h-6 w-6 text-white/80" />}
          title={t('wallet_page.total_balance')}
          value={formatFull(totalCoins)}
          color="from-blue-500 to-indigo-600"
          description={`(${formatCoin(free_coin_balance)} ${t('wallet_page.free_coins')} + ${formatCoin(coin_balance)} ${t('wallet_page.paid_coins')})`}
        />
        <StatCard
          icon={<DollarSign className="h-6 w-6 text-white/80" />}
          title={t('wallet_page.available_earnings')}
          value={formatFull(available_earnings)}
          color="from-green-500 to-teal-600"
          description={"Prêt à être retiré"}
        />
       <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
  <Card className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-amber-400 to-orange-500 text-white relative overflow-hidden group">
    <CardHeader className="relative z-0">
      <CardTitle>{t('wallet_page.buy_coins_title')}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col items-center relative z-0">
      <p className="text-center mb-4">{t('wallet_page.buy_coins_desc')}</p>
      <Button onClick={() => navigate('/packs')} className="bg-white text-orange-500 hover:bg-white/90">
        <ShoppingCart className="mr-2 h-4 w-4" /> {t('wallet_page.buy_coins_button')}
      </Button>
    </CardContent>
  </Card>
</motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card/80 backdrop-blur-sm relative">
          {!isUnlocked && <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 rounded-xl" />}
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Coins className="text-primary" /> {t('wallet_page.balance_details_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
              <span className="font-medium">{t('wallet_page.free_coins')}</span>
              <span className="font-bold text-lg text-green-500 font-mono">{formatFull(free_coin_balance)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
              <span className="font-medium">{t('wallet_page.paid_coins')}</span>
              <span className="font-bold text-lg text-blue-500 font-mono">{formatFull(coin_balance)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              {t('wallet_page.free_coins_desc')}
            </p>
          </CardContent>
        </Card>

        
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <Card className="mt-8 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Historique des Transactions
              {!isUnlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isUnlocked ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">L'historique des transactions sera bientôt disponible ici.</p>
              </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center">
                 <Lock className="w-10 h-10 text-muted-foreground/30 mb-3" />
                 <p className="text-muted-foreground">Veuillez déverrouiller votre portefeuille pour voir l'historique.</p>
                 <Button variant="outline" className="mt-4" onClick={() => setShowPinModal(true)}>Déverrouiller</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal PIN réutilisable */}
      <PinVerificationModal 
        isOpen={showPinModal}
        onClose={setShowPinModal}
        onSuccess={handleUnlockSuccess}
        userId={user?.id}
        userProfile={userProfile}
      />
    </div>
  );
};

export default WalletPage;