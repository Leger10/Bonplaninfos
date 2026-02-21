import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

/**
 * Service for handling event refunds.
 * Includes security checks, idempotence verification via ticket status, and audit logging.
 */
export const refundService = {
  /**
   * Récupère les participants pour un événement.
   * @param {string} eventId 
   */
  async getParticipantsForEvent(eventId) {
    console.log('--- [DEBUG] START getParticipantsForEvent ---');
    if (!eventId) return { participants: [], totalRefundAmount: 0 };

    try {
      // 1. Récupérer le type d'événement
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('event_type, title')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      const eventType = eventData?.event_type;

      // 2. Stratégie de récupération selon le type
      let rawItems = [];
      let targetTable = 'tickets'; // Default

      switch (eventType) {
        case 'raffle':
          const { data: raffleEvent } = await supabase.from('raffle_events').select('id').eq('event_id', eventId).maybeSingle();
          if (raffleEvent) {
            const { data } = await supabase.from('raffle_tickets')
              .select('user_id, purchase_price_pi, quantity, total_pi_paid')
              .eq('raffle_event_id', raffleEvent.id);
            rawItems = data || [];
          }
          break;
        case 'stand_rental':
          const { data: standEvent } = await supabase.from('stand_events').select('id').eq('event_id', eventId).maybeSingle();
          if (standEvent) {
             const { data } = await supabase.from('stand_rentals')
              .select('user_id, rental_amount_pi')
              .eq('stand_event_id', standEvent.id)
              .in('status', ['confirmed', 'paid', 'active']);
             rawItems = data || [];
          }
          break;
        case 'voting':
          const { data: votes } = await supabase.from('user_votes').select('user_id, vote_cost_pi, vote_count').eq('event_id', eventId);
          rawItems = votes || [];
          break;
        case 'ticketing':
        default:
          const { data: tickets } = await supabase.from('event_tickets').select('user_id, purchase_amount_pi, status').eq('event_id', eventId);
          if (tickets && tickets.length > 0) {
             rawItems = tickets;
          } else {
             // Fallback legacy
             const { data: legacy } = await supabase.from('tickets').select('user_id, total_amount_pi, status, quantity').eq('event_id', eventId);
             rawItems = legacy || [];
          }
          break;
      }

      if (!rawItems || rawItems.length === 0) return { participants: [], totalRefundAmount: 0 };

      // 3. Récupérer les profils
      const userIds = [...new Set(rawItems.map(t => t.user_id).filter(Boolean))];
      let profileMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
        if (profiles) profileMap = new Map(profiles.map(p => [p.id, p]));
      }

      // 4. Agrégation
      const participantMap = new Map();
      let totalRefundAmount = 0;

      rawItems.forEach(item => {
        const userId = item.user_id;
        if (!userId) return;

        // Normalisation montant
        let amount = item.amount_paid_pi || item.total_amount_pi || item.purchase_amount_pi || item.rental_amount_pi || item.vote_cost_pi || 0;
        // Correction pour raffle si total_pi_paid présent
        if (eventType === 'raffle' && item.total_pi_paid) amount = item.total_pi_paid;
        else if (eventType === 'raffle' && item.purchase_price_pi) amount = item.purchase_price_pi * (item.quantity || 1);

        let qty = item.quantity || item.vote_count || 1;

        if (!participantMap.has(userId)) {
          const profile = profileMap.get(userId) || { full_name: 'Inconnu', email: 'N/A' };
          participantMap.set(userId, {
            user_id: userId,
            full_name: profile.full_name,
            email: profile.email,
            total_amount_pi: 0,
            ticket_count: 0
          });
        }

        const p = participantMap.get(userId);
        p.total_amount_pi += amount;
        p.ticket_count += qty;
        totalRefundAmount += amount;
      });

      return {
        participants: Array.from(participantMap.values()),
        totalRefundAmount
      };

    } catch (err) {
      console.error('Error in getParticipantsForEvent:', err);
      return { participants: [], totalRefundAmount: 0 };
    }
  },

  /**
   * Récupère la liste des remboursements DÉJÀ effectués pour cet événement.
   * Utilise la table participant_refunds comme source de vérité.
   */
  async getRefundedParticipants(eventId) {
    try {
      const { data, error } = await supabase
        .from('participant_refunds')
        .select('user_id, amount, processed_at')
        .eq('event_id', eventId)
        .eq('status', 'completed');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching refunded participants:', err);
      return [];
    }
  },

  /**
   * Exécute le remboursement.
   */
  async processRefund(eventId, adminId, selectedParticipants = [], reason = '') {
    console.log('--- [DEBUG] START processRefund ---');
    
    if (!eventId || !adminId) throw new Error("Paramètres manquants");
    if (!selectedParticipants || selectedParticipants.length === 0) throw new Error("Aucun participant sélectionné");

    // Fetch conversion rate for FCFA calculation (Task 1 & 3)
    let conversionRate = 10; // Default constant 1 PI = 10 FCFA
    try {
        const { data: settings } = await supabase
            .from('app_settings')
            .select('coin_to_fcfa_rate')
            .limit(1)
            .maybeSingle();
        
        if (settings?.coin_to_fcfa_rate) {
            conversionRate = settings.coin_to_fcfa_rate;
        }
    } catch (err) {
        console.warn('Error fetching conversion rate, using default (10):', err);
    }

    // 1. Récupérer les données à jour
    const { participants } = await this.getParticipantsForEvent(eventId);
    
    // 2. Filtrer
    const targets = participants.filter(p => selectedParticipants.includes(p.user_id));
    
    // 3. Vérifier qu'ils ne sont pas DÉJÀ remboursés (Double Check Sécurité)
    const refundedRecords = await this.getRefundedParticipants(eventId);
    const refundedIds = new Set(refundedRecords.map(r => r.user_id));
    
    const validTargets = targets.filter(t => !refundedIds.has(t.user_id));
    
    if (validTargets.length === 0) {
        return { success: false, error: "Tous les participants sélectionnés ont déjà été remboursés." };
    }

    let successCount = 0;
    let totalRefunded = 0;
    let failureCount = 0;

    // 4. Boucle de remboursement
    for (const participant of validTargets) {
        const userId = participant.user_id;
        const amount = participant.total_amount_pi || 0;

        if (amount <= 0) continue;

        // Calculate amount_fcfa (Task 1 & 5)
        const amountFcfa = amount * conversionRate;

        // Warning log if calculation issue (Task 6)
        if (amountFcfa === undefined || amountFcfa === null || isNaN(amountFcfa)) {
             console.warn(`[RefundService] Warning: amount_fcfa calculation failed/missing for user ${userId}. amount: ${amount}, rate: ${conversionRate}`);
        }

        try {
            // A. Update Profile
            const { error: profileError } = await supabase.rpc('increment_user_coins', { 
                p_user_id: userId, 
                p_amount: amount 
            });
            
            if (profileError) throw profileError;

            // B. Insert into Participant Refunds (Source of Truth)
            await supabase.from('participant_refunds').insert({
                event_id: eventId,
                user_id: userId,
                amount: amount,
                reason: reason || 'Remboursement manuel',
                status: 'completed',
                processed_by: adminId,
                processed_at: new Date().toISOString()
            });

            // C. Insert Transaction Log (Correction Task 1, 2, 4)
            await supabase.from('transactions').insert({
                user_id: userId,
                event_id: eventId,
                transaction_type: 'refund',
                amount_pi: amount, // Positive because it's a credit to user
                amount_fcfa: amountFcfa || (amount * 10), // Ensure presence
                description: `Remboursement événement: ${reason}`,
                status: 'completed'
            });

            successCount++;
            totalRefunded += amount;

        } catch (err) {
            console.error(`Echec remboursement ${userId}:`, err);
            failureCount++;
        }
    }

    // 5. Log global action
    await supabase.from('event_refund_logs').insert({
        event_id: eventId,
        admin_id: adminId,
        reason: reason,
        total_amount: totalRefunded,
        refunded_user_count: successCount
    });

    return {
        success: true,
        count: successCount,
        totalAmount: totalRefunded,
        failures: failureCount
    };
  },

  /**
   * Vérifie le statut via les logs (Legacy/Global check)
   */
  async verifyRefundStatus(eventId) {
    const { data } = await supabase.from('event_refund_logs').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    return data || [];
  }
};

export default refundService;