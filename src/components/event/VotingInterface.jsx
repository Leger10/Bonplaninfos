import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Vote, Coins, Plus, Minus, BarChartHorizontal, Info, Share2, Award, ChevronsDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import WalletInfoModal from '@/components/WalletInfoModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ImageViewerModal from '@/components/ImageViewerModal';

const CandidateCard = ({ candidate, totalVotes, votePrice, votePriceFcfa, onVote, settings, isFinished }) => {
    const [voteCount, setVoteCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showWalletInfo, setShowWalletInfo] = useState(false);
    const navigate = useNavigate();
    const [confirmation, setConfirmation] = useState({ isOpen: false, onConfirm: null });
    const { user } = useAuth();
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const votePercentage = totalVotes > 0 ? ((candidate.vote_count || 0) / totalVotes) * 100 : 0;
    
    const handleVoteConfirmation = () => {
        setConfirmation({ isOpen: true, onConfirm: () => handleVote() });
    };

    const handleVote = async () => {
        setConfirmation({ isOpen: false, onConfirm: null });
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('participate_in_vote', {
                p_event_id: candidate.event_id,
                p_candidate_id: candidate.id,
                p_user_id: user.id,
                p_vote_count: voteCount
            });

            if (error) throw error;

            if (data.success) {
                toast({ title: "Vote enregistré!", description: `Vous avez donné ${voteCount} voix à ${candidate.name}.` });
                onVote();
            } else {
                toast({ title: "Erreur de vote", description: data.message || "Une erreur est survenue.", variant: "destructive" });
                if (data.message.includes('Solde')) {
                    setShowWalletInfo(true);
                }
            }
        } catch (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    const totalCostPi = voteCount * votePrice;
    const totalCostFcfa = voteCount * votePriceFcfa;

    const shareCandidate = () => {
        const shareUrl = `${window.location.origin}/event/${candidate.event_id}?candidate=${candidate.id}`;
        if (navigator.share) {
            navigator.share({
                title: `Votez pour ${candidate.name}`,
                text: `Soutenez ${candidate.name} dans le concours sur BonPlanInfos !`,
                url: shareUrl,
            });
        } else {
            navigator.clipboard.writeText(shareUrl);
            toast({ title: 'Lien copié', description: 'Le lien de vote pour ce candidat a été copié.' });
        }
    };

    return (
        <>
            <Dialog>
                <div className="p-4 rounded-lg bg-muted/30 transition-all hover:bg-muted/50">
                    <div className="flex items-center gap-4 mb-4">
                        <Avatar className="w-16 h-16 border-2 border-primary cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsImageModalOpen(true); }}>
                            <AvatarImage src={candidate.photo_url} alt={candidate.name} />
                            <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <DialogTrigger asChild>
                            <div className="cursor-pointer flex-grow">
                                <h4 className="font-bold text-lg">{candidate.name}</h4>
                                <p className="text-sm text-blue-400 hover:underline">Voir les détails</p>
                            </div>
                        </DialogTrigger>
                        <Button variant="ghost" size="icon" onClick={shareCandidate}><Share2 className="w-5 h-5 text-muted-foreground" /></Button>
                    </div>
                    
                    {settings.show_live_results && (
                        <div className="space-y-2 mb-4">
                            <Progress value={votePercentage} />
                            <p className="text-xs text-right text-muted-foreground">{candidate.vote_count || 0} voix ({votePercentage.toFixed(1)}%)</p>
                        </div>
                    )}
                    
                    {!isFinished && (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => setVoteCount(v => Math.max(1, v - 1))}><Minus className="w-4 h-4"/></Button>
                                <span className="font-bold w-12 text-center text-lg">{voteCount}</span>
                                <Button variant="outline" size="icon" onClick={() => setVoteCount(v => v + 1)}><Plus className="w-4 h-4"/></Button>
                            </div>
                            <Button onClick={handleVoteConfirmation} disabled={loading} className="w-full sm:w-auto flex-grow gradient-gold text-background">
                                {loading ? <Loader2 className="animate-spin" /> : <>Voter</>}
                            </Button>
                        </div>
                    )}
                </div>

                <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-sm border-primary/20">
                    <DialogHeader>
                        <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary">
                            <AvatarImage src={candidate.photo_url} alt={candidate.name} />
                            <AvatarFallback className="text-3xl">{candidate.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <DialogTitle className="text-center text-2xl">{candidate.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <span className="flex items-center gap-2 text-blue-400">
                                    Description <ChevronsDown className="w-4 h-4" />
                                </span>
                            </AccordionTrigger>
                            <AccordionContent>
                                {candidate.description || "Aucune description fournie."}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                        <p className="text-center text-sm mt-4 italic text-muted-foreground">"Soutenez-moi pour la victoire !"</p>
                    </div>
                </DialogContent>

                <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => {setShowWalletInfo(false); navigate('/packs');}}/>
                <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, onConfirm: null })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer votre vote ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                <div className="flex flex-col items-center justify-center text-center p-4">
                                    <Coins className="w-12 h-12 text-primary mb-4" />
                                    <p className="text-lg">
                                        Vous êtes sur le point de dépenser <strong className="text-foreground">{totalCostPi}π</strong> ({totalCostFcfa?.toLocaleString('fr-FR')} FCFA).
                                    </p>
                                    <div className="mt-4 text-xs text-muted-foreground p-2 bg-muted rounded flex items-start gap-2">
                                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>Votre action permet aux organisateurs de créer plus de contenu.</span>
                                    </div>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmation.onConfirm} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : "Confirmer et Voter"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Dialog>
            <ImageViewerModal imageUrl={candidate.photo_url} altText={`Photo de ${candidate.name}`} isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} />
        </>
    );
};

const OwnerView = ({ candidates, totalVotes }) => {
    const sortedCandidates = useMemo(() => [...candidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)), [candidates]);
    const rankColors = ['bg-yellow-400 text-black', 'bg-gray-300 text-black', 'bg-yellow-600 text-white'];

    return (
        <Card className="glass-effect">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChartHorizontal/> Résultats du Concours</CardTitle>
                <CardDescription>Suivez les votes en temps réel. Total de {totalVotes} votes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {sortedCandidates.map((candidate, index) => {
                    const percentage = totalVotes > 0 ? ((candidate.vote_count || 0) / totalVotes) * 100 : 0;
                    return (
                        <motion.div 
                            key={candidate.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rankColors[index] || 'bg-muted'}`}>{index + 1}</span>
                                    {candidate.name}
                                </p>
                                <p className="text-sm text-muted-foreground font-bold">{candidate.vote_count || 0} voix</p>
                            </div>
                            <Progress value={percentage} />
                        </motion.div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

const VotingInterface = ({ event, isUnlocked, isOwner, onRefresh }) => {
    const [candidates, setCandidates] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: candidatesData, error: candidatesError } = await supabase
                .from('candidates')
                .select('*')
                .eq('event_id', event.id)
                .order('created_at');
            if (candidatesError) throw candidatesError;

            const { data: settingsData, error: settingsError } = await supabase
                .from('event_settings')
                .select('*')
                .eq('event_id', event.id)
                .single();
            if (settingsError) throw settingsError;
            
            setCandidates(candidatesData);
            setSettings(settingsData);
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de charger les données du concours', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [event.id]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleVoteSuccess = () => {
        fetchData();
        if (onRefresh) onRefresh();
    };

    const totalVotes = useMemo(() => candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0), [candidates]);
    const sortedCandidates = useMemo(() => [...candidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)), [candidates]);
    const isFinished = settings && new Date() > new Date(settings.end_date);

    if (loading || !settings) return <div className="flex justify-center mt-6"><Loader2 className="animate-spin" /></div>;
    if (!isUnlocked) return null;

    if (isOwner) {
        return <OwnerView candidates={candidates} settings={settings} totalVotes={totalVotes} />;
    }

    return (
        <div className="mt-6 space-y-6">
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Vote className="text-primary"/> Votez pour votre candidat</CardTitle>
                    {isFinished ? (
                         <CardDescription className="text-destructive font-bold">Vote terminé</CardDescription>
                    ) : (
                         <CardDescription>Chaque voix compte ! Le coût d'un vote est de {settings.vote_price_pi}π ({settings.vote_price_fcfa} FCFA).</CardDescription>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {sortedCandidates.map((candidate, index) => (
                        <CandidateCard 
                            key={candidate.id} 
                            candidate={candidate} 
                            totalVotes={totalVotes}
                            votePrice={settings.vote_price_pi}
                            votePriceFcfa={settings.vote_price_fcfa}
                            onVote={handleVoteSuccess}
                            settings={settings}
                            isFinished={isFinished}
                        />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export default VotingInterface;