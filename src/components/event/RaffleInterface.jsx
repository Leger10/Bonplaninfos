// Components/RaffleInterface.jsx - CORRECTION DES COMMENTAIRES
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useData } from "@/contexts/DataContext";
import { toast } from "@/components/ui/use-toast";
import {
  Coins,
  Ticket,
  AlertCircle,
  Users,
  Crown,
  Loader2,
  ShoppingCart,
  MessageCircle,
  Eye,
  EyeOff,
  Radio,
  Zap,
  CreditCard,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import RaffleDrawSystem from "./RaffleDrawSystem";
import { motion } from "framer-motion";

const RaffleInterfaceComponent = ({
  raffleData,
  eventId,
  onPurchaseSuccess,
}) => {
  const { user } = useAuth();
  const { userProfile, forceRefreshUserProfile } = useData();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStatus, setEventStatus] = useState("active");
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isLoadingOrganizer, setIsLoadingOrganizer] = useState(true);

  // États pour gérer l'affichage du gagnant
  const [winnerData, setWinnerData] = useState(null);
  const [showWinnerToParticipants, setShowWinnerToParticipants] = useState(false);
  const [userTickets, setUserTickets] = useState([]);
  const [isUserWinner, setIsUserWinner] = useState(false);

  const navigate = useNavigate();

  // Fonction pour charger le gagnant
  const loadWinnerData = useCallback(async () => {
    if (!raffleData?.id) return;

    try {
      console.log("🏆 Chargement des données du gagnant pour les participants...");
      
      const { data: winner, error } = await supabase
        .from('raffle_winners')
        .select(`
          *,
          profiles:user_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('raffle_event_id', raffleData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && winner) {
        console.log("✅ Gagnant chargé pour les participants:", winner);
        setWinnerData(winner);
        
        // Vérifier si l'utilisateur courant est le gagnant
        if (user && winner.user_id === user.id) {
          setIsUserWinner(true);
          toast({
            title: "🎉 FÉLICITATIONS ! 🎉",
            description: "Vous avez gagné le tirage !",
            duration: 10000
          });
        }

        // Charger les tickets de l'utilisateur
        if (user) {
          const { data: userTicketsData } = await supabase
            .from('raffle_tickets')
            .select('ticket_number')
            .eq('raffle_event_id', raffleData.id)
            .eq('user_id', user.id);

          setUserTickets(userTicketsData || []);
        }
      } else {
        setWinnerData(null);
        setIsUserWinner(false);
      }
    } catch (error) {
      console.log("ℹ️ Aucun gagnant encore déclaré:", error);
      setWinnerData(null);
      setIsUserWinner(false);
    }
  }, [raffleData?.id, user]);

  // Vérifier si l'utilisateur est l'organisateur
  useEffect(() => {
    const checkOrganizerStatus = async () => {
      if (user && eventId) {
        console.log("🔍 Vérification du statut d'organisateur...", {
          userId: user.id,
          eventId: eventId,
        });

        try {
          const { data: eventData, error } = await supabase
            .from("events")
            .select("organizer_id, status")
            .eq("id", eventId)
            .single();

          if (error) {
            console.error("❌ Erreur vérification organisateur:", error);
            setIsOrganizer(false);
          } else if (eventData) {
            const userIsOrganizer = eventData.organizer_id === user.id;
            console.log("✅ Statut organisateur:", {
              organizerId: eventData.organizer_id,
              userId: user.id,
              isOrganizer: userIsOrganizer,
              eventStatus: eventData.status,
            });

            setIsOrganizer(userIsOrganizer);
            setEventStatus(eventData.status);
          }
        } catch (err) {
          console.error("💥 Erreur lors de la vérification:", err);
          setIsOrganizer(false);
        } finally {
          setIsLoadingOrganizer(false);
        }
      } else {
        setIsLoadingOrganizer(false);
      }
    };

    checkOrganizerStatus();
  }, [user, eventId]);

  // Charger le titre de l'événement
  useEffect(() => {
    const loadEventTitle = async () => {
      if (eventId) {
        const { data, error } = await supabase
          .from("events")
          .select("title")
          .eq("id", eventId)
          .single();

        if (!error && data) {
          setEventTitle(data.title);
        }
      }
    };

    loadEventTitle();
  }, [eventId]);

  // Charger le gagnant au montage et écouter les changements
  useEffect(() => {
    loadWinnerData();

    // Écouter les nouveaux gagnants en temps réel
    if (!raffleData?.id) return;

    const channel = supabase
      .channel(`raffle-winner-updates-${raffleData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'raffle_winners',
          filter: `raffle_event_id=eq.${raffleData.id}`
        },
        (payload) => {
          console.log('🎯 Nouveau gagnant détecté pour les participants:', payload.new);
          loadWinnerData(); // Recharger les données du gagnant
          
          // Afficher automatiquement le gagnant aux participants
          if (!isOrganizer) {
            setShowWinnerToParticipants(true);
            toast({
              title: "🏆 Tirage terminé !",
              description: "Le gagnant a été annoncé !",
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raffleData?.id, loadWinnerData, isOrganizer]);

  // Fonction pour que les participants voient le gagnant
  const handleShowWinner = () => {
    setShowWinnerToParticipants(true);
    toast({
      title: "🏆 Résultats du tirage",
      description: "Voici le gagnant du tirage !",
      duration: 3000,
    });
  };

  const pricePerTicket = raffleData?.calculated_price_pi || 1;

  // FONCTION : Redirection vers la page des packs
  const handleRechargeWallet = () => {
    console.log("💰 Redirection vers la page des packs de pièces");
    navigate("/packs");
  };

  // Fonction pour débiter le portefeuille
  const debitUserForTickets = async (userId, numberOfTickets) => {
    try {
      const ticketPrice = raffleData?.calculated_price_pi || 1;
      const totalCost = numberOfTickets * ticketPrice;

      console.log("💰 Débit en cours:", {
        userId,
        numberOfTickets,
        ticketPrice,
        totalCost,
        userBalance: userProfile?.coin_balance,
      });

      if (!userProfile) {
        throw new Error("Profil utilisateur non chargé");
      }

      if (userProfile.coin_balance < totalCost) {
        throw new Error(
          `Solde insuffisant. Nécessaire: ${totalCost} π, Solde: ${userProfile.coin_balance} π`
        );
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          coin_balance: userProfile.coin_balance - totalCost,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Erreur débit:", updateError);
        throw new Error("Erreur lors du débit du portefeuille");
      }

      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          amount: -totalCost,
          type: "raffle_ticket_purchase",
          description: `Achat de ${numberOfTickets} ticket(s) pour "${eventTitle}" - ${ticketPrice} π × ${numberOfTickets} = ${totalCost} π`,
          raffle_event_id: raffleData.id,
          event_id: eventId,
          created_at: new Date().toISOString(),
        });

      if (transactionError) {
        console.error("Erreur transaction:", transactionError);
        console.warn(
          "Débit réussi mais erreur d'enregistrement de transaction"
        );
      }

      console.log("✅ Débit réussi:", totalCost, "π débités");
      return true;
    } catch (error) {
      console.error("💥 Erreur débit tickets:", error);
      throw error;
    }
  };

  // 🔥 CORRECTION : Fonction pour ajouter un commentaire - CHAMP CORRIGÉ
  const handleAddComment = async () => {
    if (!user) {
      toast({
        title: "Non connecté",
        description: "Veuillez vous connecter pour commenter",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Commentaire vide",
        description: "Veuillez écrire un commentaire",
        variant: "destructive",
      });
      return;
    }

    setPostingComment(true);

    try {
      console.log("📝 Ajout de commentaire...", {
        event_id: eventId,
        user_id: user.id,
        comment_text: newComment.trim(), // 🔥 CORRECTION : Utiliser comment_text au lieu de content
      });

      // 🔥 CORRECTION : Utiliser le bon nom de champ (comment_text au lieu de content)
      const { data, error } = await supabase
        .from("event_comments")
        .insert({
          event_id: eventId,
          user_id: user.id,
          comment_text: newComment.trim(), // 🔥 CORRIGÉ
          created_at: new Date().toISOString(),
        })
        .select(
          `
            *,
            profiles:user_id (
                username,
                full_name,
                avatar_url
            )
          `
        )
        .single();

      if (error) {
        console.error("❌ Erreur ajout commentaire:", error);

        // Fallback local en cas d'erreur
        const localComment = {
          id: Date.now().toString(),
          event_id: eventId,
          user_id: user.id,
          comment_text: newComment.trim(), // 🔥 CORRIGÉ
          created_at: new Date().toISOString(),
          profiles: {
            username: userProfile?.username || "Utilisateur",
            full_name: userProfile?.full_name,
            avatar_url: userProfile?.avatar_url,
          },
        };
        setComments((prev) => [localComment, ...prev]);
        setNewComment("");

        toast({
          title: "Commentaire ajouté (local)",
          description: "Votre commentaire a été ajouté localement",
        });
        return;
      }

      console.log("✅ Commentaire ajouté avec succès:", data);
      setComments((prev) => [data, ...prev]);
      setNewComment("");

      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été publié avec succès",
      });
    } catch (error) {
      console.error("💥 Erreur complète ajout commentaire:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire: " + error.message,
        variant: "destructive",
      });
    } finally {
      setPostingComment(false);
    }
  };

  // 🔥 CORRECTION : Charger les commentaires - GESTION DU CHAMP CORRIGÉ
 // Dans votre fonction loadComments, remplacez la requête par :
const loadComments = async () => {
  if (!eventId) return;

  try {
    console.log("📥 Chargement des commentaires...");

    // 🔥 REQUÊTE CORRIGÉE avec sélection explicite
    const { data: commentsData, error } = await supabase
      .from("event_comments")
      .select(`
        id,
        event_id,
        user_id,
        comment_text,
        created_at,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Erreur chargement commentaires:", error);
      setComments([]);
      return;
    }

    console.log("✅ Commentaires chargés:", commentsData);
    setComments(commentsData || []);

  } catch (err) {
    console.error("💥 Erreur chargement commentaires:", err);
    setComments([]);
  }
};

  // Charger automatiquement les commentaires
  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments]);

  // FONCTION D'ACHAT
  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Non connecté",
        description: "Veuillez vous connecter pour participer",
        variant: "destructive",
      });
      return;
    }

    const totalCostPi = pricePerTicket * quantity;
    const ticketsSold = raffleData?.tickets_sold || 0;
    const totalTickets = raffleData?.total_tickets || 1;
    const ticketsLeft = totalTickets - ticketsSold;
    const hasSufficientBalance =
      (userProfile?.coin_balance || 0) >= totalCostPi;

    if (!hasSufficientBalance) {
      toast({
        title: "❌ Solde insuffisant",
        description: `Il vous faut ${totalCostPi} π, mais vous n'avez que ${
          userProfile?.coin_balance || 0
        } π`,
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRechargeWallet}
            className="ml-2"
          >
            <Zap className="w-3 h-3 mr-1" />
            Recharger
          </Button>
        ),
      });
      return;
    }

    if (quantity === 0 || ticketsLeft === 0) {
      toast({
        title: "Impossible de participer",
        description: "Quantité invalide ou plus de tickets disponibles",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("🚀 Début du processus d'achat...");

      await debitUserForTickets(user.id, quantity);

      const { data, error } = await supabase.rpc(
        "participate_in_raffle_final",
        {
          p_user_id: user.id,
          p_raffle_id: raffleData.id,
          p_ticket_quantity: quantity,
        }
      );

      if (error) {
        console.error("Erreur RPC:", error);
        throw new Error(error.message);
      }

      if (data?.success) {
        toast({
          title: "🎉 Participation réussie !",
          description: (
            <div>
              <p>{data.message}</p>
              <p className="text-sm mt-1">
                <strong>{totalCostPi} π</strong> ont été débités de votre
                compte.
              </p>
              {data.ticket_numbers && (
                <p className="text-sm mt-1 font-medium">
                  Vos numéros: {data.ticket_numbers.join(", ")}
                </p>
              )}
            </div>
          ),
          duration: 5000,
        });

        await forceRefreshUserProfile();
        if (onPurchaseSuccess) onPurchaseSuccess();
        setQuantity(1);
      } else {
        throw new Error(
          data?.message || "Erreur inconnue lors de la participation"
        );
      }
    } catch (err) {
      console.error("💥 Erreur participation :", err);

      if (err.message.includes("Solde insuffisant")) {
        toast({
          title: "❌ Solde insuffisant",
          description: err.message,
          variant: "destructive",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRechargeWallet}
              className="ml-2"
            >
              <Zap className="w-3 h-3 mr-1" />
              Recharger
            </Button>
          ),
        });
      } else {
        toast({
          title: "Erreur de participation",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // COMPOSANT : Carte de solde avec bouton de recharge
  const BalanceCard = () => {
    const totalCostPi = pricePerTicket * quantity;
    const hasSufficientBalance =
      (userProfile?.coin_balance || 0) >= totalCostPi;
    const balanceAfterPurchase = Math.max(
      0,
      (userProfile?.coin_balance || 0) - totalCostPi
    );

    return (
      <Card
        className={`border-2 ${
          hasSufficientBalance
            ? "border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700"
            : "border-red-300 bg-gradient-to-r from-red-500 to-red-600"
        } shadow-lg`}
      >
        <CardContent className="p-4 text-white">
          <div className="text-center mb-3">
            <div className="text-2xl font-bold mb-1 flex items-center justify-center gap-2">
              <Coins className="w-6 h-6" />
              {userProfile?.coin_balance || 0}π
            </div>
            <div className="text-sm opacity-90">Solde disponible en pièces</div>
          </div>

          <div
            className={`mt-3 ${
              hasSufficientBalance ? "bg-blue-800/50" : "bg-red-600/50"
            } rounded-lg p-3 border ${
              hasSufficientBalance ? "border-blue-400/30" : "border-red-400/30"
            }`}
          >
            <div className="flex justify-between items-center text-sm mb-2">
              <span>Coût de l'achat:</span>
              <span className="font-bold">{totalCostPi}π</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Solde après achat:</span>
              <span
                className={`font-bold ${
                  hasSufficientBalance ? "text-green-300" : "text-red-300"
                }`}
              >
                {balanceAfterPurchase}π
              </span>
            </div>
          </div>

          {/* BOUTON DE RECHARGE SI SOLDE INSUFFISANT */}
          {!hasSufficientBalance && (
            <div className="mt-3 p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
              <div className="text-center">
                <p className="text-yellow-200 text-sm mb-2">
                  💡 <strong>Solde insuffisant</strong> pour cet achat
                </p>
                <Button
                  onClick={handleRechargeWallet}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-2 shadow-lg transform hover:scale-105 transition-transform"
                  size="sm"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Recharger mon portefeuille
                </Button>
                <p className="text-xs text-yellow-300 mt-1">
                  Achetez des pièces pour participer
                </p>
              </div>
            </div>
          )}

          {/* Indicateur visuel */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <span
              className={
                hasSufficientBalance ? "text-green-300" : "text-red-300"
              }
            >
              {hasSufficientBalance
                ? "✅ Solde suffisant"
                : "❌ Solde insuffisant"}
            </span>
            <Badge
              variant={hasSufficientBalance ? "default" : "destructive"}
              className="text-xs"
            >
              {hasSufficientBalance ? "Prêt" : "Recharge nécessaire"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Bouton pour voir le gagnant (pour les participants)
  const ShowWinnerButton = () => {
    if (isOrganizer || !winnerData || showWinnerToParticipants) return null;

    return (
      <Card className="border-2 border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 mt-4">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <span className="font-bold text-yellow-700">Résultats disponibles</span>
          </div>
          <p className="text-yellow-600 text-sm mb-3">
            Le tirage a été effectué. Découvrez le gagnant !
          </p>
          <Button
            onClick={handleShowWinner}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
          >
            <Eye className="w-4 h-4 mr-2" />
            Voir le gagnant
          </Button>
        </CardContent>
      </Card>
    );
  };

  // SECTION : Affichage du gagnant pour les participants
  const WinnerDisplayForParticipants = () => {
    if (!showWinnerToParticipants || !winnerData) return null;

    const userWinningTicket = userTickets.find(
      ticket => ticket.ticket_number.toString() === winnerData.ticket_number.toString()
    );

    return (
      <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-2xl mt-4">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-700">
            <Trophy className="w-6 h-6" />
            🎉 RÉSULTATS DU TIRAGE 🎉
          </CardTitle>
          <CardDescription className="text-green-600">
            Félicitations au gagnant de la tombola !
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-white rounded-xl p-6 border-2 border-green-300 shadow-lg">
            <div className="text-5xl font-bold text-green-900 mb-4">
              Ticket #{winnerData.ticket_number}
            </div>
            <div className="text-2xl font-bold text-green-800 mb-2">
              {winnerData.profiles?.full_name || winnerData.profiles?.username || 'Gagnant'}
            </div>
            <Badge variant="secondary" className="bg-green-500 text-white text-lg py-2 px-4">
              🏆 Grand Gagnant 🏆
            </Badge>
          </div>
          
          {(isUserWinner || userWinningTicket) && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="p-4 bg-red-500 text-white rounded-lg font-bold text-xl shadow-lg"
            >
              🎊 FÉLICITATIONS ! C'EST VOUS LE GAGNANT ! 🎊
            </motion.div>
          )}

          {/* Affichage des tickets de l'utilisateur */}
          {userTickets.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-700 mb-2">Vos tickets :</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {userTickets.map((ticket) => (
                  <div
                    key={ticket.ticket_number}
                    className={`p-2 rounded-lg border-2 font-bold ${
                      ticket.ticket_number.toString() === winnerData.ticket_number.toString()
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-600'
                        : 'bg-white border-blue-300 text-blue-700'
                    }`}
                  >
                    #{ticket.ticket_number}
                    {ticket.ticket_number.toString() === winnerData.ticket_number.toString() && (
                      <div className="text-xs text-white mt-1">GAGNANT</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!raffleData) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Données de la tombola non disponibles</p>
        </CardContent>
      </Card>
    );
  }

  // Calculs
  const totalCostPi = useMemo(() => {
    return pricePerTicket * quantity;
  }, [pricePerTicket, quantity]);

  const ticketsSold = raffleData?.tickets_sold || 0;
  const totalTickets = raffleData?.total_tickets || 1;
  const ticketsLeft = totalTickets - ticketsSold;
  const progressPercentage = (ticketsSold / totalTickets) * 100;
  const hasSufficientBalance = (userProfile?.coin_balance || 0) >= totalCostPi;
  const minTicketsRequired = raffleData?.min_tickets_required || 1;
  const isGoalReached = ticketsSold >= minTicketsRequired;

  if (isLoadingOrganizer) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Chargement de l'interface tombola...</p>
        </CardContent>
      </Card>
    );
  }

  console.log("🎯 Statut final RaffleInterface:", {
    isOrganizer,
    eventStatus,
    winnerData: !!winnerData,
    showWinnerToParticipants,
    user: user?.id,
    isUserWinner,
  });

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
      {/* SYSTÈME DE TIRAGE AU SORT - TOUJOURS AFFICHÉ POUR TOUS */}
      <RaffleDrawSystem 
        raffleData={raffleData}
        eventId={eventId}
        isOrganizer={isOrganizer}
        onDrawComplete={async (winner) => {
          console.log("🏆 Tirage terminé:", winner);
          // Recharger les données du gagnant
          await loadWinnerData();
        }}
      />

      {/* Bouton pour voir le gagnant */}
      <ShowWinnerButton />

      {/* Affichage du gagnant pour les participants */}
      <WinnerDisplayForParticipants />

      {/* INTERFACE DE PARTICIPATION - UNIQUEMENT POUR LES PARTICIPANTS NON ORGANISATEURS */}
      {eventStatus === "active" && !isOrganizer && !winnerData && (
        <>
          {/* CARTE DE SOLDE AVEC BOUTON DE RECHARGE */}
          <BalanceCard />

          {/* Interface de participation */}
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Participer à la tombola
                {!hasSufficientBalance && (
                  <Badge variant="destructive" className="ml-2 animate-pulse">
                    Solde insuffisant
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {hasSufficientBalance
                  ? `Achetez des tickets pour ${pricePerTicket}π chacun`
                  : "Rechargez votre portefeuille pour participer"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sélecteur de quantité */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-lg border-2 border-primary/20">
                <span className="font-semibold text-primary">
                  Quantité de tickets
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || loading}
                  >
                    -
                  </Button>
                  <span className="text-lg font-bold w-8 text-center text-primary">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setQuantity((q) => Math.min(ticketsLeft, q + 1))
                    }
                    disabled={quantity >= ticketsLeft || loading}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Coût total */}
              <div
                className={`p-3 bg-gradient-to-r ${
                  hasSufficientBalance
                    ? "from-blue-50 to-cyan-50 border-blue-200"
                    : "from-red-50 to-orange-50 border-red-200"
                } border rounded-lg`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`font-semibold ${
                      hasSufficientBalance ? "text-blue-700" : "text-red-700"
                    }`}
                  >
                    Coût total :
                  </span>
                  <div className="text-right">
                    <div
                      className={`text-xl font-bold flex items-center gap-1 ${
                        hasSufficientBalance ? "text-blue-600" : "text-red-600"
                      }`}
                    >
                      {totalCostPi} <Coins className="w-4 h-4" />
                    </div>
                    <div
                      className={`text-sm ${
                        hasSufficientBalance ? "text-blue-500" : "text-red-500"
                      }`}
                    >
                      {pricePerTicket}π × {quantity} ticket
                      {quantity > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOUTON DE PARTICIPATION OU RECHARGE */}
              {hasSufficientBalance ? (
                <Button
                  onClick={handlePurchase}
                  disabled={loading || quantity === 0 || ticketsLeft === 0}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-4 font-bold shadow-lg transform hover:scale-105 transition-transform"
                  size="lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Débit en cours...</span>
                    </div>
                  ) : ticketsLeft === 0 ? (
                    "Plus de tickets disponibles"
                  ) : (
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      <span>Participer pour {totalCostPi}π</span>
                      <Badge variant="secondary">
                        {quantity} ticket{quantity > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-red-700 text-sm font-medium">
                      ❌ Solde insuffisant pour participer
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Il vous manque{" "}
                      {totalCostPi - (userProfile?.coin_balance || 0)}π
                    </p>
                  </div>
                  <Button
                    onClick={handleRechargeWallet}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 font-bold shadow-lg transform hover:scale-105 transition-transform"
                    size="lg"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Recharger mon portefeuille
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Achetez des pièces π pour participer à la tombola
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CARTE DE PROMOTION DES PACKS */}
          {!hasSufficientBalance && (
            <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-700">
                    Pack de pièces disponible
                  </span>
                </div>
                <p className="text-green-600 text-sm mb-3">
                  Rechargez votre portefeuille avec nos packs de pièces π
                </p>
                <Button
                  onClick={handleRechargeWallet}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Voir les packs de pièces
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* MESSAGE SPÉCIAL POUR L'ORGANISATEUR */}
      {isOrganizer && (
        <Card className="border-2 border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-lg">
          <CardContent className="p-6 text-center">
            <Crown className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-yellow-700 mb-2">
              Vous êtes l'organisateur de cette tombola
            </h3>
            <p className="text-yellow-600 mb-4">
              En tant qu'organisateur, vous avez accès aux contrôles complets du
              tirage. Utilisez le <strong>Système de Tirage au Sort</strong>{" "}
              ci-dessus pour gérer le tirage.
            </p>

            {/* Indicateur de statut pour l'organisateur */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-yellow-100 rounded-lg">
                <Eye className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="font-bold text-yellow-700">Organisateur</p>
                <p className="text-sm text-yellow-600">Contrôles actifs</p>
              </div>
              <div className="text-center p-3 bg-yellow-100 rounded-lg">
                <Users className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="font-bold text-yellow-700">{ticketsSold}</p>
                <p className="text-sm text-yellow-600">Tickets vendus</p>
              </div>
            </div>

            {/* Instructions pour l'organisateur */}
            <div className="mt-4 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
              <h4 className="font-bold text-yellow-800 mb-2">Instructions :</h4>
              <ul className="text-sm text-yellow-700 text-left space-y-1">
                <li>
                  ✅ Utilisez les contrôles dans "Système de Tirage au Sort"
                </li>
                <li>✅ Lancez le tirage quand l'objectif est atteint</li>
                <li>✅ Tous les participants voient le tirage en direct</li>
                <li>✅ Le gagnant sera annoncé automatiquement</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION COMMENTAIRES - VISIBLE PAR TOUS */}
      <Card className="border-2 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            Commentaires ({comments.length})
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowComments(!showComments);
                if (!showComments) loadComments();
              }}
              className="ml-auto"
            >
              {showComments ? (
                <EyeOff className="w-4 h-4 mr-1" />
              ) : (
                <Eye className="w-4 h-4 mr-1" />
              )}
              {showComments ? "Masquer" : "Afficher"}
            </Button>
          </CardTitle>
        </CardHeader>

        {showComments && (
         <CardContent>
  {/* Formulaire de commentaire */}
  {user ? (
    <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-purple-500/30">
      <div className="flex gap-2">
        <Input
          placeholder="Écrivez votre commentaire..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 bg-gray-900 border-gray-700 text-white placeholder-gray-400"
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || postingComment}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
        >
          {postingComment ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Poster"
          )}
        </Button>
      </div>
    </div>
  ) : (
    <div className="mb-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
      <p className="text-sm text-purple-200 text-center">
        <Button
          variant="link"
          className="p-0 text-purple-300 font-bold hover:text-purple-100"
          onClick={() => navigate("/login")}
        >
          Connectez-vous
        </Button>
        {" pour commenter"}
      </p>
    </div>
  )}

  {/* Liste des commentaires */}
  {comments.length === 0 ? (
    <div className="text-center py-6 text-gray-400">
      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
      <p className="text-sm">Aucun commentaire pour le moment</p>
      <p className="text-xs mt-1">
        {user
          ? "Soyez le premier à commenter !"
          : "Connectez-vous pour commenter"}
      </p>
    </div>
  ) : (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {comments.map((comment) => {
        console.log("📝 Commentaire détaillé:", comment); // 🔥 DEBUG
        
        // 🔥 CORRECTION : Extraction sécurisée des données
        const userName = comment.profiles?.full_name || 
                        comment.profiles?.username || 
                        "Utilisateur";
        
        const userAvatar = comment.profiles?.avatar_url;
        const commentText = comment.comment_text || comment.content || "Aucun contenu";
        const commentDate = comment.created_at;

        return (
          <div
            key={comment.id}
            className="border-b border-gray-700 pb-3 last:border-0 bg-gray-800/50 rounded-lg p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={`Avatar de ${userName}`}
                    className="w-8 h-8 rounded-full border border-purple-500"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center text-white text-sm font-bold border border-purple-400">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* En-tête du commentaire avec nom et date */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-bold text-sm text-purple-200 bg-purple-900/30 px-2 py-1 rounded">
                    {userName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {commentDate ? new Date(commentDate).toLocaleDateString("fr-FR") : "Date inconnue"}
                    {" à "}
                    {commentDate ? new Date(commentDate).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "heure inconnue"}
                  </span>
                </div>
                
                {/* Texte du commentaire bien visible */}
                <div className="bg-gray-900/50 rounded-lg p-3 border-l-4 border-purple-500">
                  <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {commentText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</CardContent>
        )}
      </Card>
    </div>
  );
};

export default RaffleInterfaceComponent;