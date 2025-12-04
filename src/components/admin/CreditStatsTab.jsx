import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingUp, Globe, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils"; // Corrigé: import depuis lib/utils

const CreditStatsTab = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalReversals, setTotalReversals] = useState(0);

  const fetchCreditStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all credit-related transactions
      const { data, error } = await supabase
        .from("transactions")
        .select("amount_pi, country, transaction_type, created_at, status")
        .in("transaction_type", [
          "manual_credit",
          "credit_reversal",
          "coin_pack",
          "bonus",
          "admin_credit",
          "event_participation",
        ]);

      if (error) throw error;

      console.log("Credits by country: [data]", data);

      // Process data
      const countryMap = {};
      let grandTotal = 0;
      let totalTrans = 0;
      let totalRevs = 0;

      data.forEach((tx) => {
        // Only count completed transactions
        if (
          tx.status === "completed" ||
          tx.status === "paid" ||
          tx.status === "success"
        ) {
          const country = tx.country || "Inconnu";
          const amount = tx.amount_pi || 0;

          if (!countryMap[country]) {
            countryMap[country] = {
              country,
              totalAmount: 0,
              transactionCount: 0,
              reversals: 0,
              positiveTransactions: 0,
            };
          }

          // Add to country total
          countryMap[country].totalAmount += amount;
          countryMap[country].transactionCount += 1;

          // Track reversals specifically
          if (amount < 0) {
            countryMap[country].reversals += Math.abs(amount);
            totalRevs += Math.abs(amount);
          } else {
            countryMap[country].positiveTransactions += 1;
          }

          grandTotal += amount;
          totalTrans += 1;
        }
      });

      const statsArray = Object.values(countryMap)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .map((item) => ({
          ...item,
          percentage:
            totalCredits > 0
              ? ((item.totalAmount / totalCredits) * 100).toFixed(1)
              : "0",
        }));

      setStats(statsArray);
      setTotalCredits(grandTotal);
      setTotalTransactions(totalTrans);
      setTotalReversals(totalRevs);

      console.log("Total credits: [amount]", grandTotal);
    } catch (error) {
      console.error("Error fetching credit stats:", error);
    } finally {
      setLoading(false);
    }
  }, [totalCredits]);

  useEffect(() => {
    fetchCreditStats();
  }, [fetchCreditStats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            Chargement des statistiques de crédit...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total Crédits Distribués
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {totalCredits.toLocaleString()} π
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net après annulations
            </p>
            <div className="mt-2 text-xs">
              <span className="text-green-600">
                {totalTransactions} transactions
              </span>
              {totalReversals > 0 && (
                <span className="ml-2 text-red-600">
                  • {totalReversals} π annulés
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" /> Pays Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {stats.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Zones géographiques touchées
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Pays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {stats.length > 0 ? stats[0].country : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.length > 0
                ? `${stats[0].totalAmount.toLocaleString()} π`
                : "Aucune donnée"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux d'Annulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">
              {totalCredits > 0
                ? (
                    (totalReversals / (totalCredits + totalReversals)) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalReversals.toLocaleString()} π annulés
            </p>
          </CardContent>
        </Card>
      </div>

  {/* Main Table */}
<Card className="shadow-lg border-gray-800 bg-black text-white">
  <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="flex items-center gap-2 text-white">
          <Globe className="h-5 w-5 text-white" />
          Répartition par Pays
        </CardTitle>
        <CardDescription className="text-gray-300">
          Détail des crédits et achats de pièces par zone géographique.
        </CardDescription>
      </div>
      <Badge
        variant="outline"
        className="bg-primary/20 text-white border-primary/30"
      >
        {totalTransactions} transactions
      </Badge>
    </div>
  </CardHeader>
  <CardContent className="p-0">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-900">
          <TableRow>
            <TableHead className="font-semibold text-gray-300">
              Pays
            </TableHead>
            <TableHead className="font-semibold text-gray-300 text-right">
              Transactions
            </TableHead>
            <TableHead className="font-semibold text-gray-300 text-right">
              Crédits +
            </TableHead>
            <TableHead className="font-semibold text-gray-300 text-right">
              Annulations -
            </TableHead>
            <TableHead className="font-semibold text-gray-300 text-right">
              Total Net
            </TableHead>
            <TableHead className="font-semibold text-gray-300 text-right">
              Part
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <div className="flex flex-col items-center justify-center">
                  <AlertCircle className="h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-gray-400 font-medium mb-2">
                    Aucune donnée de crédit disponible
                  </p>
                  <p className="text-sm text-gray-500">
                    Les données de crédit apparaîtront ici
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            stats.map((item, index) => (
              <TableRow
                key={item.country}
                className={index % 2 === 0 ? "bg-gray-900" : "bg-gray-800"}
              >
                <TableCell className="font-medium py-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="rounded-full w-8 h-8 flex items-center justify-center bg-primary/20 text-white border-primary/30"
                    >
                      {item.country.substring(0, 2).toUpperCase()}
                    </Badge>
                    <div>
                      <span className="font-medium text-white">
                        {item.country}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.positiveTransactions} transactions positives
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right py-4">
                  <span className="font-medium text-white">
                    {item.transactionCount}
                  </span>
                </TableCell>
                <TableCell className="text-right py-4">
                  <span className="font-medium text-green-400">
                    {(item.totalAmount + item.reversals).toLocaleString()} π
                  </span>
                </TableCell>
                <TableCell className="text-right py-4">
                  {item.reversals > 0 ? (
                    <span className="font-medium text-red-400">
                      -{item.reversals.toLocaleString()} π
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-4">
                  <span
                    className={`font-bold text-lg ${
                      item.totalAmount >= 0
                        ? "text-green-300"
                        : "text-red-300"
                    }`}
                  >
                    {item.totalAmount.toLocaleString()} π
                  </span>
                </TableCell>
                <TableCell className="text-right py-4">
                  <div className="flex flex-col items-end">
                    <span className="font-medium text-white">
                      {item.percentage}%
                    </span>
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                        }}
                      />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>

    {stats.length > 0 && (
      <div className="px-6 py-4 border-t border-gray-800 bg-gray-900">
        <div className="flex justify-between items-center text-sm text-gray-300">
          <div>
            <span className="font-medium">{stats.length}</span> pays
            listés
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Crédits positifs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Annulations</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </CardContent>
</Card>

{/* Legend & Info */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card className="border-gray-800 bg-black text-white">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">
        Types de Transactions Inclus
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="text-sm space-y-1 text-gray-300">
        <li className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>Crédits manuels (admin)</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Achats de pièces (coin_pack)</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
          <span>Bonus et récompenses</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Annulations de crédit</span>
        </li>
      </ul>
    </CardContent>
  </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Les statistiques montrent la répartition géographique des crédits
              distribués sur la plateforme. Les données sont mises à jour en
              temps réel et incluent toutes les transactions validées.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreditStatsTab;