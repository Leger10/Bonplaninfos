import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Coins, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const WithdrawalHistoryTab = ({ actorId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_logs')
        .select(`
          id, created_at, details,
          actor:actor_id (full_name),
          target_user:target_id (full_name, email)
        `)
        .in('action_type', ['withdrawal_approved', 'withdrawal_rejected', 'withdrawal_paid'])
        .order('created_at', { ascending: false });

      if (actorId) {
        query = query.eq('actor_id', actorId);
      }
      
      if (searchTerm) {
        query = query.or(`target_user.full_name.ilike.%${searchTerm}%,target_user.email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      toast({ title: 'Erreur', description: "Impossible de charger l'historique des retraits.", variant: 'destructive' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [actorId, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Card className="glass-effect shadow-lg">
      <CardHeader>
        <CardTitle>Historique des Traitements de Retraits</CardTitle>
        <CardDescription>
          Suivi des approbations et rejets de demandes de retrait.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email d'organisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisateur</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Action</TableHead>
                {!actorId && <TableHead>Traité par</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={actorId ? 5 : 6} className="text-center">Aucun traitement de retrait trouvé.</TableCell>
                </TableRow>
              ) : (
                logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <p className="font-semibold">{log.target_user?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{log.target_user?.email}</p>
                    </TableCell>
                    <TableCell className="font-bold flex items-center gap-1">
                      {log.details?.amount_pi} <Coins className="w-4 h-4 text-yellow-400" />
                    </TableCell>
                    <TableCell>
                       <span className={`px-2 py-1 rounded text-xs ${
                        log.action_type === 'withdrawal_approved' || log.action_type === 'withdrawal_paid' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                       }`}>
                         {log.action_type === 'withdrawal_approved' ? 'Approuvé' : (log.action_type === 'withdrawal_paid' ? 'Payé' : 'Rejeté')}
                       </span>
                    </TableCell>
                    {!actorId && (
                      <TableCell>
                        <p>{log.actor?.full_name || 'N/A'}</p>
                      </TableCell>
                    )}
                    <TableCell>{new Date(log.created_at).toLocaleString('fr-FR')}</TableCell>
                    <TableCell className="text-xs">{log.details?.notes || log.details?.rejection_reason || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalHistoryTab;