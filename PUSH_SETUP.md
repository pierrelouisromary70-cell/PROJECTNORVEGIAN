# Notifications push — mise en service

L'infrastructure est entièrement codée. Il ne reste que **3 étapes de configuration**
(clés + migration + cron), aucune n'exige de toucher au code.

## 1. Générer les clés VAPID (une seule fois par environnement)

```bash
node scripts/generate-vapid-keys.mjs
```

Copie la sortie dans tes variables d'environnement (Vercel → Settings → Environment Variables) :

| Variable | Visibilité | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | publique (navigateur) | identifie le serveur d'envoi |
| `VAPID_PRIVATE_KEY` | **secrète** (serveur) | signe les notifications |
| `VAPID_SUBJECT` | serveur | `mailto:` de contact (défaut fourni) |
| `CRON_SECRET` | **secrète** | protège l'endpoint cron |

> ⚠️ Ne régénère jamais les clés après le lancement : cela invalide **toutes**
> les souscriptions push existantes.

## 2. Appliquer la migration SQL

Dans le SQL editor Supabase, exécute `supabase/migrations/0007_push_notifications.sql`.
Elle crée la table `push_subscriptions` (avec RLS) et ajoute les préférences de
notification sur `profiles` (`notify_evening_feedback`, `notify_hour`, `timezone`,
`last_evening_notify_on`).

## 3. Le cron est déjà configuré

`vercel.json` déclare un cron **horaire** sur `/api/cron/evening-reminders`.
Vercel envoie automatiquement l'en-tête `Authorization: Bearer $CRON_SECRET`.
Le endpoint :

1. parcourt les coureurs ayant opté pour le rappel ;
2. pour chacun, vérifie via `eveningReminderDecision` si **l'heure locale** correspond
   à son `notify_hour` (fuseau `timezone`) et qu'aucun envoi n'a déjà eu lieu ce jour-là ;
3. envoie le push sur tous ses appareils, supprime les souscriptions mortes (404/410),
   et mémorise la date locale d'envoi pour éviter les doublons.

Hébergé ailleurs que Vercel ? Programme un appel horaire :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/evening-reminders
```

## Parcours utilisateur

- Sur le **dashboard**, une carte « Rappel du soir » propose d'activer les notifications.
- Le coureur choisit son **heure** de rappel et peut **envoyer un test** immédiat.
- Désactivation à tout moment (supprime la souscription côté serveur + navigateur).
- iOS : les notifications ne marchent qu'une fois l'app **ajoutée à l'écran d'accueil**
  (le composant l'explique automatiquement si le navigateur ne supporte pas le push).

## Architecture

| Fichier | Rôle |
| --- | --- |
| `public/sw.js` | service worker : affiche la notif, gère le clic (focus/ouverture) |
| `src/lib/push/client.ts` | helpers navigateur : permission, (dé)souscription |
| `src/lib/push/server.ts` | wrapper `web-push` : config VAPID + `sendPush` |
| `src/lib/push/schedule.ts` | logique pure « faut-il notifier ce coureur maintenant ? » (testée) |
| `src/components/NotificationOptIn.tsx` | UI d'opt-in + réglage heure + test |
| `src/app/api/push/subscribe/route.ts` | enregistre/supprime une souscription |
| `src/app/api/push/test/route.ts` | notification de test à l'utilisateur courant |
| `src/app/api/cron/evening-reminders/route.ts` | cron horaire d'envoi |
| `src/lib/supabase/admin.ts` | client service-role partagé (cron/webhooks) |

Sans clés VAPID configurées, tout dégrade proprement : la carte d'opt-in ne s'affiche
pas, `sendPush` renvoie une erreur explicite, le cron répond `503`. Aucun crash.
