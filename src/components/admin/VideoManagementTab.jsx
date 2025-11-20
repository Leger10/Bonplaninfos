import React, { useState, useEffect, useCallback } from 'react';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { useToast } from '@/components/ui/use-toast';
    import { Loader2, Video, PlusCircle, Edit, Trash2, Power, PowerOff } from 'lucide-react';
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
    import { Switch } from '@/components/ui/switch';

    const VideoManagementTab = () => {
      const { user } = useAuth();
      const { toast } = useToast();
      const [videos, setVideos] = useState([]);
      const [editingVideo, setEditingVideo] = useState(null);
      const [loading, setLoading] = useState(true);
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
      const [videoToDelete, setVideoToDelete] = useState(null);
      const [file, setFile] = useState(null);

      const [formData, setFormData] = useState({
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        reward_coins: 10,
        is_mandatory: true,
        is_active: false,
        video_duration: 0,
      });

      const loadVideos = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('mandatory_videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          toast({ title: 'Erreur', description: 'Impossible de charger les vidéos.', variant: 'destructive' });
        } else {
          setVideos(data);
        }
        setLoading(false);
      }, [toast]);

      useEffect(() => {
        loadVideos();
      }, [loadVideos]);

      const resetForm = () => {
        setEditingVideo(null);
        setFile(null);
        setFormData({
          title: '',
          description: '',
          video_url: '',
          thumbnail_url: '',
          reward_coins: 10,
          is_mandatory: true,
          is_active: false,
          video_duration: 0,
        });
      };

      const handleEdit = (video) => {
        setEditingVideo(video);
        setFormData({
          title: video.title,
          description: video.description || '',
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url || '',
          reward_coins: video.reward_coins || 10,
          is_mandatory: video.is_mandatory,
          is_active: video.is_active,
          video_duration: video.video_duration || 0,
        });
      };
      
      const uploadFile = async (file, type) => {
        if (!file) return null;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${type}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
        return publicUrlData.publicUrl;
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let videoUrl = formData.video_url;
            if (file) {
                videoUrl = await uploadFile(file, 'videos');
            }

            if (!videoUrl) throw new Error("Une URL de vidéo ou un fichier est requis.");

            const dataToSave = { ...formData, video_url: videoUrl };
            
            if (editingVideo) {
              const { error } = await supabase.from('mandatory_videos').update(dataToSave).eq('id', editingVideo.id);
              if (error) throw error;
              toast({ title: 'Succès', description: 'Vidéo mise à jour.' });
            } else {
              const { error } = await supabase.from('mandatory_videos').insert([dataToSave]);
              if (error) throw error;
              toast({ title: 'Succès', description: 'Vidéo créée.' });
            }
            resetForm();
            await loadVideos();

        } catch (error) {
            toast({ title: 'Erreur', description: `La sauvegarde a échoué: ${error.message}`, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
      };

      const confirmDelete = (videoId) => {
        setVideoToDelete(videoId);
        setShowDeleteConfirm(true);
      };

      const handleDelete = async () => {
        if (!videoToDelete) return;
        
        const { error } = await supabase.from('mandatory_videos').delete().eq('id', videoToDelete);
        if (error) {
          toast({ title: 'Erreur', description: 'La suppression a échoué.', variant: 'destructive' });
        } else {
          toast({ title: 'Succès', description: 'Vidéo supprimée.' });
          await loadVideos();
        }
        setShowDeleteConfirm(false);
        setVideoToDelete(null);
      };

      const toggleActive = async (video) => {
        const newActiveState = !video.is_active;

        if (newActiveState) {
          const { error: deactivateError } = await supabase.from('mandatory_videos').update({ is_active: false }).eq('is_active', true);
          if (deactivateError) {
            toast({ title: 'Erreur', description: 'Impossible de désactiver les autres vidéos.', variant: 'destructive' });
            return;
          }
        }

        const { error } = await supabase.from('mandatory_videos').update({ is_active: newActiveState }).eq('id', video.id);
        if (error) {
          toast({ title: 'Erreur', description: 'Le changement de statut a échoué.', variant: 'destructive' });
        } else {
          toast({ title: 'Succès', description: 'Statut de la vidéo mis à jour.' });
          await loadVideos();
        }
      };


      return (
        <div className="p-4 space-y-6">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                {editingVideo ? <Edit className="mr-2" /> : <PlusCircle className="mr-2" />}
                {editingVideo ? 'Modifier la vidéo' : 'Ajouter une vidéo'}
              </CardTitle>
              <CardDescription>
                Gérez les vidéos de récompense. Une seule peut être active.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre</Label>
                    <Input id="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                  </div>
                   <div className="space-y-2">
                     <Label htmlFor="video_upload">Téléverser une vidéo</Label>
                     <Input id="video_upload" type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} />
                   </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="video_url">OU Coller une URL de vidéo</Label>
                    <Input id="video_url" value={formData.video_url} onChange={(e) => setFormData({...formData, video_url: e.target.value})} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label htmlFor="reward_coins">Pièces en récompense</Label>
                    <Input id="reward_coins" type="number" min="0" value={formData.reward_coins} onChange={(e) => setFormData({...formData, reward_coins: parseInt(e.target.value) || 0})} required />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="video_duration">Durée (secondes)</Label>
                    <Input id="video_duration" type="number" min="1" value={formData.video_duration} onChange={(e) => setFormData({...formData, video_duration: parseInt(e.target.value) || 0})} required />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="is_active_form" checked={formData.is_active} onCheckedChange={(checked) => setFormData({...formData, is_active: checked})} />
                  <Label htmlFor="is_active_form">Activer (désactivera les autres)</Label>
                </div>
                <div className="flex items-center justify-between">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingVideo ? 'Mettre à jour' : 'Enregistrer'}
                  </Button>
                  {editingVideo && <Button variant="ghost" onClick={resetForm}>Annuler</Button>}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-xl mt-8">
            <CardHeader><CardTitle>Liste des vidéos</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Loader2 className="animate-spin" /> : (
                <div className="space-y-4">
                  {videos.map(video => (
                    <div key={video.id} className="flex items-center justify-between p-3 bg-muted rounded-xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <Video className={video.is_active ? "text-green-500" : "text-muted-foreground"} />
                        <div>
                          <p className="font-semibold">{video.title}</p>
                          <p className={`text-sm ${video.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>{video.is_active ? 'Active' : 'Inactive'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(video)} title={video.is_active ? "Désactiver" : "Activer"}>
                          {video.is_active ? <PowerOff className="h-4 w-4 text-yellow-500" /> : <Power className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(video)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(video.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. La vidéo sera définitivement supprimée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    };

    export default VideoManagementTab;