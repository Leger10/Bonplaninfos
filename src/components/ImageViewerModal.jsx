import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ImageViewerModal = ({ imageUrl, altText, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] w-full"
          >
            <img
              className="w-full h-full object-contain rounded-lg shadow-2xl"
              src={imageUrl || "https://images.unsplash.com/photo-1573107571566-426fad25031b"}
              alt={altText}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute -top-2 -right-2 bg-background/50 hover:bg-background/80 rounded-full h-10 w-10 text-white"
            >
              <X className="h-6 w-6" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageViewerModal;