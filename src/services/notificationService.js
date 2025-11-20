import { supabase } from '@/lib/customSupabaseClient';

class NotificationService {
    async saveNotification(userId, message, type = 'system', data = {}) {
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            title: this.generateTitle(type),
            message: message,
            type: type,
            data: data,
        });

        if (error) {
            console.error('Error saving notification:', error);
        }
    }

    async notifySuperAdmins(title, message, type = 'admin_notification', data = {}) {
        const { data: superAdmins, error: saError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_type', 'super_admin');

        if (saError) {
            console.error('Error fetching super admins:', saError);
            return;
        }

        const notifications = superAdmins.map(admin => ({
            user_id: admin.id,
            title,
            message,
            type,
            data,
        }));
        
        if (notifications.length > 0) {
            const { error } = await supabase.from('notifications').insert(notifications);
             if (error) {
                console.error('Error sending notifications to super admins:', error);
            }
        }
    }

    generateTitle(type) {
        switch (type) {
            case 'earning': return 'Nouvel gain !';
            case 'new_event': return 'Nouvel événement !';
            case 'promotion': return 'Promotion spéciale !';
            case 'admin_notification': return 'Notification Administrateur';
            default: return 'Notification';
        }
    }
}

export const notificationService = new NotificationService();