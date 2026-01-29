import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Vote, Coins, Plus, Minus, ShoppingCart, Trophy, Crown, Eye, BarChart3, UserCircle, Target, Share2, Filter, Lock, Printer, Award, Search, Calendar, Info, ChevronDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from "@/components/ui/input";
import WalletInfoModal from '@/components/WalletInfoModal';
import jsPDF from 'jspdf';

const Separator = ({ className = "", orientation = "horizontal", ...props }) => (
    <div className={`${orientation === "horizontal" ? "w-full h-[1px]" : "h-full w-[1px]"} bg-gray-700 ${className}`} {...props} />
);

// Service pour créer des transactions sécurisées
const TransactionService = {
  async createTransaction(transactionData) {
    try {
      // Validation des données obligatoires
      if (transactionData.amount_pi === undefined || transactionData.amount_pi === null) {
        throw new Error('amount_pi est requis pour une transaction');
      }

      if (!transactionData.user_id) {
        throw new Error('user_id est requis pour une transaction');
      }

      // Préparer les données avec des valeurs par défaut
      const safeTransactionData = {
        user_id: transactionData.user_id,
        event_id: transactionData.event_id || null,
        transaction_type: transactionData.transaction_type || 'unknown',
        amount_pi: Number(transactionData.amount_pi) || 0,
        amount_fcfa: transactionData.amount_fcfa !== undefined 
          ? Number(transactionData.amount_fcfa) 
          : Math.abs(Number(transactionData.amount_pi)) * 5,
        description: transactionData.description || '',
        status: transactionData.status || 'completed',
        payment_gateway_data: transactionData.payment_gateway_data || null,
        created_at: transactionData.created_at || new Date().toISOString(),
        completed_at: transactionData.completed_at || null,
        city: transactionData.city || null,
        region: transactionData.region || null,
        country: transactionData.country || null,
        metadata: transactionData.metadata || {},
        amount_coins: transactionData.amount_coins || Math.abs(Number(transactionData.amount_pi))
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(safeTransactionData)
        .select()
        .single();

      if (error) {
        console.error('Transaction creation error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('TransactionService.createTransaction error:', error);
      throw error;
    }
  },

  async createVoteTransaction(userId, eventId, voteCost, candidateId, options = {}) {
    const {
      voteType = 'vote_purchase',
      platformFeePercent = 5,
      description = 'Achat de vote'
    } = options;

    const platformFee = Math.ceil(voteCost * (platformFeePercent / 100));
    const netCost = voteCost - platformFee;

    return await this.createTransaction({
      user_id: userId,
      event_id: eventId,
      transaction_type: voteType,
      amount_pi: -voteCost,
      amount_fcfa: -voteCost * 5,
      description: `${description} - Candidat ID: ${candidateId}`,
      status: 'completed',
      metadata: {
        platform_fee: platformFee,
        fee_percent: platformFeePercent,
        net_cost: netCost,
        candidate_id: candidateId,
        source: 'vote',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const CountdownTimer = ({ endDate, onTimerEnd }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (!endDate) return;
            
            const now = new Date().getTime();
            const end = new Date(endDate).getTime();
            const distance = end - now;
            
            if (distance < 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
                if (onTimerEnd) onTimerEnd();
                return;
            }
            setTimeLeft({
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000),
                expired: false
            });
        };
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [endDate, onTimerEnd]);

    if (timeLeft.expired) return <div className="text-center py-4 bg-gradient-to-r from-red-900/50 to-red-800/30 border border-red-700/50 rounded-xl"><p className="text-red-300 font-bold text-lg">🎉 Le vote est terminé !</p></div>;

    return (
        <div className="text-center py-4 bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-700/30 rounded-xl">
            <h3 className="font-bold text-lg mb-3 flex items-center justify-center gap-2 text-blue-300"><Target className="w-5 h-5 text-blue-400" /> Temps restant</h3>
            <div className="flex justify-center gap-2">
                {[{ v: timeLeft.days, l: 'J' }, { v: timeLeft.hours, l: 'H' }, { v: timeLeft.minutes, l: 'M' }, { v: timeLeft.seconds, l: 'S' }].map((i, idx) => (
                    <div key={idx} className="bg-gradient-to-b from-blue-600 to-cyan-500 p-3 rounded-xl shadow-lg min-w-[60px]"><div className="text-2xl font-bold text-white">{i.v}</div><div className="text-xs text-white/80">{i.l}</div></div>
                ))}
            </div>
        </div>
    );
};

const CandidateCard = ({ candidate, totalVotes, votePrice, onVote, isFinished, isSelected, onSelect, event, rank, isClosed, eventSettings }) => {
    const [voteCount, setVoteCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showWalletInfo, setShowWalletInfo] = useState(false);
    const navigate = useNavigate();
    const [confirmation, setConfirmation] = useState({ isOpen: false, onConfirm: null });
    const { user } = useAuth();
    const [showDetails, setShowDetails] = useState(false);
    const [candidateVoteCount, setCandidateVoteCount] = useState(candidate.vote_count || 0);

    const votePercentage = totalVotes > 0 ? ((candidateVoteCount || 0) / totalVotes) * 100 : 0;
    const totalCostPi = voteCount * votePrice;

    const isVotingLocked = isFinished || isClosed;

    useEffect(() => { 
        setCandidateVoteCount(candidate.vote_count || 0); 
    }, [candidate.vote_count]);

    const handleVote = async () => {
        if (isVotingLocked) {
            toast({
                title: "Votes fermés",
                description: isFinished ? "Les votes sont terminés." : "Les ventes sont actuellement fermées.",
                variant: "destructive"
            });
            return;
        }
        
        setConfirmation({ isOpen: false, onConfirm: null });
        if (!user) { 
            navigate('/auth'); 
            return; 
        }
        
        setLoading(true);
        try {
            // Vérifier le solde de l'utilisateur
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('coin_balance')
                .eq('id', user.id)
                .single();
                
            if (userError) throw userError;

            if ((userData?.coin_balance || 0) < totalCostPi) {
                setShowWalletInfo(true);
                setLoading(false);
                return;
            }

            // Calculer les frais de plateforme (5%)
            const platformFeePercent = 5;
            const platformFee = Math.ceil(totalCostPi * (platformFeePercent / 100));
            const netAmount = totalCostPi - platformFee;

            // Débiter le solde utilisateur
            const newBalance = (userData.coin_balance || 0) - totalCostPi;
            const { error: debitError } = await supabase
                .from('profiles')
                .update({ coin_balance: newBalance })
                .eq('id', user.id);

            if (debitError) throw debitError;

            // Créer la transaction pour l'utilisateur
            await TransactionService.createVoteTransaction(
                user.id,
                event.id,
                totalCostPi,
                candidate.id,
                {
                    description: `Vote pour ${candidate.name}`
                }
            );

            // Vérifier si l'utilisateur a déjà voté pour ce candidat
            const { data: existingVote, error: checkError } = await supabase
                .from('user_votes')
                .select('vote_count, vote_cost_pi, net_to_organizer, fees')
                .eq('user_id', user.id)
                .eq('candidate_id', candidate.id)
                .eq('event_id', event.id)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking existing vote:', checkError);
            }

            // Calculer les totaux cumulatifs
            const existingVoteCount = existingVote?.vote_count || 0;
            const existingCost = existingVote?.vote_cost_pi || 0;
            const existingNet = existingVote?.net_to_organizer || 0;
            const existingFees = existingVote?.fees || 0;

            const totalVoteCount = existingVoteCount + voteCount;
            const totalCost = existingCost + totalCostPi;
            const totalNetAmount = existingNet + netAmount;
            const totalFees = existingFees + platformFee;

            // Mettre à jour ou insérer le vote (upsert pour éviter la contrainte unique)
            const { error: voteError } = await supabase
                .from('user_votes')
                .upsert({
                    user_id: user.id,
                    candidate_id: candidate.id,
                    event_id: event.id,
                    vote_count: totalVoteCount,
                    vote_cost_pi: totalCost,
                    vote_cost_fcfa: totalCost * 5,
                    net_to_organizer: totalNetAmount,
                    fees: totalFees,
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'event_id, candidate_id, user_id'
                });

            if (voteError) {
                console.error('Error creating/updating vote record:', voteError);
                throw voteError;
            }

            // Mettre à jour les votes du candidat (incrémenter)
            const newVoteCount = candidateVoteCount + voteCount;
            setCandidateVoteCount(newVoteCount);

            const { error: updateError } = await supabase
                .from('candidates')
                .update({ vote_count: newVoteCount })
                .eq('id', candidate.id);

            if (updateError) throw updateError;

            // Récupérer l'organisateur
            const { data: eventData } = await supabase
                .from('events')
                .select('organizer_id, title')
                .eq('id', event.id)
                .single();

            if (eventData?.organizer_id) {
                // Créditer l'organisateur (après frais)
                const { data: organizerProfile } = await supabase
                    .from('profiles')
                    .select('available_earnings')
                    .eq('id', eventData.organizer_id)
                    .single();

                if (organizerProfile) {
                    const newEarnings = (organizerProfile.available_earnings || 0) + netAmount;
                    
                    await supabase
                        .from('profiles')
                        .update({ 
                            available_earnings: newEarnings 
                        })
                        .eq('id', eventData.organizer_id);
                }

                // Enregistrer les gains de l'organisateur
                await supabase
                    .from('organizer_earnings')
                    .insert({
                        organizer_id: eventData.organizer_id,
                        event_id: event.id,
                        earnings_coins: netAmount,
                        transaction_type: 'vote',
                        fee_percent: platformFeePercent,
                        platform_fee: platformFee,
                        status: 'pending',
                        created_at: new Date().toISOString(),
                        description: `Gains de vote: ${candidate.name} - ${eventData.title} (${voteCount} voix)`
                    });

                // Créer une transaction pour les gains de l'organisateur
                await TransactionService.createTransaction({
                    user_id: eventData.organizer_id,
                    event_id: event.id,
                    transaction_type: 'vote_earnings',
                    amount_pi: netAmount,
                    amount_fcfa: netAmount * 5,
                    description: `Gains de vote: ${candidate.name}`,
                    status: 'completed',
                    metadata: {
                        candidate_id: candidate.id,
                        candidate_name: candidate.name,
                        gross_amount: totalCostPi,
                        platform_fee: platformFee,
                        fee_percent: platformFeePercent,
                        net_amount: netAmount,
                        source: 'vote_earnings',
                        vote_count: voteCount,
                        is_cumulative: true
                    }
                });

                // NOTE: Enregistrement des frais de plateforme temporairement désactivé
                // car la table platform_commissions n'existe pas encore
                console.log('Platform commission would be recorded:', {
                    amount_coins: platformFee,
                    candidate_name: candidate.name,
                    vote_count: voteCount,
                    total_amount: totalCostPi
                });
            }

            toast({ 
                title: "🎉 Vote enregistré !", 
                description: `Vous avez ajouté ${voteCount} voix à ${candidate.name}. Total: ${totalVoteCount} voix. Frais: ${platformFee} pièces (${platformFeePercent}%)`,
                className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white" 
            });
            
            // Rafraîchir les données
            if (onVote) onVote();
            
        } catch (error) {
            console.error("Vote error:", error);
            toast({ 
                title: "❌ Erreur", 
                description: error.message, 
                variant: "destructive" 
            });
        } finally { 
            setLoading(false); 
        }
    };

    const handleShare = async (e) => {
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Votez pour ${candidate.name}`,
                    text: `Soutenez ${candidate.name} dans l'événement ${event.title} sur BonPlanInfos !`,
                    url: window.location.href,
                });
            } catch (error) {
                console.log('Error sharing', error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Lien copié", description: "Le lien a été copié dans le presse-papier." });
        }
    };

    return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-4 ${isSelected ? 'ring-2 ring-emerald-500' : ''} relative overflow-hidden group hover:border-emerald-500/50 transition-colors`}>
                {candidate.category && candidate.category !== 'Général' && (
                    <div className="absolute top-0 right-0">
                        <Badge variant="secondary" className="bg-emerald-900/80 text-emerald-200 border-0 rounded-bl-xl rounded-tr-none text-[10px] px-2">
                            {candidate.category}
                        </Badge>
                    </div>
                )}

                <div className="flex items-start gap-3 mb-3 mt-2">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500/50 cursor-pointer shrink-0 shadow-lg group-hover:shadow-emerald-900/50 transition-all" onClick={() => setShowDetails(true)}>
                        <img src={candidate.photo_url || "/api/placeholder/64/64"} alt={candidate.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-white truncate pr-2 cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => setShowDetails(true)}>
                                {candidate.name}
                            </h4>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-gray-700" onClick={() => setShowDetails(true)}>
                                    <Eye className="w-4 h-4 text-gray-400" />
                                </Button>
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1 text-emerald-400">
                                <span className="font-semibold">{candidateVoteCount} voix</span>
                                <span>{votePercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, votePercentage)}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
                {!isVotingLocked ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between bg-gray-800 p-1.5 rounded-lg border border-gray-700/50">
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-emerald-400" onClick={() => setVoteCount(v => Math.max(1, v - 1))}>
                                <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-white font-bold font-mono text-lg min-w-[2ch] text-center">{voteCount}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-emerald-400" onClick={() => setVoteCount(v => v + 1)}>
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                            <Button onClick={() => onSelect(candidate, voteCount)} variant="outline" size="sm" className="col-span-4 text-xs bg-transparent border-gray-600 hover:bg-gray-800 hover:text-white p-0">
                                <ShoppingCart className="w-3 h-3 mr-1" /> Panier
                            </Button>
                            <Button onClick={handleShare} variant="outline" size="sm" className="col-span-3 text-xs bg-transparent border-gray-600 hover:bg-gray-800 hover:text-white p-0">
                                <Share2 className="w-3 h-3" />
                            </Button>
                            <Button onClick={() => setConfirmation({ isOpen: true, onConfirm: handleVote })} disabled={loading} size="sm" className="col-span-5 bg-emerald-600 hover:bg-emerald-700 text-xs text-white border-0 shadow-lg shadow-emerald-900/20">
                                {loading ? <Loader2 className="animate-spin w-3 h-3" /> : `Voter ${totalCostPi}pièces`}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-800/50 p-2 rounded text-center border border-gray-700/50">
                        <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" /> 
                            {isFinished ? 'Votes terminés' : 'Ventes fermées par l\'organisateur'}
                        </p>
                        {isClosed && !isFinished && (
                            <p className="text-[10px] text-amber-500 mt-1 italic">
                                La période est active mais les votes sont temporairement suspendus.
                            </p>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Candidate Detail Modal */}
            <AlertDialog open={showDetails} onOpenChange={setShowDetails}>
                <AlertDialogContent className="bg-gradient-to-b from-gray-900 to-gray-950 border-gray-700 max-w-sm">
                    <AlertDialogHeader>
                        <div className="relative mx-auto mb-4">
                            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-xl shadow-emerald-500/20">
                                <img src={candidate.photo_url || "/api/placeholder/128/128"} className="w-full h-full rounded-full object-cover border-4 border-gray-900" alt={candidate.name} />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-gray-900 rounded-full p-1 border border-gray-700">
                                <div className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                                    <Trophy className="w-3 h-3 mr-1" /> #{rank}
                                </div>
                            </div>
                        </div>
                        <AlertDialogTitle className="text-2xl font-bold text-white text-center mb-1">
                            {candidate.name}
                        </AlertDialogTitle>

                        {candidate.category && (
                            <div className="flex justify-center mb-2">
                                <Badge variant="outline" className="border-emerald-500 text-emerald-400 bg-emerald-950/30">
                                    {candidate.category}
                                </Badge>
                            </div>
                        )}

                        <AlertDialogDescription className="text-center space-y-4">
                            <div className="text-gray-400 text-sm line-clamp-3">
                                {candidate.description || "Aucune description disponible pour ce candidat."}
                            </div>

                            <div className="grid grid-cols-3 gap-3 my-4">
                                <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                                    <div className="text-emerald-400 font-bold text-xl">{candidateVoteCount}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Votes</div>
                                </div>
                                <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                                    <div className="text-blue-400 font-bold text-xl">#{rank}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Rang</div>
                                </div>
                                <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                                    <div className="text-purple-400 font-bold text-xl">{votePercentage.toFixed(1)}%</div>
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Score</div>
                                </div>
                            </div>

                            {!isVotingLocked && (
                                <div className="p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-xl">
                                    <p className="text-emerald-200 font-medium italic">
                                        "Votez pour moi et aidez-moi à atteindre la première place ! Chaque voix compte."
                                    </p>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <Button onClick={handleShare} variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
                            <Share2 className="w-4 h-4 mr-2" /> Partager
                        </Button>
                        <Button onClick={() => setShowDetails(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                            Fermer
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => { setShowWalletInfo(false); navigate('/packs'); }} />
            <AlertDialog open={confirmation.isOpen} onOpenChange={(o) => !o && setConfirmation({ isOpen: false, onConfirm: null })}>
                <AlertDialogContent className="bg-gray-900 text-white border-gray-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer le vote</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Voter pour {candidate.name} ({voteCount} voix) pour {totalCostPi}pièces (pièces achetées uniquement)?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="text-black">Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmation.onConfirm} className="bg-emerald-600 text-white">
                            Confirmer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const VotingInterface = ({ event, isUnlocked, onRefresh, isClosed }) => {
    const [candidates, setCandidates] = useState([]);
    const [settings, setSettings] = useState(null);
    const { user } = useAuth();
    const [userPaidBalance, setUserPaidBalance] = useState(0);
    const [cartItems, setCartItems] = useState([]);
    const [activeTab, setActiveTab] = useState('candidates');
    const [isVoteFinished, setIsVoteFinished] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('Tous');
    const [availableCategories, setAvailableCategories] = useState(['Tous']);
    const [rankingFilter, setRankingFilter] = useState('Tous');

    const fetchData = useCallback(async () => {
        if (!event?.id) return;
        
        setLoadingCandidates(true);
        try {
            const { data: cData, error: cError } = await supabase
                .from('candidates')
                .select('*')
                .eq('event_id', event.id)
                .order('vote_count', { ascending: false });
            
            if (cError) throw cError;

            const { data: sData, error: sError } = await supabase
                .from('events')
                .select('vote_price_pi, event_end_at, start_date')
                .eq('id', event.id)
                .single();
            
            if (sError && sError.code !== 'PGRST116') {
                console.error("Error loading settings:", sError);
            }

            if (user) {
                const { data: uData, error: uError } = await supabase
                    .from('profiles')
                    .select('coin_balance')
                    .eq('id', user.id)
                    .single();
                    
                if (!uError) {
                    setUserPaidBalance(uData?.coin_balance || 0);
                }
            }

            if (cData) {
                setCandidates(cData);
                const cats = [...new Set(cData.map(c => c.category).filter(Boolean))];
                if (cats.length > 0) {
                    setAvailableCategories(['Tous', ...cats.sort()]);
                }
            }
            
            const settingsData = sData || { 
                vote_price_pi: 1, 
                event_end_at: new Date(Date.now() + 86400000).toISOString(),
                start_date: new Date().toISOString()
            };
            setSettings(settingsData);
            
            const now = new Date();
            const endDate = new Date(settingsData.event_end_at);
            const isExpired = now.getTime() > endDate.getTime();
            
            setIsVoteFinished(isExpired);
            
        } catch (error) {
            console.error("Error fetching voting data:", error);
            toast({
                title: "Erreur de chargement",
                description: "Impossible de charger les données des candidats.",
                variant: "destructive"
            });
        } finally {
            setLoadingCandidates(false);
        }
    }, [event?.id, user]);

    useEffect(() => { 
        console.log(`[VotingInterface] fetchData triggered. Event ID: ${event?.id}, isClosed: ${isClosed}`);
        fetchData(); 
    }, [fetchData, isClosed, event?.id]);

    useEffect(() => {
        if (!settings?.event_end_at) return;
        
        const interval = setInterval(() => {
            const endDate = new Date(settings.event_end_at);
            const now = new Date();
            const isExpired = now.getTime() > endDate.getTime();
            
            if (isExpired !== isVoteFinished) {
                setIsVoteFinished(isExpired);
                if (onRefresh) onRefresh();
            }
        }, 60000);
        
        return () => clearInterval(interval);
    }, [settings?.event_end_at, isVoteFinished, onRefresh]);

    const handleCheckout = async () => {
        const isLocked = isVoteFinished || isClosed;
        
        console.log(`[VotingInterface] Checkout - isVoteFinished: ${isVoteFinished}, isClosed: ${isClosed}, isLocked: ${isLocked}`);
        
        if (!user || isLocked) {
            toast({ 
                title: "Action impossible", 
                description: isVoteFinished ? "Les votes sont terminés." : "Les ventes sont actuellement fermées.", 
                variant: "destructive" 
            });
            return;
        }
        
        if (cartItems.length === 0) {
            toast({ 
                title: "Panier vide", 
                description: "Veuillez ajouter des votes à votre panier.", 
                variant: "destructive" 
            });
            return;
        }
        
        try {
            const totalCost = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            
            // Vérifier le solde
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('coin_balance')
                .eq('id', user.id)
                .single();
                
            if (userError) throw userError;
            
            if ((userData?.coin_balance || 0) < totalCost) {
                toast({
                    title: "Solde insuffisant",
                    description: "Votre solde de pièces est insuffisant pour effectuer ces votes.",
                    variant: "destructive"
                });
                return;
            }

            // Débiter le solde
            const newBalance = (userData.coin_balance || 0) - totalCost;
            await supabase
                .from('profiles')
                .update({ coin_balance: newBalance })
                .eq('id', user.id);

            const errors = [];
            const platformFeePercent = 5;
            
            for (const item of cartItems) {
                try {
                    // Calculer les frais pour ce lot de votes
                    const itemTotalCost = item.quantity * item.price;
                    const platformFee = Math.ceil(itemTotalCost * (platformFeePercent / 100));
                    const netAmount = itemTotalCost - platformFee;

                    // Créer la transaction pour cet item
                    await TransactionService.createVoteTransaction(
                        user.id,
                        event.id,
                        itemTotalCost,
                        item.candidate.id,
                        {
                            description: `Vote pour ${item.candidate.name} (${item.quantity} voix)`
                        }
                    );

                    // Vérifier si l'utilisateur a déjà voté pour ce candidat
                    const { data: existingVote, error: checkError } = await supabase
                        .from('user_votes')
                        .select('vote_count, vote_cost_pi, net_to_organizer, fees')
                        .eq('user_id', user.id)
                        .eq('candidate_id', item.candidate.id)
                        .eq('event_id', event.id)
                        .maybeSingle();

                    if (checkError && checkError.code !== 'PGRST116') {
                        console.error('Error checking existing vote:', checkError);
                    }

                    // Calculer les totaux cumulatifs
                    const existingVoteCount = existingVote?.vote_count || 0;
                    const existingCost = existingVote?.vote_cost_pi || 0;
                    const existingNet = existingVote?.net_to_organizer || 0;
                    const existingFees = existingVote?.fees || 0;

                    const totalVoteCount = existingVoteCount + item.quantity;
                    const totalCostInc = existingCost + itemTotalCost;
                    const totalNetAmount = existingNet + netAmount;
                    const totalFees = existingFees + platformFee;

                    // Mettre à jour ou insérer le vote (upsert pour éviter la contrainte unique)
                    const { error: voteError } = await supabase
                        .from('user_votes')
                        .upsert({
                            user_id: user.id,
                            candidate_id: item.candidate.id,
                            event_id: event.id,
                            vote_count: totalVoteCount,
                            vote_cost_pi: totalCostInc,
                            vote_cost_fcfa: totalCostInc * 5,
                            net_to_organizer: totalNetAmount,
                            fees: totalFees,
                            created_at: new Date().toISOString()
                        }, {
                            onConflict: 'event_id, candidate_id, user_id'
                        });

                    if (voteError) {
                        console.error('Error creating/updating vote record:', voteError);
                        throw voteError;
                    }

                    // Mettre à jour les votes du candidat (incrémenter)
                    const newVoteCount = (item.candidate.vote_count || 0) + item.quantity;
                    
                    await supabase
                        .from('candidates')
                        .update({ vote_count: newVoteCount })
                        .eq('id', item.candidate.id);

                    // Récupérer l'organisateur
                    const { data: eventData } = await supabase
                        .from('events')
                        .select('organizer_id, title')
                        .eq('id', event.id)
                        .single();

                    if (eventData?.organizer_id) {
                        // Créditer l'organisateur
                        const { data: organizerProfile } = await supabase
                            .from('profiles')
                            .select('available_earnings')
                            .eq('id', eventData.organizer_id)
                            .single();

                        if (organizerProfile) {
                            const newEarnings = (organizerProfile.available_earnings || 0) + netAmount;
                            
                            await supabase
                                .from('profiles')
                                .update({ 
                                    available_earnings: newEarnings 
                                })
                                .eq('id', eventData.organizer_id);
                        }

                        // Enregistrer les gains de l'organisateur
                        await supabase
                            .from('organizer_earnings')
                            .insert({
                                organizer_id: eventData.organizer_id,
                                event_id: event.id,
                                earnings_coins: netAmount,
                                transaction_type: 'vote',
                                fee_percent: platformFeePercent,
                                platform_fee: platformFee,
                                status: 'pending',
                                created_at: new Date().toISOString(),
                                description: `Gains de vote: ${item.candidate.name} - ${eventData.title} (${item.quantity} voix)`
                            });

                        // Transaction pour les gains de l'organisateur
                        await TransactionService.createTransaction({
                            user_id: eventData.organizer_id,
                            event_id: event.id,
                            transaction_type: 'vote_earnings',
                            amount_pi: netAmount,
                            amount_fcfa: netAmount * 5,
                            description: `Gains de vote: ${item.candidate.name}`,
                            status: 'completed',
                            metadata: {
                                candidate_id: item.candidate.id,
                                candidate_name: item.candidate.name,
                                gross_amount: itemTotalCost,
                                platform_fee: platformFee,
                                fee_percent: platformFeePercent,
                                net_amount: netAmount,
                                source: 'vote_earnings',
                                vote_count: item.quantity,
                                is_cumulative: true
                            }
                        });

                        // NOTE: Enregistrement des frais de plateforme temporairement désactivé
                        // car la table platform_commissions n'existe pas encore
                        console.log('Platform commission would be recorded:', {
                            amount_coins: platformFee,
                            candidate_name: item.candidate.name,
                            vote_count: item.quantity,
                            total_amount: itemTotalCost
                        });
                    }

                } catch (itemError) {
                    errors.push(`Erreur pour ${item.candidate.name}: ${itemError.message}`);
                }
            }
            
            if (errors.length > 0) {
                throw new Error(errors.join('\n'));
            }
            
            toast({ 
                title: "🎉 Succès", 
                description: "Tous les votes du panier ont été enregistrés avec succès! Les votes ont été ajoutés aux votes existants.",
                className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white" 
            });
            
            setCartItems([]);
            fetchData();
            if (onRefresh) onRefresh();
            
        } catch (e) { 
            console.error("Checkout error:", e);
            toast({ 
                title: "❌ Erreur", 
                description: e.message || "Erreur lors de l'enregistrement des votes", 
                variant: "destructive" 
            });
        }
    };

    const totalVotes = candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);

    const filteredCandidates = useMemo(() => {
        let result = candidates;
        
        if (selectedCategory !== 'Tous') {
            result = result.filter(c => c.category === selectedCategory);
        }
        
        if (searchTerm) {
            result = result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        
        return result;
    }, [candidates, selectedCategory, searchTerm]);

    const sortedCandidates = useMemo(() => {
        return [...candidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    }, [candidates]);

    const getRank = (id) => sortedCandidates.findIndex(c => c.id === id) + 1;

    const rankedCandidatesFiltered = useMemo(() => {
        let result = candidates;
        if (rankingFilter !== 'Tous') {
            result = result.filter(c => c.category === rankingFilter);
        }
        return result.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    }, [candidates, rankingFilter]);

    const generateRankingPDF = (type) => {
        const doc = new jsPDF();
        let listToExport = [];
        let pdfTitle = "";
        let filename = "";

        if (type === 'general') {
            listToExport = [...candidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
            pdfTitle = "CLASSEMENT GÉNÉRAL";
            filename = "classement_general";
        } else if (type === 'category_best') {
            const categories = [...new Set(candidates.map(c => c.category).filter(Boolean))].sort();
            listToExport = categories.map(cat => {
                const catCandidates = candidates.filter(c => c.category === cat);
                return catCandidates.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))[0];
            }).filter(Boolean);
            listToExport.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
            
            pdfTitle = "MEILLEURS PAR CATÉGORIE";
            filename = "meilleurs_par_categorie";
        } else {
            listToExport = rankedCandidatesFiltered;
            pdfTitle = "CLASSEMENT " + (rankingFilter === 'Tous' ? "GÉNÉRAL" : rankingFilter.toUpperCase());
            filename = "classement_" + rankingFilter;
        }
        
        const primaryColor = [16, 185, 129];
        const secondaryColor = [75, 85, 99];
        const accentColor = [234, 179, 8];
        
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(pdfTitle, 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(event.title.toUpperCase(), 105, 30, { align: 'center' });
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        doc.text(`Généré le : ${dateStr}`, 14, 50);
        if (type !== 'general' && type !== 'category_best') {
            doc.text(`Catégorie : ${rankingFilter}`, 14, 55);
        }
        doc.text(`Total Votes : ${totalVotes}`, 14, 60);
        
        let y = 70;
        const colX = { rank: 15, name: 40, cat: 110, votes: 160, share: 190 };
        
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 6, 182, 9, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(9);
        doc.text("RANG", colX.rank, y);
        doc.text("CANDIDAT", colX.name, y);
        doc.text("CATÉGORIE", colX.cat, y);
        doc.text("VOTES", colX.votes, y, { align: 'right' });
        doc.text("SCORE", colX.share, y, { align: 'right' });
        
        y += 10;
        
        listToExport.forEach((c, index) => {
            if (y > 275) {
                doc.addPage();
                y = 20;
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`${pdfTitle} - ${event.title} (Suite)`, 14, 10);
            }
            
            const rank = index + 1;
            const share = totalVotes > 0 ? ((c.vote_count || 0) / totalVotes * 100).toFixed(1) : "0.0";
            
            if (rank <= 3) {
                doc.setFillColor(rank === 1 ? 255 : 250, rank === 1 ? 248 : 250, rank === 1 ? 220 : 250);
                doc.setDrawColor(rank === 1 ? accentColor[0] : 220, rank === 1 ? accentColor[1] : 220, rank === 1 ? 0 : 220);
                doc.rect(14, y - 6, 182, 10, 'FD');
            }
            
            doc.setFontSize(10);
            if (rank === 1) doc.setTextColor(...accentColor);
            else if (rank === 2) doc.setTextColor(150, 150, 150);
            else if (rank === 3) doc.setTextColor(165, 80, 30);
            else doc.setTextColor(0, 0, 0);
            
            doc.setFont('helvetica', 'bold');
            doc.text(`#${rank}`, colX.rank, y);
            
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(c.name, colX.name, y);
            
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(c.category || '-', colX.cat, y);
            
            doc.setTextColor(0, 0, 0);
            doc.text((c.vote_count || 0).toString(), colX.votes, y, { align: 'right' });
            
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text(share + "%", colX.share, y, { align: 'right' });
            
            doc.setDrawColor(230, 230, 230);
            doc.line(14, y + 4, 196, y + 4);
            
            y += 12;
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`BonPlanInfos - Système de Vote Sécurisé © ${new Date().getFullYear()}`, 105, 290, { align: 'center' });
            doc.text(`Page ${i}/${pageCount}`, 196, 290, { align: 'right' });
        }
        
        const safeName = event.title.substring(0, 15).replace(/[^a-z0-9]/gi, '_');
        doc.save(`${filename}_${safeName}.pdf`);
        toast({ title: "PDF généré", description: "Le classement a été téléchargé avec succès." });
    };

    if (!isUnlocked) return null;

    return (
        <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Vote className="w-6 h-6 text-emerald-500" />
                    Espace de Vote
                </h2>
                {user && (
                    <Badge variant="outline" className="text-amber-400 border-amber-400 bg-amber-950/20 px-3 py-1">
                        <Coins className="w-3 h-3 mr-2" /> 
                        Solde Acheté: {userPaidBalance}pièces
                    </Badge>
                )}
            </div>

            {loadingCandidates ? (
                <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-400">Chargement des candidats...</p>
                </div>
            ) : (
                <>
                    {settings && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CountdownTimer 
                                endDate={settings.event_end_at} 
                                onTimerEnd={() => {
                                    setIsVoteFinished(true);
                                    if (onRefresh) onRefresh();
                                }} 
                            />
                            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col justify-center">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Période de vote</span>
                                    <div className="flex gap-2">
                                        {isVoteFinished ? (
                                            <Badge className="bg-red-900/50 text-red-300 border-red-800">Terminé</Badge>
                                        ) : (
                                            <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-800">En cours</Badge>
                                        )}
                                        {isClosed && !isVoteFinished && (
                                            <Badge className="bg-amber-900/50 text-amber-300 border-amber-800">
                                                <Lock className="w-3 h-3 mr-1" /> Ventes fermées
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center text-sm text-gray-300">
                                        <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                                        <span className="w-16 text-gray-500">Début:</span>
                                        <span>{settings.start_date ? new Date(settings.start_date).toLocaleDateString('fr-FR') : 'Immédiat'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-300">
                                        <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                                        <span className="w-16 text-gray-500">Fin:</span>
                                        <span className="text-white font-medium">
                                            {new Date(settings.event_end_at).toLocaleDateString('fr-FR')} à {new Date(settings.event_end_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-300 mt-2">
                                        <Coins className="w-4 h-4 mr-2 text-amber-500" />
                                        <span className="w-16 text-gray-500">Prix/vote:</span>
                                        <span className="text-amber-400 font-medium">{settings.vote_price_pi || 1} pièces</span>
                                    </div>
                                    {isClosed && !isVoteFinished && (
                                        <div className="flex items-center text-sm text-amber-400 mt-2 p-2 bg-amber-900/20 rounded-lg border border-amber-800/30">
                                            <Info className="w-4 h-4 mr-2 text-amber-500" />
                                            <span className="text-xs">Les votes sont temporairement désactivés par l'organisateur</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="bg-gray-800 w-full border border-gray-700 grid grid-cols-2 p-1">
                                    <TabsTrigger value="candidates" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
                                        <UserCircle className="w-4 h-4 mr-2" /> Candidats
                                    </TabsTrigger>
                                    <TabsTrigger value="ranking" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
                                        <BarChart3 className="w-4 h-4 mr-2" /> Classement
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="candidates" className="space-y-4">
                                    <div className="flex flex-col gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                                            <Input 
                                                placeholder="Rechercher un candidat..." 
                                                className="pl-9 bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        
                                        {availableCategories.length > 1 && (
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                                {availableCategories.map(cat => (
                                                    <button
                                                        key={cat}
                                                        onClick={() => setSelectedCategory(cat)}
                                                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                                                            selectedCategory === cat
                                                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/20'
                                                            : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-gray-200'
                                                        }`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {filteredCandidates.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {filteredCandidates.map((c, idx) => (
                                                <CandidateCard
                                                    key={c.id}
                                                    candidate={c}
                                                    totalVotes={totalVotes}
                                                    votePrice={settings?.vote_price_pi || 1}
                                                    onVote={() => { 
                                                        fetchData(); 
                                                        if (onRefresh) onRefresh(); 
                                                    }}
                                                    isFinished={isVoteFinished}
                                                    index={idx}
                                                    isSelected={cartItems.some(i => i.candidate.id === c.id)}
                                                    onSelect={(cand, qty) => {
                                                        setCartItems(prev => {
                                                            const existingIndex = prev.findIndex(i => i.candidate.id === cand.id);
                                                            if (existingIndex >= 0) {
                                                                const updated = [...prev];
                                                                updated[existingIndex].quantity += qty;
                                                                return updated;
                                                            } else {
                                                                return [...prev, { 
                                                                    candidate: cand, 
                                                                    quantity: qty, 
                                                                    price: settings?.vote_price_pi || 1 
                                                                }];
                                                            }
                                                        });
                                                    }}
                                                    event={event}
                                                    rank={getRank(c.id)}
                                                    isClosed={isClosed}
                                                    eventSettings={settings}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700 border-dashed">
                                            <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Filter className="w-8 h-8 text-gray-500" />
                                            </div>
                                            <h3 className="text-lg font-medium text-white mb-1">Aucun résultat</h3>
                                            <p className="text-gray-400">Essayez de changer de catégorie ou de terme de recherche.</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="ranking">
                                    <Card className="bg-gray-800 border-gray-700 shadow-xl overflow-hidden">
                                        <CardHeader className="bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700 pb-6">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <CardTitle className="text-white flex items-center gap-2 text-xl">
                                                    <Trophy className="text-yellow-500 w-6 h-6" /> 
                                                    Classement Officiel
                                                </CardTitle>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button 
                                                            variant="outline" 
                                                            className="bg-emerald-600 border-0 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 w-full md:w-auto"
                                                        >
                                                            <Printer className="w-4 h-4 mr-2" /> 
                                                            Imprimer le classement
                                                            <ChevronDown className="w-4 h-4 ml-2" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="bg-gray-800 border-gray-700 text-gray-200">
                                                        <DropdownMenuItem 
                                                            className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700 focus:text-white"
                                                            onClick={() => generateRankingPDF('general')}
                                                        >
                                                            Classement Général (Tout)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="hover:bg-gray-700 cursor-pointer focus:bg-gray-700 focus:text-white"
                                                            onClick={() => generateRankingPDF('category_best')}
                                                        >
                                                            Meilleur par Catégorie
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            
                                            <div className="mt-6">
                                                <div className="text-xs text-gray-400 uppercase font-semibold mb-2 ml-1">Filtrer par catégorie</div>
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {availableCategories.map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setRankingFilter(cat)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                                                                rankingFilter === cat
                                                                ? 'bg-emerald-600 text-white border-emerald-500'
                                                                : 'bg-gray-900/50 text-gray-400 border-gray-600 hover:border-gray-500 hover:text-gray-300'
                                                            }`}
                                                        >
                                                            {cat === 'Tous' ? 'Vue Globale' : cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="divide-y divide-gray-700/50">
                                                {rankedCandidatesFiltered.length > 0 ? (
                                                    rankedCandidatesFiltered.map((c, i) => {
                                                        const rank = i + 1;
                                                        const percentage = totalVotes > 0 ? ((c.vote_count || 0) / totalVotes * 100).toFixed(1) : 0;

                                                        let rankBadge;
                                                        if (rank === 1) rankBadge = <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20"><Crown className="w-5 h-5" /></div>;
                                                        else if (rank === 2) rankBadge = <div className="bg-gray-300 text-gray-800 w-8 h-8 rounded-full flex items-center justify-center font-bold border border-gray-400">2</div>;
                                                        else if (rank === 3) rankBadge = <div className="bg-orange-700 text-orange-100 w-8 h-8 rounded-full flex items-center justify-center font-bold border border-orange-600">3</div>;
                                                        else rankBadge = <span className="text-gray-500 font-mono font-bold text-lg w-8 text-center">#{rank}</span>;

                                                        return (
                                                            <div key={c.id} className={`flex items-center p-4 transition-colors ${rank <= 3 ? 'bg-gray-800/80' : 'hover:bg-gray-700/30'}`}>
                                                                <div className="flex-shrink-0 mr-4 w-10 flex justify-center">
                                                                    {rankBadge}
                                                                </div>
                                                                <div className="flex-shrink-0 mr-4">
                                                                    <img src={c.photo_url || "/api/placeholder/40/40"} className={`w-10 h-10 rounded-full object-cover border ${rank === 1 ? 'border-yellow-500' : 'border-gray-600'}`} alt={c.name} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className={`text-sm font-medium truncate ${rank === 1 ? 'text-yellow-400' : 'text-white'}`}>
                                                                            {c.name}
                                                                        </p>
                                                                        {rank === 1 && <Award className="w-3 h-3 text-yellow-500" />}
                                                                    </div>
                                                                    <div className="flex items-center mt-1 gap-2">
                                                                        <div className="flex-1 bg-gray-700 rounded-full h-1.5 max-w-[100px] overflow-hidden">
                                                                            <div className={`h-1.5 rounded-full ${rank === 1 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }}></div>
                                                                        </div>
                                                                        <span className="text-xs text-gray-400">{percentage}%</span>
                                                                        {c.category && <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-500 h-4 px-1 ml-auto sm:ml-0">{c.category}</Badge>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right ml-2">
                                                                    <div className={`text-sm font-bold ${rank <= 3 ? 'text-white' : 'text-gray-300'}`}>{c.vote_count || 0}</div>
                                                                    <div className="text-[10px] text-gray-500 uppercase">voix</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="p-12 text-center text-gray-500">
                                                        Aucun candidat trouvé pour ce filtre.
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>
                        <div className="lg:col-span-1">
                            <Card className="bg-gray-800 border-gray-700 sticky top-4">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg flex items-center">
                                        <ShoppingCart className="mr-2" /> Panier ({cartItems.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {cartItems.length > 0 && !isClosed && !isVoteFinished ? (
                                        <div className="space-y-3">
                                            {cartItems.map((i, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm bg-gray-900/50 p-2 rounded border border-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-900 flex items-center justify-center text-emerald-400 text-xs font-bold">
                                                            {i.quantity}
                                                        </div>
                                                        <span className="text-gray-300 truncate max-w-[120px]">{i.candidate.name}</span>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-5 w-5 ml-auto text-gray-500 hover:text-red-400"
                                                            onClick={() => {
                                                                setCartItems(prev => prev.filter((_, index) => index !== idx));
                                                            }}
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                    <span className="text-emerald-400 font-mono">{i.quantity * i.price}pièces</span>
                                                </div>
                                            ))}
                                            <Separator />
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-gray-400">Total</span>
                                                <span className="text-xl font-bold text-emerald-400">{cartItems.reduce((s, i) => s + i.quantity * i.price, 0)}pièces</span>
                                            </div>
                                            <Button onClick={handleCheckout} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                                Confirmer le paiement
                                            </Button>
                                            <Button onClick={() => setCartItems([])} variant="ghost" size="sm" className="w-full text-gray-500 hover:text-red-400 h-auto py-1 text-xs">
                                                Vider le panier
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">
                                                {isVoteFinished ? 'Les votes sont terminés' :
                                                    isClosed ? 'Les votes sont temporairement désactivés' :
                                                        'Votre panier est vide'}
                                            </p>
                                            {isClosed && !isVoteFinished && (
                                                <p className="text-xs text-amber-500 mt-2">
                                                    La période de vote est active mais les ventes sont suspendues
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default VotingInterface;