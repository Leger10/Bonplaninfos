import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Loader2,
  DollarSign,
  Wallet,
  TrendingUp,
  Eye,
  ArrowUpRight,
  Download,
  Lock,
  Unlock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import WithdrawalModal from '@/components/common/WithdrawalModal';
import PinVerificationModal from '@/components/common/PinVerificationModal';
import { useWalletSecurity } from '@/hooks/useWalletSecurity';
import { generateEarningsSlip } from '@/utils/pdfGenerator';
import { COIN_TO_FCFA_RATE } from '@/constants/coinRates';

const OrganizerDashboardTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [stats, setStats] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const refreshTimeout = useRef(null);

  const { isWalletUnlocked, showPinModal, openPinModal, closePinModal, unlockWallet } = useWalletSecurity(user?.id);

  // Charger le profil complet au démarrage
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchData();

      const channel = supabase
        .channel('creator-realtime-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events', filter: `organizer_id=eq.${user.id}` },
          handleRealtimeUpdate
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'organizer_earnings', filter: `organizer_id=eq.${user.id}` },
          handleRealtimeUpdate
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            console.log('Profile updated:', payload);
            setUserProfile(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
      };
    }
  }, [user]);

  // Fonction pour récupérer le profil complet depuis Supabase
  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
      
      console.log('Profil chargé:', data);
      console.log('wallet_pin existe?', !!data?.wallet_pin);
      console.log('available_earnings:', data?.available_earnings);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleRealtimeUpdate = () => {
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(() => fetchData(false), 2000);
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const { data: statsData } = await supabase.rpc(
        'get_organizer_earnings_summary',
        { p_organizer_id: user.id }
      );
      setStats(statsData?.data || {});

      const { data: history } = await supabase
        .from('organizer_withdrawal_requests')
        .select('*')
        .eq('organizer_id', user.id)
        .order('requested_at', { ascending: false });

      setWithdrawals(history || []);
    } catch (error) {
      console.error('Error fetching creator stats:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // === CORRECTION ICI : Utiliser userProfile.available_earnings au lieu de stats?.wallet?.available_balance_coins ===
  const availableBalanceCoins = userProfile?.available_earnings || 0;
  const availableBalanceFcfa = availableBalanceCoins * COIN_TO_FCFA_RATE;

  const pendingNetCoins = stats?.pending?.total_net || 0;
  const pendingNetFcfa = pendingNetCoins * COIN_TO_FCFA_RATE;

  const handleDownloadSlip = async () => {
    if (!isWalletUnlocked) {
      openPinModal();
      return;
    }

    if (availableBalanceFcfa === 0) {
      toast({
        title: "Aucun gain",
        description: "Vous n'avez pas encore de gains à télécharger.",
        variant: "warning"
      });
      return;
    }

    setDownloading(true);
    try {
      const netEarnings = availableBalanceFcfa || 0;
      const grossRevenue = Math.round(netEarnings / 0.95);
      const fees = grossRevenue - netEarnings;

      await generateEarningsSlip({
        organizerName: user?.user_metadata?.full_name || userProfile?.full_name || 'Organisateur',
        totalRevenue: grossRevenue,
        fees: fees,
        netEarnings: netEarnings,
        date: new Date(),
        eventCount: stats?.creator_stats?.events_count || 0
      });

      toast({ 
        title: "Document prêt", 
        description: "Votre relevé a été téléchargé." 
      });
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de générer le PDF.", 
        variant: "destructive" 
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleWithdrawClick = () => {
    if (!isWalletUnlocked) {
      openPinModal();
    } else {
      setWithdrawalModalOpen(true);
    }
  };

  // Fonction appelée après le succès de la vérification du PIN
  const handlePinSuccess = () => {
    unlockWallet();
    toast({
      title: "Portefeuille déverrouillé",
      description: "Vous pouvez maintenant accéder à vos gains.",
    });
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in">
      {!isWalletUnlocked && (
        <Alert className="bg-emerald-500/10 border-emerald-500/50 mb-4">
          <Lock className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800">Sécurité activée</AlertTitle>
          <AlertDescription className="text-emerald-700 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Déverrouillez pour voir vos gains réels et effectuer des retraits.</span>
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-white border-emerald-500 text-emerald-700 hover:bg-emerald-50" 
              onClick={openPinModal}
            >
              <Unlock className="w-3 h-3 mr-1" /> Déverrouiller
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance - CORRIGÉ pour utiliser userProfile.available_earnings */}
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-0 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-24 h-24" />
          </div>

          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-lg font-medium opacity-90 flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Solde Disponible
            </CardTitle>
          </CardHeader>

          <CardContent className="relative z-10">
            <div className="text-4xl font-bold mb-1">
              {isWalletUnlocked ? availableBalanceFcfa.toLocaleString() : '***'}{' '}
              <span className="text-lg opacity-80">FCFA</span>
            </div>

            <p className="text-sm opacity-80 mb-6 font-mono">
              ({isWalletUnlocked ? availableBalanceCoins.toLocaleString() : '***'} π)
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleWithdrawClick}
                className="flex-1 bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-sm"
                disabled={!isWalletUnlocked || (isWalletUnlocked && availableBalanceFcfa < 500)}
              >
                {!isWalletUnlocked && <Lock className="w-3 h-3 mr-2" />}
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Retirer
              </Button>

              <Button
                variant="outline"
                className="bg-emerald-700/50 border-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-2"
                onClick={handleDownloadSlip}
                disabled={downloading || !isWalletUnlocked || (isWalletUnlocked && availableBalanceFcfa === 0)}
                title="Télécharger le relevé de gains"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Relevé
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-blue-100 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-blue-600 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Gains en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">
              {isWalletUnlocked ? pendingNetFcfa.toLocaleString() : '***'}{' '}
              <span className="text-lg text-gray-500">FCFA</span>
            </div>
            <p className="text-sm text-gray-600 font-mono mt-1">
              ({isWalletUnlocked ? pendingNetCoins.toLocaleString() : '***'} π)
            </p>
          </CardContent>
        </Card>

        {/* Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-600 flex items-center gap-2">
              <Eye className="w-5 h-5" /> Vue d'ensemble
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-gray-500">Vues Totales</span>
              <span className="font-bold">{stats?.creator_stats?.views_count || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Gagné</span>
              <span className="font-bold text-green-600">
                {isWalletUnlocked ? ((userProfile?.total_earnings || 0) * COIN_TO_FCFA_RATE).toLocaleString() : '***'} F
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Retiré</span>
              <span className="font-bold text-blue-600">
                {isWalletUnlocked ? ((userProfile?.total_earnings - userProfile?.available_earnings || 0) * COIN_TO_FCFA_RATE).toLocaleString() : '***'} F
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique des retraits récents */}
      {withdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des retraits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {withdrawals.slice(0, 5).map((withdrawal) => (
                <div key={withdrawal.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{withdrawal.amount.toLocaleString()} FCFA</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(withdrawal.requested_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Badge variant={
                    withdrawal.status === 'approved' ? 'success' :
                    withdrawal.status === 'rejected' ? 'destructive' : 'warning'
                  }>
                    {withdrawal.status === 'approved' && 'Approuvé'}
                    {withdrawal.status === 'pending' && 'En attente'}
                    {withdrawal.status === 'rejected' && 'Rejeté'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <WithdrawalModal
        open={isWithdrawalModalOpen}
        onOpenChange={setWithdrawalModalOpen}
        availableBalance={availableBalanceFcfa}
        userType="organizer"
        userId={user?.id}
        onSuccess={() => {
          fetchUserProfile(); // Recharger le profil après un retrait
          fetchData(false);
        }}
      />

      <PinVerificationModal 
        isOpen={showPinModal}
        onClose={closePinModal}
        onSuccess={handlePinSuccess}
        userId={user?.id}
        userProfile={userProfile}
      />
    </div>
  );
};

export default OrganizerDashboardTab;