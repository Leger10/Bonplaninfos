import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Search, MapPin, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
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

const SecretaryLocationManagementTab = () => {
  const { userProfile } = useData();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userProfile?.country) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*, profile:user_id(full_name, email)')
        .eq('country', userProfile.country)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations(data || []);

    } catch (error) {
      console.error("Fetch locations error:", error);
      toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userProfile?.country]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLocations = useMemo(() => {
    if (!searchTerm) return locations;
    const lowerSearch = searchTerm.toLowerCase();
    return locations.filter(loc =>
      (loc.name && loc.name.toLowerCase().includes(lowerSearch)) ||
      (loc.city && loc.city.toLowerCase().includes(lowerSearch)) ||
      (loc.profile?.full_name && loc.profile.full_name.toLowerCase().includes(lowerSearch))
    );
  }, [locations, searchTerm]);
  
  const handleToggleStatus = async (location) => {
    try {
      const newStatus = !location.is_active;
      const { error } = await supabase.from('locations').update({ is_active: newStatus }).eq('id', location.id);
      if (error) throw error;
      
      setLocations(prev => prev.map(l => l.id === location.id ? { ...l, is_active: newStatus } : l));
      toast({ title: 'Statut mis à jour avec succès!' });
    } catch (error) {
      toast({ title: "Erreur lors de la mise à jour", description: error.message, variant: "destructive" });
    }
  };
  
  const initiateDelete = (locationId) => {
    setLocationToDelete(locationId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;
    try {
      const { error } = await supabase.rpc('delete_location', { p_location_id: locationToDelete });
      if (error) throw error;
      
      setLocations(prev => prev.filter(l => l.id !== locationToDelete));
      toast({ title: 'Lieu supprimé avec succès!' });
    } catch (error) {
      toast({ title: "Erreur lors de la suppression", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <Card className="glass-effect border-purple-500/20">
      <CardHeader>
        <CardTitle>Gestion des Lieux - {userProfile?.country}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, ville ou utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="space-y-4">
          {filteredLocations.map(loc => (
            <div key={loc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-lg gap-4">
              <div className="flex items-center gap-4 flex-grow">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{loc.name}</p>
                  <p className="text-sm text-muted-foreground">{loc.address}, {loc.city}</p>
                  <p className="text-xs text-muted-foreground">Ajouté par: {loc.profile?.full_name || 'Inconnu'}</p>
                  <Badge variant={loc.is_active ? 'success' : 'destructive'} className="mt-1">
                    {loc.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(loc)}>
                  {loc.is_active ? <ToggleLeft className="w-5 h-5 text-yellow-500" /> : <ToggleRight className="w-5 h-5 text-green-500" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => initiateDelete(loc.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-100/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {filteredLocations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Aucun lieu trouvé pour ce pays.</div>
          )}
        </div>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Cela supprimera définitivement ce lieu et toutes les données associées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default SecretaryLocationManagementTab;