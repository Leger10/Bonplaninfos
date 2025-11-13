import { supabase } from '@/lib/customSupabaseClient';

// This VAPID public key should be generated and stored securely.
// For this example, we'll hardcode it. In a real app, it should come from your environment variables.
const VAPID_PUBLIC_KEY = 'BNoA_eJ-s8H_9C4q-a_gCUVsoY_PveaH2NC5Vp3pT87jJcY2vF4g1HUnVpTYNYK56wRzV5wRk4yX8T_Q8uA1z9w';

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

export async function initPushNotifications(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (subscription === null) {
      console.log('No subscription found, subscribing...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await saveSubscription(userId, subscription);
    } else {
      console.log('Existing subscription found.');
      // Optionally, you can update the subscription on your server here
      // to ensure it's still valid and associated with the logged-in user.
      await saveSubscription(userId, subscription);
    }
  } catch (error) {
    console.error('Failed to subscribe the user: ', error);
    throw error;
  }
}

async function saveSubscription(userId, subscription) {
  const subscriptionJson = subscription.toJSON();
  const { data, error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: userId,
      token: JSON.stringify(subscriptionJson),
      device_type: 'web',
      is_active: true,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'token' }); // Assuming 'token' is a unique column

  if (error) {
    console.error('Error saving push subscription:', error);
  } else {
    console.log('Push subscription saved successfully:', data);
  }
}