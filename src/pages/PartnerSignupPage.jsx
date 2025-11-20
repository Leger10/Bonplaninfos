import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import { Loader2 } from 'lucide-react';
import { PurchaseService } from '@/services/purchaseService';
import { useTranslation } from 'react-i18next';
import '@/styles/LicensePurchase.css';

const LicensePurchase = ({ user, userLicenses, onLicenseUpdate }) => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const loadLicensePacks = useCallback(async () => {
    setLoading(true);
    try {
      const licensePacks = await PurchaseService.getLicensePacks();
      setLicenses(licensePacks);
    } catch (error) {
      console.error('Erreur chargement licences:', error);
      showError(t('partner_signup.error_loading_licenses'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadLicensePacks();
  }, [loadLicensePacks]);

  const purchaseLicense = async (license) => {
    if (!user) {
      showError(t('partner_signup.error_toast.login_required'));
      return;
    }

    setPurchaseLoading(license.id);
    try {
        navigate(`/payment/checkout?amount=${license.fcfa_price}&packId=${license.id}&type=partner_license&from=/partner-signup`);
    } catch (error) {
        showError(error.message);
    } finally {
        setPurchaseLoading(null);
    }
  }

  const showError = (message) => {
    toast({
      title: t('partner_signup.error_toast.title'),
      description: message,
      variant: "destructive",
    });
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const isLicenseActive = (expiryDate) => {
    return new Date(expiryDate) > new Date();
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>{t('partner_signup.loading_licenses')}</p>
      </div>
    );
  }

  return (
    <div className="license-purchase">
      <AnimatePresence>
        {userLicenses && userLicenses.length > 0 && (
          <motion.section 
            className="active-licenses"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2><span role="img" aria-label="ticket">🎫</span> {t('partner_signup.your_licenses_title')}</h2>
            <div className="licenses-grid">
              {userLicenses.map(license => (
                <div key={license.id} className={`license-card ${isLicenseActive(license.expiry_date) ? 'active' : 'expired'}`}>
                  <div className="license-header">
                    <h3>{license.partner_license_packs?.name || 'Licence'}</h3>
                    <span className="license-status">
                      {isLicenseActive(license.expiry_date) ? `🟢 ${t('partner_signup.license_card.active')}` : `🔴 ${t('partner_signup.license_card.expired')}`}
                    </span>
                  </div>
                  <div className="license-details">
                    <p><strong>{t('partner_signup.license_card.revenue_share', {percent: license.revenue_share_percent}) }</strong></p>
                    <p><strong>{t('partner_signup.license_card.purchased_on')}</strong> {formatDate(license.purchase_date)}</p>
                    <p><strong>{t('partner_signup.license_card.expires_on')}</strong> {formatDate(license.expiry_date)}</p>
                    <p><strong>{t('partner_signup.license_card.days_remaining', { count: Math.max(0, Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))) })}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="available-licenses">
        <h2><span role="img" aria-label="rocket">🚀</span> {t('partner_signup.available_licenses_title')}</h2>
        <p className="license-subtitle">
          {t('partner_signup.available_licenses_subtitle')}
        </p>
        
        <div className="licenses-grid">
          {licenses.map((license, index) => (
            <motion.div 
              key={license.id} 
              className="license-pack-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {license.badge && <div className="license-badge">{license.badge}</div>}
              
              <div className="license-pack-header">
                <h3>{license.name}</h3>
                <div className="license-price">{license.fcfa_price.toLocaleString()} FCFA <span className="text-lg font-normal text-muted-foreground">{t('partner_signup.per_month')}</span></div>
              </div>
              
              <div className="revenue-share">
                <div className="revenue-percent">{license.revenue_share_percent}%</div>
                <div className="revenue-label">{t('partner_signup.revenue_label')}</div>
              </div>

               <div className="license-duration">
                <span role="img" aria-label="timer">⏱️</span> {t('partner_signup.duration_label', { months: license.duration_months, days: license.duration_days })}
              </div>
              
              <div className="license-features">
                <ul>
                  {license.features.map((feature, idx) => (
                    <li key={idx}><span role="img" aria-label="check">✅</span> {feature}</li>
                  ))}
                </ul>
              </div>
              
              <div className="license-description">
                {license.description}
              </div>
              
              <Button 
                onClick={() => purchaseLicense(license)}
                className="buy-license-button"
                disabled={purchaseLoading === license.id}
              >
                {purchaseLoading === license.id ? (
                  <Loader2 className="animate-spin" />
                ) : t('partner_signup.purchase_cta')}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}


const PartnerSignupPage = () => {
    const { user } = useAuth();
    const { userProfile, loadingProfile } = useData();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useTranslation();

    const [userLicenses, setUserLicenses] = useState([]);
    const [loadingLicenses, setLoadingLicenses] = useState(true);

    const loadUserLicenses = useCallback(async () => {
        if (!user) {
            setLoadingLicenses(false);
            return;
        }
        try {
            setLoadingLicenses(true);
            const licenses = await PurchaseService.getUserLicenses(user.id);
            setUserLicenses(licenses);
        } catch (error) {
            toast({
                title: t('partner_signup.error_toast.title'),
                description: t('partner_signup.error_loading_licenses'),
                variant: "destructive",
            });
        } finally {
            setLoadingLicenses(false);
        }
    }, [user, toast, t]);

    useEffect(() => {
        loadUserLicenses();
    }, [loadUserLicenses]);

    if (!user) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-3xl font-bold mb-4">{t('partner_signup.unauthorized_title')}</h1>
                    <p className="text-muted-foreground mb-6">{t('partner_signup.unauthorized_desc')}</p>
                    <Button onClick={() => navigate('/auth')}>{t('partner_signup.unauthorized_cta')}</Button>
                </div>
            </div>
        );
    }
    
    if (loadingProfile || loadingLicenses) {
         return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <MultilingualSeoHead pageData={{
                title: t('partner_signup.meta_title'),
                description: t('partner_signup.meta_description'),
            }} />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="container mx-auto px-4 py-12 md:py-20"
            >
                <LicensePurchase 
                    user={userProfile} 
                    userLicenses={userLicenses}
                    onLicenseUpdate={loadUserLicenses}
                />
            </motion.div>
        </div>
    );
};

export default PartnerSignupPage;