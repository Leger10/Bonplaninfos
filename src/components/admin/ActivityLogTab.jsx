import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, User, Calendar, Coins, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ActivityLogTab = () => {
  const { user } = useAuth();
  const { userProfile } = useData();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = userProfile?.user_type === 'super_admin';
  const isAdmin = userProfile?.user_type === 'admin';

  const fetchLogs = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      let query = supabase
        .from('admin_logs')
        .select('*, actor:actor_id(full_name, email, user_type)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (isAdmin && !isSuperAdmin) {
        // Admin sees logs from secretaries they appointed
        const { data: appointedSecretaries, error: secretariesError } = await supabase
          .from('profiles')
          .select('id')
          .eq('appointed_by', user.id);
        
        if (secretariesError) throw secretariesError;
        
        const secretaryIds = appointedSecretaries.map(s => s.id);
        query = query.in('actor_id', secretaryIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Manually fetch target names
      const logsWithTargets = await Promise.all(data.map(async log => {
        let targetName = 'ID: ' + log.target_id?.substring(0,8) + '...';
        if (log.target_id) {
          if (log.action_type.includes('user') || log.action_type.includes('secretary')) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', log.target_id).single();
            if (profile) targetName = profile.full_name;
          } else if (log.action_type.includes('event')) {
            const { data: event } = await supabase.from('events').select('title').eq('id', log.target_id).single();
            if (event) targetName = `"${event.title}"`;
          }
        }
        return { ...log, targetName };
      }));
      
      setLogs(logsWithTargets || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      toast({ title: "Erreur", description: "Impossible de charger le journal d'activités.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isSuperAdmin, user, userProfile]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (type) => {
    const icons = {
      user_blocked: <Ban className="w-4 h-4 text-red-400" />,
      user_unblocked: <CheckCircle className="w-4 h-4 text-green-400" />,
      user_deleted: <Trash2 className="w-4 h-4 text-red-600" />,
      user_credited: <Coins className="w-4 h-4 text-yellow-400" />,
      event_deleted: <Calendar className="w-4 h-4 text-red-500" />,
      secretary_appointed: <User className="w-4 h-4 text-purple-400" />,
      secretary_revoked: <User className="w-4 h-4 text-gray-400" />,
    };
    return icons[type] || <BookOpen className="w-4 h-4 text-gray-500" />;
  };

  const formatLogMessage = (log) => {
    const actorName = log.actor?.full_name || 'Un administrateur';
    const target = log.targetName || 'inconnu';

    switch (log.action_type) {
      case 'user_blocked':
        return `${actorName} a bloqué l'utilisateur ${target}.`;
      case 'user_unblocked':
        return `${actorName} a débloqué l'utilisateur ${target}.`;
      case 'user_deleted':
        return `${actorName} a supprimé l'utilisateur ${target}.`;
      case 'user_credited':
        return `${actorName} a crédité ${log.details?.amount || 'N/A'} pièces à ${target}. Raison: ${log.details?.reason || 'N/A'}`;
      case 'event_deleted':
        return `${actorName} a supprimé l'événement ${target}.`;
      case 'secretary_appointed':
        return `${actorName} a nommé ${target} comme secrétaire.`;
      case 'secretary_revoked':
        return `${actorName} a révoqué le rôle de secrétaire de ${target}.`;
      default:
        return `Action: ${log.action_type} par ${actorName} sur la cible ${target}.`;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <BookOpen className="w-5 h-5 mr-2 text-primary" />
          Journal d'activités
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucune activité récente à afficher.</p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-start space-x-4 p-3 bg-background/50 rounded-lg">
                <div className="flex-shrink-0 mt-1">{getActionIcon(log.action_type)}</div>
                <div className="flex-grow">
                  <p className="text-sm text-white">{formatLogMessage(log)}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                    <Badge variant="secondary" className="capitalize">{log.actor?.user_type}</Badge>
                    <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogTab;