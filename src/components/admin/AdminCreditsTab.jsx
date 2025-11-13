import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Coins, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const AdminCreditsTab = () => {
  const { userProfile } = useData();
  const [creditLogs, setCreditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCreditLogs = useCallback(async () => {
    if (!userProfile?.country) return;
    setLoading(true);

    try {
      const { data: superAdmins, error: saError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'super_admin');

      if (saError) throw saError;
      const superAdminIds = superAdmins.map(sa => sa.id);

      const { data: secretaries, error: secError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'secretary')
        .in('appointed_by', superAdminIds);

      if (secError) throw secError;
      const secretaryIds = secretaries.map(s => s.id);

      const actorIds = [...superAdminIds, ...secretaryIds];

      let query = supabase
        .from('admin_logs')
        .select(`
          id,
          created_at,
          details,
          actor:actor_id (full_name, user_type),
          target_user:target_id (full_name, email, country, city)
        `)
        .in('actor_id', actorIds)
        .eq('action_type', 'user_credited')
        .eq('target_user.country', userProfile.country)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`target_user.full_name.ilike.%${searchTerm}%,target_user.email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCreditLogs(data.filter(log => !(log.details?.reversed))); // Filter out reversed logs

    } catch (error) {
      toast({ title: 'Erreur', description: "Impossible de charger l'historique des crédits.", variant: 'destructive' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.country, searchTerm]);

  useEffect(() => {
    fetchCreditLogs();
  }, [fetchCreditLogs]);

  return (
    <Card className="glass-effect shadow-lg">
      <CardHeader>
        <CardTitle>Historique des Crédits Effectués</CardTitle>
        <p className="text-muted-foreground">
          Liste des utilisateurs de votre pays ({userProfile?.country}) crédités par les Super Admins et leurs secrétaires.
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email d'utilisateur..."
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
                <TableHead>Utilisateur Crédité</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Crédité par</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="5" className="text-center">Aucun crédit trouvé.</TableCell>
                </TableRow>
              ) : (
                creditLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <p className="font-semibold">{log.target_user?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{log.target_user?.email}</p>
                    </TableCell>
                    <TableCell>
                      <p>{log.target_user?.city || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{log.target_user?.country}</p>
                    </TableCell>
                    <TableCell className="font-bold flex items-center gap-1">
                      {log.details?.amount} <Coins className="w-4 h-4 text-yellow-400" />
                    </TableCell>
                    <TableCell>
                      <p>{log.actor?.full_name}</p>
                       <p className="text-xs text-muted-foreground capitalize">{log.actor?.user_type.replace('_', ' ')}</p>
                    </TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleString('fr-FR')}</TableCell>
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

export default AdminCreditsTab;