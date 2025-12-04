import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit, 
  Loader2, 
  Users, 
  Send,
  Search,
  Filter
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const AnnouncementsManagement = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    video_url: '',
    target_audience: 'all',
    target_countries: [],
    send_immediately: false
  });
  const [submitting, setSubmitting] = useState(false);

  // Helper data
  const [availableCountries, setAvailableCountries] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
    fetchCountries();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({ title: "Erreur", description: "Impossible de charger les annonces.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const { data } = await supabase.from('profiles').select('country').not('country', 'is', null);
      if (data) {
        const uniqueCountries = [...new Set(data.map(p => p.country).filter(Boolean))];
        setAvailableCountries(uniqueCountries);
      }
    } catch (err) {
      console.error("Error fetching countries:", err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validation safely accessing length
      if (!formData.title?.trim()) throw new Error("Le titre est requis");
      if (!formData.message?.trim()) throw new Error("Le message est requis");
      if (formData.target_audience === 'countries' && (!formData.target_countries || formData.target_countries.length === 0)) {
        throw new Error("Veuillez sélectionner au moins un pays cible");
      }

      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        video_url: formData.video_url,
        target_audience: formData.target_audience,
        target_countries: formData.target_audience === 'countries' ? formData.target_countries : null,
        send_to_all_users: formData.target_audience === 'all',
        send_immediately: formData.send_immediately,
        created_by: user.id,
        status: formData.send_immediately ? 'sent' : 'pending',
        sent_at: formData.send_immediately ? new Date().toISOString() : null
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      if (formData.send_immediately) {
        // Trigger send logic (edge function or stored procedure usually handles this)
        await supabase.rpc('send_announcement_to_users', { announcement_uuid: data.id });
      }

      toast({ title: "Succès", description: "Annonce créée avec succès." });
      setIsCreateOpen(false);
      setFormData({
        title: '',
        message: '',
        type: 'info',
        video_url: '',
        target_audience: 'all',
        target_countries: [],
        send_immediately: false
      });
      fetchAnnouncements();

    } catch (error) {
      console.error("Create error:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (announcement) => {
    setAnnouncementToDelete(announcement);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!announcementToDelete) return;
    
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', announcementToDelete.id);
      if (error) throw error;
      
      setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete.id));
      toast({ title: "Supprimée", description: "L'annonce a été supprimée." });
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setDeleteConfirmOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  const toggleCountry = (country) => {
    setFormData(prev => {
      const current = prev.target_countries || [];
      if (current.includes(country)) {
        return { ...prev, target_countries: current.filter(c => c !== country) };
      } else {
        return { ...prev, target_countries: [...current, country] };
      }
    });
  };

  const filteredAnnouncements = (announcements || []).filter(a => 
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> 
            Gestion des Annonces
          </h2>
          <p className="text-muted-foreground">Créez et gérez les notifications globales.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nouvelle Annonce
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer une annonce</DialogTitle>
              <DialogDescription>Envoyez un message à vos utilisateurs.</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Titre</label>
                  <Input 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Titre de l'annonce"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select 
                    value={formData.type} 
                    onValueChange={val => setFormData({...formData, type: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="alert">Alerte</SelectItem>
                      <SelectItem value="promo">Promotion</SelectItem>
                      <SelectItem value="event">Événement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea 
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  placeholder="Contenu de votre message..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vidéo URL (Optionnel)</label>
                <Input 
                  value={formData.video_url}
                  onChange={e => setFormData({...formData, video_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cible</label>
                <Select 
                  value={formData.target_audience} 
                  onValueChange={val => setFormData({...formData, target_audience: val})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    <SelectItem value="countries">Pays spécifiques</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.target_audience === 'countries' && (
                <div className="p-4 border rounded-md bg-muted/50">
                  <label className="text-sm font-medium mb-2 block">Sélectionner les pays</label>
                  <ScrollArea className="h-32">
                    <div className="grid grid-cols-2 gap-2">
                      {(availableCountries || []).map(country => (
                        <div key={country} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`country-${country}`} 
                            checked={(formData.target_countries || []).includes(country)}
                            onCheckedChange={() => toggleCountry(country)}
                          />
                          <label htmlFor={`country-${country}`} className="text-sm">{country}</label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="send-now" 
                  checked={formData.send_immediately}
                  onCheckedChange={checked => setFormData({...formData, send_immediately: checked})}
                />
                <label htmlFor="send-now" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Envoyer immédiatement comme notification push
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer l'annonce
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Rechercher une annonce..." 
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <div className="grid gap-4">
          {filteredAnnouncements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune annonce trouvée.</p>
          ) : (
            filteredAnnouncements.map(announcement => (
              <Card key={announcement.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className={`w-2 bg-${announcement.type === 'alert' ? 'red' : announcement.type === 'promo' ? 'purple' : 'blue'}-500`} />
                  <CardContent className="flex-1 p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="uppercase text-xs">{announcement.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                          {announcement.status === 'sent' && (
                            <Badge className="bg-green-500">Envoyée</Badge>
                          )}
                        </div>
                        <h3 className="text-xl font-bold">{announcement.title}</h3>
                        <p className="text-muted-foreground mt-2">{announcement.message}</p>
                        
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Cible: {announcement.target_audience === 'all' ? 'Tous' : (announcement.target_countries?.length || 0) + ' pays'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Send className="w-4 h-4" />
                            Reçus: {announcement.delivered_count || 0}
                          </span>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(announcement)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'annonce</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="font-semibold text-white">{announcementToDelete?.title}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AnnouncementsManagement;