import { supabase } from '@/lib/customSupabaseClient';

// Fallback key in case server fetch fails. This matches the one in the DB function.
const VAPID_PUBLIC_KEY_FALLBACK = 'BNozW3XwT0gB_G_g8Y2iV5GZ3G-sA8f_gZ5eYjJ3Xw8U_cZ6E_bX9V9hYjZkXw8U_cZ6E_bX9V9hYjZkXw8U';

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
 * Checks if Push Notifications are supported by the browser.
 * @returns {boolean}
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Asks the user for permission to send push notifications.
 * @returns {Promise<PermissionState>}
 */
export async function askNotificationPermission() {
  console.log('Requesting push notification permission...');
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported in this browser.');
    throw new Error('Push notifications not supported.');
  }
  const permission = await Notification.requestPermission();
  console.log('Push permission status:', permission);
  return permission;
}

/**
 * Subscribes the user to push notifications.
 * @returns {Promise<PushSubscription|null>}
 */
export async function subscribeUserToPush() {
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported in this browser.');
    return null;
  }

  // Ensure service worker is ready
  const registration = await navigator.serviceWorker.ready;
  console.log('Service worker registered and ready for push subscription.');

  // Check existing
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    console.log('User is already subscribed to push service:', subscription.endpoint);
    return subscription;
  }

  // Try to get key from server, fallback to constant
  let vapidKey = VAPID_PUBLIC_KEY_FALLBACK;
  try {
    const { data, error } = await supabase.rpc('get_vapid_public_key');
    if (!error && data) {
      vapidKey = data;
    }
  } catch (e) {
    console.warn('Using fallback VAPID key due to fetch error:', e);
  }

  console.log('Subscribing to push with VAPID key...');
  
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    console.log('Subscribed to push successfully:', subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe the user to push service:', error);
    throw error;
  }
}

/**
 * Gets the existing push subscription.
 * @returns {Promise<PushSubscription|null>}
 */
export async function getExistingSubscription() {
  if (!isPushSupported()) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting existing subscription:', error);
    return null;
  }
}

/**
 * Unsubscribes the user from push notifications.
 * @returns {Promise<boolean>}
 */
export async function unsubscribeUserFromPush() {
  const subscription = await getExistingSubscription();
  if (subscription) {
    try {
      const successful = await subscription.unsubscribe();
      if (successful) {
        console.log('User has been unsubscribed from push service.');
        // Remove from backend
        await supabase.from('push_tokens').delete().eq('token', subscription.endpoint);
      }
      return successful;
    } catch (error) {
      console.error('Failed to unsubscribe the user:', error);
      return false;
    }
  }
  return true;
}