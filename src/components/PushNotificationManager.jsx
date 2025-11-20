import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { isPushSupported, subscribeUserToPush, getExistingSubscription } from '@/utils/pushNotifications';
import { supabase } from '@/lib/customSupabaseClient';

const PushNotificationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !isPushSupported()) {
        setIsLoading(false);
        return;
      }

      try {
        const existingSubscription = await getExistingSubscription();
        if (existingSubscription) {
          // Verify if the subscription is still on the server
          const { data, error } = await supabase
            .from('push_tokens')
            .select('id')
            .eq('token', existingSubscription.endpoint)
            .single();
          
          if (data) {
            setIsSubscribed(true);
          } else {
            // Subscription exists in browser but not on server, re-subscribe
            await subscribeAndSave();
          }
        } else {
          // No subscription found in browser, attempt to subscribe
          if (Notification.permission === 'granted') {
            await subscribeAndSave();
          }
        }
      } catch (error) {
        console.error('Error checking push subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  const subscribeAndSave = async () => {
    try {
      const subscription = await subscribeUserToPush();
      if (subscription) {
        const { error } = await supabase.from('push_tokens').upsert({
          user_id: user.id,
          token: subscription.endpoint,
          auth_key: subscription.keys.auth,
          p256dh_key: subscription.keys.p256dh,
          is_active: true,
        }, { onConflict: 'token' });

        if (error) throw error;

        setIsSubscribed(true);
        toast({
          title: 'Notifications activées',
          description: 'Vous recevrez désormais les notifications.',
        });
      }
    } catch (error) {
      console.error('Failed to subscribe and save:', error);
      if (error.message.includes('denied')) {
        toast({
          title: 'Erreur de notification',
          description: "Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.",
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erreur de notification',
          description: `Impossible d'activer les notifications push. ${error.message}`,
          variant: 'destructive',
        });
      }
    }
  };

  useEffect(() => {
    const handleSubscriptionRequest = async () => {
      if (!user || isLoading || isSubscribed || !isPushSupported() || Notification.permission !== 'default') {
        return;
      }

      // This logic can be expanded to show a custom UI element to ask for permission
      // For now, we can try to subscribe if permission is 'default'
      // This might be blocked by browsers if not triggered by a user action.
      // A better approach is to have a button in settings to enable notifications.
      // console.log("Ready to request notification permission.");
    };

    handleSubscriptionRequest();
  }, [user, isLoading, isSubscribed, toast]);

  return null; // This is a manager component, it doesn't render anything.
};

export default PushNotificationManager;