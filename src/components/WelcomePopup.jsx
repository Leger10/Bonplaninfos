import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WelcomePopup = () => {
  const [popups, setPopups] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchPopups = async () => {
      const { data, error } = await supabase
        .from('welcome_popups')
        .select('image_url, alt_text')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching welcome popups:', error);
      } else if (data && data.length > 0) {
        setPopups(data);
        const hasSeenPopup = sessionStorage.getItem('hasSeenWelcomePopup');
        if (!hasSeenPopup) {
          setIsOpen(true);
          sessionStorage.setItem('hasSeenWelcomePopup', 'true');
        }
      }
    };

    fetchPopups();
  }, []);

  const nextPopup = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % popups.length);
  };

  const prevPopup = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + popups.length) % popups.length);
  };

  if (!isOpen || popups.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 border-0 max-w-md w-full bg-transparent shadow-none">
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={popups[currentIndex].image_url}
              alt={popups[currentIndex].alt_text}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg w-full h-auto object-contain"
            />
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70 hover:text-white rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          {popups.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 hover:text-white rounded-full"
                onClick={prevPopup}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 hover:text-white rounded-full"
                onClick={nextPopup}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {popups.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      currentIndex === index ? 'bg-white scale-125' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;