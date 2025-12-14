import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Sparkles, X, Loader2, Play, RefreshCw, StopCircle, Clock, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Sub-Components ---

const PodiumStep = ({ winner, place, delay }) => {
  const isFirst = place === 1;
  const isSecond = place === 2;
  const isThird = place === 3;
  
  // Responsive heights for podium steps
  const height = isFirst ? 'h-40 md:h-64' : isSecond ? 'h-32 md:h-48' : 'h-24 md:h-32';
  
  const color = isFirst ? 'bg-yellow-400' : isSecond ? 'bg-gray-300' : 'bg-amber-600';
  const borderColor = isFirst ? 'border-yellow-600' : isSecond ? 'border-gray-400' : 'border-amber-800';
  const textColor = isFirst ? 'text-yellow-900' : isSecond ? 'text-gray-800' : 'text-amber-100';
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.8, type: 'spring' }}
      className="flex flex-col items-center justify-end z-10"
    >
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.5, type: 'spring' }}
        className="mb-2 md:mb-4 flex flex-col items-center"
      >
        <div className="relative">
          {isFirst && <Crown className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 text-yellow-400 animate-bounce" />}
          {winner.profiles?.avatar_url ? (
            <img 
              src={winner.profiles.avatar_url} 
              className={`w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-4 ${borderColor} object-cover shadow-lg bg-gray-800`}
              alt={winner.profiles?.full_name}
            />
          ) : (
            <div className={`w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-4 ${borderColor} bg-gray-700 flex items-center justify-center text-sm md:text-xl font-bold text-white shadow-lg`}>
              {winner.profiles?.full_name?.charAt(0) || '?'}
            </div>
          )}
        </div>
        <span className="mt-2 font-bold text-white text-xs md:text-base max-w-[80px] md:max-w-[120px] truncate text-center leading-tight">
          {winner.profiles?.full_name || 'Inconnu'}
        </span>
        <Badge variant="outline" className="mt-1 bg-black/50 text-white border-white/20 text-[10px] md:text-xs px-1 md:px-2 h-5 md:h-auto">
          #{winner.ticket_number}
        </Badge>
      </motion.div>
      
      <div className={`${height} w-20 md:w-32 ${color} rounded-t-lg border-t-4 ${borderColor} flex items-start justify-center pt-2 md:pt-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]`}>
        <span className={`text-3xl md:text-5xl font-black ${textColor}`}>{place}</span>
      </div>
    </motion.div>
  );
};

const WinnerList = ({ winners }) => {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white/5 rounded-xl border border-white/10 overflow-hidden mt-6 md:mt-8 backdrop-blur-sm">
      <div className="p-3 md:p-4 bg-black/40 font-bold text-gray-300 text-xs md:text-sm uppercase flex justify-between px-4 md:px-6 border-b border-white/10">
        <span>Classement</span>
        <span>Participant</span>
        <span>Ticket Gagnant</span>
      </div>
      <div className="max-h-[40vh] md:max-h-60 overflow-y-auto custom-scrollbar">
        {winners.map((entry) => (
          <motion.div 
            key={entry.rank}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5 + (entry.rank * 0.1) }}
            className="flex items-center justify-between p-2 md:p-3 px-4 md:px-6 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 md:gap-4">
              <Badge variant="outline" className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold border-white/30 text-white bg-white/10 p-0">
                {entry.rank}
              </Badge>
              <div className="flex flex-col">
                <span className="text-white text-sm md:text-base font-medium truncate max-w-[120px] md:max-w-none">{entry.profiles?.full_name || "Utilisateur"}</span>
                <span className="text-[10px] md:text-xs text-gray-400 hidden xs:inline">{entry.profiles?.email?.split('@')[0]}***</span>
              </div>
            </div>
            <span className="font-mono text-yellow-400 font-bold text-sm md:text-base">#{entry.ticket_number}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const LiveDrawOverlay = ({ raffleId, isOrganizer, onClose, phase, onPhaseChange }) => {
  const [scrollingNumber, setScrollingNumber] = useState(0);
  const [winners, setWinners] = useState([]);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const animationRef = useRef(null);
  
  // --- Animation Logic based on Phase ---
  useEffect(() => {
    // If we are finished or waiting, stop animation
    if (phase === 'finished' || phase === 'waiting') {
      if (animationRef.current) clearTimeout(animationRef.current);
      return;
    }

    // Speeds for different rounds
    let speed = 50; 
    if (phase === 'round1') speed = 30; // Fast
    if (phase === 'round2') speed = 80; // Medium
    if (phase === 'round3') speed = 150; // Slow/Tension

    const animate = () => {
      setScrollingNumber(Math.floor(Math.random() * 9999) + 1);
      animationRef.current = setTimeout(() => {
        requestAnimationFrame(animate);
      }, speed);
    };

    animate();

    return () => clearTimeout(animationRef.current);
  }, [phase]);

  // --- Auto Phase Transition (Organizer Only) ---
  useEffect(() => {
    if (!isOrganizer) return;

    let timer;
    if (phase === 'round1') {
      timer = setTimeout(() => onPhaseChange('round2'), 3000);
    } else if (phase === 'round2') {
      timer = setTimeout(() => onPhaseChange('round3'), 3000);
    } else if (phase === 'round3') {
      timer = setTimeout(() => onPhaseChange('finished'), 4000);
    }

    return () => clearTimeout(timer);
  }, [phase, isOrganizer, onPhaseChange]);

  // --- Fetch Winners on Finish ---
  useEffect(() => {
    if (phase === 'finished') {
      const fetchWinners = async () => {
        setLoadingWinners(true);
        
        // Fire confetti
        const duration = 3000;
        const end = Date.now() + duration;
        (function frame() {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFD700', '#FFA500', '#ffffff']
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FFD700', '#FFA500', '#ffffff']
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        }());

        // Fetch winners from DB
        const { data, error } = await supabase
          .from('raffle_tickets')
          .select('*, profiles:user_id(full_name, avatar_url, email)')
          .eq('raffle_event_id', raffleId)
          .not('rank', 'is', null)
          .order('rank', { ascending: true });
        
        if (error) console.error("Error fetching winners:", error);
        setWinners(data || []);
        setLoadingWinners(false);
      };
      
      fetchWinners();
    }
  }, [phase, raffleId]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="min-h-full flex flex-col items-center justify-center p-4 py-12 md:py-8">
        <div className="absolute top-4 right-4 z-50">
          <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="w-full max-w-5xl flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 animate-gradient-x tracking-wider uppercase drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
              {phase === 'finished' ? "RÉSULTATS" : "TIRAGE EN COURS"}
            </h2>
            <p className="text-blue-200 mt-2 text-sm md:text-lg font-light tracking-widest uppercase">
              {phase === 'waiting' && "En attente du lancement..."}
              {phase === 'round1' && "Tour 1/3 : Mélange des tickets..."}
              {phase === 'round2' && "Tour 2/3 : Sélection des finalistes..."}
              {phase === 'round3' && "Tour 3/3 : Le sort en est jeté..."}
              {phase === 'finished' && "Voici les grands gagnants !"}
            </p>
          </div>

          {/* Dynamic Content */}
          <div className="w-full flex flex-col items-center justify-center">
            {phase !== 'finished' ? (
              <motion.div 
                key="scroller"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="relative my-8"
              >
                <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="relative bg-black/60 border-4 border-yellow-500 rounded-2xl px-8 md:px-16 py-8 md:py-12 min-w-[280px] md:min-w-[320px] text-center backdrop-blur-md shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                  <span className="text-6xl md:text-9xl font-mono font-bold text-white tabular-nums tracking-tighter block mb-4">
                    {scrollingNumber}
                  </span>
                  <div className="flex justify-center gap-3">
                    <div className={`h-2 w-2 md:h-3 md:w-3 rounded-full transition-all duration-300 ${phase === 'round1' ? 'bg-yellow-400 scale-125' : 'bg-gray-700'}`} />
                    <div className={`h-2 w-2 md:h-3 md:w-3 rounded-full transition-all duration-300 ${phase === 'round2' ? 'bg-yellow-400 scale-125' : 'bg-gray-700'}`} />
                    <div className={`h-2 w-2 md:h-3 md:w-3 rounded-full transition-all duration-300 ${phase === 'round3' ? 'bg-yellow-400 scale-125' : 'bg-gray-700'}`} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="w-full">
                {loadingWinners ? (
                  <div className="flex flex-col items-center my-12">
                    <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mb-4" />
                    <p className="text-white text-xl">Récupération des gagnants...</p>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
                    <div className="flex flex-wrap justify-center items-end gap-2 md:gap-8 mb-6 md:mb-8 w-full">
                      {/* 2nd Place */}
                      {winners[1] && <PodiumStep winner={winners[1]} place={2} delay={0.5} />}
                      {/* 1st Place */}
                      {winners[0] && <PodiumStep winner={winners[0]} place={1} delay={0.2} />}
                      {/* 3rd Place */}
                      {winners[2] && <PodiumStep winner={winners[2]} place={3} delay={0.8} />}
                    </div>
                    
                    {winners.length > 3 && <WinnerList winners={winners.slice(3)} />}
                    
                    {winners.length === 0 && (
                        <p className="text-white text-lg mt-8">Aucun gagnant trouvé.</p>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Interface Component ---

const RaffleDrawSystem = ({ raffleData, eventId, isOrganizer, onDrawComplete }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showEarlyLaunchConfirm, setShowEarlyLaunchConfirm] = useState(false);
  
  // Initialize state. If raffle is already completed when loading, set to finished.
  const [overlayState, setOverlayState] = useState({
    isOpen: false,
    phase: raffleData.status === 'completed' ? 'finished' : 'waiting'
  });

  const isEarly = raffleData.draw_date && new Date(raffleData.draw_date) > new Date();

  // Handle phase changes and broadcasting
  const handlePhaseChange = async (newPhase) => {
    // 1. Update local state immediately
    setOverlayState(prev => ({ ...prev, phase: newPhase }));
    
    // 2. Broadcast to other users
    await supabase.channel(`raffle_draw_${raffleData.id}`).send({
      type: 'broadcast',
      event: 'DRAW_UPDATE',
      payload: { phase: newPhase }
    });
  };

  const executeLaunch = async () => {
    setIsProcessing(true);
    setShowEarlyLaunchConfirm(false);

    try {
      // 1. Calculate winners securely on backend
      const { data, error } = await supabase.rpc('conduct_unique_raffle_draw', { 
        p_raffle_event_id: raffleData.id 
      });

      if (error) throw error;

      if (data.success) {
        // 2. Start the visual sequence locally AND broadcast start
        setOverlayState({ isOpen: true, phase: 'round1' });
        
        await supabase.channel(`raffle_draw_${raffleData.id}`).send({
            type: 'broadcast',
            event: 'DRAW_UPDATE',
            payload: { phase: 'round1' }
        });

        toast({ title: "Tirage lancé !", className: "bg-green-600 text-white" });
      } else {
        toast({ title: "Impossible", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("Draw error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLaunchClick = () => {
    if (isEarly) {
      setShowEarlyLaunchConfirm(true);
    } else {
      executeLaunch();
    }
  };

  const handleResetDraw = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('reset_raffle_draw', { p_raffle_event_id: raffleData.id });
      if (error) throw error;
      
      // Reset State and Broadcast reset
      setOverlayState({ isOpen: false, phase: 'waiting' });
      
      await supabase.channel(`raffle_draw_${raffleData.id}`).send({
        type: 'broadcast',
        event: 'DRAW_UPDATE',
        payload: { phase: 'waiting' }
      });

      toast({ title: "Tirage réinitialisé", description: "Vous pouvez lancer un nouveau tirage." });
      if (onDrawComplete) onDrawComplete(); // Refresh data immediately for reset
    } catch (err) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setShowResetConfirm(false);
    }
  };

  // Listener for Participants (and Organizer sync)
  useEffect(() => {
    const channel = supabase.channel(`raffle_draw_${raffleData.id}`)
      .on('broadcast', { event: 'DRAW_UPDATE' }, (payload) => {
        if (payload.payload && payload.payload.phase) {
          const newPhase = payload.payload.phase;
          
          if (newPhase === 'waiting') {
             setOverlayState({ isOpen: false, phase: 'waiting' });
          } else {
             // For any other phase (round1, 2, 3, finished), force open the overlay
             setOverlayState(prev => ({ 
                 isOpen: true, 
                 phase: newPhase 
             }));
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [raffleData.id]);

  // Handle data refresh ONLY when draw is finished
  useEffect(() => {
    if (overlayState.phase === 'finished' && isOrganizer) {
        // Trigger parent refresh to update UI state to "Results Available"
        if (onDrawComplete) onDrawComplete();
    }
  }, [overlayState.phase, isOrganizer, onDrawComplete]);

  return (
    <>
      <AnimatePresence>
        {overlayState.isOpen && (
          <LiveDrawOverlay 
            raffleId={raffleData.id} 
            isOrganizer={isOrganizer} 
            phase={overlayState.phase}
            onPhaseChange={handlePhaseChange}
            onClose={() => setOverlayState(prev => ({ ...prev, isOpen: false }))} 
          />
        )}
      </AnimatePresence>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le tirage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Attention : Cela va annuler le tirage précédent et effacer les résultats actuels. Vous pourrez lancer un nouveau tirage. Cette action est utile si vous voulez refaire le tirage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetDraw} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEarlyLaunchConfirm} onOpenChange={setShowEarlyLaunchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" /> Tirage Anticipé
            </AlertDialogTitle>
            <AlertDialogDescription>
              La date officielle du tirage est prévue le <strong>{new Date(raffleData.draw_date).toLocaleDateString()}</strong>.
              <br/><br/>
              Voulez-vous vraiment lancer le tirage maintenant ? Cela clôturera la vente de tickets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeLaunch} className="bg-amber-600 hover:bg-amber-700 text-white">
              Oui, lancer maintenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-2 border-yellow-500 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:to-yellow-900/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Trophy className="w-32 h-32 text-yellow-600" />
        </div>
        
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Système de Tirage au Sort
          </CardTitle>
          <CardDescription>
            {raffleData.tickets_sold} tickets vendus • {raffleData.status === 'completed' ? 'Tirage terminé' : 'En attente'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isOrganizer ? (
            <div className="flex flex-col gap-3">
              {raffleData.status !== 'completed' ? (
                <div className="space-y-2">
                  <Button 
                    onClick={handleLaunchClick} 
                    disabled={raffleData.tickets_sold === 0 || isProcessing}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg transition-all hover:scale-[1.02]"
                  >
                    {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <Play className="mr-2 w-5 h-5 fill-current" />}
                    {isEarly ? "LANCER MAINTENANT (ANTICIPÉ)" : "LANCER LE TIRAGE"}
                  </Button>
                  {isEarly && (
                    <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> Date prévue : {new Date(raffleData.draw_date).toLocaleDateString()} (Vous pouvez anticiper)
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    onClick={() => setOverlayState({ isOpen: true, phase: 'finished' })} 
                    className="h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Trophy className="mr-2 w-4 h-4" /> VOIR RÉSULTATS
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowResetConfirm(true)}
                    className="h-12 text-destructive border-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="mr-2 w-4 h-4" /> RELANCER LE TIRAGE
                  </Button>
                </div>
              )}
              
              {raffleData.tickets_sold === 0 && (
                <p className="text-center text-xs text-red-500 bg-red-50 p-2 rounded">
                  <StopCircle className="inline w-3 h-3 mr-1" />
                  Aucun ticket vendu. Le tirage est impossible.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              {raffleData.status === 'completed' ? (
                <Button 
                  onClick={() => setOverlayState({ isOpen: true, phase: 'finished' })} 
                  className="w-full h-12 font-bold bg-green-600 hover:bg-green-700 text-white animate-pulse"
                >
                  <Trophy className="mr-2 w-5 h-5" /> VOIR LES GAGNANTS
                </Button>
              ) : (
                <div className="p-6 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-xl border border-dashed border-yellow-300">
                  <p className="text-yellow-700 dark:text-yellow-400 font-medium flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    {raffleData.draw_date ? `Tirage prévu le ${new Date(raffleData.draw_date).toLocaleDateString()}` : "Tirage à venir..."}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default RaffleDrawSystem;