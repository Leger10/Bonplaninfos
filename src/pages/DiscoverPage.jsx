import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, MapPin, ImageOff, Building, ExternalLink, Star, TrendingUp, Clock, Sparkles, Hotel, Utensils, Coffee, ShoppingBag, Camera, Home, Building2 } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      try {
        console.log('🔍 Début du chargement des lieux...');
        
        let query = supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ Erreur Supabase:', error);
          toast({ 
            title: t('common.error_title'), 
            description: "Impossible de charger les lieux.", 
            variant: 'destructive' 
          });
        } else {
          console.log('✅ Lieux chargés:', data);
          setLocations(data || []);
        }
      } catch (error) {
        console.error('💥 Erreur fetch:', error);
        toast({ 
          title: t('common.error_title'), 
          description: "Erreur lors du chargement.", 
          variant: 'destructive' 
        });
      }
      setLoading(false);
    };

    fetchLocations();
  }, [t, searchQuery]);

  // Fonction pour incrémenter le compteur de vues
  const incrementViewsCount = async (locationId) => {
    try {
      // Récupérer le nombre actuel de vues
      const { data: currentLocation, error: fetchError } = await supabase
        .from('locations')
        .select('views_count')
        .eq('id', locationId)
        .single();

      if (fetchError) {
        console.error('❌ Erreur récupération vues:', fetchError);
        return;
      }

      // Incrémenter le compteur
      const newViewsCount = (currentLocation.views_count || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('locations')
        .update({ 
          views_count: newViewsCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', locationId);

      if (updateError) {
        console.error('❌ Erreur mise à jour vues:', updateError);
      } else {
        console.log('✅ Compteur de vues incrémenté pour:', locationId);
        
        // Mettre à jour l'état local pour refléter le changement
        setLocations(prevLocations => 
          prevLocations.map(location => 
            location.id === locationId 
              ? { ...location, views_count: newViewsCount }
              : location
          )
        );
      }
    } catch (error) {
      console.error('💥 Erreur incrémentation vues:', error);
    }
  };

  // Fonction pour obtenir la première image d'un lieu
  const getFirstImage = (location) => {
    if (location.images && Array.isArray(location.images) && location.images.length > 0) {
      return location.images[0];
    }
    return null;
  };

  // Fonction pour déterminer le statut du lieu
  const getLocationStatus = (location) => {
    const now = new Date();
    const createdAt = new Date(location.created_at);
    const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    
    // Nouveau (moins de 7 jours)
    if (daysSinceCreation <= 7) {
      return {
        type: 'new',
        label: 'Nouveau',
        icon: Sparkles,
        color: 'bg-green-500 text-white',
        iconColor: 'text-white'
      };
    }
    
    // Populaire (beaucoup de vues)
    if (location.views_count > 100) {
      return {
        type: 'popular',
        label: 'Populaire',
        icon: TrendingUp,
        color: 'bg-orange-500 text-white',
        iconColor: 'text-white'
      };
    }
    
    // À découvrir (peu de vues mais récent)
    if (daysSinceCreation <= 30 && location.views_count < 50) {
      return {
        type: 'discover',
        label: 'À découvrir',
        icon: Star,
        color: 'bg-blue-500 text-white',
        iconColor: 'text-white'
      };
    }
    
    return null;
  };

  // Fonction pour déterminer le type basé sur le type_id
  const getLocationType = (location) => {
    // Mapping basé sur les type_id de votre base de données
    const typeMappings = {
      '789b35de-0aed-48a2-99cb-dd6ead850f0b': { name: 'Visite', icon: Camera, color: 'bg-pink-100 text-pink-800 border-pink-200' },
      'e26854f8-e52e-43b4-bea7-1d1f74cdb42c': { name: 'Hôtel', icon: Hotel, color: 'bg-purple-100 text-purple-800 border-purple-200' },
      // Ajoutez d'autres mappings selon vos type_id
    };

    if (location.type_id && typeMappings[location.type_id]) {
      return typeMappings[location.type_id];
    }

    // Fallback basé sur le nom si type_id non reconnu
    const name = location.name?.toLowerCase() || '';
    if (name.includes('hôtel') || name.includes('hotel')) {
      return { name: 'Hôtel', icon: Hotel, color: 'bg-purple-100 text-purple-800 border-purple-200' };
    }
    if (name.includes('restaurant')) {
      return { name: 'Restaurant', icon: Utensils, color: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    if (name.includes('café') || name.includes('cafe') || name.includes('bar')) {
      return { name: 'Café/Bar', icon: Coffee, color: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
    if (name.includes('boutique') || name.includes('magasin') || name.includes('shop')) {
      return { name: 'Shopping', icon: ShoppingBag, color: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
    }

    return { name: 'Lieu', icon: Building, color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  const handleAddLocation = () => {
    if (user) {
      navigate('/add-location');
    } else {
      navigate('/auth');
      toast({ 
        title: "Connexion requise", 
        description: "Vous devez être connecté pour ajouter un lieu." 
      });
    }
  };

  // Ouvrir Google Maps et incrémenter les vues
  const handleGoToMaps = async (location, event) => {
    event.stopPropagation();
    
    // Incrémenter le compteur de vues
    await incrementViewsCount(location.id);
    
    // Ouvrir Google Maps
    if (location.google_maps_link) {
      window.open(location.google_maps_link, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "Lien non disponible",
        description: "Aucun lien Google Maps fourni pour ce lieu.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (locations.length > 0) {
      console.log('🏗️ Données chargées:', locations);
      console.log('📊 Nombre de lieux:', locations.length);
      console.log('🔍 Premier lieu:', locations[0]);
    }
  }, [locations]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('discover_page.title')} - BonPlanInfos</title>
        <meta name="description" content={t('discover_page.subtitle')} />
      </Helmet>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">{t('discover_page.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('discover_page.subtitle')}</p>
        </header>

        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          <div className="relative flex-grow max-w-lg">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder={t('common.search')} 
              className="pl-12 h-12 rounded-full bg-card border-border focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddLocation} className="h-12 rounded-full bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            {t('discover_page.add_place')}
          </Button>
        </div>

        {/* Debug Info */}
        {/* {!loading && locations.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>:</strong> {locations.length} lieu(x) chargé(s)
            </p>
          </div>
        )} */}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des lieux...</p>
          </div>
        ) : locations.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun lieu trouvé</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Aucun lieu ne correspond à votre recherche.' : 'Aucun lieu disponible pour le moment.'}
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Solution:</strong> Vérifiez que vous avez bien des lieux avec <code>is_active = true</code> dans votre base de données.
              </p>
            </div>
            <Button onClick={handleAddLocation} className="mt-4 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier lieu
            </Button>
          </div>
        ) : (
          /* Locations Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {locations.map(location => {
              const firstImage = getFirstImage(location);
              const status = getLocationStatus(location);
              const locationType = getLocationType(location);
              const TypeIcon = locationType.icon;
              
              return (
                <div 
                  key={location.id} 
                  className="bg-card rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-border hover:border-primary/20 group relative"
                >
                  {/* Badge de statut */}
                  {status && (
                    <div className={`absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${status.color} backdrop-blur-sm`}>
                      <status.icon className={`w-3 h-3 ${status.iconColor}`} />
                      {status.label}
                    </div>
                  )}

                  {/* Badge de type */}
                  {locationType && (
                    <div className={`absolute top-3 right-3 z-10 px-2 py-1 rounded-full text-xs font-semibold ${locationType.color} border backdrop-blur-sm flex items-center gap-1`}>
                      <TypeIcon className="w-3 h-3" />
                      {locationType.name}
                    </div>
                  )}

                  {/* Image Container */}
                  <div className="w-full h-48 bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden">
                    {firstImage ? (
                      <img 
                        src={firstImage} 
                        alt={location.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          console.error('❌ Erreur chargement image:', firstImage);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Building className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-sm">Aucune image</span>
                      </div>
                    )}
                    
                    {/* Overlay au hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />

                    {/* Compteur de vues */}
                    <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                      👁️ {location.views_count || 0} vues
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    {/* Nom du lieu */}
                    <h2 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {location.name}
                    </h2>
                    
                    {/* Adresse */}
                    <div className="flex items-start gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {location.address}
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                          {location.city}, {location.country}
                        </p>
                      </div>
                    </div>

                    {/* Description (très courte) */}
                    {location.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {location.description}
                      </p>
                    )}

                    {/* Métriques supplémentaires */}
                    <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {Math.floor((new Date() - new Date(location.created_at)) / (1000 * 60 * 60 * 24))}j
                        </span>
                      </div>
                      
                      {location.rating > 0 && (
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{location.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Bouton Y Aller */}
                    <Button 
                      onClick={(e) => handleGoToMaps(location, e)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={!location.google_maps_link}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Y Aller
                    </Button>

                    {/* Indicateur si pas de lien Maps */}
                    {!location.google_maps_link && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Lien Google Maps non disponible
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default DiscoverPage;