import React, { useState, useMemo, useEffect } from 'react';
    import { motion } from 'framer-motion';
    import { useNavigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { ArrowLeft, Tag, Upload, Package, Info, Sparkles, X, Video, Phone, Loader2, Coins, Calendar } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { useData } from '@/contexts/DataContext';
    import { toast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { CoinService } from '@/services/CoinService';
    import WalletInfoModal from '@/components/WalletInfoModal';

    const CreatePromotionPage = () => {
      const navigate = useNavigate();
      const { user } = useAuth();
      const { userProfile, adminConfig, forceRefreshUserProfile, getEvents } = useData();
      const [loading, setLoading] = useState(false);
      const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
      const [userEvents, setUserEvents] = useState([]);

      const [formData, setFormData] = useState({
        event_id: '',
        promotion_pack_id: '',
      });

      useEffect(() => {
        if (!user) {
          toast({
            title: "Accès refusé",
            description: "Veuillez vous connecter pour créer une promotion.",
            variant: "destructive",
          });
          navigate('/auth', { state: { from: '/create-promotion' } });
        }
      }, [user, navigate]);

      useEffect(() => {
        const fetchUserEvents = async () => {
          if (user) {
            const events = await getEvents({ organizer_id: user.id });
            setUserEvents(events);
          }
        };
        fetchUserEvents();
      }, [user, getEvents]);

      const promotionPacks = adminConfig?.promotion_packs || [];

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
            navigate('/auth');
            return;
        }
        setLoading(true);

        try {
          if (!formData.event_id || !formData.promotion_pack_id) {
            throw new Error('Veuillez sélectionner un événement et un pack de promotion.');
          }

          const packInfo = promotionPacks.find(p => p.id === formData.promotion_pack_id);
          if (!packInfo) throw new Error("Pack de promotion invalide.");

          const onSuccess = async () => {
              try {
                await CoinService.debitCoins(user.id, packInfo.cost_pi, `Promotion pour l'événement ID: ${formData.event_id}`);
                
                const { data, error } = await supabase.from('event_promotions').insert({
                  event_id: formData.event_id,
                  organizer_id: user.id,
                  promotion_pack_id: formData.promotion_pack_id,
                  start_date: new Date().toISOString(),
                  end_date: new Date(Date.now() + packInfo.duration_days * 24 * 60 * 60 * 1000).toISOString(),
                  cost_pi: packInfo.cost_pi,
                  status: 'active',
                  payment_status: 'paid',
                }).select().single();
                
                if (error) throw error;

                forceRefreshUserProfile();
                
                toast({ title: "Promotion créée !", description: "Votre événement est maintenant promu." });
                navigate(`/event/${formData.event_id}`);
              } catch(e) {
                console.error("Payment success, but DB update failed:", e);
                toast({ title: "Erreur de base de données", description: "Votre paiement a réussi, mais la mise à jour de la promotion a échoué. Veuillez contacter le support.", variant: "destructive"});
              }
          };

          const onInsufficientBalance = () => {
            setLoading(false);
            setShowWalletInfoModal(true);
          };

          await CoinService.handleAction({
              userId: user.id,
              requiredCoins: packInfo.cost_pi,
              onSuccess,
              onInsufficientBalance,
              amountFcfa: CoinService.convertCoinsToFcfa(packInfo.cost_pi),
              action: 'create_promotion',
              packId: packInfo.id,
              email: user.email,
              phone: userProfile?.phone,
          });

        } catch (error) {
          toast({ title: "Erreur", description: error.message, variant: "destructive" });
          setLoading(false);
        }
      };

      const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
      };
      
      const handleWalletModalProceed = () => {
        setShowWalletInfoModal(false);
        const packInfo = promotionPacks.find(p => p.id === formData.promotion_pack_id);
        if (!packInfo) return;

        CoinService.generateMoneyFusionLink({
            userId: user.id,
            amountFcfa: CoinService.convertCoinsToFcfa(packInfo.cost_pi),
            action: 'create_promotion',
            packId: packInfo.id,
            eventId: formData.event_id,
            email: user.email,
            phone: userProfile?.phone,
        });
      }

      if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

      return (
        <div className="min-h-screen bg-background">
          <Helmet>
            <title>Promouvoir un Événement - BonPlaninfos</title>
            <meta name="description" content="Promouvez votre événement sur BonPlaninfos." />
          </Helmet>

          <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-primary mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>

              <h1 className="text-3xl font-bold text-foreground mb-2">
                Promouvoir un événement
              </h1>
              <p className="text-muted-foreground">
                Augmentez la visibilité de votre événement pour toucher plus de monde.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                <Card className="glass-effect border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center"><Info className="w-5 h-5 mr-2 text-primary" />Sélectionnez votre événement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="event_id">Événement à promouvoir *</Label>
                      <Select value={formData.event_id} onValueChange={(value) => handleInputChange('event_id', value)}>
                        <SelectTrigger id="event_id"><SelectValue placeholder="Choisir un de vos événements" /></SelectTrigger>
                        <SelectContent>
                          {userEvents.length > 0 ? (
                            userEvents.map((event) => (<SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>))
                          ) : (
                            <SelectItem value="none" disabled>Vous n'avez aucun événement actif.</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-effect border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center"><Package className="w-5 h-5 mr-2 text-primary" />Choix du Pack de Promotion *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Sélectionnez un pack pour votre promotion</Label>
                      <Select value={formData.promotion_pack_id} onValueChange={(value) => handleInputChange('promotion_pack_id', value)}>
                        <SelectTrigger><SelectValue placeholder="Choisir un pack" /></SelectTrigger>
                        <SelectContent>
                          {promotionPacks.map((pack) => (
                            <SelectItem key={pack.id} value={pack.id}>
                              <div className="flex justify-between w-full">
                                <span>{pack.name} - {pack.duration_days} jours</span>
                                <span className="flex items-center gap-1"><Coins className="w-3 h-3" />{pack.cost_pi}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">Le coût en pièces sera déduit de votre portefeuille lors de la publication. Si votre solde est insuffisant, vous serez redirigé pour payer.</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
                  <Button type="submit" disabled={loading || !formData.event_id || !formData.promotion_pack_id} className="gradient-gold text-background hover:opacity-90 flex-1">
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publication...</> : 'Publier la promotion'}
                    <Sparkles className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </motion.div>
          </main>
          <WalletInfoModal 
            isOpen={showWalletInfoModal} 
            onClose={() => setShowWalletInfoModal(false)}
            onProceed={handleWalletModalProceed}
          />
        </div>
      );
    };

    export default CreatePromotionPage;