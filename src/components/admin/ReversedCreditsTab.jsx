import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Coins, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ReversedCreditsTab = ({ isSuperAdmin, actorId, country }) => {
  const { adminConfig } = useData();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totals, setTotals] = useState({ coins: 0, cfa: 0, eur: 0, usd: 0 });
  
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
        let query = supabase
            .from('admin_logs')
            .select(`
              id, created_at, details,
              actor:actor_id (full_name, user_type),
              target_user:target_id (full_name, email, country, city)
            `)
            .eq('action_type', 'user_credited')
            .eq('details->>reversed', 'true') // Correct way to query boolean in JSONB
            .order('created_at', { ascending: false });

        if (!isSuperAdmin) {
            if (actorId) {
                // Secretary viewing their own reversed credits
                query = query.eq('details->>reversed_by', actorId);
            } else if (country) {
                // Admin viewing reversed credits in their country
                query = query.eq('target_user.country', country);
            }
        }
        
        if (searchTerm) {
            query = query.or(`target_user.full_name.ilike.%${searchTerm}%,target_user.email.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        setLogs(data || []);

        // Calculate totals
        const totalCoins = data.reduce((acc, log) => acc + (log.details.amount || 0), 0);
        const coinToFcfaRate = adminConfig?.coin_to_fcfa_rate || 10;
        const totalCfa = totalCoins * coinToFcfaRate;
        const totalEur = totalCfa * (adminConfig?.currency_eur_rate || 0.0015);
        const totalUsd = totalCfa * (adminConfig?.currency_usd_rate || 0.0016);
        setTotals({ coins: totalCoins, cfa: totalCfa, eur: totalEur, usd: totalUsd });

    } catch (error) {
        toast({ title: 'Erreur', description: "Impossible de charger l'historique des crédits annulés.", variant: 'destructive' });
        console.error(error);
    } finally {
        setLoading(false);
    }
  }, [isSuperAdmin, actorId, country, searchTerm, adminConfig]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Card className="glass-effect shadow-lg">
      <CardHeader>
        <CardTitle>Historique des Crédits Annulés</CardTitle>
        <CardDescription>
            Total annulé : 
            <span className="font-bold text-red-400"> {totals.coins.toLocaleString()}π</span> /
            <span className="font-bold text-red-400"> {totals.cfa.toLocaleString()} FCFA</span> /
            <span className="font-bold text-red-400"> {totals.eur.toFixed(2)}€</span> /
            <span className="font-bold text-red-400"> ${totals.usd.toFixed(2)}</span>
        </CardDescription>
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
                <TableHead>Utilisateur</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Montant Annulé</TableHead>
                <TableHead>Crédit Initial par</TableHead>
                <TableHead>Annulé par</TableHead>
                <TableHead>Date Annulation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="6" className="text-center">Aucun crédit annulé trouvé.</TableCell>
                </TableRow>
              ) : (
                logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <p className="font-semibold">{log.target_user?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{log.target_user?.email}</p>
                    </TableCell>
                    <TableCell>
                      <p>{log.target_user?.city || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{log.target_user?.country}</p>
                    </TableCell>
                    <TableCell className="font-bold flex items-center gap-1 text-red-400">
                      {log.details?.amount} <Coins className="w-4 h-4" />
                    </TableCell>
                    <TableCell>
                      <p>{log.actor?.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{log.actor?.user_type?.replace('_', ' ')}</p>
                    </TableCell>
                     <TableCell>
                        <p>{log.details?.reversed_by_name || 'N/A'}</p>
                     </TableCell>
                    <TableCell>{log.details?.reversed_at ? new Date(log.details.reversed_at).toLocaleString('fr-FR') : 'N/A'}</TableCell>
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

export default ReversedCreditsTab;