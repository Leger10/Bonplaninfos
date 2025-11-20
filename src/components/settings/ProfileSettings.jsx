import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';

const ProfileSettings = () => {
  const { user } = useAuth();
  const { userProfile, updateUserProfile } = useData();
  const [loading, setLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    city: userProfile?.city || '',
    country: userProfile?.country || ''
  });

  const countryNames = COUNTRIES.map(c => c.name).sort();

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateUserProfile(user.id, profileForm);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès.",
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
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="text-foreground">Informations personnelles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Nom complet</Label>
            <Input
              id="name"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">Téléphone</Label>
            <Input
              id="phone"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country" className="text-foreground">Pays</Label>
            <Select
              value={profileForm.country}
              onValueChange={(value) => setProfileForm({ ...profileForm, country: value, city: '' })}
            >
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Choisir un pays" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {countryNames.map((country) => (
                  <SelectItem key={country} value={country} className="text-foreground">
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className="text-foreground">Ville</Label>
            <Select
              value={profileForm.city}
              onValueChange={(value) => setProfileForm({ ...profileForm, city: value })}
              disabled={!profileForm.country}
            >
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Choisir une ville" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {profileForm.country && CITIES_BY_COUNTRY[profileForm.country]?.map((city) => (
                  <SelectItem key={city} value={city} className="text-foreground">
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSaveProfile}
          disabled={loading}
          className="gradient-red text-white hover:opacity-90"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;