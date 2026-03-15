import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  isPushSupported, 
  askNotificationPermission,
  subscribeToPushNotifications, 
  syncSubscription, 
  savePushTokenToSupabase 
} from '@/utils/pushNotifications';
import { Button } from '@/components/ui/button';
import { BellRing, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const PushNotificationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 'default', 'granted', 'denied'
  const [permissionState, setPermissionState] = useState('default');

  // Check current status on mount
  useEffect(() => {
    if (!isPushSupported()) return;
    
    // Check permission status directly from Notification API
    setPermissionState(Notification.permission);

    // If permission is already granted, ensure we are synced
    if (Notification.permission === 'granted' && user) {
        syncSubscription(user).catch(err => console.error("Sync failed silently:", err));
    } 
    // If permission is default and user is logged in, show prompt after a delay
    else if (Notification.permission === 'default' && user) {
        // Check if user dismissed it previously in this session
        const isDismissed = sessionStorage.getItem('push_prompt_dismissed') === 'true';
        if (!isDismissed) {
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }
    }
  }, [user]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const isGranted = await askNotificationPermission();
      setPermissionState(isGranted ? 'granted' : 'denied');

      if (isGranted) {
        // Subscribe the user via Service Worker
        const subscription = await subscribeToPushNotifications();
        
        if (subscription && user) {
            // Save to database
            const { error } = await savePushTokenToSupabase(user, subscription);
            
            if (error) {
                console.error("Database save error:", error);
                toast({
                    title: "Erreur technique",
                    description: "Notifications activées sur l'appareil, mais échec de l'enregistrement serveur.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Notifications activées !",
                    description: "Vous serez informé des nouveaux événements.",
                    className: "bg-green-600 text-white"
                });
            }
        }
        setShowPrompt(false);
      } else {
        toast({
            title: "Notifications bloquées",
            description: "Vous devez autoriser les notifications dans les paramètres de votre navigateur.",
            variant: "destructive"
        });
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications : " + (error.message || "Erreur inconnue"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('push_prompt_dismissed', 'true');
  };

  // Don't render if not supported
  if (!isPushSupported()) return null;

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
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Activation...
                    </>
                  ) : (
                    'Activer'
                  )}
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
            <button 
                onClick={handleDismiss} 
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PushNotificationManager;