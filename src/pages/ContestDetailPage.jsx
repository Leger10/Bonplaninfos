import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Coins, Vote as VoteIcon, Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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


const CandidateCard = ({ candidate, onVote, totalVotes }) => {
    const percentage = totalVotes > 0 ? ((candidate.vote_count / totalVotes) * 100).toFixed(2) : 0;

    return (
        <motion.div
            className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-4 flex-1">
                <Avatar className="w-16 h-16 border-2 border-primary">
                    <AvatarImage src={candidate.photo_url} alt={candidate.name} />
                    <AvatarFallback>{candidate.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="w-full">
                    <p className="font-bold text-lg text-white">{candidate.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <motion.div
                                className="bg-gradient-to-r from-amber-400 to-primary h-2.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>
                        <span className="text-amber-400 font-bold text-sm min-w-[50px] text-right">{percentage}%</span>
                    </div>
                </div>
            </div>
            <Button onClick={onVote} size="sm" className="ml-4 gradient-gold text-background font-bold">Voter</Button>
        </motion.div>
    );
};

const ContestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { userProfile, forceRefreshUserProfile } = useData();
    const [contest, setContest] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
    const [voteState, setVoteState] = useState({ isOpen: false, candidate: null, quantity: 1 });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchContestData = useCallback(async () => {
        const { data: contestData, error: contestError } = await supabase
            .from('contests')
            .select('*')
            .eq('id', id)
            .single();

        if (contestError || !contestData) {
            toast({ title: "Erreur", description: "Concours non trouvé.", variant: "destructive" });
            navigate('/contests');
            return;
        }
        setContest(contestData);

        const { data: candidatesData, error: candidatesError } = await supabase
            .from('candidates')
            .select('*')
            .eq('contest_id', id)
            .order('vote_count', { ascending: false });

        if (candidatesError) {
            toast({ title: "Erreur", description: "Impossible de charger les candidats.", variant: "destructive" });
        } else {
            setCandidates(candidatesData);
        }
    }, [id, navigate]);

    useEffect(() => {
        setLoading(true);
        fetchContestData().finally(() => setLoading(false));
    }, [fetchContestData]);

    useEffect(() => {
        const channel = supabase
            .channel(`contest-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates', filter: `contest_id=eq.${id}` },
                () => {
                    fetchContestData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, fetchContestData]);

    const handleVote = async () => {
        if (!user) {
            toast({ title: "Connexion requise", variant: "destructive" });
            navigate('/auth');
            return;
        }
        const { candidate, quantity } = voteState;
        const totalCost = contest.vote_cost_coins * quantity;
        setActionLoading(true);
        setVoteState(prev => ({ ...prev, isOpen: false }));

        const onSuccess = async () => {
            try {
                await CoinService.debitCoins(user.id, totalCost, `Vote: ${contest.title}`);
                const { error: voteError } = await supabase.rpc('increment_vote_count', {
                    candidate_id_to_inc: candidate.id,
                    inc_amount: quantity
                });
                if (voteError) throw voteError;

                await forceRefreshUserProfile();
                toast({ title: "Vote réussi!", description: `Vous avez donné ${quantity} voix à ${candidate.name}.` });
            } catch (error) {
                toast({ title: "Erreur de vote", description: error.message, variant: "destructive" });
            } finally {
                setActionLoading(false);
            }
        };

        const onInsufficientBalance = () => {
            setShowWalletInfoModal(true);
            setActionLoading(false);
        };

        await CoinService.handleAction({
            userId: user.id,
            requiredCoins: totalCost,
            onSuccess,
            onInsufficientBalance,
        });
    };

    const openVoteDialog = (candidate) => {
        setVoteState({ isOpen: true, candidate, quantity: 1 });
    };

    const updateVoteQuantity = (amount) => {
        setVoteState(prev => ({ ...prev, quantity: Math.max(1, prev.quantity + amount) }));
    };

    const totalVotes = useMemo(() => candidates.reduce((acc, c) => acc + c.vote_count, 0), [candidates]);

    if (loading && !contest) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
    if (!contest) return null;

    return (
        <div className="min-h-screen bg-black text-white" style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #000000 100%)' }}>
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <Button variant="ghost" onClick={() => navigate('/contests')} className="text-gray-400 hover:text-white"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
                </motion.div>

                <Card className="bg-transparent border-0 shadow-none text-center mb-8">
                    <CardContent className="p-0">
                        <h1 className="text-4xl font-extrabold text-amber-400 tracking-tight uppercase">{contest.title}</h1>
                        <p className="text-gray-300 mt-2 max-w-2xl mx-auto">{contest.description}</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-4 text-sm text-gray-400">
                            <div className="flex items-center"><Trophy className="w-4 h-4 mr-2 text-amber-400" /> Coût: <strong className="ml-1.5 flex items-center text-white">{contest.vote_cost_coins} <Coins className="w-3 h-3 ml-1 text-amber-400" /></strong></div>
                            <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-amber-400" /> Fin: <strong className="ml-1.5 text-white">{new Date(contest.end_date).toLocaleDateString('fr-FR')}</strong></div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    {loading && candidates.length === 0 ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
                    ) : (
                        candidates.map((candidate) => (
                            <CandidateCard key={candidate.id} candidate={candidate} onVote={() => openVoteDialog(candidate)} totalVotes={totalVotes} />
                        ))
                    )}
                </div>
            </main>

            <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
            <WalletInfoModal isOpen={showWalletInfoModal} onClose={() => setShowWalletInfoModal(false)} onProceed={() => { setShowWalletInfoModal(false); setShowPaymentModal(true); }} />

            <AlertDialog open={voteState.isOpen} onOpenChange={() => setVoteState({ isOpen: false, candidate: null, quantity: 1 })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Voter pour {voteState.candidate?.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Chaque vote coûte {contest.vote_cost_coins} pièces. Combien de voix souhaitez-vous donner ?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center justify-center gap-4 my-4">
                        <Button variant="outline" size="icon" onClick={() => updateVoteQuantity(-1)}><Minus className="w-4 h-4" /></Button>
                        <Input type="number" value={voteState.quantity} readOnly className="w-20 text-center text-lg font-bold" />
                        <Button variant="outline" size="icon" onClick={() => updateVoteQuantity(1)}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <p className="text-center font-semibold">Coût total : {contest.vote_cost_coins * voteState.quantity} pièces</p>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVote} disabled={actionLoading}>
                            {actionLoading ? <Loader2 className="animate-spin" /> : `Confirmer ${voteState.quantity} voix`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ContestDetailPage;