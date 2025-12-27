import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, DollarSign, Wallet, TrendingUp, ArrowUpRight, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import WithdrawalModal from '@/components/common/WithdrawalModal';
import { generateEarningsSlip } from '@/utils/pdfGenerator';
import { toast } from '@/components/ui/use-toast';

const CreatorDashboardTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [availableBalanceFcfa, setAvailableBalanceFcfa] = useState(0);

  useEffect(() => {
    if (user) {
      fetchData();
      
      const channel = supabase.channel('creator-dashboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'organizer_withdrawal_requests', filter: `organizer_id=eq.${user.id}` }, () => fetchData(false))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => fetchData(false))
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // 1. Get Profile Balance directly for accuracy
      const { data: profile } = await supabase
        .from('profiles')
        .select('available_earnings')
        .eq('id', user.id)
        .single();
        
      // Assuming 1 PI = 10 FCFA
      const balanceFcfa = (profile?.available_earnings || 0) * 10;
      setAvailableBalanceFcfa(balanceFcfa);

      // 2. Get Withdrawals
      const { data: history } = await supabase
        .from('organizer_withdrawal_requests')
        .select('*')
        .eq('organizer_id', user.id)
        .order('requested_at', { ascending: false });
      setWithdrawals(history || []);
      
      // 3. Get other stats if needed (legacy RPC)
      const { data: statsData } = await supabase.rpc('get_organizer_earnings_summary', { p_organizer_id: user.id });
      setStats(statsData?.data || {});

    } catch (error) {
      console.error("Error fetching creator stats:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };
  
  const handleDownloadSlip = () => {
      const totalEarned = stats?.summary?.total_earned || 0;
      // Approximation for PDF
      const grossEst = Math.floor(totalEarned / 0.95); 
      
      generateEarningsSlip({
          organizerName: user?.email || "Créateur",
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
        <Card className="bg-gradient-to-br from-purple-600 to-indigo-800 text-white border-0 shadow-xl relative overflow-hidden">
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
              Disponible pour retrait
            </p>
            <div className="flex gap-2">
                <Button 
                    onClick={() => setWithdrawalModalOpen(true)} 
                    className="flex-1 bg-white text-indigo-800 hover:bg-indigo-50 font-bold shadow-sm"
                    disabled={availableBalanceFcfa < 500} 
                >
                    <ArrowUpRight className="mr-2 h-4 w-4" /> Retirer
                </Button>
                <Button 
                    variant="outline"
                    className="bg-indigo-700/50 border-indigo-500 text-white hover:bg-indigo-600"
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
              Gains non encore validés.
            </p>
          </CardContent>
        </Card>

        {/* Total Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-600 flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Total Retiré
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold text-green-600">
                 {(stats?.summary?.total_earned * 10 || 0).toLocaleString()} <span className="text-lg text-gray-500">FCFA</span>
             </div>
             <p className="text-xs text-gray-500 mt-2">
                 Total historique versé
             </p>
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
                <TableHead>Brut</TableHead>
                <TableHead>Frais (5%)</TableHead>
                <TableHead>Net Reçu</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun retrait effectué.
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((req) => {
                    const gross = req.amount_fcfa || 0;
                    // If fees/net are not stored (legacy), calculate them
                    const fees = req.fees || Math.floor(gross * 0.05);
                    const net = req.net_amount || (gross - fees);
                    
                    return (
                      <TableRow key={req.id}>
                        <TableCell>{format(new Date(req.requested_at), 'dd MMM yyyy HH:mm', { locale: fr })}</TableCell>
                        <TableCell>{gross.toLocaleString()} F</TableCell>
                        <TableCell className="text-red-500">-{fees.toLocaleString()} F</TableCell>
                        <TableCell className="font-bold text-emerald-600">{net.toLocaleString()} F</TableCell>
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
                    );
                })
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

export default CreatorDashboardTab;