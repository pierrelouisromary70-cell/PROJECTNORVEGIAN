# Tester Nordic Run sur votre ordinateur

Guide complet, du compte Supabase au navigateur. **Temps total : 30-45 min**.

Vous n'avez besoin de **rien payer** : Supabase a un tier gratuit généreux et Stripe n'est pas nécessaire pour tester (on saute l'étape paiement).

---

## Étape 1 — Installer Node.js (5 min)

Nordic Run a besoin de **Node.js 20 ou +**.

### macOS
```bash
# Installer via Homebrew
brew install node@20
# Vérifier
node --version  # doit afficher v20.x.x ou plus
```

### Windows
Téléchargez l'installeur officiel : https://nodejs.org (version LTS).
Après installation, ouvrez **PowerShell** et tapez :
```powershell
node --version
```

### Linux
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Étape 2 — Cloner le repo (1 min)

Ouvrez un terminal et placez-vous où vous voulez (votre Bureau par exemple) :

```bash
cd ~/Desktop
git clone https://github.com/pierrelouisromary70-cell/projectnorvegian.git nordic-run
cd nordic-run
git checkout claude/running-coach-app-KOLH9
```

Si le repo est privé, GitHub vous demandera vos identifiants (utilisez un Personal Access Token).

---

## Étape 3 — Installer les dépendances (3 min)

```bash
npm install
```

Ça télécharge ~450 paquets (Next.js, Supabase, etc.). Vous verrez quelques warnings de dépréciation, c'est normal.

---

## Étape 4 — Créer un projet Supabase (10 min)

Supabase est la base de données + l'authentification. **Gratuit jusqu'à 50 000 utilisateurs.**

1. Aller sur https://supabase.com/dashboard
2. **Sign in with GitHub** (le plus simple)
3. Cliquer **New project**
   - Name : `nordic-run`
   - Database password : *cliquez sur "Generate a password"* et **copiez-le dans un fichier texte** (vous n'en aurez peut-être pas besoin, mais on ne sait jamais)
   - Region : **West EU (Paris)** ou **West EU (Ireland)** pour la conformité RGPD
   - Pricing plan : **Free**
4. Cliquer **Create new project**. Attendez ~2 min que le projet soit ready.

### 4.1 — Lancer la migration SQL

1. Dans la sidebar gauche du dashboard Supabase, cliquer sur **SQL Editor** (icône base de données)
2. Cliquer **New query**
3. Ouvrir le fichier `supabase/migrations/0001_initial.sql` dans votre IDE/éditeur de texte
4. **Copier tout son contenu** et le coller dans l'éditeur SQL de Supabase
5. Cliquer **Run** (en bas à droite)

Vous devriez voir `Success. No rows returned`. Si erreur, copiez-collez-moi le message.

### 4.2 — Désactiver la confirmation par email (pour tester rapidement)

Par défaut, Supabase envoie un email de confirmation. Pour les tests c'est pénible. À désactiver :

1. Sidebar → **Authentication** → **Providers** → cliquer **Email**
2. **Décocher** la case **"Confirm email"**
3. Cliquer **Save**

Vous pourrez vous inscrire et vous connecter immédiatement.

### 4.3 — Récupérer vos clés d'API

1. Sidebar → **Project Settings** (icône engrenage tout en bas) → **API**
2. Vous voyez :
   - **Project URL** → c'est votre `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → c'est votre `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (cliquer sur "Reveal") → c'est votre `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **ne le partagez jamais, ne le commitez jamais**

Gardez ces 3 valeurs sous la main pour l'étape suivante.

---

## Étape 5 — Configurer les variables d'environnement (2 min)

Dans le dossier `nordic-run/`, créez un fichier `.env.local` (à côté de `.env.example`) :

```bash
cp .env.example .env.local
```

Puis ouvrez `.env.local` dans votre éditeur (VS Code, TextEdit, Notepad…) et remplissez :

```bash
# Obligatoires (test fonctionne sans Stripe)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optionnels (laissez ces valeurs pour tester sans Stripe)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_PRICE_ID=price_placeholder

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Le bouton **"Activer l'abonnement 14,99 €"** ne fonctionnera pas (normal, on n'a pas branché Stripe), mais tout le reste marche.

---

## Étape 6 — Lancer l'app (10 secondes)

```bash
npm run dev
```

Après ~5 secondes, vous verrez :
```
  ▲ Next.js 14.2.15
  - Local:        http://localhost:3000
  ready in 2.1s
```

Ouvrez **http://localhost:3000** dans votre navigateur — vous arrivez sur la landing en français.

---

## Étape 7 — Tester le parcours complet

Voilà ce que vous pouvez tester, dans l'ordre :

1. **Landing** → cliquer **Essayer 14 jours**
2. **Signup** → créer un compte avec votre email + un mot de passe (8+ caractères)
3. **Onboarding (6 étapes)** :
   - Étape 1 : sexe (essayez **Femme** pour voir l'étape cycle plus tard)
   - Étape 2 : expérience (essayez : 2 ans, 30 km/sem, 5 jours, jamais fait d'intervalles → niveau détecté : `intermediate`)
   - Étape 3 : objectif (Progresser ou Performer)
   - Étape 4 : votre dernière course → vous voyez votre **VDOT** + **temps prédits** sur 5K/10K/HM/M
   - Étape 5 : contrainte de temps (laissez vide ou mettez 75 min)
   - Étape 6 : suivi du cycle (si Femme : Activer/Plus tard)
4. **Dashboard** → vous voyez :
   - Le bandeau "Essai gratuit — 14 jours restants"
   - Le **ressenti du jour** (essayez fatigue élevée + douleur : la séance s'adapte)
   - Le **prédicteur de temps** sur les 4 distances
   - La **séance du jour** avec but, ressenti, RPE, conseils du coach
5. **Plan** (sidebar) → voir les 4 semaines complètes
6. **Courses** → ajouter une course (ex : marathon dans 4 mois)
7. **Cycle** (si vous avez activé le suivi) → saisir un cycle, voir la phase détectée
8. **Profil** → modifier votre volume, vous déconnecter

---

## Points de blocage fréquents

### “Error: NEXT_PUBLIC_SUPABASE_URL is not defined”
Votre `.env.local` n'est pas chargé. Vérifiez qu'il est bien à la racine du dossier `nordic-run/` (et pas dans `src/`). Redémarrez `npm run dev`.

### “Invalid login credentials” après signup
Vous n'avez pas désactivé la confirmation par email (étape 4.2). Retournez dans Supabase → Authentication → Providers → Email → décocher "Confirm email". Ensuite supprimez le user créé (Authentication → Users → ...) et recréez-en un.

### “relation "public.profiles" does not exist”
Vous n'avez pas exécuté le SQL de l'étape 4.1. Retournez dans SQL Editor de Supabase et collez-exécutez le contenu de `supabase/migrations/0001_initial.sql`.

### Le bouton “Activer l'abonnement” ne fait rien
Normal : Stripe n'est pas configuré. Pour le brancher, suivez la section Stripe du README.

### Le port 3000 est déjà utilisé
```bash
npm run dev -- -p 3001
```
Et allez sur http://localhost:3001.

---

## Stopper / redémarrer

- Stop : `Ctrl+C` dans le terminal
- Restart : `npm run dev`
- Reset complet de la base : SQL Editor Supabase → `truncate table public.profiles, public.training_blocks, public.daily_logs, public.race_results, public.target_races, public.cycle_logs cascade;`
- Supprimer votre user : Authentication → Users → cliquer sur l'utilisateur → Delete user

---

Quand vous êtes bloqué, prenez une **capture d'écran de l'erreur** et envoyez-la moi, je débugue.
