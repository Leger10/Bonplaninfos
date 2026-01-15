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

const CandidateCard = ({ candidate, totalVotes, votePrice, onVote, isFinished, isSelected, onSelect, event, rank, isClosed }) => {
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

    // Logique SIMPLE et CORRECTE
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
        if (!user) { navigate('/auth'); return; }
        setLoading(true);
        try {
            const { data: userData, error: userError } = await supabase.from('profiles').select('coin_balance').eq('id', user.id).single();
            if (userError) throw userError;

            if ((userData?.coin_balance || 0) < totalCostPi) {
                setShowWalletInfo(true);
                setLoading(false);
                return;
            }

            const { data: voteResult, error: rpcError } = await supabase.rpc('cast_vote', {
                p_user_id: user.id,
                p_candidate_id: candidate.id,
                p_vote_count: voteCount
            });

            if (rpcError) throw new Error(rpcError.message);
            let result = Array.isArray(voteResult) ? voteResult[0] : voteResult;
            if (!result?.success) throw new Error(result?.message || "Erreur");

            toast({ title: "🎉 Vote enregistré !", description: `Vous avez donné ${voteCount} voix à ${candidate.name}.` });
            setCandidateVoteCount(prev => prev + voteCount);
            onVote();
        } catch (error) {
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally { setLoading(false); }
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
                    <AlertDialogHeader><AlertDialogTitle>Confirmer le vote</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Voter pour {candidate.name} ({voteCount} voix) pour {totalCostPi}pièces (pièces achetées uniquement)?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel className="text-black">Annuler</AlertDialogCancel><AlertDialogAction onClick={confirmation.onConfirm} className="bg-emerald-600 text-white">Confirmer</AlertDialogAction></AlertDialogFooter>
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

    // Filtering State for Main List
    const [selectedCategory, setSelectedCategory] = useState('Tous');
    const [availableCategories, setAvailableCategories] = useState(['Tous']);

    // Filtering State for Ranking
    const [rankingFilter, setRankingFilter] = useState('Tous');

    const fetchData = useCallback(async () => {
        const { data: cData } = await supabase.from('candidates').select('*').eq('event_id', event.id).order('vote_count', { ascending: false });
        const { data: sData } = await supabase.from('event_settings').select('*').eq('event_id', event.id).single();
        
        if (user) {
            const { data: uData } = await supabase.from('profiles').select('coin_balance').eq('id', user.id).single();
            setUserPaidBalance(uData?.coin_balance || 0);
        }

        if (cData) {
            setCandidates(cData);
            const cats = [...new Set(cData.map(c => c.category).filter(Boolean))];
            if (cats.length > 0) {
                setAvailableCategories(['Tous', ...cats.sort()]);
            }
        }
        
        // Settings with Defaults
        const settingsData = sData || { vote_price_pi: 1, end_date: new Date(Date.now() + 86400000).toISOString() };
        setSettings(settingsData);
        
        // Vérification de la date de fin
        const now = new Date();
        const endDate = new Date(settingsData.end_date);
        const isExpired = now.getTime() > endDate.getTime();
        
        setIsVoteFinished(isExpired);
        
    }, [event.id, user]);

    useEffect(() => { 
        console.log(`[VotingInterface] fetchData triggered. isClosed: ${isClosed}`);
        fetchData(); 
    }, [fetchData, isClosed]);

    // Periodically re-check timer status
    useEffect(() => {
        if (!settings?.end_date) return;
        
        const interval = setInterval(() => {
            const endDate = new Date(settings.end_date);
            const now = new Date();
            const isExpired = now.getTime() > endDate.getTime();
            
            if (isExpired !== isVoteFinished) {
                setIsVoteFinished(isExpired);
            }
        }, 5000);
        
        return () => clearInterval(interval);
    }, [settings?.end_date, isVoteFinished]);

    const handleCheckout = async () => {
        // Logique SIMPLE
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
        
        try {
            for (const item of cartItems) {
                await supabase.rpc('cast_vote', { 
                    p_user_id: user.id, 
                    p_candidate_id: item.candidate.id, 
                    p_vote_count: item.quantity 
                });
            }
            toast({ title: "Succès", description: "Votes du panier enregistrés!" });
            setCartItems([]);
            fetchData();
            if (onRefresh) onRefresh();
        } catch (e) { 
            toast({ title: "Erreur", description: e.message }); 
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

    // Filter for Ranking Tab
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
        
        // Colors
        const primaryColor = [16, 185, 129]; // Emerald 500
        const secondaryColor = [75, 85, 99]; // Gray 600
        const accentColor = [234, 179, 8]; // Yellow 500 (Gold)
        
        // --- HEADER ---
        // Green Banner
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');
        
        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(pdfTitle, 105, 20, { align: 'center' });
        
        // Event Name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(event.title.toUpperCase(), 105, 30, { align: 'center' });
        
        // --- METADATA ---
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        doc.text(`Généré le : ${dateStr}`, 14, 50);
        if (type !== 'general' && type !== 'category_best') {
            doc.text(`Catégorie : ${rankingFilter}`, 14, 55);
        }
        doc.text(`Total Votes : ${totalVotes}`, 14, 60);
        
        // --- TABLE HEADER ---
        let y = 70;
        const colX = { rank: 15, name: 40, cat: 110, votes: 160, share: 190 };
        
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 6, 182, 9, 'F'); // Header bg
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...secondaryColor);
        doc.setFontSize(9);
        doc.text("RANG", colX.rank, y);
        doc.text("CANDIDAT", colX.name, y);
        doc.text("CATÉGORIE", colX.cat, y);
        doc.text("VOTES", colX.votes, y, { align: 'right' });
        doc.text("SCORE", colX.share, y, { align: 'right' });
        
        y += 10;
        
        // --- ROWS ---
        listToExport.forEach((c, index) => {
            // Page Break
            if (y > 275) {
                doc.addPage();
                y = 20; 
                // Re-draw minimalist header on new page
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`${pdfTitle} - ${event.title} (Suite)`, 14, 10);
            }
            
            const rank = index + 1;
            const share = totalVotes > 0 ? ((c.vote_count || 0) / totalVotes * 100).toFixed(1) : "0.0";
            
            // Highlight Top 3 with background
            if (rank <= 3) {
                doc.setFillColor(rank === 1 ? 255 : 250, rank === 1 ? 248 : 250, rank === 1 ? 220 : 250); // Very light gold/gray
                doc.setDrawColor(rank === 1 ? accentColor[0] : 220, rank === 1 ? accentColor[1] : 220, rank === 1 ? 0 : 220);
                doc.rect(14, y - 6, 182, 10, 'FD'); // Fill and Draw
            }
            
            // Rank
            doc.setFontSize(10);
            if (rank === 1) doc.setTextColor(...accentColor);
            else if (rank === 2) doc.setTextColor(150, 150, 150);
            else if (rank === 3) doc.setTextColor(165, 80, 30);
            else doc.setTextColor(0, 0, 0);
            
            doc.setFont('helvetica', 'bold');
            doc.text(`#${rank}`, colX.rank, y);
            
            // Name
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(c.name, colX.name, y);
            
            // Category
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(c.category || '-', colX.cat, y);
            
            // Votes
            doc.setTextColor(0, 0, 0);
            doc.text((c.vote_count || 0).toString(), colX.votes, y, { align: 'right' });
            
            // Share
            doc.setTextColor(...primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.text(share + "%", colX.share, y, { align: 'right' });
            
            // Line separator
            doc.setDrawColor(230, 230, 230);
            doc.line(14, y + 4, 196, y + 4);
            
            y += 12;
        });
        
        // Footer
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
                {user && <Badge variant="outline" className="text-amber-400 border-amber-400 bg-amber-950/20 px-3 py-1"><Coins className="w-3 h-3 mr-2" /> Solde Acheté: {userPaidBalance}pièces</Badge>}
            </div>

            {settings && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CountdownTimer endDate={settings.end_date} onTimerEnd={() => setIsVoteFinished(true)} />
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
                                <span>{settings.start_date ? new Date(settings.start_date).toLocaleDateString() : 'Immédiat'}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-300">
                                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="w-16 text-gray-500">Fin:</span>
                                <span className="text-white font-medium">{new Date(settings.end_date).toLocaleDateString()} à {new Date(settings.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
                            {/* Search & Filter Bar */}
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
                                            onVote={() => { fetchData(); if (onRefresh) onRefresh(); }}
                                            isFinished={isVoteFinished}
                                            index={idx}
                                            isSelected={cartItems.some(i => i.candidate.id === c.id)}
                                            onSelect={(cand, qty) => setCartItems(p => [...p, { candidate: cand, quantity: qty, price: settings?.vote_price_pi }])}
                                            event={event}
                                            rank={getRank(c.id)}
                                            isClosed={isClosed} // Utilisation DIRECTE de la prop
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
                        <CardHeader><CardTitle className="text-white text-lg flex items-center"><ShoppingCart className="mr-2" /> Panier ({cartItems.length})</CardTitle></CardHeader>
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
        </div>
    );
};

export default VotingInterface;