import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Cookie, Shield, Settings } from 'lucide-react';
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

        if (consent === 'accepted') {
            console.log('Cookies accepted - Analytics initialized');
        }
    };

    const handleCustomize = () => {
        console.log('Open cookie preferences');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        duration: 0.3
                    }}
                    className="cookie-banner"
                >
                    <div className="cookie-content">
                        <div className="cookie-header">
                            <div className="cookie-icon">
                                <Cookie size={20} />
                            </div>
                            <div className="cookie-text-content">
                                <h3 className="cookie-title">
                                    {t('cookie_banner.title')}
                                </h3>
                                <p className="cookie-text">
                                    {t('cookie_banner.message')}
                                    <Link to="/privacy-policy" className="cookie-link">
                                        {t('cookie_banner.learn_more')}
                                    </Link>
                                </p>
                            </div>
                        </div>

                        <div className="cookie-buttons">
                            <Button
                                onClick={handleCustomize}
                                variant="outline"
                                className="cookie-button cookie-button--secondary"
                                size="sm"
                            >
                                <Settings size={16} />
                                {t('cookie_banner.customize')}
                            </Button>
                            <Button
                                onClick={() => handleConsent('rejected')}
                                variant="outline"
                                className="cookie-button cookie-button--secondary"
                                size="sm"
                            >
                                {t('cookie_banner.reject')}
                            </Button>
                            <Button
                                onClick={() => handleConsent('accepted')}
                                className="cookie-button cookie-button--primary"
                                size="sm"
                            >
                                <Shield size={16} />
                                {t('cookie_banner.accept')}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieBanner;