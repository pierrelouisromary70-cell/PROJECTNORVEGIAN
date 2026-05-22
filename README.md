# Nordic Run

Application de coaching course à pied basée sur la méthode norvégienne (Ingebrigtsen / Casado).

- **Volume élevé** + **double seuil** + **contrôle du lactate**
- **VDOT (Jack Daniels)** pour calibrer toutes les allures
- **Adaptation continue** : fatigue, douleur, contraintes de temps, cycle menstruel
- **Plans 4 semaines** régénérés en fonction de votre course objectif
- **14 jours offerts**, puis 15 € / mois ou 120 € / an (Stripe)

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript** strict
- **Tailwind CSS**
- **Supabase** (Postgres + Auth + RLS)
- **Stripe** (abonnement)
- **next-intl** (FR / EN)

## Architecture du coaching

Le cœur de l'app est dans `src/lib/`:

| Module | Rôle |
| --- | --- |
| `vdot/calculator.ts` | Formule de Jack Daniels (VDOT depuis une perf récente) |
| `vdot/table.ts` | Table VDOT 30-85 (allures E/M/T/I/R) |
| `vdot/paces.ts` | Construit les zones norvégiennes (LT1 / LT2 distincts) |
| `training/norwegian.ts` | Règles du modèle : volume cible, nombre de seuils, double-seuil |
| `training/workouts.ts` | Catalogue de séances avec **but**, **ressenti**, **RPE**, **conseils** |
| `training/plan-generator.ts` | Génère un bloc de 3-4 semaines (base / build / spécifique / affûtage) |
| `training/adaptation.ts` | Réajuste sur fatigue, douleur, phase du cycle, contraintes de temps |

## Modèle norvégien implémenté

- **Débutant (~30 km/sem)** : 1 seance seuil/sem, progression de volume de 8%/sem avec semaine de décharge tous les 4 cycles
- **Intermédiaire (~50-80)** : 2 séances de seuil hebdo (mardi + jeudi)
- **Avancé (~80-120)** : 3 séances dont 1 double-seuil (mardi AM 6×1000m + PM 10×400m)
- **Élite (110+)** : 4 séances de seuil dont **2 doubles** (mardi & jeudi)

Les allures LT1 / LT2 sont décalibrées de la T classique de Daniels pour rester "sub-threshold" (lactate ~2.0–2.5 mmol/L sur AM).

## Setup local

1. **Cloner & installer**
   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **Supabase**
   - Créer un projet sur [supabase.com](https://supabase.com)
   - Lancer `supabase/migrations/0001_initial.sql` dans le SQL editor
   - Remplir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

3. **Stripe**
   - Créer un produit "Nordic Run" avec deux prix récurrents : **15 € / mois** et **120 € / an**
   - Remplir `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`
   - Configurer un webhook `/api/stripe/webhook` (events: `customer.subscription.*`, `checkout.session.completed`)
   - Mettre la clé dans `STRIPE_WEBHOOK_SECRET`
   - L'essai gratuit de **14 jours** est activé automatiquement par le trigger SQL `handle_new_user` lors de l'inscription.

4. **Démarrer**
   ```bash
   npm run dev
   ```
   Ôuvre [http://localhost:3000/fr](http://localhost:3000/fr).

## Parcours utilisateur

1. Inscription → essai gratuit 14 jours activé automatiquement (trigger SQL).
2. Onboarding 6 étapes : sexe, expérience, volume actuel, objectif (progresser / performer), perf récente → VDOT calculé, contraintes de temps, opt-in cycle menstruel (si femme).
3. Premier accès au dashboard → génération d'un bloc de 4 semaines norvégien.
4. Chaque jour : ressenti (fatigue 1–5, douleur 0–3, temps dispo) → la séance du jour s'adapte.
5. Ajout d'une course objectif → le prochain bloc bascule en phase **spécifique / taper**.

## Synchronisation Strava

L'app supporte la connexion Strava en OAuth lecture seule + l'import automatique des courses via webhook.

1. **Créer une app Strava** sur https://www.strava.com/settings/api
   - Authorization Callback Domain = host de `NEXT_PUBLIC_APP_URL`
   - Remplir `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_OAUTH_STATE_SECRET`, `STRAVA_VERIFY_TOKEN` dans `.env.local` / Vercel

2. **Créer la subscription webhook une seule fois** (une seule subscription pour toute l'app, partagée par tous les utilisateurs) :
   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=$STRAVA_CLIENT_ID \
     -F client_secret=$STRAVA_CLIENT_SECRET \
     -F callback_url=$NEXT_PUBLIC_APP_URL/api/strava/webhook \
     -F verify_token=$STRAVA_VERIFY_TOKEN
   ```
   Strava va appeler le callback en `GET` avec `hub.challenge` pour vérifier — la route répond automatiquement si `STRAVA_VERIFY_TOKEN` correspond.

3. **Une fois l'utilisateur connecté**, chaque nouvelle course Strava est importée dans les secondes qui suivent (sauf si l'utilisateur désactive la sync auto depuis son profil).

Les courses qui correspondent à une séance du plan (même date, distance ±30 %, AM/PM tie-break pour les double-seuils) sont automatiquement validées dans `workout_logs`.

## Ce qu'il reste à brancher (V2)

- Adaptation persistante du plan côté serveur (cron quotidien qui appelle `applyBlockAdaptation`)
- Synchronisation Garmin Connect (Strava OAuth + webhook déjà implémentés)
- Notifications push pour le ressenti du soir

## Vie privée

- Les données de cycle sont **opt-in explicite** et stockées dans une table dédiée protégée par RLS.
- L'utilisateur peut tout désactiver depuis Profil → Cycle.
