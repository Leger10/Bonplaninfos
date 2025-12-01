import { supabase } from '@/lib/customSupabaseClient';

const VAPID_PUBLIC_KEY = 'BH_96HQD9GYuB08avOEWE4FT3_k_aiONkw0Yj8zIyyYZOHXkEc1Ya6u9HvlWVYcX0KV-QbF_eFw25FXO8DLwzrk'; // This should be stored in env variables

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
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported in this browser.');
    throw new Error('Push notifications not supported.');
  }
  const permission = await Notification.requestPermission();
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

  const permission = await askNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Permission for notifications was not granted.');
    throw new Error('Permission for notifications was denied.');
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
      console.log('User is already subscribed.');
      return existingSubscription;
    }

    const vapidPublicKey = (await supabase.rpc('get_vapid_public_key')).data;
    if (!vapidPublicKey) {
        throw new Error("Could not retrieve VAPID public key from server.");
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('User is subscribed:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe the user: ', error);
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
        console.log('User has been unsubscribed.');
        // Also remove from backend
        await supabase.from('push_tokens').delete().eq('token', subscription.endpoint);
      }
      return successful;
    } catch (error) {
      console.error('Failed to unsubscribe the user: ', error);
      return false;
    }
  }
  return true; // Already unsubscribed
}