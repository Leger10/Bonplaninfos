// src/hooks/useRefundNotifications.js
import { useState } from 'react';
import { participantNotificationService } from '@/services/participantNotificationService';
import { toast } from '@/components/ui/use-toast';

export const useRefundNotifications = () => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const notifyParticipants = async (eventId, eventTitle, options = {}) => {
    setLoading(true);
    try {
      const result = await participantNotificationService.notifyParticipantsRefund({
        eventId,
        eventTitle,
        ...options
      });

      if (result.success) {
        toast({
          title: "✅ Notifications envoyées",
          description: `${result.notificationsSent} participants ont été notifiés.`,
          className: "bg-green-600 text-white"
        });
      } else {
        toast({
          title: "⚠️ Notification partielle",
          description: `${result.notificationsSent}/${result.totalParticipants} notifications envoyées.`,
          variant: "default"
        });
      }

      return result;
    } catch (err) {
      toast({
        title: "❌ Erreur",
        description: "Impossible d'envoyer les notifications: " + err.message,
        variant: "destructive"
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loadRefundHistory = async (eventId) => {
    setLoading(true);
    try {
      const result = await participantNotificationService.getRefundHistory(eventId);
      if (result.success) {
        setHistory(result.data);
      }
      return result;
    } catch (err) {
      console.error('Error loading refund history:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getParticipantRefunds = async (userId) => {
    setLoading(true);
    try {
      const result = await participantNotificationService.getParticipantRefunds(userId);
      return result;
    } catch (err) {
      console.error('Error loading participant refunds:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    history,
    notifyParticipants,
    loadRefundHistory,
    getParticipantRefunds
  };
};