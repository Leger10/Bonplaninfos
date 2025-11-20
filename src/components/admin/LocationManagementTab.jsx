import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Search, MapPin, Trash2, ToggleLeft, ToggleRight, Loader2, Shield } from 'lucide-react'; // Added Shield import
import { useData } from '@/contexts/DataContext';

const LocationManagementTab = () => {
  const { userProfile } = useData();
  const [locations, setLocations] = useState([]);
  const [profiles, setProfiles] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (locationsError) {
        console.error("Fetch locations error:", locationsError);
        throw new Error(`Impossible de charger les lieux: ${locationsError.message}`);
      }
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profilesError) {
        console.error("Fetch profiles error:", profilesError);
        throw new Error(`Impossible de charger les profils utilisateurs: ${profilesError.message}`);
      }

      const profilesMap = new Map(profilesData.map(p => [p.id, p]));
      setProfiles(profilesMap);
      setLocations(locationsData || []);

    } catch (error) {
      toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mergedLocations = useMemo(() => {
    return locations.map(loc => ({
      ...loc,
      profile: profiles.get(loc.user_id) || { full_name: 'N/A', email: '' }
    }));
  }, [locations, profiles]);

  const filteredLocations = useMemo(() => {
    if (!searchTerm) return mergedLocations;
    const lowerSearch = searchTerm.toLowerCase();
    return mergedLocations.filter(loc =>
      (loc.name && loc.name.toLowerCase().includes(lowerSearch)) ||
      (loc.city && loc.city.toLowerCase().includes(lowerSearch)) ||
      (loc.profile?.full_name && loc.profile.full_name.toLowerCase().includes(lowerSearch))
    );
  }, [mergedLocations, searchTerm]);
  
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
  
  const handleDelete = async (locationId) => {
    try {
      const { error } = await supabase.rpc('delete_location', { p_location_id: locationId });
      if (error) throw error;
      toast({ title: 'Lieu supprimé avec succès!' });
      fetchData();
    } catch (error) {
      toast({ title: "Erreur lors de la suppression", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <Card className="glass-effect border-purple-500/20">
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
                  <p className="text-xs text-muted-foreground">Ajouté par: {loc.profile?.full_name || 'N/A'}</p>
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
                  onClick={() => handleDelete(loc.id)}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationManagementTab;