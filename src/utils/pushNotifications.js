import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

/**
 * ============================================================================
 * VAPID KEY INTEGRATION GUIDE (PUSH NOTIFICATIONS)
 * ============================================================================
 * Pour que les notifications Web Push fonctionnent, vous devez configurer 
 * vos clés VAPID (Voluntary Application Server Identification).
 * 
 * 1. DANS VOTRE ENVIRONNEMENT LOCAL (.env.local) :
 *    Ajoutez la ligne suivante à la racine de votre projet frontend :
 *    VITE_VAPID_PUBLIC_KEY="votre_cle_publique_vapid_ici"
 * 
 * 2. DANS SUPABASE (Edge Functions & Secrets) :
 *    Stockez vos clés privées et publiques dans le Vault de Supabase :
 *    - VAPID_PUBLIC_KEY
 *    - VAPID_PRIVATE_KEY
 *    - VAPID_SUBJECT (ex: mailto:admin@votre-domaine.com)
 *    
 *    Ces secrets seront utilisés par vos Edge Functions pour signer les
 *    requêtes push envoyées aux serveurs des navigateurs.
 * ============================================================================
 */

export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Demander la permission de notification
export const askNotificationPermission = async () => {
  try {
    // Vérifier si le navigateur supporte les notifications
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    // Si déjà accordé
    if (Notification.permission === 'granted') {
      console.log('Permission déjà accordée');
      return true;
    }

    // Si déjà refusé
    if (Notification.permission === 'denied') {
      console.warn('Permission refusée par l\'utilisateur');
      return false;
    }

    // Demander la permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Permission accordée');
      return true;
    } else {
      console.warn('❌ Permission refusée');
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return false;
  }
};

/**
 * Convertit la clé VAPID base64 en Uint8Array (Format requis par l'API Push)
 * Implémentation corrigée et sécurisée.
 */
export const urlBase64ToUint8Array = (base64String) => {
  if (!base64String) throw new Error('Base64 string is empty');
  
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('Conversion VAPID échouée. Format invalide:', base64String);
    throw new Error(`La clé VAPID est mal encodée (Base64 invalide). Détails: ${error.message}`);
  }
};

/**
 * Récupère la clé VAPID publique (Priorité : .env > Supabase RPC)
 */
export const getVapidPublicKey = async () => {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  
  // Log de l'environnement pour débogage (Masqué en prod si nécessaire)
  console.log('Push Debug - Clé ENV reçue:', envKey ? 'PRÉSENTE' : 'UNDEFINED/NULL');

  if (envKey && envKey.trim() !== '' && envKey !== 'undefined') {
    return envKey;
  }

  console.warn('⚠️ VITE_VAPID_PUBLIC_KEY manquante en ENV. Tentative RPC...');

  try {
    const { data, error } = await supabase.rpc('get_vapid_public_key');
    if (error) throw error;
    if (data && data.trim() !== '') {
      return data;
    }
  } catch (err) {
    console.error('Erreur RPC VAPID:', err);
  }

  return null;
};

/**
 * Abonne l'utilisateur aux notifications push
 */
export const subscribeToPushNotifications = async () => {
  if (!isPushSupported()) {
    throw new Error('Push non supporté par ce navigateur.');
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidPublicKey = await getVapidPublicKey();
    
    if (!vapidPublicKey) {
      const msg = '❌ Clé publique VAPID introuvable dans .env.local ou en BDD.';
      console.error(msg);
      toast({ title: "Erreur de configuration", description: msg, variant: "destructive" });
      throw new Error(msg);
    }

    // Task 2 & 3: Conversion et validation avant subscribe
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    
    console.log('⏳ Souscription au PushManager...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });
    
    console.log('✅ Abonnement Push réussi.');
    return subscription;
  } catch (error) {
    const errorDetail = error.message || 'Erreur inconnue';
    console.error('Subscription Error:', error);
    
    toast({ 
      title: "Échec de l'abonnement", 
      description: `Impossible d'activer les notifications : ${errorDetail}`, 
      variant: "destructive" 
    });
    
    throw error;
  }
};

/**
 * Sauvegarde le token dans Supabase
 */
export const savePushTokenToSupabase = async (user, subscription) => {
  if (!user || !subscription) return { error: 'Missing data' };

  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        token: JSON.stringify(subscription),
        device_type: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        is_active: true,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        },
        last_used_at: new Date().toISOString()
      }, { onConflict: 'token' });

    if (error) throw error;
    return { data };
  } catch (err) {
    console.error('Save token error:', err);
    return { error: err.message };
  }
};

export const syncSubscription = async (user) => {
  if (!isPushSupported() || !user) return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    return await savePushTokenToSupabase(user, subscription);
  }
  return null;
};