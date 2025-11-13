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
import '@/styles/LicensePurchase.css';

const LicensePurchase = ({ user, userLicenses, onLicenseUpdate }) => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadLicensePacks = useCallback(async () => {
    setLoading(true);
    try {
      const licensePacks = await PurchaseService.getLicensePacks();
      setLicenses(licensePacks);
    } catch (error) {
      console.error('Erreur chargement licences:', error);
      showError('Erreur de chargement des licences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLicensePacks();
  }, [loadLicensePacks]);

  const purchaseLicense = async (license) => {
    if (!user) {
      showError('Veuillez vous connecter pour devenir partenaire.');
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
      title: "Erreur",
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
        <p>Chargement des offres de partenariat...</p>
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
            <h2><span role="img" aria-label="ticket">🎫</span> Vos Licences Actives</h2>
            <div className="licenses-grid">
              {userLicenses.map(license => (
                <div key={license.id} className={`license-card ${isLicenseActive(license.expiry_date) ? 'active' : 'expired'}`}>
                  <div className="license-header">
                    <h3>{license.partner_license_packs?.name || 'Licence'}</h3>
                    <span className="license-status">
                      {isLicenseActive(license.expiry_date) ? '🟢 Active' : '🔴 Expirée'}
                    </span>
                  </div>
                  <div className="license-details">
                    <p><strong>Revenus:</strong> {license.revenue_share_percent}% sur CA</p>
                    <p><strong>Achetée le:</strong> {formatDate(license.purchase_date)}</p>
                    <p><strong>Expire le:</strong> {formatDate(license.expiry_date)}</p>
                    <p><strong>Jours restants:</strong> {Math.max(0, Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)))} jours</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="available-licenses">
        <h2><span role="img" aria-label="rocket">🚀</span> Devenez Partenaire Investisseur</h2>
        <p className="license-subtitle">
          Générez des revenus passifs en investissant dans une licence pays. Vous touchez un pourcentage sur tout le chiffre d'affaires généré dans le pays.
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
                <div className="license-price">{license.fcfa_price.toLocaleString()} FCFA <span className="text-lg font-normal text-muted-foreground">/ mois</span></div>
              </div>
              
              <div className="revenue-share">
                <div className="revenue-percent">{license.revenue_share_percent}%</div>
                <div className="revenue-label">du Chiffre d'Affaires du pays</div>
              </div>

               <div className="license-duration">
                <span role="img" aria-label="timer">⏱️</span> {license.duration_months} mois ({license.duration_days} jours)
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
                ) : "Investir"}
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
                title: "Erreur",
                description: "Impossible de charger vos licences.",
                variant: "destructive",
            });
        } finally {
            setLoadingLicenses(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadUserLicenses();
    }, [loadUserLicenses]);

    if (!user) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-3xl font-bold mb-4">Devenez Partenaire</h1>
                    <p className="text-muted-foreground mb-6">Connectez-vous ou créez un compte pour accéder à nos offres de partenariat.</p>
                    <Button onClick={() => navigate('/auth')}>Se connecter</Button>
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
                title: "Devenir Partenaire - BonPlanInfos",
                description: "Rejoignez le programme partenaire de BonPlanInfos et commencez à générer des revenus en gérant une zone exclusive.",
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