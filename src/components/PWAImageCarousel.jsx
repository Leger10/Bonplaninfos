import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PWAImageCarousel = ({ 
  images = [], 
  height = 400, 
  speed = 2000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [validImages, setValidImages] = useState(images);

  useEffect(() => {
    console.log(`[PWA] PWAImageCarousel mounted with ${images.length} images`);
    setValidImages(images);
  }, [images]);

  const nextSlide = useCallback(() => {
    if (validImages.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prevIndex) => {
      const nextIdx = prevIndex === validImages.length - 1 ? 0 : prevIndex + 1;
      return nextIdx;
    });
  }, [validImages.length]);

  const goToSlide = (index) => {
    console.log(`[PWA] Carousel manual navigation to index ${index}`);
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (validImages.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      nextSlide();
    }, speed);

    return () => clearInterval(timer);
  }, [validImages.length, speed, nextSlide, isHovered]);

  const handleImageError = (e, index) => {
    console.warn(`[PWA] Error loading image at index ${index}: ${e.target.src}, falling back to logo`);
    e.target.src = '/logo.svg';
    e.target.className = e.target.className + ' object-contain p-4'; // Adjust sizing for logo fallback
  };

  if (!validImages || validImages.length === 0) {
    return null;
  }

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  return (
    <div 
      className="relative w-full p-2 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="relative w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800"
        style={{ height: `${height}px` }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={currentIndex}
            src={validImages[currentIndex]}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="absolute top-0 left-0 w-full h-full object-cover rounded-xl shadow-lg"
            alt={`Aperçu BonPlanInfos ${currentIndex + 1}`}
            loading="lazy"
            onError={(e) => handleImageError(e, currentIndex)}
            onLoad={() => console.log(`[PWA] Image ${currentIndex} loaded successfully`)}
          />
        </AnimatePresence>

        {/* Navigation Dots */}
        {validImages.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 z-10">
            {validImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 ease-in-out rounded-full shadow-md focus:outline-none ${
                  currentIndex === index 
                    ? 'w-8 h-3 bg-blue-600 dark:bg-blue-500' 
                    : 'w-3 h-3 bg-white/70 hover:bg-white dark:bg-gray-400/70 dark:hover:bg-gray-200'
                }`}
                aria-label={`Aller à l'image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAImageCarousel;