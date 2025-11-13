import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import '@/styles/CookieBanner.css';

const CookieBanner = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookiesConsent');
    if (!consent) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (consent) => {
    localStorage.setItem('cookiesConsent', consent);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="cookie-banner"
        >
          <div className="cookie-content">
            <p className="cookie-text">
              <span className="text-2xl mr-2">🍪</span>
              {t('cookie_banner.message')}
              <Link to="/privacy-policy" className="cookie-link">{t('cookie_banner.learn_more')}</Link>.
            </p>
            <div className="cookie-buttons">
              <Button onClick={() => handleConsent('accepted')} className="gradient-gold text-background">
                {t('cookie_banner.accept')}
              </Button>
              <Button variant="outline" onClick={() => handleConsent('rejected')}>
                {t('cookie_banner.reject')}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;