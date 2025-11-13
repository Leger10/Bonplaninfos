import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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

const WelcomePopupManagement = ({ popups, onRefresh }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingPopup, setEditingPopup] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [popupToDelete, setPopupToDelete] = useState(null);
  const [file, setFile] = useState(null);

  const [formData, setFormData] = useState({
    alt_text: '',
    image_url: '',
    is_active: true,
  });

  const resetForm = () => {
    setEditingPopup(null);
    setShowForm(false);
    setFile(null);
    setFormData({
      alt_text: '',
      image_url: '',
      is_active: true,
    });
  };

  const handleEdit = (popup) => {
    setEditingPopup(popup);
    setFormData({
      alt_text: popup.alt_text || '',
      image_url: popup.image_url,
      is_active: popup.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = formData.image_url;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `popups/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
        
        imageUrl = publicUrlData.publicUrl;
      }

      if (!imageUrl) {
        throw new Error("L'URL de l'image ou un fichier téléversé est requis.");
      }

      const dataToSave = {
        alt_text: formData.alt_text,
        image_url: imageUrl,
        is_active: formData.is_active,
        uploaded_by: user.id,
      };

      let query;
      if (editingPopup) {
        query = supabase.from('welcome_popups').update(dataToSave).eq('id', editingPopup.id);
      } else {
        query = supabase.from('welcome_popups').insert(dataToSave);
      }

      const { error } = await query;
      if (error) throw error;

      toast({ title: 'Succès', description: `Popup ${editingPopup ? 'mis à jour' : 'créé'} avec succès.` });
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving popup:', error);
      toast({ title: 'Erreur', description: `La sauvegarde a échoué: ${error.message}`, variant: 'destructive' });
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
    
    const { error } = await supabase.from('welcome_popups').delete().eq('id', popupToDelete);
    if (error) {
      toast({ title: 'Erreur', description: 'La suppression a échoué.', variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Popup supprimé.' });
      onRefresh();
    }
    setShowDeleteConfirm(false);
    setPopupToDelete(null);
  };

  const toggleActive = async (popup) => {
    const { error } = await supabase
      .from('welcome_popups')
      .update({ is_active: !popup.is_active })
      .eq('id', popup.id);

    if (error) {
      toast({ title: 'Erreur', description: 'Le changement de statut a échoué.', variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Statut du popup mis à jour.' });
      onRefresh();
    }
  };

  return (
      <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">🖼️ Gestion des Popups de Bienvenue</CardTitle>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Nouveau Popup
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-8 p-4 border border-border/50 rounded-xl shadow-inner bg-background/30">
              <h3 className="text-lg font-semibold">{editingPopup ? 'Modifier le Popup' : 'Ajouter un Popup'}</h3>
              <div className="space-y-2">
                <Label htmlFor="alt_text">Texte alternatif (pour le SEO)</Label>
                <Input id="alt_text" value={formData.alt_text} onChange={(e) => setFormData({...formData, alt_text: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">URL de l'image (ou téléverser)</Label>
                <Input id="image_url" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file-upload">Téléverser une image</Label>
                <Input id="file-upload" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
                {file && <p className="text-sm text-muted-foreground">Fichier sélectionné: {file.name}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({...formData, is_active: checked})} />
                <Label htmlFor="is_active">Actif</Label>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={resetForm}>Annuler</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPopup ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {popups.map(popup => (
              <div key={popup.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-background/50 rounded-xl shadow-sm gap-4">
                <div className="flex items-center gap-4 flex-grow">
                  <img src={popup.image_url} alt={popup.alt_text} className="w-16 h-16 object-cover rounded-md" />
                  <div>
                    <p className="font-semibold text-white">{popup.alt_text || 'Image sans description'}</p>
                    <p className={`text-sm ${popup.is_active ? 'text-green-400' : 'text-red-400'}`}>{popup.is_active ? 'Actif' : 'Inactif'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(popup)}>
                    {popup.is_active ? <PowerOff className="h-4 w-4 text-yellow-500" /> : <Power className="h-4 w-4 text-green-500" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(popup)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => confirmDelete(popup.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le popup sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
};

export default WelcomePopupManagement;