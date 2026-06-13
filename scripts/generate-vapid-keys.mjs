#!/usr/bin/env node
// Generate a VAPID key pair for web-push.
// Usage: node scripts/generate-vapid-keys.mjs
//
// Copy the output into your environment:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  (public — shipped to the browser)
//   VAPID_PRIVATE_KEY             (secret — server only)
//
// Generate ONCE per environment and keep them stable: rotating the keys
// invalidates every existing push subscription.

import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('# --- Nordic Run VAPID keys (add to your env) ---');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:contact@nordicrun.app');
console.log('# Also set a CRON_SECRET (any long random string) to protect the cron endpoint.');
