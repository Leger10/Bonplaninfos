import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, DollarSign, Wallet, TrendingUp, AlertCircle, Eye, Users, Info, ArrowUpRight, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getNextWithdrawalDate, isWithdrawalOpen } from '@/lib/dateUtils';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import WithdrawalModal from '@/components/common/WithdrawalModal';
import { generateEarningsSlip } from '@/utils/pdfGenerator'; // ← IMPORT AJOUTÉ ICI

const OrganizerDashboardTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [withdrawalConfig, setWithdrawalConfig] = useState({ withdrawal_dates: [5] });
  const [withdrawals, setWithdrawals] = useState([]);
  const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const refreshTimeout = useRef(null);

  useEffect(() => {
    if (user) {
      fetchData();
      const channel = supabase.channel('creator-realtime-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `organizer_id=eq.${user.id}` }, handleRealtimeUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'organizer_earnings', filter: `organizer_id=eq.${user.id}` }, handleRealtimeUpdate)
        .subscribe();
      return () => { supabase.removeChannel(channel); if (refreshTimeout.current) clearTimeout(refreshTimeout.current); };
    }
  }, [user]);

  const handleRealtimeUpdate = () => {
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(() => fetchData(false), 2000);
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data: configData } = await supabase.from('admin_withdrawal_config').select('*').limit(1).maybeSingle();
      const config = configData || { withdrawal_dates: [5] };
      setWithdrawalConfig(config);

      const { data: statsData } = await supabase.rpc('get_organizer_earnings_summary', { p_organizer_id: user.id });
      setStats(statsData?.data || {});

      const { data: history } = await supabase.from('organizer_withdrawal_requests').select('*').eq('organizer_id', user.id).order('requested_at', { ascending: false });
      setWithdrawals(history || []);
    } catch (error) {
      console.error("Error fetching creator stats:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const availableBalanceCoins = stats?.wallet?.available_balance_coins || 0;
  const availableBalanceFcfa = availableBalanceCoins * 10;
  
  const handleDownloadSlip = () => {
      const totalEarned = stats?.summary?.total_earned || 0;
      // Approximation for PDF
      const grossEst = Math.floor(totalEarned / 0.95); 
      
      generateEarningsSlip({
          organizerName: user?.email || "Organisateur",
          period: format(new Date(), 'MMMM yyyy', { locale: fr }),
          totalRevenue: grossEst * 10, // FCFA
          fees: (grossEst - totalEarned) * 10,
          netEarnings: totalEarned * 10,
          date: new Date()
      });
      toast({ title: "Document généré", description: "Le relevé de gains a été téléchargé." });
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance Card */}
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-0 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24" /></div>
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-lg font-medium opacity-90 flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Solde Disponible
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-bold mb-1">
              {availableBalanceFcfa.toLocaleString()} <span className="text-lg opacity-80">FCFA</span>
            </div>
            <p className="text-sm opacity-80 mb-6 font-mono">
              ({availableBalanceCoins.toLocaleString()} pièces)
            </p>
            <div className="flex gap-2">
                <Button 
                    onClick={() => setWithdrawalModalOpen(true)} 
                    className="flex-1 bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-sm"
                    disabled={availableBalanceFcfa < 500} 
                >
                    <ArrowUpRight className="mr-2 h-4 w-4" /> Retirer
                </Button>
                <Button 
                    variant="outline"
                    className="bg-emerald-700/50 border-emerald-500 text-white hover:bg-emerald-600"
                    onClick={handleDownloadSlip}
                    title="Télécharger Relevé"
                >
                    <FileDown className="h-4 w-4" />
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Balance Card */}
        <Card className="border-blue-100 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-blue-600 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Gains en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">
              {((stats?.pending?.total_net || 0) * 10).toLocaleString()} <span className="text-lg text-gray-500">FCFA</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Ces gains doivent être transférés vers votre solde disponible.
            </p>
          </CardContent>
        </Card>

        {/* Total Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-600 flex items-center gap-2">
              <Eye className="w-5 h-5" /> Vue d'ensemble
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center border-b pb-2">
                 <span className="text-sm text-gray-500">Vues Totales</span>
                 <span className="font-bold">{stats?.creator_stats?.views_count || 0}</span>
             </div>
             <div className="flex justify-between items-center">
                 <span className="text-sm text-gray-500">Total Retiré</span>
                 <span className="font-bold text-green-600">{(stats?.summary?.total_earned * 10 || 0).toLocaleString()} F</span>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des retraits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant Net</TableHead>
                <TableHead>Frais (5%)</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucun retrait effectué.
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{format(new Date(req.requested_at), 'dd MMM yyyy', { locale: fr })}</TableCell>
                    <TableCell className="font-bold text-emerald-600">{(req.net_amount || req.amount_fcfa).toLocaleString()} FCFA</TableCell>
                    <TableCell className="text-red-500">-{req.fees?.toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <Badge variant={
                        req.status === 'paid' || req.status === 'approved' ? 'success' : 
                        req.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {req.status === 'paid' ? 'Payé' : 
                         req.status === 'approved' ? 'Validé' : 
                         req.status === 'rejected' ? 'Rejeté' : 'En attente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WithdrawalModal 
        open={isWithdrawalModalOpen} 
        onOpenChange={setWithdrawalModalOpen}
        availableBalance={availableBalanceFcfa}
        userType="organizer"
        userId={user?.id}
        onSuccess={() => fetchData(false)}
      />
    </div>
  );
};

export default OrganizerDashboardTab;