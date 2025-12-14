import { supabase } from '@/lib/customSupabaseClient';

// Use the public key from secrets or fallback
const VAPID_PUBLIC_KEY = 'BNozW3XwT0gB_G_g8Y2iV5GZ3G-sA8f_gZ5eYjJ3Xw8U_cZ6E_bX9V9hYjZkXw8U_cZ6E_bX9V9hYjZkXw8U';

function urlBase64ToUint8Array(base64String) {
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
}

/**
 * Checks if Push Notifications are supported.
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Asks the user for permission.
 */
export async function askNotificationPermission() {
  if (!isPushSupported()) throw new Error("Notifications non supportées");
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribes the user to push notifications using VAPID.
 */
export async function subscribeUserToPush() {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      return subscription;
    }

    // Subscribe
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    throw error;
  }
}

/**
 * Syncs the subscription with the database.
 */
export async function syncSubscription(user) {
  if (!user || !isPushSupported()) return;

  try {
    const subscription = await getExistingSubscription();
    if (subscription) {
      const p256dh = subscription.getKey('p256dh') ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))) : null;
      const auth = subscription.getKey('auth') ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))) : null;

      await supabase.from('push_tokens').upsert({
        user_id: user.id,
        token: subscription.endpoint,
        auth_key: auth,
        p256dh_key: p256dh,
        device_type: navigator.userAgent,
        is_active: true,
        last_used_at: new Date().toISOString()
      }, { onConflict: 'token' });
    }
  } catch (e) {
    console.error("Sync subscription error:", e);
  }
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}