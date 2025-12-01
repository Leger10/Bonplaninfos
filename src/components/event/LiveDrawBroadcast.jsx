// Components/LiveDrawBroadcast.jsx - VERSION CORRECTE
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/customSupabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Radio, Users, Ticket, Sparkles, X, Crown, Gift, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const LiveDrawBroadcast = ({ raffleId, currentUser, onClose, isOrganizer = false }) => {
  const [liveData, setLiveData] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [drawMessages, setDrawMessages] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [showWinner, setShowWinner] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  const engagementMessages = [
    "🎯 Le tirage commence ! Préparez-vous pour la magie...",
    "✨ Les énergies positives s'accumulent autour des tickets...",
    "🚀 Premier tour de sélection en cours...",
    "🎪 Le défilement des numéros commence !",
    "🌈 Les tickets dansent dans la lumière...",
    "⚡ Deuxième tour ! L'intensité monte...",
    "🎭 Qui sera l'heureux élu ? Suspense...",
    "💫 Dernier tour ! Le destin se précise...",
    "🎊 Félicitations au gagnant ! 🎊",
  ];

  // 🔥 CORRECTION : Charger les données initiales
  useEffect(() => {
    if (!raffleId) return;

    const loadInitialData = async () => {
      try {
        console.log("🔍 Chargement des données initiales du tirage...");

        // Vérifier s'il y a une session de tirage active
        const { data: activeSession } = await supabase
          .from('raffle_draw_sessions')
          .select('*')
          .eq('raffle_event_id', raffleId)
          .eq('status', 'live')
          .single();

        if (activeSession) {
          console.log("📡 Session active trouvée:", activeSession);
          setIsLive(true);
          setIsDrawing(true);
          setDrawMessages([engagementMessages[0]]);
        }

        // Vérifier s'il y a un gagnant
        const { data: winner, error } = await supabase
          .from('raffle_winners')
          .select(`
            *,
            profiles:user_id (
              full_name,
              username,
              avatar_url
            ),
            raffle_prizes (
              description,
              value_fcfa,
              rank
            )
          `)
          .eq('raffle_event_id', raffleId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && winner) {
          console.log("✅ Gagnant existant trouvé:", winner);
          setLiveData(winner);
          setShowWinner(true);
          setIsLive(false);
          setIsDrawing(false);
          
          setDrawMessages([
            "📢 Résultats du tirage",
            `🎉 Félicitations à ${winner.profiles?.full_name || winner.profiles?.username || 'le gagnant'} !`,
            `🎫 Ticket gagnant: #${winner.ticket_number}`
          ]);

          toast({
            title: "🏆 Résultats disponibles",
            description: "Le gagnant du tirage a été annoncé !",
            duration: 5000
          });
        }
      } catch (error) {
        console.log("ℹ️ Aucune donnée initiale trouvée:", error);
      }
    };

    loadInitialData();
  }, [raffleId, toast]);

  // 🔥 CORRECTION : Système de subscription en temps réel
  useEffect(() => {
    if (!raffleId) return;

    console.log("📡 Initialisation des subscriptions en temps réel:", raffleId);

    // Subscription aux statuts de tirage
    const drawStatusSubscription = supabase
      .channel(`live-draw-status-${raffleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'raffle_draw_status',
          filter: `raffle_event_id=eq.${raffleId}`
        },
        (payload) => {
          console.log('📡 Statut de tirage reçu:', payload.new);
          handleDrawStatusUpdate(payload.new);
        }
      )
      .subscribe();

    // Subscription aux gagnants
    const winnerSubscription = supabase
      .channel(`live-winner-broadcast-${raffleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'raffle_winners',
          filter: `raffle_event_id=eq.${raffleId}`
        },
        async (payload) => {
          console.log('🎯 Nouveau gagnant détecté:', payload.new);
          await handleWinnerUpdate(payload.new);
        }
      )
      .subscribe();

    // Subscription aux sessions de tirage
    const sessionSubscription = supabase
      .channel(`live-sessions-${raffleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'raffle_draw_sessions',
          filter: `raffle_event_id=eq.${raffleId}`
        },
        (payload) => {
          console.log('📡 Nouvelle session de tirage:', payload.new);
          if (payload.new.status === 'live') {
            setIsLive(true);
            setIsDrawing(true);
            setShowWinner(false);
            setLiveData(null);
            setDrawMessages([engagementMessages[0]]);
            
            toast({
              title: "📡 Diffusion en direct",
              description: "Le tirage commence !",
              duration: 3000
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log("🔴 Nettoyage des subscriptions");
      drawStatusSubscription.unsubscribe();
      winnerSubscription.unsubscribe();
      sessionSubscription.unsubscribe();
    };
  }, [raffleId]);

  // 🔥 FONCTION : Gérer les mises à jour du statut du tirage
  const handleDrawStatusUpdate = (statusData) => {
    if (!statusData) return;

    console.log('🔄 Traitement statut tirage:', statusData);
    
    switch (statusData.status) {
      case 'draw_started':
        setIsDrawing(true);
        setIsLive(true);
        setDrawMessages([engagementMessages[0]]);
        setShowWinner(false);
        setCurrentNumber(null);
        setCurrentRound(0);
        break;
        
      case 'round_started':
        setCurrentRound(statusData.round_number || 1);
        if (statusData.round_number > 0 && statusData.round_number <= engagementMessages.length) {
          setDrawMessages(prev => [...prev, engagementMessages[statusData.round_number]]);
        }
        break;
        
      case 'number_displayed':
        setCurrentNumber(statusData.displayed_number);
        break;
        
      case 'winner_selected':
        setDrawMessages(prev => [...prev, "🎉 Le gagnant a été sélectionné !"]);
        break;
        
      case 'draw_completed':
        setIsDrawing(false);
        setDrawMessages(prev => [...prev, engagementMessages[8]]);
        break;
        
      default:
        console.log('📝 Statut non géré:', statusData.status);
    }
  };

  // 🔥 FONCTION : Gérer les mises à jour des gagnants
  const handleWinnerUpdate = async (winnerData) => {
    try {
      console.log('🔄 Traitement nouveau gagnant:', winnerData);
      
      // Charger les détails complets du gagnant
      const { data: winnerDetails, error } = await supabase
        .from("raffle_winners")
        .select(`
          *,
          profiles:user_id (
            full_name,
            username,
            avatar_url
          ),
          raffle_prizes (
            description,
            value_fcfa,
            rank
          )
        `)
        .eq("id", winnerData.id)
        .single();

      if (error) {
        console.error("❌ Erreur chargement détails gagnant:", error);
        return;
      }

      console.log("✅ Détails du gagnant chargés:", winnerDetails);
      
      setLiveData(winnerDetails);
      setShowWinner(true);
      setIsDrawing(false);
      setIsLive(false);

      // Ajouter les messages de félicitations
      setDrawMessages(prev => {
        const newMessages = [...prev];
        if (!newMessages.some(msg => msg.includes('Félicitations'))) {
          newMessages.push(
            "🎊 Le tirage est terminé !",
            `🎉 Félicitations à ${winnerDetails.profiles?.full_name || winnerDetails.profiles?.username || 'le gagnant'} !`
          );
        }
        return newMessages;
      });

      // Notification pour tous les participants
      toast({
        title: "🏆 Tirage terminé !",
        description: `Félicitations à ${winnerDetails.profiles?.full_name || winnerDetails.profiles?.username || 'le gagnant'} !`,
        duration: 10000
      });

    } catch (error) {
      console.error("❌ Erreur traitement gagnant:", error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  // Afficher le composant s'il y a une activité de tirage ou un gagnant
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="w-full max-w-4xl relative"
      >
        {/* Bouton fermer */}
        <Button
          onClick={handleClose}
          variant="ghost"
          size="sm"
          className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>

        <Card className="border-4 border-red-500 bg-gradient-to-br from-gray-900 to-black text-white shadow-2xl">
          {/* En-tête LIVE */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 py-4 px-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <Radio className="w-6 h-6 animate-pulse" />
              <span className="font-bold text-xl">
                {showWinner ? "RÉSULTATS OFFICIELS" : 
                 isDrawing ? "DIFFUSION EN DIRECT" : 
                 "SYSTÈME DE TIRAGE"}
              </span>
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-sm opacity-90 mt-2">
              {isDrawing ? "Tirage au sort en cours - Restez à l'écoute !" : 
               showWinner ? "Résultats officiels du tirage" : 
               "Système transparent de tirage au sort"}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Animation du numéro en cours */}
            <AnimatePresence>
              {(isDrawing && currentNumber) && (
                <motion.div
                  key="number-animation"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  className="text-center"
                >
                  <div className="relative">
                    <div className="text-5xl sm:text-8xl font-bold text-purple-600 bg-white rounded-2xl p-6 sm:p-12 border-4 border-purple-300 shadow-2xl mb-4">
                      #{currentNumber}
                    </div>
                    <div className="text-lg sm:text-xl text-purple-300 font-semibold">
                      Tour {currentRound}/3 - {engagementMessages[currentRound]}
                    </div>
                    
                    {/* Indicateur si c'est le ticket de l'utilisateur */}
                    {currentUser && (
                      <div className="mt-3 p-2 bg-purple-800/50 rounded-lg">
                        <p className="text-sm text-purple-200">
                          {currentNumber === currentUser.ticket_number ? 
                            "🎉 C'EST VOTRE TICKET !" : 
                            "👀 Regardez le numéro !"}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Affichage du gagnant */}
            <AnimatePresence>
              {showWinner && liveData && (
                <motion.div
                  key="winner"
                  initial={{ scale: 0, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-center"
                >
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
                    {/* Confettis animés */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(50)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{
                            y: -100,
                            x: Math.random() * 100 - 50,
                            opacity: 0,
                          }}
                          animate={{
                            y: 1000,
                            opacity: [0, 1, 0],
                            rotate: Math.random() * 360,
                          }}
                          transition={{
                            duration: 3 + Math.random() * 2,
                            delay: Math.random() * 1,
                          }}
                          className="absolute text-2xl"
                          style={{
                            left: `${Math.random() * 100}%`,
                          }}
                        >
                          {["🎉", "🎊", "⭐", "✨", "🎈"][Math.floor(Math.random() * 5)]}
                        </motion.div>
                      ))}
                    </div>

                    <Trophy className="w-20 h-20 mx-auto mb-4 text-white drop-shadow-2xl" />
                    <h2 className="text-4xl font-bold mb-4 drop-shadow-lg">FÉLICITATIONS !</h2>

                    <div className="text-6xl sm:text-8xl font-bold mb-6 bg-white text-orange-600 rounded-2xl p-6 mx-auto max-w-xs shadow-2xl">
                      #{liveData.ticket_number}
                    </div>

                    <div className="mb-4">
                      <Crown className="w-12 h-12 mx-auto mb-2 text-yellow-300" />
                      <p className="text-3xl font-semibold mb-2">
                        {liveData.profiles?.full_name || liveData.profiles?.username || "Gagnant"}
                      </p>
                      <Badge className="text-xl py-3 px-6 bg-white text-orange-600 border-0 shadow-lg">
                        <Gift className="w-5 h-5 mr-2" />
                        Grand Gagnant
                      </Badge>
                    </div>

                    {liveData.raffle_prizes?.[0] && (
                      <div className="mt-4 p-4 bg-white/20 rounded-xl">
                        <p className="text-xl font-semibold">
                          🎁 {liveData.raffle_prizes[0].description}
                        </p>
                        {liveData.raffle_prizes[0].value_fcfa && (
                          <p className="text-lg mt-1">
                            💰 {liveData.raffle_prizes[0].value_fcfa.toLocaleString()} FCFA
                          </p>
                        )}
                      </div>
                    )}

                    {/* Message spécial si c'est l'utilisateur courant */}
                    {currentUser && liveData.user_id === currentUser.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-4 -left-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold rotate-12 shadow-lg"
                      >
                        🎊 C'EST VOUS ! 🎊
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages du tirage */}
            <div className="space-y-3 max-h-40 overflow-y-auto bg-black/30 rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white/80 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Journal du tirage en direct
              </h3>
              {drawMessages.length === 0 ? (
                <p className="text-white/60 text-sm text-center py-4">
                  En attente du début du tirage...
                </p>
              ) : (
                drawMessages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm"
                  >
                    <p className="text-sm text-white/90">{message}</p>
                  </motion.div>
                ))
              )}
            </div>

            {/* Statistiques en direct */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p className="text-2xl font-bold text-white">En direct</p>
                <p className="text-sm text-white/70">Participants</p>
              </div>
              <div className="p-4 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                <Ticket className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-2xl font-bold text-white">
                  {currentNumber ? `#${currentNumber}` : "---"}
                </p>
                <p className="text-sm text-white/70">Numéro actuel</p>
              </div>
              <div className="p-4 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <p className="text-2xl font-bold text-white">
                  {showWinner ? "Terminé" : isDrawing ? "En cours" : "En attente"}
                </p>
                <p className="text-sm text-white/70">Statut</p>
              </div>
            </div>

            {/* Indicateur de transparence */}
            <div className="text-center p-4 bg-green-500/20 rounded-xl border border-green-400/30">
              <p className="text-green-200 text-sm">
                🔒 <strong>Système 100% transparent :</strong> Le tirage est effectué en direct devant tous les participants
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LiveDrawBroadcast;