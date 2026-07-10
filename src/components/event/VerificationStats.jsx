import React, { useState, useEffect } from 'react';
import { BarChart, Users, CheckCircle, AlertTriangle, XCircle, User, Wallet } from 'lucide-react';
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
        
        // 1. Total des tickets vendus
        const { count: totalTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr);
        
        // 2. Tickets qui ont fait leur première entrée (status = 'used')
        const { count: verifiedTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('status', 'used');
        
        // 🔥 3. Tickets sans compte (guest)
        const { count: guestTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .like('user_id', 'guest_%');
        
        // 🔥 4. Tickets payés par MoneyFusion
        const { count: moneyFusionTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('payment_method', 'moneyfusion_ticket');
        
        // 5. Tickets avec status 'active' (non encore utilisés)
        const { count: activeTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventIdStr)
          .eq('status', 'active');
        
        const total = totalTickets || 0;
        const verified = verifiedTickets || 0;
        const verificationRate = total > 0 ? (verified / total) * 100 : 0;
        
        setStats({
          total_tickets: total,
          verified_tickets: verified,
          active_tickets: activeTickets || 0,
          guest_tickets: guestTickets || 0,
          moneyfusion_tickets: moneyFusionTickets || 0,
          duplicate_scans: 0,
          active_sessions: 0,
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validés / Entrés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified_tickets}</div>
            <p className="text-xs text-muted-foreground">{stats.verification_rate}% de présence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.active_tickets}</div>
            <p className="text-xs text-muted-foreground">billets non encore utilisés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de présence</CardTitle>
            <BarChart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.verification_rate}%</div>
            <p className="text-xs text-muted-foreground">taux global</p>
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
            <p className="text-xs text-muted-foreground">billets invités</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Paiement externe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.moneyfusion_tickets}</div>
            <p className="text-xs text-muted-foreground">via MoneyFusion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions Actives</CardTitle>
            <BarChart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.active_sessions || 0}</div>
            <p className="text-xs text-muted-foreground">scanners connectés</p>
          </CardContent>
        </Card>
      </div>

      {/* Troisième ligne : Statistiques des codes promo influenceurs */}
      <PromoCodeStatsCard eventId={eventId} />
    </div>
  );
};

export default VerificationStats;