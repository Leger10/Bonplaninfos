import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertOctagon, Users, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const CommunityVerification = ({ eventId, eventDate }) => {
  const { user } = useAuth();
  const [hasVerified, setHasVerified] = useState(false);
  const [verificationCount, setVerificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEventPast, setIsEventPast] = useState(false);
  
  const MIN_VERIFICATIONS = 3;
  const WHATSAPP_COMMUNITY_LINK = "https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH"; // Lien générique, à remplacer par le vrai lien

  useEffect(() => {
    // Check if event is past (allow 1 hour buffer after start time)
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
      const { count, error } = await supabase
        .from('event_community_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('verification_type', 'event_occurred');

      if (error) throw error;
      setVerificationCount(count || 0);

      if (user) {
        // Use maybeSingle() instead of single() to avoid PGRST116 error when no row exists
        const { data, error: userVerifyError } = await supabase
          .from('event_community_verifications')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (userVerifyError) throw userVerifyError;
        if (data) setHasVerified(true);
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
        fetchVerifications();
      }
    } catch (err) {
      console.error("Verification error:", err);
      toast({ title: "Erreur", description: "Impossible d'enregistrer votre vérification.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isEventPast) return null; // Don't show before event happens

  const progressPercentage = Math.min((verificationCount / MIN_VERIFICATIONS) * 100, 100);

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
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                    <span>Progression de la validation</span>
                    <span className={verificationCount >= MIN_VERIFICATIONS ? "text-green-600" : "text-amber-600"}>
                        {verificationCount}/{MIN_VERIFICATIONS} confirmations
                    </span>
                </div>
                <Progress value={progressPercentage} className="h-3 bg-secondary" indicatorClassName={verificationCount >= MIN_VERIFICATIONS ? "bg-green-500" : "bg-amber-500"} />
                <p className="text-xs text-muted-foreground">
                    {verificationCount >= MIN_VERIFICATIONS 
                        ? "✅ L'événement est vérifié. Les retraits sont autorisés." 
                        : "⚠️ En attente de plus de confirmations pour autoriser les retraits."}
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {hasVerified ? (
                <Button variant="outline" disabled className="w-full bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Avis enregistré
                </Button>
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
                        className="px-4"
                        title="Signaler comme faux/annulé"
                    >
                        <AlertOctagon className="h-4 w-4" />
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