import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertOctagon, Users, ExternalLink, ShieldCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const CommunityVerification = ({ eventId, eventDate }) => {
  const { user } = useAuth();
  const [hasVerified, setHasVerified] = useState(false);
  const [positiveCount, setPositiveCount] = useState(0);
  const [negativeCount, setNegativeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEventPast, setIsEventPast] = useState(false);
  const [userVerificationType, setUserVerificationType] = useState(null);
  
  const MIN_VERIFICATIONS = 3;
  const WHATSAPP_COMMUNITY_LINK = "https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH";

  useEffect(() => {
    if (eventDate) {
      const eventTime = new Date(eventDate).getTime();
      const now = new Date().getTime();
      setIsEventPast(now > eventTime + (60 * 60 * 1000));
    }

    if (eventId) {
      fetchVerifications();
    }
  }, [eventId, eventDate, user]);

  const fetchVerifications = async () => {
    try {
      // Compter les vérifications positives (event_occurred)
      const { count: positiveCount, error: positiveError } = await supabase
        .from('event_community_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('verification_type', 'event_occurred');

      if (positiveError) throw positiveError;
      setPositiveCount(positiveCount || 0);

      // Compter les vérifications négatives (fraud_report)
      const { count: negativeCount, error: negativeError } = await supabase
        .from('event_community_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('verification_type', 'fraud_report');

      if (negativeError) throw negativeError;
      setNegativeCount(negativeCount || 0);

      if (user) {
        // Vérifier si l'utilisateur a déjà voté
        const { data, error: userVerifyError } = await supabase
          .from('event_community_verifications')
          .select('verification_type')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (userVerifyError) throw userVerifyError;
        if (data) {
          setHasVerified(true);
          setUserVerificationType(data.verification_type);
        }
      }
    } catch (err) {
      console.error("Error fetching verifications:", err);
    }
  };

  const handleVerify = async (type) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour vérifier cet événement.", variant: "destructive" });
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
          toast({ title: "Déjà voté", description: "Vous avez déjà donné votre avis sur cet événement.", variant: "warning" });
        } else {
          throw error;
        }
      } else {
        toast({ 
          title: type === 'event_occurred' ? "Merci !" : "Signalement reçu", 
          description: "Votre contribution aide à sécuriser la communauté.",
          className: "bg-green-600 text-white"
        });
        setHasVerified(true);
        setUserVerificationType(type);
        fetchVerifications();
      }
    } catch (err) {
      console.error("Verification error:", err);
      toast({ title: "Erreur", description: "Impossible d'enregistrer votre vérification.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isEventPast) return null;

  const progressPercentage = Math.min((positiveCount / MIN_VERIFICATIONS) * 100, 100);

  return (
    <Card className="mt-8 border-l-4 border-l-blue-500 bg-background shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-500" />
                Vérification Communautaire
                </CardTitle>
                <CardDescription>
                Confirmez la tenue de l'événement pour débloquer les fonds de l'organisateur.
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-200 hover:bg-green-50" onClick={() => window.open(WHATSAPP_COMMUNITY_LINK, '_blank')}>
                <ExternalLink className="h-4 w-4" /> Communauté WhatsApp
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
                  <span className="text-sm font-medium text-green-800">Avis favorables</span>
                </div>
                <div className="text-2xl font-bold text-green-700">{positiveCount}</div>
                <div className="text-xs text-green-600 mt-1">ont confirmé la tenue</div>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Signalements</span>
                </div>
                <div className="text-2xl font-bold text-red-700">{negativeCount}</div>
                <div className="text-xs text-red-600 mt-1">ont signalé un problème</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                    <span>Progression de la validation</span>
                    <span className={positiveCount >= MIN_VERIFICATIONS ? "text-green-600" : "text-amber-600"}>
                        {positiveCount}/{MIN_VERIFICATIONS} confirmations requises
                    </span>
                </div>
                <Progress value={progressPercentage} className="h-3 bg-secondary" indicatorClassName={positiveCount >= MIN_VERIFICATIONS ? "bg-green-500" : "bg-amber-500"} />
                <p className="text-xs text-muted-foreground">
                    {positiveCount >= MIN_VERIFICATIONS 
                        ? "✅ L'événement est vérifié. Les retraits sont autorisés." 
                        : `⚠️ En attente de ${MIN_VERIFICATIONS - positiveCount} confirmation(s) supplémentaire(s) pour autoriser les retraits.`}
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {hasVerified ? (
                  <div className="w-full">
                    <Button variant="outline" disabled className="w-full bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {userVerificationType === 'event_occurred' 
                        ? "Vous avez confirmé la tenue de l'événement"
                        : "Vous avez signalé un problème avec cet événement"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Merci pour votre contribution à la vérification communautaire.
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
                      J'y étais, c'est valide
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleVerify('fraud_report')} 
                      disabled={loading}
                      className="flex-1"
                    >
                      <AlertOctagon className="mr-2 h-4 w-4" />
                      Signaler un problème
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