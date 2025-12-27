import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Send, Loader2, Copy, Twitter, Facebook, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SocialInteractions = ({ event, onInteraction, variant = 'horizontal' }) => {
  const { user } = useAuth();
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [loadingCommentsList, setLoadingCommentsList] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (event) {
      fetchInteractionCounts();
      if (user) checkUserLike();
    }
  }, [event, user]);

  const fetchInteractionCounts = async () => {
    if (!event?.id) return;
    
    const { count: likes } = await supabase
      .from('user_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('interaction_type', 'like');
    
    const { count: comments } = await supabase
      .from('event_comments')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id);

    setLikesCount(likes || 0);
    setCommentsCount(comments || 0);
  };

  const checkUserLike = async () => {
    if (!event?.id || !user?.id) return;
    
    const { data } = await supabase
      .from('user_interactions')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .eq('interaction_type', 'like')
      .maybeSingle();
    
    setIsLiked(!!data);
  };

  const fetchComments = async () => {
    if (!event?.id) return;
    setLoadingCommentsList(true);
    const { data, error } = await supabase
      .from('event_comments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) setComments(data);
    setLoadingCommentsList(false);
  };

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour aimer cet événement.", variant: "destructive" });
      return;
    }

    setLoadingLike(true);
    try {
      if (isLiked) {
        await supabase.from('user_interactions').delete().eq('event_id', event.id).eq('user_id', user.id).eq('interaction_type', 'like');
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase.rpc('protected_event_interaction', {
            p_event_id: event.id, p_user_id: user.id, p_interaction_type: 'like'
        });
        if (error) throw error;
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
      if (onInteraction) onInteraction();
    } catch (error) {
      toast({ title: "Erreur", description: "Action impossible.", variant: "destructive" });
    } finally {
      setLoadingLike(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    setLoadingComment(true);
    try {
      await supabase.from('event_comments').insert({
          event_id: event.id, user_id: user.id, comment_text: newComment.trim(), is_approved: true
      });
      setNewComment("");
      setCommentsCount(prev => prev + 1);
      fetchComments();
      toast({ title: "Envoyé", description: "Commentaire publié.", variant: "success" });
      if (onInteraction) onInteraction();
    } catch (error) {
      toast({ title: "Erreur", description: "Erreur d'envoi.", variant: "destructive" });
    } finally {
      setLoadingComment(false);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: event.title,
      text: `Découvrez cet événement : ${event.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        // Track share
        if (user) supabase.from('event_shares').insert({ event_id: event.id, user_id: user.id, share_platform: 'native' });
      } catch (err) {
        setShareOpen(true); // Fallback to modal if native share is cancelled/fails
      }
    } else {
      setShareOpen(true); // Fallback to modal
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Lien copié", description: "URL copiée dans le presse-papier." });
    setShareOpen(false);
  };

  const shareToSocial = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Découvrez cet événement : ${event.title}`);
    let shareUrl = '';

    switch (platform) {
      case 'whatsapp': shareUrl = `https://wa.me/?text=${text}%20${url}`; break;
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`; break;
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`; break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
      if (user) supabase.from('event_shares').insert({ event_id: event.id, user_id: user.id, share_platform: platform });
    }
    setShareOpen(false);
  };

  // Styles based on variant
  const containerClass = variant === 'vertical' 
    ? "flex flex-col gap-4 items-center" 
    : "flex items-center justify-between py-2 border-t border-b bg-card/50 px-4 rounded-lg";

  const buttonClass = (active) => cn(
    "flex items-center justify-center transition-all",
    variant === 'vertical' 
      ? `w-12 h-12 rounded-full shadow-lg backdrop-blur-md ${active ? 'bg-white text-red-500' : 'bg-black/40 text-white hover:bg-black/60'}`
      : "gap-2 variant-ghost size-sm"
  );

  const iconSize = variant === 'vertical' ? "w-6 h-6" : "w-5 h-5";
  const textSize = variant === 'vertical' ? "text-xs font-bold text-white drop-shadow-md mt-1" : "text-sm font-medium";

  const VerticalButton = ({ icon: Icon, label, count, active, onClick, loading }) => (
    <div className="flex flex-col items-center">
      <button 
        onClick={onClick}
        disabled={loading}
        className={buttonClass(active)}
      >
        {loading ? <Loader2 className={`${iconSize} animate-spin`} /> : <Icon className={`${iconSize} ${active ? 'fill-current' : ''}`} />}
      </button>
      <span className={textSize}>{count}</span>
    </div>
  );

  if (!event) return null;

  return (
    <>
      <div className={containerClass}>
        {/* Like */}
        {variant === 'vertical' ? (
          <VerticalButton icon={Heart} label="J'aime" count={likesCount} active={isLiked} onClick={handleLike} loading={loadingLike} />
        ) : (
          <Button variant="ghost" size="sm" className={cn("flex gap-2", isLiked ? 'text-red-500' : 'text-muted-foreground')} onClick={handleLike}>
            <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
            <span>{likesCount || "J'aime"}</span>
          </Button>
        )}

        {/* Comment */}
        <Dialog onOpenChange={(open) => { if(open) fetchComments(); }}>
          <DialogTrigger asChild>
            {variant === 'vertical' ? (
              <div className="flex flex-col items-center cursor-pointer">
                <div className={buttonClass(false)}>
                  <MessageCircle className={iconSize} />
                </div>
                <span className={textSize}>{commentsCount}</span>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="flex gap-2 text-muted-foreground">
                <MessageCircle className="w-5 h-5" />
                <span>{commentsCount || "Commenter"}</span>
              </Button>
            )}
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>Commentaires ({commentsCount})</DialogTitle></DialogHeader>
            <ScrollArea className="flex-1 pr-4 -mr-4">
              {loadingCommentsList ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><p>Aucun commentaire.</p></div>
              ) : (
                <div className="space-y-4 py-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8"><AvatarImage src={comment.profiles?.avatar_url} /><AvatarFallback>U</AvatarFallback></Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between"><span className="font-semibold">{comment.profiles?.full_name}</span><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}</span></div>
                        <p className="text-sm bg-muted/50 p-2 rounded-lg">{comment.comment_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Textarea placeholder="Votre commentaire..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="min-h-[40px] resize-none" />
              <Button size="icon" onClick={handlePostComment} disabled={loadingComment || !newComment.trim()}>{loadingComment ? <Loader2 className="animate-spin" /> : <Send />}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share */}
        {variant === 'vertical' ? (
          <VerticalButton icon={Share2} label="Partager" count="Partager" active={false} onClick={handleNativeShare} />
        ) : (
          <Button variant="ghost" size="sm" className="flex gap-2 text-muted-foreground" onClick={handleNativeShare}>
            <Share2 className="w-5 h-5" />
            <span>Partager</span>
          </Button>
        )}
      </div>

      {/* Share Modal Fallback */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Partager cet événement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={() => shareToSocial('whatsapp')}>
              <MessageCircle className="w-8 h-8" /> WhatsApp
            </Button>
            <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={() => shareToSocial('facebook')}>
              <Facebook className="w-8 h-8" /> Facebook
            </Button>
            <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-slate-50 hover:text-black hover:border-slate-300" onClick={() => shareToSocial('twitter')}>
              <Twitter className="w-8 h-8" /> X (Twitter)
            </Button>
            <Button variant="outline" className="flex flex-col h-20 gap-2" onClick={copyLink}>
              <Copy className="w-8 h-8" /> Copier le lien
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SocialInteractions;