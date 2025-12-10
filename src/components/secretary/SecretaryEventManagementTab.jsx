import React, { useState } from 'react';
import { Calendar, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { extractStoragePath } from '@/lib/utils';
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

const SecretaryEventManagementTab = ({ events, onRefresh }) => {
  const { userProfile } = useData();
  const { t } = useTranslation();
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, eventId: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const logAction = async (action_type, target_id, details = {}) => {
    await supabase.from('admin_logs').insert({
      actor_id: userProfile.id,
      action_type,
      target_id,
      details,
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.eventId) return;
    setIsDeleting(true);
    
    try {
      const eventToDelete = events.find(e => e.id === deleteDialog.eventId);
      
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

      // 2. Delete event via RPC
      const { error } = await supabase.rpc('delete_event_completely', { p_event_id: deleteDialog.eventId });
      if (error) throw error;
      
      toast({ title: 'Événement supprimé' });
      await logAction('event_deleted', deleteDialog.eventId);
      onRefresh();
    } catch(error) {
      toast({ title: 'Erreur', description: "Impossible de supprimer l'événement.", variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, eventId: null });
    }
  };

  const handleToggleStatus = async (event) => {
    const newStatus = event.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', event.id);
      if (error) throw error;
      toast({ title: 'Statut mis à jour' });
      await logAction('event_status_toggled', event.id, { new_status: newStatus });
      onRefresh();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' });
    }
  };

  return (
    <>
      <Card className="glass-effect border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">Liste des événements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-lg gap-4">
                <div className="flex items-center space-x-4 flex-grow">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{event.title}</p>
                    <p className="text-sm text-gray-400">
                      Par {event.organizer?.full_name || 'N/A'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-primary/80 text-white text-xs">
                        {event.city}, {event.country}
                      </Badge>
                       <Badge variant={event.status === 'active' ? 'success' : 'destructive'} className="text-xs">
                        {event.status === 'active' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleToggleStatus(event)}
                    className="hover:text-yellow-400"
                  >
                    {event.status === 'active' ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteDialog({ isOpen: true, eventId: event.id })}
                    className="hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteDialog({ isOpen: false, eventId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SecretaryEventManagementTab;