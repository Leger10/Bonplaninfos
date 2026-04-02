import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CreditStatsTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Taux de conversion fixe (1 pièce = 10 FCFA)
  const COIN_TO_FCFA_RATE = 10;

  const fetchCreditStats = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Récupérer les achats automatiques (coin_transactions)
      // Inclure les transactions avec transaction_type null (cas MoneyFusion)
      const { data: purchases, error: purchaseError } = await supabase
        .from('coin_transactions')
        .select(`
          coins_credited,
          user_id,
          created_at,
          transaction_type,
          profiles:user_id (country)
        `)
        .eq('status', 'completed')
        .or('transaction_type.in.(credit_purchase,custom_coins,coin_pack),transaction_type.is.null');

      if (purchaseError) throw purchaseError;

      // 2. Récupérer les crédits manuels (admin_logs) non révoqués
      const { data: manualCredits, error: manualError } = await supabase
        .from('admin_logs')
        .select(`
          details,
          target_user:target_id (country)
        `)
        .eq('action_type', 'user_credited')
        .is('details->reversed', null);

      if (manualError) throw manualError;

      // 3. Fusionner les données
      const countryMap = new Map();

      // Traiter les achats
      purchases?.forEach(tx => {
        const country = tx.profiles?.country || 'Inconnu';
        const amount = tx.coins_credited || 0;
        const entry = countryMap.get(country) || { totalAmount: 0, transactionCount: 0 };
        entry.totalAmount += amount;
        entry.transactionCount += 1;
        countryMap.set(country, entry);
      });

      // Traiter les crédits manuels
      manualCredits?.forEach(log => {
        const country = log.target_user?.country || 'Inconnu';
        const amount = log.details?.amount || 0;
        const entry = countryMap.get(country) || { totalAmount: 0, transactionCount: 0 };
        entry.totalAmount += amount;
        entry.transactionCount += 1;
        countryMap.set(country, entry);
      });

      // Convertir la map en tableau trié
      const sortedStats = Array.from(countryMap.entries())
        .map(([country, data]) => ({
          country,
          totalAmount: data.totalAmount,
          transactionCount: data.transactionCount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      setStats(sortedStats);
      const total = sortedStats.reduce((sum, c) => sum + c.totalAmount, 0);
      setTotalCredits(total);
    } catch (error) {
      console.error("Error fetching credit stats:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditStats();
  }, [fetchCreditStats]);

  const handleReset = async () => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.rpc('reset_admin_stats_only', { p_admin_id: user.id });
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      toast({
        title: "Réinitialisation réussie",
        description: "Toutes les données de crédits ont été effacées.",
        variant: "default",
        className: "bg-green-600 text-white",
      });
      fetchCreditStats();
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  const totalFCFA = totalCredits * COIN_TO_FCFA_RATE;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 flex-1">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total pièces distribuées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{totalCredits.toLocaleString()} pièces</div>
              {/* <p className="text-xs text-muted-foreground mt-1">Net</p> */}
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-sm text-muted-foreground">Valeur Net :</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(totalFCFA)}</p>
                {/* <p className="text-xs text-muted-foreground">(1 pièce = {COIN_TO_FCFA_RATE} FCFA)</p> */}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pays actifs</CardTitle>
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
            Répartition par pays
          </CardTitle>
          <CardDescription>Détail des crédits et achats de pièces par zone géographique.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pays</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Total net (pièces)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Aucune donnée de crédit disponible.
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((item) => (
                  <TableRow key={item.country}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-sm">
                          {item.country.substring(0, 2).toUpperCase()}
                        </Badge>
                        {item.country}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.transactionCount}</TableCell>
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

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de réinitialisation</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Elle supprimera toutes les transactions de crédits,
              remettra à zéro les soldes des utilisateurs et effacera l’historique des achats.
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