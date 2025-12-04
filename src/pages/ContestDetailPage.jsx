import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Coins, Vote as VoteIcon, Loader2, Minus, Plus, Heart, Share2, TrendingUp, Lock, AlertCircle, Crown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PaymentModal from '@/components/PaymentModal';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CoinService } from '@/services/CoinService';
import WalletInfoModal from '@/components/WalletInfoModal';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Composant Carte Candidat Amélioré
const CandidateCard = ({ candidate, onVote, totalVotes, onLike, onShare, hasLiked }) => {
    const percentage = totalVotes > 0 ? ((candidate.vote_count / totalVotes) * 100).toFixed(1) : 0;
    const [showDetails, setShowDetails] = useState(false);

    return (
        <>
            <motion.div
                className="bg-card/50 border border-border hover:border-primary/50 rounded-xl p-4 transition-all duration-300 hover:shadow-lg group relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
            >
                {/* Effet de fond de classement */}
                <div className="absolute top-0 right-0 p-2 opacity-10 font-black text-6xl select-none">
                    #{candidate.ranking_position}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                    <div className="relative cursor-pointer" onClick={() => setShowDetails(true)}>
                        <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background shadow-xl group-hover:scale-105 transition-transform">
                            <AvatarImage src={candidate.photo_url} alt={candidate.name} className="object-cover" />
                            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-secondary/20">{candidate.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {candidate.ranking_position === 1 && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-1.5 rounded-full shadow-lg animate-bounce">
                                <Crown className="w-4 h-4 fill-current" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 w-full text-center sm:text-left space-y-2">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                            <h3 className="font-bold text-xl text-foreground truncate max-w-full cursor-pointer hover:text-primary transition-colors" onClick={() => setShowDetails(true)}>
                                {candidate.name}
                            </h3>
                            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
                                {candidate.vote_count} votes
                            </Badge>
                        </div>

                        <div className="w-full space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Popularité</span>
                                <span className="font-bold text-primary">{percentage}%</span>
                            </div>
                            <Progress value={parseFloat(percentage)} className="h-2" />
                        </div>

                        <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`h-8 px-2 rounded-full ${hasLiked ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-red-500'}`}
                                onClick={(e) => { e.stopPropagation(); onLike(candidate.id); }}
                            >
                                <Heart className={`w-4 h-4 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
                                <span className="text-xs">{candidate.like_count || 0}</span>
                            </Button>
                            
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 rounded-full text-muted-foreground hover:text-blue-500"
                                onClick={(e) => { e.stopPropagation(); onShare(candidate); }}
                            >
                                <Share2 className="w-4 h-4 mr-1" />
                                <span className="text-xs">Partager</span>
                            </Button>
                        </div>
                    </div>

                    <Button 
                        onClick={onVote} 
                        className="w-full sm:w-auto gradient-gold text-primary-foreground font-bold shadow-md hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                    >
                        Voter
                    </Button>
                </div>
            </motion.div>

            {/* Modal Détails Candidat */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
                            {candidate.name}
                            {candidate.ranking_position === 1 && <Crown className="w-6 h-6 text-yellow-500 fill-current" />}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Candidat #{candidate.ranking_position} • {candidate.vote_count} votes
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col items-center space-y-6 py-4">
                        <Avatar className="w-32 h-32 border-4 border-primary shadow-2xl">
                            <AvatarImage src={candidate.photo_url} alt={candidate.name} />
                            <AvatarFallback>{candidate.name?.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="w-full space-y-4 bg-muted/30 p-4 rounded-lg border border-border/50">
                            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border">
                                <div>
                                    <p className="text-lg font-bold text-primary">{candidate.vote_count}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Votes</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-red-500">{candidate.like_count || 0}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">J'aime</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-blue-500">{candidate.share_count || 0}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Partages</p>
                                </div>
                            </div>
                        </div>

                        {candidate.description && (
                            <div className="w-full">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-primary" /> À propos
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed p-3 bg-background rounded-lg border">
                                    {candidate.description}
                                </p>
                            </div>
                        )}

                        <Button onClick={() => { setShowDetails(false); onVote(); }} className="w-full gradient-gold text-lg py-6 font-bold">
                            Voter pour {candidate.name}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

const ContestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { forceRefreshUserProfile } = useData();
    const [contest, setContest] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
    const [voteState, setVoteState] = useState({ isOpen: false, candidate: null, quantity: 1 });
    const [actionLoading, setActionLoading] = useState(false);
    const [userLikes, setUserLikes] = useState(new Set());
    const [isOwner, setIsOwner] = useState(false);

    // Fetch avec les nouvelles vues SQL
    const fetchContestData = useCallback(async () => {
        console.log("Fetching candidate details...");
        try {
            // 1. Récupérer le concours
            const { data: contestData, error: contestError } = await supabase
                .from('contests')
                .select('*')
                .eq('id', id)
                .single();

            if (contestError || !contestData) {
                throw new Error("Concours introuvable");
            }
            setContest(contestData);
            setIsOwner(user?.id === contestData.organizer_id);

            // 2. Récupérer les candidats via la vue vue_details_candidats
            const { data: candidatesData, error: candidatesError } = await supabase
                .from('vue_details_candidats')
                .select('*')
                .eq('event_id', id)
                .order('ranking_position', { ascending: true });

            if (candidatesError) throw candidatesError;
            setCandidates(candidatesData);

            // 3. Récupérer les likes de l'utilisateur
            if (user) {
                const { data: likesData } = await supabase
                    .from('candidate_likes')
                    .select('candidate_id')
                    .eq('user_id', user.id);
                
                if (likesData) {
                    setUserLikes(new Set(likesData.map(l => l.candidate_id)));
                }
            }

        } catch (error) {
            console.error("Erreur fetch:", error);
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
            if (error.message === "Concours introuvable") navigate('/contests');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, user]);

    useEffect(() => {
        fetchContestData();
        
        // Realtime updates for ranking
        const channel = supabase
            .channel(`contest-updates-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates', filter: `event_id=eq.${id}` }, 
                (payload) => {
                    console.log("Ranking updated", payload);
                    fetchContestData(); // Refresh full data on change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchContestData, id]);

    const handleLike = async (candidateId) => {
        if (!user) {
            toast({ title: "Connexion requise", description: "Connectez-vous pour aimer un candidat.", variant: "default" });
            navigate('/auth');
            return;
        }

        try {
            const { data, error } = await supabase.rpc('toggle_candidate_like', {
                p_candidate_id: candidateId,
                p_user_id: user.id
            });

            if (error) throw error;

            const isLiked = data; // true if liked, false if unliked
            console.log("Like toggled:", isLiked);

            setUserLikes(prev => {
                const newSet = new Set(prev);
                if (isLiked) newSet.add(candidateId);
                else newSet.delete(candidateId);
                return newSet;
            });

            // Optimistic UI update for count
            setCandidates(prev => prev.map(c => {
                if (c.id === candidateId) {
                    return { ...c, like_count: (c.like_count || 0) + (isLiked ? 1 : -1) };
                }
                return c;
            }));

            toast({ 
                title: isLiked ? "J'aime ajouté ❤️" : "J'aime retiré 💔", 
                className: isLiked ? "bg-red-50 border-red-200 text-red-800" : "" 
            });

        } catch (error) {
            console.error("Erreur like:", error);
            toast({ title: "Erreur", description: "Action impossible.", variant: "destructive" });
        }
    };

    const handleShare = async (candidate) => {
        const shareData = {
            title: `Votez pour ${candidate.name} !`,
            text: `Soutenez ${candidate.name} dans le concours ${contest.title} sur BonPlanInfos.`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                // Log share
                if (user) {
                    await supabase.rpc('enregistrer_partage', {
                        p_candidate_id: candidate.id,
                        p_user_id: user.id,
                        p_platform: 'native'
                    });
                }
                toast({ title: "Partagé !", description: "Merci de votre soutien." });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast({ title: "Lien copié", description: "Partagez-le avec vos amis !" });
            }
        } catch (err) {
            console.log("Partage annulé ou erreur");
        }
    };

    const handleVote = async () => {
        if (!user) {
            navigate('/auth');
            return;
        }
        
        const { candidate, quantity } = voteState;
        setActionLoading(true);

        try {
            // 1. Verify eligibility via peut_voter
            const { data: canVote, error: checkError } = await supabase.rpc('peut_voter', {
                p_user_id: user.id,
                p_event_id: contest.id // Assuming contest ID maps to event ID logic
            });

            if (checkError) throw checkError;
            if (!canVote) throw new Error("Vous ne pouvez pas voter pour ce concours (fermé ou restreint).");

            const totalCost = (contest.vote_cost_coins || 1) * quantity;

            const onSuccess = async () => {
                try {
                    await CoinService.debitCoins(user.id, totalCost, `Vote: ${contest.title}`, candidate.id, 'candidate');
                    
                    // Update vote count logic
                    const { error: voteError } = await supabase.rpc('participate_in_vote', {
                        p_event_id: contest.id,
                        p_candidate_id: candidate.id,
                        p_user_id: user.id,
                        p_vote_count: quantity
                    });

                    if (voteError) throw voteError;

                    await forceRefreshUserProfile();
                    toast({ 
                        title: "Vote enregistré ! 🎉", 
                        description: `Vous avez donné ${quantity} voix à ${candidate.name}.`,
                        className: "bg-green-50 border-green-200 text-green-800"
                    });
                    console.log("Vote submitted successfully");
                    setVoteState(prev => ({ ...prev, isOpen: false }));
                    fetchContestData(); // Refresh data
                } catch (error) {
                    console.error("Vote processing error:", error);
                    toast({ title: "Erreur de vote", description: error.message, variant: "destructive" });
                } finally {
                    setActionLoading(false);
                }
            };

            const onInsufficientBalance = () => {
                setShowWalletInfoModal(true);
                setActionLoading(false);
                setVoteState(prev => ({ ...prev, isOpen: false }));
            };

            await CoinService.handleAction({
                userId: user.id,
                requiredCoins: totalCost,
                onSuccess,
                onInsufficientBalance,
            });

        } catch (error) {
            toast({ title: "Impossible de voter", description: error.message, variant: "destructive" });
            setActionLoading(false);
        }
    };

    const handleCloseContest = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir clôturer ce concours ? Les résultats seront publiés.")) return;
        
        try {
            setActionLoading(true);
            const { error } = await supabase.rpc('cloturer_concours', { p_event_id: id });
            if (error) throw error;
            
            toast({ title: "Concours clôturé", description: "Les résultats sont maintenant définitifs." });
            console.log("Results published");
            fetchContestData();
        } catch (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const totalVotes = useMemo(() => candidates.reduce((acc, c) => acc + (c.vote_count || 0), 0), [candidates]);
    const isFinished = contest?.status === 'completed' || (contest?.end_date && new Date() > new Date(contest.end_date));

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
    if (!contest) return null;

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-between items-center">
                    <Button variant="ghost" onClick={() => navigate('/contests')} className="pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                    </Button>
                    {isOwner && !isFinished && (
                        <Button variant="destructive" size="sm" onClick={handleCloseContest} disabled={actionLoading}>
                            <Lock className="w-4 h-4 mr-2" /> Clôturer le concours
                        </Button>
                    )}
                </motion.div>

                <Card className="mb-8 overflow-hidden border-none shadow-2xl bg-card">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
                    <CardHeader className="text-center pb-2 pt-8">
                        {isFinished && (
                            <Badge className="w-fit mx-auto mb-4 bg-red-500 hover:bg-red-600 text-white border-none px-4 py-1 text-sm">
                                <Trophy className="w-4 h-4 mr-2" /> CONCOURS TERMINÉ - RÉSULTATS FINAUX
                            </Badge>
                        )}
                        <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground uppercase">
                            {contest.title}
                        </CardTitle>
                        <CardDescription className="text-lg mt-2 max-w-2xl mx-auto">
                            {contest.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <div className="flex flex-wrap justify-center gap-6 mt-6">
                            <div className="flex flex-col items-center p-3 bg-muted/50 rounded-xl min-w-[100px]">
                                <div className="flex items-center text-primary mb-1">
                                    <VoteIcon className="w-5 h-5 mr-2" />
                                    <span className="font-bold text-xl">{totalVotes}</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium uppercase">Total Votes</span>
                            </div>
                            
                            <div className="flex flex-col items-center p-3 bg-muted/50 rounded-xl min-w-[100px]">
                                <div className="flex items-center text-amber-500 mb-1">
                                    <Coins className="w-5 h-5 mr-2" />
                                    <span className="font-bold text-xl">{contest.vote_cost_coins}π</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium uppercase">Coût/Vote</span>
                            </div>

                            <div className="flex flex-col items-center p-3 bg-muted/50 rounded-xl min-w-[100px]">
                                <div className="flex items-center text-blue-500 mb-1">
                                    <Clock className="w-5 h-5 mr-2" />
                                    <span className="font-bold text-base">{new Date(contest.end_date).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium uppercase">Fin</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section Classement */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-bold flex items-center">
                            <TrendingUp className="w-6 h-6 mr-2 text-primary" />
                            {isFinished ? 'Classement Final' : 'Classement en temps réel'}
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {candidates.length} candidat(s)
                        </span>
                    </div>

                    {candidates.length === 0 ? (
                        <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">Aucun candidat pour le moment.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <AnimatePresence mode='popLayout'>
                                {candidates.map((candidate) => (
                                    <CandidateCard 
                                        key={candidate.id} 
                                        candidate={candidate} 
                                        onVote={() => {
                                            if (isFinished) {
                                                toast({ title: "Terminé", description: "Les votes sont clos.", variant: "destructive" });
                                                return;
                                            }
                                            setVoteState({ isOpen: true, candidate, quantity: 1 });
                                        }}
                                        onLike={handleLike}
                                        onShare={handleShare}
                                        totalVotes={totalVotes}
                                        hasLiked={userLikes.has(candidate.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
            <WalletInfoModal isOpen={showWalletInfoModal} onClose={() => setShowWalletInfoModal(false)} onProceed={() => { setShowWalletInfoModal(false); setShowPaymentModal(true); }} />

            <AlertDialog open={voteState.isOpen} onOpenChange={(open) => !open && setVoteState(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent className="max-w-sm border-none shadow-2xl bg-gradient-to-b from-background to-muted/50">
                    <AlertDialogHeader>
                        <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2">
                            <VoteIcon className="w-8 h-8 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-center text-xl">
                            Soutenir <span className="text-primary">{voteState.candidate?.name}</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Choisissez le nombre de votes à envoyer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="py-6">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <Button variant="outline" size="icon" className="rounded-full w-10 h-10" onClick={() => setVoteState(p => ({...p, quantity: Math.max(1, p.quantity - 1)}))}>
                                <Minus className="w-4 h-4" />
                            </Button>
                            <div className="text-center min-w-[80px]">
                                <span className="text-4xl font-bold tabular-nums tracking-tight">{voteState.quantity}</span>
                                <p className="text-xs text-muted-foreground font-medium uppercase mt-1">VOIX</p>
                            </div>
                            <Button variant="outline" size="icon" className="rounded-full w-10 h-10" onClick={() => setVoteState(p => ({...p, quantity: p.quantity + 1}))}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <div className="bg-muted p-4 rounded-xl text-center">
                            <p className="text-sm text-muted-foreground mb-1">Coût total</p>
                            <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                                {contest?.vote_cost_coins * voteState.quantity} <Coins className="w-5 h-5" />
                            </p>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-none">Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleVote} 
                            disabled={actionLoading}
                            className="gradient-gold text-primary-foreground font-bold w-full sm:w-auto"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirmer le vote"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ContestDetailPage;