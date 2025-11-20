
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DiscoverPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: t('common.error_title'), description: "Impossible de charger les lieux.", variant: 'destructive' });
      } else {
        setLocations(data);
      }
      setLoading(false);
    };

    fetchLocations();
  }, [t]);

  const handleAddLocation = () => {
    if (user) {
      navigate('/add-location');
    } else {
      navigate('/auth');
      toast({ title: "Connexion requise", description: "Vous devez être connecté pour ajouter un lieu." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('discover_page.title')} - BonPlanInfos</title>
        <meta name="description" content={t('discover_page.subtitle')} />
      </Helmet>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">{t('discover_page.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('discover_page.subtitle')}</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          <div className="relative flex-grow max-w-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder={t('common.search')} 
              className="pl-12 h-12 rounded-full bg-card border-border focus-visible:ring-primary" 
            />
          </div>
          <Button onClick={handleAddLocation} className="h-12 rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            {t('discover_page.add_place')}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p>Chargement des lieux...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map(location => (
              <div key={location.id} className="bg-card rounded-lg shadow-md overflow-hidden">
                {/* Placeholder for location image */}
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">Image du lieu</p>
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{location.name}</h2>
                  <p className="text-muted-foreground text-sm">{location.address}</p>
                  <p className="text-muted-foreground text-sm">{location.city}, {location.country}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DiscoverPage;
