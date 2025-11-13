import React, { useState } from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Textarea } from '@/components/ui/textarea';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Label } from '@/components/ui/label';
    import { Megaphone, Edit, Trash2, Send, Loader2 } from 'lucide-react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { toast } from '@/components/ui/use-toast';
    import { useAuth } from '@/contexts/SupabaseAuthContext';

    const AnnouncementForm = ({ announcement, onSubmit, onCancel }) => {
      const [formData, setFormData] = useState({
        title: announcement?.title || '',
        message: announcement?.message || '',
        video_url: announcement?.video_url || '',
        image_url: announcement?.image_url || '',
        send_immediately: announcement?.send_immediately ?? false,
        status: announcement?.status || 'draft',
        is_active: announcement?.is_active ?? true,
        type: announcement?.type || 'info'
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

          if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `announcements/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
          }
          
          const dataToSubmit = {
              ...formData,
              image_url: imageUrl,
              created_by: user.id,
              send_to_all_users: true // Simplified for now
          };

          if(announcement) {
            await onSubmit(announcement.id, dataToSubmit);
          } else {
            await onSubmit(dataToSubmit);
          }
          
        } catch (error) {
          toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-primary/20 p-6 rounded-xl w-full max-w-lg shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4">
              {announcement ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-gray-400">Titre</Label>
                <Input id="title" type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}/>
              </div>
              <div>
                <Label htmlFor="message" className="text-gray-400">Message</Label>
                <Textarea id="message" required rows="3" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}/>
              </div>
               <div>
                <Label htmlFor="video_url" className="text-gray-400">URL de la vidéo (optionnel)</Label>
                <Input id="video_url" type="url" value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}/>
              </div>
               <div>
                <Label htmlFor="image_url" className="text-gray-400">URL de l'image (ou téléverser)</Label>
                <Input id="image_url" type="url" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}/>
               </div>
               <div>
                 <Label htmlFor="file_upload">Téléverser une image</Label>
                 <Input id="file_upload" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])}/>
               </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <Label htmlFor="type" className="text-gray-400">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Avertissement</SelectItem>
                      <SelectItem value="success">Succès</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="event">Événement</SelectItem>
                      <SelectItem value="system">Système</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                    <Label htmlFor="status" className="text-gray-400">Statut</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="approved">Approuvée</SelectItem>
                        <SelectItem value="sent">Envoyée</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id="send_immediately" checked={formData.send_immediately} onCheckedChange={(checked) => setFormData({ ...formData, send_immediately: checked })}/>
                  <Label htmlFor="send_immediately" className="text-gray-400">Envoyer immédiatement après approbation</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}/>
                  <Label htmlFor="is_active" className="text-gray-400">Active</Label>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                    Enregistrer
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>
      );
    };
    
    const AnnouncementsManagement = ({ announcements, onRefresh }) => {
      const [editingAnnouncement, setEditingAnnouncement] = useState(null);
      const [showForm, setShowForm] = useState(false);
      const [sendingId, setSendingId] = useState(null);
    
      const createAnnouncement = async (announcementData) => {
        try {
          const { error } = await supabase.from('announcements').insert(announcementData);
          if (error) throw error;
    
          toast({ title: 'Annonce créée avec succès' });
          setShowForm(false);
          onRefresh();

          if (announcementData.send_immediately && announcementData.status === 'approved') {
              const { data: newAnn } = await supabase.from('announcements').select('id').order('created_at', { ascending: false }).limit(1).single();
              if (newAnn) {
                  await sendAnnouncement(newAnn.id);
              }
          }

        } catch (error) {
          console.error('Error creating announcement:', error);
          toast({ title: 'Erreur lors de la création', description: error.message, variant: 'destructive' });
        }
      };
    
      const updateAnnouncement = async (id, announcementData) => {
        try {
          const { error } = await supabase.from('announcements').update(announcementData).eq('id', id);
    
          if (error) throw error;
    
          toast({ title: 'Annonce mise à jour avec succès' });
          setEditingAnnouncement(null);
          setShowForm(false);
          onRefresh();
        } catch (error) {
          console.error('Error updating announcement:', error);
          toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
        }
      };
    
      const deleteAnnouncement = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
        try {
          const { error } = await supabase.from('announcements').delete().eq('id', id);
          if (error) throw error;
          toast({ title: 'Annonce supprimée avec succès' });
          onRefresh();
        } catch (error) {
          console.error('Error deleting announcement:', error);
          toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
        }
      };
    
      const sendAnnouncement = async (id) => {
         setSendingId(id);
         try {
          const { data, error } = await supabase.rpc('send_announcement_to_users', { announcement_uuid: id });
          if (error) throw error;
          if (data && data.success === false) throw new Error(data.message);
          
          toast({ title: 'Annonce envoyée!', description: `L'annonce a été envoyée à ${data.total_sent} utilisateurs.` });
          onRefresh();
         } catch (error) {
          console.error('Error sending announcement:', error);
          toast({ title: 'Erreur lors de l\'envoi', description: error.message, variant: 'destructive' });
         } finally {
            setSendingId(null);
         }
      };
    
      return (
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">📢 Gestion des Annonces</CardTitle>
            <Button onClick={() => setShowForm(true)}>
              <Megaphone className="w-4 h-4 mr-2" />
              Nouvelle Annonce
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-xl shadow-sm gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{announcement.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${announcement.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {announcement.is_active ? 'Active' : 'Inactive'}
                      </span>
                       <span className={`px-2 py-1 rounded text-xs capitalize bg-blue-500/20 text-blue-400`}>
                        {announcement.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{announcement.message}</p>
                    <p className="text-gray-500 text-xs">
                      {announcement.sent_at ? `Envoyée le ${new Date(announcement.sent_at).toLocaleDateString()}` : `Créée le ${new Date(announcement.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {(announcement.status === 'approved' || announcement.status === 'draft') && !announcement.sent_at && (
                      <Button size="sm" onClick={() => sendAnnouncement(announcement.id)} disabled={sendingId === announcement.id}>
                        {sendingId === announcement.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <><Send className="w-4 h-4 mr-2"/>Envoyer</>}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setEditingAnnouncement(announcement); setShowForm(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteAnnouncement(announcement.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
    
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
          </CardContent>
        </Card>
      );
    };
    
    export default AnnouncementsManagement;