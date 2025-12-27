import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import { Loader2, CheckCircle, Star, Building2, Globe, MapPin, Calendar, Percent, CreditCard } from 'lucide-react';
import { PurchaseService } from '@/services/purchaseService';
import { useTranslation } from 'react-i18next';
import { formatContractDuration } from '@/lib/utils';

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
      // Vérifier si l'utilisateur a déjà une licence active
      const hasActiveLicense = userLicenses?.some(l => {
        const expiryDate = new Date(l.expiry_date);
        return expiryDate > new Date();
      });
      
      if (hasActiveLicense) {
        const confirmUpgrade = window.confirm(
          'Vous avez déjà une licence active. Voulez-vous vraiment acheter une nouvelle licence ?'
        );
        if (!confirmUpgrade) {
          setPurchaseLoading(null);
          return;
        }
      }
      
      // Rediriger vers la page de paiement
      navigate(`/payment/checkout?amount=${license.fcfa_price}&packId=${license.id}&type=partner_license&name=${encodeURIComponent(license.name)}&from=/partner-signup`);
    } catch (error) {
      showError(error.message || t('partner_signup.error_toast.purchase_failed'));
    } finally {
      setPurchaseLoading(null);
    }
  };

  const showError = (message) => {
    toast({
      title: t('partner_signup.error_toast.title'),
      description: message,
      variant: "destructive",
    });
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isLicenseActive = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) > new Date();
  };

  const getLicenseIcon = (coverageType) => {
    switch (coverageType) {
      case 'ville': return <MapPin className="w-5 h-5 text-blue-500" />;
      case 'region': return <Building2 className="w-5 h-5 text-green-500" />;
      case 'pays': return <Globe className="w-5 h-5 text-purple-500" />;
      default: return <Star className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTerritoryText = (coverageType) => {
    switch (coverageType) {
      case 'ville': return t('partner_signup.license_features.starter.territory');
      case 'region': return t('partner_signup.license_features.business.territory');
      case 'pays': return t('partner_signup.license_features.premium.territory');
      default: return 'Territoire spécifique';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t('partner_signup.loading_licenses')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {userLicenses && userLicenses.length > 0 && (
          <motion.section 
            className="space-y-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{t('partner_signup.your_licenses_title')}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userLicenses.map(license => {
                const isActive = isLicenseActive(license.expiry_date);
                const licenseData = license.partner_license_packs;
                const daysLeft = license.expiry_date 
                  ? Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
                  : 0;
                
                return (
                  <div 
                    key={license.id} 
                    className={`border rounded-xl p-4 ${isActive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {getLicenseIcon(licenseData?.coverage_type)}
                        <h3 className="font-bold text-lg">
                          {licenseData?.name || 'Licence'}
                        </h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isActive 
                          ? `🟢 ${t('partner_signup.license_card.active')}` 
                          : `🔴 ${t('partner_signup.license_card.expired')}`}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('partner_signup.license_card.entry_fee')}:</span>
                        <span className="font-semibold">
                          {licenseData?.price_fcfa?.toLocaleString() || '0'} FCFA
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('partner_signup.license_card.revenue_share')}:</span>
                        <span className="font-semibold text-green-600">
                          {licenseData?.commission_rate || '0'}% {t('partner_signup.license_features.revenue_share_based')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('partner_signup.license_card.contract_duration')}:</span>
                        <span className="font-semibold">
                          {licenseData?.duration_days ? Math.round(licenseData.duration_days / 365) : 0} ans
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('partner_signup.license_card.purchased_on')}:</span>
                        <span className="font-semibold">{formatDate(license.purchase_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('partner_signup.license_card.expires_on')}:</span>
                        <span className={`font-semibold ${isActive ? '' : 'text-red-600'}`}>
                          {formatDate(license.expiry_date)}
                        </span>
                      </div>
                      {isActive && daysLeft > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-center text-sm">
                            {t('partner_signup.license_card.days_remaining', { count: daysLeft })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('partner_signup.available_licenses_title')}</h2>
          <p className="text-muted-foreground">
            {t('partner_signup.available_licenses_subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {licenses.map((license, index) => (
            <motion.div 
              key={license.id} 
              className="relative border rounded-2xl overflow-hidden bg-card shadow-lg hover:shadow-xl transition-shadow duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {license.badge && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    {license.badge}
                  </span>
                </div>
              )}
              
              <div className="p-6">
                {/* En-tête */}
                <div className="flex items-center gap-3 mb-4">
                  {getLicenseIcon(license.coverage_type)}
                  <div>
                    <h3 className="text-xl font-bold">{license.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getTerritoryText(license.coverage_type)}
                    </p>
                  </div>
                </div>

                {/* Prix */}
                <div className="mb-6">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {license.fcfa_price.toLocaleString()} FCFA
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('partner_signup.entry_fee_label')}
                  </div>
                </div>

                {/* Caractéristiques */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {t('partner_signup.duration_label', { 
                        years: license.duration_years 
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {license.revenue_share_percent}% {t('partner_signup.revenue_label')}
                    </span>
                  </div>
                </div>

                {/* Liste des fonctionnalités */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                    Inclus dans la concession :
                  </h4>
                  <ul className="space-y-2">
                    {license.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Description */}
                {license.description && (
                  <div className="mb-6 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground italic">
                      {license.description}
                    </p>
                  </div>
                )}

                {/* Bouton d'achat */}
                <Button 
                  onClick={() => purchaseLicense(license)}
                  className="w-full"
                  size="lg"
                  disabled={purchaseLoading === license.id}
                >
                  {purchaseLoading === license.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      {t('partner_signup.purchase_cta')}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Explication des commissions */}
        <div className="mt-8 p-6 bg-muted/30 rounded-xl border">
          <h4 className="font-semibold text-lg mb-3">
            {t('partner_signup.license_features.commission_explanation')}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t('partner_signup.license_features.revenue_share_based')}
          </p>
        </div>
      </section>
    </div>
  );
};

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
            console.error('Error loading user licenses:', error);
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
                <div className="max-w-md">
                    <h1 className="text-3xl font-bold mb-4">{t('partner_signup.unauthorized_title')}</h1>
                    <p className="text-muted-foreground mb-6">{t('partner_signup.unauthorized_desc')}</p>
                    <Button onClick={() => navigate('/auth')} size="lg">
                        {t('partner_signup.unauthorized_cta')}
                    </Button>
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
                className="container mx-auto px-4 py-8 md:py-12"
            >
                {/* En-tête de la page */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">
                        Devenir Partenaire BonPlanInfos
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Rejoignez notre réseau de partenaires et générez des revenus stables grâce à notre programme de concessions territoriales.
                    </p>
                </div>

                <LicensePurchase 
                    user={userProfile} 
                    userLicenses={userLicenses}
                    onLicenseUpdate={loadUserLicenses}
                />

                {/* Section des contrats */}
                <div className="mt-12 p-6 border rounded-xl bg-card">
                  <h3 className="text-xl font-bold mb-4">{t('partner_signup.contract_forms.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">{t('partner_signup.contract_forms.starter_form')}</h4>
                      <Button variant="outline" size="sm" className="w-full">
                        {t('partner_signup.contract_forms.download')}
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">{t('partner_signup.contract_forms.business_form')}</h4>
                      <Button variant="outline" size="sm" className="w-full">
                        {t('partner_signup.contract_forms.download')}
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">{t('partner_signup.contract_forms.premium_form')}</h4>
                      <Button variant="outline" size="sm" className="w-full">
                        {t('partner_signup.contract_forms.download')}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    {t('partner_signup.contract_forms.instructions')}
                  </p>
                </div>
            </motion.div>
        </div>
    );
};

export default PartnerSignupPage;