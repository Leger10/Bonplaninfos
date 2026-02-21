import { supabase } from '@/lib/customSupabaseClient';

class NotificationService {
    /**
     * Sauvegarder une notification pour un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} message - Message de la notification
     * @param {string} type - Type de notification
     * @param {Object} data - Données additionnelles
     * @returns {Promise<Object>} - Résultat de l'opération
     */
    async saveNotification(userId, message, type = 'system', data = {}) {
        try {
            // Vérifier si l'utilisateur existe
            const { data: userExists, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (userError || !userExists) {
                console.warn(`User ${userId} not found, skipping notification`);
                return { success: false, error: 'User not found' };
            }

            // Vérifier si la table notifications existe
            const { error: tableCheckError } = await supabase
                .from('notifications')
                .select('id')
                .limit(1);

            if (tableCheckError && tableCheckError.code === '42P01') {
                // Table n'existe pas, logger en console
                console.log('Notification (table not found):', {
                    user_id: userId,
                    title: this.generateTitle(type),
                    message,
                    type,
                    data
                });
                return { success: true, fallback: 'console' };
            }

            // Insérer la notification
            const { data: notification, error } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    title: this.generateTitle(type),
                    message: message,
                    type: type,
                    data: data,
                    read: false,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, data: notification };
        } catch (error) {
            console.error('Error saving notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notifier tous les super admins
     * @param {string} title - Titre de la notification
     * @param {string} message - Message de la notification
     * @param {string} type - Type de notification
     * @param {Object} data - Données additionnelles
     * @returns {Promise<Object>} - Résultat de l'opération
     */
    async notifySuperAdmins(title, message, type = 'admin_notification', data = {}) {
        try {
            // Récupérer tous les super admins
            const { data: superAdmins, error: saError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('user_type', 'super_admin');

            if (saError) {
                console.error('Error fetching super admins:', saError);
                return { success: false, error: saError.message };
            }

            if (!superAdmins || superAdmins.length === 0) {
                console.log('No super admins found');
                return { success: true, count: 0 };
            }

            // Vérifier si la table notifications existe
            const { error: tableCheckError } = await supabase
                .from('notifications')
                .select('id')
                .limit(1);

            if (tableCheckError && tableCheckError.code === '42P01') {
                // Table n'existe pas, logger en console
                console.log('Admin notifications (table not found):', {
                    admins: superAdmins.map(a => a.id),
                    title,
                    message,
                    type,
                    data
                });
                return { success: true, fallback: 'console', count: superAdmins.length };
            }

            // Préparer les notifications
            const notifications = superAdmins.map(admin => ({
                user_id: admin.id,
                title,
                message,
                type,
                data,
                read: false,
                created_at: new Date().toISOString()
            }));
            
            // Insérer en lot
            const { data: inserted, error } = await supabase
                .from('notifications')
                .insert(notifications)
                .select();

            if (error) throw error;

            // Logger l'action pour audit
            console.log(`Sent ${inserted?.length || 0} notifications to super admins`);

            return { 
                success: true, 
                count: inserted?.length || 0,
                data: inserted 
            };

        } catch (error) {
            console.error('Error sending notifications to super admins:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notifier un organisateur d'un changement de statut
     * @param {string} organizerId - ID de l'organisateur
     * @param {string} eventTitle - Titre de l'événement
     * @param {string} status - Nouveau statut
     * @param {string} reason - Raison du changement
     * @returns {Promise<Object>} - Résultat de l'opération
     */
    async notifyOrganizerStatusChange(organizerId, eventTitle, status, reason = '') {
        const statusMessages = {
            approved: {
                title: '✅ Retrait approuvé',
                message: `Votre demande de retrait pour "${eventTitle}" a été approuvée. Les fonds seront bientôt disponibles.`
            },
            rejected: {
                title: '❌ Retrait refusé',
                message: `Votre demande de retrait pour "${eventTitle}" a été refusée. Raison: ${reason || 'Non spécifiée'}`
            },
            pending: {
                title: '⏳ Demande en attente',
                message: `Votre demande de retrait pour "${eventTitle}" est en cours de traitement.`
            },
            refunded: {
                title: '↩️ Remboursement effectué',
                message: `Les participants de l'événement "${eventTitle}" ont été remboursés. Raison: ${reason || 'Annulation'}`
            },
            paid: {
                title: '💰 Paiement effectué',
                message: `Le paiement pour l'événement "${eventTitle}" a été effectué avec succès.`
            },
            created: {
                title: '📋 Demande créée',
                message: `Votre demande de retrait pour "${eventTitle}" a été créée et est en attente de validation.`
            }
        };

        const message = statusMessages[status] || {
            title: 'Mise à jour de statut',
            message: `Le statut de votre événement "${eventTitle}" a été modifié.`
        };

        const type = status === 'approved' || status === 'paid' ? 'success' : 
                    status === 'rejected' || status === 'refunded' ? 'error' : 'info';

        return this.saveNotification(
            organizerId,
            message.message,
            type,
            {
                eventTitle,
                status,
                reason,
                timestamp: new Date().toISOString()
            }
        );
    }

    /**
     * Notifier un participant d'un remboursement
     * @param {string} participantId - ID du participant
     * @param {string} eventTitle - Titre de l'événement
     * @param {number} amount - Montant remboursé
     * @returns {Promise<Object>} - Résultat de l'opération
     */
    async notifyParticipantRefund(participantId, eventTitle, amount) {
        return this.saveNotification(
            participantId,
            `Vous avez été remboursé de ${amount} pièces pour l'événement "${eventTitle}". Ces pièces sont disponibles dans votre portefeuille.`,
            'refund',
            {
                eventTitle,
                amount,
                type: 'refund'
            }
        );
    }

    /**
     * Marquer une notification comme lue
     * @param {string} notificationId - ID de la notification
     * @param {string} userId - ID de l'utilisateur (vérification)
     * @returns {Promise<Object>} - Résultat de l'opération
     */
    async markAsRead(notificationId, userId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .update({ 
                    read: true, 
                    read_at: new Date().toISOString() 
                })
                .eq('id', notificationId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Marquer toutes les notifications d'un utilisateur comme lues
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<Object>} - Résultat de l'opération
     */
    async markAllAsRead(userId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .update({ 
                    read: true, 
                    read_at: new Date().toISOString() 
                })
                .eq('user_id', userId)
                .eq('read', false)
                .select();

            if (error) throw error;
            return { 
                success: true, 
                count: data?.length || 0 
            };
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Récupérer les notifications d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {Object} options - Options de filtrage
     * @returns {Promise<Object>} - Notifications de l'utilisateur
     */
    async getUserNotifications(userId, options = {}) {
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (options.unreadOnly) {
                query = query.eq('read', false);
            }

            if (options.limit) {
                query = query.limit(options.limit);
            }

            if (options.type) {
                query = query.eq('type', options.type);
            }

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    /**
     * Obtenir le nombre de notifications non lues
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<Object>} - Nombre de notifications non lues
     */
    async getUnreadCount(userId) {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;
            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Error getting unread count:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }

    /**
     * Supprimer une notification
     * @param {string} notificationId - ID de la notification
     * @param {string} userId - ID de l'utilisateur (vérification)
     * @returns {Promise<Object>} - Résultat de l'opération
     */
    async deleteNotification(notificationId, userId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Nettoyer les anciennes notifications
     * @param {number} olderThanDays - Supprimer les notifications plus anciennes que X jours
     * @returns {Promise<Object>} - Résultat du nettoyage
     */
    async cleanupOldNotifications(olderThanDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const { data, error } = await supabase
                .from('notifications')
                .delete()
                .lt('created_at', cutoffDate.toISOString())
                .eq('read', true) // Ne supprimer que les notifications lues
                .select('count');

            if (error) throw error;
            
            return {
                success: true,
                deletedCount: data?.length || 0
            };
        } catch (error) {
            console.error('Error cleaning up notifications:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Générer un titre basé sur le type de notification
     * @param {string} type - Type de notification
     * @returns {string} - Titre généré
     */
    generateTitle(type) {
        const titles = {
            // Types existants
            'earning': '🎉 Nouveau gain !',
            'new_event': '📅 Nouvel événement !',
            'promotion': '🎁 Promotion spéciale !',
            'admin_notification': '🔔 Notification Administrateur',
            
            // Nouveaux types
            'refund': '↩️ Remboursement effectué',
            'withdrawal_approved': '✅ Retrait approuvé',
            'withdrawal_rejected': '❌ Retrait refusé',
            'withdrawal_pending': '⏳ Demande en attente',
            'payment_received': '💰 Paiement reçu',
            'event_cancelled': '⚠️ Événement annulé',
            'info': 'ℹ️ Information',
            'success': '✅ Succès',
            'warning': '⚠️ Attention',
            'error': '❌ Erreur',
            'system': '🖥️ Notification système'
        };
        
        return titles[type] || '🔔 Notification';
    }
}

// Exporter une instance unique
export const notificationService = new NotificationService();
export default notificationService;