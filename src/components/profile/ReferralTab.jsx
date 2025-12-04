import React, { useState, useEffect } from 'react';
import { Share2, Users, Coins, Copy, Loader2, Info, QrCode, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ReferralTab = () => {
  const { userProfile, loadingProfile, forceRefreshUserProfile } = useData();
  const [isGenerating, setIsGenerating] = useState(false);

  // Access code securely
  const referralCode = userProfile?.affiliate_code || '';
  const referralLink = referralCode ? `${window.location.origin}/auth?ref=${referralCode}` : '';
  const shareText = `🎉 Rejoins-moi sur BonPlanInfos ! Utilise mon code ${referralCode} pour obtenir des bonus. ${referralLink}`;
  
  // Use real data from profile
  const referralCount = userProfile?.referral_count || 0;
  const referralEarnings = referralCount * 20; // 20 coins per referral

  // Auto-generate if missing on load (Self-healing)
  useEffect(() => {
    const generateIfMissing = async () => {
      if (!loadingProfile && userProfile && !referralCode && !isGenerating) {
        console.log("Referral code missing for user:", userProfile.id, "- Attempting to generate...");
        setIsGenerating(true);
        try {
          const { data, error } = await supabase.rpc('generate_missing_referral_code', { p_user_id: userProfile.id });
          if (error) throw error;
          console.log("Referral code generated successfully:", data);
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
        await navigator.share({ title: 'Rejoignez BonPlanInfos', text: shareText, url: referralLink });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };
  
  const isLoading = loadingProfile || isGenerating;

  if (isLoading && !userProfile) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Programme de parrainage</CardTitle>
        <CardDescription>Invitez vos amis et gagnez des pièces bonus ensemble !</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!referralCode && !isLoading ? (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Code manquant</AlertTitle>
             <AlertDescription>Impossible de charger votre code. Veuillez actualiser la page.</AlertDescription>
             <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="mt-2">Actualiser</Button>
           </Alert>
        ) : (
        <div className="bg-muted/50 p-4 rounded-lg border">
          <h4 className="font-semibold text-primary mb-2">Votre code de parrainage</h4>
          <div className="flex items-center space-x-2">
            <div className="relative w-full">
              <Input
                value={referralCode || 'Génération en cours...'}
                readOnly
                className="bg-background font-mono pr-10 font-bold text-lg tracking-wide text-center md:text-left"
              />
              {isLoading && !referralCode && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button onClick={() => handleCopy(referralCode, "Code copié !")} variant="outline" size="icon" disabled={!referralCode}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={handleShare} variant="outline" size="icon" disabled={!referralCode}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" disabled={!referralCode}>
                        <QrCode className="w-4 h-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md flex flex-col items-center bg-white text-black">
                    <DialogHeader>
                        <DialogTitle className="text-center text-black">Scan pour parrainer</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 bg-white rounded-xl shadow-inner border">
                        {referralLink && <QRCodeCanvas value={referralLink} size={200} includeMargin={true} />}
                    </div>
                    <p className="text-sm text-center text-gray-500 mt-2">Partagez ce code avec vos amis</p>
                </DialogContent>
            </Dialog>
          </div>
          
          <div className="mt-4 p-3 bg-background rounded border text-sm text-muted-foreground break-all">
             <span className="font-semibold block mb-1">Lien direct :</span>
             {referralLink || '...'}
             <Button variant="link" size="sm" className="h-auto p-0 ml-2 text-primary" onClick={() => handleCopy(referralLink, "Lien copié !")}>Copier</Button>
          </div>
        </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-green-500">
            <div className="flex items-center mb-2">
              <Users className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium">Filleuls inscrits</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{referralCount}</p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-yellow-500">
            <div className="flex items-center mb-2">
              <Coins className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-medium">Pièces gagnées</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{referralEarnings} <span className="text-lg font-normal text-muted-foreground">π</span></p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900 text-sm">
          <h4 className="font-semibold mb-2 flex items-center text-blue-700 dark:text-blue-400"><Info className="w-4 h-4 mr-2" /> Fonctionnement</h4>
          <ul className="list-disc pl-5 space-y-1 text-blue-900 dark:text-blue-300">
            <li>Partagez votre code avec vos amis.</li>
            <li>Ils gagnent <strong>10 π</strong> bonus à l'inscription.</li>
            <li>Vous gagnez <strong>20 π</strong> pour chaque ami validé.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralTab;