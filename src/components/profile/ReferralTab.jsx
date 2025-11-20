import React from 'react';
import { Share2, Users, Coins, Copy, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';

const ReferralTab = ({ referralData }) => {
  const { userProfile, loadingProfile } = useData();

  const referralCode = userProfile?.affiliate_code || '';
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;
  const shareText = `🎉 Rejoins-moi sur BonPlanInfos pour découvrir les meilleurs plans ! Utilise mon code de parrainage pour obtenir des bonus : ${referralCode}\n\n${referralLink}`;

  const handleCopy = (textToCopy, successMessage) => {
    if (!textToCopy) {
      toast({ title: "Erreur", description: "Code de parrainage non disponible.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copié !",
      description: successMessage,
    });
  };

  const handleShare = async () => {
    if (!referralCode) {
      toast({ title: "Erreur", description: "Code de parrainage non disponible.", variant: "destructive" });
      return;
    }
    const shareData = {
      title: 'Rejoignez BonPlanInfos !',
      text: shareText,
      url: referralLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Erreur de partage:', error);
      toast({
        title: "Erreur",
        description: "Le partage a échoué.",
        variant: "destructive",
      });
    }
  };
  
  const isAffiliateCodeReady = !!referralCode;

  if (loadingProfile && !userProfile) {
    return (
        <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Programme de parrainage</CardTitle>
        <CardDescription>Invitez vos amis et gagnez des pièces bonus ensemble !</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 p-4 rounded-lg border">
          <h4 className="font-semibold text-primary mb-2">Votre code de parrainage</h4>
          <div className="flex items-center space-x-2">
            <div className="relative w-full">
              <Input
                value={isAffiliateCodeReady ? referralCode : 'Génération...'}
                readOnly
                className="bg-background font-mono pr-10"
              />
              {loadingProfile && !isAffiliateCodeReady && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button
              onClick={() => handleCopy(referralCode, "Code de parrainage copié !")}
              variant="outline"
              size="icon"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground flex-shrink-0"
              disabled={!isAffiliateCodeReady}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              size="icon"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground flex-shrink-0"
              disabled={!isAffiliateCodeReady}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Users className="w-5 h-5 text-green-400 mr-2" />
              <span className="font-medium">Filleuls inscrits</span>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {referralData?.count || 0}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Coins className="w-5 h-5 text-primary mr-2" />
              <span className="font-medium">Pièces gagnées</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {referralData?.coins || 0}
            </p>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">Comment ça marche ?</h4>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li>• Partagez votre lien ou code de parrainage.</li>
            <li>• Votre filleul reçoit <strong>10 pièces bonus</strong> à l'inscription.</li>
            <li>• Vous gagnez <strong>20 pièces bonus</strong> pour chaque ami qui s'inscrit via votre code.</li>
            <li className="flex items-start pt-2">
                <Info className="w-4 h-4 mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
                <span>Les pièces bonus sont utilisables pour interagir, mais <strong>ne génèrent pas de revenus</strong> pour les organisateurs.</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralTab;