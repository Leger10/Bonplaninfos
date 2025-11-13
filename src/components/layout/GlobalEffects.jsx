import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins } from 'lucide-react';
import { useData } from '@/contexts/DataContext';

const soundEffects = {
  gift: '/sounds/gift.mp3',
  coin: '/sounds/coin.mp3',
  celebration: '/sounds/celebration.mp3',
  default: '/sounds/notification.mp3',
  system: '/sounds/system.mp3',
  event: '/sounds/event_alert.mp3'
};

const playSound = (effect) => {
  const soundPath = soundEffects[effect] || soundEffects.default;
  try {
    const audio = new Audio(soundPath);
    audio.play().catch(error => console.warn("Audio play failed, likely due to browser policy:", error));
  } catch (error) {
    console.error("Could not create or play sound", error);
  }
};

const Bubble = ({ onComplete, id }) => {
  const duration = Math.random() * 2 + 3;
  const delay = Math.random() * 1;
  const size = Math.random() * 40 + 20;
  const xStart = Math.random() * 100;
  const xEnd = Math.random() * 100;

  return (
    <motion.div
      key={id}
      className="absolute bottom-0"
      style={{ left: `${xStart}%`, width: size, height: size }}
      initial={{ y: 0, opacity: 0.7 }}
      animate={{ y: '-100vh', x: `${xEnd - xStart}vw`, opacity: 0 }}
      transition={{ duration, delay, ease: "linear" }}
      onAnimationComplete={() => onComplete(id)}
    >
      <div className="w-full h-full rounded-full bg-primary/30 border-2 border-primary/50 flex items-center justify-center">
        <Coins className="w-1/2 h-1/2 text-primary/80" />
      </div>
    </motion.div>
  );
};


const GlobalEffects = () => {
  const { visualEffects, removeVisualEffect, soundEffect, clearSoundEffect } = useData();

  useEffect(() => {
    if (soundEffect) {
      playSound(soundEffect);
      clearSoundEffect();
    }
  }, [soundEffect, clearSoundEffect]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
        <AnimatePresence>
            {visualEffects.map(effect => {
                if (effect.type === 'bubbles') {
                return Array.from({ length: 15 }).map((_, i) => (
                    <Bubble key={`${effect.id}-${i}`} id={`${effect.id}-${i}`} onComplete={() => i === 0 && removeVisualEffect(effect.id)} />
                ));
                }
                return null;
            })}
        </AnimatePresence>
    </div>
  );
};

export default GlobalEffects;