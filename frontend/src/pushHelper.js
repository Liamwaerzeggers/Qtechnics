/* Push Notification helper for MaxQ PWA */

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;
const API_BASE = process.env.REACT_APP_BACKEND_URL || window.location.origin;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push not supported');
    return null;
  }
  if (!VAPID_PUBLIC_KEY) {
    console.warn('No VAPID key configured');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    // Send subscription to backend
    const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
    if (token) {
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sub.toJSON())
      });
    }
    return sub;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}
