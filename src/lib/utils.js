import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Vérifie si l'utilisateur a les permissions pour effectuer un remboursement.
 * Autorisé uniquement pour :
 * 1. Super Admin
 * 2. Secrétaire nommé par un Super Admin (appointed_by_super_admin = true)
 * 
 * @param {Object} user - Le profil utilisateur (userProfile)
 * @returns {boolean} - True si autorisé, sinon false
 */
export function checkRefundPermissions(user) {
  if (!user) return false;
  
  // Cas 1: Super Admin
  if (user.user_type === 'super_admin') return true;
  
  // Cas 2: Secrétaire créé par un Super Admin
  if (user.user_type === 'secretary' && user.appointed_by_super_admin === true) return true;
  
  return false;
}

/**
 * Formate une durée en jours en format lisible (ex: "1 an" ou "30 jours")
 * @param {number} days - Nombre de jours
 * @returns {string} - Durée formatée
 */
export function formatContractDuration(days) {
  if (!days) return "0 jour";
  if (days === 365 || days === 366) return "1 an";
  if (days === 730 || days === 731) return "2 ans";
  return `${days} jours`;
}

/**
 * Exécute une fonction asynchrone avec tentatives multiples en cas d'échec
 * Inclut un backoff exponentiel et une gestion d'erreur robuste.
 * 
 * @param {Function} fn - Fonction à exécuter (doit retourner une Promise)
 * @param {number} retries - Nombre de tentatives (défaut: 3)
 * @param {number} delay - Délai initial en ms (défaut: 1000)
 * @returns {Promise<any>} - Résultat de la fonction ou objet d'erreur standardisé
 */
export async function fetchWithRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (err) {
    console.error(`[fetchWithRetry] Erreur détectée: ${err.message || err}. Tentatives restantes: ${retries}`);
    
    if (retries <= 0) {
      console.error('[fetchWithRetry] Nombre maximum de tentatives atteint. Retour d\'une erreur par défaut.');
      // Retourne une structure compatible avec Supabase { data, error } pour éviter les crashs de déstructuration
      return { data: null, error: err };
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    // Backoff exponentiel : on double le délai à chaque tentative
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Formate un montant avec séparateur de milliers et devise FCFA
 * @param {number} amount - Montant à formater
 * @param {string} currency - Devise (défaut: "FCFA")
 * @returns {string} - Montant formaté (ex: "1 000 FCFA")
 */
export function formatCurrency(amount, currency = 'FCFA') {
  if (amount === undefined || amount === null) return '0 ' + currency;
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
}

/**
 * Formate un montant avec séparateur de milliers sans devise
 * @param {number} amount - Montant à formater
 * @returns {string} - Montant formaté (ex: "1 000")
 */
export function formatCurrencySimple(amount) {
  if (amount === undefined || amount === null) return '0';
  return new Intl.NumberFormat('fr-FR').format(amount);
}

/**
 * Formate une date en format français complet
 * @param {string|Date} date - Date à formater
 * @returns {string} - Date formatée (ex: "19 février 2026")
 */
export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Extrait le chemin relatif d'un fichier à partir d'une URL Supabase Storage
 * Supprime le domaine et le nom du bucket pour ne garder que le chemin du fichier
 * Ex: .../bucket/path/file.jpg -> path/file.jpg
 * @param {string} url - URL complète du fichier
 * @returns {string} - Chemin relatif du fichier
 */
export function extractStoragePath(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Structure typique Supabase: /storage/v1/object/public/:bucket/:path*
    // On cherche 'public' et on prend tout ce qui est après le bucket (index + 2)
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex !== -1 && pathParts.length > publicIndex + 2) {
      return decodeURIComponent(pathParts.slice(publicIndex + 2).join('/'));
    }
    
    // Fallback simple si la structure ne correspond pas exactement
    return urlObj.pathname.substring(1); 
  } catch (e) {
    return url;
  }
}