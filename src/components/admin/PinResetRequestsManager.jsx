// components/admin/PinResetRequestsManager.jsx

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import {
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  Phone,
  User,
  Calendar,
  Key,
  AlertCircle,
  RefreshCw,
  Image,
  ExternalLink,
  Trash2,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PinResetRequestsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [idPhotoUrl, setIdPhotoUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'pending', 'approved', 'rejected'

  useEffect(() => {
    fetchRequests();

    // S'abonner aux changements en temps réel
    const channel = supabase
      .channel("pin-reset-requests-admin")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pin_reset_requests",
        },
        (payload) => {
          console.log("New request inserted:", payload);
          // Ajouter la nouvelle demande à la liste
          fetchRequests(); // Recharger pour avoir les profils associés
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pin_reset_requests",
        },
        (payload) => {
          console.log("Request updated:", payload);
          // Mettre à jour la demande dans la liste
          setRequests((prev) =>
            prev.map((req) =>
              req.id === payload.new.id ? { ...req, ...payload.new } : req,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "pin_reset_requests",
        },
        (payload) => {
          console.log("Request deleted:", payload);
          // Supprimer la demande de la liste
          setRequests((prev) =>
            prev.filter((req) => req.id !== payload.old.id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pin_reset_requests")
        .select(
          `
          *,
          profiles!pin_reset_requests_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            avatar_url,
            admin_type,
            identity_verified,
            identity_verified_at
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Fetched requests:", data);
      setRequests(data || []);

      // Sauvegarder dans localStorage comme backup
      localStorage.setItem(
        "pin_reset_requests_backup",
        JSON.stringify(data || []),
      );
    } catch (error) {
      console.error("Error fetching reset requests:", error);

      // Essayer de charger depuis localStorage en cas d'erreur
      const backup = localStorage.getItem("pin_reset_requests_backup");
      if (backup) {
        setRequests(JSON.parse(backup));
        toast({
          title: "Mode dégradé",
          description: "Affichage des données en cache",
          variant: "warning",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger les demandes",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const getSignedUrl = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from("id_photos")
        .createSignedUrl(path, 3600); // 1 heure

      if (error) {
        console.warn("Signed URL error:", error);
        const {
          data: { publicUrl },
        } = supabase.storage.from("id_photos").getPublicUrl(path);
        return publicUrl;
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Error getting photo URL:", error);
      const {
        data: { publicUrl },
      } = supabase.storage.from("id_photos").getPublicUrl(path);
      return publicUrl;
    }
  };

  const viewRequestDetails = async (request) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
    setIdPhotoUrl(null);
    setPhotoLoading(true);

    if (request.id_photo_url) {
      try {
        console.log("Photo path from DB:", request.id_photo_url);
        const url = await getSignedUrl(request.id_photo_url);
        console.log("Generated URL:", url);
        setIdPhotoUrl(url);
      } catch (error) {
        console.error("Error getting photo URL:", error);
        setIdPhotoUrl(null);
      } finally {
        setPhotoLoading(false);
      }
    } else {
      setPhotoLoading(false);
    }

    setUserProfile(request.profiles);
    setShowDetailsModal(true);
  };

  const processRequest = async (status) => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // Si approuvé, réinitialiser le wallet_pin
      if (status === "approved") {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            wallet_pin: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedRequest.user_id);

        if (updateError) throw updateError;
      }

      // Mettre à jour la demande
      const { error: requestError } = await supabase
        .from("pin_reset_requests")
        .update({
          status: status,
          admin_notes: adminNotes,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
        })
        .eq("id", selectedRequest.id);

      if (requestError) throw requestError;

      // Mettre à jour la liste locale
      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id
            ? {
                ...req,
                status,
                admin_notes: adminNotes,
                processed_at: new Date().toISOString(),
                processed_by: user.id,
              }
            : req,
        ),
      );

      toast({
        title: status === "approved" ? "Demande approuvée" : "Demande rejetée",
        description:
          status === "approved"
            ? "Le code PIN a été réinitialisé. L'utilisateur peut maintenant en définir un nouveau."
            : "La demande a été rejetée.",
        variant: status === "approved" ? "success" : "destructive",
      });

      setShowProcessModal(false);
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error processing request:", error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter la demande",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const deleteRequest = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // Supprimer la photo du storage si elle existe
      if (selectedRequest.id_photo_url) {
        try {
          const { error: storageError } = await supabase.storage
            .from("id_photos")
            .remove([selectedRequest.id_photo_url]);

          if (storageError) {
            console.warn("Error deleting photo from storage:", storageError);
          } else {
            console.log(
              "Photo deleted from storage:",
              selectedRequest.id_photo_url,
            );
          }
        } catch (storageError) {
          console.warn("Error deleting photo from storage:", storageError);
          // Continuer même si la photo n'existe pas
        }
      }

      // Supprimer la demande de la base de données
      const { error } = await supabase
        .from("pin_reset_requests")
        .delete()
        .eq("id", selectedRequest.id);

      if (error) throw error;

      console.log("Request deleted from database:", selectedRequest.id);

      // Mettre à jour la liste locale immédiatement
      setRequests((prev) => {
        const newRequests = prev.filter((req) => req.id !== selectedRequest.id);
        console.log("Updated requests list:", newRequests);
        return newRequests;
      });

      toast({
        title: "Demande supprimée",
        description: "La demande a été supprimée avec succès.",
        variant: "success",
      });

      setShowDeleteModal(false);
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error deleting request:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la demande",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200">
            En attente
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">
            Approuvé
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200">
            Rejeté
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    return `Il y a ${days} j`;
  };

  const testPhotoUrl = async () => {
    if (!selectedRequest?.id_photo_url) return;

    setPhotoLoading(true);
    try {
      const url = await getSignedUrl(selectedRequest.id_photo_url);
      setIdPhotoUrl(url);

      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        toast({
          title: "Succès",
          description: "L'image est accessible",
          variant: "success",
        });
      } else {
        toast({
          title: "Erreur",
          description: `L'image n'est pas accessible (${response.status})`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Test failed:", error);
      toast({
        title: "Erreur",
        description: "Impossible de tester l'URL",
        variant: "destructive",
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  // Filtrer les demandes
  const filteredRequests = requests.filter((req) => {
    if (filterStatus === "all") return true;
    return req.status === filterStatus;
  });

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <>
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Demandes de réinitialisation de PIN
            </CardTitle>
            <CardDescription>
              Gérez les demandes de réinitialisation de code PIN des
              utilisateurs
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Filtre par statut */}
            <select
              className="px-3 py-2 border border-gray-600 rounded-md text-sm bg-black text-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all" className="bg-black text-white">
                Tous les statuts
              </option>
              <option value="pending" className="bg-black text-white">
                En attente
              </option>
              <option value="approved" className="bg-black text-white">
                Approuvés
              </option>
              <option value="rejected" className="bg-black text-white">
                Rejetés
              </option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-black text-white border-gray-600 hover:bg-gray-800"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Aucune demande de réinitialisation de PIN</p>
              {filterStatus !== "all" && (
                <Button
                  variant="link"
                  onClick={() => setFilterStatus("all")}
                  className="mt-2"
                >
                  Voir toutes les demandes
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Traitée le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow
                      key={request.id}
                      className={
                        request.status === "pending" ? "bg-yellow-50/50" : ""
                      }
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {format(
                              new Date(request.created_at),
                              "dd/MM/yyyy",
                              { locale: fr },
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(request.created_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {request.profiles?.avatar_url ? (
                            <img
                              src={request.profiles.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {request.profiles?.full_name || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.profiles?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span>{request.phone_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.processed_at ? (
                          <span className="text-sm">
                            {format(
                              new Date(request.processed_at),
                              "dd/MM/yyyy",
                            )}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewRequestDetails(request)}
                            className="whitespace-nowrap"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Détails
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal des détails de la demande */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Détails de la demande de réinitialisation
            </DialogTitle>
            <DialogDescription>
              Vérifiez les informations avant de traiter la demande
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="py-4 space-y-6">
              {/* Statut actuel */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Statut actuel :
                </span>
                {getStatusBadge(selectedRequest.status)}
              </div>

              {/* Informations utilisateur */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Nom complet
                  </label>
                  <p className="font-medium">
                    {userProfile?.full_name || "N/A"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="font-medium">{userProfile?.email || "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Téléphone déclaré
                  </label>
                  <p className="font-medium">{selectedRequest.phone_number}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Téléphone compte
                  </label>
                  <p className="font-medium">
                    {userProfile?.phone || "Non renseigné"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Date demande
                  </label>
                  <p className="font-medium">
                    {format(
                      new Date(selectedRequest.created_at),
                      "dd/MM/yyyy HH:mm",
                      { locale: fr },
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Vérifié
                  </label>
                  <p className="font-medium">
                    {userProfile?.identity_verified ? (
                      <Badge className="bg-green-100 text-green-800">Oui</Badge>
                    ) : (
                      <Badge variant="secondary">Non</Badge>
                    )}
                  </p>
                </div>
              </div>

              {/* Photo d'identité */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Photo de la pièce d'identité
                </label>
                <div className="border rounded-lg p-4 bg-muted/30">
                  {photoLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Chargement de l'image...
                      </p>
                    </div>
                  ) : idPhotoUrl ? (
                    <div className="relative">
                      <img
                        src={idPhotoUrl}
                        alt="Pièce d'identité"
                        className="max-h-96 mx-auto rounded-lg shadow-md"
                        onError={(e) => {
                          console.error("Image failed to load:", e);
                          e.target.style.display = "none";
                          setIdPhotoUrl(null);
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white"
                          onClick={() => window.open(idPhotoUrl, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Ouvrir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = idPhotoUrl;
                            link.download = `identite-${selectedRequest.user_id}.jpg`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-muted-foreground mb-4">
                        Image non disponible
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={testPhotoUrl}
                        disabled={photoLoading}
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${photoLoading ? "animate-spin" : ""}`}
                        />
                        Réessayer
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes admin existantes */}
              {selectedRequest.admin_notes && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Notes précédentes
                  </label>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedRequest.admin_notes}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDetailsModal(false)}
            >
              Fermer
            </Button>
            {selectedRequest?.status === "pending" && (
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  setShowProcessModal(true);
                }}
                className="bg-primary"
              >
                Traiter la demande
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => {
                setShowDetailsModal(false);
                setShowDeleteModal(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de traitement */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Traiter la demande</DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "pending"
                ? "Approuvez ou rejetez la demande de réinitialisation de PIN"
                : "Cette demande a déjà été traitée"}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="py-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {selectedRequest.status === "pending"
                    ? "⚠️ Attention - Vérifiez l'identité"
                    : "Demande déjà traitée"}
                </p>
                {selectedRequest.status === "pending" && (
                  <>
                    <p>Vérifiez que :</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Le numéro de téléphone correspond au compte</li>
                      <li>La photo d'identité correspond à l'utilisateur</li>
                      <li>
                        Le nom sur la pièce d'identité correspond au compte
                      </li>
                    </ul>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optionnel)</label>
                <Textarea
                  placeholder="Ajoutez des notes concernant cette demande..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  disabled={selectedRequest.status !== "pending" || processing}
                />
              </div>

              {selectedRequest.status !== "pending" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium">Demande déjà traitée</p>
                  <p className="mt-1">
                    Cette demande a été{" "}
                    {selectedRequest.status === "approved"
                      ? "approuvée"
                      : "rejetée"}{" "}
                    le{" "}
                    {selectedRequest.processed_at &&
                      format(
                        new Date(selectedRequest.processed_at),
                        "dd/MM/yyyy HH:mm",
                      )}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowProcessModal(false)}
              disabled={processing}
            >
              Annuler
            </Button>
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => processRequest("rejected")}
                  disabled={processing}
                >
                  {processing && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  <XCircle className="w-4 h-4 mr-1" />
                  Rejeter
                </Button>
                <Button
                  onClick={() => processRequest("approved")}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approuver
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmation de suppression */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette demande ? Cette action
              est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={processing}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={deleteRequest}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PinResetRequestsManager;
