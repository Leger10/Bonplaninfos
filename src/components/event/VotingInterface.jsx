import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Vote, Coins, Plus, Minus, ShoppingCart, Trophy, Crown, Eye, CheckCircle, BarChart3, UserCircle, Target, Share2, RefreshCw, Download, FileText, Filter, File } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WalletInfoModal from '@/components/WalletInfoModal';
import jsPDF from 'jspdf';

const Separator = ({ className = "", orientation = "horizontal", ...props }) => (
  <div className={`${orientation === "horizontal" ? "w-full h-[1px]" : "h-full w-[1px]"} bg-gray-700 ${className}`} {...props} />
);

const CountdownTimer = ({ endDate, onTimerEnd }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
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
        {[{v: timeLeft.days, l: 'J'}, {v: timeLeft.hours, l: 'H'}, {v: timeLeft.minutes, l: 'M'}, {v: timeLeft.seconds, l: 'S'}].map((i, idx) => (
          <div key={idx} className="bg-gradient-to-b from-blue-600 to-cyan-500 p-3 rounded-xl shadow-lg min-w-[60px]"><div className="text-2xl font-bold text-white">{i.v}</div><div className="text-xs text-white/80">{i.l}</div></div>
        ))}
      </div>
    </div>
  );
};

const CandidateCard = ({ candidate, totalVotes, votePrice, onVote, settings, isFinished, index, isSelected, onSelect, event, rank }) => {
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

    useEffect(() => { setCandidateVoteCount(candidate.vote_count || 0); }, [candidate.vote_count]);

    const handleVote = async () => {
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-4 ${isSelected ? 'ring-2 ring-emerald-500' : ''} relative overflow-hidden`}>
                {candidate.category && candidate.category !== 'Général' && (
                    <div className="absolute top-0 right-0">
                        <Badge variant="secondary" className="bg-emerald-900/80 text-emerald-200 border-0 rounded-bl-xl rounded-tr-none text-[10px] px-2">
                            {candidate.category}
                        </Badge>
                    </div>
                )}

                <div className="flex items-start gap-3 mb-3 mt-2">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500/50 cursor-pointer shrink-0" onClick={() => setShowDetails(true)}>
                        <img src={candidate.photo_url || "/api/placeholder/64/64"} alt={candidate.name} className="w-full h-full object-cover transition-transform hover:scale-110" />
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
                {!isFinished && (
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
                            <Button onClick={() => setConfirmation({ isOpen: true, onConfirm: handleVote })} disabled={loading} size="sm" className="col-span-5 bg-emerald-600 hover:bg-emerald-700 text-xs text-white border-0">
                                {loading ? <Loader2 className="animate-spin w-3 h-3" /> : `Voter ${totalCostPi}π`}
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
            
            {/* Candidate Detail Modal */}
            <AlertDialog open={showDetails} onOpenChange={setShowDetails}>
                <AlertDialogContent className="bg-gradient-to-b from-gray-900 to-gray-950 border-gray-700 max-w-sm">
                    <AlertDialogHeader>
                        <div className="relative mx-auto mb-4">
                            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500">
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

                            <div className="p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-xl">
                                <p className="text-emerald-200 font-medium italic">
                                    "Votez pour moi et aidez-moi à atteindre la première place ! Chaque voix compte."
                                </p>
                            </div>
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
                    <AlertDialogHeader><AlertDialogTitle>Confirmer le vote</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Voter pour {candidate.name} ({voteCount} voix) pour {totalCostPi}π (pièces achetées uniquement)?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel className="text-black">Annuler</AlertDialogCancel><AlertDialogAction onClick={confirmation.onConfirm} className="bg-emerald-600 text-white">Confirmer</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const VotingInterface = ({ event, isUnlocked, onRefresh }) => {
    const [candidates, setCandidates] = useState([]);
    const [settings, setSettings] = useState(null);
    const { user } = useAuth();
    const [userPaidBalance, setUserPaidBalance] = useState(0);
    const [cartItems, setCartItems] = useState([]);
    const [activeTab, setActiveTab] = useState('candidates');
    
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
        setSettings(sData || { vote_price_pi: 1, end_date: new Date(Date.now() + 86400000).toISOString() });
    }, [event.id, user]);
    
    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCheckout = async () => {
        if (!user) return;
        try {
            for (const item of cartItems) {
                await supabase.rpc('cast_vote', { p_user_id: user.id, p_candidate_id: item.candidate.id, p_vote_count: item.quantity });
            }
            toast({ title: "Succès", description: "Votes du panier enregistrés!" });
            setCartItems([]);
            fetchData();
            if (onRefresh) onRefresh();
        } catch (e) { toast({ title: "Erreur", description: e.message }); }
    };

    const totalVotes = candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);
    
    const filteredCandidates = useMemo(() => {
        if (selectedCategory === 'Tous') return candidates;
        return candidates.filter(c => c.category === selectedCategory);
    }, [candidates, selectedCategory]);

    const sortedCandidates = useMemo(() => {
        return [...candidates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    }, [candidates]);

    const getRank = (id) => sortedCandidates.findIndex(c => c.id === id) + 1;

    // Filter for Ranking Tab
    const rankedCandidatesFiltered = useMemo(() => {
        if (rankingFilter === 'Tous') return sortedCandidates;
        // When filtering by category in ranking, we sort only candidates within that category
        return candidates.filter(c => c.category === rankingFilter).sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    }, [candidates, rankingFilter, sortedCandidates]);

    const generateRankingPDF = () => {
        const doc = new jsPDF();
        
        // Filter list based on current ranking filter
        const listToExport = rankedCandidatesFiltered;
        
        doc.setFillColor(16, 185, 129); // Emerald 500
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("CLASSEMENT OFFICIEL", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(event.title.toUpperCase() + (rankingFilter !== 'Tous' ? ` - CATÉGORIE: ${rankingFilter.toUpperCase()}` : ''), 105, 30, { align: 'center' });
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR')}`, 105, 50, { align: 'center' });

        let y = 60;
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(200, 200, 200);
        doc.rect(15, y, 180, 10, 'FD');
        
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text("RANG", 25, y + 7);
        doc.text("CANDIDAT", 60, y + 7);
        doc.text("CATÉGORIE", 110, y + 7);
        doc.text("VOTES", 160, y + 7, { align: 'right' });
        doc.text("SCORE", 190, y + 7, { align: 'right' });
        
        y += 10;

        doc.setFont('helvetica', 'normal');
        
        listToExport.forEach((candidate, index) => {
            // For percentages, we can use total votes of the filtered list or total global. 
            // Usually global context is preferred but if "Ranking by Category", percentages should likely be relative to that category total or global? 
            // Let's stick to Global Total for consistency or category total. 
            // Here using Global Total for percentage to show overall impact.
            const percentage = totalVotes > 0 ? ((candidate.vote_count || 0) / totalVotes * 100).toFixed(1) : "0.0";
            const rank = index + 1;
            
            if (index % 2 === 1) {
                doc.setFillColor(250, 250, 250);
                doc.rect(15, y, 180, 12, 'F');
            }
            
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            doc.setFont('helvetica', 'bold');
            if (rank === 1) doc.setTextColor(212, 175, 55); 
            else if (rank === 2) doc.setTextColor(120, 120, 120); 
            else if (rank === 3) doc.setTextColor(165, 80, 30); 
            else doc.setTextColor(50, 50, 50);
            
            doc.text(`#${rank}`, 25, y + 8);
            
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(candidate.name, 60, y + 8);
            
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(candidate.category || '-', 110, y + 8);

            doc.setTextColor(80, 80, 80);
            doc.text(`${candidate.vote_count || 0}`, 160, y + 8, { align: 'right' });
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text(`${percentage}%`, 190, y + 8, { align: 'right' });
            
            doc.setDrawColor(230, 230, 230);
            doc.line(15, y + 12, 195, y + 12);
            
            y += 12;
        });
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Document généré par BonPlanInfos - Système de Vote Sécurisé", 105, 290, { align: 'center' });

        doc.save(`classement-${rankingFilter === 'Tous' ? 'general' : rankingFilter.toLowerCase()}-${event.title.substring(0, 10).replace(/[^a-z0-9]/gi, '_')}.pdf`);
        toast({ title: "PDF généré", description: "Le classement a été téléchargé." });
    };

    if (!isUnlocked) return null;

    return (
        <div className="mt-8 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Vote</h2>
                {user && <Badge variant="outline" className="text-amber-400 border-amber-400"><Coins className="w-3 h-3 mr-1"/> Solde Acheté: {userPaidBalance}π</Badge>}
            </div>
            
            {settings && <CountdownTimer endDate={settings.end_date} />}

            {/* Categories for Candidate List Filtering */}
            {activeTab === 'candidates' && availableCategories.length > 1 && (
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex space-x-2">
                        {availableCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                    selectedCategory === cat 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-gray-800 w-full border border-gray-700">
                            <TabsTrigger value="candidates" className="flex-1 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
                                <UserCircle className="w-4 h-4 mr-2" /> Candidats
                            </TabsTrigger>
                            <TabsTrigger value="ranking" className="flex-1 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
                                <BarChart3 className="w-4 h-4 mr-2" /> Classement
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="candidates">
                            {filteredCandidates.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredCandidates.map((c, idx) => (
                                        <CandidateCard 
                                            key={c.id} 
                                            candidate={c} 
                                            totalVotes={totalVotes} 
                                            votePrice={settings?.vote_price_pi || 1} 
                                            onVote={() => { fetchData(); if(onRefresh) onRefresh(); }} 
                                            settings={settings} 
                                            isFinished={false} 
                                            index={idx} 
                                            isSelected={cartItems.some(i => i.candidate.id === c.id)} 
                                            onSelect={(cand, qty) => setCartItems(p => [...p, {candidate: cand, quantity: qty, price: settings?.vote_price_pi}])} 
                                            event={event}
                                            rank={getRank(c.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                                    <Filter className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">Aucun candidat dans cette catégorie.</p>
                                </div>
                            )}
                        </TabsContent>
                        
                        <TabsContent value="ranking">
                            <Card className="bg-gray-800 border-gray-700">
                                <CardHeader>
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Trophy className="text-yellow-500 w-5 h-5" /> Leaderboard
                                        </CardTitle>
                                        
                                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                                            {availableCategories.length > 1 && availableCategories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setRankingFilter(cat)}
                                                    className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors border ${
                                                        rankingFilter === cat 
                                                        ? 'bg-emerald-600 text-white border-emerald-600' 
                                                        : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {cat === 'Tous' ? 'Général' : cat}
                                                </button>
                                            ))}
                                        </div>

                                        <Button onClick={generateRankingPDF} variant="outline" size="sm" className="bg-emerald-600 border-0 text-white hover:bg-emerald-700 whitespace-nowrap">
                                            <File className="w-4 h-4 mr-2" /> PDF ({rankingFilter === 'Tous' ? 'Général' : rankingFilter})
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-gray-700">
                                        {rankedCandidatesFiltered.length > 0 ? (
                                            rankedCandidatesFiltered.map((c, i) => {
                                                const rank = i + 1;
                                                const percentage = totalVotes > 0 ? ((c.vote_count || 0) / totalVotes * 100).toFixed(1) : 0;
                                                
                                                let rankBadge;
                                                if (rank === 1) rankBadge = <div className="bg-yellow-500/20 text-yellow-500 p-2 rounded-full border border-yellow-500/50"><Crown className="w-5 h-5" /></div>;
                                                else if (rank === 2) rankBadge = <div className="bg-gray-400/20 text-gray-400 p-2 rounded-full border border-gray-400/50"><span className="font-bold w-5 h-5 flex items-center justify-center">2</span></div>;
                                                else if (rank === 3) rankBadge = <div className="bg-orange-700/20 text-orange-600 p-2 rounded-full border border-orange-700/50"><span className="font-bold w-5 h-5 flex items-center justify-center">3</span></div>;
                                                else rankBadge = <span className="text-gray-500 font-mono font-bold text-lg w-9 text-center">#{rank}</span>;

                                                return (
                                                    <div key={c.id} className="flex items-center p-4 hover:bg-gray-700/50 transition-colors">
                                                        <div className="flex-shrink-0 mr-4 w-10 flex justify-center">
                                                            {rankBadge}
                                                        </div>
                                                        <div className="flex-shrink-0 mr-4">
                                                            <img src={c.photo_url || "/api/placeholder/40/40"} className="w-10 h-10 rounded-full object-cover border border-gray-600" alt={c.name} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white truncate">
                                                                {c.name}
                                                            </p>
                                                            <div className="flex items-center mt-1 gap-2">
                                                                <div className="flex-1 bg-gray-700 rounded-full h-1.5 max-w-[100px]">
                                                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                                </div>
                                                                <span className="text-xs text-gray-400">{percentage}%</span>
                                                                {c.category && <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-400 h-4 px-1">{c.category}</Badge>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-white">{c.vote_count || 0}</div>
                                                            <div className="text-xs text-gray-500">votes</div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-8 text-center text-gray-500">
                                                Aucun candidat trouvé pour ce classement.
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
                        <CardHeader><CardTitle className="text-white text-lg flex items-center"><ShoppingCart className="mr-2"/> Panier ({cartItems.length})</CardTitle></CardHeader>
                        <CardContent>
                            {cartItems.length > 0 ? (
                                <div className="space-y-3">
                                    {cartItems.map((i, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm bg-gray-900/50 p-2 rounded border border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-emerald-900 flex items-center justify-center text-emerald-400 text-xs font-bold">
                                                    {i.quantity}
                                                </div>
                                                <span className="text-gray-300 truncate max-w-[120px]">{i.candidate.name}</span>
                                            </div>
                                            <span className="text-emerald-400 font-mono">{i.quantity * i.price}π</span>
                                        </div>
                                    ))}
                                    <Separator />
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-gray-400">Total</span>
                                        <span className="text-xl font-bold text-emerald-400">{cartItems.reduce((s, i) => s + i.quantity * i.price, 0)}π</span>
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
                                    <p className="text-sm">Votre panier est vide</p>
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