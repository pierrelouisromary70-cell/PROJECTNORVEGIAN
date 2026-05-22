# Tester Nordic Run en local

Guide rapide pour faire tourner l'app sur votre machine et explorer toutes les fonctionnalités en mode démo.

## Prérequis

- Node.js ≥ 20 (Next 15 le demande)
- Un compte Supabase (gratuit — supabase.com)
- Un compte Stripe **en mode test** (gratuit — stripe.com/fr)
- *Optionnel* : un compte développeur Strava pour la synchro (strava.com/settings/api)

## 1. Cloner et installer

```bash
git clone https://github.com/pierrelouisromary70-cell/projectnorvegian.git
cd projectnorvegian
git checkout claude/fervent-cori-mNZEX
npm install
cp .env.example .env.local
```

## 2. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (région EU recommandée).
2. Dans le projet → **SQL Editor** → ouvrez chaque migration dans l'ordre et lancez-la :
   - `supabase/migrations/0001_initial.sql`
   - `0002_fix_onboarding_state.sql`
   - `0003_race_priority.sql`
   - `0004_injury_comeback.sql`
   - `0005_planned_break.sql`
   - `0006_workout_logs.sql`
   - `0007_security_consent_idempotency.sql`
   - `0008_strava_connections.sql`
   - `0009_strava_webhook_and_match.sql`
3. **Settings → API** : copiez `URL`, `anon key`, `service_role key` dans `.env.local` :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```
4. **Authentication → Providers → Email** : décochez "Confirm email" pour éviter de devoir cliquer sur un lien email à chaque test.

## 3. Stripe (test mode)

1. Dans le dashboard Stripe, basculez en **mode Test** (toggle en haut à droite).
2. **Products → + Add product** :
   - Nom : "Nordic Run Mensuel" → prix 15 €, récurrence mensuelle → notez le `price_xxxxx` retourné
   - Re-faire pour "Nordic Run Annuel" → 120 €, récurrence annuelle
3. Dans `.env.local` :
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   STRIPE_PRICE_ID_MONTHLY=price_xxxxx
   STRIPE_PRICE_ID_ANNUAL=price_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER   # on le mettra dans 5 min
   ```
4. Pour tester les webhooks Stripe en local, lancez dans un terminal séparé :
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Le CLI affichera le `whsec_xxxxx` → mettez-le dans `STRIPE_WEBHOOK_SECRET`.

## 4. Strava (optionnel)

Pour tester la sync auto + import manuel. Si vous voulez juste voir l'app, sautez cette étape — la section sera grisée avec un bouton "Connecter Strava".

1. [strava.com/settings/api](https://www.strava.com/settings/api) → My API Application → créer.
2. Authorization Callback Domain : `localhost` (pour le dev local)
3. Copier `Client ID` + `Client Secret` dans `.env.local`.
4. Générer un secret aléatoire pour `STRAVA_OAUTH_STATE_SECRET` :
   ```bash
   openssl rand -hex 32
   ```
5. Idem pour `STRAVA_VERIFY_TOKEN` (un autre secret).

## 5. Démarrer

```bash
npm run dev
```

Ouvrez [http://localhost:3000/fr](http://localhost:3000/fr).

## 6. Compte démo prêt à l'emploi

L'auth Supabase oblige à passer par /signup avec un vrai email — mais pour aller plus vite, créez le compte démo via le dashboard Supabase :

1. **Supabase Studio → Authentication → Users → Add user**
2. Cochez **"Auto Confirm User"**
3. Identifiants suggérés :
   - **Email** : `demo@nordic-run.test`
   - **Password** : `DemoNorvegian2026!`
4. Validez. Notez l'UUID de l'utilisateur (colonne ID).
5. Ouvrez **SQL Editor** et lancez le script `supabase/seed_demo.sql` après avoir remplacé `__DEMO_USER_ID__` par l'UUID de l'étape 4.

Une fois fait, allez sur [localhost:3000/fr/login](http://localhost:3000/fr/login) avec ces identifiants. Le profil est déjà onboardé (VDOT 48 — niveau confirmé), un plan d'entraînement de 4 semaines généré, des logs de fatigue récents, une connexion Strava simulée, et un essai gratuit de 14 jours en cours.

### Variantes du compte démo

Pour tester des cas particuliers, créez plusieurs comptes :

| Variante | Email | Mot de passe | Spécificité |
|---|---|---|---|
| Coureuse + cycle | `demo-female@nordic-run.test` | `DemoNorvegian2026!` | Sexe femme, suivi cycle activé, phase lutéale tardive |
| Reprise post-blessure | `demo-injury@nordic-run.test` | `DemoNorvegian2026!` | Comeback en cours, jour 5/14 |
| Coupure volontaire | `demo-break@nordic-run.test` | `DemoNorvegian2026!` | En coupure depuis 8 jours |
| Élite double-seuil | `demo-elite@nordic-run.test` | `DemoNorvegian2026!` | VDOT 65, 170 km/sem, 4 séances de seuil dont 2 doubles |
| Trial expiré | `demo-expired@nordic-run.test` | `DemoNorvegian2026!` | Essai terminé, doit upgrader |

Chaque variante a une section dédiée dans le seed.

## 7. Que tester

- **Inscription complète** : créez un nouveau compte par /signup, allez jusqu'au bout de l'onboarding (6 étapes), observez la génération du plan.
- **Adaptation jour** : sur le dashboard, cliquez "Renseigner" → fatigue 4 + pain 1 → la séance du jour se transforme visiblement.
- **Cycle** : avec le compte `demo-female`, allez sur Profil → Cycle. Vous verrez la phase actuelle estimée. Modifiez la date pour tester chaque phase.
- **Reprise/coupure** : Profil → "Zone dangereuse" du bas (boutons blessure/coupure).
- **Strava** : Profil → "Connecter Strava" (nécessite l'app Strava configurée).
- **Stripe checkout** : sur la landing, cliquez "Le plus choisi" → vous arriverez sur la page Stripe en mode test. Carte test : `4242 4242 4242 4242`, CVV `123`, date future.
- **i18n** : `/en` au lieu de `/fr` pour la version anglaise.

## 8. Dépannage

- **"createClient is not a function"** : vous êtes sur une version Next 14 — vérifiez `npm install` après le checkout.
- **Migrations qui échouent** : lancez-les dans l'ordre numérique, certaines dépendent des précédentes.
- **Strava callback "state_mismatch"** : votre `STRAVA_OAUTH_STATE_SECRET` a changé entre l'init et le callback (changement de `.env.local` après démarrage du serveur). Restart `npm run dev`.
- **Webhook Stripe ne signale rien** : assurez-vous que `stripe listen` tourne dans un terminal séparé en parallèle de `npm run dev`.

## 9. Aller plus loin (prod)

Pour un déploiement réel, voir le README principal — section "Synchronisation Strava" pour la subscription webhook one-shot et tous les secrets à mettre en variables d'environnement Vercel.
