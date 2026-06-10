# Comment Nordic Run applique la méthode norvégienne

Document de référence sur le modèle d'entraînement. Sources principales : publications d'**Arturo Casado** (Université Camilo José Cela, Madrid) et **Thomas Haugen** (Norwegian School of Sport Sciences) sur l'entraînement lactate-guidé, croisées avec les zones d'allure de **Jack Daniels** (Running Formula, 4e éd.).

## Les 6 principes du modèle norvégien implémentés

1. **Polarisation stricte de l'intensité.** ~80 % du volume hebdomadaire en facile (Z1, < 70 % FCmax), ~15 % au seuil (Z2-Z3 contrôlés, ≤ 4 mmol/L de lactate), ~5 % au-dessus (VO2max + neuromusculaire). Le code applique cette distribution dans `plan-generator.ts` via le choix des séances par jour.

2. **Travail au seuil "lactate-guidé".** L'allure LT1 (Norwegian AM session, ~2.0-2.5 mmol/L) est délibérément placée 6-14 secondes/km plus lente que l'allure T classique de Daniels — c'est le sous-seuil. Voir `vdot/paces.ts:lt1`. C'est le pilier de la méthode : du temps utile sans destruction.

3. **Double-seuil pour avancés uniquement.** Implémenté dans `norwegian.ts:shouldDoubleThreshold`. Le double-seuil n'apparaît que pour les coureurs catégorie *advanced* (volume hebdo ≥ 70 km + 3 ans + intervalles déjà faits) ou *elite* (≥ 110 km + 5 ans). Pour tout autre profil : une à deux séances de seuil simple par semaine.

4. **Volume construit progressivement.** Règle des 8 % par semaine maximum (plus prudente que la règle classique des 10 %) avec semaine de décharge à -25 % toutes les 4 semaines. Cible de volume calibrée selon le niveau :
   - Débutant : cible 50 km/sem
   - Intermédiaire : 80 km/sem
   - Avancé : 120 km/sem
   - Élite : 170 km/sem

5. **Spécificité progressive à l'approche de la course.** Le générateur applique 4 phases :
   - **Base** (> 8 semaines avant) : aérobie + introduction sous-seuil
   - **Build** (4-8 semaines) : seuil + VO2max + côtes
   - **Spécifique** (1-4 semaines) : séances à l'allure exacte de la course + VO2max retiré pour préserver la fraîcheur
   - **Affûtage** (< 10 jours) : volume -35 %, intensité préservée par une dernière séance allure cible courte

6. **Travail neuromusculaire constant.** Strides (lignes droites) en milieu de semaine pour tous les niveaux, côtes courtes en phase Build pour la force et l'économie de course.

## Tranches d'allure utilisées

Chaque séance affiche une **fourchette d'allure** (min-max sec/km), pas un point unique. Calculée depuis votre VDOT actuel via `vdot/paces.ts:buildPaceZones`.

| Zone | Lactate (mmol/L) | Usage | Calcul (relatif au T-pace de Daniels) |
|---|---|---|---|
| Easy (E) | < 2.0 | Footings, sortie longue | T-pace + 60 à 90 sec/km |
| Long | < 2.0 | Sortie longue spécifique | (E + M) / 2 |
| Marathon (M) | 2.0-2.5 | Allure cible marathon | M-pace ± 3 sec/km |
| **LT1 (sous-seuil)** | **2.0-2.5** | **Norwegian AM threshold** | **T-pace + 6 à 14 sec/km** |
| **LT2 (seuil)** | **3.0-4.0** | **Threshold classique** | **T-pace ± 3 sec/km** |
| Interval (I) | > 4.0 | VO2max, fractionné court | I-pace ± 3 sec/km |
| Repetition (R) | n.a. | Strides, côtes, sprint | R-pace ± 3 sec/km |

L'invariant testé (cf. `paces.test.ts`) : `easy > long > marathon > lt1 > lt2 > interval > repetition`.

## Séances catalogue

| Type | Quand | Allure | Exemple (VDOT 45) |
|---|---|---|---|
| `easy` | 3-4 fois/sem | E | 8 km à 5:19-5:49/km |
| `long` | Sam | Long | 14 km à 5:09-5:34/km |
| `strides` | Mer | E + R x 6 | 6 km E + 6 × 100 m strides |
| `hills` | Jeu (build, débutant) | R | 10 × 45 s en montée |
| `lt1_threshold` | Tue/Thu AM (avancés) | LT1 | 2k WU + 6 × 1 km @ LT1 + 2k CD |
| `lt1_threshold` PM | Tue/Thu PM (élite) | LT1 | 2k WU + 10 × 400 m @ LT1 + 2k CD |
| `lt2_threshold` | Tue ou Thu | LT2 | 2.5k WU + 5 × 1 km @ LT2 + 2.5k CD |
| `vo2max` | Jeu (build) | I | 2.5k WU + 5 × 1 km @ I + 2k CD |
| `race_pace` | Phase Spécifique | varie selon distance | voir tableau ci-dessous |
| `progression_long` | Sam (marathon, build/spec) | Long + M | 9 km long + 5 km M |
| `rest` | Lun/Ven | - | jour off |

## Séances spécifiques à l'approche de la course

Implémentées dans `workouts.ts:buildRacePace`. Volume et structure adaptés à la distance cible :

| Distance objectif | Volume allure cible | Structure | Allure de référence |
|---|---|---|---|
| 1500 m – 5K | 5 km | 5 × 1 km @ allure 5K, r=90 s | Interval (I) |
| 10K | 8 km | 4 × 2 km @ allure 10K, r=2 min | Interval (I) |
| Semi | 9 km | 3 × 3 km @ allure semi, r=3 min | LT2 |
| Marathon | 12 km | inséré dans la sortie longue progressive | Marathon (M) |

Pour le marathon, on utilise aussi `buildProgressionLong` : longue qui finit à allure marathon (apprentissage de la course rapide en état de fatigue glycogénique).

## Distances supportées

- **1500 m** (pour les coureurs de demi-fond — la méthode norvégienne vient de là)
- **3 km** (track / cross)
- **5 km**
- **10 km**
- **Semi-marathon** (21,097 km)
- **Marathon** (42,195 km)

Pour l'ultra (50 km+), la méthode norvégienne s'applique mal. Non supporté en V1.

## Adaptation quotidienne

Trois leviers principaux gérés dans `training/adaptation.ts` :

1. **Fatigue (1-5)** : à 4 → séance dure transformée en footing facile (-30 % de volume). À 5 → repos forcé.
2. **Douleur (0-3)** : à 2 → séance dure dégradée. À 3 → repos forcé.
3. **Cycle menstruel (opt-in)** : phase lutéale tardive ou menstruation + fatigue ≥ 3 → intensité réduite de 20 %.
4. **Contrainte de temps** : si l'utilisateur déclare 40 min dispo et la séance demande 65 min → tout l'entraînement est mis à l'échelle.
5. **Fatigue cumulée** sur 7 jours : si 3 jours+ à fatigue ≥ 4 → bloc complet recalibré à -15 %.

## Le lactate virtuel (calibration des allures)

Le maillon manquant de toutes les transpositions amateur de la méthode norvégienne :
les pros pilotent l'intensité au lactate sanguin, les amateurs n'ont que des allures
théoriques issues d'une table. `training/calibration.ts` ferme la boucle :

1. Chaque séance LT1/LT2 porte un **RPE prescrit** (LT1 = 6, LT2 = 7).
2. Le coureur valide la séance avec son **RPE réel** et un statut (faite / partielle / sautée).
3. Sur les 6 dernières semaines, la **dérive moyenne** (RPE réel − prescrit) est calculée par zone
   (minimum 3 retours par zone) ; une séance non terminée compte +1,5 de dérive.
4. Dérive > +1 → zones **ralenties** de 4 s/km par point de dérive (plafond +12 s/km).
   Dérive < −1 → zones **accélérées** prudemment (plafond −5 s/km) — les grosses corrections
   passent par une nouvelle perf VDOT, pas par le ressenti.

L'asymétrie est volontaire : en sous-seuil, **courir trop vite est l'erreur cardinale**
(on bascule en zone 4-5 mmol/L et on détruit la récupération), courir trop lentement
coûte très peu. Chaque ajustement est expliqué au coureur sur le dashboard.

## Ce que la méthode n'est PAS

- **Pas de VO2max permanent.** Le VO2max apparaît en phase Build uniquement.
- **Pas de tempo "no man's land".** L'allure 4-5 mmol/L est délibérément évitée.
- **Pas de longue à allure marathon pour les débutants.** Activée uniquement quand un marathon est planifié et qu'on est en phase Build ou Spécifique.

## Validation scientifique

| Paramètre du code | Référence |
|---|---|
| Augmentation max 8 %/sem | Gabbett, T. (2016) "The training-injury prevention paradox" |
| Sous-seuil ~2 mmol/L | Casado, A. et al. (2022) "Threshold control in elite distance runners" |
| Double-seuil bas (Norwegian protocol) | Haugen, T. (2022) "Training characteristics of world-class endurance runners" |
| Allures Easy/M/T/I/R | Daniels, J. (2014) "Running Formula" 4th ed. |
| Adaptation aux phases du cycle | Janse de Jonge, X. (2003) "Effects of the menstrual cycle on exercise performance" |

Toutes les formules sont auditables dans `src/lib/`. Les tests unitaires (`*.test.ts`) valident les invariants critiques.
