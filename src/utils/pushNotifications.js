import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
const hashToken = async (token) => {
  const msgBuffer = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Vérifie le support des push notifications
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Demande la permission de notification
export const askNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('Permission déjà accordée');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Permission refusée par l\'utilisateur');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return false;
  }
};

/**
 * Convertit une clé base64 URL-safe en Uint8Array (exigé par l'API Push)
 */
export const urlBase64ToUint8Array = (base64String) => {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('Base64 string invalide ou vide');
  }

  try {
    // Ajout du padding si nécessaire
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('Erreur de conversion base64:', base64String, error);
    throw new Error(`Clé VAPID mal encodée : ${error.message}`);
  }
};

/**
 * Récupère la clé publique VAPID depuis l'environnement ou Supabase
 */
export const getVapidPublicKey = async () => {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  console.log('🔍 Clé depuis .env :', envKey ? 'Présente' : 'Absente');

  if (envKey && envKey.trim() !== '' && envKey !== 'undefined') {
    return envKey.trim();
  }

  console.warn('⚠️ Clé non trouvée dans .env, tentative via RPC Supabase...');

  try {
    const { data, error } = await supabase.rpc('get_vapid_public_key');
    if (error) throw error;
    if (data && typeof data === 'string' && data.trim() !== '') {
      return data.trim();
    }
  } catch (err) {
    console.error('Erreur RPC VAPID:', err);
  }

  return null;
};

/**
 * Valide qu'une clé convertie correspond bien à une clé publique P-256 (65 octets)
 */
const validateApplicationServerKey = (key) => {
  if (!(key instanceof Uint8Array)) {
    throw new Error('La clé doit être un Uint8Array');
  }
  if (key.byteLength !== 65) {
    throw new Error(`Clé invalide : doit faire 65 octets (P-256), actuellement ${key.byteLength} octets`);
  }
  // Optionnel : vérifier le premier octet (0x04 pour une clé non compressée)
  if (key[0] !== 0x04) {
    throw new Error('Clé invalide : le premier octet doit être 0x04 (format non compressé)');
  }
  return true;
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

    // Récupération de la clé
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      const msg = '❌ Clé publique VAPID introuvable (vérifiez .env.local ou BDD)';
      console.error(msg);
      toast({ title: 'Erreur de configuration', description: msg, variant: 'destructive' });
      throw new Error(msg);
    }

    console.log('🔑 Clé brute récupérée (longueur) :', vapidPublicKey.length);

    // Conversion et validation
    let applicationServerKey;
    try {
      applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      validateApplicationServerKey(applicationServerKey);
      console.log('✅ Clé VAPID valide (65 octets)');
    } catch (err) {
      console.error('❌ Clé VAPID invalide :', err.message);
      toast({
        title: 'Clé VAPID invalide',
        description: `La clé publique n'est pas une clé P-256 valide. Détail : ${err.message}`,
        variant: 'destructive',
      });
      throw err;
    }

    // Désabonnement préalable pour éviter les conflits
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('🗑️ Désabonnement de l\'ancien abonnement...');
      await existingSubscription.unsubscribe();
    }

    // Abonnement
    console.log('⏳ Souscription au PushManager...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    console.log('✅ Abonnement Push réussi !');
    return subscription;
  } catch (error) {
    const errorDetail = error.message || 'Erreur inconnue';
    console.error('❌ Subscription Error:', error);
    toast({
      title: "Échec de l'abonnement",
      description: `Impossible d'activer les notifications : ${errorDetail}`,
      variant: 'destructive',
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
   const tokenHash = await hashToken(JSON.stringify(subscription));

const { data, error } = await supabase
  .from('push_tokens')
  .upsert(
    {
      user_id: user.id,
      token: tokenHash,  // ← utiliser le hash
      device_type: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      is_active: true,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );


    if (error) throw error;
    return { data };
  } catch (err) {
    console.error('Save token error:', err);
    return { error: err.message };
  }
};

/**
 * Synchronise l'abonnement existant avec Supabase
 */
export const syncSubscription = async (user) => {
  if (!isPushSupported() || !user) return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    return await savePushTokenToSupabase(user, subscription);
  }
  return null;
};