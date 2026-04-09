import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useData } from "@/contexts/DataContext";
import RaffleDrawSystem from "./RaffleDrawSystem";
import WalletInfoModal from "@/components/WalletInfoModal";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Ticket, Coins, Wallet, ChevronUp, ChevronDown, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const RaffleInterface = ({
  raffleData,
  onPurchaseSuccess,
  isOwner,
  isClosed,
  event,
}) => {
  const { user } = useAuth();
  const { userProfile } = useData();
  const { toast } = useToast();
  
  const [quantity, setQuantity] = useState(1);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [fullEventData] = useState(event || null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userTickets, setUserTickets] = useState([]);
  const [loadingUserTickets, setLoadingUserTickets] = useState(false);

  if (!raffleData) {
    return (
      <Card className="border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-900/10 to-orange-900/5">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Données manquantes</h3>
          <p className="text-gray-300">
            Les informations de cette tombola n'ont pas pu être chargées. 
            Veuillez rafraîchir la page ou contacter l'organisateur.
          </p>
        </CardContent>
      </Card>
    );
  }

  const [currentRaffleStatus] = useState(raffleData?.status || "active");

  const stats = {
    totalTickets: raffleData?.tickets_sold || 0,
    myTicketsCount: 0,
    participantsCount: 0,
  };

  const isOrganizer =
    isOwner ||
    (user &&
      (user.id === raffleData?.organizer_id ||
       user.id === event?.organizer_id));

  const pricePerTicket = raffleData?.calculated_price_pi || 1;
  const minTicketsRequired = raffleData?.min_tickets_required || 0;
  const isGoalReached = stats.totalTickets >= minTicketsRequired;
  const totalCostPi = useMemo(() => pricePerTicket * quantity, [pricePerTicket, quantity]);

  const liveRaffleData = {
    ...raffleData,
    status: currentRaffleStatus,
    tickets_sold: stats.totalTickets,
  };

  useEffect(() => {
    if (!user || !raffleData?.id) return;
    const loadUserTickets = async () => {
      setLoadingUserTickets(true);
      try {
        const { data, error } = await supabase
          .from('raffle_tickets')
          .select('ticket_number, purchase_price_pi, purchased_at')
          .eq('raffle_event_id', raffleData.id)
          .eq('user_id', user.id)
          .order('ticket_number', { ascending: true });
        if (error) throw error;
        setUserTickets(data || []);
      } catch (err) {
        console.error("Erreur chargement tickets:", err);
      } finally {
        setLoadingUserTickets(false);
      }
    };
    loadUserTickets();
  }, [user, raffleData?.id]);

  // Fonction d'achat corrigée – crédite l'organisateur
  const handlePurchaseTickets = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour acheter des tickets",
        variant: "destructive"
      });
      return;
    }
    if (!raffleData || raffleData.status !== 'active') {
      toast({
        title: "Tombola non disponible",
        description: "Cette tombola n'est plus active",
        variant: "destructive"
      });
      return;
    }

    setIsPurchasing(true);
    try {
      // 1. Récupérer les données fraîches (organizer_id, event_id, etc.)
      const { data: raffleFresh, error: raffleError } = await supabase
        .from('raffle_events')
        .select('id, event_id, organizer_id, calculated_price_pi, total_tickets, tickets_sold, max_tickets_per_user')
        .eq('id', raffleData.id)
        .single();
      if (raffleError) throw raffleError;
      if (!raffleFresh.organizer_id) throw new Error("Cette tombola n'a pas d'organisateur");

      const ticketPrice = raffleFresh.calculated_price_pi;
      const totalCost = ticketPrice * quantity;

      // 2. Vérifier le solde utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;
      if (profile.coin_balance < totalCost) {
        toast({
          title: "Solde insuffisant",
          description: `Vous avez ${profile.coin_balance} π, il vous faut ${totalCost} π`,
          variant: "destructive"
        });
        setShowWalletModal(true);
        return;
      }

      // 3. Vérifier les tickets disponibles
      const availableTickets = raffleFresh.total_tickets - (raffleFresh.tickets_sold || 0);
      if (quantity > availableTickets) {
        toast({
          title: "Tickets insuffisants",
          description: `Il ne reste que ${availableTickets} ticket(s) disponible(s)`,
          variant: "destructive"
        });
        return;
      }

      // 4. Vérifier la limite par utilisateur
      if (quantity > raffleFresh.max_tickets_per_user) {
        toast({
          title: "Limite dépassée",
          description: `Vous ne pouvez acheter que ${raffleFresh.max_tickets_per_user} ticket(s) maximum`,
          variant: "destructive"
        });
        return;
      }

      // 5. Générer et insérer les tickets
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticketNumber = Math.floor(100000 + Math.random() * 900000);
        tickets.push({
          raffle_event_id: raffleFresh.id,
          user_id: user.id,
          purchase_price_pi: ticketPrice,
          ticket_number: ticketNumber,
          purchased_at: new Date().toISOString()
        });
      }
      const { error: ticketError } = await supabase.from('raffle_tickets').insert(tickets);
      if (ticketError) throw ticketError;

      // 6. Déduire le solde utilisateur
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ coin_balance: profile.coin_balance - totalCost })
        .eq('id', user.id);
      if (balanceError) throw balanceError;

      // 7. Mettre à jour le compteur tickets_sold
      const { error: updateError } = await supabase
        .from('raffle_events')
        .update({ tickets_sold: (raffleFresh.tickets_sold || 0) + quantity })
        .eq('id', raffleFresh.id);
      if (updateError) throw updateError;

      // 8. Créditer l'organisateur (gains en attente) – exactement comme TicketingInterface
      // const platformFee = Math.floor(totalCost * 0.05);
      // const netEarnings = totalCost - platformFee;
      const platformFee = 0;
const netEarnings = totalCost; // 100% du montant
      const targetEventId = raffleFresh.event_id || event?.id;
      if (!targetEventId) {
        throw new Error("Impossible de déterminer l'événement parent pour créditer l'organisateur");
      }

      const { error: earningError } = await supabase
        .from('organizer_earnings')
        .insert({
          organizer_id: raffleFresh.organizer_id,
          event_id: targetEventId,
          raffle_event_id: raffleFresh.id,
          earnings_coins: netEarnings,
          amount_pi: totalCost,
          net_amount: netEarnings,
         platform_fee: 0,
          status: 'pending',
          transaction_type: 'raffle_ticket_sale',
          event_type: 'raffle',
          earnings_fcfa: netEarnings * 10,
          description: `Vente de ${quantity} tickets tombola`,
          fee_percent: 0.0
        });
      if (earningError) throw earningError;

      // Succès
      toast({
        title: "🎉 Achat réussi !",
        description: `Vous avez acheté ${quantity} ticket(s) pour la tombola "${event?.title || ''}"`,
      });

      if (onPurchaseSuccess) onPurchaseSuccess();

      // Recharger les tickets de l'utilisateur
      const { data: newTickets } = await supabase
        .from('raffle_tickets')
        .select('ticket_number, purchase_price_pi, purchased_at')
        .eq('raffle_event_id', raffleFresh.id)
        .eq('user_id', user.id);
      setUserTickets(newTickets || []);
      setQuantity(1);

    } catch (error) {
      console.error("Erreur lors de l'achat:", error);
      toast({
        title: "Erreur d'achat",
        description: error.message || "Impossible de compléter l'achat",
        variant: "destructive"
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const availableTickets = raffleData?.total_tickets - (raffleData?.tickets_sold || 0);
  const maxTicketsPerUser = Math.min(raffleData?.max_tickets_per_user || 10, availableTickets);
  const showPurchaseInterface = !isOrganizer && raffleData?.status === 'active';

  return (
    <div className="space-y-8">
      <RaffleDrawSystem
        raffleData={liveRaffleData}
        isOrganizer={isOrganizer}
        isGoalReached={isGoalReached}
        minTicketsRequired={minTicketsRequired}
        eventData={fullEventData}
        onDrawComplete={onPurchaseSuccess}
        stats={stats}
        userProfile={userProfile}
      />

      {showPurchaseInterface && (
        <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-900/10 to-indigo-900/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Section gauche */}
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <Ticket className="w-6 h-6 text-blue-400" />
                    Participer à la tombola
                  </h3>
                  <p className="text-gray-300">Achetez vos tickets pour tenter de gagner de fabuleux lots !</p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Ticket className="w-4 h-4" /> Mes tickets
                  </h4>
                  {loadingUserTickets ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                  ) : userTickets.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Nombre de tickets</span>
                        <span className="text-white font-bold">{userTickets.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Valeur totale</span>
                        <span className="text-yellow-400 font-bold">
                          {userTickets.reduce((sum, t) => sum + (t.purchase_price_pi || pricePerTicket), 0)} π
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {userTickets.slice(0,5).map((t, idx) => (
                          <Badge key={idx} className="bg-blue-500/20 text-blue-300">#{t.ticket_number}</Badge>
                        ))}
                        {userTickets.length > 5 && <Badge>+{userTickets.length-5}</Badge>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">Vous n'avez pas encore acheté de tickets</p>
                  )}
                </div>

                {minTicketsRequired > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Objectif de la tombola</span>
                      <span className={isGoalReached ? "text-green-400" : "text-yellow-400"}>
                        {isGoalReached ? "Atteint ✅" : "En cours..."}
                      </span>
                    </div>
                    <Progress value={Math.min(100, (stats.totalTickets / minTicketsRequired) * 100)} className="h-2" />
                  </div>
                )}
              </div>

              {/* Section droite – achat */}
              <div className="flex-1">
                <div className="bg-white/5 rounded-lg p-6 space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">Prix du ticket</p>
                    <div className="flex justify-center gap-2">
                      <span className="text-4xl font-bold text-white">{pricePerTicket}</span>
                      <Coins className="w-8 h-8 text-yellow-400" />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">En pièces</p>
                  </div>

                  <div className="space-y-3">
                    <Label>Nombre de tickets</Label>
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity-1))}
                        disabled={quantity<=1}
                        className="h-12 w-12"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </Button>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          let val = parseInt(e.target.value) || 1;
                          val = Math.min(maxTicketsPerUser, Math.max(1, val));
                          setQuantity(val);
                        }}
                        className="text-4xl font-bold text-center w-32"
                        min="1"
                        max={maxTicketsPerUser}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(maxTicketsPerUser, quantity+1))}
                        disabled={quantity>=maxTicketsPerUser}
                        className="h-12 w-12"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-center text-sm text-gray-400">Max {maxTicketsPerUser} tickets</p>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4 text-center">
                    <span className="text-gray-400">Total à payer :</span>
                    <div className="text-3xl font-bold text-white">{totalCostPi} π</div>
                    <p className="text-sm text-gray-400">{quantity} ticket{quantity>1 ? 's' : ''} × {pricePerTicket} π</p>
                  </div>

                  <Button
                    onClick={handlePurchaseTickets}
                    disabled={isPurchasing || availableTickets<=0 || quantity>availableTickets || quantity>raffleData?.max_tickets_per_user}
                    className="w-full py-6 text-lg font-bold bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isPurchasing ? <Loader2 className="animate-spin mr-2" /> : <Wallet className="mr-2" />}
                    {isPurchasing ? "Achat en cours..." : `Acheter ${quantity} ticket${quantity>1?'s':''}`}
                  </Button>

                  <div className="text-sm text-gray-400 space-y-1 text-center">
                    <p>✅ Tickets disponibles : {availableTickets}</p>
                    {/* <p>✅ Tickets vendus : {raffleData.tickets_sold || 0}</p> */}
                    <p>✅ Maximum tickets par personne : {raffleData.max_tickets_per_user || 10}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isOrganizer && raffleData?.status === 'active' && (
        <Card className="border-2 border-gray-500/20 bg-gray-800/30">
          <CardContent className="p-6 text-center">
            <p className="text-gray-300">
              Vous êtes l'organisateur de cette tombola. Vous ne pouvez pas acheter de tickets.
              Les participants verront l'interface d'achat ci-dessus.
            </p>
          </CardContent>
        </Card>
      )}

      <WalletInfoModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        requiredAmount={totalCostPi}
        currentBalance={userProfile?.coin_balance || 0}
      />
    </div>
  );
};

export default RaffleInterface;