import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, CheckCircle, Play } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import confetti from 'canvas-confetti';

const VideoPlayerModal = ({ isOpen, onClose, video, onWatched }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { forceRefreshUserProfile } = useData();
  const [isWatching, setIsWatching] = useState(false);
  const [isCrediting, setIsCrediting] = useState(false);
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const successSoundRef = useRef(null);

  // Précharger le son
  useEffect(() => {
    if (typeof window !== 'undefined') {
      successSoundRef.current = new Audio('/sounds/success.mp3');
      successSoundRef.current.volume = 0.5;
    }
  }, []);

  const getYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const isYouTube = video?.video_url?.includes('youtube.com') || video?.video_url?.includes('youtu.be');
  const videoId = isYouTube ? getYouTubeId(video.video_url) : null;
  const embedUrl = isYouTube ? `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1` : video?.video_url;

  useEffect(() => {
    if (!isOpen) {
      setIsWatching(false);
      setWatched(false);
      setIsCrediting(false);
      setLoading(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isOpen]);

  const playSuccessEffects = () => {
    // Jouer le son
    if (successSoundRef.current) {
      successSoundRef.current.play().catch(e => console.warn('Audio play failed:', e));
    }
    // Lancer des confettis
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      startVelocity: 20,
      colors: ['#ffd700', '#ffa500', '#ff6600', '#ffff00', '#ffcc00']
    });
    // Ajouter une deuxième salve
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6, x: 0.3 },
        startVelocity: 25,
      });
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6, x: 0.7 },
        startVelocity: 25,
      });
    }, 200);
  };

  const handleVideoEnd = async () => {
    if (watched) return;
    setWatched(true);
    setIsCrediting(true);

    try {
      const { data, error } = await supabase.rpc('credit_user_for_video', {
        p_user_id: user.id,
        p_video_id: video.id,
        p_reward_coins: video.reward_coins
      });
      if (error) throw error;
      if (data.success) {
        toast({
          title: '🎉 Félicitations !',
          description: `Vous avez gagné ${video.reward_coins} pièces.`,
          variant: 'success',
          className: 'bg-green-600 text-white',
        });
        await forceRefreshUserProfile();
        onWatched?.();
        // Déclencher effets
        playSuccessEffects();
      } else {
        throw new Error(data.message || 'Erreur lors du crédit');
      }
    } catch (err) {
      console.error('Error crediting user:', err);
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de vous créditer. Contactez le support.',
        variant: 'destructive',
      });
    } finally {
      setIsCrediting(false);
    }
  };

  const handleStartWatching = () => {
    setIsWatching(true);
    if (isYouTube) {
      setLoading(true);
    } else {
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.error('Play failed:', err);
          toast({
            title: 'Erreur',
            description: 'Impossible de lire la vidéo.',
            variant: 'destructive',
          });
        });
      }
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  useEffect(() => {
    if (!isWatching || !isYouTube || watched) return;
    const duration = video?.video_duration || 60;
    const timer = setTimeout(() => {
      handleVideoEnd();
    }, duration * 1000);
    return () => clearTimeout(timer);
  }, [isWatching, isYouTube, video, watched]);

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <div className="relative">
          {!isWatching ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Play className="w-12 h-12 text-primary" />
              </div>
              <DialogTitle className="text-2xl mb-2">{video.title}</DialogTitle>
              <DialogDescription className="mb-6">{video.description}</DialogDescription>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Coins className="w-4 h-4" />
                <span>Regardez la vidéo pour gagner {video.reward_coins} pièces</span>
              </div>
              <Button onClick={handleStartWatching} className="gap-2">
                <Play className="w-4 h-4" />
                Regarder la vidéo
              </Button>
            </div>
          ) : (
            <div className="relative">
              {isYouTube ? (
                <>
                  {loading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                      <span className="ml-2 text-white">Chargement de la vidéo...</span>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src={embedUrl}
                    className="w-full aspect-video"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                  />
                </>
              ) : (
                <video
                  ref={videoRef}
                  src={video.video_url}
                  className="w-full aspect-video"
                  controls
                  onEnded={handleVideoEnd}
                  autoPlay
                />
              )}
              {isCrediting && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                  <span className="ml-2 text-white">Crédit en cours...</span>
                </div>
              )}
              {watched && !isCrediting && (
                <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                  <div className="text-center text-white">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-lg font-bold">Félicitations !</p>
                    <p>Vous avez reçu vos pièces.</p>
                    <Button
                      variant="outline"
                      className="mt-4 bg-white text-green-700"
                      onClick={onClose}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayerModal;