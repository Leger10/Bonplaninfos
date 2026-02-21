import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Search, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  UserCheck,
  Ticket,
  Coins,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SecretaryRefundModal = ({ isOpen, onClose, secretaryId, country, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [refundStats, setRefundStats] = useState(null);

  // Charger les événements terminés du pays
  useEffect(() => {
    if (isOpen && country) {
      fetchEvents();
    }
  }, [isOpen, country]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          event_start_at,
          event_end_at,
          event_type,
          tickets_sold,
          ticket_price,
          organizer:organizer_id (full_name, email)
        `)
        .eq('country', country)
        .lt('event_end_at', new Date().toISOString())
        .order('event_end_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements",
        variant: "destructive"
      });
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchParticipants = async (eventId) => {
    setLoadingParticipants(true);
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          id,
          user_id,
          quantity,
          total_amount,
          ticket_type,
          status,
          user:user_id (
            id,
            full_name,
            email,
            phone,
            available_coins
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'confirmed');

      if (error) throw error;

      // Grouper par utilisateur
      const participantMap = new Map();
      
      tickets.forEach(ticket => {
        if (!ticket.user) return;
        
        const userId = ticket.user_id;
        if (!participantMap.has(userId)) {
          participantMap.set(userId, {
            user_id: userId,
            full_name: ticket.user.full_name || 'Utilisateur inconnu',
            email: ticket.user.email || 'N/A',
            phone: ticket.user.phone || 'N/A',
            tickets: [],
            total_amount: 0,
            total_quantity: 0
          });
        }
        
        const participant = participantMap.get(userId);
        participant.tickets.push(ticket);
        participant.total_amount += Number(ticket.total_amount) || 0;
        participant.total_quantity += Number(ticket.quantity) || 1;
      });

      setParticipants(Array.from(participantMap.values()));
      setSelectedParticipants([]);
      setSelectAll(false);
    } catch (err) {
      console.error('Error fetching participants:', err);
      toast({
        title: "Erreur",
        description: "Impossible de charger les participants",
        variant: "destructive"
      });
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleEventSelect = (eventId) => {
    const event = events.find(e => e.id === eventId);
    setSelectedEvent(event);
    fetchParticipants(eventId);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(participants.map(p => p.user_id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectParticipant = (userId) => {
    setSelectedParticipants(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const calculateTotalRefund = () => {
    return participants
      .filter(p => selectedParticipants.includes(p.user_id))
      .reduce((sum, p) => sum + p.total_amount, 0);
  };

  const processRefund = async () => {
    if (selectedParticipants.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins un participant à rembourser",
        variant: "destructive"
      });
      return;
    }

    if (!refundReason.trim()) {
      toast({
        title: "Raison requise",
        description: "Veuillez indiquer la raison du remboursement",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const selectedUsers = participants.filter(p => 
        selectedParticipants.includes(p.user_id)
      );

      const refundedUsers = [];
      const errors = [];

      for (const participant of selectedUsers) {
        try {
          // Récupérer le solde actuel
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('available_coins')
            .eq('id', participant.user_id)
            .single();

          if (profileError) throw profileError;

          const currentCoins = Number(profile.available_coins || 0);
          const refundAmount = participant.total_amount;

          // Ajouter les pièces
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              available_coins: currentCoins + refundAmount 
            })
            .eq('id', participant.user_id);

          if (updateError) throw updateError;

          // Créer la transaction
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: participant.user_id,
              transaction_type: 'event_refund',
              amount_pi: refundAmount,
              amount_fcfa: refundAmount * 5,
              status: 'completed',
              created_at: new Date().toISOString(),
              description: `Remboursement pour l'événement: ${selectedEvent.title}`,
              metadata: {
                event_id: selectedEvent.id,
                event_title: selectedEvent.title,
                secretary_id: secretaryId,
                reason: refundReason,
                ticket_count: participant.total_quantity
              }
            });

          if (transactionError) throw transactionError;

          // Mettre à jour les tickets
          const ticketIds = participant.tickets.map(t => t.id);
          const { error: ticketsError } = await supabase
            .from('tickets')
            .update({ 
              status: 'refunded',
              refunded_at: new Date().toISOString(),
              refunded_by: secretaryId,
              refund_reason: refundReason
            })
            .in('id', ticketIds);

          if (ticketsError) throw ticketsError;

          // Notification au participant
          await supabase.from('notifications').insert({
            user_id: participant.user_id,
            type: 'refund',
            title: 'Remboursement effectué',
            message: `Vous avez été remboursé de ${refundAmount} pièces pour l'événement "${selectedEvent.title}". Raison: ${refundReason}`,
            data: {
              event_id: selectedEvent.id,
              amount: refundAmount,
              reason: refundReason
            },
            created_at: new Date().toISOString()
          });

          refundedUsers.push({
            user_id: participant.user_id,
            amount: refundAmount,
            tickets: participant.total_quantity
          });

        } catch (err) {
          console.error(`Error refunding user ${participant.user_id}:`, err);
          errors.push({
            user: participant.full_name,
            error: err.message
          });
        }
      }

      // Journaliser l'action
      await supabase.from('secretary_actions').insert({
        secretary_id: secretaryId,
        action_type: 'refund_participants',
        event_id: selectedEvent.id,
        event_title: selectedEvent.title,
        participants_count: refundedUsers.length,
        total_amount: refundedUsers.reduce((sum, u) => sum + u.amount, 0),
        reason: refundReason,
        created_at: new Date().toISOString()
      });

      setRefundStats({
        participants: refundedUsers.length,
        amount: refundedUsers.reduce((sum, u) => sum + u.amount, 0),
        errors: errors.length
      });

      if (errors.length > 0) {
        toast({
          title: "Remboursement partiel",
          description: `${refundedUsers.length} participants remboursés. ${errors.length} erreurs.`,
          variant: "default"
        });
      } else {
        toast({
          title: "✅ Remboursement effectué",
          description: `${refundedUsers.length} participants remboursés. Total: ${refundedUsers.reduce((sum, u) => sum + u.amount, 0)} pièces.`,
          className: "bg-green-600 text-white"
        });
      }

      // Réinitialiser après 2 secondes
      setTimeout(() => {
        setSelectedEvent(null);
        setParticipants([]);
        setSelectedParticipants([]);
        setRefundReason('');
        setRefundStats(null);
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (err) {
      console.error('Refund error:', err);
      toast({
        title: "❌ Erreur",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.organizer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-blue-400" />
            Rembourser des participants
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Sélectionnez un événement et les participants à rembourser
          </DialogDescription>
        </DialogHeader>

        {!selectedEvent ? (
          // Étape 1: Sélection de l'événement
          <div className="flex-1 overflow-hidden">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un événement..."
                  className="pl-9 bg-gray-800 border-gray-700 text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {loadingEvents ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Aucun événement trouvé
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventSelect(event.id)}
                      className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-white">{event.title}</h3>
                          <p className="text-sm text-gray-400">
                            Organisateur: {event.organizer?.full_name || 'Inconnu'}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.event_end_at), 'dd MMM yyyy', { locale: fr })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ticket className="h-3 w-3" />
                              {event.tickets_sold || 0} tickets
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-900/50 text-blue-300 border-blue-700">
                          {event.event_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          // Étape 2: Sélection des participants
          <div className="flex-1 overflow-hidden">
            <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-white">{selectedEvent.title}</h3>
                  <p className="text-sm text-gray-400">
                    {format(new Date(selectedEvent.event_end_at), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Changer d'événement
                </Button>
              </div>
            </div>

            {/* Stats de l'événement */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-800/50 rounded-lg mb-4">
              <div>
                <p className="text-xs text-gray-400">Participants</p>
                <p className="font-bold text-white">{participants.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Tickets vendus</p>
                <p className="font-bold text-white">
                  {participants.reduce((sum, p) => sum + p.total_quantity, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total à rembourser</p>
                <p className="font-bold text-amber-400">
                  {participants.reduce((sum, p) => sum + p.total_amount, 0)} pièces
                </p>
              </div>
            </div>

            {/* Liste des participants */}
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between p-2 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    className="border-gray-600"
                  />
                  <Label htmlFor="selectAll" className="text-sm font-medium text-gray-300">
                    Sélectionner tous
                  </Label>
                </div>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  {selectedParticipants.length} sélectionnés
                </Badge>
              </div>

              <ScrollArea className="h-[250px] pr-4">
                {loadingParticipants ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    Aucun participant trouvé
                  </div>
                ) : (
                  <div className="space-y-2 p-2">
                    {participants.map((participant) => (
                      <div
                        key={participant.user_id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-700 bg-gray-800/30 hover:bg-gray-800 transition-colors"
                      >
                        <Checkbox
                          checked={selectedParticipants.includes(participant.user_id)}
                          onCheckedChange={() => handleSelectParticipant(participant.user_id)}
                          className="mt-1 border-gray-600"
                        />
                        
                        <Avatar className="h-8 w-8 bg-gray-700">
                          <AvatarFallback className="text-gray-300">
                            {participant.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-white truncate">
                            {participant.full_name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {participant.email}
                          </p>
                          <div className="flex gap-3 mt-1">
                            <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                              {participant.total_quantity} ticket(s)
                            </Badge>
                            <Badge variant="outline" className="border-amber-700 text-amber-400 text-xs">
                              {participant.total_amount} pièces
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Raison du remboursement */}
            <div className="mt-4">
              <Label htmlFor="reason" className="text-gray-300">Raison du remboursement</Label>
              <Textarea
                id="reason"
                placeholder="Expliquez la raison du remboursement..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="mt-1 bg-gray-800 border-gray-700 text-white"
                rows={2}
              />
            </div>

            {/* Récapitulatif */}
            {selectedParticipants.length > 0 && (
              <Alert className="mt-4 bg-blue-900/20 border-blue-800">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-400">Récapitulatif</AlertTitle>
                <AlertDescription className="text-gray-300">
                  <div className="space-y-1 mt-1">
                    <p>Participants: {selectedParticipants.length}</p>
                    <p>Tickets: {
                      participants
                        .filter(p => selectedParticipants.includes(p.user_id))
                        .reduce((sum, p) => sum + p.total_quantity, 0)
                    }</p>
                    <p className="font-bold text-amber-400">Total: {calculateTotalRefund()} pièces</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Résultat du remboursement */}
            {refundStats && (
              <Alert className="mt-4 bg-green-900/20 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertTitle className="text-green-400">Remboursement effectué</AlertTitle>
                <AlertDescription className="text-gray-300">
                  {refundStats.participants} participants remboursés • {refundStats.amount} pièces
                  {refundStats.errors > 0 && ` • ${refundStats.errors} erreurs`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Fermer
          </Button>
          {selectedEvent && (
            <Button
              onClick={processRefund}
              disabled={selectedParticipants.length === 0 || !refundReason.trim() || loading}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Rembourser {selectedParticipants.length} participant(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SecretaryRefundModal;