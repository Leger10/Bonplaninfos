import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Search, MapPin, Star, PlusCircle, Navigation, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';
import { Presentation, Palette, Theater, Music, Trophy, Trees, Flower2, Umbrella, BedDouble, Building2, UtensilsCrossed, GlassWater, Coffee, Library, School, School2, Landmark, ShoppingBag, PartyPopper, Briefcase, Hotel as Hospital, Sun, Grip, Tent, Dumbbell, Tractor, GalleryVertical, Film, Laptop, Gamepad2, Heart, ParkingCircle, Waves, Church, Users } from 'lucide-react';

const iconMap = {
    Presentation, Palette, Theater, Music, Trophy, Trees, Flower2, Umbrella, BedDouble, Building2,
    UtensilsCrossed, GlassWater, Coffee, Library, School, School2, Landmark, ShoppingBag, PartyPopper,
    Briefcase, Hospital, Sun, Grip, Tent, Dumbbell, Tractor, GalleryVertical, Film, Laptop, Gamepad2, Heart,
    ParkingCircle, Waves, Church, Users
};

const LocationCard = React.memo(({ location }) => {
  const handleNavigationClick = (e) => {
    e.stopPropagation();
    if(location.google_maps_link) {
      window.open(location.google_maps_link, '_blank', 'noopener,noreferrer');
    }
  };
  
  const IconComponent = iconMap[location.type_icon] || MapPin;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="cursor-pointer flex flex-col h-full"
    >
      <Card className="overflow-hidden h-full flex flex-col glass-effect">
        <div className="w-full h-40 bg-muted overflow-hidden relative">
          <img
            src={location.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=870'}
            alt={`Image de ${location.name}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-background/70 backdrop-blur-sm p-2 rounded-full flex items-center gap-2 text-xs">
            <IconComponent className="w-4 h-4 text-primary" />
            <span>{location.type_name}</span>
          </div>
        </div>
        <CardContent className="p-4 flex-grow">
          <h3 className="font-bold truncate">{location.name}</h3>
          <p className="text-sm text-muted-foreground truncate flex items-center">
            <MapPin className="w-3 h-3 mr-1" /> {location.address}, {location.city}
          </p>
          {location.rating && (
            <div className="flex items-center text-sm mt-2">
              <Star className="w-4 h-4 mr-1 text-yellow-400" />
              <span>{location.rating} ({location.total_reviews} avis)</span>
            </div>
          )}
        </CardContent>
        {location.google_maps_link && (
          <CardFooter className="p-4 pt-0">
             <Button className="w-full" onClick={handleNavigationClick}>
                <Navigation className="w-4 h-4 mr-2" />
                Y aller
              </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
});

const DiscoverPage = () => {
  const [locations, setLocations] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    searchTerm: '',
    selectedTypes: [],
    selectedCountry: '',
    selectedCity: '',
  });

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_locations', {
        p_search_query: filters.searchTerm || null,
        p_type_slugs: filters.selectedTypes.length > 0 ? filters.selectedTypes : null,
        p_city: filters.selectedCity || null,
        p_country: filters.selectedCountry || null,
      });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      toast({
        title: 'Erreur de recherche',
        description: "Impossible d'appliquer les filtres.",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const { data, error } = await supabase.from('location_types').select('name, slug, icon').eq('is_active', true).order('name');
        if (error) throw error;
        setLocationTypes(data);
      } catch (error) {
        toast({ title: 'Erreur', description: 'Impossible de charger les types de lieux.' });
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleFilterChange = (type, value) => {
    setFilters(prev => {
        const currentValues = prev[type] || [];
        if (currentValues.includes(value)) {
            return { ...prev, [type]: currentValues.filter(item => item !== value) };
        } else {
            return { ...prev, [type]: [...currentValues, value] };
        }
    });
  };

  const handleCountryChange = (countryName) => {
    setFilters(prev => ({
      ...prev,
      selectedCountry: countryName,
      selectedCity: '' // Reset city when country changes
    }));
  };
  
  const handleCityChange = (cityName) => {
    setFilters(prev => ({ ...prev, selectedCity: cityName }));
  };

  const resetFilters = () => {
    setFilters({
        searchTerm: '',
        selectedTypes: [],
        selectedCountry: '',
        selectedCity: '',
    });
  };
  
  const availableCities = useMemo(() => {
    return filters.selectedCountry ? CITIES_BY_COUNTRY[filters.selectedCountry] || [] : [];
  }, [filters.selectedCountry]);
  
  const activeFilterCount = filters.selectedTypes.length + (filters.selectedCity ? 1 : 0) + (filters.selectedCountry ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Découvrir des lieux - BonPlanInfos</title>
        <meta name="description" content="Explorez les meilleurs restaurants, bars, boutiques et lieux partagés par la communauté." />
      </Helmet>
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-3xl font-bold">Découvrir des lieux</h1>
                <p className="text-muted-foreground">Trouvez les perles rares partagées par la communauté.</p>
            </div>
            <Button onClick={() => navigate('/add-location')}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Ajouter un lieu
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un lieu, une ville..."
                className="pl-10 h-12 rounded-full"
                value={filters.searchTerm}
                onChange={(e) => setFilters(p => ({...p, searchTerm: e.target.value}))}
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-12 rounded-full relative">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />Filtres
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{activeFilterCount}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader><SheetTitle>Filtres</SheetTitle></SheetHeader>
                <div className="py-4 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Type de lieu</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {locationTypes.map(type => (
                            <div key={type.slug} className="flex items-center space-x-2">
                                <Checkbox id={`type-${type.slug}`} checked={filters.selectedTypes.includes(type.slug)} onCheckedChange={() => handleFilterChange('selectedTypes', type.slug)} />
                                <Label htmlFor={`type-${type.slug}`} className="cursor-pointer">{type.name}</Label>
                            </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Pays</h3>
                    <Select value={filters.selectedCountry} onValueChange={handleCountryChange}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(country => (
                          <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {availableCities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Ville</h3>
                     <Select value={filters.selectedCity} onValueChange={handleCityChange}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner une ville" /></SelectTrigger>
                      <SelectContent>
                        {availableCities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                </div>
                <SheetFooter>
                    <Button variant="outline" onClick={resetFilters}>Réinitialiser</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </motion.div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : locations.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.05 }}
          >
            {locations.map(location => (
              <LocationCard key={location.location_id} location={location} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">Aucun lieu trouvé avec ces filtres.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DiscoverPage;