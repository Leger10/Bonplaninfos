import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Ticket, Loader2, Calendar, MapPin, Coins, AlertCircle, RefreshCw } from 'lucide-react';
import { generateTicketPDF } from '@/utils/generateTicketPDF';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MyTicketsTab = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    const fetchTickets = async (forceRetry = false) => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            console.log("🔄 Fetching tickets for user:", user.id);
            
            // Option 1: Requête plus simple d'abord pour diagnostiquer
            let query = supabase
                .from('event_tickets')
                .select(`
                    id,
                    ticket_number,
                    ticket_code_short,
                    status,
                    purchase_amount_pi,
                    purchase_amount_fcfa,
                    purchased_at,
                    user_id,
                    ticket_type_id,
                    event_id
                `)
                .eq('user_id', user.id)
                .order('purchased_at', { ascending: false });

            // Exécuter la requête simple d'abord
            const { data: basicData, error: basicError } = await query;
            
            if (basicError) {
                console.error("❌ Basic query error:", basicError);
                throw basicError;
            }

            console.log("✅ Basic tickets data:", basicData);

            // Si aucune donnée, arrêter ici
            if (!basicData || basicData.length === 0) {
                setTickets([]);
                setLoading(false);
                return;
            }

            // Option 2: Requête avec les relations séparément
            // Récupérer les détails des événements
            const eventIds = [...new Set(basicData.map(t => t.event_id).filter(id => id))];
            const ticketTypeIds = [...new Set(basicData.map(t => t.ticket_type_id).filter(id => id))];

            // Récupérer les événements
            let eventsData = {};
            if (eventIds.length > 0) {
                const { data: events, error: eventsError } = await supabase
                    .from('events')
                    .select('*')
                    .in('id', eventIds);
                
                if (!eventsError && events) {
                    events.forEach(event => {
                        eventsData[event.id] = event;
                    });
                }
            }

            // Récupérer les types de tickets
            let ticketTypesData = {};
            if (ticketTypeIds.length > 0) {
                const { data: ticketTypes, error: ticketTypesError } = await supabase
                    .from('ticket_types')
                    .select('*')
                    .in('id', ticketTypeIds);
                
                if (!ticketTypesError && ticketTypes) {
                    ticketTypes.forEach(type => {
                        ticketTypesData[type.id] = type;
                    });
                }
            }

            // Combiner les données
            const enrichedTickets = basicData.map(ticket => {
                const event = eventsData[ticket.event_id] || {
                    id: ticket.event_id || 'unknown',
                    title: 'Événement non disponible',
                    event_date: null,
                    location: 'Lieu inconnu',
                    city: 'Inconnu',
                    cover_image: null
                };

                const ticketType = ticketTypesData[ticket.ticket_type_id] || {
                    name: 'Standard',
                    color: 'blue',
                    description: null
                };

                return {
                    ...ticket,
                    events: event,
                    ticket_types: ticketType
                };
            });

            console.log("🎫 Enriched tickets:", enrichedTickets);
            setTickets(enrichedTickets);

        } catch (error) {
            console.error("❌ Error fetching tickets:", error);
            
            // Vérifier le type d'erreur
            let errorMessage = "Impossible de charger vos billets. Veuillez réessayer.";
            
            if (error.message.includes('JWT')) {
                errorMessage = "Session expirée. Veuillez vous reconnecter.";
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = "Problème de connexion réseau. Vérifiez votre internet.";
            } else if (error.message.includes('permission') || error.message.includes('auth')) {
                errorMessage = "Permissions insuffisantes. Vérifiez votre connexion.";
            }
            
            setError(errorMessage);
            toast({ 
                title: "Erreur", 
                description: errorMessage, 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setError("Veuillez vous connecter pour voir vos billets.");
            return;
        }

        fetchTickets();

        // Configuration de l'abonnement aux changements
        const setupRealtime = async () => {
            try {
                const channel = supabase
                    .channel('tickets-changes')
                    .on('postgres_changes', 
                        { 
                            event: '*', 
                            schema: 'public', 
                            table: 'event_tickets',
                            filter: `user_id=eq.${user.id}`
                        }, 
                        (payload) => {
                            console.log("📢 Ticket change detected:", payload);
                            fetchTickets();
                        }
                    )
                    .subscribe((status) => {
                        console.log("Realtime subscription status:", status);
                    });

                return () => {
                    supabase.removeChannel(channel);
                };
            } catch (e) {
                console.warn("Realtime subscription failed:", e);
            }
        };

        setupRealtime();
    }, [user, retryCount]);

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setError(null);
        toast({
            title: "Tentative de reconnexion",
            description: "Rechargement des billets..."
        });
    };

    const handleDownload = async (ticket) => {
        setDownloadingId(ticket.id);
        try {
            const eventData = ticket.events || {};
            
            const ticketData = {
                ticket_number: String(ticket.ticket_number || ''),
                ticket_code_short: String(ticket.ticket_code_short || ticket.ticket_number?.slice(-6) || ''),
                type_name: ticket.ticket_types?.name || 'Standard',
                price: Number(ticket.purchase_amount_pi) || 0,
                price_fcfa: Number(ticket.purchase_amount_fcfa) || (Number(ticket.purchase_amount_pi) * 10) || 0
            };
            
            const userData = {
                full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur',
                email: user?.email,
                id: user?.id
            };

            const success = await generateTicketPDF(eventData, [ticketData], userData);
            if (success) {
                toast({ 
                    title: "✅ Succès", 
                    description: "Billet téléchargé avec succès !" 
                });
            } else {
                throw new Error("Generation failed");
            }
        } catch (e) {
            console.error("Download error", e);
            toast({ 
                title: "Erreur", 
                description: "Impossible de générer le PDF. Veuillez réessayer.", 
                variant: "destructive" 
            });
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 animate-in fade-in duration-500">
                <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <div className="absolute inset-0 animate-ping bg-primary/20 rounded-full"></div>
                </div>
                <p className="text-muted-foreground text-lg">Chargement de vos billets...</p>
                <p className="text-sm text-muted-foreground mt-2">Cela peut prendre quelques instants</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="animate-in fade-in duration-500 space-y-4">
                <Alert variant="destructive" className="border-red-300 bg-red-50">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-700">
                        <div className="font-semibold mb-2">Erreur de chargement</div>
                        <div className="mb-4">{error}</div>
                        <div className="flex flex-wrap gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleRetry}
                                className="bg-white border-red-300 text-red-700 hover:bg-red-50"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Réessayer
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.location.reload()}
                                className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                                Recharger la page
                            </Button>
                            {error.includes('session') && (
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.location.href = '/login'}
                                    className="border-red-300 text-red-700 hover:bg-red-50"
                                >
                                    Se reconnecter
                                </Button>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
                
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Impossible de charger les billets</h3>
                        <p className="text-muted-foreground text-center max-w-sm mb-6">
                            Veuillez réessayer ou contacter le support si le problème persiste.
                        </p>
                        <div className="flex gap-3">
                            <Button onClick={handleRetry} variant="default">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Réessayer
                            </Button>
                            <Button onClick={() => window.location.href = '/events'} variant="outline">
                                Voir les événements
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (tickets.length === 0) {
        return (
            <Card className="border-dashed border-2 animate-in fade-in duration-500">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full flex items-center justify-center mb-4">
                        <Ticket className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Aucun billet trouvé</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-8">
                        Vous n'avez pas encore acheté de billets. Parcourez nos événements passionnants et réservez votre place dès maintenant !
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button 
                            onClick={() => window.location.href = '/events'}
                            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 animate-pulse hover:animate-none px-8"
                            size="lg"
                        >
                            Explorer les événements
                        </Button>
                        <Button 
                            onClick={handleRetry}
                            variant="outline"
                            size="lg"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Vérifier à nouveau
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="mb-6 p-6 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl border border-primary/20 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Ticket className="text-primary h-6 w-6" />
                            Mes Billets
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Vous avez {tickets.length} billet{tickets.length > 1 ? 's' : ''} dans votre collection
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={handleRetry} 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                        </Button>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                            {tickets.filter(t => t.status === 'active').length} actifs
                        </Badge>
                    </div>
                </div>
            </div>
            
            <div className="grid gap-4">
                {tickets.map(ticket => (
                    <Card key={ticket.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group">
                        <div className="flex flex-col lg:flex-row">
                            {/* Date Section */}
                            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 lg:w-32 flex flex-col items-center justify-center p-5 border-b lg:border-b-0 lg:border-r border-border/50">
                                <Calendar className="w-7 h-7 text-primary mb-3" />
                                <div className="text-center">
                                    <span className="block text-3xl font-bold text-primary">
                                        {ticket.events?.event_date ? new Date(ticket.events.event_date).getDate() : '--'}
                                    </span>
                                    <span className="block text-sm uppercase font-bold text-muted-foreground tracking-wider">
                                        {ticket.events?.event_date ? 
                                            new Date(ticket.events.event_date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase() : 
                                            '---'}
                                    </span>
                                    <span className="block text-xs text-muted-foreground mt-1">
                                        {ticket.events?.event_date ? 
                                            new Date(ticket.events.event_date).getFullYear() : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 p-5 lg:p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-3">
                                        <h3 className="font-bold text-xl line-clamp-2 group-hover:text-primary transition-colors">
                                            {ticket.events?.title || 'Événement'}
                                        </h3>
                                        <Badge 
                                            variant={ticket.status === 'used' ? 'secondary' : 'default'} 
                                            className={`whitespace-nowrap ${
                                                ticket.status === 'active' ? 
                                                'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' : 
                                                ''
                                            }`}
                                        >
                                            {ticket.status === 'active' ? '✅ Valide' : 
                                             ticket.status === 'used' ? '🔴 Utilisé' : 
                                             ticket.status === 'cancelled' ? '❌ Annulé' : 
                                             ticket.status}
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-start text-sm text-muted-foreground mb-4">
                                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-2">
                                            {ticket.events?.location || ticket.events?.city || 'Lieu non spécifié'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-sm items-center mb-3">
                                        <span className="flex items-center text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-lg">
                                            <Coins className="w-4 h-4 mr-1.5" />
                                            {Number(ticket.purchase_amount_pi || 0).toFixed(2)} π
                                        </span>
                                        <span className="text-muted-foreground hidden sm:inline">/</span>
                                        <span className="font-medium text-gray-600 bg-muted/50 px-3 py-1.5 rounded-lg">
                                            {Number(ticket.purchase_amount_fcfa || (ticket.purchase_amount_pi * 10) || 0).toLocaleString()} FCFA
                                        </span>
                                        <span className="flex items-center text-xs font-medium text-muted-foreground px-3 py-1 bg-muted rounded-full ml-auto">
                                            <span className="hidden sm:inline mr-1">N°</span>
                                            {ticket.ticket_number || 'N/A'}
                                        </span>
                                    </div>
                                    
                                    <div className="text-xs text-muted-foreground flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        Acheté le {new Date(ticket.purchased_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Download Button */}
                            <div className="p-5 lg:p-6 flex items-center justify-center bg-gradient-to-t lg:bg-gradient-to-l from-muted/10 to-transparent lg:w-48 border-t lg:border-t-0 lg:border-l border-border/50">
                                <Button 
                                    onClick={() => handleDownload(ticket)} 
                                    disabled={downloadingId === ticket.id || !ticket.events}
                                    className="w-full lg:w-auto min-w-[140px] group relative overflow-hidden"
                                    variant="outline"
                                    size="lg"
                                >
                                    <span className="relative z-10 flex items-center justify-center">
                                        {downloadingId === ticket.id ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                Génération...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" /> 
                                                Télécharger PDF
                                            </>
                                        )}
                                    </span>
                                </Button>
                            </div>
                        </div>
                        
                        {/* Ticket Type Footer */}
                        {ticket.ticket_types?.name && (
                            <div className="px-5 py-3 bg-gradient-to-r from-muted/30 to-transparent border-t border-border/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        <span className="font-semibold text-foreground">Type :</span> {ticket.ticket_types.name}
                                    </span>
                                    {ticket.ticket_code_short && (
                                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                            Code : {ticket.ticket_code_short}
                                        </code>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
            
            <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Vous avez {tickets.length} billet{tickets.length > 1 ? 's' : ''} au total
                </p>
            </div>
        </div>
    );
};

export default MyTicketsTab;