import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Ticket, Loader2, List, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import RaffleDrawSystem from './RaffleDrawSystem';
import WalletInfoModal from '@/components/WalletInfoModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const RaffleInterface = ({ raffleData, eventId, onPurchaseSuccess, isUnlocked, isOwner }) => {
    const { user } = useAuth();
    const { forceRefreshUserProfile, userProfile } = useData();
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [ticketsList, setTicketsList] = useState([]);
    const [showTicketsDialog, setShowTicketsDialog] = useState(false);
    const [myTickets, setMyTickets] = useState([]);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [stats, setStats] = useState({
        totalTickets: 0,
        myTicketsCount: 0,
        participantsCount: 0
    });
    
    const navigate = useNavigate();
    
    // Determine organizer based on prop or data logic to avoid async fetch
    const isOrganizer = isOwner || (user && raffleData && user.id === raffleData.organizer_id);
    
    const pricePerTicket = raffleData?.calculated_price_pi || 1;
    const totalCostPi = useMemo(() => pricePerTicket * quantity, [pricePerTicket, quantity]);
    
    // Calculate purchase progress
    const maxTicketsPerUser = raffleData?.max_tickets_per_user || 10;
    const purchaseProgress = stats.myTicketsCount > 0 
        ? Math.min(100, (stats.myTicketsCount / maxTicketsPerUser) * 100)
        : 0;

    // Fetch tickets and statistics
    useEffect(() => {
        const fetchTicketsAndStats = async () => {
            if (!user || !raffleData) return;
            
            try {
                // Fetch My Tickets
                const { data: myTix, error: myError } = await supabase
                    .from('raffle_tickets')
                    .select('ticket_number, purchased_at, purchase_price_pi')
                    .eq('raffle_event_id', raffleData.id)
                    .eq('user_id', user.id)
                    .order('ticket_number', { ascending: true });
                
                if (myError) throw myError;
                setMyTickets(myTix || []);

                // If organizer, fetch ALL tickets for dashboard
                if (isOrganizer) {
                    const { data: allTix, error: allError } = await supabase
                        .from('raffle_tickets')
                        .select('*, profiles:user_id(full_name, email, avatar_url)')
                        .eq('raffle_event_id', raffleData.id)
                        .order('purchased_at', { ascending: false });
                    
                    if (allError) throw allError;
                    setTicketsList(allTix || []);
                    
                    // Calculate unique participants
                    const uniqueParticipants = new Set(allTix?.map(ticket => ticket.user_id) || []);
                    setStats(prev => ({
                        ...prev,
                        totalTickets: allTix?.length || 0,
                        participantsCount: uniqueParticipants.size
                    }));
                } else {
                    // For regular users, just get count of participants
                    const { count: participantsCount, error: countError } = await supabase
                        .from('raffle_tickets')
                        .select('user_id', { count: 'exact', distinct: true })
                        .eq('raffle_event_id', raffleData.id);
                    
                    if (!countError) {
                        setStats(prev => ({
                            ...prev,
                            totalTickets: raffleData.tickets_sold || 0,
                            myTicketsCount: myTix?.length || 0,
                            participantsCount: participantsCount || 0
                        }));
                    }
                }
            } catch (err) {
                console.error("Error fetching tickets:", err);
                toast({
                    title: "Erreur de chargement",
                    description: "Impossible de charger les tickets",
                    variant: "destructive"
                });
            }
        };
        
        fetchTicketsAndStats();
        
        // Real-time subscription for ticket purchases
        const channel = supabase.channel(`raffle_tickets_${raffleData.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'raffle_tickets',
                filter: `raffle_event_id=eq.${raffleData.id}`
            }, (payload) => {
                if (payload.new.user_id === user?.id) {
                    setMyTickets(prev => [...prev, {
                        ticket_number: payload.new.ticket_number,
                        purchased_at: payload.new.purchased_at,
                        purchase_price_pi: payload.new.purchase_price_pi
                    }]);
                    setStats(prev => ({
                        ...prev,
                        myTicketsCount: prev.myTicketsCount + 1,
                        totalTickets: prev.totalTickets + 1
                    }));
                }
            })
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, eventId, raffleData, isOrganizer]);

    const handlePurchase = async () => {
        if (!user) { 
            navigate('/auth'); 
            return; 
        }
        
        if (quantity < 1) return;
        
        // Check max tickets per user
        if (stats.myTicketsCount + quantity > maxTicketsPerUser) {
            toast({
                title: "Limite de tickets atteinte",
                description: `Vous ne pouvez pas acheter plus de ${maxTicketsPerUser} tickets.`,
                variant: "destructive"
            });
            return;
        }

        // Verify balance locally first (Optimistic UI)
        const currentBalance = userProfile?.coin_balance || 0;
        
        if (currentBalance < totalCostPi) {
            setShowWalletModal(true);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('purchase_raffle_tickets', {
                p_raffle_id: raffleData.id,
                p_user_id: user.id,
                p_quantity: quantity
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            toast({
                title: "🎉 Tickets achetés !",
                description: `Vous avez obtenu ${quantity} ticket(s). Bonne chance !`,
                className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0"
            });
            
            await forceRefreshUserProfile();
            if (onPurchaseSuccess) onPurchaseSuccess();
            
            // Refresh local tickets list
            const { data: myNewTix } = await supabase
                .from('raffle_tickets')
                .select('ticket_number, purchased_at, purchase_price_pi')
                .eq('raffle_event_id', raffleData.id)
                .eq('user_id', user.id);
            setMyTickets(myNewTix || []);
            
            // Reset quantity
            setQuantity(1);

        } catch (err) {
            if (err.message && err.message.includes('Solde insuffisant')) {
                setShowWalletModal(true);
            } else {
                toast({ 
                    title: "Erreur d'achat", 
                    description: err.message, 
                    variant: "destructive" 
                });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!raffleData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Statistics Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-r from-blue-900/20 to-blue-900/5 border-blue-800/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Tickets vendus</p>
                                <p className="text-2xl font-bold text-white">{stats.totalTickets}</p>
                            </div>
                            <Ticket className="w-8 h-8 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-purple-900/20 to-purple-900/5 border-purple-800/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Participants</p>
                                <p className="text-2xl font-bold text-white">{stats.participantsCount}</p>
                            </div>
                            <Users className="w-8 h-8 text-purple-400" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-green-900/20 to-green-900/5 border-green-800/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Mes tickets</p>
                                <p className="text-2xl font-bold text-white">{stats.myTicketsCount}</p>
                            </div>
                            <BarChart3 className="w-8 h-8 text-green-400" />
                        </div>
                        {maxTicketsPerUser > 0 && (
                            <div className="mt-3">
                                <Progress value={purchaseProgress} className="h-2" />
                                <p className="text-xs text-gray-400 mt-1">
                                    {stats.myTicketsCount} / {maxTicketsPerUser} tickets max
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Draw System */}
            <RaffleDrawSystem 
                raffleData={raffleData} 
                eventId={eventId} 
                isOrganizer={isOrganizer} 
                onDrawComplete={onPurchaseSuccess}
            />

            {/* Organizer Dashboard: Ticket List */}
            {isOrganizer && (
                <Card className="border-2 border-yellow-500/20 bg-gradient-to-b from-gray-900/50 to-black/50">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <List className="w-5 h-5 text-yellow-500" />
                                <span>Liste des Participants</span>
                            </div>
                            <Button 
                                variant="outline" 
                                onClick={() => setShowTicketsDialog(true)}
                                className="bg-gradient-to-r from-gray-800 to-black border-yellow-500/30 hover:bg-yellow-500/10"
                            >
                                <List className="w-4 h-4 mr-2" /> 
                                Voir tout ({ticketsList.length})
                            </Button>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            {stats.participantsCount} participants uniques • {stats.totalTickets} tickets vendus
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {ticketsList.slice(0, 8).map((ticket) => (
                                <div key={ticket.id} className="bg-gray-800/30 rounded-lg p-3 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        {ticket.profiles?.avatar_url ? (
                                            <img 
                                                src={ticket.profiles.avatar_url} 
                                                className="w-8 h-8 rounded-full"
                                                alt={ticket.profiles.full_name}
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs">
                                                {ticket.profiles?.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-white truncate max-w-[100px]">
                                                {ticket.profiles?.full_name || 'Inconnu'}
                                            </p>
                                            <p className="text-xs text-gray-400">#{ticket.ticket_number}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Participant View: Buy & My Tickets */}
            {(!isOrganizer || raffleData.status === 'active') && raffleData.status !== 'completed' && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Buy Card */}
                    {raffleData.status === 'active' && (
                        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <Ticket className="w-6 h-6 text-primary" />
                                    Acheter des Tickets
                                </CardTitle>
                                <CardDescription>
                                    <div className="flex items-center justify-between">
                                        <span>Prix unitaire: {pricePerTicket} π</span>
                                        <Badge variant="outline" className="text-xs">
                                            Max: {maxTicketsPerUser} tickets
                                        </Badge>
                                    </div>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800/50 to-black/50 rounded-xl border border-white/10">
                                        <span className="font-medium text-white">Quantité</span>
                                        <div className="flex items-center gap-4">
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="rounded-full w-10 h-10"
                                                disabled={quantity <= 1}
                                            >
                                                -
                                            </Button>
                                            <span className="w-12 text-center font-bold text-2xl text-white">{quantity}</span>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => {
                                                    if (stats.myTicketsCount + quantity + 1 <= maxTicketsPerUser) {
                                                        setQuantity(quantity + 1);
                                                    } else {
                                                        toast({
                                                            title: "Limite atteinte",
                                                            description: `Vous ne pouvez pas dépasser ${maxTicketsPerUser} tickets.`,
                                                            variant: "destructive"
                                                        });
                                                    }
                                                }}
                                                className="rounded-full w-10 h-10"
                                                disabled={stats.myTicketsCount + quantity >= maxTicketsPerUser}
                                            >
                                                +
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-r from-gray-900/50 to-black/50 rounded-xl border border-white/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-400">Total</span>
                                            <span className="text-2xl font-bold text-white">{totalCostPi} π</span>
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Solde disponible: {userProfile?.coin_balance || 0} π
                                        </div>
                                    </div>
                                </div>
                                
                                <Button 
                                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl" 
                                    onClick={handlePurchase} 
                                    disabled={loading || stats.myTicketsCount >= maxTicketsPerUser}
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    ) : null}
                                    {loading ? 'Achat en cours...' : `Payer ${totalCostPi} π`}
                                </Button>
                                
                                {stats.myTicketsCount >= maxTicketsPerUser && (
                                    <div className="p-3 bg-gradient-to-r from-amber-900/20 to-transparent rounded-lg border border-amber-700/30">
                                        <p className="text-center text-amber-300 text-sm">
                                            🎫 Vous avez atteint la limite de {maxTicketsPerUser} tickets
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* My Tickets List */}
                    <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-900/10 via-transparent to-blue-900/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-3">
                                <List className="w-5 h-5 text-blue-400" /> 
                                Mes Tickets ({stats.myTicketsCount})
                            </CardTitle>
                            <CardDescription className="text-blue-300">
                                Chaque ticket a une chance égale de gagner
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {myTickets.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
                                    {myTickets.map(t => (
                                        <div 
                                            key={t.ticket_number} 
                                            className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-xl p-4 text-center hover:scale-[1.02] transition-transform duration-300"
                                        >
                                            <div className="text-xs text-blue-300 mb-2">Ticket n°</div>
                                            <div className="font-mono font-bold text-3xl text-white mb-2">
                                                #{t.ticket_number}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Acheté le {new Date(t.purchased_at).toLocaleDateString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Ticket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-2">Vous n'avez pas encore de tickets.</p>
                                    <p className="text-gray-400 text-sm">Achetez vos premiers tickets pour participer au tirage !</p>
                                </div>
                            )}
                            
                            {myTickets.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-white/10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Vos chances de gagner</span>
                                        <span className="text-sm font-medium text-white">
                                            {stats.totalTickets > 0 
                                                ? `${((stats.myTicketsCount / stats.totalTickets) * 100).toFixed(1)}%`
                                                : '0%'
                                            }
                                        </span>
                                    </div>
                                    <Progress 
                                        value={stats.totalTickets > 0 ? (stats.myTicketsCount / stats.totalTickets) * 100 : 0} 
                                        className="h-2 mt-2"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Dialog for Organizer Full List */}
            <Dialog open={showTicketsDialog} onOpenChange={setShowTicketsDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col bg-gradient-to-b from-gray-900 to-black border-2 border-yellow-500/20">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <List className="w-5 h-5 text-yellow-500" />
                            Liste complète des tickets vendus
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Total: {ticketsList.length} tickets • {stats.participantsCount} participants • 
                            Revenu: {ticketsList.length * pricePerTicket} π
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <Table>
                            <TableHeader className="sticky top-0 bg-gray-900">
                                <TableRow>
                                    <TableHead className="text-yellow-400">Ticket #</TableHead>
                                    <TableHead className="text-yellow-400">Participant</TableHead>
                                    <TableHead className="text-yellow-400">Date d'achat</TableHead>
                                    <TableHead className="text-yellow-400">Montant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ticketsList.map((t) => (
                                    <TableRow key={t.id} className="hover:bg-white/5 border-b border-white/10">
                                        <TableCell className="font-mono font-bold text-white">
                                            #{t.ticket_number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {t.profiles?.avatar_url ? (
                                                    <img 
                                                        src={t.profiles.avatar_url} 
                                                        className="w-8 h-8 rounded-full"
                                                        alt={t.profiles.full_name}
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm">
                                                        {t.profiles?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-white">
                                                        {t.profiles?.full_name || 'Inconnu'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">{t.profiles?.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-300">
                                            {new Date(t.purchased_at).toLocaleString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell className="font-bold text-yellow-400">
                                            {t.purchase_price_pi} π
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Insufficient Balance Modal */}
            <WalletInfoModal
                isOpen={showWalletModal}
                onClose={() => setShowWalletModal(false)}
                requiredAmount={totalCostPi}
                currentBalance={userProfile?.coin_balance || 0}
            />
        </div>
    );
};

export default RaffleInterface;