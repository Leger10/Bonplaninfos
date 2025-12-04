import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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

const WelcomePopupManagement = ({ popups: initialPopups, onRefresh }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // État local pour les popups
  const [popups, setPopups] = useState(initialPopups || []);
  const [loading, setLoading] = useState(false);

  const [editingPopup, setEditingPopup] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [popupToDelete, setPopupToDelete] = useState(null);
  const [file, setFile] = useState(null);

  const [formData, setFormData] = useState({
    alt_text: "",
    image_url: "",
    is_active: true,
  });

  // Charger les popups au montage si initialPopups est vide
  useEffect(() => {
    if (!initialPopups || initialPopups.length === 0) {
      fetchPopups();
    } else {
      setPopups(initialPopups);
    }
  }, [initialPopups]);

  // Fonction pour charger les popups
  const fetchPopups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("welcome_popups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPopups(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des popups:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les popups.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir les données
  const handleRefresh = async () => {
    await fetchPopups();
    if (onRefresh) {
      onRefresh();
    }
  };

  const resetForm = () => {
    setEditingPopup(null);
    setShowForm(false);
    setFile(null);
    setFormData({
      alt_text: "",
      image_url: "",
      is_active: true,
    });
  };

  const handleEdit = (popup) => {
    setEditingPopup(popup);
    setFormData({
      alt_text: popup.alt_text || "",
      image_url: popup.image_url || "",
      is_active: popup.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = formData.image_url;

      // Téléverser un nouveau fichier si fourni
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `popup_${Date.now()}.${fileExt}`;
        const filePath = `welcome-popups/${fileName}`;

        console.log("Téléversement du fichier:", filePath);

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
        console.log("URL publique générée:", imageUrl);
      }

      // S'assurer d'avoir une URL d'image
      if (!imageUrl && !formData.image_url) {
        throw new Error("L'URL de l'image ou un fichier téléversé est requis.");
      }

      const dataToSave = {
        alt_text: formData.alt_text || "",
        image_url: imageUrl || formData.image_url,
        is_active: formData.is_active,
        uploaded_by: user.id,
        updated_at: new Date().toISOString(),
      };

      console.log("Données à sauvegarder:", dataToSave);

      let result;
      if (editingPopup) {
        // Mise à jour
        result = await supabase
          .from("welcome_popups")
          .update(dataToSave)
          .eq("id", editingPopup.id)
          .select();
      } else {
        // Création
        result = await supabase
          .from("welcome_popups")
          .insert(dataToSave)
          .select();
      }

      const { data, error } = result;

      if (error) {
        console.error("Erreur Supabase:", error);
        throw error;
      }

      console.log("Popup sauvegardé avec succès:", data);

      toast({
        title: "Succès",
        description: `Popup ${
          editingPopup ? "mis à jour" : "créé"
        } avec succès.`,
      });

      resetForm();

      // Mettre à jour la liste locale
      await handleRefresh();
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
      toast({
        title: "Erreur",
        description: `La sauvegarde a échoué: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (popupId) => {
    setPopupToDelete(popupId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!popupToDelete) return;

    try {
      const { error } = await supabase
        .from("welcome_popups")
        .delete()
        .eq("id", popupToDelete);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Popup supprimé avec succès.",
      });

      // Mettre à jour la liste locale
      setPopups((prev) => prev.filter((popup) => popup.id !== popupToDelete));

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Erreur de suppression:", error);
      toast({
        title: "Erreur",
        description: "La suppression a échoué.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirm(false);
      setPopupToDelete(null);
    }
  };

  const toggleActive = async (popup) => {
    try {
      const { error } = await supabase
        .from("welcome_popups")
        .update({
          is_active: !popup.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", popup.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Popup ${!popup.is_active ? "activé" : "désactivé"}.`,
      });

      // Mettre à jour l'état local
      setPopups((prev) =>
        prev.map((p) =>
          p.id === popup.id ? { ...p, is_active: !popup.is_active } : p
        )
      );

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Erreur de changement de statut:", error);
      toast({
        title: "Erreur",
        description: "Le changement de statut a échoué.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">
          🖼️ Gestion des Popups de Bienvenue
        </CardTitle>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Nouveau Popup
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 mb-8 p-4 border border-border/50 rounded-xl shadow-inner bg-background/30"
          >
            <h3 className="text-lg font-semibold text-white">
              {editingPopup ? "✏️ Modifier le Popup" : "➕ Ajouter un Popup"}
            </h3>
            <div className="space-y-2">
              <Label htmlFor="alt_text" className="text-white">
                Texte alternatif (pour le SEO)
              </Label>
              <Input
                id="alt_text"
                value={formData.alt_text}
                onChange={(e) =>
                  setFormData({ ...formData, alt_text: e.target.value })
                }
                placeholder="Description de l'image"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url" className="text-white">
                URL de l'image (ou téléverser)
              </Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://..."
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-white">
                Téléverser une image
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="bg-white/10 border-white/20 text-white file:text-white"
              />
              {file && (
                <div className="mt-2">
                  <p className="text-sm text-green-300">
                    Fichier sélectionné: {file.name}
                  </p>
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Aperçu"
                    className="w-32 h-32 object-contain mt-2 rounded border border-white/20"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="is_active" className="text-white cursor-pointer">
                Actif
              </Label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/20">
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                className="text-white hover:bg-white/20"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!formData.image_url && !file)}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingPopup ? "Mettre à jour" : "Enregistrer"}
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-white">Chargement des popups...</span>
          </div>
        ) : popups.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-white/20 rounded-xl">
            <p className="text-white/70 mb-4">
              Aucun popup de bienvenue configuré
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Créer votre premier popup
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popups.map((popup) => (
                <div
                  key={popup.id}
                  className={`flex flex-col p-4 rounded-xl shadow-sm gap-4 transition-all ${
                    popup.is_active
                      ? "bg-gradient-to-br from-green-900/20 to-green-900/5 border border-green-500/30"
                      : "bg-gradient-to-br from-red-900/20 to-red-900/5 border border-red-500/30"
                  }`}
                >
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            popup.is_active ? "bg-green-500" : "bg-red-500"
                          }`}
                        ></div>
                        <span
                          className={`text-sm font-medium ${
                            popup.is_active ? "text-green-300" : "text-red-300"
                          }`}
                        >
                          {popup.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <span className="text-xs text-white/50">
                        {new Date(popup.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="relative w-full h-48 mb-3">
                      <img
                        src={popup.image_url}
                        alt={popup.alt_text}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = `https://placehold.co/400x300/1a1a2e/ffffff?text=Image+non+chargée`;
                        }}
                      />
                    </div>

                    <p className="font-medium text-white mb-1 truncate">
                      {popup.alt_text || "Image sans description"}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      URL: {popup.image_url.substring(0, 30)}...
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(popup)}
                        className="h-8 w-8 hover:bg-white/20"
                        title={popup.is_active ? "Désactiver" : "Activer"}
                      >
                        {popup.is_active ? (
                          <PowerOff className="h-4 w-4 text-yellow-400" />
                        ) : (
                          <Power className="h-4 w-4 text-green-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(popup)}
                        className="h-8 w-8 hover:bg-white/20"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4 text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(popup.id)}
                        className="h-8 w-8 hover:bg-white/20"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                    <span className="text-xs text-white/40">
                      ID: {popup.id.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-white/60 pt-4 border-t border-white/10">
              <div>
                Total: {popups.length} popup{popups.length > 1 ? "s" : ""} •
                Actifs: {popups.filter((p) => p.is_active).length} • Inactifs:{" "}
                {popups.filter((p) => !p.is_active).length}
              </div>
              <div className="text-xs">
                Dernière mise à jour: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-gray-900 border border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Êtes-vous sûr ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Cette action est irréversible. Le popup sera définitivement
              supprimé de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default WelcomePopupManagement;
