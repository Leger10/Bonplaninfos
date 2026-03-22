import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Globe, AlertCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CreditStatsTab = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchCreditStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount_pi, country, transaction_type, created_at, status')
        .in('transaction_type', ['manual_credit', 'credit_reversal', 'coin_pack', 'bonus']);

      if (error) throw error;

      const countryMap = {};
      let grandTotal = 0;

      data.forEach(tx => {
        if (tx.status === 'completed' || tx.status === 'paid') {
          const country = tx.country || 'Inconnu';
          const amount = tx.amount_pi || 0;

          if (!countryMap[country]) {
            countryMap[country] = {
              country,
              totalAmount: 0,
              transactionCount: 0,
              reversals: 0
            };
          }

          countryMap[country].totalAmount += amount;
          countryMap[country].transactionCount += 1;
          if (amount < 0) {
            countryMap[country].reversals += Math.abs(amount);
          }
          grandTotal += amount;
        }
      });

      setStats(Object.values(countryMap).sort((a, b) => b.totalAmount - a.totalAmount));
      setTotalCredits(grandTotal);
    } catch (error) {
      console.error("Error fetching credit stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditStats();
  }, [fetchCreditStats]);

  const handleReset = async () => {
    setResetting(true);
    try {
      // Appeler la fonction RPC (remplacer par le vrai ID admin)
      const { data, error } = await supabase.rpc('reset_credit_data', { p_admin_id: supabase.auth.user()?.id });
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      toast({
        title: "Réinitialisation réussie",
        description: "Toutes les données de crédits ont été effacées.",
        variant: "default",
        className: "bg-green-600 text-white",
      });
      fetchCreditStats(); // Rafraîchir les stats
    } catch (err) {
      console.error("Reset error:", err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de réinitialiser les données.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
      setResetOpen(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 flex-1">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total pièces Distribués</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{totalCredits.toLocaleString()} pièces</div>
              <p className="text-xs text-muted-foreground mt-1">Net après annulations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pays Actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Zones géographiques touchées</p>
            </CardContent>
          </Card>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setResetOpen(true)}
          className="ml-4"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Réinitialiser
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Répartition par Pays
          </CardTitle>
          <CardDescription>Détail des crédits et achats de pièces par zone géographique.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pays</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Annulations (Reversals)</TableHead>
                <TableHead className="text-right">Total Net (pièces)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucune donnée de crédit disponible.
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((item) => (
                  <TableRow key={item.country}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-sm">{item.country.substring(0, 2).toUpperCase()}</Badge>
                        {item.country}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.transactionCount}</TableCell>
                    <TableCell className="text-right text-red-500">
                      {item.reversals > 0 ? `-${item.reversals.toLocaleString()} pièces` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {item.totalAmount.toLocaleString()} pièces
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de réinitialisation</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Elle supprimera toutes les transactions de crédits, remettra à zéro les soldes des utilisateurs et effacera l’historique des achats. 
              <br /><br />
              Voulez-vous vraiment continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={resetting} className="bg-red-600 hover:bg-red-700">
              {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Oui, réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreditStatsTab;