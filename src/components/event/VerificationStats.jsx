import React, { useState, useEffect } from 'react';
import { BarChart, Users, CheckCircle, AlertTriangle, XCircle, User, Wallet, ArrowRightLeft, Calendar, CalendarDays } from 'lucide-react';
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
        
        // 1. TOTAL DES BILLETS CRÉÉS (tous les tickets)
        const { count: totalTicketsCreated } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr);
        
        // 2. BILLETS VENDUS (purchase_price_pi > 0)
        const { count: ticketsSold } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .gt('purchase_price_pi', 0);
        
        // 3. BILLETS NON VENDUS (purchase_price_pi = 0)
        const { count: ticketsNotSold } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('purchase_price_pi', 0);
        
        // 4. Tickets MoneyFusion
        const { count: moneyFusionTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('payment_method', 'moneyfusion_ticket');
        
        // 5. Tickets Coins
        const { count: coinsTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('payment_method', 'coins')
          .gt('purchase_price_pi', 0);
        
        // 6. TOTAL VENDU = coins vendus + moneyfusion
        const totalSold = (coinsTickets || 0) + (moneyFusionTickets || 0);
        
        // 7. Tickets entrés (status = 'used')
        const { count: currentlyInside } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('status', 'used')
          .gt('purchase_price_pi', 0);
        
        // 8. Tickets sortis (status = 'exited')
        const { count: exitedTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('status', 'exited')
          .gt('purchase_price_pi', 0);
        
        // 9. Tickets validés (used + exited)
        const { count: verifiedTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .in('status', ['used', 'exited'])
          .gt('purchase_price_pi', 0);
        
        // 10. Tickets actifs (en attente d'entrée)
        const { count: activeTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('status', 'active')
          .gt('purchase_price_pi', 0);
        
        // 11. Tickets sans compte
        const { count: guestTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .or('user_id.is.null,user_id.like.guest_%')
          .gt('purchase_price_pi', 0);
        
        // 12. MoneyFusion sans compte
        const { count: moneyFusionGuestTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('payment_method', 'moneyfusion_ticket')
          .or('user_id.is.null,user_id.like.guest_%');
        
        // 13. MoneyFusion avec compte
        const moneyFusionAccountTickets = moneyFusionTickets - moneyFusionGuestTickets;
        
        // 14. Total des entrées
        const { count: totalEntries } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .gt('entry_count', 0)
          .gt('purchase_price_pi', 0);
        
        // 15. Moyenne des entrées
        const { data: entryCounts } = await supabase
          .from('tickets')
          .select('entry_count')
          .eq('event_id', eventIdStr)
          .not('entry_count', 'is', null)
          .gt('purchase_price_pi', 0);
        
        const totalEntryCounts = entryCounts?.reduce((sum, t) => sum + (t.entry_count || 0), 0) || 0;
        const avgEntriesPerTicket = verifiedTickets > 0 ? (totalEntryCounts / verifiedTickets) : 0;
        
        // 16. Tickets multi-jours
        const { count: multiDayTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('is_multi_day', true)
          .gt('purchase_price_pi', 0);
        
        // 17. Tickets journaliers
        const { count: dailyTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('is_multi_day', false)
          .not('ticket_date', 'is', null)
          .gt('purchase_price_pi', 0);
        
        // 18. Tickets sans date
        const { count: ticketsWithoutDate } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .is('ticket_date', null)
          .eq('is_multi_day', false)
          .gt('purchase_price_pi', 0);
        
        // 19. Répartition par jour
        const { data: ticketsByDateData } = await supabase
          .from('tickets')
          .select('ticket_date, status')
          .eq('event_id', eventIdStr)
          .not('ticket_date', 'is', null)
          .gt('purchase_price_pi', 0);
        
        const ticketsByDate = {};
        if (ticketsByDateData) {
          ticketsByDateData.forEach(t => {
            if (t.ticket_date) {
              const dateKey = new Date(t.ticket_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              });
              if (!ticketsByDate[dateKey]) {
                ticketsByDate[dateKey] = { total: 0, active: 0, used: 0, exited: 0 };
              }
              ticketsByDate[dateKey].total++;
              if (t.status === 'active') ticketsByDate[dateKey].active++;
              else if (t.status === 'used') ticketsByDate[dateKey].used++;
              else if (t.status === 'exited') ticketsByDate[dateKey].exited++;
            }
          });
        }
        
        // ============================================================
        // 🔥 CALCUL FINAL
        // ============================================================
        
        const verificationRate = totalSold > 0 ? (verifiedTickets / totalSold) * 100 : 0;
        const inside = currentlyInside || 0;
        const exited = exitedTickets || 0;
        
        console.log('📊 Stats récupérées:', {
          totalTicketsCreated: totalTicketsCreated || 0,
          totalSold: totalSold,
          ticketsNotSold: ticketsNotSold || 0,
          currentlyInside: inside,
          exitedTickets: exited,
          verifiedTickets: verifiedTickets || 0,
          activeTickets: activeTickets || 0,
          guestTickets: guestTickets || 0,
          moneyFusionTickets: moneyFusionTickets || 0,
          moneyFusionGuestTickets: moneyFusionGuestTickets || 0,
          moneyFusionAccountTickets: moneyFusionAccountTickets || 0,
          totalEntries: totalEntries || 0,
          avgEntriesPerTicket: avgEntriesPerTicket,
          multiDayTickets: multiDayTickets || 0,
          dailyTickets: dailyTickets || 0,
          ticketsWithoutDate: ticketsWithoutDate || 0,
          ticketsByDate: ticketsByDate
        });
        
        setStats({
          total_tickets_created: totalTicketsCreated || 0,
          total_sold: totalSold,
          tickets_not_sold: ticketsNotSold || 0,
          coins_tickets: coinsTickets || 0,
          moneyfusion_total: moneyFusionTickets || 0,
          moneyfusion_guest_tickets: moneyFusionGuestTickets || 0,
          moneyfusion_account_tickets: moneyFusionAccountTickets || 0,
          currently_inside: inside,
          exited_tickets: exited,
          verified_tickets: verifiedTickets || 0,
          active_tickets: activeTickets || 0,
          guest_tickets: guestTickets || 0,
          total_entries: totalEntries || 0,
          avg_entries_per_ticket: Math.round(avgEntriesPerTicket * 100) / 100,
          verification_rate: Math.round(verificationRate * 100) / 100,
          multi_day_tickets: multiDayTickets || 0,
          daily_tickets: dailyTickets || 0,
          tickets_without_date: ticketsWithoutDate || 0,
          tickets_by_date: ticketsByDate || {}
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

  const daysWithTickets = Object.keys(stats?.tickets_by_date || {}).length;

  if (loading) return <div className="p-4 text-center text-muted-foreground">Chargement...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Erreur: {error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Première ligne : Statistiques de vérification */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-500/30 bg-blue-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-400">Billets vendus</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.total_sold}</div>
            <p className="text-xs text-muted-foreground">tickets réellement vendus</p>
            {stats.coins_tickets > 0 && (
              <p className="text-[10px] text-green-400 mt-1">🪙 {stats.coins_tickets} pièces</p>
            )}
            {stats.moneyfusion_total > 0 && (
              <p className="text-[10px] text-blue-400">💳 {stats.moneyfusion_total} MoneyFusion</p>
            )}
            {stats.total_tickets_created > stats.total_sold && (
              <p className="text-[8px] text-gray-500 mt-1">
                ({stats.total_tickets_created} billets créés au total)
              </p>
            )}
            {stats.tickets_not_sold > 0 && (
              <p className="text-[8px] text-orange-400 mt-0.5">
                ⚠️ {stats.tickets_not_sold} non vendus
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Validés / Entrés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.verified_tickets}</div>
            <p className="text-xs text-muted-foreground">billets scannés à l'entrée</p>
            {stats.total_entries > 0 && (
              <p className="text-[10px] text-green-400 mt-1">
                {stats.total_entries} entrées totales
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
            <p className="text-xs text-muted-foreground">basé sur les billets vendus</p>
            <p className="text-[10px] text-gray-400 mt-1">
              {stats.verified_tickets} entrés / {stats.total_sold} vendus
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-400">En attente d'entrée</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{stats.active_tickets}</div>
            <p className="text-xs text-muted-foreground">billets vendus non utilisés</p>
            {stats.total_sold > 0 && (
              <p className="text-[8px] text-gray-400 mt-1">
                {Math.round((stats.active_tickets / stats.total_sold) * 100)}% des vendus
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 🔥 Ligne 2 : Types de billets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Multi-jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{stats.multi_day_tickets}</div>
            <p className="text-xs text-muted-foreground">pass multi-jours vendus</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Journaliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.daily_tickets}</div>
            <p className="text-xs text-muted-foreground">billets journaliers vendus</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-900/20 to-gray-800/20 border-gray-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Sans date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{stats.tickets_without_date}</div>
            <p className="text-xs text-muted-foreground">billets sans date définie</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-900/20 to-blue-900/20 border-indigo-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-400 flex items-center gap-2">
              <Users className="h-4 w-4" /> Jours actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-400">{daysWithTickets}</div>
            <p className="text-xs text-muted-foreground">jours avec des billets</p>
          </CardContent>
        </Card>
      </div>

      {/* 🔥 Répartition par jour */}
      {daysWithTickets > 0 && (
        <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Répartition par jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.tickets_by_date || {}).map(([date, data]) => {
                const total = data.total || 0;
                const used = (data.used || 0) + (data.exited || 0);
                const rate = total > 0 ? Math.round((used / total) * 100) : 0;
                
                return (
                  <div key={date} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{date}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs">{total} billets</span>
                        <span className={`text-xs font-medium ${rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {rate}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="flex gap-3 text-[10px] text-gray-500">
                      <span className="text-green-400">✅ Entrés: {data.used || 0}</span>
                      <span className="text-blue-400">🚪 Sortis: {data.exited || 0}</span>
                      <span className="text-gray-400">🔴 Actifs: {data.active || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                <span className="text-gray-400 text-xs">% des vendus</span>
                <div className="text-2xl font-bold text-purple-400">
                  {stats.total_sold > 0 ? Math.round((stats.moneyfusion_total / stats.total_sold) * 100) : 0}%
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
                <span className="text-gray-400 text-xs">Billets vendus</span>
                <div className="text-xl font-bold text-white">{stats.total_sold}</div>
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