import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, MoreVertical, Trash2, Edit, ToggleLeft, ToggleRight, Download, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { exportToExcel } from '@/lib/exportToExcel';
import { useNavigate } from 'react-router-dom';
import { extractStoragePath } from '@/lib/utils';

const EventsManagement = ({ events, onRefresh }) => {
  const [filteredEvents, setFilteredEvents] = useState(events);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setFilteredEvents(
      events.filter(event => {
        const searchMatch = event.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || event.status === statusFilter;
        return searchMatch && statusMatch;
      })
    );
  }, [searchTerm, statusFilter, events]);

  const handleToggleStatus = async (event) => {
    const newStatus = event.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', event.id);
      if (error) {
        if (error.message.includes('events_status_check')) {
          throw new Error(`Statut invalide: "${newStatus}". Les statuts valides sont active, inactive, archived, draft, deleted.`);
        }
        throw error;
      }
      toast({ title: 'Statut mis à jour avec succès!' });
      onRefresh();
    } catch (error) {
      toast({ title: "Erreur lors de la mise à jour", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedEventId) return;
    setIsDeleting(true);
    console.log(`EventsManagement: Deleting event ${selectedEventId}`);
    
    try {
      // Find event to get image url
      const eventToDelete = events.find(e => e.id === selectedEventId);
      
      // 1. Delete image from storage
      if (eventToDelete && eventToDelete.cover_image) {
        const storageInfo = extractStoragePath(eventToDelete.cover_image);
        if (storageInfo) {
          const { error: storageError } = await supabase.storage
            .from(storageInfo.bucket)
            .remove([storageInfo.path]);
          if (storageError) console.warn("Storage cleanup warning:", storageError);
        }
      }

      // 2. Delete event from DB
      const { error } = await supabase.rpc('delete_event_completely', { p_event_id: selectedEventId });
      if (error) throw error;
      
      toast({ title: 'Événement supprimé avec succès!' });
      onRefresh();
      setDeleteDialogOpen(false);
      setSelectedEventId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Erreur lors de la suppression", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    if (!filteredEvents || filteredEvents.length === 0) {
      toast({ title: 'Aucune donnée à exporter.', variant: 'destructive' });
      return;
    }

    const dataToExport = filteredEvents.map(e => ({
      id: e.id,
      title: e.title,
      type: e.event_type,
      date: new Date(e.event_date).toLocaleString('fr-FR'),
      city: e.city,
      country: e.country,
      status: e.status,
      pricePi: e.price_pi,
      views: e.views_count,
      interactions: e.interactions_count,
    }));

    const headers = [
      { label: 'ID', key: 'id' },
      { label: 'Titre', key: 'title' },
      { label: 'Type', key: 'type' },
      { label: 'Date', key: 'date' },
      { label: 'Ville', key: 'city' },
      { label: 'Pays', key: 'country' },
      { label: 'Statut', key: 'status' },
      { label: 'Prix (Pièces)', key: 'pricePi' },
      { label: 'Vues', key: 'views' },
      { label: 'Interactions', key: 'interactions' },
    ];

    exportToExcel({
      data: dataToExport,
      headers: headers,
      sheetName: 'Événements',
      fileName: 'export_evenements.xlsx',
    });
    toast({ title: "Exportation réussie", description: "Le fichier Excel a été téléchargé." });
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'draft': return 'outline';
      case 'archived': return 'destructive';
      default: return 'default';
    }
  }

  return (
    <Card className="glass-effect shadow-lg">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <CardTitle>Gestion des Événements</CardTitle>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Exporter
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
              <SelectItem value="deleted">Supprimé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="p-2">Titre</th>
                <th className="p-2">Type</th>
                <th className="p-2">Date</th>
                <th className="p-2">Lieu</th>
                <th className="p-2">Statut</th>
                <th className="p-2">Prix (Pièces)</th>
                <th className="p-2">Vues/Interactions</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => (
                <tr key={event.id} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="p-2 font-medium cursor-pointer hover:underline" onClick={() => navigate(`/event/${event.id}`)}>{event.title}</td>
                  <td className="p-2 text-muted-foreground">{event.event_type}</td>
                  <td className="p-2 text-muted-foreground">{new Date(event.event_date).toLocaleDateString()}</td>
                  <td className="p-2 text-muted-foreground">{event.city}, {event.country}</td>
                  <td className="p-2">
                    <Badge variant={getStatusBadgeVariant(event.status)}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-muted-foreground">{event.price_pi || 'N/A'}</td>
                  <td className="p-2 text-muted-foreground">{event.views_count || 0} / {event.interactions_count || 0}</td>
                  <td className="p-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleToggleStatus(event)}>
                          {event.status === 'active' ? <ToggleLeft className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}
                          {event.status === 'active' ? 'Désactiver' : 'Activer'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast({ title: "🚧 Bientôt disponible !" })}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => { setSelectedEventId(event.id); setDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible et supprimera définitivement l'événement et toutes ses données associées (tickets, votes, etc.).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default EventsManagement;