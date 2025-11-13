import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';

const PreferencesSettings = () => {
  const { user } = useAuth();
  const { userProfile, updateUserProfile } = useData();
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(20);

  useEffect(() => {
    if (userProfile && userProfile.notification_radius) {
      setRadius(userProfile.notification_radius);
    }
  }, [userProfile]);

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await updateUserProfile(user.id, { notification_radius: radius });
      toast({
        title: "Préférences mises à jour",
        description: "Vos préférences ont été sauvegardées avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-effect border-[#C9A227]/20">
      <CardHeader>
        <CardTitle className="text-white">Préférences de découverte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-white mb-4 block">
            Rayon de découverte: {radius} km
          </Label>
          <Slider
            value={[radius]}
            onValueChange={(value) => setRadius(value[0])}
            max={100}
            min={5}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>5 km</span>
            <span>50 km</span>
            <span>100 km</span>
          </div>
        </div>

        <Button
          onClick={handleSavePreferences}
          disabled={loading}
          className="gradient-gold text-[#0B0B0D] hover:opacity-90"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Sauvegarder
        </Button>
      </CardContent>
    </Card>
  );
};

export default PreferencesSettings;