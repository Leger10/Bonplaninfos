import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Sparkles, X, Shuffle, Loader2, Star } from 'lucide-react';

const Podium = ({ winners }) => {
  if (!winners || winners.length === 0) return null;
  const first = winners.find(w => w.rank === 1);
  const second = winners.find(w => w.rank === 2);
  const third = winners.find(w => w.rank === 3);

  return (
    <div className="flex justify-center items-end gap-2 sm:gap-4 my-8 min-h-[250px]">
      {/* 2nd Place */}
      {second && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: '140px', opacity: 1 }} 
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-col items-center w-24 sm:w-32"
        >
          <div className="mb-2 text-center">
            {second.profiles?.avatar_url ? (
              <img src={second.profiles.avatar_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-gray-300 object-cover" />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-700 text-xl">
                {second.profiles?.full_name?.charAt(0)}
              </div>
            )}
            <p className="text-xs sm:text-sm text-white font-bold mt-1 truncate max-w-[100px]">{second.profiles?.full_name}</p>
            <div className="text-[10px] text-gray-300">Ticket #{second.ticket_number}</div>
          </div>
          <div className="w-full h-full bg-gradient-to-t from-gray-700 to-gray-500 rounded-t-lg flex flex-col items-center justify-end p-2 border-t-4 border-gray-300 shadow-[0_0_15px_rgba(192,192,192,0.3)]">
            <span className="text-3xl font-bold text-gray-200">2</span>
          </div>
        </motion.div>
      )}

      {/* 1st Place */}
      {first && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: '180px', opacity: 1 }} 
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-col items-center w-28 sm:w-40 z-10"
        >
          <div className="mb-2 text-center relative">
            <Crown className="w-8 h-8 text-yellow-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" />
            {first.profiles?.avatar_url ? (
              <img src={first.profiles.avatar_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-yellow-400 object-cover shadow-lg" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-yellow-900 text-2xl shadow-lg">
                {first.profiles?.full_name?.charAt(0)}
              </div>
            )}
            <p className="text-sm sm:text-base text-yellow-300 font-bold mt-1 truncate max-w-[120px]">{first.profiles?.full_name}</p>
            <div className="text-xs text-yellow-200">Ticket #{first.ticket_number}</div>
          </div>
          <div className="w-full h-full bg-gradient-to-t from-yellow-700 to-yellow-500 rounded-t-lg flex flex-col items-center justify-end p-2 border-t-4 border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.5)]">
            <span className="text-5xl font-bold text-yellow-100">1</span>
          </div>
        </motion.div>
      )}

      {/* 3rd Place */}
      {third && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }} 
          animate={{ height: '110px', opacity: 1 }} 
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col items-center w-24 sm:w-32"
        >
          <div className="mb-2 text-center">
            {third.profiles?.avatar_url ? (
              <img src={third.profiles.avatar_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-amber-600 object-cover" />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-600 flex items-center justify-center font-bold text-amber-100 text-xl">
                {third.profiles?.full_name?.charAt(0)}
              </div>
            )}
            <p className="text-xs sm:text-sm text-white font-bold mt-1 truncate max-w-[100px]">{third.profiles?.full_name}</p>
            <div className="text-[10px] text-amber-300">Ticket #{third.ticket_number}</div>
          </div>
          <div className="w-full h-full bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-lg flex flex-col items-center justify-end p-2 border-t-4 border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.3)]">
            <span className="text-3xl font-bold text-amber-200">3</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const LiveDrawBroadcast = ({ raffleId, onClose }) => {
  const { user } = useAuth();
  const [currentNumbers, setCurrentNumbers] = useState([]);
  const [showRankings, setShowRankings] = useState(false);
  const [drawMessages, setDrawMessages] = useState(["Initialisation du tirage..."]);
  const [rankings, setRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);
  
  // Animation pour le défilement des numéros - CORRECTION 1
  useEffect(() => {
    if (showRankings) return;
    
    const interval = setInterval(() => {
      // Générer 5 numéros aléatoires pour l'animation
      const newNumbers = Array.from({ length: 5 }, () => 
        Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      );
      setCurrentNumbers(newNumbers);
    }, 80);
    
    return () => clearInterval(interval);
  }, [showRankings]);

  // Messages animation
  useEffect(() => {
    if (showRankings) return;
    const messages = [
        "🎲 Mélange des tickets...",
        "✨ Vérification des participations...",
        "🚀 Calcul des probabilités...",
        "🤞 Le moment de vérité approche...",
        "🔮 Sélection des gagnants..."
    ];
    let i = 0;
    const interval = setInterval(() => {
        if (i < messages.length) {
            setDrawMessages(prev => [...prev.slice(-2), messages[i]]);
            i++;
        }
    }, 1500);
    return () => clearInterval(interval);
  }, [showRankings]);

  // Fetch final rankings when winner is announced - CORRECTION 2
  const fetchRankings = useCallback(async () => {
    setLoadingRankings(true);
    try {
        // CORRECTION 2: Récupérer uniquement le meilleur ticket par participant
        const { data: allTickets, error } = await supabase
            .from('raffle_tickets')
            .select(`
                rank,
                ticket_number,
                user_id,
                profiles:user_id (
                    id,
                    full_name,
                    username,
                    avatar_url
                )
            `)
            .eq('raffle_event_id', raffleId)
            .not('rank', 'is', null)
            .order('rank', { ascending: true });

        if (error) throw error;

        // CORRECTION 2: Filtrer pour garder uniquement le meilleur rang par participant
        const uniqueParticipants = new Map();
        
        allTickets?.forEach(ticket => {
            const userId = ticket.user_id;
            const currentBest = uniqueParticipants.get(userId);
            
            // Si le participant n'est pas encore dans la map, ou si ce ticket a un meilleur rang (plus petit nombre)
            if (!currentBest || ticket.rank < currentBest.rank) {
                uniqueParticipants.set(userId, ticket);
            }
        });

        // Convertir la map en tableau et trier par rang
        const uniqueRankings = Array.from(uniqueParticipants.values())
            .sort((a, b) => a.rank - b.rank)
            .map((ticket, index) => ({
                ...ticket,
                rank: index + 1 // Réindexer les rangs pour qu'ils soient continus
            }));

        setRankings(uniqueRankings);
        setShowRankings(true);
    } catch (err) {
        console.error("Error fetching rankings", err);
    } finally {
        setLoadingRankings(false);
    }
  }, [raffleId]);

  // Listen for draw completion
  useEffect(() => {
    // Check initially
    const checkStatus = async () => {
        const { data } = await supabase.from('raffle_events').select('status').eq('id', raffleId).single();
        if (data?.status === 'completed') {
            fetchRankings();
        }
    };
    checkStatus();

    const channel = supabase
      .channel(`draw-listener-${raffleId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'raffle_events', filter: `id=eq.${raffleId}` }, 
      (payload) => {
        if (payload.new.status === 'completed') {
            setTimeout(fetchRankings, 2000); // Delay for suspense
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [raffleId, fetchRankings]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl relative"
      >
        <Button onClick={onClose} variant="ghost" className="absolute -top-12 right-0 text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>

        <Card className="border-4 border-yellow-500 bg-gradient-to-br from-indigo-900 to-black text-white shadow-2xl overflow-hidden min-h-[500px]">
          <div className="text-center py-6 border-b border-white/10 relative">
             <Sparkles className="absolute top-4 left-4 text-yellow-400 w-6 h-6 animate-spin-slow" />
             <Sparkles className="absolute top-4 right-4 text-yellow-400 w-6 h-6 animate-spin-slow" />
             <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 uppercase tracking-widest">
                {showRankings ? "RÉSULTATS OFFICIELS" : "TIRAGE EN COURS"}
             </h2>
          </div>

          <CardContent className="p-6">
            {!showRankings ? (
                <div className="flex flex-col items-center justify-center space-y-8 py-10">
                    {/* CORRECTION 1: Afficher plusieurs numéros qui défilent */}
                    <div className="flex flex-wrap gap-4 justify-center items-center">
                      {currentNumbers.map((num, index) => (
                        <motion.div
                          key={index}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="w-20 h-24 bg-black/50 rounded-xl border-2 border-yellow-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                        >
                          <span className="text-4xl font-mono font-bold text-yellow-400 tabular-nums">
                            {num}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    
                    <div className="h-16 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={drawMessages[drawMessages.length-1]}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-xl text-blue-200 text-center"
                            >
                                {drawMessages[drawMessages.length-1]}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                    <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
                    <p className="text-sm text-gray-400 mt-4">
                      Les numéros défilent aléatoirement pendant que le système sélectionne les gagnants...
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {loadingRankings ? <Loader2 className="w-10 h-10 mx-auto animate-spin" /> : (
                        <>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-yellow-400">Félicitations aux gagnants !</h3>
                                <p className="text-gray-300">Voici le classement officiel certifié.</p>
                                <p className="text-sm text-gray-400">
                                  <Star className="w-4 h-4 inline mr-1" />
                                  Chaque participant n'apparaît qu'une seule fois avec son meilleur ticket gagnant.
                                </p>
                            </div>
                            
                            <Podium winners={rankings} />

                            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden mt-6">
                                <div className="p-3 bg-black/20 font-bold text-gray-400 text-sm uppercase flex justify-between px-6">
                                    <span>Position</span>
                                    <span>Participant</span>
                                    <span>Ticket</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    {rankings.map((entry) => (
                                        <div 
                                            key={`${entry.user_id}-${entry.rank}`} 
                                            className={`flex items-center justify-between p-3 px-6 border-b border-white/5 transition-colors ${
                                                user && entry.profiles?.id === user.id ? 'bg-yellow-500/20 border-yellow-500/50' : 'hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <Badge className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                                    entry.rank <= 3 ? 'bg-yellow-500 text-black' : 'bg-gray-700'
                                                }`}>
                                                    {entry.rank}
                                                </Badge>
                                                <div className="flex items-center gap-3">
                                                    {entry.profiles?.avatar_url ? (
                                                        <img src={entry.profiles.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs">
                                                            {entry.profiles?.full_name?.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span className={entry.rank <= 3 ? "text-yellow-200 font-bold" : "text-gray-300"}>
                                                        {entry.profiles?.full_name || "Anonyme"}
                                                        {user && entry.profiles?.id === user.id && <span className="ml-2 text-xs text-yellow-500">(Moi)</span>}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-mono text-blue-300">#{entry.ticket_number}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const RaffleDrawSystem = ({ raffleData, eventId, isOrganizer, onDrawComplete }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLiveBroadcast, setIsLiveBroadcast] = useState(false);
    
    // Auto-open if live
    useEffect(() => {
        if (raffleData?.status === 'completed') {
            // Optional: Auto open for first time view could be implemented here with localStorage
        }
    }, [raffleData]);

    const handleLaunchDraw = async () => {
        if (!isOrganizer) return;
        
        try {
            // Trigger the secure draw function
            const { data, error } = await supabase.rpc('conduct_raffle_draw', { p_raffle_event_id: raffleData.id });
            
            if (error) throw error;
            
            if (data.success) {
                toast({ 
                    title: "Tirage lancé !", 
                    description: "Les résultats sont en cours de génération. Les participants verront le défilement des numéros.",
                    duration: 5000 
                });
                setIsLiveBroadcast(true); // Open the view immediately for the organizer
                if (onDrawComplete) onDrawComplete();
            } else {
                toast({ title: "Attention", description: data.message, variant: "warning" });
            }
        } catch (error) {
            console.error("Draw error:", error);
            toast({ title: "Erreur", description: "Impossible de lancer le tirage.", variant: "destructive" });
        }
    };

    return (
        <>
            {isLiveBroadcast && <LiveDrawBroadcast raffleId={raffleData.id} onClose={() => setIsLiveBroadcast(false)} />}
            
            {isOrganizer ? (
                <Card className="border-2 border-yellow-500 bg-gradient-to-r from-orange-50 to-yellow-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-orange-600" />
                            Zone Organisateur
                        </CardTitle>
                        <CardDescription>Contrôle du tirage au sort</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded border text-center">
                                <div className="text-xs text-gray-500 uppercase">Tickets Vendus</div>
                                <div className="text-2xl font-bold text-blue-600">{raffleData.tickets_sold || 0}</div>
                            </div>
                            <div className="bg-white p-3 rounded border text-center">
                                <div className="text-xs text-gray-500 uppercase">Revenu Est.</div>
                                <div className="text-xl font-bold text-green-600">
                                    {(raffleData.tickets_sold * (raffleData.calculated_price_pi || 0))} π
                                </div>
                                <div className="text-[10px] text-gray-400">
                                    ~{(raffleData.tickets_sold * (raffleData.calculated_price_pi || 0) * 10).toLocaleString()} CFA
                                </div>
                            </div>
                        </div>

                        {raffleData.status !== 'completed' ? (
                            <Button 
                                onClick={handleLaunchDraw} 
                                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg"
                                disabled={raffleData.tickets_sold === 0}
                            >
                                <Shuffle className="w-5 h-5 mr-2" />
                                LANCER LE TIRAGE
                            </Button>
                        ) : (
                            <Button 
                                onClick={() => setIsLiveBroadcast(true)} 
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                            >
                                <Trophy className="w-5 h-5 mr-2" />
                                VOIR LES RÉSULTATS
                            </Button>
                        )}
                        
                        {raffleData.tickets_sold === 0 && (
                            <p className="text-center text-xs text-red-500">
                                Au moins 1 ticket vendu est requis pour lancer le tirage.
                            </p>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    {raffleData.status === 'completed' && (
                        <Card className="border-green-200 bg-green-50 animate-pulse-slow">
                            <CardContent className="p-4 text-center">
                                <h3 className="font-bold text-green-800 mb-2">🎉 Le tirage est terminé !</h3>
                                <Button onClick={() => setIsLiveBroadcast(true)} className="bg-green-600 hover:bg-green-700 text-white w-full">
                                    <Trophy className="w-4 h-4 mr-2" />
                                    Voir le classement complet
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </>
    );
};

export default RaffleDrawSystem;