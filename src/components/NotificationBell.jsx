import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Calendar, Tag, Settings, Coins, CheckCircle, AlertCircle, Info, Ticket } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Sound effect for notifications
const playNotificationSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play blocked (user interaction required):', e));
  } catch (e) {
    console.error('Error playing sound:', e);
  }
};

const NotificationIcon = ({ type }) => {
  const icons = {
    new_event: <Calendar className="w-4 h-4 text-blue-500" />,
    promotion: <Tag className="w-4 h-4 text-purple-500" />,
    system: <Settings className="w-4 h-4 text-gray-500" />,
    earning: <Coins className="w-4 h-4 text-yellow-500" />,
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
    info: <Info className="w-4 h-4 text-cyan-500" />,
    ticket: <Ticket className="w-4 h-4 text-orange-500" />,
    default: <Bell className="w-4 h-4 text-gray-500" />,
  };
  return icons[type] || icons.default;
};

const NotificationItem = ({ notification, onNavigate, onDelete }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer group relative",
        notification.is_read ? 'hover:bg-muted/50 bg-background' : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
      )}
      onClick={() => onNavigate(notification)}
    >
      <div className="mt-1 flex-shrink-0">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5">
            <p className={cn("font-semibold text-sm truncate pr-6", !notification.is_read && "text-primary")}>
                {notification.title}
            </p>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{notification.message}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
          {new Date(notification.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 absolute top-2 right-2 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </motion.div>
  );
};

const NotificationBell = () => {
  const { user } = useAuth();
  const { notificationCount, fetchNotificationCount, triggerNotificationAnimation, notificationBellAnimation } = useData();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const audioRef = useRef(null);

  // Preload sound
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
  }, []);

  // Realtime Subscription for Notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime:notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT and UPDATE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Sync global count on any change
          fetchNotificationCount();

          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new;
            
            // Play sound
            playNotificationSound();
            triggerNotificationAnimation();

            // Show Toast
            toast({
              title: newNotif.title,
              description: newNotif.message,
              variant: 'info',
              duration: 4000,
              onClick: () => {
                  if (newNotif.data?.event_id) navigate(`/event/${newNotif.data.event_id}`);
              }
            });

            // If popover is open, add to list
            if (isOpen) {
              setNotifications((prev) => [newNotif, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
             // If marked as read elsewhere, update local list if open
             if (isOpen) {
                 setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
             }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen, fetchNotificationCount, triggerNotificationAnimation, navigate]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleNavigate = async (notification) => {
    // Mark as read immediately in UI
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    
    if (!notification.is_read) {
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notification.id);
        if (error) throw error;
        // Global count refresh happens via realtime subscription usually, but we can force it
        fetchNotificationCount();
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
    
    // Navigation logic
    if (notification.data?.event_id) {
        navigate(`/event/${notification.data.event_id}`);
    } else if (notification.data?.link) {
        navigate(notification.data.link);
    } else if (notification.type === 'earning') {
        navigate('/wallet');
    }
    
    setIsOpen(false);
  };

  const handleDelete = async (notificationId) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      fetchNotificationCount(); // Realtime will also trigger this, but safe to call
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la notification.", variant: "destructive" });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false);
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      fetchNotificationCount();
      toast({ title: "Tout marqué comme lu", variant: "success" });
    } catch (error) {
      toast({ title: "Erreur", description: "Opération échouée.", variant: "destructive" });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative cursor-pointer group">
            <motion.div
            animate={notificationBellAnimation || notificationCount > 0 ? {
                rotate: [0, -15, 10, -10, 5, -5, 0],
                transition: { duration: 0.8, repeat: notificationBellAnimation ? 1 : 0, repeatDelay: 2, ease: "easeInOut" }
            } : { rotate: 0 }}
            >
            <Button variant="ghost" size="icon" className="relative group-hover:bg-accent/50">
                <Bell className={cn("h-6 w-6 transition-colors", notificationCount > 0 ? "text-foreground" : "text-muted-foreground")} />
                <AnimatePresence>
                    {notificationCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1"
                    >
                        <Badge className="h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] border-2 border-background shadow-sm">
                        {notificationCount > 99 ? '99+' : notificationCount}
                        </Badge>
                    </motion.div>
                    )}
                </AnimatePresence>
                <span className="sr-only">Notifications</span>
            </Button>
            </motion.div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 sm:w-96 p-0 shadow-xl border-border/50 backdrop-blur-xl bg-background/95" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-4 border-b border-border/10 bg-muted/20">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            Notifications 
            {notificationCount > 0 && <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{notificationCount}</span>}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 hover:text-primary hover:bg-primary/10" 
            onClick={handleMarkAllAsRead} 
            disabled={notificationCount === 0}
          >
            Tout lire
          </Button>
        </div>
        
        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-40 gap-2 text-muted-foreground">
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></span>
              <p className="text-xs">Chargement...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-border/10">
              <AnimatePresence initial={false}>
                {notifications.map(notif => (
                  <NotificationItem key={notif.id} notification={notif} onNavigate={handleNavigate} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="bg-muted/30 p-4 rounded-full mb-3">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium">C'est calme par ici</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Vous n'avez aucune notification pour le moment.</p>
            </div>
          )}
        </div>
        
        <div className="p-2 border-t border-border/10 bg-muted/20 text-center">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={() => { navigate('/notifications'); setIsOpen(false); }}>
                Voir l'historique complet
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;