import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Coins, Search, TrendingUp, RefreshCw, MapPin, Eraser, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ZoneResetManager from "./ZoneResetManager";
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

const AdminCreditsGlobalTab = () => {
  const { adminConfig } = useData();
  const { user } = useAuth();
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [totals, setTotals] = useState({ totalCoins: 0, totalFCFA: 0 });
  const [purchaseTotals, setPurchaseTotals] = useState({ totalCoins: 0, totalFCFA: 0, uniqueUsers: 0 });
  const [countryTotals, setCountryTotals] = useState([]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const coinToFcfaRate = adminConfig?.coin_to_fcfa_rate || 10;

  const fetchAllCredits = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Récupérer les crédits manuels (admin_logs)
      const { data: actors, error: actorsError } = await supabase
        .from("profiles")
        .select("id")
        .in("user_type", ["super_admin", "secretary"]);

      if (actorsError) throw actorsError;
      const actorIds = actors.map((a) => a.id);

      const adminQuery = supabase
        .from("admin_logs")
        .select(`
          id,
          created_at,
          details,
          actor:actor_id (full_name, user_type),
          target_user:target_id (full_name, email, country, city)
        `)
        .in("actor_id", actorIds)
        .eq("action_type", "user_credited")
        .order("created_at", { ascending: false });

      const { data: adminLogs, error: adminError } = await adminQuery;
      if (adminError) throw adminError;

      const validAdminLogs = adminLogs.filter((log) => !(log.details?.reversed));

      // 2. Récupérer les achats automatiques (coin_transactions)
      // Inclure les transactions avec transaction_type = 'credit_purchase' OU null (cas MoneyFusion)
      const { data: purchases, error: purchaseError } = await supabase
        .from("coin_transactions")
        .select(`
          id,
          created_at,
          amount_paid,
          coins_credited,
          user_id,
          transaction_type,
          profiles!coin_transactions_user_id_fkey (full_name, email, country, city)
        `)
        .or('transaction_type.eq.credit_purchase,transaction_type.is.null')
        .order("created_at", { ascending: false });

      if (purchaseError) {
        console.error("Erreur lors de la récupération des achats :", purchaseError);
        // On continue sans les achats
      }

      // Transformer les achats pour qu'ils aient la même structure que les logs admin
      const formattedPurchases = (purchases || []).map((tx) => ({
        id: tx.id,
        created_at: tx.created_at,
        details: { amount: tx.coins_credited, amount_fcfa: tx.amount_paid },
        source: "purchase",
        actor: { full_name: "Achat automatique", user_type: "system" },
        target_user: {
          full_name: tx.profiles?.full_name || "Utilisateur inconnu",
          email: tx.profiles?.email,
          country: tx.profiles?.country,
          city: tx.profiles?.city,
        },
        user_id: tx.user_id,
      }));

      const formattedAdmin = validAdminLogs.map((log) => ({
        ...log,
        source: "admin",
      }));

      // Fusionner et trier par date
      const combined = [...formattedAdmin, ...formattedPurchases].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setAllEntries(combined);

      // Calcul des totaux globaux
      let totalCoinsGlobal = 0;
      let purchaseCoins = 0;
      let purchaseFcfa = 0;
      const purchaseUserIds = new Set();
      const countryMap = new Map();

      combined.forEach((entry) => {
        const amount = entry.details?.amount || 0;
        const amountFcfa = entry.details?.amount_fcfa || 0;
        const country = entry.target_user?.country || "Inconnu";
        totalCoinsGlobal += amount;

        // Totaux pour les achats uniquement
        if (entry.source === "purchase") {
          purchaseCoins += amount;
          purchaseFcfa += amountFcfa;
          if (entry.target_user?.full_name !== "Utilisateur inconnu") {
            purchaseUserIds.add(entry.user_id || entry.target_user?.id);
          }
        }

        if (!countryMap.has(country)) {
          countryMap.set(country, { country, totalCoins: 0, count: 0 });
        }
        const entryCountry = countryMap.get(country);
        entryCountry.totalCoins += amount;
        entryCountry.count += 1;
      });

      const countryArray = Array.from(countryMap.values()).sort(
        (a, b) => b.totalCoins - a.totalCoins
      );

      setCountryTotals(countryArray);
      setTotals({
        totalCoins: totalCoinsGlobal,
        totalFCFA: totalCoinsGlobal * coinToFcfaRate,
      });
      setPurchaseTotals({
        totalCoins: purchaseCoins,
        totalFCFA: purchaseCoins * coinToFcfaRate,
        uniqueUsers: purchaseUserIds.size,
      });
    } catch (error) {
      console.error("Error fetching credits:", error);
      toast({
        title: "Erreur",
        description: `Impossible de charger l'historique : ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [coinToFcfaRate]);

  // Filtrer selon le terme de recherche
  const filteredEntries = allEntries.filter((entry) => {
    if (!searchTerm) return true;
    const target = entry.target_user;
    return (
      target?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      target?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  useEffect(() => {
    fetchAllCredits();
  }, [fetchAllCredits]);

  // Écouter l'événement de réinitialisation
  useEffect(() => {
    const handleZoneReset = (event) => {
      console.log("Zone reset detected, refreshing credit logs", event.detail);
      fetchAllCredits();
    };
    window.addEventListener("zone-reset-completed", handleZoneReset);
    return () => window.removeEventListener("zone-reset-completed", handleZoneReset);
  }, [fetchAllCredits]);

  const handleResetAll = async () => {
    if (!user) return;
    setResetting(true);
    try {
    const { data, error } = await supabase.rpc("reset_admin_stats_only", {
  p_admin_id: user.id,
});
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      toast({
        title: "Réinitialisation réussie",
        description: "Tous les crédits distribués manuellement ont été supprimés.",
        variant: "default",
        className: "bg-green-600 text-white",
      });
      fetchAllCredits();
    } catch (err) {
      console.error("Reset error:", err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de réinitialiser les données.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
      setResetDialogOpen(false);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-blue-500/20 shadow-lg">
        <CardHeader className="bg-blue-500/5 rounded-t-xl">
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-blue-700 dark:text-blue-400">
                <Coins className="h-6 w-6" />
                Historique global des crédits
              </CardTitle>
              <CardDescription>
                Liste de tous les crédits distribués (manuels par les admins + achats automatiques).
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAllCredits}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Rafraîchir
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setResetDialogOpen(true)}
                disabled={resetting}
                className="gap-2"
              >
                <Eraser className="w-4 h-4" />
                Réinitialiser les crédits
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Cartes de synthèse */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Total pièces distribuées
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {totals.totalCoins.toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-500 rounded-full">
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Valeur totale FCFA
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(totals.totalFCFA)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-500 rounded-full">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Taux: 1 pièce = {coinToFcfaRate} FCFA
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800">
                      Pays concernés
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {countryTotals.length}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-500 rounded-full">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Achats MoneyFusion
                    </p>
                    <p className="text-lg font-bold text-yellow-900">
                      {purchaseTotals.totalCoins.toLocaleString("fr-FR")} pièces
                    </p>
                    <p className="text-sm font-semibold text-yellow-800">
                      {formatCurrency(purchaseTotals.totalFCFA)}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-yellow-700">
                      <Users className="w-4 h-4" />
                      <span>{purchaseTotals.uniqueUsers} utilisateurs uniques</span>
                    </div>
                  </div>
                  <div className="p-2 bg-yellow-500 rounded-full">
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau récapitulatif par pays */}
          {countryTotals.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">
                Répartition par pays
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pays</TableHead>
                      <TableHead className="text-right">
                        Nombre de crédits
                      </TableHead>
                      <TableHead className="text-right">
                        Total pièces
                      </TableHead>
                      <TableHead className="text-right">
                        Valeur FCFA
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countryTotals.map((country) => (
                      <TableRow key={country.country}>
                        <TableCell className="font-medium">
                          {country.country}
                        </TableCell>
                        <TableCell className="text-right">
                          {country.count}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {country.totalCoins.toLocaleString("fr-FR")} pièces
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(country.totalCoins * coinToFcfaRate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Barre de recherche */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email d'utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tableau détaillé des crédits */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
              <p className="text-muted-foreground">
                Chargement de l'historique...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      Utilisateur
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Pays / Ville
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Montant (pièces)
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Valeur FCFA
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Source</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Crédité par
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <Coins className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium mb-2">
                          Aucun crédit trouvé
                        </p>
                        <p className="text-sm">
                          {searchTerm
                            ? `Aucun résultat pour "${searchTerm}"`
                            : "Aucun crédit distribué dans l'historique global"}
                        </p>
                        {searchTerm && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchTerm("")}
                            className="mt-2"
                          >
                            Effacer la recherche
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => {
                      const coinAmount = entry.details?.amount || 0;
                      const fcfaValue = coinAmount * coinToFcfaRate;
                      const userLocation = `${entry.target_user?.city || "N/A"}, ${
                        entry.target_user?.country || "Inconnu"
                      }`;

                      return (
                        <TableRow
                          key={entry.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell>
                            <p className="font-semibold">
                              {entry.target_user?.full_name ||
                                "Utilisateur inconnu"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {entry.target_user?.email}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{userLocation}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 font-bold text-amber-600">
                              <span>
                                {coinAmount.toLocaleString("fr-FR")}
                              </span>
                              <Coins className="w-4 h-4 flex-shrink-0" />
                            </div>
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold whitespace-nowrap">
                            {formatCurrency(fcfaValue)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={entry.source === "admin" ? "default" : "secondary"}
                              className={
                                entry.source === "admin"
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : "bg-purple-600 hover:bg-purple-700"
                              }
                            >
                              {entry.source === "admin" ? "Admin" : "Achat"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.source === "admin" ? (
                              <>
                                <p className="font-medium">{entry.actor?.full_name}</p>
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize mt-1"
                                >
                                  {entry.actor?.user_type?.replace("_", " ") ||
                                    "Admin"}
                                </Badge>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Système (MoneyFusion)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex flex-col">
                              <span>
                                {new Date(entry.created_at).toLocaleDateString(
                                  "fr-FR"
                                )}
                              </span>
                              <span className="text-xs">
                                {new Date(entry.created_at).toLocaleTimeString(
                                  "fr-FR",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredEntries.length > 0 && !loading && (
            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
              <p>
                Affichage de {filteredEntries.length} crédit
                {filteredEntries.length > 1 ? "s" : ""}
                {searchTerm && ` pour "${searchTerm}"`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ZoneResetManager />

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de réinitialisation</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement tous les logs de crédits distribués manuellement (et seulement les crédits manuels, pas les revenus). 
              Les soldes des utilisateurs ne seront pas modifiés. Êtes-vous sûr de vouloir continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAll} disabled={resetting} className="bg-red-600 hover:bg-red-700">
              {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Oui, réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCreditsGlobalTab;