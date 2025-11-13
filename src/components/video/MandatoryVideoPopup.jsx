import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import './MandatoryVideoPopup.css';

const MandatoryVideoPopup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showVideo, setShowVideo] = useState(false);
  const [videoData, setVideoData] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef(null);

  const checkMandatoryVideo = useCallback(async () => {
    if (!user) return;

    try {
      // This RPC call is now only for checking if there's a video to show,
      // but the logic to show it is commented out.
      // Admins will manage this from the dashboard.
      const { data, error } = await supabase.rpc('get_todays_mandatory_video', { user_uuid: user.id });

      if (error) {
        console.error('Error fetching mandatory video status:', error);
        return;
      }
      
      // The logic to automatically show the video is now disabled.
      // It can be re-enabled here if needed in the future.
      /*
      if (data.success && data.video) {
        setVideoData(data.video);
        setShowVideo(true);
      }
      */

    } catch (error) {
      console.error('Error in checkMandatoryVideo:', error);
    }
  }, [user]);

  useEffect(() => {
    if(user) {
        // The automatic check is disabled to prevent popups on login.
        // checkMandatoryVideo();
    }
  }, [user]);


  const handleVideoEnd = async () => {
    setShowRating(true);
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      const watchDuration = videoRef.current ? Math.floor(videoRef.current.currentTime) : videoData.video_duration;
      
      const { data, error } = await supabase.rpc('complete_mandatory_video', {
        user_uuid: user.id,
        video_uuid: videoData.id,
        watch_duration: watchDuration,
        device_data: { userAgent: navigator.userAgent }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "🎉 Récompense reçue !",
          description: data.message,
          className: "bg-green-500 text-white",
        });
        setShowRating(false);
        setShowVideo(false);
      } else {
        throw new Error(data.message);
      }

    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la soumission de votre avis.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingSelect = (selectedRating) => {
    setRating(selectedRating);
    if (selectedRating >= 4) {
      setFeedback('');
      setTimeout(() => handleRatingSubmit(), 500);
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={`star ${star <= rating ? 'filled' : ''}`}
        onClick={() => handleRatingSelect(star)}
        disabled={isSubmitting}
      >
        ⭐
      </button>
    ));
  };

  if (!showVideo || !videoData) return null;

  return (
    <AnimatePresence>
      {showVideo && (
        <motion.div 
          className="mandatory-video-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="mandatory-video-popup"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {!showRating ? (
              <>
                <div className="video-header">
                  <h2>{videoData.title}</h2>
                  <p>{videoData.description}</p>
                </div>
                
                <div className="video-container">
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    onEnded={handleVideoEnd}
                    src={videoData.video_url}
                    className="mandatory-video"
                  />
                </div>
                
                <div className="video-footer">
                  <p>
                    <strong>Attention:</strong> Vous devez regarder cette vidéo jusqu'à la fin 
                    pour recevoir votre récompense et accéder à toutes les fonctionnalités.
                  </p>
                </div>
              </>
            ) : (
              <div className="rating-container">
                <div className="rating-header">
                  <h2>Que pensez-vous de cette vidéo ?</h2>
                  <p>Votre avis nous aide à améliorer la plateforme</p>
                </div>
                
                <div className="stars-container">
                  {renderStars()}
                </div>
                
                {rating > 0 && rating <= 3 && (
                  <div className="feedback-container">
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Merci de nous expliquer ce qui n'a pas fonctionné pour vous..."
                      rows="3"
                      disabled={isSubmitting}
                      className="bg-slate-100"
                    />
                  </div>
                )}
                
                <div className="rating-actions">
                  <Button
                    onClick={handleRatingSubmit}
                    disabled={rating === 0 || isSubmitting || (rating <= 3 && !feedback.trim())}
                    className="submit-rating-btn"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Soumettre mon avis'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MandatoryVideoPopup;