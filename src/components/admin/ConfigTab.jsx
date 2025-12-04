import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useData } from '@/contexts/DataContext';
import { Loader2, AlertTriangle, Upload, RefreshCcw, Database, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ResetDataModal from './ResetDataModal';

const ConfigTab = () => {
  const { adminConfig, loadingConfig, forceRefreshAdminConfig } = useData();
  const { user } = useAuth();
  const [configForm, setConfigForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [lastResetTime, setLastResetTime] = useState(null);

  useEffect(() => {
    if (adminConfig) {
      setConfigForm(adminConfig);
      setLogoUrl(adminConfig.logo_url || '');
    }
    fetchLastResetTime();
  }, [adminConfig]);

  const fetchLastResetTime = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('created_at')
        .eq('action_type', 'reset_data')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (data) {
        setLastResetTime(new Date(data.created_at));
      }
    } catch (e) {
      console.error("Failed to fetch reset log", e);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `public/logo-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('media').upload(fileName, file, { upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      setLogoUrl(publicUrl);
      setConfigForm(prev => ({ ...prev, logo_url: publicUrl }));
      toast({ title: 'Logo téléversé avec succès' });
    } catch (error) {
      toast({ title: 'Erreur de téléversement', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    if (!configForm) return;

    const { id, ...updateData } = configForm;

    const numericData = {
      ...updateData,
      coin_to_fcfa_rate: Number(updateData.coin_to_fcfa_rate) || 10,
      min_withdrawal_pi: Number(updateData.min_withdrawal_pi) || 50,
      commission_rate_starter: Number(updateData.commission_rate_starter) || 20,
      commission_rate_business: Number(updateData.commission_rate_business) || 30,
      commission_rate_premium: Number(updateData.commission_rate_premium) || 40,
      platform_fee_percentage: Number(updateData.platform_fee_percentage) || 5,
      currency_eur_rate: Number(updateData.currency_eur_rate) || 0.0015,
      currency_usd_rate: Number(updateData.currency_usd_rate) || 0.0016,
      logo_url: logoUrl,
    };

    delete numericData.coin_packs;
    delete numericData.promotion_packs;

    try {
      const { error } = await supabase
        .from('app_settings')
        .update(numericData)
        .eq('id', id);
      if (error) throw error;

      toast({ title: "Configuration mise à jour", description: "Les paramètres ont été sauvegardés." });
      forceRefreshAdminConfig();
    } catch (error) {
      toast({ title: "Erreur lors de la mise à jour", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Nuclear option (Deleting everything)
  const handleResetApplication = async () => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.rpc('reset_application_data', { p_admin_id: user.id });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      toast({ title: "Application Réinitialisée !", description: data.message, duration: 9000 });
      window.location.reload();
    } catch (error) {
      toast({ title: "Erreur lors de la réinitialisation", description: error.message, variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  if (loadingConfig || !configForm) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleInputChange = (key, value) => {
    setConfigForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg rounded-xl">
        <CardHeader><CardTitle>Configuration de la plateforme</CardTitle></CardHeader>
        <CardContent className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo de la page d'accueil</Label>
              <div className="flex items-center gap-4">
                {logoUrl && <img src={logoUrl} alt="Logo actuel" className="w-16 h-16 object-contain rounded-md bg-white p-1" />}
                <Input id="logo" type="file" onChange={(e) => handleLogoUpload(e.target.files[0])} className="hidden" />
                <Button asChild variant="outline">
                  <Label htmlFor="logo" className="cursor-pointer">
                    {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Changer le logo
                  </Label>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformFee">Frais de plateforme sur les transactions (%)</Label>
              <Input id="platformFee" type="number" value={configForm.platform_fee_percentage || 5} onChange={(e) => handleInputChange('platform_fee_percentage', e.target.value)} />
            </div>
          </div>

          <h3 className="text-lg font-semibold pt-4 border-t mt-6">Valeurs Monétaires</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label>Conversion Pièces</Label>
              <div className="flex items-center gap-2">
                <span>1 Pièce =</span>
                <Input type="number" value={configForm.coin_to_fcfa_rate || 10} onChange={(e) => handleInputChange('coin_to_fcfa_rate', e.target.value)} className="w-24" />
                <span>FCFA</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minWithdrawal">Retrait minimum (pièces)</Label>
              <Input id="minWithdrawal" type="number" value={configForm.min_withdrawal_pi || 50} onChange={(e) => handleInputChange('min_withdrawal_pi', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eurRate">Taux EUR (pour 1 FCFA)</Label>
              <Input id="eurRate" type="number" step="0.0001" value={configForm.currency_eur_rate || 0.0015} onChange={(e) => handleInputChange('currency_eur_rate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usdRate">Taux USD (pour 1 FCFA)</Label>
              <Input id="usdRate" type="number" step="0.0001" value={configForm.currency_usd_rate || 0.0016} onChange={(e) => handleInputChange('currency_usd_rate', e.target.value)} />
            </div>
          </div>

          <h3 className="text-lg font-semibold pt-4 border-t mt-6">Commissions Partenaires (%)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="commissionStarter">Licence Starter</Label>
              <Input id="commissionStarter" type="number" value={configForm.commission_rate_starter || 20} onChange={(e) => handleInputChange('commission_rate_starter', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionBusiness">Licence Business</Label>
              <Input id="commissionBusiness" type="number" value={configForm.commission_rate_business || 30} onChange={(e) => handleInputChange('commission_rate_business', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionPremium">Licence Premium</Label>
              <Input id="commissionPremium" type="number" value={configForm.commission_rate_premium || 40} onChange={(e) => handleInputChange('commission_rate_premium', e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSaveConfig} disabled={isSaving || uploadingLogo}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder la configuration
          </Button>
        </CardContent>
      </Card>

      {/* Zone de Danger - Reset Transactionnel (Soft) */}
      <Card className="border-orange-500/50 shadow-lg rounded-xl mt-8 bg-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600"><Database className="h-5 w-5" /> Nettoyage des Données</CardTitle>
          <CardDescription>
            Utile après une période de test. Cela supprimera toutes les transactions et remettra à zéro les compteurs, mais <strong>gardera les utilisateurs et les événements</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lastResetTime && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
              <Clock className="w-3 h-3" /> Dernier nettoyage : {lastResetTime.toLocaleString('fr-FR')}
            </p>
          )}
          <p className="text-sm text-muted-foreground mb-4">
            Cette action est idéale pour passer de la phase de test à la production sans devoir recréer tous les comptes et contenus.
          </p>
          <Button 
            variant="outline" 
            className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
            onClick={() => setShowResetModal(true)}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Nettoyer les Transactions & Données
          </Button>
        </CardContent>
      </Card>

      {/* Zone de Danger - Reset Total (Hard) */}
      <Card className="border-destructive shadow-lg rounded-xl mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Zone de danger absolue</CardTitle>
          <CardDescription>
            Suppression totale de l'application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Cette action supprimera <strong>TOUT</strong> : utilisateurs (sauf admins), événements, configurations, historiques. L'application repartira de zéro.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Réinitialiser TOTALEMENT l'Application</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument certain ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est <strong>IRREVERSIBLE</strong>. Elle supprimera définitivement toutes les données de l'application (utilisateurs, événements, transactions, etc.) à l'exception des comptes administrateurs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetApplication} disabled={isResetting} className="bg-destructive hover:bg-destructive/90">
                  {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Oui, TOUT supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <ResetDataModal 
        open={showResetModal} 
        onOpenChange={setShowResetModal} 
        onSuccess={() => {
          fetchLastResetTime();
          forceRefreshAdminConfig();
        }}
      />
    </div>
  );
};

export default ConfigTab;