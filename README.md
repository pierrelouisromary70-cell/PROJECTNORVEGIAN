# Nordic Run

Application de coaching course à pied basée sur la méthode norvégienne (Ingebrigtsen / Casado).

- **Volume élevé** + **double seuil** + **contrôle du lactate**
- **VDOT (Jack Daniels)** pour calibrer toutes les allures
- **Adaptation continue** : fatigue, douleur, contraintes de temps, cycle menstruel
- **Plans 4 semaines** régénérés en fonction de votre course objectif
- **30 jours offerts**, puis 14,99 € / mois ou 119 € / an (Stripe)

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
| `training/plan-generator.ts` | Génère un bloc de 3-4 semaines (base / build / spécifique / affûtage), en respectant les jours disponibles |
| `training/adaptation.ts` | Réajuste sur fatigue, douleur, phase du cycle, contraintes de temps |
| `training/calibration.ts` | **Lactate virtuel** : recalibre les allures LT1/LT2 à partir des RPE post-séance |

## Modèle norvégien implémenté

- **Débutant (~30 km/sem)** : 1 séance seuil/sem, progression de volume de 8%/sem avec semaine de décharge tous les 4 cycles
- **Intermédiaire (~50-80)** : 2 séances de seuil hebdo (mardi + jeudi)
- **Avancé (~80-120)** : 3 séances dont 1 double-seuil (mardi AM 6×1000m + PM 10×400m)
- **Élite (110+)** : 4 séances de seuil dont **2 doubles** (mardi & jeudi)

Les allures LT1 / LT2 sont décalibrées de la T classique de Daniels pour rester "sub-threshold" (lactate ~2.0–2.5 mmol/L sur AM).

## Axe différenciant : le « lactate virtuel »

La méthode norvégienne repose sur le **contrôle du lactate** — inaccessible à 99,9 % des coureurs.
Nordic Run remplace le lactate-mètre par les données déjà collectées :

1. Chaque séance seuil porte un **RPE prescrit** (LT1 = 6, LT2 = 7).
2. Le coureur valide chaque séance avec son **RPE réel** et un statut (faite / partielle / sautée).
3. `training/calibration.ts` mesure la **dérive moyenne** sur les 6 dernières semaines :
   - dérive > +1 RPE (ou séances non terminées) → les zones LT1/LT2 sont **ralenties** (jusqu'à +12 s/km)
   - dérive < −1 RPE → les zones sont **accélérées** prudemment (max −5 s/km — les grosses corrections passent par une nouvelle perf VDOT)
4. Le dashboard **explique** chaque ajustement au coureur (transparence = confiance = rétention).

C'est asymétrique à dessein : en sous-seuil, courir trop vite est l'erreur cardinale, courir trop lentement coûte peu.
Aucun concurrent grand public (Runna, Campus.coach, TrainingPeaks AI) ne ferme cette boucle ressenti → allures.

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
   - Créer un produit "Nordic Run" → prix récurrent (14,99 € / mois, aligné avec la landing)
   - Remplir `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`
   - Configurer un webhook `/api/stripe/webhook` (events: `customer.subscription.*`, `checkout.session.completed`)
   - Mettre la clé dans `STRIPE_WEBHOOK_SECRET`

4. **Démarrer**
   ```bash
   npm run dev
   ```
   Ouvre [http://localhost:3000/fr](http://localhost:3000/fr).

## Parcours utilisateur

1. Inscription → essai gratuit 30 jours activé automatiquement (trigger SQL).
2. Onboarding 6 étapes : sexe, expérience, volume actuel, objectif (progresser / performer), perf récente → VDOT calculé, contraintes de temps, opt-in cycle menstruel (si femme).
3. Premier accès au dashboard → génération d'un bloc de 4 semaines norvégien.
4. Chaque jour : ressenti (fatigue 1–5, douleur 0–3, temps dispo) → la séance du jour s'adapte.
5. Ajout d'une course objectif → le prochain bloc bascule en phase **spécifique / taper**.

## Ce qu'il reste à brancher (V2)

- Adaptation persistante du plan côté serveur (cron quotidien qui appelle `applyBlockAdaptation`)
- Synchronisation montres GPS (Garmin Connect / Strava webhook) — alimentera aussi le lactate virtuel (dérive cardiaque)
- Notifications push pour le ressenti du soir et la validation de séance (sans validation, pas de calibration)
- Mise à jour automatique du VDOT après une course validée
- Page « progrès » : évolution du volume, du VDOT et de la calibration dans le temps

## Vie privée

- Les données de cycle sont **opt-in explicite** et stockées dans une table dédiée protégée par RLS.
- L'utilisateur peut tout désactiver depuis Profil → Cycle.
