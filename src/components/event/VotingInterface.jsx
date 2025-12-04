import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Vote, Coins, Plus, Minus, Info, Share2, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import WalletInfoModal from '@/components/WalletInfoModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ImageViewerModal from '@/components/ImageViewerModal';
import { Badge } from '@/components/ui/badge';
import { CoinService } from '@/services/CoinService';

const CandidateCard = ({ candidate, totalVotes, votePrice, votePriceFcfa, onVote, settings, isFinished, index }) => {
    const [voteCount, setVoteCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showWalletInfo, setShowWalletInfo] = useState(false);
    const navigate = useNavigate();
    const [confirmation, setConfirmation] = useState({ isOpen: false, onConfirm: null });
    const { user } = useAuth();
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const votePercentage = totalVotes > 0 ? ((candidate.vote_count || 0) / totalVotes) * 100 : 0;
    
    const totalCostPi = voteCount * votePrice;

    const handleVoteConfirmation = () => {
        setConfirmation({ isOpen: true, onConfirm: () => handleVote() });
    };

    const handleVote = async () => {
        setConfirmation({ isOpen: false, onConfirm: null });
        if (!user) {
            toast({ title: "Connectez-vous", description: "Vous devez être connecté pour voter.", variant: "destructive" });
            navigate('/auth');
            return;
        }

        setLoading(true);
        try {
            // 1. Validate Balance Client-Side first for better UX
            const balance = await CoinService.getUserBalance(user.id);
            console.log(`User balance: ${balance}`);
            console.log(`Vote cost: ${totalCostPi}`);

            if (balance < totalCostPi) {
                console.log("Insufficient coins");
                setShowWalletInfo(true);
                setLoading(false);
                return;
            }

            // 2. Verification via peut_voter (SQL Logic request)
            const { data: canVote, error: checkError } = await supabase.rpc('peut_voter', {
                p_user_id: user.id,
                p_event_id: candidate.event_id
            });

            if (checkError) throw checkError;
            if (!canVote) throw new Error("Vous ne pouvez pas voter (compte restreint ou événement clos).");

            // 3. Execute Vote
            const { data, error } = await supabase.rpc('participate_in_vote', {
                p_event_id: candidate.event_id,
                p_candidate_id: candidate.id,
                p_user_id: user.id,
                p_vote_count: voteCount
            });

            if (error) throw error;

            if (data.success) {
                console.log("Vote successful");
                toast({ 
                    title: "🎉 Vote enregistré !", 
                    description: `Vous avez donné ${voteCount} voix à ${candidate.name}.`,
                    className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                });
                onVote();
            } else {
                toast({ title: "Erreur de vote", description: data.message || "Une erreur est survenue.", variant: "destructive" });
                if (data.message.includes('Solde')) {
                    setShowWalletInfo(true);
                }
            }
        } catch (error) {
            console.error("Vote Error:", error);
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-card border rounded-xl p-5 transition-all duration-300 hover:shadow-md group relative`}
            >
                {index < 3 && (
                    <div className="absolute -top-3 -right-2 z-10">
                        <Badge className={`${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'} text-white border-none shadow-lg`}>
                            #{index + 1}
                        </Badge>
                    </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                    <Avatar 
                        className="w-16 h-16 border-2 border-primary cursor-pointer" 
                        onClick={(e) => { e.stopPropagation(); setIsImageModalOpen(true); }}
                    >
                        <AvatarImage src={candidate.photo_url} alt={candidate.name} />
                        <AvatarFallback className="bg-primary/10 font-bold text-lg">
                            {candidate.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg truncate">{candidate.name}</h4>
                        <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground">
                                <Info className="w-3 h-3 mr-1" /> Détails
                            </Button>
                        </DialogTrigger>
                    </div>
                </div>
                
                {settings.show_live_results && (
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-primary font-bold">{candidate.vote_count || 0} voix</span>
                            <span className="text-muted-foreground">{votePercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={votePercentage} className="h-2" />
                    </div>
                )}
                
                {!isFinished && (
                    <div className="space-y-3 pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg">
                            <Button 
                                variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                                onClick={() => setVoteCount(v => Math.max(1, v - 1))} 
                                disabled={voteCount === 1}
                            >
                                <Minus className="w-3 h-3"/>
                            </Button>
                            <div className="text-center">
                                <span className="font-bold text-lg">{voteCount}</span>
                                <span className="text-[10px] block text-muted-foreground uppercase">Voix</span>
                            </div>
                            <Button 
                                variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                                onClick={() => setVoteCount(v => v + 1)}
                            >
                                <Plus className="w-3 h-3"/>
                            </Button>
                        </div>
                        
                        <Button 
                            onClick={handleVoteConfirmation} 
                            disabled={loading} 
                            className="w-full font-bold"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : `Voter (${totalCostPi}π)`}
                        </Button>
                        <div className="text-center text-xs text-muted-foreground">
                            Soit {totalCostPi * 10} FCFA
                        </div>
                    </div>
                )}
            </motion.div>

            <Dialog>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{candidate.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        <img src={candidate.photo_url || "https://via.placeholder.com/150"} alt={candidate.name} className="w-full max-h-64 object-cover rounded-lg" />
                        <p className="text-center text-muted-foreground">{candidate.description || "Aucune description."}</p>
                    </div>
                </DialogContent>
            </Dialog>

            <WalletInfoModal 
                isOpen={showWalletInfo} 
                onClose={() => setShowWalletInfo(false)} 
                onProceed={() => {
                    console.log("Redirecting to shop");
                    setShowWalletInfo(false); 
                    navigate('/packs');
                }}
            />
            
            <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, onConfirm: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer le vote</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous allez donner {voteCount} voix à {candidate.name} pour un total de {totalCostPi}π ({totalCostPi * 10} FCFA).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmation.onConfirm} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Confirmer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <ImageViewerModal imageUrl={candidate.photo_url} altText={`Photo de ${candidate.name}`} isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} />
        </>
    );
};

const VotingInterface = ({ event, isUnlocked, isOwner, onRefresh }) => {
    const [candidates, setCandidates] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [userBalance, setUserBalance] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: candidatesData, error: candidatesError } = await supabase
                .from('vue_details_candidats')
                .select('*')
                .eq('event_id', event.id)
                .order('ranking_position', { ascending: true });
            
            if (candidatesError) throw candidatesError;

            const { data: settingsData, error: settingsError } = await supabase
                .from('event_settings')
                .select('*')
                .eq('event_id', event.id)
                .single();
            if (settingsError) throw settingsError;
            
            setCandidates(candidatesData);
            setSettings(settingsData);

            if (user) {
                const balance = await CoinService.getUserBalance(user.id);
                setUserBalance(balance);
            }

        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [event.id, user]);
    
    useEffect(() => {
        fetchData();
        
        const channel = supabase
            .channel(`voting-interface-${event.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates', filter: `event_id=eq.${event.id}` }, 
                () => {
                    console.log("Ranking updated (realtime)");
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, event.id]);

    const handleVoteSuccess = () => {
        fetchData(); // Refresh ranking and balance
        if (onRefresh) onRefresh();
    };

    const totalVotes = useMemo(() => candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0), [candidates]);
    const isFinished = settings && new Date() > new Date(settings.end_date);

    if (loading || !settings) return (
        <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
            <span className="text-lg">Chargement du système de vote...</span>
        </div>
    );
    
    if (!isUnlocked) return null;

    return (
        <div className="mt-8 space-y-8">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="text-center pb-4 px-0">
                    <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                        <Vote className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold">
                        {isFinished ? 'Résultats Finaux' : 'Votez pour votre favori'}
                    </CardTitle>
                    <CardDescription className="text-lg">
                        {isFinished 
                            ? `Le concours est terminé avec ${totalVotes} votes !` 
                            : `Chaque voix compte ! Coût du vote : ${settings.vote_price_pi}π`
                        }
                    </CardDescription>
                    
                    {user && !isFinished && (
                        <div className="flex justify-center mt-2">
                            <Badge variant="outline" className="bg-background py-1.5 px-4 border-primary/20 shadow-sm">
                                <Coins className="w-4 h-4 mr-2 text-yellow-500" />
                                <span className="font-semibold">Votre solde: {userBalance} π</span>
                            </Badge>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="px-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {candidates.map((candidate, index) => (
                                <CandidateCard 
                                    key={candidate.id} 
                                    candidate={candidate} 
                                    totalVotes={totalVotes}
                                    votePrice={settings.vote_price_pi}
                                    votePriceFcfa={settings.vote_price_fcfa || settings.vote_price_pi * 10}
                                    onVote={handleVoteSuccess}
                                    settings={settings}
                                    isFinished={isFinished}
                                    index={index}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default VotingInterface;















// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { supabase } from '@/lib/customSupabaseClient';
// import { useAuth } from '@/contexts/SupabaseAuthContext';
// import { toast } from '@/components/ui/use-toast';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Loader2, Vote, Coins, Plus, Minus, BarChartHorizontal, Info, Share2, Award, ChevronsDown, Crown, Zap, Target, Users, TrendingUp, Sparkles, Trophy, Star } from 'lucide-react';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import WalletInfoModal from '@/components/WalletInfoModal';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogDescription,
// } from "@/components/ui/alert-dialog";
// import { Progress } from '@/components/ui/progress';
// import { motion, AnimatePresence } from 'framer-motion';
// import { useNavigate } from 'react-router-dom';
// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
// import ImageViewerModal from '@/components/ImageViewerModal';
// import { Badge } from '@/components/ui/badge';

// const CandidateCard = ({ candidate, totalVotes, votePrice, votePriceFcfa, onVote, settings, isFinished, index }) => {
//     const [voteCount, setVoteCount] = useState(1);
//     const [loading, setLoading] = useState(false);
//     const [showWalletInfo, setShowWalletInfo] = useState(false);
//     const navigate = useNavigate();
//     const [confirmation, setConfirmation] = useState({ isOpen: false, onConfirm: null });
//     const { user } = useAuth();
//     const [isImageModalOpen, setIsImageModalOpen] = useState(false);

//     const votePercentage = totalVotes > 0 ? ((candidate.vote_count || 0) / totalVotes) * 100 : 0;
    
//     const rankColors = [
//         'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
//         'from-gray-400/20 to-gray-500/20 border-gray-400/30',
//         'from-orange-500/20 to-orange-600/20 border-orange-500/30'
//     ];
    
//     const rankIcons = ['🥇', '🥈', '🥉'];
//     const cardGradient = index < 3 ? rankColors[index] : 'from-blue-500/10 to-purple-500/10 border-blue-500/30';
    
//     const handleVoteConfirmation = () => {
//         setConfirmation({ isOpen: true, onConfirm: () => handleVote() });
//     };

//     const handleVote = async () => {
//         setConfirmation({ isOpen: false, onConfirm: null });
//         setLoading(true);
//         try {
//             const { data, error } = await supabase.rpc('participate_in_vote', {
//                 p_event_id: candidate.event_id,
//                 p_candidate_id: candidate.id,
//                 p_user_id: user.id,
//                 p_vote_count: voteCount
//             });

//             if (error) throw error;

//             if (data.success) {
//                 toast({ 
//                     title: "🎉 Vote enregistré !", 
//                     description: `Vous avez donné ${voteCount} voix à ${candidate.name}.`,
//                     className: "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
//                 });
//                 onVote();
//             } else {
//                 toast({ title: "Erreur de vote", description: data.message || "Une erreur est survenue.", variant: "destructive" });
//                 if (data.message.includes('Solde')) {
//                     setShowWalletInfo(true);
//                 }
//             }
//         } catch (error) {
//             toast({ title: "Erreur", description: error.message, variant: "destructive" });
//         } finally {
//             setLoading(false);
//         }
//     };
    
//     const totalCostPi = voteCount * votePrice;
//     const totalCostFcfa = voteCount * votePriceFcfa;

//     const shareCandidate = () => {
//         const shareUrl = `${window.location.origin}/event/${candidate.event_id}?candidate=${candidate.id}`;
//         if (navigator.share) {
//             navigator.share({
//                 title: `Votez pour ${candidate.name}`,
//                 text: `Soutenez ${candidate.name} dans le concours sur BonPlanInfos !`,
//                 url: shareUrl,
//             });
//         } else {
//             navigator.clipboard.writeText(shareUrl);
//             toast({ title: 'Lien copié', description: 'Le lien de vote pour ce candidat a été copié.' });
//         }
//     };

//     return (
//         <>
//             <motion.div
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: index * 0.1 }}
//                 className={`bg-gradient-to-br ${cardGradient} border-2 rounded-xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-lg group`}
//             >
//                 <div className="flex items-start justify-between mb-4">
//                     <div className="flex items-center gap-4">
//                         <div className="relative">
//                             <Avatar 
//                                 className="w-16 h-16 border-2 border-primary cursor-pointer shadow-lg group-hover:shadow-xl transition-all" 
//                                 onClick={(e) => { e.stopPropagation(); setIsImageModalOpen(true); }}
//                             >
//                                 <AvatarImage src={candidate.photo_url} alt={candidate.name} />
//                                 <AvatarFallback className="text-xl font-bold bg-primary/20">
//                                     {candidate.name.charAt(0)}
//                                 </AvatarFallback>
//                             </Avatar>
//                             {index < 3 && (
//                                 <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
//                                     <span className="text-lg">{rankIcons[index]}</span>
//                                 </div>
//                             )}
//                         </div>
//                         <DialogTrigger asChild>
//                             <div className="cursor-pointer flex-grow">
//                                 <h4 className="font-bold text-xl group-hover:text-primary transition-colors">
//                                     {candidate.name}
//                                 </h4>
//                                 <p className="text-blue-400 hover:underline font-medium flex items-center gap-1 mt-1">
//                                     <Info className="w-4 h-4" />
//                                     Voir les détails
//                                 </p>
//                             </div>
//                         </DialogTrigger>
//                     </div>
//                     <Button variant="ghost" size="icon" onClick={shareCandidate} className="rounded-full border-2">
//                         <Share2 className="w-5 h-5" />
//                     </Button>
//                 </div>
                
//                 {/* Barre de progression et statistiques */}
//                 {settings.show_live_results && (
//                     <div className="space-y-3 mb-4">
//                         <div className="flex justify-between text-sm font-medium">
//                             <span className="text-green-600 flex items-center gap-1">
//                                 <TrendingUp className="w-4 h-4" />
//                                 {candidate.vote_count || 0} voix
//                             </span>
//                             <span className="text-primary font-bold">{votePercentage.toFixed(1)}%</span>
//                         </div>
//                         <Progress value={votePercentage} className="h-3 bg-muted/50" />
//                     </div>
//                 )}
                
//                 {/* Section de vote */}
//                 {!isFinished && (
//                     <div className="space-y-4 pt-3 border-t border-white/20">
//                         <div className="flex items-center justify-between">
//                             <div className="text-center">
//                                 <p className="text-2xl font-bold text-primary flex items-center gap-1">
//                                     {totalCostPi} <Coins className="w-5 h-5" />
//                                 </p>
//                                 <p className="text-sm text-muted-foreground">
//                                     {totalCostFcfa?.toLocaleString()} FCFA
//                                 </p>
//                             </div>
                            
//                             <div className="flex items-center gap-3">
//                                 <Button 
//                                     variant="outline" 
//                                     size="icon" 
//                                     onClick={() => setVoteCount(v => Math.max(1, v - 1))} 
//                                     disabled={voteCount === 1}
//                                     className="rounded-full border-2"
//                                 >
//                                     <Minus className="w-4 h-4"/>
//                                 </Button>
//                                 <span className="font-bold text-lg w-8 text-center bg-white/20 rounded-lg py-1">
//                                     {voteCount}
//                                 </span>
//                                 <Button 
//                                     variant="outline" 
//                                     size="icon" 
//                                     onClick={() => setVoteCount(v => v + 1)}
//                                     className="rounded-full border-2"
//                                 >
//                                     <Plus className="w-4 h-4"/>
//                                 </Button>
//                             </div>
//                         </div>
                        
//                         <Button 
//                             onClick={handleVoteConfirmation} 
//                             disabled={loading} 
//                             className="w-full py-3 font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
//                         >
//                             {loading ? (
//                                 <Loader2 className="animate-spin w-5 h-5" />
//                             ) : (
//                                 <div className="flex items-center gap-2">
//                                     <Sparkles className="w-5 h-5 animate-pulse" />
//                                     SOUTENIR CE CANDIDAT
//                                     <Sparkles className="w-5 h-5 animate-pulse" />
//                                 </div>
//                             )}
//                         </Button>
//                     </div>
//                 )}

//                 {/* Message d'encouragement pour les premiers */}
//                 {index < 3 && totalVotes > 0 && (
//                     <div className="mt-3 p-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
//                         <p className="text-xs text-yellow-700 text-center font-medium flex items-center justify-center gap-1">
//                             <Target className="w-3 h-3" />
//                             {index === 0 ? 'Leader du concours !' : index === 1 ? 'Très bien placé !' : 'Sur le podium !'}
//                         </p>
//                     </div>
//                 )}
//             </motion.div>

//             {/* Modal de détails du candidat */}
//             <Dialog>
//                 <DialogContent className="sm:max-w-[500px] bg-background/90 backdrop-blur-sm border-2 border-primary/20 shadow-2xl">
//                     <DialogHeader>
//                         <div className="flex justify-center mb-4">
//                             <Avatar className="w-28 h-28 border-4 border-primary shadow-xl">
//                                 <AvatarImage src={candidate.photo_url} alt={candidate.name} />
//                                 <AvatarFallback className="text-4xl">{candidate.name.charAt(0)}</AvatarFallback>
//                             </Avatar>
//                         </div>
//                         <DialogTitle className="text-center text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
//                             {candidate.name}
//                         </DialogTitle>
//                         {index < 3 && (
//                             <div className="text-center">
//                                 <Badge className={`text-lg py-2 px-4 ${
//                                     index === 0 ? 'bg-yellow-500' : 
//                                     index === 1 ? 'bg-gray-400' : 'bg-orange-500'
//                                 } text-white`}>
//                                     {rankIcons[index]} {index === 0 ? 'PREMIER' : index === 1 ? 'DEUXIÈME' : 'TROISIÈME'}
//                                 </Badge>
//                             </div>
//                         )}
//                     </DialogHeader>
//                     <div className="py-4 space-y-4">
//                         <Accordion type="single" collapsible className="w-full">
//                           <AccordionItem value="description" className="border-2 rounded-lg">
//                             <AccordionTrigger className="px-4 hover:no-underline">
//                                 <span className="flex items-center gap-3 text-lg font-semibold text-primary">
//                                     <Info className="w-5 h-5" />
//                                     Présentation
//                                     <ChevronsDown className="w-5 h-5" />
//                                 </span>
//                             </AccordionTrigger>
//                             <AccordionContent className="px-4 pb-4 text-muted-foreground leading-relaxed">
//                                 {candidate.description || "Ce candidat n'a pas encore partagé sa présentation."}
//                             </AccordionContent>
//                           </AccordionItem>
//                         </Accordion>
                        
//                         {/* Statistiques du candidat */}
//                         <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
//                             <div className="text-center">
//                                 <p className="text-2xl font-bold text-primary">{candidate.vote_count || 0}</p>
//                                 <p className="text-sm text-muted-foreground">Voix totales</p>
//                             </div>
//                             <div className="text-center">
//                                 <p className="text-2xl font-bold text-green-600">{votePercentage.toFixed(1)}%</p>
//                                 <p className="text-sm text-muted-foreground">Du total</p>
//                             </div>
//                         </div>
                        
//                         <p className="text-center text-lg italic text-primary font-medium">
//                             "Merci pour votre soutien !"
//                         </p>
//                     </div>
//                 </DialogContent>
//             </Dialog>

//             <WalletInfoModal isOpen={showWalletInfo} onClose={() => setShowWalletInfo(false)} onProceed={() => {setShowWalletInfo(false); navigate('/packs');}}/>
            
//             {/* Modal de confirmation de vote */}
//             <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, onConfirm: null })}>
//                 <AlertDialogContent className="border-2 border-primary/20 shadow-2xl">
//                     <AlertDialogHeader>
//                         <AlertDialogTitle className="flex items-center justify-center gap-2 text-xl text-center">
//                             <Crown className="w-6 h-6 text-yellow-500" />
//                             Confirmer votre soutien ?
//                             <Crown className="w-6 h-6 text-yellow-500" />
//                         </AlertDialogTitle>
//                         <AlertDialogDescription>
//                             <div className="flex flex-col items-center justify-center text-center p-4 space-y-4">
//                                 <div className="p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full">
//                                     <Vote className="w-12 h-12 text-green-500" />
//                                 </div>
//                                 <p className="text-lg font-medium">
//                                     Vous investissez <strong className="text-2xl text-primary">{totalCostPi}π</strong>
//                                 </p>
//                                 <p className="text-sm text-muted-foreground">
//                                     Équivalent à {totalCostFcfa?.toLocaleString('fr-FR')} FCFA
//                                 </p>
                                
//                                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm w-full">
//                                     <div className="flex items-start gap-2">
//                                         <Star className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
//                                         <div className="text-left">
//                                             <p className="font-medium text-blue-900">✨ Votre vote compte !</p>
//                                             <p className="text-blue-700 mt-1">
//                                                 En votant pour {candidate.name}, vous participez activement au concours et soutenez votre candidat préféré. 
//                                                 Chaque voix rapproche un peu plus votre favori de la victoire !
//                                             </p>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <div className="grid grid-cols-2 gap-3 w-full text-xs">
//                                     <div className="text-center p-2 bg-green-50 rounded border border-green-200">
//                                         <p className="font-semibold text-green-700">🎯 Voix données</p>
//                                         <p className="text-green-600">{voteCount}</p>
//                                     </div>
//                                     <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
//                                         <p className="font-semibold text-purple-700">🌟 Soutien communauté</p>
//                                         <p className="text-purple-600">Actif</p>
//                                     </div>
//                                 </div>
//                             </div>
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter className="flex gap-3">
//                         <AlertDialogCancel className="flex-1 border-2">Retour</AlertDialogCancel>
//                         <AlertDialogAction 
//                             onClick={confirmation.onConfirm} 
//                             disabled={loading}
//                             className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
//                         >
//                             {loading ? (
//                                 <Loader2 className="animate-spin w-4 h-4" />
//                             ) : (
//                                 <div className="flex items-center gap-2">
//                                     <Sparkles className="w-4 h-4" />
//                                     Confirmer le vote
//                                     <Sparkles className="w-4 h-4" />
//                                 </div>
//                             )}
//                         </AlertDialogAction>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>
            
//             <ImageViewerModal imageUrl={candidate.photo_url} altText={`Photo de ${candidate.name}`} isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} />
//         </>
//     );
// };

// const OwnerView = ({ candidates, totalVotes, settings }) => {
//     const sortedCandidates = useMemo(() => [...candidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)), [candidates]);
//     const rankColors = ['bg-yellow-400 text-black', 'bg-gray-300 text-black', 'bg-yellow-600 text-white'];

//     return (
//         <Card className="glass-effect border-2 border-primary/30 shadow-xl">
//             <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
//                 <CardTitle className="flex items-center gap-3 text-2xl">
//                     <Crown className="w-7 h-7 text-yellow-500" />
//                     Tableau de Bord du Concours
//                     <Crown className="w-7 h-7 text-yellow-500" />
//                 </CardTitle>
//                 <CardDescription className="text-base">
//                     Suivez les votes en temps réel - {totalVotes} votes au total
//                 </CardDescription>
//             </CardHeader>
//             <CardContent className="p-6 space-y-6">
//                 {/* Statistiques */}
//                 <div className="grid grid-cols-2 gap-4">
//                     <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl text-center border border-green-500/20">
//                         <p className="text-2xl font-bold text-green-600">{totalVotes}</p>
//                         <p className="text-sm text-muted-foreground font-medium">🗳️ Votes Totaux</p>
//                     </div>
//                     <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl text-center border border-blue-500/20">
//                         <p className="text-2xl font-bold text-blue-600">{candidates.length}</p>
//                         <p className="text-sm text-muted-foreground font-medium">👥 Candidats</p>
//                     </div>
//                 </div>

//                 {/* Classement */}
//                 <div className="space-y-4">
//                     <h4 className="font-semibold text-lg flex items-center gap-2">
//                         <Trophy className="w-5 h-5 text-yellow-500" />
//                         Classement en Direct
//                     </h4>
//                     {sortedCandidates.map((candidate, index) => {
//                         const percentage = totalVotes > 0 ? ((candidate.vote_count || 0) / totalVotes) * 100 : 0;
//                         return (
//                             <motion.div 
//                                 key={candidate.id}
//                                 initial={{ opacity: 0, x: -20 }}
//                                 animate={{ opacity: 1, x: 0 }}
//                                 transition={{ delay: index * 0.1 }}
//                                 className="p-4 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl border border-blue-500/10 hover:border-blue-500/20 transition-all"
//                             >
//                                 <div className="flex justify-between items-center mb-3">
//                                     <div className="flex items-center gap-3">
//                                         <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rankColors[index] || 'bg-muted'} shadow-lg`}>
//                                             {index + 1}
//                                         </span>
//                                         <div className="flex items-center gap-2">
//                                             <Avatar className="w-8 h-8">
//                                                 <AvatarImage src={candidate.photo_url} alt={candidate.name} />
//                                                 <AvatarFallback className="text-xs">{candidate.name.charAt(0)}</AvatarFallback>
//                                             </Avatar>
//                                             <p className="font-semibold text-lg">{candidate.name}</p>
//                                         </div>
//                                     </div>
//                                     <p className="text-lg font-bold text-primary">{candidate.vote_count || 0} voix</p>
//                                 </div>
//                                 <div className="space-y-2">
//                                     <div className="flex justify-between text-sm font-medium">
//                                         <span className="text-green-600">{percentage.toFixed(1)}% du total</span>
//                                         <span className="text-muted-foreground">{candidate.vote_count || 0}/{totalVotes}</span>
//                                     </div>
//                                     <Progress value={percentage} className="h-2 bg-muted/50" />
//                                 </div>
//                             </motion.div>
//                         );
//                     })}
//                 </div>
//             </CardContent>
//         </Card>
//     );
// }

// const VotingInterface = ({ event, isUnlocked, isOwner, onRefresh }) => {
//     const [candidates, setCandidates] = useState([]);
//     const [settings, setSettings] = useState(null);
//     const [loading, setLoading] = useState(true);

//     const fetchData = useCallback(async () => {
//         setLoading(true);
//         try {
//             const { data: candidatesData, error: candidatesError } = await supabase
//                 .from('candidates')
//                 .select('*')
//                 .eq('event_id', event.id)
//                 .order('created_at');
//             if (candidatesError) throw candidatesError;

//             const { data: settingsData, error: settingsError } = await supabase
//                 .from('event_settings')
//                 .select('*')
//                 .eq('event_id', event.id)
//                 .single();
//             if (settingsError) throw settingsError;
            
//             setCandidates(candidatesData);
//             setSettings(settingsData);
//         } catch (error) {
//             toast({ title: 'Erreur', description: 'Impossible de charger les données du concours', variant: "destructive" });
//         } finally {
//             setLoading(false);
//         }
//     }, [event.id]);
    
//     useEffect(() => {
//         fetchData();
//     }, [fetchData]);

//     const handleVoteSuccess = () => {
//         fetchData();
//         if (onRefresh) onRefresh();
//     };

//     const totalVotes = useMemo(() => candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0), [candidates]);
//     const sortedCandidates = useMemo(() => [...candidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)), [candidates]);
//     const isFinished = settings && new Date() > new Date(settings.end_date);

//     if (loading || !settings) return (
//         <div className="flex justify-center items-center py-12">
//             <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
//             <span className="text-lg">Chargement du concours...</span>
//         </div>
//     );
    
//     if (!isUnlocked) return null;

//     if (isOwner) {
//         return <OwnerView candidates={candidates} settings={settings} totalVotes={totalVotes} />;
//     }

//     return (
//         <div className="mt-8 space-y-8">
//             {/* En-tête motivante */}
//             <div className="text-center space-y-3">
//                 <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
//                     👑 CONCOURS EXCEPTIONNEL 👑
//                 </h2>
//                 <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
//                     Soutenez votre candidat préféré et aidez-le à remporter la victoire !
//                 </p>
//                 {!isFinished && (
//                     <div className="flex justify-center gap-4 text-sm text-muted-foreground">
//                         <span className="flex items-center gap-1">🎯 1 vote = {settings.vote_price_pi}π</span>
//                         <span className="flex items-center gap-1">🌟 Résultats en direct</span>
//                         <span className="flex items-center gap-1">💫 Votre voix compte !</span>
//                     </div>
//                 )}
//             </div>

//             {/* Interface principale */}
//             <Card className="glass-effect border-2 border-primary/20 shadow-xl">
//                 <CardHeader className="text-center pb-4">
//                     <div className="flex justify-center mb-3">
//                         <div className="relative">
//                             <Crown className="w-10 h-10 text-yellow-500" />
//                             <Sparkles className="w-5 h-5 text-pink-500 absolute -top-1 -right-1 animate-pulse" />
//                         </div>
//                     </div>
//                     <CardTitle className="flex items-center justify-center gap-3 text-2xl">
//                         <Target className="w-6 h-6 text-red-500" />
//                         {isFinished ? 'RÉSULTATS FINAUX' : 'VOTEZ MAINTENANT !'}
//                         <Target className="w-6 h-6 text-red-500" />
//                     </CardTitle>
//                     {isFinished ? (
//                         <CardDescription className="text-lg text-destructive font-bold">
//                             Le concours est terminé - Merci à tous les participants !
//                         </CardDescription>
//                     ) : (
//                         <CardDescription className="text-lg">
//                             Chaque voix rapproche votre candidat de la victoire ! 
//                             <span className="font-bold text-primary ml-2">1 vote = {settings.vote_price_pi}π ({settings.vote_price_fcfa} FCFA)</span>
//                         </CardDescription>
//                     )}
//                 </CardHeader>
//                 <CardContent className="space-y-6">
//                     {/* Statistiques globales */}
//                     <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
//                         <div className="text-center">
//                             <p className="text-2xl font-bold text-primary">{totalVotes}</p>
//                             <p className="text-sm text-muted-foreground">Votes totaux</p>
//                         </div>
//                         <div className="text-center">
//                             <p className="text-2xl font-bold text-green-600">{candidates.length}</p>
//                             <p className="text-sm text-muted-foreground">Candidats</p>
//                         </div>
//                     </div>

//                     {/* Liste des candidats */}
//                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                         <AnimatePresence>
//                             {sortedCandidates.map((candidate, index) => (
//                                 <CandidateCard 
//                                     key={candidate.id} 
//                                     candidate={candidate} 
//                                     totalVotes={totalVotes}
//                                     votePrice={settings.vote_price_pi}
//                                     votePriceFcfa={settings.vote_price_fcfa}
//                                     onVote={handleVoteSuccess}
//                                     settings={settings}
//                                     isFinished={isFinished}
//                                     index={index}
//                                 />
//                             ))}
//                         </AnimatePresence>
//                     </div>

//                     {/* Message d'encouragement */}
//                     {!isFinished && (
//                         <div className="text-center p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
//                             <p className="font-bold text-lg flex items-center justify-center gap-2">
//                                 <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
//                                 VOTRE VOTE PEUT TOUT CHANGER !
//                                 <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
//                             </p>
//                             <p className="text-sm text-muted-foreground mt-2">
//                                 Chaque voix compte dans cette compétition serrée. Soutenez votre favori sans attendre !
//                             </p>
//                         </div>
//                     )}
//                 </CardContent>
//             </Card>
//         </div>
//     );
// };

// export default VotingInterface;