import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Heart, MessageCircle, Share2, Eye, Coins, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import WalletInfoModal from '@/components/WalletInfoModal';
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
import { CoinService } from '@/services/CoinService';
import PaymentModal from '@/components/PaymentModal';

const SocialInteractions = ({ event, isUnlocked }) => {
  const { user } = useAuth();
  const { userProfile, adminConfig, forceRefreshUserProfile } = useData();
  
  const [stats, setStats] = useState({ likes: 0, comments: 0, shares: 0, views: 0 });
  const [userInteractions, setUserInteractions] = useState({ liked: false });
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showWalletInfoModal, setShowWalletInfoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [confirmation, setConfirmation] = useState({ isOpen: false, type: '', cost: 0, costFcfa: 0, onConfirm: null });

  const isOwner = user && event.organizer_id === user.id;

  const loadStatsAndInteractions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_interactions')
      .select('interaction_type, user_id')
      .eq('event_id', event.id);

    if (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
      return;
    }

    if (data) {
      setStats({
        likes: data.filter(i => i.interaction_type === 'like').length,
        comments: data.filter(i => i.interaction_type === 'comment').length,
        shares: data.filter(i => i.interaction_type === 'share').length,
        views: event.views_count || 0
      });

      if (user) {
        setUserInteractions({
          liked: data.some(i => i.interaction_type === 'like' && i.user_id === user.id),
        });
      }
    }
    setLoading(false);
  }, [event.id, event.views_count, user]);

  const loadComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('id, created_at, comment_text, user:profiles(full_name, avatar_url)')
      .eq('event_id', event.id)
      .eq('interaction_type', 'comment')
      .order('created_at', { ascending: false });

    if (!error) {
      setCommentsList(data || []);
    }
  }, [event.id]);

  useEffect(() => {
    loadStatsAndInteractions();
    if (showComments) loadComments();
  }, [loadStatsAndInteractions, showComments, loadComments]);
  
  const triggerNativeShare = async () => {
    const shareData = {
      title: event.title,
      text: `Découvrez cet événement sur BonPlanInfos : ${event.title}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Lien copié !", description: "Le lien de l'événement a été copié dans votre presse-papiers." });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        toast({ title: "Erreur de partage", description: "Impossible de partager l'événement.", variant: "destructive" });
      }
    }
  };

  const handleInteraction = async (interactionType, commentText = null) => {
    if (!user) {
      toast({ title: "Connexion requise", variant: "destructive" });
      return;
    }

    if (interactionType === 'share') {
      await triggerNativeShare();
      // We also need to record the share interaction if it has a cost.
      const cost = (event.event_type === 'protected' && !isOwner) ? 2 : 0;
      if (cost > 0) {
        // Silently execute the interaction in the background after sharing
        executeInteraction(interactionType, null, cost, true);
      }
      return;
    }

    if (event.event_type === 'protected' && !isUnlocked && ['like', 'comment'].includes(interactionType)) {
      toast({ title: "Accès requis", description: "Veuillez d'abord débloquer l'événement pour interagir.", variant: "destructive" });
      return;
    }
    
    let cost = 0;
    if (event.event_type === 'protected' && !isOwner && ['like', 'comment'].includes(interactionType)) {
      cost = 2;
    }
    
    if (cost > 0 && !(interactionType === 'like' && userInteractions.liked)) {
        const costFcfa = cost * (adminConfig?.coin_to_fcfa_rate || 10);
        const actionLabels = { 'like': 'Aimer', 'comment': 'Commenter' };
        setConfirmation({
            isOpen: true,
            type: `${actionLabels[interactionType] || 'Interagir avec'} cet événement`,
            cost,
            costFcfa,
            onConfirm: () => executeInteraction(interactionType, commentText, cost),
        });
    } else {
        executeInteraction(interactionType, commentText, 0);
    }
  };

  const executeInteraction = async (interactionType, commentText, cost, isSilent = false) => {
    if (!isSilent) {
        setConfirmation({ isOpen: false, type: '', cost: 0, costFcfa: 0, onConfirm: null });
    }
    
    if (cost > 0) {
        const hasBalance = await CoinService.hasSufficientBalance(user.id, cost);
        if (!hasBalance) {
            if (!isSilent) setShowWalletInfoModal(true);
            return;
        }
    }

    setActionLoading(interactionType);
    try {
      const rpcParams = { 
        p_event_id: event.id, 
        p_user_id: user.id, 
        p_interaction_type: interactionType,
        p_comment_text: commentText
      };
      const { data: rpcData, error: rpcError } = await supabase.rpc('protected_event_interaction', rpcParams);
      
      if (rpcError) throw rpcError;
      if (!rpcData.success) throw new Error(rpcData.message);
      
      if (cost > 0) await forceRefreshUserProfile();
      await loadStatsAndInteractions();

      if (interactionType === 'comment') {
        setComment('');
        setShowComments(false);
        setShowComments(true);
      }
      
      if (!isSilent) {
          toast({ title: rpcData.message || "Action réussie!" });
      }
    } catch (error) {
        if (!isSilent) {
          toast({ title: "Erreur", description: error.message, variant: "destructive" });
        }
    } finally {
      setActionLoading(null);
    }
  };


  const getButtonClass = (isActive) => `flex items-center gap-2 p-2 rounded-lg transition-colors relative ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-muted/80'}`;

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-3 bg-card border border-border/50 rounded-lg shadow-sm">
          <div className="flex-1 text-center border-r border-border/50">
              <p className="font-bold text-lg">{(userProfile?.coin_balance || 0)}</p>
              <p className="text-xs text-muted-foreground">Pièces Payantes</p>
          </div>
          <div className="flex-1 text-center">
              <p className="font-bold text-lg">{(userProfile?.free_coin_balance || 0)}</p>
              <p className="text-xs text-muted-foreground">Pièces Bonus</p>
          </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className={getButtonClass(true)}><Eye size={20} /><span className="font-medium">{stats.views}</span></div>
        
        <Button variant="ghost" size="icon" onClick={() => handleInteraction('like')} className={getButtonClass(userInteractions.liked)} disabled={!user || actionLoading === 'like'}>
          {actionLoading === 'like' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart size={20} fill={userInteractions.liked ? 'currentColor' : 'none'} />}
        </Button>
        <span className="text-sm">{stats.likes}</span>

        <Button variant="ghost" size="icon" onClick={() => setShowComments(!showComments)} className={getButtonClass(showComments)} disabled={!user}>
          <MessageCircle size={20} />
        </Button>
        <span className="text-sm">{stats.comments}</span>

        <Button variant="ghost" size="icon" onClick={() => handleInteraction('share')} className={getButtonClass(false)} disabled={!user || actionLoading === 'share'}>
          {actionLoading === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 size={20} />}
        </Button>
        <span className="text-sm">{stats.shares}</span>
      </div>

      {showComments && (
        <div className="space-y-4 pt-4">
          <div className="flex gap-2">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ajouter un commentaire..." />
            <Button onClick={() => handleInteraction('comment', comment)} disabled={!comment.trim() || actionLoading === 'comment'}>
              {actionLoading === 'comment' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
            </Button>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {commentsList.map((c) => (
              <div key={c.id} className="p-3 bg-muted/50 rounded-lg">
                <p className="font-semibold text-sm">{c.user?.full_name || 'Utilisateur'}</p>
                <p className="text-sm">{c.comment_text}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <WalletInfoModal 
        isOpen={showWalletInfoModal} 
        onClose={() => setShowWalletInfoModal(false)}
      />
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
      <AlertDialog open={confirmation.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmation({ isOpen: false, type: '', cost: 0, costFcfa: 0, onConfirm: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation.type} ?</AlertDialogTitle>
            <AlertDialogDescription>
                <div className="flex flex-col items-center justify-center text-center p-4">
                    <Coins className="w-12 h-12 text-primary mb-4" />
                    <p className="text-lg">Cette action vous coûtera <strong className="text-foreground">{confirmation.cost}π</strong> ({confirmation.costFcfa?.toLocaleString('fr-FR')} FCFA).</p>
                    <div className="mt-4 text-xs text-muted-foreground p-2 bg-muted rounded flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Votre action permet aux organisateurs de créer plus de contenu. Vous pouvez aussi devenir organisateur en postant des contenus pour bénéficier de la rémunération sur BonPlanInfos.</span>
                    </div>
                </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmation.onConfirm}>Confirmer et Payer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SocialInteractions;