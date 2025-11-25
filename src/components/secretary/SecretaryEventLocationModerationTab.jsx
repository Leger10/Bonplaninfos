// components/secretary/SecretaryEventLocationModerationTab.jsx - VERSION FINALE
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/customSupabaseClient";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Loader2,
  Calendar,
  MapPin,
  Trash2,
  PowerOff,
  Power,
  Search,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const SecretaryEventLocationModerationTab = () => {
  const { t } = useTranslation();
  const { userProfile } = useData();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("events");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = useCallback(async () => {
    if (!userProfile?.country) {
      console.log("❌ Pas de pays défini dans le profil");
      toast({
        title: "Erreur",
        description: "Pays non défini dans votre profil",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("🔄 Chargement des données pour:", userProfile.country);

      // Chargement des événements
      const eventsResponse = await supabase
        .from("events")
        .select("*")
        .eq("country", userProfile.country)
        .order("created_at", { ascending: false });

      console.log("📊 Événements:", eventsResponse);

      // Chargement des lieux
      const locationsResponse = await supabase
        .from("locations")
        .select("*")
        .eq("country", userProfile.country)
        .order("created_at", { ascending: false });

      console.log("📊 Lieux:", locationsResponse);

      if (eventsResponse.error) throw eventsResponse.error;
      if (locationsResponse.error) throw locationsResponse.error;

      setEvents(eventsResponse.data || []);
      setLocations(locationsResponse.data || []);

      console.log("✅ Chargement réussi:", {
        événements: eventsResponse.data?.length,
        lieux: locationsResponse.data?.length,
      });
    } catch (error) {
      console.error("💥 Erreur complète:", error);
      toast({
        title: "Erreur de chargement",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.country]);

  useEffect(() => {
    if (userProfile?.country) {
      fetchData();
    }
  }, [userProfile?.country, fetchData]);

  const filteredData = useMemo(() => {
    const data = view === "events" ? events : locations;
    let filtered = data.filter((item) => {
      const searchableText = (item.title || item.name || "").toLowerCase();
      return searchableText.includes(searchTerm.toLowerCase());
    });

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      if (view === "events") {
        filtered = filtered.filter(
          (item) =>
            (isActive && item.status === "active") ||
            (!isActive && item.status !== "active")
        );
      } else {
        filtered = filtered.filter(
          (item) =>
            (isActive && item.is_active) || (!isActive && !item.is_active)
        );
      }
    }
    return filtered;
  }, [view, events, locations, searchTerm, statusFilter]);

  const handleDelete = async (id, type) => {
    try {
      const functionName =
        type === "event" ? "delete_event_completely" : "delete_location";
      const paramName = type === "event" ? "p_event_id" : "p_location_id";

      const { error } = await supabase.rpc(functionName, {
        [paramName]: id,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${type === "event" ? "Événement" : "Lieu"} supprimé`,
      });
      fetchData();
    } catch (error) {
      console.error("❌ Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (item, type) => {
    const table = type === "event" ? "events" : "locations";
    const statusField = type === "event" ? "status" : "is_active";

    let newStatus;
    if (type === "event") {
      newStatus = item.status === "active" ? "inactive" : "active";
    } else {
      newStatus = !item.is_active;
    }

    try {
      const { error } = await supabase
        .from(table)
        .update({ [statusField]: newStatus })
        .eq("id", item.id);

      if (error) throw error;

      toast({ title: "Succès", description: "Statut mis à jour" });
      fetchData();
    } catch (error) {
      console.error("❌ Erreur changement statut:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
        <span>Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modération des Événements et Lieux</CardTitle>
          <CardDescription>
            Gestion pour le pays: <strong>{userProfile?.country}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Contrôles */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v)}
            >
              <ToggleGroupItem
                value="events"
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Événements ({events.length})
              </ToggleGroupItem>
              <ToggleGroupItem
                value="locations"
                className="flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Lieux ({locations.length})
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Rechercher...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(v) => v && setStatusFilter(v)}
            >
              <ToggleGroupItem value="all">Tous</ToggleGroupItem>
              <ToggleGroupItem value="active">Actifs</ToggleGroupItem>
              <ToggleGroupItem value="inactive">Inactifs</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Données */}
          <div className="space-y-4">
            {filteredData.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                Aucun {view === "events" ? "événement" : "lieu"} trouvé
              </div>
            ) : (
              filteredData.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      {view === "events" ? (
                        <Calendar className="w-6 h-6 text-primary" />
                      ) : (
                        <MapPin className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {item.title || item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {view === "events" ? item.city : item.address}
                      </p>
                      <Badge
                        variant={
                          (
                            view === "events"
                              ? item.status === "active"
                              : item.is_active
                          )
                            ? "default"
                            : "secondary"
                        }
                        className="mt-1"
                      >
                        {view === "events"
                          ? item.status === "active"
                            ? "Actif"
                            : "Inactif"
                          : item.is_active
                          ? "Actif"
                          : "Inactif"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleStatus(
                          item,
                          view === "events" ? "event" : "location"
                        )
                      }
                    >
                      {(
                        view === "events"
                          ? item.status === "active"
                          : item.is_active
                      ) ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Confirmer la suppression
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleDelete(
                                item.id,
                                view === "events" ? "event" : "location"
                              )
                            }
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecretaryEventLocationModerationTab;
