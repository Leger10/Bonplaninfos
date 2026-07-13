import React, { useState, useEffect } from 'react';
import { BarChart, Users, CheckCircle, AlertTriangle, XCircle, User, Wallet, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';

// Fonction pour récupérer les stats des codes promo
const fetchPromoCodeStats = async (eventId) => {
  try {
    const { data, error } = await supabase.rpc('get_promo_code_stats', {
      p_event_id: eventId
    });
    
    if (error) throw error;
    return data?.[0] || { total_influencers: 0, total_commission_coins: 0, total_commission_fcfa: 0, total_usages: 0 };
  } catch (error) {
    console.error('Error fetching promo stats:', error);
    return null;
  }
};

// Composant pour les stats des codes promo
const PromoCodeStatsCard = ({ eventId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchPromoCodeStats(eventId).then(data => {
        setStats(data);
        setLoading(false);
      });
    }
  }, [eventId]);

  if (loading) return <div className="animate-pulse bg-gray-800 h-32 rounded-lg"></div>;
  if (!stats) return null;

  return (
    <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-purple-300 flex items-center gap-2">
          <Users className="h-4 w-4" /> Impact Influenceurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Influenceurs ayant un code</span>
            <span className="text-white font-bold text-2xl">{stats.total_influencers}</span>
          </div>
          <div className="flex justify-between items-center border-t border-purple-500/20 pt-2">
            <span className="text-gray-400 text-sm">Commissions générées</span>
            <div className="text-right">
              <span className="text-emerald-400 font-bold text-xl">
                {stats.total_commission_fcfa.toLocaleString()} FCFA
              </span>
              <span className="text-gray-500 text-xs block">
                ({stats.total_commission_coins} pièces)
              </span>
            </div>
          </div>
          {stats.total_usages > 0 && (
            <div className="flex justify-between items-center border-t border-purple-500/20 pt-2">
              <span className="text-gray-400 text-sm">Utilisations totales</span>
              <span className="text-blue-400 font-medium text-lg">{stats.total_usages}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const VerificationStats = ({ eventId, organizerId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const eventIdStr = String(eventId);
        
        // ============================================================
        // 🔥 STATS DEPUIS LA TABLE tickets
        // ============================================================
        
        // 1. Total des tickets vendus
        const { count: totalTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr);
        
        // 2. Tickets entrés (status = 'used') - Actuellement à l'intérieur
        const { count: currentlyInside } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('status', 'used');
        
        // 3. Tickets sortis (status = 'exited')
        const { count: exitedTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('status', 'exited');
        
        // 4. Tickets ayant déjà été utilisés (used + exited)
        const { count: verifiedTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .in('status', ['used', 'exited']);
        
        // 5. Tickets actifs (non encore utilisés)
        const { count: activeTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('status', 'active');
        
        // 6. 🔥 Tickets sans compte - NULL + guest_%
        const { count: guestTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .or('user_id.is.null,user_id.like.guest_%');
        
        // 7. Tickets MoneyFusion
        const { count: moneyFusionTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('payment_method', 'moneyfusion_ticket');
        
        // 8. 🔥 Tickets MoneyFusion sans compte - NULL + guest_%
        const { count: moneyFusionGuestTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('payment_method', 'moneyfusion_ticket')
          .or('user_id.is.null,user_id.like.guest_%');
        
        // 9. Tickets MoneyFusion avec compte
        const moneyFusionAccountTickets = moneyFusionTickets - moneyFusionGuestTickets;
        
        // 10. Total des entrées (entry_count > 0)
        const { count: totalEntries } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .gt('entry_count', 0);
        
        // 11. Moyenne des entrées par ticket (pour les tickets utilisés)
        const { data: entryCounts } = await supabase
          .from('tickets')
          .select('entry_count')
          .eq('event_id', eventIdStr)
          .not('entry_count', 'is', null);
        
        const totalEntryCounts = entryCounts?.reduce((sum, t) => sum + (t.entry_count || 0), 0) || 0;
        const avgEntriesPerTicket = verifiedTickets > 0 ? (totalEntryCounts / verifiedTickets) : 0;
        
        // ============================================================
        // 🔥 CALCUL FINAL
        // ============================================================
        
        const total = totalTickets || 0;
        const verified = verifiedTickets || 0;
        const verificationRate = total > 0 ? (verified / total) * 100 : 0;
        const inside = currentlyInside || 0;
        const exited = exitedTickets || 0;
        
        console.log('📊 Stats récupérées:', {
          totalTickets: total,
          currentlyInside: inside,
          exitedTickets: exited,
          verifiedTickets: verified,
          activeTickets: activeTickets || 0,
          guestTickets: guestTickets || 0,
          moneyFusionTickets: moneyFusionTickets || 0,
          moneyFusionGuestTickets: moneyFusionGuestTickets || 0,
          moneyFusionAccountTickets: moneyFusionAccountTickets || 0,
          totalEntries: totalEntries || 0,
          avgEntriesPerTicket: avgEntriesPerTicket
        });
        
        setStats({
          total_tickets: total,
          currently_inside: inside,
          exited_tickets: exited,
          verified_tickets: verified,
          active_tickets: activeTickets || 0,
          guest_tickets: guestTickets || 0,
          moneyfusion_guest_tickets: moneyFusionGuestTickets || 0,
          moneyfusion_account_tickets: moneyFusionAccountTickets || 0,
          moneyfusion_total: moneyFusionTickets || 0,
          total_entries: totalEntries || 0,
          avg_entries_per_ticket: Math.round(avgEntriesPerTicket * 100) / 100,
          duplicate_scans: 0,
          verification_rate: Math.round(verificationRate * 100) / 100
        });
        
      } catch (err) {
        console.error("Erreur stats:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (eventId && organizerId) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [eventId, organizerId]);

  if (loading) return <div className="p-4 text-center text-muted-foreground">Chargement...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Erreur: {error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Première ligne : Statistiques de vérification */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_tickets}</div>
            <p className="text-xs text-muted-foreground">vendus pour cet événement</p>
            {stats.moneyfusion_guest_tickets > 0 && (
              <p className="text-[10px] text-blue-400 mt-1">
                dont {stats.moneyfusion_guest_tickets} via MoneyFusion sans compte
              </p>
            )}
            {stats.guest_tickets > 0 && (
              <p className="text-[10px] text-yellow-400 mt-1">
                dont {stats.guest_tickets} sans compte
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-400">En salle</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.currently_inside}</div>
            <p className="text-xs text-muted-foreground">billets actuellement à l'intérieur</p>
            {stats.total_entries > 0 && (
              <p className="text-[10px] text-green-400 mt-1">
                {stats.total_entries} entrées totales
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-400">Sortis</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.exited_tickets}</div>
            <p className="text-xs text-muted-foreground">billets sortis</p>
            {stats.avg_entries_per_ticket > 0 && (
              <p className="text-[10px] text-blue-400 mt-1">
                {stats.avg_entries_per_ticket} entrées/ticket en moyenne
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-400">Taux de présence</CardTitle>
            <BarChart className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.verification_rate}%</div>
            <p className="text-xs text-muted-foreground">taux global</p>
            <p className="text-[10px] text-gray-400 mt-1">
              {stats.verified_tickets} utilisés / {stats.total_tickets} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🔥 Deuxième ligne : Statistiques des tickets sans compte */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-400 flex items-center gap-2">
              <User className="h-4 w-4" /> Sans compte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats.guest_tickets}</div>
            <p className="text-xs text-muted-foreground">billets sans compte</p>
            {stats.moneyfusion_guest_tickets > 0 && (
              <p className="text-[10px] text-blue-300 mt-1">
                dont {stats.moneyfusion_guest_tickets} via MoneyFusion
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> MoneyFusion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.moneyfusion_total}</div>
            <p className="text-xs text-muted-foreground">paiements externes</p>
            <div className="mt-1 flex items-center gap-2 text-[10px]">
              <span className="text-yellow-300">Sans compte: {stats.moneyfusion_guest_tickets}</span>
              <span className="text-gray-500">|</span>
              <span className="text-green-300">Avec compte: {stats.moneyfusion_account_tickets}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Mouvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{stats.total_entries}</div>
            <p className="text-xs text-muted-foreground">entrées totales</p>
            <div className="mt-1 flex items-center gap-2 text-[10px]">
              <span className="text-green-300">En salle: {stats.currently_inside}</span>
              <span className="text-gray-500">|</span>
              <span className="text-blue-300">Sortis: {stats.exited_tickets}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🔥 Résumé MoneyFusion */}
      {stats.moneyfusion_total > 0 && (
        <Card className="bg-gradient-to-r from-emerald-900/20 to-green-900/20 border-emerald-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Détails MoneyFusion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-gray-400 text-xs">Total</span>
                <div className="text-2xl font-bold text-emerald-400">{stats.moneyfusion_total}</div>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Avec compte</span>
                <div className="text-2xl font-bold text-blue-400">
                  {stats.moneyfusion_account_tickets}
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Sans compte</span>
                <div className="text-2xl font-bold text-yellow-400">
                  {stats.moneyfusion_guest_tickets}
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-xs">% du total</span>
                <div className="text-2xl font-bold text-purple-400">
                  {stats.total_tickets > 0 ? Math.round((stats.moneyfusion_total / stats.total_tickets) * 100) : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🔥 Statistiques avancées des entrées */}
      {stats.total_entries > stats.verified_tickets && (
        <Card className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-400 flex items-center gap-2">
              <BarChart className="h-4 w-4" /> Analyse des entrées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-gray-400 text-xs">Total billets</span>
                <div className="text-xl font-bold text-white">{stats.total_tickets}</div>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Entrées totales</span>
                <div className="text-xl font-bold text-green-400">{stats.total_entries}</div>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Ré-entrées</span>
                <div className="text-xl font-bold text-purple-400">
                  {stats.total_entries - stats.verified_tickets}
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Entrées/ticket</span>
                <div className="text-xl font-bold text-blue-400">{stats.avg_entries_per_ticket}</div>
              </div>
              <div>
                <span className="text-gray-400 text-xs">% de ré-entrées</span>
                <div className="text-xl font-bold text-orange-400">
                  {stats.verified_tickets > 0 
                    ? Math.round(((stats.total_entries - stats.verified_tickets) / stats.verified_tickets) * 100) 
                    : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troisième ligne : Statistiques des codes promo influenceurs */}
      <PromoCodeStatsCard eventId={eventId} />
    </div>
  );
};

export default VerificationStats;