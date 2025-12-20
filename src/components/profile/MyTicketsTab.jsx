import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Ticket, Loader2, Calendar, MapPin, Coins, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { generateTicketPDF } from '@/utils/generateTicketPDF';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRCode from 'qrcode.react'; 

const MyTicketsTab = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [error, setError] = useState(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    const fetchTickets = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Fetch tickets with event and type details
            const { data, error } = await supabase
                .from('event_tickets')
                .select(`
                    *,
                    events (
                        id, title, event_date, location, city, cover_image
                    ),
                    ticket_types (
                        name, color, description, price_pi
                    )
                `)
                .eq('user_id', user.id)
                .order('purchased_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);

        } catch (error) {
            console.error("Error fetching tickets:", error);
            setError("Impossible de charger vos billets. Veuillez vérifier votre connexion.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        
        // Subscribe to ticket status changes
        const channel = supabase
            .channel('public:event_tickets')
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'event_tickets', filter: `user_id=eq.${user?.id}` }, 
                (payload) => {
                    setTickets(current => current.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const handleDownload = async (ticket) => {
        setDownloadingId(ticket.id);
        try {
            const eventData = ticket.events || {};
            
            const ticketData = {
                ticket_number: String(ticket.ticket_number || ''),
                ticket_code_short: String(ticket.ticket_code_short || ''),
                type_name: ticket.ticket_types?.name || 'Standard',
                color: ticket.ticket_types?.color || 'blue', 
                price: Number(ticket.purchase_amount_pi) || 0,
                price_fcfa: Number(ticket.purchase_amount_fcfa) || 0,
                purchase_date: ticket.purchased_at // Pass the purchase date
            };
            
            const userData = {
                full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur',
                email: user?.email,
                id: user?.id
            };

            await generateTicketPDF(eventData, [ticketData], userData);
            toast({ title: "✅ Succès", description: "Billet téléchargé." });
        } catch (e) {
            console.error("Download error", e);
            toast({ title: "Erreur", description: "Échec du téléchargement PDF.", variant: "destructive" });
        } finally {
            setDownloadingId(null);
        }
    };

    const openQrModal = (ticket) => {
        setSelectedTicket(ticket);
        setShowQrModal(true);
    };

    // Formatter for purchase date display
    const formatPurchaseDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) { return ''; }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (error) return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error} <Button variant="link" onClick={fetchTickets} className="p-0 h-auto font-bold ml-2">Réessayer</Button></AlertDescription>
        </Alert>
    );

    if (tickets.length === 0) {
        return (
            <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Ticket className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Aucun billet</h3>
                    <p className="text-muted-foreground mb-6">Vous n'avez pas encore acheté de billets.</p>
                    <Button onClick={() => window.location.href = '/events'}>Explorer les événements</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Ticket className="text-primary w-5 h-5" /> Mes Billets ({tickets.length})
                </h2>
                <Button variant="ghost" size="sm" onClick={fetchTickets}><RefreshCw className="w-4 h-4 mr-2" /> Actualiser</Button>
            </div>

            <div className="grid gap-4">
                {tickets.map(ticket => (
                    <Card key={ticket.id} className="overflow-hidden border-l-4 hover:shadow-md transition-all" 
                          style={{ borderLeftColor: getComputedColor(ticket.ticket_types?.color) }}>
                        <div className="flex flex-col md:flex-row">
                            {/* Date Column */}
                            <div className="bg-muted/30 md:w-32 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border">
                                <span className="text-2xl font-bold text-primary">
                                    {ticket.events?.event_date ? new Date(ticket.events.event_date).getDate() : '--'}
                                </span>
                                <span className="text-xs uppercase font-bold text-muted-foreground">
                                    {ticket.events?.event_date ? new Date(ticket.events.event_date).toLocaleDateString('fr-FR', { month: 'short' }) : '--'}
                                </span>
                                <span className="text-xs text-muted-foreground mt-1">
                                    {ticket.events?.event_date ? new Date(ticket.events.event_date).getFullYear() : ''}
                                </span>
                            </div>

                            {/* Info Column */}
                            <div className="flex-1 p-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg line-clamp-1">{ticket.events?.title || 'Événement'}</h3>
                                        <StatusBadge status={ticket.status} verificationStatus={ticket.verification_status} />
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        <span className="line-clamp-1">{ticket.events?.location || ticket.events?.city || 'Lieu non spécifié'}</span>
                                    </div>
                                    
                                    {/* Purchase Date */}
                                    {ticket.purchased_at && (
                                        <div className="flex items-center text-xs text-muted-foreground mb-3 bg-muted/30 p-1.5 rounded-md w-fit border border-black/5">
                                            <Calendar className="w-3 h-3 mr-1.5 text-primary/70" />
                                            <span>Acheté le {formatPurchaseDate(ticket.purchased_at)}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <Badge variant="outline" className="text-xs" 
                                               style={{ borderColor: getComputedColor(ticket.ticket_types?.color), color: getComputedColor(ticket.ticket_types?.color) }}>
                                            {ticket.ticket_types?.name || 'Standard'}
                                        </Badge>
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono">
                                            {ticket.ticket_code_short || '******'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Column */}
                            <div className="p-4 bg-muted/10 flex flex-row md:flex-col items-center justify-center gap-2 border-t md:border-t-0 md:border-l border-border">
                                <Button size="sm" variant="outline" className="flex-1 w-full" onClick={() => openQrModal(ticket)}>
                                    <QrCode className="w-4 h-4 mr-2" /> QR Code
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="flex-1 w-full" 
                                    onClick={() => handleDownload(ticket)}
                                    disabled={downloadingId === ticket.id}
                                >
                                    {downloadingId === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                    PDF
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* QR Code Modal */}
            <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
                <DialogContent className="sm:max-w-sm text-center">
                    <DialogHeader>
                        <DialogTitle>{selectedTicket?.events?.title}</DialogTitle>
                        <DialogDescription>
                            Présentez ce QR Code à l'entrée
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            {selectedTicket && (
                                <QRCode 
                                    value={selectedTicket.ticket_code_short || selectedTicket.ticket_number} 
                                    size={200}
                                    level={"H"}
                                />
                            )}
                        </div>
                        <p className="mt-4 text-2xl font-mono font-bold tracking-widest text-primary">
                            {selectedTicket?.ticket_code_short}
                        </p>
                        
                        {selectedTicket?.purchased_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Acheté le {formatPurchaseDate(selectedTicket.purchased_at)}
                            </p>
                        )}

                        <Badge variant={selectedTicket?.status === 'used' ? 'secondary' : 'default'} className="mt-4">
                            {selectedTicket?.status === 'active' ? 'Billet Valide' : 'Déjà utilisé'}
                        </Badge>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const StatusBadge = ({ status, verificationStatus }) => {
    if (status === 'used' || verificationStatus === 'verified') {
        return <Badge variant="secondary" className="bg-gray-200 text-gray-600">Utilisé</Badge>;
    }
    if (status === 'active') {
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Valide</Badge>;
    }
    return <Badge variant="destructive">Invalide</Badge>;
};

// Simple color helper for UI display (matching DB/PDF colors)
const getComputedColor = (colorName) => {
    const colors = {
        blue: '#3b82f6',
        bronze: '#cd7f32',
        silver: '#9ca3af',
        gold: '#eab308',
        purple: '#9333ea',
        red: '#ef4444',
        green: '#22c55e',
        black: '#1f2937'
    };
    return colors[colorName] || colors.blue;
};

export default MyTicketsTab;