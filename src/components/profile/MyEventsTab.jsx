import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2, Plus, Trash2 } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { extractStoragePath } from '@/lib/utils';

const MyEventsTab = ({ userProfile, userEvents, loadingEvents, onRefresh }) => {
  const navigate = useNavigate();
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, event: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreateEvent = userProfile && (userProfile.user_type === 'organizer' || userProfile.user_type === 'admin' || userProfile.user_type === 'super_admin');

  const handleDeleteClick = (event) => {
    console.log('MyEventsTab: Delete clicked for event', event.id);
    setDeleteConfirmation({ isOpen: true, event });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.event) return;
    
    setIsDeleting(true);
    const event = deleteConfirmation.event;

    try {
      // 1. Delete cover image from storage if exists
      if (event.cover_image) {
        const storageInfo = extractStoragePath(event.cover_image);
        if (storageInfo) {
          const { error: storageError } = await supabase.storage
            .from(storageInfo.bucket)
            .remove([storageInfo.path]);
          
          if (storageError) {
            console.warn("Could not delete image from storage:", storageError);
            // We continue even if image delete fails, as DB cleanup is priority
          }
        }
      }

      // 2. Delete event from DB using RPC which handles cascades
      const { error: dbError } = await supabase.rpc('delete_event_completely', { p_event_id: event.id });
      if (dbError) throw dbError;

      toast({ title: "Événement supprimé", description: "L'événement a été supprimé avec succès." });
      
      // 3. Close modal and refresh list
      setDeleteConfirmation({ isOpen: false, event: null });
      if (onRefresh) onRefresh();

    } catch (error) {
      console.error("Delete error:", error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de supprimer l'événement. " + error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loadingEvents) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {canCreateEvent && (
        <div className="mb-6 text-right">
          <Button
            onClick={() => navigate('/create-event')}
            className="gradient-gold text-background hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" /> Créer un nouvel événement
          </Button>
        </div>
      )}

      {userEvents && userEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => navigate(`/event/${event.id}`)}
              isUnlocked={true}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      ) : (
        <Card className="glass-effect border-primary/20">
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              Aucun événement créé
            </h3>
            <p className="text-muted-foreground mb-6">
              {canCreateEvent ? 'Créez votre premier événement pour le voir apparaître ici.' : 'Vous n\'avez pas encore créé d\'événement.'}
            </p>
            {canCreateEvent && (
              <Button
                onClick={() => navigate('/create-event')}
                className="gradient-gold text-background hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" /> Créer un événement
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, event: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deleteConfirmation.event?.title}" ?<br/><br/>
              Cette action est irréversible et effacera toutes les données associées (billets, votes, statistiques).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); confirmDelete(); }} 
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyEventsTab;