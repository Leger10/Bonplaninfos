import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Eye, Heart, MessageSquare, Share2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';

const SocialInteractions = ({ event, isUnlocked, handleShare }) => {
  const { user } = useAuth();
  const { forceRefreshUserProfile } = useData();
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
  const [loading, setLoading] = useState({ like: false, comment: false });

  useEffect(() => {
    const fetchInteractions = async () => {
      const { data: likesData, error: likesError } = await supabase
        .from('user_interactions')
        .select('*', { count: 'exact' })
        .eq('event_id', event.id)
        .eq('interaction_type', 'like');
      
      const { data: commentsData, error: commentsError } = await supabase
        .from('event_comments')
        .select('*, user:profiles(full_name, avatar_url)', { count: 'exact' })
        .eq('event_id', event.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (likesError || commentsError) {
        console.error('Error fetching interactions:', likesError || commentsError);
      } else {
        setInteractions(prev => ({
          ...prev,
          likes: likesData.length,
          comments: commentsData.length,
        }));
        setCommentsList(commentsData);
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

    if (event.id) {
      fetchInteractions();
    }
  }, [event.id, user]);

  const handleInteraction = async (type) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Vous devez être connecté pour interagir.", variant: "destructive" });
      return;
    }
    if (!isUnlocked && event.event_type === 'protected') {
      toast({ title: "Contenu verrouillé", description: "Débloquez l'événement pour interagir.", variant: "destructive" });
      return;
    }

    setLoading(prev => ({ ...prev, [type]: true }));

    try {
      const { data, error } = await supabase.rpc('protected_event_interaction', {
        p_event_id: event.id,
        p_user_id: user.id,
        p_interaction_type: type,
      });

      if (error) throw error;

      if (data.success) {
        if (type === 'like') {
          const isLiked = data.message.includes('retirée');
          setInteractions(prev => ({ ...prev, likes: isLiked ? prev.likes - 1 : prev.likes + 1 }));
          setUserInteractions(prev => ({ ...prev, liked: !isLiked }));
        }
        forceRefreshUserProfile();
      } else {
        toast({ title: "Erreur", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      toast({ title: "Connexion requise", description: "Vous devez être connecté pour commenter.", variant: "destructive" });
      return;
    }
    if (!isUnlocked && event.event_type === 'protected') {
      toast({ title: "Contenu verrouillé", description: "Débloquez l'événement pour commenter.", variant: "destructive" });
      return;
    }

    setLoading(prev => ({ ...prev, comment: true }));

    try {
      const { data, error } = await supabase.rpc('protected_event_interaction', {
        p_event_id: event.id,
        p_user_id: user.id,
        p_interaction_type: 'comment',
        p_comment_text: newComment,
      });

      if (error) throw error;

      if (data.success) {
        toast({ title: "Commentaire ajouté", description: "Votre commentaire est en attente d'approbation." });
        setNewComment('');
        forceRefreshUserProfile();
      } else {
        toast({ title: "Erreur", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, comment: false }));
    }
  };

  return (
    <div className="flex items-center justify-around">
      <div className="text-center">
        <Button variant="ghost" className="flex items-center space-x-2 text-muted-foreground">
          <Eye className="w-5 h-5" />
          <span>{interactions.views}</span>
        </Button>
      </div>
      <div className="text-center">
        <Button variant="ghost" onClick={() => handleInteraction('like')} disabled={loading.like} className={`flex items-center space-x-2 ${userInteractions.liked ? 'text-red-500' : 'text-muted-foreground'}`}>
          {loading.like ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className={`w-5 h-5 ${userInteractions.liked ? 'fill-current' : ''}`} />}
          <span>{interactions.likes}</span>
        </Button>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <div className="text-center">
            <Button variant="ghost" className="flex items-center space-x-2 text-muted-foreground">
              <MessageSquare className="w-5 h-5" />
              <span>{interactions.comments}</span>
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commentaires</DialogTitle>
            <DialogDescription>
              {commentsList.length > 0 ? (
                <div className="max-h-64 overflow-y-auto mt-4 space-y-4">
                  {commentsList.map(comment => (
                    <div key={comment.id} className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">{comment.user?.full_name?.charAt(0) || 'U'}</div>
                      <div>
                        <p className="font-semibold">{comment.user?.full_name || 'Anonyme'}</p>
                        <p className="text-sm text-muted-foreground">{comment.comment_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground mt-4">Aucun commentaire pour le moment.</p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <form onSubmit={handleCommentSubmit} className="w-full flex items-center space-x-2">
              <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire..." className="flex-grow" />
              <Button type="submit" disabled={loading.comment}>
                {loading.comment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="text-center">
        <Button variant="ghost" onClick={handleShare} className="flex items-center space-x-2 text-muted-foreground">
          <Share2 className="w-5 h-5" />
          <span>{interactions.shares}</span>
        </Button>
      </div>
    </div>
  );
};

export default SocialInteractions;