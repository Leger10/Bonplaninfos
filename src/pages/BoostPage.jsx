import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Zap, Coins, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import WalletInfoModal from '@/components/WalletInfoModal';
import { CoinService } from '@/services/CoinService';

const BoostPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { adminConfig, forceRefreshUserProfile } = useData();
  const [loading, setLoading] = useState(false);
  const [userEvents, setUserEvents] = useState([]);
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedPack, setSelectedPack] = useState('');
  const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
  const [isFetchingContent, setIsFetchingContent] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchUserContent = async () => {
      setIsFetchingContent(true);
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, title, is_promoted')
          .eq('organizer_id', user.id)
          .eq('status', 'active');

        if (eventsError) throw eventsError;

        const content = eventsData
          .filter(e => !e.is_promoted)
          .map(e => ({ value: `event_${e.id}`, label: `Événement: ${e.title}` }));

        setUserEvents(content);

        // Pre-select content if passed from navigation state
        if (location.state?.preselectedContent) {
          setSelectedContent(location.state.preselectedContent);
        }

      } catch (error) {
        toast({ title: 'Erreur', description: 'Impossible de charger vos événements.', variant: 'destructive' });
        console.error("Error fetching user content:", error);
      } finally {
        setIsFetchingContent(false);
      }
    };

    fetchUserContent();
  }, [user, navigate, location.state]);

  const packs = adminConfig?.promotion_packs || [];
  const selectedPackInfo = packs.find(p => p.id === selectedPack);
  const handleWalletModalProceed = () => { setShowWalletInfoModal(false); navigate('/wallet'); };

  const handleBoost = async () => {
    if (!selectedContent || !selectedPackInfo) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un contenu et un pack.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const [type, contentId] = selectedContent.split('_');

    const onSuccess = async () => {
      try {
        // 1. Debit coins
        await CoinService.debitCoins(user.id, selectedPackInfo.cost_pi, `Boost: ${selectedPackInfo.name}`);

        // 2. Create promotion record
        const { error: promotionError } = await supabase
          .from('event_promotions')
          .insert({
            event_id: contentId,
            organizer_id: user.id,
            promotion_pack_id: selectedPackInfo.id,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + selectedPackInfo.duration_days * 24 * 60 * 60 * 1000).toISOString(),
            cost_pi: selectedPackInfo.cost_pi,
            status: 'active',
            payment_status: 'paid'
          });

        if (promotionError) throw promotionError;

        // 3. Update event status
        const { error: eventUpdateError } = await supabase
          .from('events')
          .update({
            is_promoted: true,
            promoted_until: new Date(Date.now() + selectedPackInfo.duration_days * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', contentId);

        if (eventUpdateError) throw eventUpdateError;

        toast({ title: "Succès!", description: "Votre contenu a été mis en avant.", className: "bg-green-500 text-white" });
        forceRefreshUserProfile();
        navigate(`/event/${contentId}`);

      } catch (error) {
        toast({ title: "Erreur de boost", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    await CoinService.handleAction({
      userId: user.id,
      requiredCoins: selectedPackInfo.cost_pi,
      onSuccess,
      onInsufficientBalance: () => {
        setShowWalletInfoModal(true);
        setLoading(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-background">
      <Helmet>
        <title>Booster la Visibilité - BonPlaninfos</title>
        <meta name="description" content="Mettez en avant vos événements et promotions pour atteindre une plus large audience." />
      </Helmet>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-full">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-1">
                Booster la Visibilité
              </h1>
              <p className="text-muted-foreground">
                Mettez vos publications en avant pour atteindre plus de monde.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-effect border-primary/30 shadow-2xl shadow-primary/10">
            <CardHeader>
              <CardTitle className="text-2xl">Configuration du Boost</CardTitle>
              <CardDescription>Sélectionnez un de vos événements puis choisissez un pack de visibilité.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <label className="text-sm font-medium">1. Choisissez l'événement à booster</label>
                {isFetchingContent ? <Loader2 className="w-6 h-6 animate-spin" /> :
                  <Select onValueChange={setSelectedContent} value={selectedContent}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Sélectionnez un événement" /></SelectTrigger>
                    <SelectContent>
                      {userEvents.length > 0 ? userEvents.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      )) : <p className="p-4 text-sm text-muted-foreground">Vous n'avez aucun événement non promu.</p>}
                    </SelectContent>
                  </Select>}
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium">2. Choisissez un pack de visibilité</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packs.map(pack => (
                    <motion.div key={pack.id} whileHover={{ scale: 1.03 }}>
                      <div
                        onClick={() => setSelectedPack(pack.id)}
                        className={`h-full p-4 flex flex-col items-start text-left rounded-lg border-2 cursor-pointer transition-all ${selectedPack === pack.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                      >
                        <div className="flex justify-between w-full items-center">
                          <span className="font-bold text-lg">{pack.name}</span>
                          {selectedPack === pack.id && <CheckCircle className="w-5 h-5 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{pack.description || `${pack.duration_days} jours de visibilité accrue`}</p>
                        <div className="flex items-center mt-3 text-lg font-semibold text-primary">
                          <Coins className="w-5 h-5 mr-2" />
                          <span>{pack.cost_pi}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button onClick={handleBoost} disabled={loading || !selectedContent || !selectedPack} className="w-full text-lg py-6" variant="premium">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Booster...</> : `Booster pour ${selectedPackInfo?.cost_pi || 0}π`}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <WalletInfoModal isOpen={showWalletInfoModal} onClose={() => setShowWalletInfoModal(false)} onProceed={handleWalletModalProceed} />
    </div>
  );
};

export default BoostPage;