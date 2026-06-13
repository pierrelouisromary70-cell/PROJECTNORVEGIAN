'use client';

// Browser-side helpers for the Push API. Framework-agnostic, no React here.

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** VAPID public key is a base64url string; the browser wants an ArrayBuffer. */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js');
}

export interface SerializedSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}

function serialize(sub: PushSubscription): SerializedSubscription {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

/**
 * Ask permission, subscribe to push, and return the serialized subscription
 * to POST to the server. Returns null if permission is denied.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<SerializedSubscription | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const reg = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return serialize(existing);

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
  });
  return serialize(sub);
}

/** Unsubscribe locally and return the endpoint that was removed (for server cleanup). */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

export async function currentPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'default';
  return Notification.permission;
}
