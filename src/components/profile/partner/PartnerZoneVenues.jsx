import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, MapPin, Search, Power, PowerOff, Building } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PartnerZoneVenues = ({ country }) => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchVenues();
  }, [country]);

  const fetchVenues = async () => {
    if (!country) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*, profile:user_id(full_name, email)')
        .eq('country', country)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVenues(data || []);
    } catch (error) {
      console.error("Error fetching venues:", error);
      toast({ title: "Erreur", description: "Impossible de charger les lieux.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (venue) => {
    setProcessing(venue.id);
    const newStatus = !venue.is_active;
    try {
      const { error } = await supabase
        .from('locations')
        .update({ is_active: newStatus })
        .eq('id', venue.id);

      if (error) throw error;

      setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, is_active: newStatus } : v));
      toast({ 
        title: newStatus ? "Lieu activé" : "Lieu désactivé", 
        description: `Le lieu "${venue.name}" est maintenant ${newStatus ? 'actif' : 'inactif'}.` 
      });
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const filteredVenues = venues.filter(v => 
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          Gestion des Lieux ({country})
        </h3>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du Lieu</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell>
                </TableRow>
              ) : filteredVenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun lieu trouvé dans cette zone.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVenues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {venue.name}
                      </div>
                    </TableCell>
                    <TableCell>{venue.city}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="font-medium">{venue.profile?.full_name || 'Inconnu'}</span>
                        <span className="text-muted-foreground">{venue.profile?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={venue.is_active ? 'success' : 'secondary'}>
                        {venue.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(venue)}
                        disabled={processing === venue.id}
                        className={venue.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                      >
                        {processing === venue.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : venue.is_active ? (
                          <><PowerOff className="w-4 h-4 mr-2" /> Désactiver</>
                        ) : (
                          <><Power className="w-4 h-4 mr-2" /> Activer</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerZoneVenues;