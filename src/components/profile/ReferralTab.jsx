import React, { useState, useEffect } from 'react';
import { Share2, Users, Wallet, Copy, Loader2, Info, QrCode, AlertCircle, Banknote, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrencySimple } from '@/lib/utils';

const ReferralTab = () => {
  const { userProfile, loadingProfile, forceRefreshUserProfile } = useData();
  const [isGenerating, setIsGenerating] = useState(false);

  // Access code securely
  const referralCode = userProfile?.affiliate_code || '';
  const referralLink = referralCode ? `${window.location.origin}/auth?register=true&ref=${referralCode}` : '';
  const shareText = `🎉 Gagne de l'argent avec moi sur BonPlanInfos ! Inscris-toi avec mon code ${referralCode} pour commencer et reçois 100 FCFA de bienvenue ! ${referralLink}`;
  
  // Use real data from profile
  const referralCount = userProfile?.referral_count || 0;
  // Calculation: 200 FCFA per referral
  const referralEarningsFCFA = referralCount * 200; 

  // Auto-generate if missing on load (Self-healing)
  useEffect(() => {
    const generateIfMissing = async () => {
      if (!loadingProfile && userProfile && !referralCode && !isGenerating) {
        setIsGenerating(true);
        try {
          const { error } = await supabase.rpc('generate_missing_referral_code', { p_user_id: userProfile.id });
          if (error) throw error;
          forceRefreshUserProfile();
          toast({ title: "Code généré", description: "Votre code de parrainage a été créé." });
        } catch (err) {
          console.error("Failed to generate referral code:", err);
        } finally {
          setIsGenerating(false);
        }
      }
    };
    generateIfMissing();
  }, [userProfile, loadingProfile, referralCode, isGenerating, forceRefreshUserProfile]);

  const handleCopy = (textToCopy, successMessage) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    toast({ title: "Copié !", description: successMessage });
  };

  const handleShare = async () => {
    if (!referralCode) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Gagnez de l\'argent sur BonPlanInfos', text: shareText, url: referralLink });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };
  
  const isLoading = loadingProfile || isGenerating;

  if (isLoading && !userProfile) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  }

  return (
    <Card className="bg-gray-900 border-gray-800 shadow-md">
      <CardHeader className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-b border-emerald-800">
        <CardTitle className="text-emerald-300 flex items-center gap-2">
          <Banknote className="w-6 h-6" />
          Programme d'Affiliation
        </CardTitle>
        <CardDescription className="text-emerald-400">
          Invitez vos amis et gagnez <span className="font-bold text-emerald-300">200 FCFA</span> pour chaque inscription validée ! Vos amis reçoivent <span className="font-bold text-emerald-300">100 FCFA</span> (10 pièces) de bonus.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 font-medium mb-1">Amis parrainés</p>
              <p className="text-3xl font-bold text-white">{referralCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-300" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 p-4 rounded-xl border border-emerald-800 shadow-md flex items-center justify-between text-white">
            <div>
              <p className="text-sm text-emerald-200 font-medium mb-1">Gains générés</p>
              <p className="text-3xl font-bold text-white">{formatCurrencySimple(referralEarningsFCFA)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Link Section */}
        {!referralCode && !isLoading ? (
           <Alert variant="destructive" className="bg-red-900/20 border-red-800">
             <AlertCircle className="h-4 w-4 text-red-400" />
             <AlertTitle className="text-red-200">Code manquant</AlertTitle>
             <AlertDescription className="text-red-300">Impossible de charger votre code. Veuillez actualiser.</AlertDescription>
             <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="mt-2 border-gray-600 text-gray-300 hover:bg-gray-800">
               Actualiser
             </Button>
           </Alert>
        ) : (
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
          <h4 className="font-semibold text-gray-200 mb-3 flex items-center">
            <Share2 className="w-4 h-4 mr-2 text-emerald-400" />
            Votre lien unique
          </h4>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Input
                value={referralLink || 'Génération...'}
                readOnly
                className="bg-gray-900 text-gray-200 font-mono text-sm pr-10 border-gray-600 focus-visible:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
                <Button 
                  onClick={() => handleCopy(referralLink, "Lien copié !")} 
                  className="bg-gray-700 hover:bg-gray-600 text-white min-w-[100px] border border-gray-600"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </Button>
                <Button 
                  onClick={handleShare} 
                  variant="outline" 
                  size="icon" 
                  className="border-emerald-800 text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
                            <QrCode className="w-4 h-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md flex flex-col items-center bg-gray-900 text-white border-gray-700">
                        <DialogHeader>
                            <DialogTitle className="text-center text-white">Scan pour gagner</DialogTitle>
                        </DialogHeader>
                        <div className="p-4 bg-white rounded-xl shadow-inner border">
                            {referralLink && <QRCodeCanvas value={referralLink} size={200} includeMargin={true} />}
                        </div>
                        <p className="text-sm text-center text-gray-400 mt-2">Faites scanner ce code pour parrainer</p>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-xs text-gray-400">
             <span className="font-mono bg-gray-700 px-2 py-1 rounded text-gray-300">Code: {referralCode}</span>
             <span>•</span>
             <span>Bonus ami: 100 FCFA (10pièces)</span>
          </div>
        </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-800 text-sm">
          <h4 className="font-semibold mb-2 flex items-center text-blue-300">
            <Info className="w-4 h-4 mr-2" /> 
            Comment ça marche ?
          </h4>
          <ul className="list-disc pl-5 space-y-2 text-blue-200">
            <li>Partagez votre lien d'affiliation avec vos amis et sur vos réseaux.</li>
            <li>Pour chaque ami qui s'inscrit, vous gagnez <strong className="text-blue-100">200 FCFA</strong> (crédités via le Pool Créateur).</li>
            <li>Vos amis reçoivent un <span className="flex items-center inline-flex gap-1 bg-yellow-900/30 px-1 rounded text-yellow-300"><Gift className="w-3 h-3"/> bonus de bienvenue de <strong>100 FCFA</strong></span> (10 pièces) à l'inscription.</li>
            <li><strong className="text-blue-100">Tous les gains (Parrainage + Bonus Bienvenue) proviennent du Pool Créateur Global.</strong></li>
            <li><em className="text-xs text-blue-300/80">*Note: Si le Pool Global est insuffisant, les montants des gains de parrainage et des bonus de bienvenue peuvent être réduits proportionnellement.</em></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralTab;