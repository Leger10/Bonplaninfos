import { supabase } from '@/lib/customSupabaseClient';

/**
 * Service pour notifier les participants lors des remboursements
 */
class ParticipantNotificationService {
  /**
   * Notifier tous les participants d'un événement lors d'un remboursement
   * @param {Object} params - Paramètres de notification
   * @returns {Promise<Object>} - Résultat des notifications
   */
  async notifyParticipantsRefund({ 
    eventId, 
    eventTitle, 
    adminId, 
    reason = 'Taux de présence insuffisant',
    customMessage = '',
    excludedUserIds = [] 
  }) {
    try {
      console.log('Starting participant notifications for refund:', { eventId, eventTitle });

      // 1. Récupérer tous les tickets confirmés pour cet événement
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          user_id,
          quantity,
          total_amount,
          status,
          user:user_id (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'confirmed');

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        throw ticketsError;
      }

      if (!tickets || tickets.length === 0) {
        console.log('No tickets found for event:', eventId);
        return {
          success: true,
          totalParticipants: 0,
          notificationsSent: 0,
          message: 'Aucun participant à notifier'
        };
      }

      // 2. Grouper par utilisateur pour éviter les doublons
      const participantMap = new Map();
      
      tickets.forEach(ticket => {
        if (!ticket.user) return; // Ignorer les tickets sans utilisateur
        
        const userId = ticket.user_id;
        if (excludedUserIds.includes(userId)) return; // Ignorer les exclus
        
        if (!participantMap.has(userId)) {
          participantMap.set(userId, {
            userId,
            user: ticket.user,
            tickets: [],
            totalAmount: 0,
            totalQuantity: 0
          });
        }
        
        const participant = participantMap.get(userId);
        participant.tickets.push(ticket);
        participant.totalAmount += Number(ticket.total_amount) || 0;
        participant.totalQuantity += Number(ticket.quantity) || 1;
      });

      const participants = Array.from(participantMap.values());
      console.log(`Found ${participants.length} participants to notify`);

      // 3. Envoyer les notifications
      const notifications = [];
      const errors = [];

      for (const participant of participants) {
        try {
          // Notification dans l'application
          const notifResult = await this.sendInAppNotification({
            participant,
            eventTitle,
            reason,
            customMessage,
            adminId,
            eventId
          });

          if (notifResult.success) {
            notifications.push({
              userId: participant.userId,
              type: 'in_app',
              amount: participant.totalAmount
            });
          }

          // Notification par email si disponible
          if (participant.user?.email) {
            await this.sendEmailNotification({
              email: participant.user.email,
              name: participant.user.full_name || 'Participant',
              eventTitle,
              amount: participant.totalAmount,
              reason
            }).catch(err => console.warn('Email failed:', err));
          }

          // Notification par SMS si disponible (optionnel)
          if (participant.user?.phone) {
            await this.sendSmsNotification({
              phone: participant.user.phone,
              eventTitle,
              amount: participant.totalAmount
            }).catch(err => console.warn('SMS failed:', err));
          }

        } catch (err) {
          console.error(`Error notifying participant ${participant.userId}:`, err);
          errors.push({
            userId: participant.userId,
            error: err.message
          });
        }
      }

      // 4. Logger l'action
      await this.logNotificationAction({
        adminId,
        eventId,
        eventTitle,
        participantCount: participants.length,
        notificationsSent: notifications.length,
        errors: errors.length,
        reason
      });

      return {
        success: true,
        totalParticipants: participants.length,
        notificationsSent: notifications.length,
        errors: errors.length,
        notifications,
        errors: errors.length > 0 ? errors : null,
        message: `${notifications.length} participant(s) notifié(s) sur ${participants.length}`
      };

    } catch (err) {
      console.error('Error in notifyParticipantsRefund:', err);
      return {
        success: false,
        error: err.message,
        message: 'Erreur lors de l\'envoi des notifications'
      };
    }
  }

  /**
   * Envoyer une notification in-app
   */
  async sendInAppNotification({ participant, eventTitle, reason, customMessage, adminId, eventId }) {
    try {
      const amount = participant.totalAmount;
      const ticketCount = participant.totalQuantity;

      // Construire le message
      const defaultMessage = `Votre participation à l'événement "${eventTitle}" a été remboursée.`;
      const amountMessage = `Montant remboursé : ${amount} pièces pour ${ticketCount} ticket(s).`;
      const reasonMessage = reason ? `Raison : ${reason}` : '';
      const customMessageText = customMessage ? `\n\n${customMessage}` : '';

      const fullMessage = [
        defaultMessage,
        amountMessage,
        reasonMessage,
        customMessageText,
        'Ces pièces sont maintenant disponibles dans votre portefeuille.'
      ].filter(Boolean).join('\n\n');

      // Vérifier si la table notifications existe
      const { error: tableCheck } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);

      if (tableCheck && tableCheck.code === '42P01') {
        // Table n'existe pas, logger en console
        console.log('Notification (table missing):', {
          user_id: participant.userId,
          title: '✅ Remboursement effectué',
          message: fullMessage
        });
        return { success: true, fallback: 'console' };
      }

      // Insérer la notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: participant.userId,
          title: '✅ Remboursement effectué',
          message: fullMessage,
          type: 'refund',
          data: {
            eventId,
            eventTitle,
            amount,
            ticketCount,
            reason,
            refundedBy: adminId,
            refundedAt: new Date().toISOString()
          },
          read: false,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };

    } catch (err) {
      console.error('Error sending in-app notification:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Envoyer une notification par email
   */
  async sendEmailNotification({ email, name, eventTitle, amount, reason }) {
    // Simulation d'envoi d'email
    console.log('Sending email to:', email, {
      name,
      eventTitle,
      amount,
      reason
    });

    // Intégration réelle avec un service d'email (SendGrid, Resend, etc.)
    // Exemple avec Resend :
    /*
    const { error } = await resend.emails.send({
      from: 'notifications@votre-domaine.com',
      to: email,
      subject: `↩️ Remboursement - ${eventTitle}`,
      html: this.generateEmailHtml({ name, eventTitle, amount, reason })
    });
    */

    return { success: true };
  }

  /**
   * Envoyer une notification par SMS
   */
  async sendSmsNotification({ phone, eventTitle, amount }) {
    // Simulation d'envoi de SMS
    console.log('Sending SMS to:', phone, {
      eventTitle,
      amount
    });

    // Intégration réelle avec un service SMS (Twilio, etc.)
    /*
    await twilioClient.messages.create({
      body: `Remboursement de ${amount} pièces pour "${eventTitle}" effectué.`,
      to: phone,
      from: process.env.TWILIO_PHONE
    });
    */

    return { success: true };
  }

  /**
   * Générer le HTML pour l'email
   */
  generateEmailHtml({ name, eventTitle, amount, reason }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .amount { font-size: 24px; font-weight: bold; color: #059669; margin: 20px 0; }
          .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Remboursement effectué</h1>
          </div>
          <div class="content">
            <p>Bonjour ${name || 'cher participant'},</p>
            <p>Votre participation à l'événement <strong>"${eventTitle}"</strong> a été remboursée.</p>
            <div class="amount">
              Montant remboursé : ${amount} pièces
            </div>
            ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
            <p>Les pièces ont été créditées sur votre portefeuille et sont disponibles pour de futures participations.</p>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Votre Plateforme. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Logger l'action de notification
   */
  async logNotificationAction({ adminId, eventId, eventTitle, participantCount, notificationsSent, errors, reason }) {
    try {
      // Vérifier si la table refund_logs existe
      const { error: tableCheck } = await supabase
        .from('refund_logs')
        .select('id')
        .limit(1);

      if (tableCheck && tableCheck.code === '42P01') {
        console.log('Refund log (table missing):', {
          adminId,
          eventId,
          eventTitle,
          participantCount,
          notificationsSent,
          errors,
          reason
        });
        return;
      }

      await supabase
        .from('refund_logs')
        .insert({
          admin_id: adminId,
          event_id: eventId,
          event_title: eventTitle,
          participant_count: participantCount,
          notifications_sent: notificationsSent,
          errors_count: errors,
          reason,
          created_at: new Date().toISOString()
        });

    } catch (err) {
      console.warn('Failed to log notification action:', err);
    }
  }

  /**
   * Récupérer l'historique des remboursements pour un événement
   */
  async getRefundHistory(eventId) {
    try {
      const { data, error } = await supabase
        .from('refund_logs')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('Error fetching refund history:', err);
      return { success: false, error: err.message, data: [] };
    }
  }

  /**
   * Récupérer les remboursements d'un participant
   */
  async getParticipantRefunds(userId) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          event:event_id (
            id,
            title,
            event_start_at
          )
        `)
        .eq('user_id', userId)
        .eq('transaction_type', 'event_refund')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('Error fetching participant refunds:', err);
      return { success: false, error: err.message, data: [] };
    }
  }
}

// Exporter une instance unique
export const participantNotificationService = new ParticipantNotificationService();
export default participantNotificationService;