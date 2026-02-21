import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  AlertTriangle,
  Lock
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// NOTE: RLS Policies on 'welcome_popups' table must allow INSERT/UPDATE/DELETE 
// for 'admin' and 'super_admin' roles in the 'profiles' table.

const WelcomePopupManagement = ({ popups: initialPopups, onRefresh }) => {
  const { user } = useAuth();
  const { userProfile } = useData();
  const { toast } = useToast();

  const [popups, setPopups] = useState(initialPopups || []);
  const [loading, setLoading] = useState(false);

  const [editingPopup, setEditingPopup] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState(null);

  const [formData, setFormData] = useState({
    alt_text: "",
    image_url: "",
    is_active: true,
  });

  // Task 6: Check user role
  const isAdmin = ['super_admin', 'admin'].includes(userProfile?.user_type);

  useEffect(() => {
    if (!initialPopups || initialPopups.length === 0) {
      fetchPopups();
    } else {
      setPopups(initialPopups);
    }
  }, [initialPopups]);

  const fetchPopups = async () => {
    setLoading(true);
    try {
      // Fetch all popups (inactive ones are visible to admins via RLS)
      const { data, error } = await supabase
        .from("welcome_popups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPopups(data || []);
    } catch (error) {
      console.error("Erreur fetchPopups:", error);
      toast({
        title: "Erreur de chargement",
        description: error.message || "Impossible de charger les popups.",
        variant: "destructive",
      });
      setPopups([]); 
    } finally {
      setLoading(false);
    }
  };

  const togglePopupStatus = async (popup) => {
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les droits d'administration nécessaires.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newStatus = !popup.is_active;
      
      const { error } = await supabase
        .from("welcome_popups")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", popup.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Popup ${newStatus ? "activé" : "désactivé"} avec succès.`,
        className: "bg-green-600 text-white",
      });

      await fetchPopups();
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error("Erreur togglePopupStatus:", error);
      toast({
        title: "Erreur de mise à jour",
        description: `Échec: ${error.message}. Vérifiez vos droits.`,
        variant: "destructive",
      });
    }
  };

  const deletePopup = async (popupId) => {
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les droits d'administration nécessaires.",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce popup ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("welcome_popups")
        .delete()
        .eq("id", popupId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Popup supprimé avec succès.",
        className: "bg-green-600 text-white",
      });

      await fetchPopups();
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error("Erreur deletePopup:", error);
      toast({
        title: "Erreur de suppression",
        description: `Échec: ${error.message}. Vérifiez vos droits.`,
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    await fetchPopups();
    if (onRefresh) onRefresh();
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
    if (!isAdmin) return;
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
    if (!isAdmin) {
      toast({ title: "Accès refusé", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    try {
      let imageUrl = formData.image_url;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `popup_${Date.now()}.${fileExt}`;
        const filePath = `welcome-popups/${fileName}`;

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
      }

      if (!imageUrl && !formData.image_url) {
        throw new Error("L'URL de l'image ou un fichier téléversé est requis.");
      }

      // Task 3: Corriger la logique d'insertion (uploaded_by, updated_at)
      const commonData = {
        alt_text: formData.alt_text || "",
        image_url: imageUrl || formData.image_url,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (editingPopup) {
        result = await supabase
          .from("welcome_popups")
          .update(commonData)
          .eq("id", editingPopup.id)
          .select();
      } else {
        // Pour l'insertion, on ajoute uploaded_by
        result = await supabase
          .from("welcome_popups")
          .insert({
            ...commonData,
            uploaded_by: user.id, // ID de l'utilisateur connecté
          })
          .select();
      }

      const { error } = result;
      if (error) throw error;

      toast({
        title: "Succès",
        description: `Popup ${editingPopup ? "mis à jour" : "créé"} avec succès.`,
        className: "bg-green-600 text-white",
      });

      resetForm();
      await fetchPopups();
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      // Task 4: Logging frontend et affichage UI
      toast({
        title: "Erreur de sauvegarde",
        description: `La sauvegarde a échoué: ${error.message || error.details || "Erreur inconnue"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin && !loading) {
    return (
      <Card className="glass-effect border-red-500/20">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <Lock className="w-12 h-12 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-red-400 mb-2">Accès Restreint</h3>
          <p className="text-gray-400">
            Vous devez être administrateur pour gérer les popups de bienvenue.
          </p>
        </CardContent>
      </Card>
    );
  }

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
            disabled={!isAdmin}
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
                Texte alternatif
              </Label>
              <Input
                id="alt_text"
                value={formData.alt_text}
                onChange={(e) =>
                  setFormData({ ...formData, alt_text: e.target.value })
                }
                placeholder="Description"
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
            {isAdmin && (
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
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popups.map((popup) => (
                <div
                  key={popup.id}
                  className={`flex flex-col p-4 rounded-xl shadow-sm gap-4 transition-all ${popup.is_active
                      ? "bg-gradient-to-br from-green-900/20 to-green-900/5 border border-green-500/30"
                      : "bg-gradient-to-br from-red-900/20 to-red-900/5 border border-red-500/30"
                    }`}
                >
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${popup.is_active ? "bg-green-500" : "bg-red-500"
                            }`}
                        ></div>
                        <span
                          className={`text-sm font-medium ${popup.is_active ? "text-green-300" : "text-red-300"
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
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePopupStatus(popup)}
                        className="h-8 w-8 hover:bg-white/20"
                        title={popup.is_active ? "Désactiver" : "Activer"}
                        disabled={!isAdmin}
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
                        disabled={!isAdmin}
                      >
                        <Edit className="h-4 w-4 text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePopup(popup.id)}
                        className="h-8 w-8 hover:bg-white/20"
                        title="Supprimer"
                        disabled={!isAdmin}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WelcomePopupManagement;