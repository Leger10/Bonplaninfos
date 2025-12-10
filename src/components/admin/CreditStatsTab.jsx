import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, Globe, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const CreditStatsTab = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [totalCredits, setTotalCredits] = useState(0);

  const fetchCreditStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all credit-related transactions
      // We include manual credits and any reversals (which are negative)
      // We also include purchases if they are in this table (coin_pack, etc.)
      const { data, error } = await supabase
        .from('transactions')
        .select('amount_pi, country, transaction_type, created_at, status')
        .in('transaction_type', ['manual_credit', 'credit_reversal', 'coin_pack', 'bonus']);

      if (error) throw error;

      console.log("Credits by country: [data]", data);

      // Process data
      const countryMap = {};
      let grandTotal = 0;

      data.forEach(tx => {
        // Only count completed transactions
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

          // Add to country total (negative amounts from reversals will automatically deduct)
          countryMap[country].totalAmount += amount;
          countryMap[country].transactionCount += 1;

          // Track reversals specifically for stats
          if (amount < 0) {
            countryMap[country].reversals += Math.abs(amount);
          }

          grandTotal += amount;
        }
      });

      const statsArray = Object.values(countryMap).sort((a, b) => b.totalAmount - a.totalAmount);

      setStats(statsArray);
      setTotalCredits(grandTotal);

      console.log("Total credits: [amount]", grandTotal);

    } catch (error) {
      console.error("Error fetching credit stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditStats();
  }, [fetchCreditStats]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Crédits Distribués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{totalCredits.toLocaleString()} π</div>
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
                <TableHead className="text-right">Total Net (π)</TableHead>
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
                      {item.reversals > 0 ? `-${item.reversals.toLocaleString()} π` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {item.totalAmount.toLocaleString()} π
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditStatsTab;