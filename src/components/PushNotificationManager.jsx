import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { isPushSupported, subscribeUserToPush, getExistingSubscription, askNotificationPermission, syncSubscription } from '@/utils/pushNotifications';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const PushNotificationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState('default'); // 'default', 'granted', 'denied'

  // Check current status on mount
  useEffect(() => {
    if (!isPushSupported()) return;
    
    setPermissionState(Notification.permission);

    // If permission is already granted, ensure we are synced
    if (Notification.permission === 'granted' && user) {
        syncSubscription(user);
    } 
    // If permission is default and user is logged in, show prompt after a delay
    else if (Notification.permission === 'default' && user) {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
    }
  }, [user]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const permission = await askNotificationPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        const sub = await subscribeUserToPush();
        if (sub && user) {
            await syncSubscription(user);
            toast({
                title: "Notifications activées !",
                description: "Vous serez informé des nouveaux événements.",
                variant: "success"
            });
        }
        setShowPrompt(false);
      } else {
        toast({
            title: "Notifications bloquées",
            description: "Vous devez autoriser les notifications dans votre navigateur pour recevoir les alertes.",
            variant: "warning"
        });
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Optionally save preference to not show again for this session
    sessionStorage.setItem('push_prompt_dismissed', 'true');
  };

  // Don't show if dismissed in session
  if (sessionStorage.getItem('push_prompt_dismissed') === 'true' && !isLoading) {
      return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-4 right-4 z-[60] w-full max-w-sm"
        >
          <div className="bg-background/95 backdrop-blur-md border border-primary/20 p-4 rounded-xl shadow-2xl flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <BellRing className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Ne ratez aucun événement !</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Activez les notifications pour recevoir les alertes des nouveaux événements et promos en temps réel.
              </p>
              <div className="flex gap-2">
                <Button 
                    size="sm" 
                    onClick={handleEnableNotifications} 
                    disabled={isLoading}
                    className="h-8 text-xs"
                >
                  {isLoading ? 'Activation...' : 'Activer'}
                </Button>
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleDismiss}
                    className="h-8 text-xs"
                >
                  Plus tard
                </Button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PushNotificationManager;