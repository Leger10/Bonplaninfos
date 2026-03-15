import { useCallback, useRef, useEffect } from 'react';

export const useNotificationSound = () => {
  const audioRef = useRef(null);

  // Initialiser l'élément audio une seule fois
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/success.mp3');
      audioRef.current.preload = 'auto';
      // Tente de charger en arrière-plan
      audioRef.current.load();
    }
  }, []);

  const playNotificationSound = useCallback((type = 'default') => {
    if (!audioRef.current) return;

    console.info(`[SoundHook] 🔊 Tentative de lecture du son pour le type: ${type}`);

    // Ajustement du volume selon le type
    switch (type) {
      case 'event': audioRef.current.volume = 0.8; break;
      case 'credit': audioRef.current.volume = 1.0; break;
      case 'purchase': audioRef.current.volume = 0.7; break;
      case 'admin': audioRef.current.volume = 0.6; break;
      default: audioRef.current.volume = 0.5;
    }

    // Joue le son et gère l'erreur d'autoplay
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => console.info(`[SoundHook] ✅ Son joué (type: ${type})`))
        .catch(error => {
          console.warn(`[SoundHook] ⚠️ Son bloqué (nécessite interaction utilisateur) :`, error.message);
          // Optionnel : stocker qu'un son a été manqué pour le jouer lors de la prochaine interaction
        });
    }
  }, []);

  return { playNotificationSound };
};