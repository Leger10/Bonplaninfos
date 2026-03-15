import React, { useEffect } from 'react';
import { Bell, Volume2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NotificationCenter = () => {
  const { notificationCount, notificationBellAnimation } = useData();
  const { playNotificationSound } = useNotificationSound();
  const navigate = useNavigate();

  // Log lors du rendu pour debug
  useEffect(() => {
    console.info(`[NotificationCenter] 🖥️ Rendu du composant. Compteur : ${notificationCount}, Animation : ${notificationBellAnimation}`);
  }, [notificationCount, notificationBellAnimation]);

  const handleTestSound = (e) => {
    e.stopPropagation();
    console.info('[NotificationCenter] 🎵 Test manuel du son déclenché par l\'utilisateur');
    playNotificationSound('default');
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => {
          console.info('[NotificationCenter] 🖱️ Clic sur la cloche, navigation vers /notifications');
          navigate('/notifications');
        }}
        title="Voir les notifications"
      >
        <Bell 
          className={cn(
            "h-5 w-5 transition-colors",
            notificationBellAnimation ? "animate-bounce text-primary" : "text-muted-foreground hover:text-foreground"
          )} 
        />
        
        {notificationCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </Button>

      {/* Button only visible in dev/test for playing sound manually */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex" 
        onClick={handleTestSound} 
        title="Test Notification Sound"
      >
        <Volume2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default NotificationCenter;