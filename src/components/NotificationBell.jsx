import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, CheckCheck, Calendar, Tag, Settings, Coins, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NotificationIcon = ({ type }) => {
  const icons = {
    new_event: <Calendar className="w-4 h-4 text-blue-500" />,
    promotion: <Tag className="w-4 h-4 text-purple-500" />,
    system: <Settings className="w-4 h-4 text-gray-500" />,
    earning: <Coins className="w-4 h-4 text-yellow-500" />,
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
    info: <Info className="w-4 h-4 text-cyan-500" />,
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
        "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer",
        notification.is_read ? 'hover:bg-muted/50' : 'bg-primary/10 hover:bg-primary/20'
      )}
      onClick={() => onNavigate(notification)}
    >
      <div className="mt-1">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{notification.title}</p>
        <p className="text-xs text-muted-foreground">{notification.message}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {new Date(notification.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
      >
        <X className="h-4 w-4" />
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

  // Subscribe to Realtime Notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
        .channel('realtime:notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
        }, (payload) => {
            console.log('Realtime notification received:', payload);
            fetchNotificationCount();
            triggerNotificationAnimation();
            
            // Show toast for the new notification
            toast({
                title: payload.new.title,
                description: payload.new.message,
                variant: 'info'
            });
            
            // If the bell is open, add it to the list immediately
            if (isOpen) {
                setNotifications(prev => [payload.new, ...prev]);
            }
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isOpen, fetchNotificationCount, triggerNotificationAnimation]);

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

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleNavigate = async (notification) => {
    if (!notification.is_read) {
      try {
        await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notification.id);
        fetchNotificationCount();
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
    if (notification.data?.event_id) navigate(`/event/${notification.data.event_id}`);
    else if (notification.data?.link) navigate(notification.data.link);
    setIsOpen(false);
  };

  const handleDelete = async (notificationId) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      fetchNotificationCount();
      toast({ title: "Notification supprimée", variant: "success" });
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
      toast({ title: "Toutes les notifications ont été marquées comme lues", variant: "success" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de marquer les notifications comme lues.", variant: "destructive" });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.div
          animate={notificationBellAnimation || notificationCount > 0 ? {
            rotate: [0, -15, 10, -10, 5, -5, 0],
            transition: { duration: 0.8, repeat: notificationBellAnimation ? 1 : 0, repeatDelay: 2, ease: "easeInOut" }
          } : { rotate: 0 }}
          className="relative"
        >
          <Button variant="ghost" size="icon">
            <Bell className="h-6 w-6" />
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 bg-red-500 text-white text-xs border-2 border-background">
                {notificationCount}
              </Badge>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="flex items-center justify-between p-2">
          <h3 className="font-semibold">Notifications</h3>
          <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={handleMarkAllAsRead} disabled={notificationCount === 0}>
            Marquer tout comme lu
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
          {loading ? (
            <div className="flex justify-center items-center h-24">
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : notifications.length > 0 ? (
            <AnimatePresence>
              {notifications.map(notif => (
                <NotificationItem key={notif.id} notification={notif} onNavigate={handleNavigate} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-8 px-4">
              <Bell className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Vous n'avez aucune notification.</p>
            </div>
          )}
        </div>
        <div className="text-center border-t pt-2 mt-1">
            <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { navigate('/notifications'); setIsOpen(false); }}>
                Voir toutes les notifications
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;