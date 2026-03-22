import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Video, PlusCircle, Edit, Trash2, Power, PowerOff, Upload, Youtube } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const VideoManagementTab = () => {
  const { user } = useAuth();
  const { userProfile } = useData();
  const { toast } = useToast();
  const [videos, setVideos] = useState([]);
  const [editingVideo, setEditingVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpeg, setFfmpeg] = useState(null);

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
// Charger FFmpeg au montage
useEffect(() => {
  const loadFFmpeg = async () => {
    try {
      const ffmpegInstance = new FFmpeg();
      // Utiliser une version plus récente et stable
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd';
      await ffmpegInstance.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      setFfmpeg(ffmpegInstance);
      setFfmpegLoaded(true);
      console.log('FFmpeg chargé avec succès');
    } catch (error) {
      console.error('Erreur de chargement FFmpeg :', error);
      toast({
        title: 'Attention',
        description: 'Le module de compression vidéo n’a pas pu être chargé. Les vidéos seront téléversées sans compression.',
        variant: 'warning',
      });
      setFfmpegLoaded(false);
    }
  };
  loadFFmpeg();
}, [toast]);
  // Vérification du rôle
  const isSuperAdmin = userProfile?.user_type === 'super_admin';

  const loadVideos = useCallback(async () => {
    if (!isSuperAdmin) return;
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
  }, [toast, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadVideos();
    } else if (userProfile && userProfile.user_type !== 'super_admin') {
      toast({ title: 'Accès refusé', description: 'Seul un super administrateur peut gérer les vidéos.', variant: 'destructive' });
    }
  }, [isSuperAdmin, loadVideos, toast, userProfile]);

  const resetForm = () => {
    setEditingVideo(null);
    setFile(null);
    setUploadProgress(0);
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

  const compressVideo = async (file) => {
    if (!ffmpegLoaded || !ffmpeg) throw new Error('FFmpeg non chargé');

    setCompressing(true);
    try {
      const inputName = 'input.mp4';
      const outputName = 'output.mp4';

      const arrayBuffer = await file.arrayBuffer();
      await ffmpeg.writeFile(inputName, new Uint8Array(arrayBuffer));

      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-b:v', '500k',
        '-maxrate', '500k',
        '-bufsize', '1000k',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
        '-c:a', 'aac',
        '-b:a', '128k',
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const compressedBlob = new Blob([data], { type: 'video/mp4' });
      const compressedFile = new File([compressedBlob], file.name, { type: 'video/mp4' });
      return compressedFile;
    } finally {
      setCompressing(false);
    }
  };

  const uploadFile = async (file, type) => {
    if (!file) return null;

    let fileToUpload = file;
    const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

    // Si le fichier dépasse 10 Mo et que FFmpeg est chargé, on compresse
    if (file.size > MAX_SIZE && ffmpegLoaded) {
      toast({ title: 'Compression', description: 'La vidéo est volumineuse, compression en cours...' });
      fileToUpload = await compressVideo(file);
      toast({ title: 'Compression terminée', description: `Taille réduite de ${(file.size / 1024 / 1024).toFixed(1)} Mo à ${(fileToUpload.size / 1024 / 1024).toFixed(1)} Mo` });
    } else if (file.size > MAX_SIZE && !ffmpegLoaded) {
      toast({
        title: 'Taille excessive',
        description: 'La vidéo dépasse 10 Mo et la compression n’est pas disponible. Veuillez réduire la taille de votre vidéo.',
        variant: 'destructive',
      });
      throw new Error('Fichier trop volumineux, compression non disponible');
    }

    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${type}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('media').upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      if (!formData.title.trim()) throw new Error('Le titre est requis.');
      if (formData.reward_coins < 0) throw new Error('La récompense doit être un nombre positif.');
      if (formData.video_duration <= 0) throw new Error('La durée doit être supérieure à 0.');

      let videoUrl = formData.video_url;
      if (file) {
        setUploadProgress(30);
        videoUrl = await uploadFile(file, 'videos');
        setUploadProgress(100);
      }

      if (!videoUrl) throw new Error("Une URL de vidéo ou un fichier est requis.");

      const dataToSave = { ...formData, video_url: videoUrl };

      if (editingVideo) {
        if (dataToSave.is_active) {
          const { error: deactivateError } = await supabase
            .from('mandatory_videos')
            .update({ is_active: false })
            .neq('id', editingVideo.id);
          if (deactivateError) throw deactivateError;
        }
        const { error } = await supabase
          .from('mandatory_videos')
          .update(dataToSave)
          .eq('id', editingVideo.id);
        if (error) throw error;
        toast({ title: 'Succès', description: 'Vidéo mise à jour.' });
      } else {
        if (dataToSave.is_active) {
          const { error: deactivateError } = await supabase
            .from('mandatory_videos')
            .update({ is_active: false })
            .eq('is_active', true);
          if (deactivateError) throw deactivateError;
        }
        const { error } = await supabase
          .from('mandatory_videos')
          .insert([dataToSave]);
        if (error) throw error;
        toast({ title: 'Succès', description: 'Vidéo créée.' });
      }
      resetForm();
      await loadVideos();
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: 'Erreur', description: `La sauvegarde a échoué: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const confirmDelete = (videoId) => {
    setVideoToDelete(videoId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!videoToDelete) return;
    const { error } = await supabase
      .from('mandatory_videos')
      .delete()
      .eq('id', videoToDelete);
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
      const { error: deactivateError } = await supabase
        .from('mandatory_videos')
        .update({ is_active: false })
        .neq('id', video.id);
      if (deactivateError) {
        toast({ title: 'Erreur', description: 'Impossible de désactiver les autres vidéos.', variant: 'destructive' });
        return;
      }
    }

    const { error } = await supabase
      .from('mandatory_videos')
      .update({ is_active: newActiveState })
      .eq('id', video.id);
    if (error) {
      toast({ title: 'Erreur', description: 'Le changement de statut a échoué.', variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Statut de la vidéo mis à jour.' });
      await loadVideos();
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Accès réservé aux super administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            {editingVideo ? <Edit className="mr-2" /> : <PlusCircle className="mr-2" />}
            {editingVideo ? 'Modifier la vidéo' : 'Ajouter une vidéo'}
          </CardTitle>
          <CardDescription>
            Gérez les vidéos de récompense. Une seule peut être active à la fois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="Ex: Bienvenue sur BonPlanInfos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_upload">Téléverser une vidéo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="video_upload"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="flex-1"
                    // disabled={!ffmpegLoaded}  // Retiré pour permettre l’upload
                  />
                  {file && <Upload className="h-4 w-4 text-muted-foreground" />}
                </div>
                {!ffmpegLoaded && <p className="text-xs text-muted-foreground">Compression vidéo non disponible (facultatif).</p>}
                {(compressing || uploadProgress > 0) && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{ width: compressing ? '50%' : `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_url">OU Coller une URL de vidéo (YouTube, Vimeo, etc.)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="video_url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <Youtube className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward_coins">Pièces en récompense *</Label>
                <Input
                  id="reward_coins"
                  type="number"
                  min="0"
                  value={formData.reward_coins}
                  onChange={(e) => setFormData({...formData, reward_coins: parseInt(e.target.value) || 0})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_duration">Durée (secondes) *</Label>
                <Input
                  id="video_duration"
                  type="number"
                  min="1"
                  value={formData.video_duration}
                  onChange={(e) => setFormData({...formData, video_duration: parseInt(e.target.value) || 0})}
                  required
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active_form"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active_form">Activer (désactivera les autres vidéos)</Label>
            </div>
            <div className="flex items-center justify-between">
              <Button type="submit" disabled={isSubmitting || compressing}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingVideo ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
              {editingVideo && <Button variant="ghost" onClick={resetForm}>Annuler</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-xl mt-8">
        <CardHeader>
          <CardTitle>Liste des vidéos</CardTitle>
          <CardDescription>Gérez les vidéos existantes. Une seule peut être active.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune vidéo. Créez votre première vidéo.
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map(video => (
                <div key={video.id} className="flex items-center justify-between p-4 bg-muted rounded-xl shadow-sm">
                  <div className="flex items-center gap-4">
                    <Video className={video.is_active ? "text-green-500" : "text-muted-foreground"} />
                    <div>
                      <p className="font-semibold">{video.title}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          🎁 {video.reward_coins} pièces
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ⏱️ {video.video_duration}s
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${video.is_active ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10'}`}>
                          {video.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
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