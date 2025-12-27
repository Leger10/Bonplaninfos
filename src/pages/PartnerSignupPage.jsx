import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient'; 
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import MultilingualSeoHead from '@/components/MultilingualSeoHead';
import { Loader2, Download, FileText, CheckCircle2, UploadCloud, AlertTriangle, ShieldCheck, ExternalLink, Clock, Calendar } from 'lucide-react';
import { PurchaseService } from '@/services/purchaseService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateContractPDF } from '@/utils/contractGenerator';
import { useTranslation } from 'react-i18next';
import '@/styles/LicensePurchase.css';

const LicensePurchase = ({ user, userLicenses, licenses, purchaseLoading, uploading, onPurchase, onDownloadContract, onUploadContract }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isLicenseActive = (expiryDate) => {
    return new Date(expiryDate) > new Date();
  };

  const formatDuration = (days) => {
    const years = Math.floor(days / 365);
    if (years > 0) return `${years} An${years > 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    return `${months} Mois`;
  };

  return (
    <div className="license-purchase">
      <AnimatePresence>
        {userLicenses && userLicenses.length > 0 && (
          <motion.section 
            className="active-licenses"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-white"><ShieldCheck className="inline w-6 h-6 mr-2 text-indigo-400" /> {t('partner_signup.your_licenses_title')}</h2>
            <div className="licenses-grid">
              {userLicenses.map(license => {
                const isPending = license.submission_status === 'pending';
                const isApproved = license.submission_status === 'approved';
                const isRejected = license.submission_status === 'rejected';
                const isPaymentDone = license.status === 'pending_contract' || license.status === 'active';
                const needsUpload = (license.status === 'pending_contract' && license.submission_status !== 'pending') || license.submission_status === 'rejected';

                if (license.status === 'pending_payment') return null;

                return (
                  <div key={license.id} className={`license-card ${isLicenseActive(license.expiry_date) ? 'active' : 'expired'} bg-gray-900 border-gray-800 text-white`}>
                    <div className="license-header">
                      <h3 className="text-white bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent font-bold text-xl">
                        {license.partner_license_packs?.name || 'Licence'}
                      </h3>
                      <span className="license-status">
                        {isApproved ? `🟢 ${t('partner_signup.license_card.active')}` : 
                         isRejected ? `🔴 ${t('partner_signup.license_card.rejected')}` :
                         isPending ? `🟡 ${t('partner_signup.license_card.pending')}` :
                         `⚪ ${t('partner_signup.license_card.pending_contract')}`}
                      </span>
                    </div>
                    <div className="license-details text-gray-300">
                      <p><strong className="text-amber-300">{t('partner_signup.license_card.revenue_share', {percent: license.revenue_share_percent})}</strong></p>
                      <p><strong className="text-cyan-300">{t('partner_signup.license_card.purchased_on')}</strong> {formatDate(license.purchase_date)}</p>
                      <p><strong className="text-emerald-300">{t('partner_signup.license_card.expires_on')}</strong> {formatDate(license.expiry_date)}</p>
                      <p><strong className="text-blue-300">{t('partner_signup.license_card.days_remaining', { count: Math.max(0, Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))) })}</strong></p>
                      
                      {isRejected && license.admin_notes && (
                        <Alert variant="destructive" className="mt-3 bg-red-900/30 border-red-800">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <AlertTitle className="text-red-200">Dossier rejeté</AlertTitle>
                          <AlertDescription className="text-red-300">{license.admin_notes}</AlertDescription>
                        </Alert>
                      )}

                      {needsUpload && (
                        <div className="bg-orange-900/30 p-4 rounded-lg border border-orange-800 space-y-3 mt-3">
                          <p className="text-sm font-medium text-orange-300 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Action Requise : Signature du Contrat
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button size="sm" variant="outline" onClick={() => onDownloadContract(license)} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                              <Download className="w-4 h-4 mr-2" /> 1. Télécharger Modèle
                            </Button>
                            <div className="relative">
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                id={`upload-${license.id}`}
                                onChange={(e) => onUploadContract(e, license)}
                                ref={fileInputRef}
                              />
                              <Button size="sm" className="bg-indigo-900 hover:bg-indigo-800 w-full text-white" onClick={() => document.getElementById(`upload-${license.id}`).click()} disabled={uploading}>
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                2. Envoyer Contrat Signé
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {isPending && (
                        <div className="mt-3 text-sm text-gray-400">
                          <p className="italic">Contrat en cours d'examen.</p>
                          {license.contract_url && (
                            <a href={license.contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 mt-1">
                              <FileText className="w-3 h-3" /> Voir document
                            </a>
                          )}
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

      <section className="available-licenses">
        <h2 className="text-white"><span role="img" aria-label="rocket" className="mr-2">🚀</span> {t('partner_signup.available_licenses_title')}</h2>
        <p className="license-subtitle text-gray-400">
          {t('partner_signup.available_licenses_subtitle')}
        </p>
        
        <div className="licenses-grid">
          {licenses.map((license, index) => {
            const benefits = license.features || [];
            const isPopular = license.name.toUpperCase().includes('BUSINESS');
            const isStarter = license.name.toUpperCase().includes('STARTER');
            const isPremium = license.name.toUpperCase().includes('PREMIUM');

            // Déterminer la couleur basée sur le type de licence
            let titleColor = 'text-white';
            let badgeColor = 'border-blue-500 text-blue-300 bg-blue-500/10';
            let durationBg = 'bg-gray-800'; // Fond noir pour la durée
            
            if (isStarter) {
              titleColor = 'text-blue-400';
              badgeColor = 'border-blue-500 text-blue-300 bg-blue-500/10';
            } else if (isPopular) {
              titleColor = 'text-emerald-400';
              badgeColor = 'border-emerald-500 text-emerald-300 bg-emerald-500/10';
            } else if (isPremium) {
              titleColor = 'text-purple-400';
              badgeColor = 'border-purple-500 text-purple-300 bg-purple-500/10';
            }

            return (
              <motion.div 
                key={license.id} 
                className="license-pack-card bg-gray-900 border-gray-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {isPopular && <div className="license-badge bg-emerald-600 text-white">Recommandé</div>}
                {isPremium && <div className="license-badge bg-purple-600 text-white">Premium</div>}
                
                <div className="license-pack-header">
                  <Badge variant="outline" className={`mb-2 capitalize ${badgeColor}`}>
                    {license.coverage_type}
                  </Badge>
                  <h3 className={`${titleColor} font-bold text-2xl`}>
                    {license.name}
                  </h3>
                  <div className="license-price text-amber-300 font-bold text-3xl">
                    {license.fcfa_price.toLocaleString()} FCFA 
                    <span className="text-lg font-normal text-gray-300 block mt-1">Paiement unique</span>
                  </div>
                </div>
                
                <div className="revenue-share mt-4">
                  <div className="revenue-percent text-emerald-400 font-bold text-4xl">
                    {license.revenue_share_percent}%
                  </div>
                  <div className="revenue-label text-emerald-300 font-medium">
                    de la commission
                  </div>
                </div>

                {/* Section durée avec fond noir amélioré */}
                <div className={`${durationBg} p-3 rounded-lg border border-gray-700 mt-3`}>
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">
                      {formatDuration(license.duration_days)}
                    </span>
                  </div>
                </div>
                
                <div className="license-features mt-4">
                  <h4 className="text-gray-300 font-semibold mb-3">Fonctionnalités incluses :</h4>
                  <ul>
                    {benefits.map((feature, idx) => (
                      <li key={idx} className="text-gray-300 mb-2 flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-200">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button 
                  onClick={() => onPurchase(license)}
                  className="buy-license-button mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg"
                  disabled={purchaseLoading === license.id}
                >
                  {purchaseLoading === license.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      Acheter sur MoneyFusion <ExternalLink className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            );
          })}
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
  const subscriptionRef = useRef(null);

  const [licenses, setLicenses] = useState([]);
  const [userLicenses, setUserLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async (showToast = false) => {
    if (!showToast) setLoading(true);
    try {
      const packs = await PurchaseService.getLicensePacks();
      setLicenses(packs);

      if (user) {
        const myLicenses = await PurchaseService.getUserLicenses(user.id);
        const { data: submissions } = await supabase
          .from('contract_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false });
        
        const licensesWithStatus = myLicenses.map(lic => {
          const submission = submissions?.find(s => s.license_id === lic.id);
          return {
            ...lic,
            submission_status: submission ? submission.status : 'pending_upload',
            submission_date: submission ? submission.submitted_at : null,
            admin_notes: submission ? submission.admin_notes : null,
            contract_url: submission ? submission.contract_file_url : null
          };
        });
        setUserLicenses(licensesWithStatus);
      }
      
      if (showToast) {
        toast({ title: "Mise à jour", description: "Les offres ont été mises à jour.", variant: "info" });
      }
    } catch (error) {
      console.error("Error fetching partner data:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('public:partner_license_packs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_license_packs' }, () => fetchData(true))
      .subscribe();
    subscriptionRef.current = channel;
    return () => { if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current); };
  }, [fetchData]);

  const handlePurchase = async (license) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter.", variant: "warning" });
      navigate('/auth?redirect=/partner-signup');
      return;
    }
    setPurchaseLoading(license.id);
    
    try {
      let paymentLink = '';
      const name = license.name.toUpperCase();
      
      if (name.includes('STARTER')) {
        paymentLink = 'https://my.moneyfusion.net/694f3e7e98fe6dbde003c1c0';
      } else if (name.includes('BUSINESS')) {
        paymentLink = 'https://my.moneyfusion.net/694dd8a798fe6dbde0fbaf5f';
      } else if (name.includes('PREMIUM')) {
        paymentLink = 'https://my.moneyfusion.net/694dd99698fe6dbde0fbb1a3';
      } else {
        throw new Error("Lien de paiement non configuré pour ce pack.");
      }

      const { error: dbError } = await supabase.from('user_partner_licenses').insert({
        user_id: user.id,
        license_pack_id: license.id,
        status: 'pending_payment',
        purchase_date: new Date().toISOString()
      });

      if (dbError) throw dbError;

      window.location.href = paymentLink;

    } catch (error) {
      console.error('Purchase error:', error);
      toast({ title: "Erreur", description: error.message || "Une erreur est survenue lors de l'initialisation du paiement.", variant: "destructive" });
      setPurchaseLoading(null);
    }
  };

  const handleDownloadContract = (license) => {
    try {
      let tier = 'starter';
      if (license.partner_license_packs?.name?.toLowerCase().includes('business')) tier = 'business';
      if (license.partner_license_packs?.name?.toLowerCase().includes('premium')) tier = 'premium';

      const doc = generateContractPDF(tier, userProfile);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Erreur lors de la génération du PDF.", variant: "destructive" });
    }
  };

  const handleFileUpload = async (event, license) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Format invalide", description: "Veuillez uploader un fichier PDF uniquement.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 Mo.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileName = `contracts/${user.id}/${license.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('contract_submissions').insert({
        user_id: user.id,
        license_pack_id: license.partner_license_packs?.id || license.license_pack_id,
        license_id: license.id,
        contract_file_url: publicUrl,
        status: 'pending',
        submitted_at: new Date().toISOString()
      });

      if (dbError) throw dbError;

      toast({ title: "Contrat envoyé !", description: "Votre contrat a été soumis et est en attente de validation.", variant: "success" });
      fetchData(); 
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Erreur d'envoi", description: "Impossible d'envoyer le fichier.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center text-center p-4">
        <div>
          <h1 className="text-3xl font-bold mb-4">{t('partner_signup.unauthorized_title')}</h1>
          <p className="text-gray-400 mb-6">{t('partner_signup.unauthorized_desc')}</p>
          <Button onClick={() => navigate('/auth')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
            {t('partner_signup.unauthorized_cta')}
          </Button>
        </div>
      </div>
    );
  }
  
  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto" />
          <p className="mt-4 text-gray-300">Chargement des offres partenaires...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <MultilingualSeoHead pageData={{
        title: t('partner_signup.meta_title'),
        description: t('partner_signup.meta_description'),
      }} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 py-12 md:py-20"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Devenir Partenaire BonPlanInfos
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-lg">
            Rejoignez notre réseau de partenaires et générez des revenus stables grâce à notre programme de concessions territoriales.
          </p>
        </div>
        
        <LicensePurchase 
          user={userProfile} 
          userLicenses={userLicenses}
          licenses={licenses}
          purchaseLoading={purchaseLoading}
          uploading={uploading}
          onPurchase={handlePurchase}
          onDownloadContract={handleDownloadContract}
          onUploadContract={handleFileUpload}
        />
      </motion.div>
    </div>
  );
};

export default PartnerSignupPage;