import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Edit, Trash2, Send, Loader2, Eye, Users, Calendar } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AnnouncementForm = ({ announcement, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    message: announcement?.message || '',
    video_url: announcement?.video_url || '',
    image_url: announcement?.image_url || '',
    send_immediately: announcement?.send_immediately ?? false,
    status: announcement?.status || 'draft',
    is_active: announcement?.is_active ?? true,
    type: announcement?.type || 'info',
    target_audience: announcement?.target_audience || 'all',
    scheduled_for: announcement?.scheduled_for || ''
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      let imageUrl = formData.image_url;

      // Upload de l'image si un fichier est sélectionné
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `announcements/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }
      
      const dataToSubmit = {
        ...formData,
        image_url: imageUrl,
        created_by: user.id,
        send_to_all_users: formData.target_audience === 'all',
        // Si programmé, utiliser scheduled_for, sinon maintenant
        scheduled_for: formData.send_immediately ? new Date().toISOString() : formData.scheduled_for
      };

      if (announcement) {
        await onSubmit(announcement.id, dataToSubmit);
      } else {
        await onSubmit(dataToSubmit);
      }
      
    } catch (error) {
      toast({ 
        title: 'Erreur', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            {announcement ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input 
                id="title" 
                type="text" 
                required 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'annonce"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Choisir le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">📢 Information</SelectItem>
                  <SelectItem value="warning">⚠️ Avertissement</SelectItem>
                  <SelectItem value="success">✅ Succès</SelectItem>
                  <SelectItem value="promotion">🎯 Promotion</SelectItem>
                  <SelectItem value="event">🎉 Événement</SelectItem>
                  <SelectItem value="system">⚙️ Système</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea 
              id="message" 
              required 
              rows="4" 
              value={formData.message} 
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Contenu de l'annonce..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="video_url">URL de la vidéo (optionnel)</Label>
              <Input 
                id="video_url" 
                type="url" 
                value={formData.video_url} 
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://example.com/video"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target_audience">Public cible</Label>
              <Select 
                value={formData.target_audience} 
                onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
              >
                <SelectTrigger id="target_audience">
                  <SelectValue placeholder="Public cible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">👥 Tous les utilisateurs</SelectItem>
                  <SelectItem value="organizers">🎪 Organisateurs</SelectItem>
                  <SelectItem value="participants">🎫 Participants</SelectItem>
                  <SelectItem value="partners">🤝 Partenaires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL de l'image (optionnel)</Label>
            <Input 
              id="image_url" 
              type="url" 
              value={formData.image_url} 
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_upload">Ou téléverser une image</Label>
            <Input 
              id="file_upload" 
              type="file" 
              accept="image/*" 
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file && (
              <p className="text-sm text-green-600">
                ✓ Fichier sélectionné: {file.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">📝 Brouillon</SelectItem>
                  <SelectItem value="pending">⏳ En attente</SelectItem>
                  <SelectItem value="approved">✅ Approuvée</SelectItem>
                  <SelectItem value="sent">📤 Envoyée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_for">Programmer pour (optionnel)</Label>
              <Input 
                id="scheduled_for" 
                type="datetime-local" 
                value={formData.scheduled_for} 
                onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="send_immediately" 
                checked={formData.send_immediately} 
                onCheckedChange={(checked) => setFormData({ ...formData, send_immediately: checked })}
              />
              <Label htmlFor="send_immediately" className="cursor-pointer">
                Envoyer immédiatement après approbation
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="is_active" 
                checked={formData.is_active} 
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
              ) : (
                <Megaphone className="w-4 h-4 mr-2" />
              )}
              {announcement ? 'Mettre à jour' : 'Créer l\'annonce'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const AnnouncementsManagement = ({ announcements, onRefresh }) => {
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [previewAnnouncement, setPreviewAnnouncement] = useState(null);

  const createAnnouncement = async (announcementData) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([announcementData]);

      if (error) throw error;

      toast({ 
        title: '✅ Annonce créée', 
        description: 'L\'annonce a été créée avec succès.' 
      });
      
      setShowForm(false);
      onRefresh();

      // Envoi immédiat si demandé
      if (announcementData.send_immediately && announcementData.status === 'approved') {
        const { data: newAnn } = await supabase
          .from('announcements')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (newAnn) {
          await sendAnnouncement(newAnn.id);
        }
      }

    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({ 
        title: '❌ Erreur', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  const updateAnnouncement = async (id, announcementData) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update(announcementData)
        .eq('id', id);

      if (error) throw error;

      toast({ 
        title: '✅ Annonce mise à jour', 
        description: 'L\'annonce a été modifiée avec succès.' 
      });
      
      setEditingAnnouncement(null);
      setShowForm(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast({ 
        title: '❌ Erreur', 
        description: 'Impossible de mettre à jour l\'annonce.', 
        variant: 'destructive' 
      });
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.')) return;
    
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({ 
        title: '✅ Annonce supprimée', 
        description: 'L\'annonce a été supprimée avec succès.' 
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({ 
        title: '❌ Erreur', 
        description: 'Impossible de supprimer l\'annonce.', 
        variant: 'destructive' 
      });
    }
  };

  const sendAnnouncement = async (id) => {
    setSendingId(id);
    try {
      const { data, error } = await supabase
        .rpc('send_announcement_to_users', { announcement_uuid: id });
        
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.message);
      
      toast({ 
        title: '📤 Annonce envoyée!', 
        description: `L'annonce a été envoyée à ${data.total_sent || data} utilisateurs.` 
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast({ 
        title: '❌ Erreur d\'envoi', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setSendingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      pending: { label: 'En attente', variant: 'outline' },
      approved: { label: 'Approuvée', variant: 'default' },
      sent: { label: 'Envoyée', variant: 'success' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type) => {
    const typeIcons = {
      info: '📢',
      warning: '⚠️',
      success: '✅',
      promotion: '🎯',
      event: '🎉',
      system: '⚙️'
    };
    
    return (
      <Badge variant="outline" className="text-xs">
        {typeIcons[type] || '📢'} {type}
      </Badge>
    );
  };

  return (
    <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            Gestion des Annonces
          </CardTitle>
          <p className="text-gray-400 text-sm mt-1">
            Créez et gérez les annonces pour vos utilisateurs
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Megaphone className="w-4 h-4 mr-2" />
          Nouvelle Annonce
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Aucune annonce créée</p>
              <p className="text-sm">Commencez par créer votre première annonce</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="p-4 bg-background/50 rounded-xl border border-gray-700/50 hover:border-primary/30 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Informations de l'annonce */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white text-lg">
                        {announcement.title}
                      </h3>
                      {getStatusBadge(announcement.status)}
                      {getTypeBadge(announcement.type)}
                      {announcement.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-300 text-sm line-clamp-2">
                      {announcement.message}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span className="capitalize">{announcement.target_audience || 'all'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {announcement.sent_at 
                            ? `Envoyée le ${new Date(announcement.sent_at).toLocaleDateString('fr-FR')}`
                            : announcement.scheduled_for
                            ? `Programmée pour ${new Date(announcement.scheduled_for).toLocaleDateString('fr-FR')}`
                            : `Créée le ${new Date(announcement.created_at).toLocaleDateString('fr-FR')}`
                          }
                        </span>
                      </div>
                      {announcement.delivered_count > 0 && (
                        <div className="flex items-center gap-1 text-green-400">
                          <Eye className="w-3 h-3" />
                          <span>{announcement.delivered_count} livrés</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewAnnouncement(announcement)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {(announcement.status === 'approved' || announcement.status === 'draft') && !announcement.sent_at && (
                      <Button 
                        size="sm" 
                        onClick={() => sendAnnouncement(announcement.id)} 
                        disabled={sendingId === announcement.id}
                      >
                        {sendingId === announcement.id ? (
                          <Loader2 className="w-4 h-4 animate-spin"/>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => { 
                        setEditingAnnouncement(announcement); 
                        setShowForm(true); 
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => deleteAnnouncement(announcement.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Image preview */}
                {announcement.image_url && (
                  <div className="mt-3">
                    <img 
                      src={announcement.image_url} 
                      alt={announcement.title}
                      className="h-32 object-cover rounded-lg border border-gray-600"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Formulaire */}
        {showForm && (
          <AnnouncementForm
            announcement={editingAnnouncement}
            onSubmit={editingAnnouncement ? updateAnnouncement : createAnnouncement}
            onCancel={() => {
              setShowForm(false);
              setEditingAnnouncement(null);
            }}
          />
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewAnnouncement} onOpenChange={() => setPreviewAnnouncement(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Aperçu de l'annonce</DialogTitle>
            </DialogHeader>
            {previewAnnouncement && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getTypeBadge(previewAnnouncement.type)}
                  {getStatusBadge(previewAnnouncement.status)}
                </div>
                <h3 className="text-xl font-bold">{previewAnnouncement.title}</h3>
                <p className="text-gray-300">{previewAnnouncement.message}</p>
                {previewAnnouncement.image_url && (
                  <img 
                    src={previewAnnouncement.image_url} 
                    alt={previewAnnouncement.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AnnouncementsManagement;