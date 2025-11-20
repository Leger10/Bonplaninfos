import { supabase } from '@/lib/customSupabaseClient';

class LocationService {
  async detectUserLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("La géolocalisation n'est pas supportée par ce navigateur.");
        resolve({ city: 'Abidjan', country: "Côte d'Ivoire" });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();

            if (data.address) {
              const city = data.address.city || data.address.town || data.address.village;
              const country = data.address.country;
              resolve({ city, country });
            } else {
              resolve({ city: 'Abidjan', country: "Côte d'Ivoire" });
            }
          } catch (error) {
            console.error("Erreur lors de la récupération de l'adresse:", error);
            resolve({ city: 'Abidjan', country: "Côte d'Ivoire" });
          }
        },
        (error) => {
          console.warn("Erreur de géolocalisation:", error.message);
          resolve({ city: 'Abidjan', country: "Côte d'Ivoire" });
        }
      );
    });
  }

  async getLocalEvents(city, country) {
    if (!city || !country) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, organizer:organizer_id(full_name)')
        .eq('city', city)
        .eq('country', country)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Erreur lors de la récupération des événements locaux:", error.message);
      return [];
    }
  }
}

export const locationService = new LocationService();