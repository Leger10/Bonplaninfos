import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
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

/**
 * Gère l'affichage et la suppression des événements créés par l'utilisateur connecté.
 * Seul l'organisateur propriétaire peut supprimer ses propres événements.
 */

const MyEventsTab = ({ userProfile, userEvents, loadingEvents, onRefresh }) => {
  const navigate = useNavigate();
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, event: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreateEvent = userProfile && ['organizer', 'admin', 'secretary', 'super_admin'].includes(userProfile.user_type);

  const handleDeleteClick = (event) => {
    // Vérification : seul le créateur de l'événement peut initier la suppression
    if (userProfile?.user_type === 'organizer' && event.organizer_id === userProfile.id) {
      setDeleteConfirmation({ isOpen: true, event });
    } else {
      toast({
        title: "Action non autorisée",
        description: "Seul le créateur de l'événement est autorisé à le supprimer.",
        variant: "destructive"
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.event || !userProfile?.id) return;

    const event = deleteConfirmation.event;
    setIsDeleting(true);

    try {
      // 1. Suppression de l'image de couverture si présente
      if (event.cover_image) {
        const storageInfo = extractStoragePath(event.cover_image);
        if (storageInfo) {
          await supabase.storage
            .from(storageInfo.bucket)
            .remove([storageInfo.path]);
        }
      }

      // 2. Appel de la fonction RPC sécurisée pour suppression complète
      const { data: result, error: dbError } = await supabase.rpc('delete_event_completely', {
        p_event_id: event.id
      });

      if (dbError) throw dbError;
      if (!result.success) throw new Error(result.message);

      // 3. Vérification finale que l'événement a bien disparu
      const { data: checkData, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('id', event.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (checkData) throw new Error("L'événement existe toujours après la suppression.");

      // 4. Notification de succès avec les détails
      toast({
        title: "Événement supprimé",
        description: `"${event.title}" a été supprimé. Votes : ${result.counts?.votes_deleted || 0}, billets : ${result.counts?.tickets_deleted || 0}.`,
        className: "bg-green-600 text-white border-green-700"
      });

      setDeleteConfirmation({ isOpen: false, event: null });
      if (onRefresh) onRefresh();

    } catch (error) {
      toast({
        title: "Échec de la suppression",
        description: error.message || "Une erreur est survenue.",
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
          {userEvents.map((event) => {
            const canDeleteThisEvent = userProfile?.user_type === 'organizer' && event.organizer_id === userProfile.id;
            return (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/event/${event.id}`)}
                isUnlocked={true}
                onDelete={canDeleteThisEvent ? handleDeleteClick : undefined}
              />
            );
          })}
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
        <AlertDialogContent className="border-red-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Suppression définitive
            </AlertDialogTitle>
            <AlertDialogDescription>
              En tant que créateur, êtes-vous sûr de vouloir supprimer "{deleteConfirmation.event?.title}" ?<br/><br/>
              Cette action est <strong>irréversible</strong>. Elle effacera l'événement ainsi que tous les votes, billets et candidats associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
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