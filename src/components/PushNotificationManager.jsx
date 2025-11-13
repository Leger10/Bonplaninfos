import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { initPushNotifications } from '@/utils/pushNotifications';

const PushNotificationManager = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const initialize = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            await initPushNotifications(user.id);
          } else if (permission === 'denied') {
            console.warn('Push notification permission denied.');
          }
        } catch (error) {
          console.error('Error initializing push notifications:', error);
          toast({
            variant: 'destructive',
            title: 'Erreur de notification',
            description: 'Impossible d\'activer les notifications push. ' + error.message,
          });
        }
      };
      
      initialize();
    }
  }, [user]);

  return null; // This component does not render anything
};

export default PushNotificationManager;