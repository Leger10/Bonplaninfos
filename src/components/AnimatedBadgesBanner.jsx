import React, { useState, useEffect } from 'react';
    import { motion, AnimatePresence } from 'framer-motion';
    import { usePartnerBadges } from '@/hooks/usePartnerBadges';
    import { Loader2, Pause, Play } from 'lucide-react';

    const getBadgeStyle = (licenseType) => {
      const styles = {
        starter: { bannerBg: 'bg-gradient-to-r from-gray-700 to-gray-900', icon: '🏙️', title: 'Ambassadeur Ville' },
        business: { bannerBg: 'bg-gradient-to-r from-green-700 to-green-900', icon: '🌍', title: 'Ambassadeur Régional' },
        premium: { bannerBg: 'bg-gradient-to-r from-amber-600 to-amber-800', icon: '🏆', title: 'Ambassadeur National' },
      };
      return styles[licenseType] || styles.starter;
    };

    const AnimatedBadgesBanner = () => {
      const { activeBadges, loading } = usePartnerBadges();
      const [currentIndex, setCurrentIndex] = useState(0);
      const [isPaused, setIsPaused] = useState(false);

      useEffect(() => {
        if (activeBadges.length <= 1 || isPaused) return;
        const interval = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % activeBadges.length);
        }, 5000);
        return () => clearInterval(interval);
      }, [activeBadges.length, isPaused]);

      if (loading) {
        return (
          <div className="bg-card/50 py-3 text-center">
            <Loader2 className="w-5 h-5 animate-spin inline-block text-muted-foreground" />
          </div>
        );
      }

      if (activeBadges.length === 0) return null;

      const currentBadge = activeBadges[currentIndex];
      const badgeConfig = getBadgeStyle(currentBadge.license_type);

      return (
        <div
          className={`relative overflow-hidden ${badgeConfig.bannerBg} py-3 text-white transition-colors duration-500`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.4%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]"></div>
          <div className="container mx-auto px-4 relative flex items-center justify-between gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
                className="flex items-center space-x-3 flex-1 min-w-0"
              >
                <div className="bg-white/10 rounded-lg p-2 flex-shrink-0">
                  <span className="text-xl md:text-2xl">{badgeConfig.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm md:text-base font-bold truncate">
                      {currentBadge.partner_name}
                    </h3>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs hidden sm:inline">
                      {badgeConfig.title}
                    </span>
                  </div>
                  <p className="text-white/80 text-xs md:text-sm truncate">
                    Partenaire Certifié • {currentBadge.zone}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center space-x-1.5">
                {activeBadges.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                    aria-label={`Go to badge ${index + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                aria-label={isPaused ? 'Play' : 'Pause'}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      );
    };

    export default AnimatedBadgesBanner;