import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  AlertTriangle,
  RotateCcw,
  Loader2,
  MapPin,
  Users,
  Coins,
  RefreshCw,
  Eraser,
  DollarSign,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ZoneResetManager = () => {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dialog State
  const [targetZone, setTargetZone] = useState(null); // null = All Zones
  const [resetOptions, setResetOptions] = useState({
    credits: false,
    revenue: false,
  });

  const fetchZoneStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_zones_stats");
      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error("Error fetching zone stats:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques des zones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZoneStats();
  }, []);

  const openResetDialog = (zone = null) => {
    setTargetZone(zone);
    setResetOptions({ credits: false, revenue: false });
    setDialogOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!resetOptions.credits && !resetOptions.revenue) {
      toast({
        title: "Sélection requise",
        description: "Veuillez choisir au moins une donnée à réinitialiser.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setDialogOpen(false);

    try {
      let result;

      if (targetZone) {
        // Réinitialiser une zone spécifique
        const { data, error } = await supabase.rpc("reset_zone_data", {
          p_admin_id: user.id,
          p_country: targetZone.country,
          p_reset_credits: resetOptions.credits,
          p_reset_revenue: resetOptions.revenue,
        });

        if (error) throw error;
        result = data;

        toast({
          title: "✅ Réinitialisation réussie",
          description: `Les données ont été réinitialisées pour ${targetZone.country}.`,
          variant: "success",
        });

        // Déclencher l'événement pour mettre à jour le dashboard
        window.dispatchEvent(
          new CustomEvent("zone-reset-completed", {
            detail: {
              country: targetZone.country,
              resetCredits: resetOptions.credits,
              resetRevenue: resetOptions.revenue,
              timestamp: new Date().toISOString(),
            },
          }),
        );
      } else {
        // Réinitialiser toutes les zones
        const { data, error } = await supabase.rpc("reset_all_zones", {
          p_admin_id: user.id,
          p_reset_credits: resetOptions.credits,
          p_reset_revenue: resetOptions.revenue,
        });

        if (error) throw error;
        result = data;

        toast({
          title: "✅ Réinitialisation globale terminée",
          description: `${result.success_count} zone(s) sur ${result.total_zones} ont été réinitialisées.`,
          variant: "success",
        });

        // Déclencher l'événement pour mettre à jour le dashboard
        window.dispatchEvent(
          new CustomEvent("zone-reset-completed", {
            detail: {
              country: "ALL",
              resetCredits: resetOptions.credits,
              resetRevenue: resetOptions.revenue,
              stats: result,
              timestamp: new Date().toISOString(),
            },
          }),
        );
      }

      // Rafraîchir les données locales
      await fetchZoneStats();
    } catch (error) {
      console.error("Reset error:", error);
      toast({
        title: "❌ Erreur critique",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-orange-500/20 shadow-lg">
        <CardHeader className="bg-orange-500/5 rounded-t-xl">
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-orange-700 dark:text-orange-400">
                <RotateCcw className="h-6 w-6" />
                Réinitialisation par Zone
              </CardTitle>
              <CardDescription>
                Gérez et remettez à zéro les statistiques financières par pays.
                Les modifications seront automatiquement répercutées sur le
                tableau de bord principal.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchZoneStats}
                disabled={loading || processing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Actualiser
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openResetDialog(null)}
                disabled={loading || processing || zones.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Eraser className="h-4 w-4 mr-2" />
                Tout Réinitialiser
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Pays / Zone</TableHead>
                  <TableHead className="text-center">Utilisateurs</TableHead>
                  <TableHead className="text-right">
                    Pièces Distribués
                  </TableHead>
                  <TableHead className="text-right">Revenus (Achats)</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p>Chargement des données...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : zones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Aucune donnée de zone trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((zone) => (
                    <TableRow
                      key={zone.country}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary/70" />
                          {zone.country}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {zone.user_count?.toLocaleString() || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className="font-mono bg-blue-50 text-blue-700 border-blue-200"
                        >
                          <Coins className="h-3 w-3 mr-1" />
                          {zone.total_credits?.toLocaleString() || 0} pièces
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className="font-mono bg-green-50 text-green-700 border-green-200"
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatCurrency(zone.total_revenue || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                          onClick={() => openResetDialog(zone)}
                          disabled={processing}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Réinitialiser
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmation de Réinitialisation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de réinitialiser les données pour :
              <span className="font-bold text-foreground block mt-1 text-lg">
                {targetZone ? targetZone.country : "TOUTES LES ZONES"}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4 border-y border-border/50">
            <p className="text-sm font-medium mb-3">
              Sélectionnez les données à supprimer :
            </p>

            <div
              className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-pointer"
              onClick={() =>
                setResetOptions((p) => ({ ...p, credits: !p.credits }))
              }
            >
              <Checkbox
                id="reset-credits"
                checked={resetOptions.credits}
                onCheckedChange={(c) =>
                  setResetOptions((p) => ({ ...p, credits: c }))
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="reset-credits"
                  className="font-semibold cursor-pointer"
                >
                  Pièces Distribués (Coins)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Supprime l'historique des pièces créditées manuellement par
                  les administrateurs.
                </p>
              </div>
            </div>

            <div
              className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-pointer"
              onClick={() =>
                setResetOptions((p) => ({ ...p, revenue: !p.revenue }))
              }
            >
              <Checkbox
                id="reset-revenue"
                checked={resetOptions.revenue}
                onCheckedChange={(c) =>
                  setResetOptions((p) => ({ ...p, revenue: c }))
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="reset-revenue"
                  className="font-semibold cursor-pointer"
                >
                  Revenus (Achats FCFA)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Supprime l'historique des achats de packs et licences
                  effectués par les utilisateurs.
                </p>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-destructive hover:bg-destructive/90"
              disabled={
                (!resetOptions.credits && !resetOptions.revenue) || processing
              }
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {processing ? "Traitement..." : "Confirmer la Suppression"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Note d'information */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-100">
                Comment ça fonctionne ?
              </h4>
              <p className="text-sm text-gray-300">
                Les réinitialisations effectuées ici sont automatiquement
                répercutées sur le tableau de bord principal
                (AnalyticsDashboard) grâce à un système d'événements. Les
                statistiques seront mises à jour en temps réel sans nécessiter
                de rechargement manuel de la page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZoneResetManager;
