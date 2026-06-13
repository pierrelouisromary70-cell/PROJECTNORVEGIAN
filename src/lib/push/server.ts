import 'server-only';
import webpush from 'web-push';

/**
 * Configure web-push with the VAPID identity once per server process.
 * Returns false if keys are missing so callers can no-op gracefully in
 * environments where push is not yet provisioned (e.g. local dev).
 */
let configured: boolean | null = null;

export function ensureVapidConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:contact@nordicrun.app';
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export type PushResult =
  | { ok: true }
  | { ok: false; gone: boolean; status?: number; error: string };

/**
 * Send one notification. `gone: true` means the subscription is dead
 * (404/410) and the caller should delete it.
 */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<PushResult> {
  if (!ensureVapidConfigured()) {
    return { ok: false, gone: false, error: 'VAPID keys not configured' };
  }
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 6 * 3600, urgency: 'normal' },
    );
    return { ok: true };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    const gone = status === 404 || status === 410;
    return { ok: false, gone, status, error: (err as Error).message };
  }
}
