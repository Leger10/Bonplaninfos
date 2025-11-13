import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Search, MapPin, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
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
import { useData } from '@/contexts/DataContext';

const LocationManagementTab = () => {
  const { userProfile } = useData();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const isAdminOrSuperAdmin = userProfile?.user_type === 'admin' || userProfile?.user_type === 'super_admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('locations').select('*, user:user_id(full_name, email)');
      
      if (isAdminOrSuperAdmin && userProfile.country && userProfile.user_type !== 'super_admin') {
        query = query.eq('country', userProfile.country);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error("Fetch error details:", error);
        throw new Error(error.message);
      };
      
      setLocations(data || []);

    } catch (error) {
      console.error("Fetch error:", error);
      toast({ title: "Erreur de chargement", description: `Impossible de charger les lieux: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAdminOrSuperAdmin, userProfile?.country, userProfile?.user_type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLocations = useMemo(() => {
    if (!searchTerm) return locations;
    const lowerSearch = searchTerm.toLowerCase();
    return locations.filter(loc =>
      (loc.name && loc.name.toLowerCase().includes(lowerSearch)) ||
      (loc.city && loc.city.toLowerCase().includes(lowerSearch)) ||
      (loc.user?.full_name && loc.user.full_name.toLowerCase().includes(lowerSearch))
    );
  }, [locations, searchTerm]);

  const canDelete = (location) => {
      if (!userProfile) return false;
      return userProfile.id === location.user_id || userProfile.user_type === 'admin' || userProfile.user_type === 'super_admin';
  }

  const handleDelete = async () => {
    if (!selectedLocationId) return;
    try {
      const { error } = await supabase.rpc('delete_location', { p_location_id: selectedLocationId });
      if (error) throw error;
      toast({ title: 'Lieu supprimé avec succès!' });
      fetchData();
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: "Erreur lors de la suppression", description: error.message, variant: "destructive" });
    }
  };
  
  const handleToggleStatus = async (location) => {
    const newStatus = !location.is_active;
    try {
      const { error } = await supabase.from('locations').update({ is_active: newStatus }).eq('id', location.id);
      if (error) throw error;
      toast({ title: 'Statut mis à jour avec succès!' });
      fetchData();
    } catch (error) {
      toast({ title: "Erreur lors de la mise à jour", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <Card className="glass-effect shadow-lg">
      <CardHeader>
        <CardTitle>Gestion des Lieux</CardTitle>
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
                  <p className="text-sm text-muted-foreground">{loc.address}, {loc.city}, {loc.country}</p>
                  <p className="text-xs text-muted-foreground">Ajouté par: {loc.user?.full_name || 'N/A'}</p>
                  <Badge variant={loc.is_active ? 'success' : 'destructive'} className="mt-1">
                    {loc.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(loc)}>
                  {loc.is_active ? <ToggleLeft className="w-5 h-5 text-yellow-500" /> : <ToggleRight className="w-5 h-5 text-green-500" />}
                </Button>
                {canDelete(loc) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { setSelectedLocationId(loc.id); setDeleteDialogOpen(true); }}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible et supprimera définitivement ce lieu.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default LocationManagementTab;