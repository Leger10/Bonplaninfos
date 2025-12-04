import React, { useState, useEffect } from 'react';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';

const ProfileSettings = () => {
  const { user } = useAuth();
  const { userProfile, updateUserProfile } = useData();
  const [loading, setLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    bio: '',
    avatar_url: ''
  });

  // Initialize form with user profile data
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        full_name: userProfile.full_name || '',
        email: userProfile.email || user?.email || '',
        phone: userProfile.phone || '',
        city: userProfile.city || '',
        country: userProfile.country || '',
        bio: userProfile.bio || '',
        avatar_url: userProfile.avatar_url || ''
      });
    }
  }, [userProfile, user]);

  const countryNames = COUNTRIES.map(c => c.name).sort();

  const validateForm = () => {
    if (!profileForm.full_name.trim()) {
      console.error("Validation error: full_name");
      toast({ title: "Erreur", description: "Le nom complet est obligatoire.", variant: "destructive" });
      return false;
    }
    if (!profileForm.email.trim() || !/\S+@\S+\.\S+/.test(profileForm.email)) {
      console.error("Validation error: email");
      toast({ title: "Erreur", description: "L'email est invalide.", variant: "destructive" });
      return false;
    }
    // Validation bio length
    if (profileForm.bio && profileForm.bio.length > 500) {
      console.error("Validation error: bio length");
      toast({ title: "Erreur", description: "La biographie est trop longue (max 500 caractères).", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Utilize the updateUserProfile from DataContext which calls our new RPC
      const result = await updateUserProfile(user.id, profileForm);
      
      if (result.success) {
        toast({
          title: "Profil mis à jour",
          description: "Vos informations ont été sauvegardées avec succès.",
          variant: "success"
        });
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
        action: <Button variant="outline" size="sm" onClick={handleSaveProfile}>Réessayer</Button>
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          Informations personnelles
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Nom complet *</Label>
            <Input
              id="name"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="Votre nom complet"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email *</Label>
            <Input
              id="email"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="votre@email.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">Téléphone</Label>
            <Input
              id="phone"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="+XXX XXXXXXXXX"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar_url" className="text-foreground">URL de l'Avatar</Label>
            <Input
              id="avatar_url"
              value={profileForm.avatar_url}
              onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
              className="bg-secondary border-border text-foreground"
              placeholder="https://exemple.com/photo.jpg"
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
              <SelectContent className="bg-card border-border h-60">
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
              <SelectContent className="bg-card border-border h-60">
                {profileForm.country && CITIES_BY_COUNTRY[profileForm.country]?.map((city) => (
                  <SelectItem key={city} value={city} className="text-foreground">
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="text-foreground">Biographie ({profileForm.bio?.length || 0}/500)</Label>
          <Textarea
            id="bio"
            value={profileForm.bio}
            onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
            className="bg-secondary border-border text-foreground min-h-[100px]"
            placeholder="Parlez-nous un peu de vous..."
            maxLength={500}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={loading}
            className="gradient-red text-white hover:opacity-90 w-full md:w-auto"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;