import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { isPushSupported, subscribeUserToPush, getExistingSubscription, askNotificationPermission } from '@/utils/pushNotifications';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

const PushNotificationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const initializationAttempted = useRef(false);

  // Check current status
  useEffect(() => {
    if (!isPushSupported()) return;
    
    if (Notification.permission === 'granted') {
      setPermissionState('granted');
      getExistingSubscription().then(sub => {
        if (sub) setIsSubscribed(true);
      });
    } else {
      setPermissionState(Notification.permission);
    }
  }, []);

  // Logic to auto-subscribe or prompt
  useEffect(() => {
    if (!user || initializationAttempted.current) return;
    initializationAttempted.current = true;

    const initPush = async () => {
      if (!isPushSupported()) return;

      // Only auto-subscribe if permission is ALREADY granted
      if (Notification.permission === 'granted') {
        await handleSubscribe();
      }
      // If permission is 'default', we do NOTHING automatically to avoid browser blocking.
      // The user must click a button.
    };

    initPush();
  }, [user]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // 1. Ask permission (browser handles this logic: if granted, resolves immediately)
      const permission = await askNotificationPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        toast({
          title: 'Notifications bloquées',
          description: 'Veuillez autoriser les notifications dans votre navigateur pour recevoir les alertes.',
          variant: 'warning'
        });
        return;
      }

      // 2. Get Subscription from browser
      const subscription = await subscribeUserToPush();
      
      if (subscription) {
        console.log("Sending subscription to backend...", subscription.endpoint);
        
        // Prepare keys
        const p256dh = subscription.getKey('p256dh') 
          ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))) 
          : null;
        const auth = subscription.getKey('auth') 
          ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))) 
          : null;

        // 3. Store in DB
        const { error } = await supabase.from('push_tokens').upsert({
          user_id: user.id,
          token: subscription.endpoint,
          auth_key: auth,
          p256dh_key: p256dh,
          device_type: 'browser',
          is_active: true,
          last_used_at: new Date().toISOString()
        }, { onConflict: 'token' });

        if (error) {
          console.error('Database error storing token:', error);
          // Don't throw, browser subscription was successful
        }

        setIsSubscribed(true);
        console.log('Push setup complete.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'activer les notifications: " + error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show a prompt if user is logged in, permission is default, and we haven't tried yet
  // But simpler: we return null and let the settings page handle manual subscription mostly.
  // We can trigger a toast prompt here if desired.
  
  return null;
};

export default PushNotificationManager;