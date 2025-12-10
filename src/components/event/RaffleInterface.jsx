import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Ticket, Loader2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import RaffleDrawSystem from './RaffleDrawSystem';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RaffleInterface = ({ raffleData, eventId, onPurchaseSuccess, isUnlocked }) => {
    const { user } = useAuth();
    const { forceRefreshUserProfile } = useData();
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [ticketsList, setTicketsList] = useState([]);
    const [showTicketsDialog, setShowTicketsDialog] = useState(false);
    const [myTickets, setMyTickets] = useState([]);
    
    const navigate = useNavigate();
    const pricePerTicket = raffleData?.calculated_price_pi || 1;
    const totalCostPi = useMemo(() => pricePerTicket * quantity, [pricePerTicket, quantity]);

    // Check organizer status and fetch tickets
    useEffect(() => {
        const initInterface = async () => {
            if (!user || !raffleData) return;
            
            // Check organizer
            const { data: event } = await supabase.from('events').select('organizer_id').eq('id', eventId).single();
            const isOrg = event?.organizer_id === user.id;
            setIsOrganizer(isOrg);

            // Fetch My Tickets
            const { data: myTix } = await supabase
                .from('raffle_tickets')
                .select('ticket_number, purchased_at, purchase_price_pi')
                .eq('raffle_event_id', raffleData.id)
                .eq('user_id', user.id)
                .order('ticket_number', { ascending: true });
            setMyTickets(myTix || []);

            // If organizer, fetch ALL tickets for dashboard
            if (isOrg) {
                const { data: allTix } = await supabase
                    .from('raffle_tickets')
                    .select('*, profiles:user_id(full_name, email)')
                    .eq('raffle_event_id', raffleData.id)
                    .order('purchased_at', { ascending: false }); // Fixed: changed created_at to purchased_at
                setTicketsList(allTix || []);
            }
        };
        initInterface();
    }, [user, eventId, raffleData]);

    const handlePurchase = async () => {
        if (!user) { navigate('/auth'); return; }
        if (quantity < 1) return;

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
                title: "✅ Tickets achetés !",
                description: `Vous avez obtenu ${quantity} ticket(s). Bonne chance !`
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

        } catch (err) {
            toast({ title: "Erreur", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!raffleData) return null;

    return (
        <div className="space-y-6">
            {/* Draw System (Handles Organizer Controls & Public Animation) */}
            <RaffleDrawSystem 
                raffleData={raffleData} 
                eventId={eventId} 
                isOrganizer={isOrganizer} 
                onDrawComplete={onPurchaseSuccess}
            />

            {/* Organizer Dashboard: Ticket List */}
            {isOrganizer && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center text-base">
                            <span>Liste des Participants</span>
                            <Button variant="outline" size="sm" onClick={() => setShowTicketsDialog(true)}>
                                <List className="w-4 h-4 mr-2" /> Voir tout ({ticketsList.length})
                            </Button>
                        </CardTitle>
                    </CardHeader>
                </Card>
            )}

            {/* Participant View: Buy & My Tickets */}
            {!isOrganizer && raffleData.status === 'active' && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Buy Card */}
                    <Card className="border-primary/20 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-primary" />
                                Acheter des Tickets
                            </CardTitle>
                            <CardDescription>Prix unitaire: {pricePerTicket} π</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span className="font-medium">Quantité</span>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                                    <span className="w-8 text-center font-bold">{quantity}</span>
                                    <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>+</Button>
                                </div>
                            </div>
                            <Button 
                                className="w-full h-12 text-lg font-bold" 
                                onClick={handlePurchase} 
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : `Payer ${totalCostPi} π`}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* My Tickets List */}
                    <Card className="border-blue-100 bg-blue-50/50">
                        <CardHeader>
                            <CardTitle className="text-blue-800 text-base flex items-center gap-2">
                                <List className="w-4 h-4" /> Mes Tickets ({myTickets.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {myTickets.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2">
                                    {myTickets.map(t => (
                                        <div key={t.ticket_number} className="bg-white border border-blue-200 rounded p-2 text-center shadow-sm">
                                            <div className="text-xs text-gray-500">N°</div>
                                            <div className="font-mono font-bold text-blue-600 text-lg">#{t.ticket_number}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Vous n'avez pas encore de tickets.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Dialog for Organizer Full List */}
            <Dialog open={showTicketsDialog} onOpenChange={setShowTicketsDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Liste complète des tickets vendus</DialogTitle>
                        <DialogDescription>Total: {ticketsList.length} tickets | Revenu: {ticketsList.length * pricePerTicket} π</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket #</TableHead>
                                    <TableHead>Participant</TableHead>
                                    <TableHead>Date d'achat</TableHead>
                                    <TableHead>Montant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ticketsList.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-mono font-bold">#{t.ticket_number}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{t.profiles?.full_name || 'Inconnu'}</div>
                                            <div className="text-xs text-muted-foreground">{t.profiles?.email}</div>
                                        </TableCell>
                                        <TableCell>{new Date(t.purchased_at).toLocaleString()}</TableCell> {/* Fixed: changed created_at to purchased_at */}
                                        <TableCell>{t.purchase_price_pi} π</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RaffleInterface;