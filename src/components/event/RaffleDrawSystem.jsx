import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight, Users, Ticket, Crown, Target, Sparkles, RotateCcw, Play, Trophy, AlertCircle, CheckCircle, Gift, CreditCard, Loader2, ChevronDown, ChevronUp, Radio, Eye, EyeOff, Award, Medal } from 'lucide-react';

const RaffleDrawSystem = ({ raffleData, eventId, isOrganizer, onDrawComplete }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentRound, setCurrentRound] = useState(0);
    const [displayedNumber, setDisplayedNumber] = useState(null);
    const [winnerTicket, setWinnerTicket] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [availableTickets, setAvailableTickets] = useState([]);
    const [drawMessages, setDrawMessages] = useState([]);
    const [showWinner, setShowWinner] = useState(false);
    const [drawHistory, setDrawHistory] = useState([]);
    const [userTickets, setUserTickets] = useState([]);
    const [isUserWinner, setIsUserWinner] = useState(false);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [liveDrawData, setLiveDrawData] = useState(null);
    
    // États pour la diffusion en direct
    const [isLiveBroadcast, setIsLiveBroadcast] = useState(false);
    const [broadcastStatus, setBroadcastStatus] = useState('idle');
    const [currentDrawSession, setCurrentDrawSession] = useState(null);

    // États pour le classement
    const [participantRankings, setParticipantRankings] = useState([]);
    const [showRankings, setShowRankings] = useState(false);
    const [rankingsLoading, setRankingsLoading] = useState(false);

    const ticketPrice = raffleData?.calculated_price_pi || 1;

    // Messages engageants pour le tirage
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
        "🎉 Bravo ! Vous avez fait le bonheur d'un participant !"
    ];

    // Fonction pour obtenir le label de position
    const getPositionLabel = (position) => {
        const positions = {
            1: "🏆 1er",
            2: "🥈 2ème",
            3: "🥉 3ème",
            4: "4ème",
            5: "5ème",
            6: "6ème",
            7: "7ème",
            8: "8ème",
            9: "9ème",
            10: "10ème"
        };
        
        return positions[position] || `${position}ème`;
    };

    // Fonction pour calculer le classement des participants
    const calculateParticipantRankings = useCallback(async (winningTicketNumber) => {
        if (!raffleData?.id || !winningTicketNumber) return;

        setRankingsLoading(true);
        try {
            console.log("🏆 Calcul du classement...");
            
            // Récupérer tous les tickets du raffle
            const { data: ticketsData, error } = await supabase
                .from('raffle_tickets')
                .select(`
                    *,
                    profiles:user_id (
                        id,
                        full_name,
                        username,
                        avatar_url,
                        email
                    )
                `)
                .eq('raffle_event_id', raffleData.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Calculer le nombre de tickets par participant
            const participantMap = {};
            
            ticketsData.forEach(ticket => {
                if (ticket.profiles) {
                    const userId = ticket.profiles.id;
                    if (!participantMap[userId]) {
                        participantMap[userId] = {
                            user_id: userId,
                            full_name: ticket.profiles.full_name,
                            username: ticket.profiles.username,
                            avatar_url: ticket.profiles.avatar_url,
                            email: ticket.profiles.email,
                            tickets_count: 0,
                            tickets: [],
                            total_spent: 0
                        };
                    }
                    participantMap[userId].tickets_count += 1;
                    participantMap[userId].tickets.push(ticket.ticket_number);
                    participantMap[userId].total_spent += ticketPrice;
                }
            });

            // Convertir en tableau et trier par nombre de tickets (décroissant)
            const rankings = Object.values(participantMap)
                .sort((a, b) => {
                    // D'abord par nombre de tickets
                    if (b.tickets_count !== a.tickets_count) {
                        return b.tickets_count - a.tickets_count;
                    }
                    // Ensuite par ordre d'achat (plus ancien en premier)
                    return a.tickets[0] - b.tickets[0];
                })
                .map((participant, index) => ({
                    ...participant,
                    rank: index + 1,
                    position: getPositionLabel(index + 1),
                    is_winner: participant.tickets.includes(parseInt(winningTicketNumber))
                }));

            console.log("✅ Classement calculé:", rankings);
            setParticipantRankings(rankings);
            
        } catch (error) {
            console.error("calcul classement:", error);
            
        } finally {
            setRankingsLoading(false);
        }
    }, [raffleData?.id, ticketPrice]);

    // 🔥 FONCTION : Charger les participants
    const loadParticipants = useCallback(async () => {
        if (!raffleData?.id) return;

        try {
            const { data: ticketsData, error } = await supabase
                .from('raffle_tickets')
                .select(`
                    *,
                    profiles:user_id (
                        id,
                        full_name,
                        username,
                        avatar_url
                    )
                `)
                .eq('raffle_event_id', raffleData.id)
                .order('ticket_number', { ascending: true });

            if (error) {
                console.error(" chargement tickets:", error);
                return;
            }

            setAvailableTickets(ticketsData || []);
            
            if (isOrganizer) {
                const participantsMap = {};
                (ticketsData || []).forEach(ticket => {
                    if (ticket.profiles) {
                        if (!participantsMap[ticket.profiles.id]) {
                            participantsMap[ticket.profiles.id] = {
                                ...ticket.profiles,
                                tickets: [],
                                totalSpent: 0,
                                ticketsCount: 0
                            };
                        }
                        participantsMap[ticket.profiles.id].tickets.push({
                            number: ticket.ticket_number,
                            id: ticket.id
                        });
                        const currentTicketPrice = raffleData.calculated_price_pi || 1;
                        participantsMap[ticket.profiles.id].totalSpent += currentTicketPrice;
                        participantsMap[ticket.profiles.id].ticketsCount += 1;
                    }
                });
                
                const participantsList = Object.values(participantsMap);
                setParticipants(participantsList);
                
                const revenue = (ticketsData?.length || 0) * (raffleData.calculated_price_pi || 1);
                setTotalRevenue(revenue);
            } else {
                setParticipants([]);
                setTotalRevenue(0);
            }
            
            if (user) {
                const userTicketsList = (ticketsData || [])
                    .filter(ticket => ticket.user_id === user.id)
                    .map(ticket => ({
                        number: ticket.ticket_number,
                        id: ticket.id,
                        price: raffleData.calculated_price_pi || 1
                    }));
                setUserTickets(userTicketsList);
            }
        } catch (err) {
            console.error("💥 Erreur chargement participants:", err);
        }
    }, [raffleData, user, isOrganizer]);

    // 🔥 FONCTION : Charger l'historique des tirages
    const loadDrawHistory = useCallback(async () => {
        if (!raffleData?.id) return;

        try {
            // Removed raffle_prizes join as it caused an error and seems unnecessary/incorrect schema
            const { data, error } = await supabase
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
                .order('created_at', { ascending: false });

            if (!error && data) {
                setDrawHistory(data);
            }
        } catch (err) {
            console.error("💥chargement historique:", err);
        }
    }, [raffleData]);

    // 🔥 CORRECTION : Fonction pour s'assurer que le gagnant est visible
    const ensureWinnerVisibility = useCallback(async () => {
        if (!raffleData?.id) return;

        try {
            console.log("🔍 Vérification de la visibilité du gagnant...");
            
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
                .maybeSingle(); // Use maybeSingle instead of single to avoid error when no winner

            if (!error && winner) {
                console.log("✅ Gagnant trouvé pour visibilité:", winner);
                setLiveDrawData(winner);
                setShowWinner(true);
                
                // Créer un ticket gagnant virtuel pour l'affichage
                const winningTicket = {
                    ticket_number: winner.ticket_number,
                    profiles: winner.profiles,
                    is_virtual: true
                };
                
                setWinnerTicket(winningTicket);
                
                // Calculer le classement
                await calculateParticipantRankings(winner.ticket_number);
                
                // Vérifier si l'utilisateur courant est le gagnant
                if (user && winner.user_id === user.id) {
                    setIsUserWinner(true);
                }
            }
        } catch (error) {
            console.log("ℹ️ Aucun gagnant pour la visibilité:", error);
        }
    }, [raffleData?.id, user, calculateParticipantRankings]);

    // 🔥 FONCTION : Gérer un nouveau gagnant
    const handleNewWinner = useCallback(async (winnerData) => {
        try {
            // Charger les détails complets du gagnant
            const { data: winnerDetails, error } = await supabase
                .from('raffle_winners')
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        username,
                        avatar_url
                    )
                `)
                .eq('id', winnerData.id)
                .single();

            if (error) {
                console.error("chargement détails gagnant:", error);
                return;
            }

            if (winnerDetails) {
                setLiveDrawData(winnerDetails);
                setShowWinner(true);
                
                const winningTicket = {
                    ticket_number: winnerDetails.ticket_number,
                    profiles: winnerDetails.profiles,
                    is_virtual: true
                };
                
                setWinnerTicket(winningTicket);
                
                // Calculer le classement
                await calculateParticipantRankings(winnerDetails.ticket_number);
                
                if (user && winnerDetails.user_id === user.id) {
                    setIsUserWinner(true);
                    toast({
                        title: "🎉 FÉLICITATIONS ! 🎉",
                        description: "Vous avez gagné le tirage !",
                        duration: 10000
                    });
                } else {
                    // Notification pour tous les participants
                    toast({
                        title: "🏆 Tirage terminé !",
                        description: `Le gagnant est le ticket #${winnerDetails.ticket_number}`,
                        duration: 6000,
                    });
                }

                // Recharger les données
                await loadParticipants();
                await loadDrawHistory();
            }
        } catch (error) {
            console.error("traitement nouveau gagnant:", error);
        }
    }, [user, toast, loadParticipants, loadDrawHistory, calculateParticipantRankings]);

    // 🔥 EFFET : Chargement initial des données
    useEffect(() => {
        console.log("🔧 Chargement initial des données");
        
        const loadInitialData = async () => {
            try {
                await loadParticipants();
                await loadDrawHistory();
                await ensureWinnerVisibility();
                
                // Vérifier les sessions actives
                if (raffleData?.id) {
                    const { data: activeSession } = await supabase
                        .from('raffle_draw_sessions')
                        .select('*')
                        .eq('raffle_event_id', raffleData.id)
                        .eq('status', 'live')
                        .maybeSingle(); // Use maybeSingle to avoid error if no active session
                        
                    if (activeSession) {
                        setCurrentDrawSession(activeSession);
                        setIsLiveBroadcast(true);
                        setBroadcastStatus('live');
                    }
                }
            } catch (error) {
                console.error("💥chargement initial:", error);
            }
        };
        
        if (raffleData?.id) {
            loadInitialData();
        }
    }, [raffleData?.id, loadParticipants, loadDrawHistory, ensureWinnerVisibility]);

    // 🔥 EFFET : Écoute en temps réel des gagnants
    useEffect(() => {
        if (!raffleData?.id) return;

        console.log("🎯 Initialisation écoute en direct");

        const channel = supabase
            .channel(`raffle-winners-${raffleData.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'raffle_winners',
                    filter: `raffle_event_id=eq.${raffleData.id}`
                },
                async (payload) => {
                    console.log('🎯 Nouveau gagnant détecté:', payload.new);
                    await handleNewWinner(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [raffleData?.id, handleNewWinner]);

    // --------------------------------------------------------------------------------
    // 🔥 CORRECTION CRITIQUE : Le rendu conditionnel doit être APRÈS tous les Hooks
    // --------------------------------------------------------------------------------
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

    // Vérifier si l'objectif est atteint
    const isGoalReached = (raffleData?.tickets_sold || 0) >= (raffleData?.min_tickets_required || 1);

    // Statistiques
    const ticketsSold = raffleData?.tickets_sold || 0;
    const totalTickets = raffleData?.total_tickets || 1;
    const progressPercentage = (ticketsSold / totalTickets) * 100;
    const minTicketsRequired = raffleData?.min_tickets_required || 1;

    // 🔥 FONCTION AMÉLIORÉE : Animation du tirage avec meilleur effet visuel
    const animateNumberSelection = async (tickets, rounds = 3) => {
        const ticketNumbers = tickets.map(t => t.ticket_number);
        if (ticketNumbers.length === 0) return;
        
        console.log("🎲 Début de l'animation du tirage");
        
        for (let round = 1; round <= rounds; round++) {
            setCurrentRound(round);
            setDrawMessages(prev => [...prev, engagementMessages[round]]);
            
            const animationsPerRound = 15; // 🔥 Augmenté pour plus de suspense
            const roundSpeed = 300 - (round * 60); // 🔥 Ralentit à chaque tour
            
            for (let i = 0; i < animationsPerRound; i++) {
                const randomIndex = Math.floor(Math.random() * ticketNumbers.length);
                const newNumber = ticketNumbers[randomIndex];
                setDisplayedNumber(newNumber);
                
                // 🔥 CORRECTION : Vitesses ajustées pour mieux voir l'animation
                let speed = roundSpeed;
                if (i > animationsPerRound * 0.6) speed = roundSpeed + 100;
                if (i > animationsPerRound * 0.8) speed = roundSpeed + 200;
                if (i > animationsPerRound * 0.9) speed = roundSpeed + 300;
                
                await new Promise(resolve => setTimeout(resolve, speed));
            }
            
            // Pause entre les tours
            if (round < rounds) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log("✅ Animation du tirage terminée");
    };

    // 🔥 FONCTION : Sélectionner un gagnant aléatoire
    const selectRandomWinner = (tickets) => {
        if (tickets.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * tickets.length);
        return tickets[randomIndex];
    };

    // 🔥 FONCTION : Démarrer la diffusion en direct
    const startLiveBroadcast = async () => {
        if (!isOrganizer) return;

        try {
            setBroadcastStatus('starting');
            
            const sessionData = {
                raffle_event_id: raffleData.id,
                status: 'live',
                started_by: user.id,
                created_at: new Date().toISOString()
            };

            const { data: session, error } = await supabase
                .from('raffle_draw_sessions')
                .insert(sessionData)
                .select()
                .single();

            if (error) throw error;

            setCurrentDrawSession(session);
            setIsLiveBroadcast(true);
            setBroadcastStatus('live');
            
            toast({
                title: "📡 Diffusion en direct démarrée",
                description: "Tous les participants peuvent maintenant voir le tirage",
            });

        } catch (error) {
            console.error("démarrage diffusion:", error);
            toast({
                title: "Diffusion en cours...",
                description: "démarrage de la diffusion en direct",
                variant: "destructive"
            });
        }
    };

    // 🔥 FONCTION : Arrêter la diffusion en direct
    const stopLiveBroadcast = async () => {
        if (!isOrganizer || !currentDrawSession) return;

        try {
            const { error } = await supabase
                .from('raffle_draw_sessions')
                .update({ 
                    status: 'ended',
                    ended_at: new Date().toISOString()
                })
                .eq('id', currentDrawSession.id);

            if (error) throw error;

            setIsLiveBroadcast(false);
            setBroadcastStatus('ended');
            setCurrentDrawSession(null);
            
            toast({
                title: "📡 Diffusion terminée",
                description: "La diffusion en direct est maintenant terminée",
            });

        } catch (error) {
            console.error("❌ Erreur arrêt diffusion:", error);
        }
    };

    // 🔥 FONCTION : Sauvegarder le gagnant
    const saveWinnerToDatabase = async (winner) => {
      try {
        if (!winner || !winner.profiles) {
          throw new Error("Données du gagnant incomplètes");
        }

        console.log("💾 Sauvegarde du gagnant:", winner);

        const winnerRecord = {
          raffle_event_id: raffleData.id,
          user_id: winner.profiles.id,
          ticket_number: winner.ticket_number.toString(),
          prize_description: 'Lot principal',
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('raffle_winners')
          .insert(winnerRecord)
          .select(`
            *,
            profiles:user_id (
              full_name,
              username,
              avatar_url
            )
          `)
          .single();

        if (error) {
          console.error("❌ Erreur insertion gagnant:", error);
          throw error;
        }

        console.log("✅ Gagnant sauvegardé avec succès:", data);
        return data;

      } catch (error) {
        console.error("❌ Erreur sauvegarde gagnant:", error);
        throw error;
      }
    };

    // 🔥 FONCTION : Notifier les participants
    const notifyAllParticipants = async (winnerData) => {
        try {
            const { data: participants } = await supabase
                .from('raffle_tickets')
                .select('user_id')
                .eq('raffle_event_id', raffleData.id)
                .neq('user_id', winnerData.user_id);

            if (participants) {
                const participantIds = [...new Set(participants.map(p => p.user_id))];
                
                const notifications = participantIds.map(userId => ({
                    user_id: userId,
                    title: '🎉 Tirage terminé !',
                    message: `Le tirage est terminé. Le gagnant est ${winnerData.profiles?.full_name || winnerData.profiles?.username || 'un participant'} avec le ticket #${winnerData.ticket_number}`,
                    type: 'raffle_result',
                    is_read: false,
                    created_at: new Date().toISOString()
                }));

                await supabase
                    .from('notifications')
                    .insert(notifications);
            }
        } catch (error) {
            console.error("❌ Erreur notification participants:", error);
        }
    };

    // 🔥 FONCTION PRINCIPALE CORRIGÉE : Conduire le tirage avec animation visible
    const conductDraw = async () => {
        if (!isOrganizer) {
            toast({
                title: "Action non autorisée",
                description: "Seul l'organisateur peut lancer le tirage",
                variant: "destructive"
            });
            return;
        }

        if (!isGoalReached) {
            toast({
                title: "Objectif non atteint",
                description: `L'objectif minimum de ${minTicketsRequired} tickets n'est pas atteint`,
                variant: "destructive"
            });
            return;
        }

        if (availableTickets.length === 0) {
            toast({
                title: "Aucun participant",
                description: "Aucun ticket n'a été acheté pour cette tombola",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        setIsDrawing(true);
        setDrawMessages([engagementMessages[0]]);
        setWinnerTicket(null);
        setShowWinner(false);
        setIsUserWinner(false);
        setDisplayedNumber(null);
        setCurrentRound(0);
        setLiveDrawData(null);

        try {
            console.log("🎲 DÉBUT DU TIRAGE - Animation des chiffres");

            // Démarrer la diffusion
            await startLiveBroadcast();

            // 🔥 CORRECTION : Animation du tirage BIEN VISIBLE
            await animateNumberSelection(availableTickets, 3);

            // Sélection du gagnant
            const winner = selectRandomWinner(availableTickets);
            console.log("🎯 Gagnant sélectionné:", winner);
            setWinnerTicket(winner);
            
            if (user && winner.profiles?.id === user.id) {
                setIsUserWinner(true);
            }

            // 🔥 CORRECTION : Pause dramatique avant de montrer le gagnant
            setDrawMessages(prev => [...prev, "🎯 Le gagnant a été sélectionné !"]);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Afficher le gagnant
            setShowWinner(true);
            setDrawMessages(prev => [...prev, engagementMessages[8]]);

            // Sauvegarder le gagnant
            const winnerData = await saveWinnerToDatabase(winner);

            // Calculer le classement
            await calculateParticipantRankings(winner.ticket_number);

            // Notifier les participants
            await notifyAllParticipants(winnerData);

            // Recharger les données locales
            await loadParticipants();
            await loadDrawHistory();
            await ensureWinnerVisibility();

            if (onDrawComplete) {
                onDrawComplete(winner);
            }

            toast({
                title: "🎊 Tirage terminé !",
                description: "Le gagnant a été annoncé à tous les participants",
                duration: 5000
            });

        } catch (error) {
            console.error("❌ Erreur lors du tirage:", error);
            toast({
                title: "Erreur du tirage",
                description: error.message || "Une erreur est survenue lors du tirage",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
            setIsDrawing(false);
            
            // Arrêter la diffusion après un délai
            setTimeout(() => {
                if (isOrganizer) {
                    stopLiveBroadcast();
                }
            }, 30000);
        }
    };

    // Composant d'affichage du classement
    const RankingsDisplay = () => {
        if (!showRankings || rankingsLoading || participantRankings.length === 0) return null;

        return (
            <Card className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-700">
                            <Trophy className="w-6 h-6" />
                            🏆 CLASSEMENT DES PARTICIPANTS 🏆
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRankings(false)}
                        >
                            Masquer
                        </Button>
                    </CardTitle>
                    <CardDescription className="text-indigo-600">
                        Classement basé sur le nombre de tickets achetés
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Liste des participants classés */}
                        {participantRankings.slice(0, 10).map((participant) => (
                            <div
                                key={participant.user_id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                    participant.user_id === liveDrawData?.user_id
                                        ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300'
                                        : 'bg-white border-indigo-200'
                                } hover:shadow-md transition-shadow`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                        ${participant.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white' :
                                            participant.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white' :
                                            participant.rank === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' :
                                            'bg-indigo-100 text-indigo-700'}
                                    `}>
                                        {participant.rank}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {participant.avatar_url ? (
                                            <img
                                                src={participant.avatar_url}
                                                alt={participant.full_name}
                                                className="w-8 h-8 rounded-full border-2 border-indigo-300"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                                {participant.full_name?.charAt(0) || participant.username?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                {participant.full_name || participant.username}
                                                {participant.user_id === liveDrawData?.user_id && (
                                                    <Badge className="ml-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs">
                                                        🎊 Gagnant
                                                    </Badge>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {participant.tickets_count} ticket{participant.tickets_count > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm text-gray-600">
                                        <span className="text-xs text-gray-500">Dépensé: </span>
                                        <span className="font-bold text-indigo-700">{participant.total_spent}π</span>
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                        {participant.tickets.slice(0, 3).map((ticket, idx) => (
                                            <span
                                                key={idx}
                                                className={`text-xs px-2 py-1 rounded ${
                                                    participant.user_id === liveDrawData?.user_id && 
                                                    ticket === parseInt(liveDrawData?.ticket_number)
                                                        ? 'bg-red-500 text-white animate-pulse'
                                                        : 'bg-indigo-100 text-indigo-700'
                                                }`}
                                            >
                                                #{ticket}
                                            </span>
                                        ))}
                                        {participant.tickets.length > 3 && (
                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                +{participant.tickets.length - 3}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Résumé statistique */}
                        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-indigo-200">
                            <div className="text-center p-3 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-lg">
                                <div className="text-2xl font-bold text-indigo-700">{participantRankings.length}</div>
                                <div className="text-sm text-indigo-600">Participants</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                                <div className="text-2xl font-bold text-green-700">
                                    {participantRankings.reduce((sum, p) => sum + p.tickets_count, 0)}
                                </div>
                                <div className="text-sm text-green-600">Tickets vendus</div>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                                <div className="text-2xl font-bold text-purple-700">
                                    {participantRankings.reduce((sum, p) => sum + p.total_spent, 0)} π
                                </div>
                                <div className="text-sm text-purple-600">Revenu total</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Rendu du composant
    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
            {/* Bannière de diffusion en direct */}
            {(isLiveBroadcast || isDrawing || liveDrawData) && (
                <Card className="border-2 border-red-500 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse">
                    <CardContent className="p-3 sm:p-4 text-white text-center">
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                            <Radio className="w-4 h-4 sm:w-6 sm:h-6 animate-bounce" />
                            <span className="font-bold text-sm sm:text-lg">DIFFUSION EN DIRECT</span>
                            <Radio className="w-4 h-4 sm:w-6 sm:h-6 animate-bounce" />
                        </div>
                        <p className="text-xs sm:text-sm mt-1 opacity-90">
                            {isDrawing ? "Tirage en cours..." : 
                             showWinner ? "Résultats du tirage" : 
                             "En attente du tirage..."}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* En-tête du système de tirage */}
            <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
                <CardHeader className="px-3 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        Système de Tirage au Sort
                        {isOrganizer && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                                Organisateur
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                        {isGoalReached 
                            ? "🎯 L'objectif est atteint ! Le tirage peut commencer."
                            : `📊 Objectif: ${ticketsSold}/${minTicketsRequired} tickets vendus`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                    {/* Statistiques */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
                        <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-1 sm:mb-2" />
                            <p className="text-lg sm:text-2xl font-bold text-blue-700">
                                {isOrganizer ? participants.length : '?'}
                            </p>
                            <p className="text-xs sm:text-sm text-blue-600">Participants</p>
                        </div>
                        <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                            <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-1 sm:mb-2" />
                            <p className="text-lg sm:text-2xl font-bold text-green-700">{availableTickets.length}</p>
                            <p className="text-xs sm:text-sm text-green-600">Tickets vendus</p>
                        </div>
                        {isOrganizer && (
                            <>
                                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 mx-auto mb-1 sm:mb-2" />
                                    <p className="text-lg sm:text-2xl font-bold text-orange-700">{minTicketsRequired}</p>
                                    <p className="text-xs sm:text-sm text-orange-600">Objectif minimum</p>
                                </div>
                                <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-1 sm:mb-2" />
                                    <p className="text-lg sm:text-2xl font-bold text-purple-700">{totalRevenue}</p>
                                    <p className="text-xs sm:text-sm text-purple-600">Revenu total (π)</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Barre de progression */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                            <span className="font-medium">Progression vers l'objectif</span>
                            <span className="text-muted-foreground">
                                {ticketsSold} / {minTicketsRequired} tickets
                            </span>
                        </div>
                        <Progress 
                            value={Math.min(progressPercentage, 100)} 
                            className={`h-2 sm:h-3 ${
                                isGoalReached ? 'bg-green-200' : 'bg-orange-200'
                            }`}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 🔥 SECTION ANIMATION DU TIRAGE - AMÉLIORÉE */}
            {(isLiveBroadcast || isDrawing) && (
                <Card className="border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 shadow-2xl">
                    <CardHeader className="px-3 sm:px-6 py-4">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-purple-700">
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                            Tirage en Direct - Sélection du Gagnant
                        </CardTitle>
                        <CardDescription className="text-purple-600">
                            {isDrawing ? "Les numéros défilent pour trouver le gagnant..." : "Tirage terminé"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-6">
                        {/* 🔥 CORRECTION : Animation des chiffres BIEN VISIBLE */}
                        {isDrawing && (
                            <div className="text-center space-y-6">
                                {/* Indicateur du tour actuel */}
                                <div className="bg-purple-100 rounded-lg p-3 border border-purple-300">
                                    <p className="text-purple-700 font-semibold">
                                        Tour {currentRound}/3 - {engagementMessages[currentRound]}
                                    </p>
                                </div>

                                {/* 🔥 NUMÉRO QUI DÉFILE - TAILLE AUGMENTÉE */}
                                {displayedNumber && (
                                    <motion.div
                                        key={displayedNumber}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-center"
                                    >
                                        <div className="text-5xl sm:text-8xl font-bold text-purple-600 bg-white rounded-2xl p-6 sm:p-12 border-4 border-purple-300 shadow-2xl mb-4 mx-auto max-w-md">
                                            #{displayedNumber}
                                        </div>
                                        <p className="text-lg sm:text-xl text-purple-600 font-medium">
                                            Numéro en cours de sélection...
                                        </p>
                                    </motion.div>
                                )}

                                {/* Animation de chargement pendant le tirage */}
                                {!displayedNumber && (
                                    <div className="text-center py-8">
                                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
                                        <p className="text-purple-600">Préparation du tirage...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Messages du tirage */}
                        <div className="mt-6 space-y-2 max-h-32 overflow-y-auto">
                            {drawMessages.map((message, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 bg-white rounded-lg border border-purple-200"
                                >
                                    <p className="text-sm text-purple-700">{message}</p>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Section Résultats du tirage - VISIBLE APRÈS LE TIRAGE */}
            {!isDrawing && (showWinner || liveDrawData) && (
                <>
                    <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-2xl">
                        <CardHeader className="px-3 sm:px-6 py-4">
                            <CardTitle className="text-lg sm:text-xl text-green-700 text-center">
                                # RÉSULTATS DU TIRAGE
                            </CardTitle>
                            <CardDescription className="text-green-600 text-center">
                                Le gagnant a été sélectionné ! Félicitations au heureux élu.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6 pb-6">
                            {/* Ligne de séparation */}
                            <div className="border-t border-green-300 my-4"></div>

                            <div className="text-center space-y-6">
                                {/* Titre FÉLICITATIONS */}
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-green-800 mb-2">
                                        <strong>FÉLICITATIONS !</strong>
                                    </h3>
                                </div>

                                {/* Ticket gagnant */}
                                <div>
                                    <p className="text-lg sm:text-xl text-green-700 mb-3">Ticket gagnant :</p>
                                    <div className="text-4xl sm:text-6xl font-bold text-green-900 bg-white rounded-xl p-4 sm:p-6 mx-auto max-w-xs shadow-2xl border-4 border-green-300">
                                        #{winnerTicket?.ticket_number || liveDrawData?.ticket_number}
                                    </div>
                                </div>

                                {/* Gagnant */}
                                <div>
                                    <p className="text-lg sm:text-xl text-green-700 mb-2">Gagnant :</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-green-900">
                                        {winnerTicket?.profiles?.full_name || 
                                         winnerTicket?.profiles?.username || 
                                         liveDrawData?.profiles?.full_name || 
                                         liveDrawData?.profiles?.username || 
                                         'Participant'}
                                    </p>
                                </div>

                                {/* Badge Grand Gagnant */}
                                <div className="flex justify-center items-center gap-2">
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    </div>
                                    <Badge variant="secondary" className="text-base sm:text-lg py-2 sm:py-3 px-4 sm:px-6 bg-green-500 text-white border-0 shadow-lg">
                                        Grand Gagnant
                                    </Badge>
                                </div>

                                {/* Bouton pour voir le classement */}
                                {participantRankings.length > 0 && (
                                    <div className="mt-6">
                                        <Button
                                            onClick={() => setShowRankings(!showRankings)}
                                            className={`w-full ${
                                                showRankings 
                                                    ? 'bg-gradient-to-r from-purple-600 to-purple-800' 
                                                    : 'bg-gradient-to-r from-indigo-600 to-purple-700'
                                            } text-white border-0 font-bold py-3`}
                                        >
                                            <Medal className="w-5 h-5 mr-2" />
                                            {showRankings ? 'MASQUER LE CLASSEMENT' : 'VOIR LE CLASSEMENT COMPLET'}
                                        </Button>
                                    </div>
                                )}

                                {/* Message spécial si c'est l'utilisateur */}
                                {isUserWinner && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="mt-4 p-4 bg-red-500 text-white rounded-lg font-bold text-lg shadow-lg"
                                    >
                                        🎊 C'EST VOUS ! FÉLICITATIONS ! 🎊
                                    </motion.div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Affichage du classement */}
                    {showRankings && <RankingsDisplay />}
                </>
            )}

            {/* Mes tickets */}
            {userTickets.length > 0 && (
                <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
                    <CardHeader className="px-3 sm:px-6 py-3">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            Mes Tickets ({userTickets.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pt-0">
                        <div className="flex flex-wrap gap-1 sm:gap-2 mb-4">
                            {userTickets.map((ticket, index) => (
                                <div
                                    key={ticket.id}
                                    className={`relative p-2 sm:p-3 rounded-lg border-2 font-bold text-base sm:text-lg min-w-[60px] sm:min-w-[80px] text-center ${
                                        showWinner && (winnerTicket?.ticket_number === ticket.number || liveDrawData?.ticket_number === ticket.number.toString())
                                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-600 shadow-lg animate-pulse'
                                            : 'bg-white border-blue-300 text-blue-700'
                                    }`}
                                >
                                    #{ticket.number}
                                    {showWinner && (winnerTicket?.ticket_number === ticket.number || liveDrawData?.ticket_number === ticket.number.toString()) && (
                                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full p-1 text-xs animate-bounce">
                                            🎊 GAGNANT
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {showWinner && isUserWinner && (
                            <div className="p-3 sm:p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg text-white text-center">
                                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                                <h3 className="text-lg sm:text-xl font-bold">🎉 FÉLICITATIONS ! 🎉</h3>
                                <p className="text-base sm:text-lg">Vous avez gagné le tirage !</p>
                                <p className="text-sm mt-2">Le ticket #{winnerTicket?.ticket_number || liveDrawData?.ticket_number} est le vôtre !</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Contrôles du tirage pour l'organisateur SEULEMENT */}
            {isOrganizer && (
                <Card className="border-2 border-yellow-500 bg-gradient-to-r from-yellow-900/30 to-amber-900/30">
                    <CardHeader className="px-3 sm:px-6 py-3">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                            Contrôles du Tirage
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <Button
                                onClick={conductDraw}
                                disabled={loading || isDrawing || !isGoalReached || availableTickets.length === 0}
                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold border-2 border-emerald-400 text-sm sm:text-base"
                                size="lg"
                            >
                                {isDrawing ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                {isDrawing ? 'Tirage en cours...' : 'Lancer le tirage'}
                            </Button>
                        </div>

                        {!isGoalReached && (
                            <div className="p-2 sm:p-3 bg-orange-900/50 border border-orange-600 rounded-lg">
                                <div className="flex items-center gap-2 text-orange-300">
                                    <AlertCircle className="w-4 h-4" />
                                    <p className="text-xs sm:text-sm">
                                        <strong>Objectif non atteint:</strong> Le tirage nécessite {minTicketsRequired} tickets minimum.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Historique des tirages */}
            {drawHistory.length > 0 && (
                <Card>
                    <CardHeader className="px-3 sm:px-6 py-3">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                            Historique des Tirages
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <div className="space-y-2 sm:space-y-3">
                            {drawHistory.map((draw) => (
                                <div key={draw.id} className="flex items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <span className="text-green-700 font-bold text-xs sm:text-sm">#{draw.ticket_number}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-green-800 text-sm sm:text-base">
                                                {draw.profiles?.full_name || draw.profiles?.username || 'Gagnant'}
                                            </p>
                                            <p className="text-xs sm:text-sm text-green-600">
                                                {draw.prize_description || 'Lot principal'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-white text-xs">
                                        {new Date(draw.created_at).toLocaleDateString('fr-FR')}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default RaffleDrawSystem;