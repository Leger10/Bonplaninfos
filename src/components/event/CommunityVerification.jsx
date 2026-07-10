import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertOctagon, Users, ExternalLink, ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const CommunityVerification = ({ eventId, eventDate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [hasVerified, setHasVerified] = useState(false);
  const [positiveCount, setPositiveCount] = useState(0);
  const [negativeCount, setNegativeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEventPast, setIsEventPast] = useState(false);
  const [userVerificationType, setUserVerificationType] = useState(null);
  const [tableExists, setTableExists] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const MIN_VERIFICATIONS = 3;
  const WHATSAPP_COMMUNITY_LINK = "https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH";

  // 🔥 VÉRIFIER SI LA TABLE EXISTE
  useEffect(() => {
    const checkTableExists = async () => {
      try {
        const { error } = await supabase
          .from('event_community_verifications')
          .select('id')
          .limit(1);

        if (error && error.code === 'PGRST205') {
          console.log('ℹ️ Table event_community_verifications non trouvée');
          setTableExists(false);
        } else {
          setTableExists(true);
        }
      } catch (err) {
        console.log('ℹ️ Erreur vérification table:', err.message);
        setTableExists(false);
      }
      setIsInitialized(true);
    };

    checkTableExists();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (eventDate) {
      const eventTime = new Date(eventDate).getTime();
      const now = new Date().getTime();
      setIsEventPast(now > eventTime + (60 * 60 * 1000));
    }

    if (eventId && tableExists) {
      fetchVerifications();
    }
  }, [eventId, eventDate, user, isInitialized, tableExists]);

  // 🔥 RÉCUPÉRATION DES VÉRIFICATIONS AVEC GESTION D'ERREUR
  const fetchVerifications = async () => {
    if (!tableExists) return;

    try {
      // Compter les vérifications positives (event_occurred)
      const { count: positiveCount, error: positiveError } = await supabase
        .from('event_community_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('verification_type', 'event_occurred');

      if (positiveError) {
        console.warn('⚠️ Erreur positive count:', positiveError);
      } else {
        setPositiveCount(positiveCount || 0);
      }

      // Compter les vérifications négatives (fraud_report)
      const { count: negativeCount, error: negativeError } = await supabase
        .from('event_community_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('verification_type', 'fraud_report');

      if (negativeError) {
        console.warn('⚠️ Erreur negative count:', negativeError);
      } else {
        setNegativeCount(negativeCount || 0);
      }

      if (user) {
        // Vérifier si l'utilisateur a déjà voté
        const { data, error: userVerifyError } = await supabase
          .from('event_community_verifications')
          .select('verification_type')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (userVerifyError) {
          console.warn('⚠️ Erreur user verification:', userVerifyError);
        } else if (data) {
          setHasVerified(true);
          setUserVerificationType(data.verification_type);
        }
      }
    } catch (err) {
      console.warn('⚠️ Erreur fetch verifications:', err.message);
      // Ne pas afficher d'erreur à l'utilisateur
    }
  };

  const handleVerify = async (type) => {
    if (!tableExists) {
      toast({
        title: t('communityVerification.toast.notAvailable.title') || 'Fonctionnalité non disponible',
        description: t('communityVerification.toast.notAvailable.description') || 'Cette fonctionnalité sera bientôt disponible.',
        variant: "default",
      });
      return;
    }

    if (!user) {
      toast({
        title: t('communityVerification.toast.loginRequired.title') || 'Connexion requise',
        description: t('communityVerification.toast.loginRequired.description') || 'Veuillez vous connecter pour vérifier.',
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_community_verifications')
        .insert({
          event_id: eventId,
          user_id: user.id,
          verification_type: type // 'event_occurred' or 'fraud_report'
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            title: t('communityVerification.toast.alreadyVoted.title') || 'Déjà voté',
            description: t('communityVerification.toast.alreadyVoted.description') || 'Vous avez déjà voté pour cet événement.',
            variant: "default",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: type === 'event_occurred' 
            ? t('communityVerification.toast.success.title') || 'Merci !'
            : t('communityVerification.toast.success.title') || 'Merci !',
          description: t('communityVerification.toast.success.description') || 'Votre avis a été enregistré.',
          className: "bg-green-600 text-white",
        });
        setHasVerified(true);
        setUserVerificationType(type);
        fetchVerifications();
      }
    } catch (err) {
      console.error("Verification error:", err);
      toast({
        title: t('communityVerification.toast.error.title') || 'Erreur',
        description: t('communityVerification.toast.error.description') || 'Une erreur est survenue. Veuillez réessayer.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 SI LA TABLE N'EXISTE PAS, NE RIEN AFFICHER
  if (!isInitialized) {
    return null;
  }

  // 🔥 SI LA TABLE N'EXISTE PAS OU QUE L'ÉVÉNEMENT N'EST PAS PASSÉ
  if (!tableExists || !isEventPast) {
    return null;
  }

  const progressPercentage = Math.min((positiveCount / MIN_VERIFICATIONS) * 100, 100);

  return (
    <Card className="mt-8 border-l-4 border-l-blue-500 bg-background shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              {t('communityVerification.title') || 'Vérification communautaire'}
            </CardTitle>
            <CardDescription>
              {t('communityVerification.description') || 'Aidez la communauté en vérifiant cet événement'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => window.open(WHATSAPP_COMMUNITY_LINK, '_blank')}
          >
            <ExternalLink className="h-4 w-4" /> {t('communityVerification.whatsappButton') || 'Communauté WhatsApp'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {t('communityVerification.positiveLabel') || 'Confirmé'}
                </span>
              </div>
              <div className="text-2xl font-bold text-green-700">{positiveCount}</div>
              <div className="text-xs text-green-600 mt-1">
                {t('communityVerification.positiveConfirmedText') || 'personnes ont confirmé'}
              </div>
            </div>
            
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {t('communityVerification.negativeLabel') || 'Signalé'}
                </span>
              </div>
              <div className="text-2xl font-bold text-red-700">{negativeCount}</div>
              <div className="text-xs text-red-600 mt-1">
                {t('communityVerification.negativeReportedText') || 'personnes ont signalé'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>{t('communityVerification.progressLabel') || 'Niveau de confiance'}</span>
              <span className={positiveCount >= MIN_VERIFICATIONS ? "text-green-600" : "text-amber-600"}>
                {positiveCount >= MIN_VERIFICATIONS 
                  ? '✅ Vérifié' 
                  : `${positiveCount}/${MIN_VERIFICATIONS}`}
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className={cn(
                "h-3 bg-secondary",
                positiveCount >= MIN_VERIFICATIONS ? "[&>div]:bg-green-500" : "[&>div]:bg-amber-500"
              )}
            />
            <p className="text-xs text-muted-foreground">
              {positiveCount >= MIN_VERIFICATIONS 
                ? (t('communityVerification.verifiedMessage') || 'Cet événement est vérifié par la communauté !')
                : (t('communityVerification.pendingMessage', { remaining: MIN_VERIFICATIONS - positiveCount }) || `En attente de ${MIN_VERIFICATIONS - positiveCount} confirmations supplémentaires`)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {hasVerified ? (
              <div className="w-full">
                <Button variant="outline" disabled className="w-full bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {userVerificationType === 'event_occurred' 
                    ? (t('communityVerification.alreadyConfirmedMessage') || 'Vous avez confirmé cet événement')
                    : (t('communityVerification.alreadyReportedMessage') || 'Vous avez signalé cet événement')}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {t('communityVerification.thanksMessage') || 'Merci pour votre contribution !'}
                </p>
              </div>
            ) : (
              <div className="flex gap-3 w-full">
                <Button 
                  onClick={() => handleVerify('event_occurred')} 
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('communityVerification.confirmButton') || 'Confirmer'}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleVerify('fraud_report')} 
                  disabled={loading}
                  className="flex-1"
                >
                  <AlertOctagon className="mr-2 h-4 w-4" />
                  {t('communityVerification.reportButton') || 'Signaler'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunityVerification;