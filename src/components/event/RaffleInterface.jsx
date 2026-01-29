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
import { Ticket, Coins, Wallet, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
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

  const [currentRaffleStatus] = useState(
    raffleData?.status || "active",
  );

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

  const totalCostPi = useMemo(
    () => pricePerTicket * quantity,
    [pricePerTicket, quantity],
  );

  const liveRaffleData = {
    ...raffleData,
    status: currentRaffleStatus,
    tickets_sold: stats.totalTickets,
  };

  // Charger les tickets de l'utilisateur
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

  // Fonction pour acheter des tickets
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
      // Vérifier le solde de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', user.id)
        .single();

      if (profile.coin_balance < totalCostPi) {
        toast({
          title: "Solde insuffisant",
          description: `Vous avez ${profile.coin_balance} π, il vous faut ${totalCostPi} π`,
          variant: "destructive"
        });
        setShowWalletModal(true);
        return;
      }

      // Vérifier les tickets disponibles
      const availableTickets = raffleData.total_tickets - (raffleData.tickets_sold || 0);
      if (quantity > availableTickets) {
        toast({
          title: "Tickets insuffisants",
          description: `Il ne reste que ${availableTickets} ticket(s) disponible(s)`,
          variant: "destructive"
        });
        return;
      }

      // Vérifier la limite par utilisateur
      if (quantity > raffleData.max_tickets_per_user) {
        toast({
          title: "Limite dépassée",
          description: `Vous ne pouvez acheter que ${raffleData.max_tickets_per_user} ticket(s) maximum`,
          variant: "destructive"
        });
        return;
      }

      // Générer les numéros de ticket
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticketNumber = Math.floor(100000 + Math.random() * 900000); // 6 chiffres
        tickets.push({
          raffle_event_id: raffleData.id,
          user_id: user.id,
          purchase_price_pi: pricePerTicket,
          ticket_number: ticketNumber,
          purchased_at: new Date().toISOString()
        });
      }

      // Insérer les tickets
      const { error: ticketError } = await supabase
        .from('raffle_tickets')
        .insert(tickets);

      if (ticketError) throw ticketError;

      // Déduire le montant du solde
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ coin_balance: profile.coin_balance - totalCostPi })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      // Mettre à jour le compteur de tickets vendus
      const { error: updateError } = await supabase
        .from('raffle_events')
        .update({ 
          tickets_sold: (raffleData.tickets_sold || 0) + quantity 
        })
        .eq('id', raffleData.id);

      if (updateError) throw updateError;

      toast({
        title: "🎉 Achat réussi !",
        description: `Vous avez acheté ${quantity} ticket(s) pour la tombola "${event?.title || ''}"`,
      });

      // Rafraîchir les données
      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }

      // Recharger les tickets de l'utilisateur
      const { data: newTickets } = await supabase
        .from('raffle_tickets')
        .select('ticket_number, purchase_price_pi, purchased_at')
        .eq('raffle_event_id', raffleData.id)
        .eq('user_id', user.id)
        .order('ticket_number', { ascending: true });

      setUserTickets(newTickets || []);

    } catch (error) {
      console.error("Erreur lors de l'achat:", error);
      toast({
        title: "Erreur d'achat",
        description: "Impossible de compléter l'achat",
        variant: "destructive"
      });
    } finally {
      setIsPurchasing(false);
      setQuantity(1);
    }
  };

  // Calculer les tickets disponibles
  const availableTickets = raffleData?.total_tickets - (raffleData?.tickets_sold || 0);
  const maxTicketsPerUser = Math.min(
    raffleData?.max_tickets_per_user || 10,
    availableTickets
  );

  return (
    <div className="space-y-8">
      {/* ✅ SYSTÈME DE TIRAGE */}
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

      {/* INTERFACE D'ACHAT DE TICKETS (POUR PARTICIPANTS) */}
      {!isOrganizer && raffleData?.status === 'active' && (
        <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-900/10 to-indigo-900/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Section gauche: Informations sur la tombola */}
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <Ticket className="w-6 h-6 text-blue-400" />
                    Participer à la tombola
                  </h3>
                  <p className="text-gray-300">
                    Achetez vos tickets pour tenter de gagner de fabuleux lots !
                  </p>
                </div>

                {/* Mes tickets */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Mes tickets
                  </h4>
                  {loadingUserTickets ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    </div>
                  ) : userTickets.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Nombre de tickets</span>
                        <span className="text-white font-bold">{userTickets.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Valeur totale</span>
                        <span className="text-yellow-400 font-bold">
                          {userTickets.reduce((sum, ticket) => sum + (ticket.purchase_price_pi || pricePerTicket), 0)} π
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-gray-400 mb-1">Mes numéros de tickets:</p>
                        <div className="flex flex-wrap gap-2">
                          {userTickets.slice(0, 5).map((ticket, index) => (
                            <Badge key={index} className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                              #{ticket.ticket_number}
                            </Badge>
                          ))}
                          {userTickets.length > 5 && (
                            <Badge className="bg-gray-500/20 text-gray-300">
                              +{userTickets.length - 5} autres
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">
                      Vous n'avez pas encore acheté de tickets
                    </p>
                  )}
                </div>

                {/* Progression objectif */}
                {minTicketsRequired > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Objectif de la tombola</span>
                      <span className={`font-bold ${isGoalReached ? 'text-green-400' : 'text-yellow-400'}`}>
                        {isGoalReached ? 'Atteint ✅' : 'En cours...'}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, ((stats.totalTickets || 0) / minTicketsRequired) * 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{stats.totalTickets || 0} vendus</span>
                      <span>{minTicketsRequired} requis</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section droite: Achat de tickets */}
              <div className="flex-1">
                <div className="bg-white/5 rounded-lg p-6 space-y-6">
                  {/* Prix du ticket */}
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">Prix du ticket</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-4xl font-bold text-white">{pricePerTicket}</span>
                      <Coins className="w-8 h-8 text-yellow-400" />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">En pièces</p>
                  </div>

                  {/* Sélection quantité */}
                  <div className="space-y-3">
                    <Label htmlFor="quantity">Nombre de tickets</Label>
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="h-12 w-12"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </Button>
                      
                      <div className="text-center">
                        <Input
                          id="quantity"
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setQuantity(Math.max(1, Math.min(maxTicketsPerUser, val)));
                          }}
                          min="1"
                          max={maxTicketsPerUser}
                          className="text-4xl font-bold text-center w-32 border-0 bg-transparent"
                        />
                        <p className="text-sm text-gray-400 mt-1">
                          Max: {maxTicketsPerUser} tickets
                        </p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(maxTicketsPerUser, quantity + 1))}
                        disabled={quantity >= maxTicketsPerUser}
                        className="h-12 w-12"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Total à payer:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-white">{totalCostPi}</span>
                        <Coins className="w-6 h-6 text-yellow-400" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">
                      {quantity} ticket{quantity > 1 ? 's' : ''} × {pricePerTicket} π
                    </p>
                  </div>

                  {/* Bouton d'achat */}
                  <Button
                    onClick={handlePurchaseTickets}
                    disabled={isPurchasing || availableTickets <= 0 || quantity > availableTickets || quantity > raffleData?.max_tickets_per_user}
                    className="w-full py-6 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    size="lg"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Achat en cours...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5 mr-2" />
                        Acheter {quantity} ticket{quantity > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>

                  {/* Informations */}
                  <div className="text-sm text-gray-400 space-y-2">
                    <p>✅ Tickets disponibles: {availableTickets}</p>
                    <p>✅ Tickets vendus: {raffleData?.tickets_sold || 0}</p>
                    <p>✅ Max par personne: {raffleData?.max_tickets_per_user || 10}</p>
                    {availableTickets <= 0 && (
                      <p className="text-red-400 font-semibold">
                        ⚠️ Plus de tickets disponibles
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Modal */}
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