import React, { useState, useEffect } from 'react';
import { PurchaseService } from '@/services/purchaseService';
import '@/components/LicensePurchase.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';

const LicensePurchase = ({ user, userLicenses, onLicenseUpdate }) => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadLicensePacks();
  }, []);

  const loadLicensePacks = async () => {
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
  }

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
                    <h3>{license.partner_license_packs.name}</h3>
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
        <h2><span role="img" aria-label="rocket">🚀</span> Devenez Partenaire Bonplaninfos</h2>
        <p className="license-subtitle">
          Gagnez des revenus passifs en devenant partenaire. Plus votre zone génère de chiffre d'affaires, plus vous gagnez !
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
                <div className="license-price">{license.fcfa_price.toLocaleString()} FCFA</div>
              </div>
              
              <div className="revenue-share">
                <div className="revenue-percent">{license.revenue_share_percent}%</div>
                <div className="revenue-label">de revenus sur CA</div>
              </div>
              
              <div className="license-duration">
                <span role="img" aria-label="timer">⏱️</span> {license.duration_months} mois ({license.duration_days} jours)
              </div>
              
              <div className="license-features">
                <h4>Fonctionnalités incluses:</h4>
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
                ) : "Devenir Partenaire"}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default LicensePurchase;