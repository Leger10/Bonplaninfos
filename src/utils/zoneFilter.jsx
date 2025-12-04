// utils/zoneFilter.jsx

import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries'; // Chemin corrigé

/**
 * Filtre les données par zone (pays + ville) selon le profil utilisateur
 * @param {Array} data - Les données à filtrer
 * @param {Object} userProfile - Le profil de l'utilisateur connecté
 * @param {Object} options - Options de filtrage
 * @returns {Array} Données filtrées
 */
export const filterByZone = (data, userProfile, options = {}) => {
    if (!data || !userProfile || !Array.isArray(data)) return data || [];
    
    // Super admin peut tout voir
    if (userProfile.user_type === 'super_admin') {
        // Filtrer par pays spécifique si demandé
        if (options.filterCountry) {
            return data.filter(item => {
                const itemCountry = getItemCountry(item, options);
                return itemCountry === options.filterCountry;
            });
        }
        return data;
    }
    
    // Récupérer la zone de l'utilisateur
    const userCountry = userProfile.country;
    const userCity = userProfile.city;
    
    if (!userCountry) {
        console.warn('Aucun pays défini pour l\'utilisateur', userProfile);
        return [];
    }
    
    // Admin ne voit que les données de son pays
    if (userProfile.user_type === 'admin') {
        return data.filter(item => {
            const itemCountry = getItemCountry(item, options);
            
            // Premier niveau : filtrer par pays
            if (itemCountry !== userCountry) return false;
            
            // Deuxième niveau : filtrer par ville si spécifiée
            if (userCity && options.filterByCity !== false) {
                const itemCity = getItemCity(item, options);
                // Si l'admin a une ville spécifique, filtrer par ville
                // Sinon, montrer toutes les données du pays
                return !itemCity || itemCity === userCity;
            }
            
            return true;
        });
    }
    
    // Secretary (si applicable)
    if (userProfile.user_type === 'secretary' && userProfile.assigned_zone) {
        return data.filter(item => item.zone_id === userProfile.assigned_zone);
    }
    
    return data;
};

/**
 * Construit une requête Supabase avec filtrage par zone
 * @param {Object} supabaseQuery - La requête Supabase
 * @param {Object} userProfile - Le profil de l'utilisateur
 * @param {string} tableName - Nom de la table
 * @param {Object} options - Options de filtrage
 * @returns {Object} Requête modifiée
 */
export const buildZoneQuery = (supabaseQuery, userProfile, tableName, options = {}) => {
    if (!userProfile || !supabaseQuery) return supabaseQuery;
    
    // Super admin n'a pas de filtre par défaut
    if (userProfile.user_type === 'super_admin') {
        // Mais peut filtrer par pays si demandé
        if (options.filterCountry) {
            return supabaseQuery.eq('country', options.filterCountry);
        }
        return supabaseQuery;
    }
    
    const userCountry = userProfile.country;
    const userCity = userProfile.city;
    
    if (!userCountry) return supabaseQuery;
    
    // Appliquer le filtre selon la table
    switch(tableName) {
        case 'profiles':
        case 'users':
            let query = supabaseQuery.eq('country', userCountry);
            // Si l'admin a une ville spécifique, filtrer aussi par ville
            if (userCity && options.filterByCity !== false) {
                query = query.eq('city', userCity);
            }
            return query;
            
        case 'events':
        case 'promotions':
        case 'announcements':
            query = supabaseQuery.eq('country', userCountry);
            if (userCity && options.filterByCity !== false) {
                query = query.eq('city', userCity);
            }
            return query;
            
        case 'transactions':
        case 'coin_spending':
            query = supabaseQuery.eq('country', userCountry);
            if (userCity && options.filterByCity !== false) {
                query = query.eq('city', userCity);
            }
            return query;
            
        case 'paiements_admin':
            query = supabaseQuery.eq('licence.admin.country', userCountry);
            if (userCity && options.filterByCity !== false) {
                query = query.eq('licence.admin.city', userCity);
            }
            return query;
            
        case 'admin_revenue':
        case 'admin_salary_history':
            query = supabaseQuery.eq('country', userCountry);
            if (userCity && options.filterByCity !== false) {
                query = query.eq('city', userCity);
            }
            return query;
            
        case 'partners':
            query = supabaseQuery.eq('country', userCountry);
            if (userCity && options.filterByCity !== false) {
                query = query.eq('city', userCity);
            }
            return query;
            
        default:
            // Pour les tables avec country et city
            query = supabaseQuery.eq('country', userCountry);
            if (userCity && options.filterByCity !== false) {
                query = query.eq('city', userCity);
            }
            return query;
    }
};

/**
 * Obtient le pays d'un élément
 * @param {Object} item - L'élément
 * @param {Object} options - Options
 * @returns {string} Code pays
 */
const getItemCountry = (item, options) => {
    const countryField = options.countryField || 'country';
    return item[countryField] || 
           item.zone_id || 
           item.zone?.id || 
           item.admin?.country ||
           item.user?.country ||
           item.profile?.country ||
           null;
};

/**
 * Obtient la ville d'un élément
 * @param {Object} item - L'élément
 * @param {Object} options - Options
 * @returns {string} Ville
 */
const getItemCity = (item, options) => {
    const cityField = options.cityField || 'city';
    return item[cityField] || 
           item.user?.city ||
           item.profile?.city ||
           item.admin?.city ||
           null;
};

/**
 * Obtient la zone complète de l'utilisateur (pays + ville)
 * @param {Object} userProfile - Profil utilisateur
 * @returns {Object} { country: string, city: string }
 */
export const getUserZone = (userProfile) => {
    if (!userProfile) return { country: null, city: null };
    
    return {
        country: userProfile.country || 
                userProfile.zone_id || 
                userProfile.assigned_country || 
                null,
        city: userProfile.city ||
              userProfile.assigned_city ||
              null
    };
};

/**
 * Vérifie si l'utilisateur a accès à une zone spécifique
 * @param {Object} userProfile - Profil utilisateur
 * @param {string} targetCountry - Pays cible
 * @param {string} targetCity - Ville cible (optionnel)
 * @returns {boolean} True si accès autorisé
 */
export const hasZoneAccess = (userProfile, targetCountry, targetCity = null) => {
    if (!userProfile || !targetCountry) return false;
    
    // Super admin a accès à tout
    if (userProfile.user_type === 'super_admin') return true;
    
    const userZone = getUserZone(userProfile);
    
    // Vérifier le pays d'abord
    if (userZone.country !== targetCountry) return false;
    
    // Si l'utilisateur a une ville spécifique, vérifier aussi la ville
    if (userZone.city && targetCity) {
        return userZone.city === targetCity;
    }
    
    // Si l'utilisateur n'a pas de ville spécifique, accès à tout le pays
    return true;
};

/**
 * Formate l'affichage de la zone
 * @param {string} countryCode - Code du pays
 * @param {string} city - Ville
 * @returns {string} Nom formaté de la zone
 */
export const formatZoneDisplay = (countryCode, city = null) => {
    if (!countryCode) return 'Non spécifiée';
    
    // Trouver le nom du pays
    const country = COUNTRIES.find(c => c.code === countryCode);
    const countryName = country ? country.name : countryCode;
    
    if (!city) return countryName;
    
    return `${city}, ${countryName}`;
};

/**
 * Obtenir la liste des villes pour un pays
 * @param {string} countryCode - Code du pays
 * @returns {Array} Liste des villes
 */
export const getCitiesByCountry = (countryCode) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return [];
    
    return CITIES_BY_COUNTRY[country.name] || [];
};

/**
 * Obtenir les statistiques de zone pour un admin
 * @param {Object} userProfile - Profil de l'admin
 * @returns {Object} { country: string, city: string, display: string }
 */
export const getAdminZoneInfo = (userProfile) => {
    if (!userProfile) return null;
    
    const zone = getUserZone(userProfile);
    const cities = zone.country ? getCitiesByCountry(zone.country) : [];
    
    return {
        country: zone.country,
        city: zone.city,
        countryName: zone.country ? formatZoneDisplay(zone.country) : null,
        cityName: zone.city || null,
        display: formatZoneDisplay(zone.country, zone.city),
        availableCities: cities,
        isCitySpecific: !!zone.city
    };
};

/**
 * Composant pour afficher la zone de l'admin
 */
export const AdminZoneBadge = ({ userProfile, className = "" }) => {
    if (!userProfile) return null;
    
    const zoneInfo = getAdminZoneInfo(userProfile);
    
    if (!zoneInfo || !zoneInfo.country) {
        return (
            <div className={`text-sm text-muted-foreground ${className}`}>
                Zone non définie
            </div>
        );
    }
    
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-sm font-medium">Zone :</span>
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md text-xs">
                {zoneInfo.isCitySpecific ? (
                    <>
                        <span className="font-semibold">{zoneInfo.city}</span>
                        <span className="text-muted-foreground">({zoneInfo.countryName})</span>
                    </>
                ) : (
                    <span className="font-semibold">{zoneInfo.countryName}</span>
                )}
            </div>
        </div>
    );
};

/**
 * Hook pour gérer le filtrage par zone dans les composants
 */
export const useZoneFilter = (userProfile) => {
    const zoneInfo = getAdminZoneInfo(userProfile);
    
    const filterData = (data, options = {}) => {
        return filterByZone(data, userProfile, options);
    };
    
    const buildQuery = (supabaseQuery, tableName, options = {}) => {
        return buildZoneQuery(supabaseQuery, userProfile, tableName, options);
    };
    
    const checkAccess = (targetCountry, targetCity = null) => {
        return hasZoneAccess(userProfile, targetCountry, targetCity);
    };
    
    return {
        zoneInfo,
        filterData,
        buildQuery,
        checkAccess,
        formatZoneDisplay,
        getCitiesByCountry
    };
};

export default {
    filterByZone,
    buildZoneQuery,
    getUserZone,
    hasZoneAccess,
    formatZoneDisplay,
    getCitiesByCountry,
    getAdminZoneInfo,
    AdminZoneBadge,
    useZoneFilter
};