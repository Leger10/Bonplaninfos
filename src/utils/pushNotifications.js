import { supabase } from '@/lib/customSupabaseClient';

/**
 * RLS POLICIES REMINDER (SQL to run in Supabase SQL Editor):
 * 
 * -- 1. Enable RLS
 * ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
 * 
 * -- 2. Create Policies
 * CREATE POLICY "Users can insert own tokens" ON public.push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
 * CREATE POLICY "Users can view own tokens" ON public.push_tokens FOR SELECT USING (auth.uid() = user_id);
 * CREATE POLICY "Users can update own tokens" ON public.push_tokens FOR UPDATE USING (auth.uid() = user_id);
 * CREATE POLICY "Users can delete own tokens" ON public.push_tokens FOR DELETE USING (auth.uid() = user_id);
 * 
 * -- 3. Create Unique Constraint (CRITICAL for upsert/on_conflict)
 * ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_token_key UNIQUE (token);
 */

/**
 * Vérifie si le token est valide (format, non vide, etc.)
 */
export const isPushTokenValid = (token) => {
  if (!token) return false;
  if (typeof token === 'string' && token.trim().length > 0) return true;
  if (typeof token === 'object' && token !== null) {
    // Cas d'un objet subscription Web Push
    return !!token.endpoint;
  }
  return false;
};

/**
 * Vérifie si le support push est disponible
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Demande la permission pour les notifications
 */
export const askNotificationPermission = async () => {
  if (!isPushSupported()) return 'denied';
  
  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Récupère la clé VAPID publique depuis la base de données
 */
const getVapidPublicKey = async () => {
  try {
    const { data, error } = await supabase.rpc('get_vapid_public_key');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching VAPID key:', err);
    // Fallback key if RPC fails (should match your env)
    return 'BNozW3XwT0gB_G_g8Y2iV5GZ3G-sA8f_gZ5eYjJ3Xw8U_cZ6E_bX9V9hYjZkXw8U_cZ6E_bX9V9hYjZkXw8U';
  }
};

/**
 * Convertit la clé VAPID base64 en Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Récupère l'abonnement push existant
 */
export const getExistingSubscription = async () => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
};

/**
 * Abonne l'utilisateur aux notifications push
 */
export const subscribeUserToPush = async () => {
  if (!isPushSupported()) throw new Error('Push notifications not supported');

  const registration = await navigator.serviceWorker.ready;
  const vapidPublicKey = await getVapidPublicKey();
  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe the user: ', error);
    throw error;
  }
};

/**
 * Sauvegarde le token dans Supabase avec gestion d'erreur robuste
 */
export const savePushTokenToSupabase = async (user, subscription) => {
  if (!user || !subscription) {
    console.error('Missing user or subscription data');
    return { error: 'Missing data' };
  }

  // Sérialisation du token (Web Push retourne un objet, mobile peut retourner une string)
  const tokenString = JSON.stringify(subscription);

  // Validation
  if (!isPushTokenValid(subscription)) {
    console.error('Invalid push token structure');
    return { error: 'Invalid token' };
  }

  const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language
  };

  const payload = {
    user_id: user.id,
    token: tokenString,
    device_type: deviceType,
    is_active: true,
    device_info: deviceInfo,
    app_version: '1.0.0', // Peut être dynamique
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  console.log('Attempting to save push token to Supabase:', payload);

  try {
    // Tentative d'insertion avec UPSERT sur la colonne 'token'
    // NOTE: Cela nécessite une contrainte UNIQUE sur la colonne 'token' dans la table 'push_tokens'
    const { data, error } = await supabase
      .from('push_tokens')
      .upsert(payload, { onConflict: 'token' })
      .select();

    if (error) {
      console.error('Supabase Error saving push token:', error);
      
      // Feedback spécifique si la contrainte unique manque
      if (error.message.includes('constraint') || error.code === '23505') {
        console.warn('HINT: Vérifiez que la colonne "token" a bien une contrainte UNIQUE dans la base de données.');
      }
      
      throw error;
    }

    console.log('Push token saved successfully:', data);
    return { data };
  } catch (err) {
    console.error('Exception while saving push token:', err);
    return { error: err.message || 'Unknown error' };
  }
};

/**
 * Synchronise l'abonnement si l'utilisateur est connecté
 */
export const syncSubscription = async (user) => {
  const subscription = await getExistingSubscription();
  if (subscription) {
    return await savePushTokenToSupabase(user, subscription);
  }
  return null;
};