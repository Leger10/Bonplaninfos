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
    <div className="license-purchase px-2 sm:px-0">
      <AnimatePresence>
        {userLicenses && userLicenses.length > 0 && (
          <motion.section 
            className="active-licenses"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-white text-lg sm:text-xl md:text-2xl flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" /> 
              {t('partner_signup.your_licenses_title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userLicenses.map(license => {
                const isPending = license.submission_status === 'pending';
                const isApproved = license.submission_status === 'approved';
                const isRejected = license.submission_status === 'rejected';
                const isPaymentDone = license.status === 'pending_contract' || license.status === 'active';
                const needsUpload = (license.status === 'pending_contract' && license.submission_status !== 'pending') || license.submission_status === 'rejected';

                if (license.status === 'pending_payment') return null;

                return (
                  <div key={license.id} className={`license-card bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white`}>
                    <div className="license-header mb-4">
                      <h3 className="text-white bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent font-bold text-base sm:text-lg truncate">
                        {license.partner_license_packs?.name || 'Licence'}
                      </h3>
                      <span className="license-status text-xs sm:text-sm mt-1 inline-block px-2 py-1 rounded-full bg-gray-800">
                        {isApproved ? `🟢 ${t('partner_signup.license_card.active')}` : 
                         isRejected ? `🔴 ${t('partner_signup.license_card.rejected')}` :
                         isPending ? `🟡 ${t('partner_signup.license_card.pending')}` :
                         `⚪ ${t('partner_signup.license_card.pending_contract')}`}
                      </span>
                    </div>
                    <div className="license-details text-gray-300 text-sm space-y-2">
                      <p><strong className="text-amber-300 text-xs sm:text-sm">{t('partner_signup.license_card.revenue_share', {percent: license.revenue_share_percent})}</strong></p>
                      <p><strong className="text-cyan-300 text-xs sm:text-sm">{t('partner_signup.license_card.purchased_on')}</strong> {formatDate(license.purchase_date)}</p>
                      <p><strong className="text-emerald-300 text-xs sm:text-sm">{t('partner_signup.license_card.expires_on')}</strong> {formatDate(license.expiry_date)}</p>
                      <p><strong className="text-blue-300 text-xs sm:text-sm">{t('partner_signup.license_card.days_remaining', { count: Math.max(0, Math.ceil((new Date(license.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))) })}</strong></p>
                      
                      {isRejected && license.admin_notes && (
                        <Alert variant="destructive" className="mt-3 bg-red-900/30 border-red-800 p-3">
                          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                          <AlertTitle className="text-red-200 text-xs sm:text-sm">Dossier rejeté</AlertTitle>
                          <AlertDescription className="text-red-300 text-xs sm:text-sm truncate">{license.admin_notes}</AlertDescription>
                        </Alert>
                      )}

                      {needsUpload && (
                        <div className="bg-orange-900/30 p-3 rounded-lg border border-orange-800 space-y-2 mt-3">
                          <p className="text-xs sm:text-sm font-medium text-orange-300 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" /> Action Requise
                          </p>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="outline" onClick={() => onDownloadContract(license)} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-8 sm:h-9 text-xs">
                              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" /> 1. Télécharger
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
                              <Button size="sm" className="bg-indigo-900 hover:bg-indigo-800 w-full text-white h-8 sm:h-9 text-xs" onClick={() => document.getElementById(`upload-${license.id}`).click()} disabled={uploading}>
                                {uploading ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-2" /> : <UploadCloud className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />}
                                2. Envoyer
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {isPending && (
                        <div className="mt-3 text-xs sm:text-sm text-gray-400">
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

      <section className="available-licenses mt-8 sm:mt-12">
        <h2 className="text-white text-lg sm:text-xl md:text-2xl mb-2">
          🚀 {t('partner_signup.available_licenses_title')}
        </h2>
        <p className="license-subtitle text-gray-400 text-sm sm:text-base mb-6">
          {t('partner_signup.available_licenses_subtitle')}
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {licenses.map((license, index) => {
            const benefits = license.features || [];
            const isPopular = license.name.toUpperCase().includes('BUSINESS');
            const isStarter = license.name.toUpperCase().includes('STARTER');
            const isPremium = license.name.toUpperCase().includes('PREMIUM');

            let titleColor = 'text-white';
            let badgeColor = 'border-blue-500 text-blue-300 bg-blue-500/10';
            let durationBg = 'bg-gray-800';
            
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
                className="license-pack-card bg-gray-900 border border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {(isPopular || isPremium) && (
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold ${isPopular ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'}`}>
                    {isPopular ? 'Recommandé' : 'Premium'}
                  </div>
                )}
                
                <div className="license-pack-header mb-4">
                  <Badge variant="outline" className={`mb-2 text-xs sm:text-sm ${badgeColor}`}>
                    {license.coverage_type}
                  </Badge>
                  <h3 className={`${titleColor} font-bold text-lg sm:text-xl md:text-2xl`}>
                    {license.name}
                  </h3>
                  <div className="license-price text-amber-300 font-bold text-xl sm:text-2xl md:text-3xl mt-2">
                    {license.fcfa_price.toLocaleString()} FCFA 
                    <span className="text-sm font-normal text-gray-300 block mt-1">Paiement unique</span>
                  </div>
                </div>
                
                <div className="revenue-share mt-3 sm:mt-4">
                  <div className="revenue-percent text-emerald-400 font-bold text-3xl sm:text-4xl">
                    {license.revenue_share_percent}%
                  </div>
                  <div className="revenue-label text-emerald-300 font-medium text-sm">
                    de la commission
                  </div>
                </div>

                <div className={`${durationBg} p-2 sm:p-3 rounded-lg border border-gray-700 mt-3`}>
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    <span className="text-white font-medium text-sm sm:text-base">
                      {formatDuration(license.duration_days)}
                    </span>
                  </div>
                </div>
                
                <div className="license-features mt-4">
                  <h4 className="text-gray-300 font-semibold text-sm sm:text-base mb-2">Fonctionnalités :</h4>
                  <ul className="space-y-1 sm:space-y-2">
                    {benefits.map((feature, idx) => (
                      <li key={idx} className="text-gray-300 text-xs sm:text-sm flex items-start">
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-200">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button 
                  onClick={() => onPurchase(license)}
                  className="buy-license-button mt-4 sm:mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg h-10 sm:h-12 w-full text-sm sm:text-base"
                  disabled={purchaseLoading === license.id}
                >
                  {purchaseLoading === license.id ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <>
                      Acheter sur MoneyFusion <ExternalLink className="ml-2 w-3 h-3 sm:w-4 sm:h-4" />
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">{t('partner_signup.unauthorized_title')}</h1>
          <p className="text-gray-400 mb-6 text-sm sm:text-base">{t('partner_signup.unauthorized_desc')}</p>
          <Button onClick={() => navigate('/auth')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-10 sm:h-12 text-sm sm:text-base">
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
          <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 animate-spin text-blue-400 mx-auto" />
          <p className="mt-4 text-gray-300 text-sm sm:text-base">Chargement des offres partenaires...</p>
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
        className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-20"
      >
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Devenir Partenaire BonPlanInfos
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base md:text-lg px-2">
            Rejoignez notre réseau de partenaires et générez des revenus stables.
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