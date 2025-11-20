import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePartnerBadges } from '@/hooks/usePartnerBadges';
import { Loader2, Pause, Play } from 'lucide-react';

const getBadgeStyle = (licenseType) => {
  const styles = {
    starter: {
      circleBg: 'bg-gradient-to-br from-gray-500 to-gray-700',
      borderColor: 'border-gray-400',
      textColor: 'text-gray-700',
      icon: '🏙️',
      title: 'Ambassadeur Ville'
    },
    business: {
      circleBg: 'bg-gradient-to-br from-green-500 to-green-700',
      borderColor: 'border-green-400',
      textColor: 'text-green-700',
      icon: '🌍',
      title: 'Ambassadeur Régional'
    },
    premium: {
      circleBg: 'bg-gradient-to-br from-amber-500 to-amber-700',
      borderColor: 'border-amber-400',
      textColor: 'text-amber-700',
      icon: '🏆',
      title: 'Ambassadeur National'
    },
  };
  return styles[licenseType] || styles.starter;
};

const AnimatedBadgesBanner = () => {
  const { activeBadges, loading } = usePartnerBadges();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4); // Nombre de cercles visibles

  // Ajuster le nombre de cercles visibles selon la largeur de l'écran
  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth < 640) setVisibleCount(2); // mobile
      else if (window.innerWidth < 1024) setVisibleCount(3); // tablette
      else setVisibleCount(4); // desktop
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  // Défilement automatique
  useEffect(() => {
    if (activeBadges.length <= visibleCount || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex >= activeBadges.length - visibleCount + 1 ? 0 : nextIndex;
      });
    }, 3000); // Défilement plus rapide pour les cercles

    return () => clearInterval(interval);
  }, [activeBadges.length, visibleCount, isPaused]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 text-center border-b">
        <Loader2 className="w-5 h-5 animate-spin inline-block text-muted-foreground" />
      </div>
    );
  }

  if (activeBadges.length === 0) return null;

  const visibleBadges = activeBadges.slice(currentIndex, currentIndex + visibleCount);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b shadow-sm">
      <div className="container mx-auto px-4">
        {/* En-tête */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-1">
            Nos Partenaires Certifiés
          </h2>
          <p className="text-sm text-gray-600">
            Découvrez notre réseau d'ambassadeurs
          </p>
        </div>

        {/* Conteneur des cercles avec contrôles */}
        <div className="relative">
          <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8">
            {/* Bouton précédent */}
            {activeBadges.length > visibleCount && (
              <button
                onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : activeBadges.length - visibleCount)}
                className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow z-10"
                aria-label="Partenaire précédent"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Cercles des partenaires */}
            <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8 flex-1">
              <AnimatePresence mode="popLayout">
                {visibleBadges.map((badge, index) => {
                  const badgeConfig = getBadgeStyle(badge.license_type);
                  const globalIndex = currentIndex + index;

                  return (
                    <motion.div
                      key={`${badge.id}-${globalIndex}`}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex flex-col items-center text-center group"
                    >
                      {/* Cercle avec pays */}
                      <div className="relative">
                        <div className={`
                          w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 
                          rounded-full border-2 ${badgeConfig.borderColor}
                          ${badgeConfig.circleBg}
                          flex items-center justify-center
                          shadow-lg group-hover:shadow-xl
                          transition-all duration-300
                          group-hover:scale-110
                        `}>
                          <span className="text-xl md:text-2xl lg:text-3xl">
                            {badgeConfig.icon}
                          </span>

                          {/* Petit cercle pays en haut à droite */}
                          <div className="absolute -top-1 -right-1">
                            <div className="bg-red-500 rounded-full w-5 h-5 md:w-6 md:h-6 border-2 border-white flex items-center justify-center">
                              <span className="text-[8px] md:text-[10px] font-bold text-white">
                                {badge.country ? badge.country.slice(0, 2).toUpperCase() : 'PA'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Badge de statut actif */}
                        <div className="absolute -bottom-1 -left-1">
                          <div className="bg-green-500 rounded-full w-4 h-4 border-2 border-white flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Nom du partenaire */}
                      <div className="mt-3 max-w-[80px] md:max-w-[100px] lg:max-w-[120px]">
                        <p className="text-xs md:text-sm font-semibold text-gray-800 truncate">
                          {badge.partner_name}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-600 mt-1">
                          {badgeConfig.title}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Bouton suivant */}
            {activeBadges.length > visibleCount && (
              <button
                onClick={() => setCurrentIndex(prev =>
                  prev < activeBadges.length - visibleCount ? prev + 1 : 0
                )}
                className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow z-10"
                aria-label="Partenaire suivant"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Contrôles de défilement automatique */}
          {activeBadges.length > visibleCount && (
            <div className="flex items-center justify-center mt-4 gap-2">
              {/* Indicateurs de position */}
              <div className="flex items-center space-x-1.5">
                {Array.from({ length: Math.ceil(activeBadges.length / visibleCount) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index * visibleCount)}
                    className={`w-2 h-2 rounded-full transition-all ${Math.floor(currentIndex / visibleCount) === index
                        ? 'bg-blue-600 scale-125'
                        : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    aria-label={`Go to group ${index + 1}`}
                  />
                ))}
              </div>

              {/* Bouton play/pause */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="ml-2 p-1.5 bg-white rounded-full shadow hover:shadow-md transition-all"
                aria-label={isPaused ? 'Play' : 'Pause'}
              >
                {isPaused ? (
                  <Play className="w-3 h-3 text-gray-600" />
                ) : (
                  <Pause className="w-3 h-3 text-gray-600" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Indicateur du nombre total de partenaires */}
        <div className="text-center mt-3">
          <p className="text-xs text-gray-500">
            {activeBadges.length} partenaire{activeBadges.length > 1 ? 's' : ''} actif{activeBadges.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnimatedBadgesBanner;