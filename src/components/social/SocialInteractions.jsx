import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Eye, Heart, MessageSquare, Share2, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const SocialInteractions = ({ event, isUnlocked, handleShare }) => {
  const { user } = useAuth();
  const { userProfile, forceRefreshUserProfile } = useData();
  const [interactions, setInteractions] = useState({
    views: event.views_count || 0,
    likes: 0,
    comments: 0,
    shares: 0,
  });
  const [userInteractions, setUserInteractions] = useState({
    liked: false,
  });
  const [commentsList, setCommentsList] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState({ like: false, comment: false, action: null });
  const [deleteId, setDeleteId] = useState(null);

  // Only Organizer and Super Admin can delete comments
  const isOrganizer = user && event.organizer_id === user.id;
  const isSuperAdmin = userProfile?.user_type === 'super_admin';
  const canDelete = isOrganizer || isSuperAdmin;

  // Determine if event is protected
  const isProtectedEvent = event.event_type === 'protected';

  useEffect(() => {
    const fetchInteractions = async () => {
      if (!event?.id) return;

      // Fetch Likes
      const { count: likesCount, error: likesError } = await supabase
        .from('user_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('interaction_type', 'like');
      
      // Fetch ALL Comments (No approval filtering)
      const { data: commentsData, error: commentsError } = await supabase
        .from('event_comments')
        .select('*, user:profiles(full_name, avatar_url, username)')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (likesError || commentsError) {
        console.error('Error fetching interactions:', likesError || commentsError);
      } else {
        setInteractions(prev => ({
          ...prev,
          likes: likesCount || 0,
          comments: commentsData?.length || 0,
        }));
        setCommentsList(commentsData || []);
      }

      if (user) {
        const { data: userLike, error: userLikeError } = await supabase
          .from('user_interactions')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .eq('interaction_type', 'like')
          .maybeSingle();
        
        if (!userLikeError) {
          setUserInteractions(prev => ({ ...prev, liked: !!userLike }));
        }
      }
    };

    fetchInteractions();
  }, [event.id, user]);

  const handleLikeInteraction = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Vous devez être connecté pour aimer.", variant: "destructive" });
      return;
    }
    // If it's a protected event and locked, prevent interaction
    if (!isUnlocked && isProtectedEvent) {
      toast({ title: "Contenu verrouillé", description: "Débloquez l'événement pour interagir.", variant: "destructive" });
      return;
    }

    setLoading(prev => ({ ...prev, like: true }));

    try {
      const { data, error } = await supabase.rpc('protected_event_interaction', {
        p_event_id: event.id,
        p_user_id: user.id,
        p_interaction_type: 'like',
      });

      if (error) throw error;

      if (data.success) {
        const isLiked = data.message.includes('retirée');
        setInteractions(prev => ({ ...prev, likes: isLiked ? Math.max(0, prev.likes - 1) : prev.likes + 1 }));
        setUserInteractions(prev => ({ ...prev, liked: !isLiked }));
        forceRefreshUserProfile();
      } else {
        toast({ title: "Erreur", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, like: false }));
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    if (!user) {
      toast({ title: "Connexion requise", description: "Vous devez être connecté pour commenter.", variant: "destructive" });
      return;
    }

    // Allow organizers/admins to comment even if locked, otherwise check lock
    if (!isUnlocked && isProtectedEvent && !canDelete) {
      toast({ title: "Contenu verrouillé", description: "Débloquez l'événement pour commenter.", variant: "destructive" });
      return;
    }

    setLoading(prev => ({ ...prev, comment: true }));

    try {
      const { data, error } = await supabase
        .from('event_comments')
        .insert({
          event_id: event.id,
          user_id: user.id,
          comment_text: newComment.trim(),
          is_approved: true, // Always visible immediately
          rating: 5
        })
        .select('*, user:profiles(full_name, avatar_url, username)')
        .single();

      if (error) throw error;

      if (data) {
        setCommentsList(prev => [data, ...prev]);
        setInteractions(prev => ({ ...prev, comments: prev.comments + 1 }));
        
        toast({ title: "Succès", description: "Commentaire ajouté !" });
        setNewComment('');
        forceRefreshUserProfile();
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible d'ajouter le commentaire.", variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, comment: false }));
    }
  };

  const confirmDeleteComment = async () => {
    if (!deleteId) return;
    
    setLoading(prev => ({ ...prev, action: deleteId }));
    console.log("Action: Suppression du commentaire par l'utilisateur role:", userProfile?.user_type);

    try {
      const { error } = await supabase
        .from('event_comments')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setCommentsList(prev => prev.filter(c => c.id !== deleteId));
      setInteractions(prev => ({ ...prev, comments: Math.max(0, prev.comments - 1) }));
      toast({ title: "Succès", description: "Commentaire supprimé" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer le commentaire.", variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, action: null }));
      setDeleteId(null);
    }
  };

  return (
    <div className="flex items-center justify-around">
      {/* Views Count */}
      <div className="text-center">
        <Button variant="ghost" className="flex items-center space-x-2 text-muted-foreground cursor-default hover:bg-transparent">
          <Eye className="w-5 h-5" />
          <span>{interactions.views}</span>
        </Button>
      </div>

      {/* Like Button */}
      <div className="text-center">
        <Button 
          variant="ghost" 
          onClick={handleLikeInteraction} 
          disabled={loading.like} 
          className={`flex items-center space-x-2 transition-colors ${userInteractions.liked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-primary'}`}
        >
          {loading.like ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className={`w-5 h-5 ${userInteractions.liked ? 'fill-current' : ''}`} />}
          <span>{interactions.likes}</span>
        </Button>
      </div>

      {/* Comments Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <div className="text-center">
            <Button variant="ghost" className="flex items-center space-x-2 text-muted-foreground hover:text-primary">
              <MessageSquare className="w-5 h-5" />
              <span>{interactions.comments}</span>
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Commentaires {commentsList.length > 0 && `(${commentsList.length})`}</DialogTitle>
            <DialogDescription className="hidden">Espace de discussion</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[300px] pr-4 mt-2">
            {commentsList.length > 0 ? (
              <div className="space-y-4">
                {commentsList.map(comment => (
                  <div key={comment.id} className="p-3 rounded-lg bg-muted/50 group relative">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {comment.user?.full_name?.charAt(0) || comment.user?.username?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate">
                            {comment.user?.full_name || comment.user?.username || 'Anonyme'}
                          </p>
                          {/* Delete button visible only to organizer/super_admin */}
                          {canDelete && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                              onClick={() => setDeleteId(comment.id)}
                              disabled={loading.action === comment.id}
                            >
                              {loading.action === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-foreground mt-1 break-words pr-6">{comment.comment_text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                <p>Aucun commentaire pour le moment.</p>
                <p className="text-sm opacity-70">Soyez le premier à donner votre avis !</p>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <form onSubmit={handleCommentSubmit} className="w-full flex items-center space-x-2">
              <Textarea 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
                placeholder="Ajouter un commentaire..." 
                className="flex-grow min-h-[40px] max-h-[100px]" 
                rows={1}
              />
              <Button type="submit" disabled={loading.comment} className="shrink-0">
                {loading.comment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce commentaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteComment} className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Button */}
      <div className="text-center">
        <Button variant="ghost" onClick={handleShare} className="flex items-center space-x-2 text-muted-foreground hover:text-primary">
          <Share2 className="w-5 h-5" />
          <span>{interactions.shares}</span>
        </Button>
      </div>
    </div>
  );
};

export default SocialInteractions;