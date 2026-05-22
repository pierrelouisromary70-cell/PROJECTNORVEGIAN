// Workout variants — keep the same training stimulus while varying the structure.
// Sessions rotate week-by-week so the plan stays engaging.
//
// Volume per session scales with the runner's weekly volume:
// a 60 km/wk runner does 5×1000 at threshold, a 100 km/wk runner does 6-7×1000.

import type { PaceZoneKey } from './types';

export interface SessionStep {
  reps?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  pace: PaceZoneKey;
  recoverySeconds?: number;
  note?: string;
}

export interface SessionVariant {
  label: string;
  structure: string;
  feelHint: string;
  approachTips: string[];
  build(weeklyKm: number): SessionStep[];
  workKm(weeklyKm: number): number;
}

function scaleReps(weeklyKm: number, min: number, max: number): number {
  if (weeklyKm <= 40) return min;
  if (weeklyKm >= 120) return max;
  return Math.round(min + ((weeklyKm - 40) / 80) * (max - min));
}

// ---------- LT2 (SV2, threshold) — 12 variants ------------------------------

export const LT2_VARIANTS: SessionVariant[] = [
  {
    label: '5×1000 m',
    structure: 'Cinq répétitions de 1 km à allure seuil haut, 60 s de récup',
    feelHint: "Effort soutenu mais contrôlé. Vous parlez par mots isolés sur les 2 dernières.",
    approachTips: ['Échauffement complet : 20 min easy + 4 strides', "Première rep volontairement contrôlée, pas plus rapide que la dernière", 'Si vous craquez sur la 4e, vous étiez trop rapide depuis la 1ère'],
    build: (km) => [{ reps: scaleReps(km, 4, 7), distanceMeters: 1000, pace: 'lt2', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 4, 7),
  },
  {
    label: '4×1500 m',
    structure: 'Quatre répétitions longues à allure seuil, 90 s de récup',
    feelHint: "Reps longues — la concentration mentale est aussi importante que l'allure.",
    approachTips: ['Allure cible : seuil haut, mais sentez-vous à 95 % maximum', 'Pas de fractionné mental sur 1500 m, restez sur la respiration', 'Récupération active en trot doux, pas marche'],
    build: (km) => [{ reps: scaleReps(km, 3, 5), distanceMeters: 1500, pace: 'lt2', recoverySeconds: 90 }],
    workKm: (km) => scaleReps(km, 3, 5) * 1.5,
  },
  {
    label: '6×800 m',
    structure: 'Six répétitions courtes à allure seuil, 45 s de récup',
    feelHint: "Plus piquant que le 1000 — mais récup très courte, ce qui maintient le stress lactique.",
    approachTips: ["Allure légèrement plus rapide que le 1000 (5 sec/km plus vite)", "Récupération volontairement courte — ne traînez pas", 'Excellent pour casser la routine du 1000'],
    build: (km) => [{ reps: scaleReps(km, 5, 8), distanceMeters: 800, pace: 'lt2', recoverySeconds: 45 }],
    workKm: (km) => scaleReps(km, 5, 8) * 0.8,
  },
  {
    label: '3×2000 m',
    structure: 'Trois longues à allure seuil, 2 min de récup',
    feelHint: "Reps très longues, mentalement exigeantes — c'est la séance qui prépare le semi.",
    approachTips: ["Allure cible : seuil bas (un cran sous le seuil haut)", "Diviser mentalement chaque 2000 en 2 × 1000", 'Récupération longue : prenez le temps de respirer'],
    build: (km) => [{ reps: scaleReps(km, 2, 4), distanceMeters: 2000, pace: 'lt2', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 2, 4) * 2,
  },
  {
    label: 'Pyramide 1-1.5-2-1.5-1',
    structure: '1000 + 1500 + 2000 + 1500 + 1000 m à allure seuil, 90 s de récup',
    feelHint: "La 2000 du milieu est l'épreuve mentale — si vous tenez, le reste roule.",
    approachTips: ['Première moitié : montez progressivement en intensité', 'Pic mental sur la 2000 — gérez-la comme un mini-tempo', "Deuxième moitié : la 1500 redescendante doit sembler 'facile' relativement"],
    build: () => [
      { distanceMeters: 1000, pace: 'lt2', recoverySeconds: 90 },
      { distanceMeters: 1500, pace: 'lt2', recoverySeconds: 90 },
      { distanceMeters: 2000, pace: 'lt2', recoverySeconds: 90 },
      { distanceMeters: 1500, pace: 'lt2', recoverySeconds: 90 },
      { distanceMeters: 1000, pace: 'lt2', recoverySeconds: 0 },
    ],
    workKm: () => 7,
  },
  {
    label: 'Tempo continu 20 min',
    structure: '20 min en continu à allure seuil — le classique de Daniels',
    feelHint: "Effort soutenu sans interruption. Au milieu vous voulez ralentir — résistez.",
    approachTips: ['Idéal sur route ou chemin plat', "Commencez doucement les 2 premières min, montez en allure progressivement", "Le mental est le facteur limitant — pas l'allure"],
    build: () => [{ durationSeconds: 20 * 60, pace: 'lt2' }],
    workKm: () => 5.5,
  },
  {
    label: 'Tempo + reps (combo)',
    structure: '10 min tempo + 4×800 m seuil',
    feelHint: "Le combo qui simule la fin d'un 10 km : on est déjà cuit puis on accélère.",
    approachTips: ['10 min en continu à allure seuil bas — gérée comme un échauffement long', "Récupération 3 min easy entre les 2 blocs", 'Les 800 doivent être plus rapides que le tempo — visez allure 10 km'],
    build: (km) => [
      { durationSeconds: 10 * 60, pace: 'lt2', note: 'Bloc tempo' },
      { distanceMeters: 0, pace: 'easy', durationSeconds: 180, note: 'Récup 3 min' },
      { reps: scaleReps(km, 3, 5), distanceMeters: 800, pace: 'lt2', recoverySeconds: 60, note: 'Bloc reps' },
    ],
    workKm: (km) => 2.8 + scaleReps(km, 3, 5) * 0.8,
  },
  {
    label: '2×15 min seuil',
    structure: 'Deux blocs continus de 15 min à allure seuil, 3 min récup',
    feelHint: "Patience mentale x2. Le deuxième bloc démarre alors que vous êtes déjà fatigué — c'est le but.",
    approachTips: ['Allure : seuil bas, pas seuil haut — la durée fait le travail', "Le 2e bloc démarre à 80 % de fatigue, allure identique au 1er", 'Idéale pour préparer un semi : simule la fatigue du 2e tiers de course'],
    build: () => [
      { durationSeconds: 15 * 60, pace: 'lt2', note: 'Bloc 1' },
      { durationSeconds: 180, pace: 'easy', note: 'Récup 3 min' },
      { durationSeconds: 15 * 60, pace: 'lt2', note: 'Bloc 2' },
    ],
    workKm: () => 8.5,
  },
  {
    label: '8×500 m cruise',
    structure: 'Huit 500 m courts avec récup 45 s, format cruise',
    feelHint: "Très rythmé. Les reps sont si courtes que vous ne sentez pas la fatigue avant la 5e.",
    approachTips: ['Allure : seuil bas, pas plus rapide', "Garder le rythme stable — la régularité est la clé", 'Idéal pour les coureurs qui débutent sur le seuil'],
    build: (km) => [{ reps: scaleReps(km, 6, 10), distanceMeters: 500, pace: 'lt2', recoverySeconds: 45 }],
    workKm: (km) => scaleReps(km, 6, 10) * 0.5,
  },
  {
    label: 'Tempo descendant 3×2000',
    structure: 'Trois 2000 m avec allure descendante (2 sec/km plus rapide à chaque rep), 2 min récup',
    feelHint: "Progression contrôlée. Le 3e doit piquer mais rester gérable — c'est l'apprentissage du finish.",
    approachTips: ["Le 1er à allure seuil bas, le 2e seuil milieu, le 3e seuil haut", "Ne pas surestimer le 1er — laissez-vous une marge", 'Excellente pour apprendre à finir une course rapidement'],
    build: () => [
      { distanceMeters: 2000, pace: 'lt2', recoverySeconds: 120, note: 'Seuil bas' },
      { distanceMeters: 2000, pace: 'lt2', recoverySeconds: 120, note: 'Seuil milieu' },
      { distanceMeters: 2000, pace: 'lt2', recoverySeconds: 0, note: 'Seuil haut' },
    ],
    workKm: () => 6,
  },
  {
    label: 'Mona fartlek (90-60-30)',
    structure: 'Fartlek australien : 2×(90s + 90s) + 4×(60s + 60s) + 4×(30s + 30s) + 4×(15s + 15s)',
    feelHint: "Ludique mais exigeant. Le rythme change tout le temps — votre cerveau ne décroche jamais.",
    approachTips: ["Allure des blocs effort : seuil haut → VO2max (les 30 et 15 plus rapides)", "Récupération en footing actif, pas marche", 'Séance signature du marathonien australien Steve Moneghetti', 'À placer en milieu de bloc pour réveiller la dynamique'],
    build: () => [
      { durationSeconds: 90, pace: 'lt2', recoverySeconds: 90 },
      { durationSeconds: 90, pace: 'lt2', recoverySeconds: 90 },
      { durationSeconds: 60, pace: 'lt2', recoverySeconds: 60 },
      { durationSeconds: 60, pace: 'lt2', recoverySeconds: 60 },
      { durationSeconds: 60, pace: 'lt2', recoverySeconds: 60 },
      { durationSeconds: 60, pace: 'lt2', recoverySeconds: 60 },
      { durationSeconds: 30, pace: 'interval', recoverySeconds: 30 },
      { durationSeconds: 30, pace: 'interval', recoverySeconds: 30 },
      { durationSeconds: 30, pace: 'interval', recoverySeconds: 30 },
      { durationSeconds: 30, pace: 'interval', recoverySeconds: 30 },
      { durationSeconds: 15, pace: 'interval', recoverySeconds: 15 },
      { durationSeconds: 15, pace: 'interval', recoverySeconds: 15 },
      { durationSeconds: 15, pace: 'interval', recoverySeconds: 15 },
      { durationSeconds: 15, pace: 'interval', recoverySeconds: 0 },
    ],
    workKm: () => 5,
  },
  {
    label: '4×2000 m seuil long',
    structure: 'Quatre longues à allure seuil bas, 2 min récup',
    feelHint: "Volume au seuil qui fait progresser le seuil sans cassure. Mentalement long, physiquement gérable.",
    approachTips: ['Allure : seuil bas (lactate ~3 mmol/L)', "Au 3e km de chaque rep, le mental fatigue avant les jambes — résistez", 'Excellente pour les marathoniens et coureurs de semi'],
    build: (km) => [{ reps: scaleReps(km, 3, 5), distanceMeters: 2000, pace: 'lt2', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 3, 5) * 2,
  },
  {
    label: '10×1000 m cruise',
    structure: 'Dix 1000 m au seuil bas, récupération courte 45 s — séance de gros volume',
    feelHint: "Volume au seuil pur. C'est la séance qui sépare les vrais marathoniens des autres.",
    approachTips: ['Allure : seuil bas STRICT — pas plus rapide, le piège du 1000 c\'est l\'envie d\'accélérer', "Récupération volontairement courte (45 s)", "Pour coureurs entraînés (volume ≥ 80 km/sem)", 'Idéale 6-8 semaines avant un marathon'],
    build: (km) => [{ reps: scaleReps(km, 6, 12), distanceMeters: 1000, pace: 'lt2', recoverySeconds: 45 }],
    workKm: (km) => scaleReps(km, 6, 12),
  },
];

// ---------- LT1 AM (SV1 sub-threshold) — 9 variants -------------------------

export const LT1_AM_VARIANTS: SessionVariant[] = [
  {
    label: '6×1000 m',
    structure: 'Six répétitions à allure sous-seuil (LT1, ~2 mmol/L), 60 s récup',
    feelHint: "Conversation par phrases courtes possible. Vous DEVEZ pouvoir refaire la séance dans 6h.",
    approachTips: ['Allure cible : 6-14 sec/km plus lente que votre allure seuil haut', "Le piège : aller trop vite — c'est l'erreur classique du sous-seuil", 'Pas de fatigue résiduelle à la fin'],
    build: (km) => [{ reps: scaleReps(km, 5, 8), distanceMeters: 1000, pace: 'lt1', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 5, 8),
  },
  {
    label: '8×800 m',
    structure: 'Huit répétitions plus courtes à allure sous-seuil, 60 s récup',
    feelHint: "Variante 'tour de piste' du sous-seuil norvégien. Plus rythmé que le 1000.",
    approachTips: ['Reps légèrement plus courtes = allure très stable', 'Récupération en trot, pas marche', 'Visez 3:08 par 800 m si votre allure LT1 est 3:55/km'],
    build: (km) => [{ reps: scaleReps(km, 6, 10), distanceMeters: 800, pace: 'lt1', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 6, 10) * 0.8,
  },
  {
    label: '4×1500 m',
    structure: 'Quatre longues à allure sous-seuil, 90 s récup',
    feelHint: "Reps longues qui ressemblent presque à du tempo. Patience mentale.",
    approachTips: ["Idéal pour préparer un semi", 'Allure : sous-seuil bas', 'Récupération un peu plus longue car les reps sont longues'],
    build: (km) => [{ reps: scaleReps(km, 3, 6), distanceMeters: 1500, pace: 'lt1', recoverySeconds: 90 }],
    workKm: (km) => scaleReps(km, 3, 6) * 1.5,
  },
  {
    label: '10×600 m',
    structure: 'Dix répétitions courtes à allure sous-seuil, 60 s récup',
    feelHint: "Très rythmé. La séance ne fait pas mal mais le compteur monte vite.",
    approachTips: ["Allure : sous-seuil moyen", "60 s de récup en trot", "Idéale pour habituer le corps au sous-seuil sans casse"],
    build: (km) => [{ reps: scaleReps(km, 8, 12), distanceMeters: 600, pace: 'lt1', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 8, 12) * 0.6,
  },
  {
    label: '5×1200 m',
    structure: 'Cinq répétitions de 1200 m à allure sous-seuil, 75 s récup',
    feelHint: "Bon équilibre entre durée et nombre de reps. Le 1200 est la distance « confort » du sous-seuil.",
    approachTips: ["Allure : sous-seuil bas", "Si vous ralentissez à la 4e rep, vous étiez 3 sec/km trop rapide", 'Excellente pour les coureurs de 10K et semi'],
    build: (km) => [{ reps: scaleReps(km, 4, 7), distanceMeters: 1200, pace: 'lt1', recoverySeconds: 75 }],
    workKm: (km) => scaleReps(km, 4, 7) * 1.2,
  },
  {
    label: '2×3000 m + 4×600 m',
    structure: "Combo norvégien : 2 longues + 4 courtes à allure sous-seuil",
    feelHint: "Double impact : volume soutenu sur les 3000, qualité courte sur les 600.",
    approachTips: ["Allure : sous-seuil bas sur les 3000, sous-seuil haut sur les 600", "Récup 2 min entre les 3000, 60 s entre les 600", "Pour coureurs avancés (≥ 80 km/sem)"],
    build: () => [
      { distanceMeters: 3000, pace: 'lt1', recoverySeconds: 120 },
      { distanceMeters: 3000, pace: 'lt1', recoverySeconds: 180, note: 'Récup 3 min avant le bloc court' },
      { reps: 4, distanceMeters: 600, pace: 'lt1', recoverySeconds: 60 },
    ],
    workKm: () => 8.4,
  },
  {
    label: 'Tempo sous-seuil 30 min',
    structure: '30 minutes en continu à allure sous-seuil',
    feelHint: "Effort soutenu sur la durée. Le test de patience : pas trop vite, pas trop facile.",
    approachTips: ["Allure : sous-seuil bas (lactate ~2.0 mmol/L)", "L'erreur classique : accélérer en milieu de séance", 'Vous devez finir frais'],
    build: () => [{ durationSeconds: 30 * 60, pace: 'lt1' }],
    workKm: () => 8,
  },
  {
    label: '6×1000 m alternés',
    structure: "Six 1000 m en alternant sous-seuil et allure marathon, 30 s récup",
    feelHint: "Le rythme change tout le temps — votre corps doit s'adapter en continu.",
    approachTips: ["1ère, 3e, 5e rep : sous-seuil. 2e, 4e, 6e rep : allure marathon", "Récupération courte (30 s)", "Excellente pour préparer un marathon"],
    build: () => [
      { distanceMeters: 1000, pace: 'lt1', recoverySeconds: 30 },
      { distanceMeters: 1000, pace: 'marathon', recoverySeconds: 30 },
      { distanceMeters: 1000, pace: 'lt1', recoverySeconds: 30 },
      { distanceMeters: 1000, pace: 'marathon', recoverySeconds: 30 },
      { distanceMeters: 1000, pace: 'lt1', recoverySeconds: 30 },
      { distanceMeters: 1000, pace: 'marathon', recoverySeconds: 0 },
    ],
    workKm: () => 6,
  },
  {
    label: '12×1000 m gros volume',
    structure: 'Douze 1000 m à allure sous-seuil, récup 45 s — séance norvégienne « maximale »',
    feelHint: "Volume au sous-seuil pur. C'est l'épreuve de vérité du coureur norvégien.",
    approachTips: ["Pour coureurs élite (volume ≥ 100 km/sem) uniquement", "Allure : sous-seuil bas STRICT", "Vérifier régulièrement le lactate si possible", 'Séance signature des Ingebrigtsen'],
    build: (km) => [{ reps: scaleReps(km, 8, 12), distanceMeters: 1000, pace: 'lt1', recoverySeconds: 45 }],
    workKm: (km) => scaleReps(km, 8, 12),
  },
];

// ---------- LT1 PM variants — 7 variants ------------------------------------

export const LT1_PM_VARIANTS: SessionVariant[] = [
  {
    label: '10×400 m',
    structure: 'Dix répétitions courtes à allure sous-seuil haut, 30 s récup',
    feelHint: "Plus piquant que la séance du matin — récup ultra-courte.",
    approachTips: ["Allure un cran plus rapide que la séance AM", "30 secondes de trot", "Si vous craquez à mi-séance, la séance AM était trop dure"],
    build: (km) => [{ reps: scaleReps(km, 8, 14), distanceMeters: 400, pace: 'lt1', recoverySeconds: 30 }],
    workKm: (km) => scaleReps(km, 8, 14) * 0.4,
  },
  {
    label: '12×300 m',
    structure: 'Douze courtes très rythmées, 30 s récup',
    feelHint: "Sensation de course de relais. Court, rapide, propre.",
    approachTips: ['Allure : sous-seuil haut, à la limite du seuil bas', 'Récup très courte mais en trot', "Restez concentré"],
    build: (km) => [{ reps: scaleReps(km, 10, 16), distanceMeters: 300, pace: 'lt1', recoverySeconds: 30 }],
    workKm: (km) => scaleReps(km, 10, 16) * 0.3,
  },
  {
    label: 'Échelle 200-400-600-400-200 × 2',
    structure: 'Deux blocs en échelle ascendante-descendante, 45 s récup',
    feelHint: "Casse la monotonie du fractionné classique.",
    approachTips: ['Allure : sous-seuil haut', "Le 600 monte mentalement", 'Récupération 2 min entre les 2 blocs'],
    build: () => [
      { distanceMeters: 200, pace: 'lt1', recoverySeconds: 45 },
      { distanceMeters: 400, pace: 'lt1', recoverySeconds: 45 },
      { distanceMeters: 600, pace: 'lt1', recoverySeconds: 45 },
      { distanceMeters: 400, pace: 'lt1', recoverySeconds: 45 },
      { distanceMeters: 200, pace: 'lt1', recoverySeconds: 120, note: 'Récup 2 min entre blocs' },
      { distanceMeters: 200, pace: 'lt1', recoverySeconds: 45 },
      { distanceMeters: 400, pace: 'lt1', recoverySeconds: 45 },
      { distanceMeters: 600, pace: 'lt1', recoverySeconds: 45 },
      { distanceMeters: 400, pace: 'lt1', recoverySeconds: 45 },
      { distanceMeters: 200, pace: 'lt1', recoverySeconds: 0 },
    ],
    workKm: () => 3.6,
  },
  {
    label: '15×200 m turnover',
    structure: 'Quinze 200 m rythmés à allure sous-seuil, 30 s récup',
    feelHint: "Très court, très répétitif. Le mental décroche après la 8e.",
    approachTips: ["Allure : sous-seuil haut", "Compter par 5 : 5, 5, 5 — mentalement plus facile", "Idéale pour réveiller la cadence"],
    build: (km) => [{ reps: scaleReps(km, 12, 18), distanceMeters: 200, pace: 'lt1', recoverySeconds: 30 }],
    workKm: (km) => scaleReps(km, 12, 18) * 0.2,
  },
  {
    label: '5×600 m',
    structure: 'Cinq 600 m plus longs à allure sous-seuil, 45 s récup',
    feelHint: "Format intermédiaire entre PM courte et AM longue.",
    approachTips: ["Allure : sous-seuil haut", 'Récup 45 s en trot léger', "Bonne pour les coureurs qui débutent le double seuil"],
    build: (km) => [{ reps: scaleReps(km, 4, 7), distanceMeters: 600, pace: 'lt1', recoverySeconds: 45 }],
    workKm: (km) => scaleReps(km, 4, 7) * 0.6,
  },
  {
    label: '8×500 m',
    structure: 'Huit 500 m à allure sous-seuil, 40 s récup',
    feelHint: "Mi-distance, mi-durée. Sensation d'enchaîner sans s'arrêter vraiment.",
    approachTips: ["Allure : sous-seuil haut", "Récupération volontairement courte (40 s)", "Excellent en seconde partie de bloc"],
    build: (km) => [{ reps: scaleReps(km, 6, 10), distanceMeters: 500, pace: 'lt1', recoverySeconds: 40 }],
    workKm: (km) => scaleReps(km, 6, 10) * 0.5,
  },
  {
    label: 'Mix 8×400 + 4×200',
    structure: 'Huit 400 m + quatre 200 m plus rapides, 30 s récup',
    feelHint: "Construction progressive. Les 200 finaux relancent la dynamique.",
    approachTips: ["Les 400 à allure sous-seuil haut", "Les 200 finaux 2-3 sec/km plus rapides", "Récup constante : 30 s en trot"],
    build: () => [
      { reps: 8, distanceMeters: 400, pace: 'lt1', recoverySeconds: 30 },
      { distanceMeters: 0, pace: 'easy', durationSeconds: 60, note: 'Récup 1 min avant bloc rapide' },
      { reps: 4, distanceMeters: 200, pace: 'lt2', recoverySeconds: 30 },
    ],
    workKm: () => 4,
  },
];

// ---------- VO2max variants — 5 variants ------------------------------------

export const VO2_VARIANTS: SessionVariant[] = [
  {
    label: '5×1000 m',
    structure: 'Cinq répétitions de 1 km à allure VO2max, 2 min récup',
    feelHint: "Dur. 8.5/10. Respiration intense, vous ne pouvez plus parler.",
    approachTips: ['Échauffement très complet — 20 min easy + 4-6 strides', 'Partez prudent : 3 sec/km plus lent que la cible sur la 1ère rep', "Si vous ralentissez à la 4e, l'allure était trop ambitieuse"],
    build: (km) => [{ reps: scaleReps(km, 4, 6), distanceMeters: 1000, pace: 'interval', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 4, 6),
  },
  {
    label: '6×800 m',
    structure: 'Six répétitions à allure VO2max, 2 min récup',
    feelHint: "Plus court mais plus rapide. Souvent ressenti comme 'plus dur' que le 1000.",
    approachTips: ['Allure : 3-5 sec/km plus rapide que la cible du 1000', "Prépare un 5 km", "Récup 2 min ferme"],
    build: (km) => [{ reps: scaleReps(km, 5, 8), distanceMeters: 800, pace: 'interval', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 5, 8) * 0.8,
  },
  {
    label: '4×1200 m',
    structure: 'Quatre longues VO2max, 3 min récup',
    feelHint: "Reps longues à intensité élevée — c'est là que l'on construit la puissance aérobie.",
    approachTips: ['Les 1200 sont la durée optimale pour stimuler VO2max', 'Visez allure 3 km', 'Récup longue'],
    build: (km) => [{ reps: scaleReps(km, 3, 5), distanceMeters: 1200, pace: 'interval', recoverySeconds: 180 }],
    workKm: (km) => scaleReps(km, 3, 5) * 1.2,
  },
  {
    label: 'Pyramide 400-800-1200-800-400',
    structure: 'Pyramide VO2max ascendante puis descendante',
    feelHint: "Le 1200 du milieu est LA difficulté. Une fois passée, le reste se fait par habitude.",
    approachTips: ['Allure : 400 = allure 1500m, 800 = allure 3K, 1200 = allure 5K', 'La descente est psychologiquement plus facile', 'Excellente pour les coureurs de demi-fond'],
    build: () => [
      { distanceMeters: 400, pace: 'interval', recoverySeconds: 90 },
      { distanceMeters: 800, pace: 'interval', recoverySeconds: 120 },
      { distanceMeters: 1200, pace: 'interval', recoverySeconds: 180 },
      { distanceMeters: 800, pace: 'interval', recoverySeconds: 120 },
      { distanceMeters: 400, pace: 'interval', recoverySeconds: 0 },
    ],
    workKm: () => 3.6,
  },
  {
    label: '10×400 m vite',
    structure: 'Dix 400 m à allure 3 km, 90 s récup',
    feelHint: "Court, intense, rythmique. Sensation de course de demi-fond.",
    approachTips: ['Allure : 3 sec/km plus rapide que VO2max classique', 'Récupération active en trot', 'Idéal pour réveiller la puissance'],
    build: (km) => [{ reps: scaleReps(km, 8, 12), distanceMeters: 400, pace: 'interval', recoverySeconds: 90 }],
    workKm: (km) => scaleReps(km, 8, 12) * 0.4,
  },
];

// ---------- Hills variants --------------------------------------------------

export const HILL_VARIANTS: SessionVariant[] = [
  {
    label: 'Côtes courtes 10×45 s',
    structure: 'Dix montées de 45 s sur pente 5-8 %, retour en trottinant',
    feelHint: "Effort énergétique mais court. Vous récupérez à la descente.",
    approachTips: ['Posture droite, regard à 5 m devant', 'Cadence élevée — pas de grandes foulées', 'Marchez/trottez à la descente'],
    build: (km) => [{ reps: scaleReps(km, 8, 14), durationSeconds: 45, pace: 'repetition', recoverySeconds: 90, note: 'En montée' }],
    workKm: (km) => scaleReps(km, 8, 14) * 0.15,
  },
  {
    label: 'Côtes longues 6×2 min',
    structure: 'Six montées de 2 min sur pente modérée 4-6 %',
    feelHint: "Plus aérobique que les courtes. C'est dur, mais c'est de la puissance pure.",
    approachTips: ["Allure : effort soutenu (RPE 7-8), pas tout-out", "Idéal pour les coureurs de marathon/semi", 'Pente modérée privilégiée'],
    build: (km) => [{ reps: scaleReps(km, 5, 7), durationSeconds: 120, pace: 'lt2', recoverySeconds: 180, note: 'En montée modérée' }],
    workKm: (km) => scaleReps(km, 5, 7) * 0.5,
  },
  {
    label: 'Fartlek côtes (jeu de courses)',
    structure: 'Boucle vallonnée : on accélère en montée, on récupère en descente',
    feelHint: "Free-form, joueur. La pente impose le rythme — pas l'allure cible.",
    approachTips: ["Boucle de 45-60 min sur terrain vallonné", "À chaque côte : accélération, effort 7-8/10", "Descentes en récupération active", 'Excellent pour casser la routine'],
    build: () => [{ durationSeconds: 45 * 60, pace: 'long', note: 'Fartlek vallonné' }],
    workKm: () => 10,
  },
  {
    label: 'Échelle de côtes 30-60-90-60-30 s × 2',
    structure: 'Échelle de durée en montée, deux blocs',
    feelHint: "Engageant mentalement, varie le stimulus neuromusculaire.",
    approachTips: ['Allure : effort intense sur les 30 et 60, plus contrôlé sur le 90', "Récup en redescendant tranquillement", '3 min entre les deux blocs'],
    build: () => [
      { durationSeconds: 30, pace: 'repetition', recoverySeconds: 60 },
      { durationSeconds: 60, pace: 'interval', recoverySeconds: 90 },
      { durationSeconds: 90, pace: 'lt2', recoverySeconds: 120 },
      { durationSeconds: 60, pace: 'interval', recoverySeconds: 90 },
      { durationSeconds: 30, pace: 'repetition', recoverySeconds: 180, note: 'Récup 3 min entre blocs' },
      { durationSeconds: 30, pace: 'repetition', recoverySeconds: 60 },
      { durationSeconds: 60, pace: 'interval', recoverySeconds: 90 },
      { durationSeconds: 90, pace: 'lt2', recoverySeconds: 120 },
      { durationSeconds: 60, pace: 'interval', recoverySeconds: 90 },
      { durationSeconds: 30, pace: 'repetition', recoverySeconds: 0 },
    ],
    workKm: () => 3,
  },
];

// ---------- Speed (R-pace) variants -----------------------------------------

export const SPEED_VARIANTS: SessionVariant[] = [
  {
    label: '10×200 m',
    structure: 'Dix répétitions courtes à allure rapide, 1 min récup',
    feelHint: "Court, vif, propre. Chaque rep doit être contrôlée techniquement.",
    approachTips: ['Allure : ~95 % de votre vitesse max sur 20-25 s', 'Posture haute, cadence rapide', 'Sur piste si possible'],
    build: (km) => [{ reps: scaleReps(km, 8, 12), distanceMeters: 200, pace: 'repetition', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 8, 12) * 0.2,
  },
  {
    label: '6×400 m vite',
    structure: 'Six tours de piste rapides, 2 min récup',
    feelHint: "Plus soutenu que le 200. Stress lactique léger, vitesse haute.",
    approachTips: ['Allure : entre 1500m et 800m de course', 'Récup en marche puis trot léger', 'Idéal en phase spécifique 1500/3K'],
    build: (km) => [{ reps: scaleReps(km, 5, 8), distanceMeters: 400, pace: 'repetition', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 5, 8) * 0.4,
  },
  {
    label: 'Échelle 400-300-200-100 × 2',
    structure: 'Échelle descendante en vitesse pure, deux blocs',
    feelHint: "Sensation de course d'athlétisme. Le 100 final est presque un sprint.",
    approachTips: ['Allure progressive : 400 = allure 1500, 100 = sprint contrôlé', "Plus la rep est courte, plus c'est rapide", '3 min entre les blocs'],
    build: () => [
      { distanceMeters: 400, pace: 'repetition', recoverySeconds: 90 },
      { distanceMeters: 300, pace: 'repetition', recoverySeconds: 75 },
      { distanceMeters: 200, pace: 'repetition', recoverySeconds: 60 },
      { distanceMeters: 100, pace: 'repetition', recoverySeconds: 180, note: 'Récup 3 min entre blocs' },
      { distanceMeters: 400, pace: 'repetition', recoverySeconds: 90 },
      { distanceMeters: 300, pace: 'repetition', recoverySeconds: 75 },
      { distanceMeters: 200, pace: 'repetition', recoverySeconds: 60 },
      { distanceMeters: 100, pace: 'repetition', recoverySeconds: 0 },
    ],
    workKm: () => 2,
  },
  {
    label: 'Fartlek de vitesse',
    structure: 'Alternance libre : 1 min vif / 1 min easy × 12-15',
    feelHint: "Jouer avec la vitesse, sans regarder la montre. Sensation pure.",
    approachTips: ["Allure 'vif' = à l'aise mais rapide, pas tout-out", "Récupération en footing pas en marche", "Excellente pour relancer le plaisir"],
    build: (km) => {
      const reps = scaleReps(km, 10, 16);
      const steps: SessionStep[] = [];
      for (let i = 0; i < reps; i++) {
        steps.push({ durationSeconds: 60, pace: 'interval', recoverySeconds: 60, note: `${i + 1}/${reps} vif` });
      }
      return steps;
    },
    workKm: (km) => scaleReps(km, 10, 16) * 0.3,
  },
];

// ---------- Volume + threshold variants (long with embedded blocks) ----------

export const VOLUME_THRESHOLD_VARIANTS: SessionVariant[] = [
  {
    label: 'Long avec 3 blocs sous-seuil',
    structure: 'Sortie longue de 18-22 km avec 3 × 8 min à allure sous-seuil insérés',
    feelHint: "Volume aérobie dominant, avec piqûres de qualité pour habituer le corps à courir au seuil sous la fatigue.",
    approachTips: ["Démarrer en footing long pendant 25 min", "Insérer 3 blocs de 8 min à allure sous-seuil, espacés de 5 min en footing", "Finir en footing long 10-15 min", "Excellent pour la prépa marathon — vraiment spécifique", "Nutrition de course recommandée"],
    build: (km) => {
      const totalKm = Math.max(16, Math.round(km * 0.30));
      const easyKm = Math.max(4, Math.round(totalKm * 0.25));
      return [
        { distanceMeters: easyKm * 1000, pace: 'long', note: 'Échauffement long' },
        { durationSeconds: 8 * 60, pace: 'lt1', note: 'Bloc sous-seuil 1' },
        { durationSeconds: 5 * 60, pace: 'long', note: 'Récup en long' },
        { durationSeconds: 8 * 60, pace: 'lt1', note: 'Bloc sous-seuil 2' },
        { durationSeconds: 5 * 60, pace: 'long', note: 'Récup en long' },
        { durationSeconds: 8 * 60, pace: 'lt1', note: 'Bloc sous-seuil 3' },
        { durationSeconds: 15 * 60, pace: 'long', note: 'Retour au calme long' },
      ];
    },
    workKm: (km) => Math.max(16, Math.round(km * 0.30)),
  },
  {
    label: 'Long avec finish seuil',
    structure: 'Sortie longue avec les 4 derniers km à allure seuil bas (LT2)',
    feelHint: "Le corps est déjà fatigué et on demande encore un effort de qualité.",
    approachTips: ["Premiers 75 % à allure longue facile", "Derniers 4 km : allure seuil bas, ferme et contrôlée", "Très exigeant — à réserver à la phase build/spécifique", "Idéal pour préparer un semi ou un marathon"],
    build: (km) => {
      const totalKm = Math.max(14, Math.round(km * 0.28));
      const seuilKm = 4;
      const longKm = totalKm - seuilKm;
      return [
        { distanceMeters: longKm * 1000, pace: 'long', note: 'Partie longue' },
        { distanceMeters: seuilKm * 1000, pace: 'lt2', note: 'Finish seuil' },
      ];
    },
    workKm: (km) => Math.max(14, Math.round(km * 0.28)),
  },
  {
    label: 'Long avec 6×1 km marathon insérés',
    structure: 'Long de 22-26 km avec 6 × 1 km à allure marathon (M-pace) tous les 3 km',
    feelHint: "Simulation de course marathon : on accélère puis on relâche, puis on accélère à nouveau. Mental d'acier.",
    approachTips: ["Allure facile-longue entre les 1 km à allure marathon", "Les 6 km à allure marathon sont espacés tous les 3 km", "Excellent pour la spécifique marathon (4-6 semaines avant)", "Tester la nutrition de course"],
    build: (km) => {
      const totalKm = Math.max(22, Math.round(km * 0.34));
      const steps: SessionStep[] = [{ distanceMeters: 3000, pace: 'long', note: 'WU long' }];
      for (let i = 0; i < 6; i++) {
        steps.push({ distanceMeters: 1000, pace: 'marathon', note: `Bloc M ${i + 1}/6` });
        if (i < 5) steps.push({ distanceMeters: 2000, pace: 'long', note: 'Récup en long' });
      }
      const closeKm = Math.max(2, totalKm - 6 - 3 - 10);
      if (closeKm > 0) steps.push({ distanceMeters: closeKm * 1000, pace: 'long', note: 'Retour au calme' });
      return steps;
    },
    workKm: (km) => Math.max(22, Math.round(km * 0.34)),
  },
];

// ---------- Progressive run variant -----------------------------------------

export const PROGRESSIVE_VARIANT: SessionVariant = {
  label: 'Footing progressif',
  structure: 'Trois blocs de 20 min : easy → marathon → seuil bas',
  feelHint: "Sensation d'accélération douce. Le dernier bloc tire mais reste gérable.",
  approachTips: ['Démarrage volontairement très facile', "Transitions douces — pas d'à-coup", "Le mental est testé sur le 3e bloc, pas l'allure", 'À la fin, vous devez vous sentir bien — pas explosé'],
  build: () => [
    { durationSeconds: 20 * 60, pace: 'easy', note: 'Bloc easy' },
    { durationSeconds: 20 * 60, pace: 'marathon', note: 'Bloc marathon' },
    { durationSeconds: 20 * 60, pace: 'lt1', note: 'Bloc sous-seuil' },
  ],
  workKm: () => 12,
};

// =====================================================================
// MIXED SESSIONS — combos that mix multiple zones in one session.
// Inserted occasionally (every 4-5 weeks) to break monotony and stimulate
// multiple energy systems within a single workout.
// =====================================================================

export const MIXED_VARIANTS: SessionVariant[] = [
  {
    label: 'Combo seuil + côtes (LT2 + R)',
    structure: '4 × 1000 m seuil + 6 × 30 s côtes courtes',
    feelHint: "Deux stimulations — d'abord lactique, puis neuromusculaire.",
    approachTips: ["4 × 1000 m à allure LT2, récup 60 s", "5 min easy entre les blocs", "6 × 30 s en côte courte (pente 5-8 %)", "Excellent en milieu de phase build"],
    build: () => [
      { reps: 4, distanceMeters: 1000, pace: 'lt2', recoverySeconds: 60, note: 'Bloc seuil' },
      { durationSeconds: 5 * 60, pace: 'easy', note: 'Récup 5 min' },
      { reps: 6, durationSeconds: 30, pace: 'repetition', recoverySeconds: 90, note: 'Bloc côtes' },
    ],
    workKm: () => 5.5,
  },
  {
    label: 'Combo VO2max + seuil (I + LT2)',
    structure: '4 × 800 m VO2max puis 3 × 1000 m seuil',
    feelHint: "On démarre fort sur la VO2max, puis on doit tenir au seuil avec les jambes lourdes.",
    approachTips: ["4 × 800 m allure VO2max, récup 90 s", "5 min de footing entre les blocs", "3 × 1000 m allure seuil, récup 60 s", "Idéale en phase spécifique 5K-10K"],
    build: () => [
      { reps: 4, distanceMeters: 800, pace: 'interval', recoverySeconds: 90, note: 'Bloc VO2max' },
      { durationSeconds: 5 * 60, pace: 'easy', note: 'Récup' },
      { reps: 3, distanceMeters: 1000, pace: 'lt2', recoverySeconds: 60, note: 'Bloc seuil' },
    ],
    workKm: () => 6.2,
  },
  {
    label: 'Combo sous-seuil + vitesse (LT1 + R)',
    structure: '6 × 800 m LT1 + 8 × 100 m strides',
    feelHint: "Volume au sous-seuil pour la fitness, vitesse pure pour rafraîchir le neuromusculaire.",
    approachTips: ["6 × 800 m allure sous-seuil, récup 60 s", "5 min easy entre les blocs", "8 × 100 m strides, récupération complète", "Préparer un 10K ou un semi"],
    build: () => [
      { reps: 6, distanceMeters: 800, pace: 'lt1', recoverySeconds: 60, note: 'Bloc sous-seuil' },
      { durationSeconds: 5 * 60, pace: 'easy', note: 'Récup' },
      { reps: 8, distanceMeters: 100, pace: 'repetition', recoverySeconds: 60, note: 'Strides' },
    ],
    workKm: () => 5.6,
  },
  {
    label: 'Combo "Sandwich" (LT1 + LT2 + LT1)',
    structure: '3 × 1000 m LT1 + 2 × 1500 m LT2 + 3 × 1000 m LT1',
    feelHint: "Le sandwich norvégien — séance signature des Ingebrigtsen.",
    approachTips: ["Bloc 1 : 3 × 1000 m sous-seuil, récup 60 s", "Récup 3 min easy", "Bloc 2 : 2 × 1500 m seuil, récup 90 s", "Récup 3 min easy", "Bloc 3 : 3 × 1000 m sous-seuil, récup 60 s"],
    build: () => [
      { reps: 3, distanceMeters: 1000, pace: 'lt1', recoverySeconds: 60, note: 'Pain 1 — LT1' },
      { durationSeconds: 3 * 60, pace: 'easy', note: 'Récup' },
      { reps: 2, distanceMeters: 1500, pace: 'lt2', recoverySeconds: 90, note: 'Garniture — LT2' },
      { durationSeconds: 3 * 60, pace: 'easy', note: 'Récup' },
      { reps: 3, distanceMeters: 1000, pace: 'lt1', recoverySeconds: 60, note: 'Pain 2 — LT1' },
    ],
    workKm: () => 9,
  },
  {
    label: 'Combo allure marathon + finish 5K',
    structure: '8 km à allure marathon + 3 × 600 m allure 5K',
    feelHint: "Simuler la dernière partie d'un marathon : on est cuit et il faut quand-même finir vite.",
    approachTips: ["8 km en continu à allure marathon (M-pace)", "Récup 3 min easy", "3 × 600 m allure 5K, récup 90 s", "Réservée aux marathoniens en phase spécifique"],
    build: () => [
      { distanceMeters: 8000, pace: 'marathon', note: 'Bloc allure marathon' },
      { durationSeconds: 3 * 60, pace: 'easy', note: 'Récup' },
      { reps: 3, distanceMeters: 600, pace: 'interval', recoverySeconds: 90, note: 'Finish 5K' },
    ],
    workKm: () => 9.8,
  },
];

// =====================================================================
// BEGINNER VARIANTS — easier sessions for < 35 km/sem runners.
// Fewer reps, longer recovery, never double-threshold.
// =====================================================================

export const BEGINNER_LT2_VARIANTS: SessionVariant[] = [
  {
    label: '3×800 m (débutant)',
    structure: 'Trois 800 m à allure seuil bas, récup 90 s',
    feelHint: "Effort soutenu mais contrôlé. À la fin, vous respirez fort mais vous pouvez dire 'ca va'.",
    approachTips: ["Allure : seuil BAS, pas seuil haut", "Récupération longue (90 s)", "Si la 3e rep vous épuise, vous étiez trop rapide", "Idéal pour vos premières séances de seuil"],
    build: () => [{ reps: 3, distanceMeters: 800, pace: 'lt2', recoverySeconds: 90 }],
    workKm: () => 2.4,
  },
  {
    label: '4×600 m (débutant)',
    structure: 'Quatre 600 m à allure seuil, récup 75 s',
    feelHint: "Reps courtes — apprendre à courir au seuil sans se mettre dans le rouge.",
    approachTips: ["Allure : seuil bas", "Récup 75 s en trot léger ou marche", "Apprendre la sensation 'seuil', pas battre un record"],
    build: () => [{ reps: 4, distanceMeters: 600, pace: 'lt2', recoverySeconds: 75 }],
    workKm: () => 2.4,
  },
  {
    label: 'Tempo 2×6 min (débutant)',
    structure: 'Deux blocs de 6 min à allure seuil bas, 3 min récup',
    feelHint: "Effort soutenu mais on se sent 'on contrôle'.",
    approachTips: ["Démarrer doucement, monter en allure progressivement", "Récup 3 min en footing lent", "Excellent pour développer la résistance"],
    build: () => [
      { durationSeconds: 6 * 60, pace: 'lt2', note: 'Bloc 1' },
      { durationSeconds: 3 * 60, pace: 'easy', note: 'Récup' },
      { durationSeconds: 6 * 60, pace: 'lt2', note: 'Bloc 2' },
    ],
    workKm: () => 3.5,
  },
];

export const BEGINNER_LT1_VARIANTS: SessionVariant[] = [
  {
    label: '4×800 m sous-seuil (débutant)',
    structure: 'Quatre 800 m à allure sous-seuil, récup 75 s',
    feelHint: "Très contrôlé. Deux phrases entre chaque respiration.",
    approachTips: ["Allure : sous-seuil bas", "Ce n'est PAS du seuil — c'est plus lent", "Finir frais, comme si vous pouviez refaire la séance"],
    build: () => [{ reps: 4, distanceMeters: 800, pace: 'lt1', recoverySeconds: 75 }],
    workKm: () => 3.2,
  },
  {
    label: '5×600 m sous-seuil (débutant)',
    structure: 'Cinq 600 m à allure sous-seuil, récup 60 s',
    feelHint: "Rythmé mais sans piquer.",
    approachTips: ["Allure : 6-10 sec/km plus lent que votre allure seuil", "Récup en trot, pas marche", "Ne pas dépasser l'allure prescrite"],
    build: () => [{ reps: 5, distanceMeters: 600, pace: 'lt1', recoverySeconds: 60 }],
    workKm: () => 3,
  },
];

// =====================================================================
// ADVANCED VO2max VARIANTS — for ≥ 80 km/sem runners
// =====================================================================

export const ADVANCED_VO2_VARIANTS: SessionVariant[] = [
  {
    label: '8×600 m VO2max',
    structure: 'Huit 600 m à allure 3K, récup 90 s',
    feelHint: "Format efficient — VO2max sans saturer le système lactique.",
    approachTips: ["Allure : 5-7 sec/km plus rapide que VO2max classique", "Récup 90 s ferme", "Volume idéal pour les avancés (≥ 80 km/sem)"],
    build: (km) => [{ reps: scaleReps(km, 6, 10), distanceMeters: 600, pace: 'interval', recoverySeconds: 90 }],
    workKm: (km) => scaleReps(km, 6, 10) * 0.6,
  },
  {
    label: '3×1600 m VO2max long',
    structure: 'Trois 1600 m à allure 5K, récup 3 min',
    feelHint: "Reps très longues, exigeantes mentalement et physiquement.",
    approachTips: ["Allure : 5K cible — un cran sous le 3K", "Récup 3 min en trot léger", "Volume ≥ 90 km/sem"],
    build: () => [{ reps: 3, distanceMeters: 1600, pace: 'interval', recoverySeconds: 180 }],
    workKm: () => 4.8,
  },
  {
    label: 'I-pace fartlek 8×3 min',
    structure: 'Huit fractions de 3 min à allure VO2max, 90 s récup',
    feelHint: "Format temps — utile en nature ou sur sentier.",
    approachTips: ["Allure : VO2max (3K-5K)", "Idéal en forêt ou sans piste", "Allure régulière sur chaque 3 min"],
    build: () => [{ reps: 8, durationSeconds: 180, pace: 'interval', recoverySeconds: 90 }],
    workKm: () => 6,
  },
];

// =====================================================================
// EXTRA HILL VARIANTS
// =====================================================================

export const EXTRA_HILL_VARIANTS: SessionVariant[] = [
  {
    label: 'Côtes très longues 4×3 min',
    structure: 'Quatre montées de 3 min sur pente régulière 3-5 %',
    feelHint: "Plus aérobie — travail de force-endurance pour longues distances.",
    approachTips: ["Effort soutenu mais contrôlé (RPE 7)", "Pente modérée — pas un mur", "Excellent pour trail ou marathon vallonné"],
    build: () => [{ reps: 4, durationSeconds: 180, pace: 'lt2', recoverySeconds: 240, note: 'En montée régulière' }],
    workKm: () => 3,
  },
  {
    label: 'Côtes + plat (combo)',
    structure: '6 × (45 s côte + 200 m plat à seuil)',
    feelHint: "La transition côte→plat travaille la conversion force-vitesse.",
    approachTips: ["Côte de 45 s à effort énergétique", "Sans transition, enchaîner 200 m à plat à allure seuil", "Récup 2 min en trot", "Excellent pour les courses sur route vallonnée"],
    build: () => [
      { reps: 6, durationSeconds: 45, pace: 'repetition', recoverySeconds: 0, note: 'Côte' },
      { reps: 6, distanceMeters: 200, pace: 'lt2', recoverySeconds: 120, note: 'À plat' },
    ],
    workKm: () => 2.5,
  },
];

// =====================================================================
// EXTRA SPEED VARIANTS
// =====================================================================

export const EXTRA_SPEED_VARIANTS: SessionVariant[] = [
  {
    label: '20×100 m strides progressives',
    structure: 'Vingt strides de 100 m, allure progressive du 1er au dernier',
    feelHint: "Travail technique et neuromusculaire pur. Zéro stress métabolique.",
    approachTips: ["Allure : 80 % pour la 1ère, 95 % pour la dernière", "Récupération complète (1 min marche) entre chaque", "Posture haute, cadence rapide"],
    build: () => [{ reps: 20, distanceMeters: 100, pace: 'repetition', recoverySeconds: 60 }],
    workKm: () => 2,
  },
  {
    label: '8×300 m vitesse',
    structure: 'Huit 300 m à allure 1500 m, récup 2 min',
    feelHint: "Court, rapide, propre — sensation d'athlétisme.",
    approachTips: ["Allure : 800m-1500m cible", "Récup longue (2 min) pour qualité", "Sur piste si possible"],
    build: (km) => [{ reps: scaleReps(km, 6, 10), distanceMeters: 300, pace: 'repetition', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 6, 10) * 0.3,
  },
];

// =====================================================================
// LEVEL-AWARE POOL SELECTORS
// Returns a variant pool combining base + level-specific extras so that
// beginners see easier sessions and advanced runners see harder ones,
// without losing variety from the base catalog.
// =====================================================================

export type RunnerLevelHint = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export function lt2PoolForLevel(level: RunnerLevelHint): SessionVariant[] {
  if (level === 'beginner') return [...BEGINNER_LT2_VARIANTS, ...LT2_VARIANTS.slice(0, 3)];
  return LT2_VARIANTS;
}

export function lt1AmPoolForLevel(level: RunnerLevelHint): SessionVariant[] {
  if (level === 'beginner') return [...BEGINNER_LT1_VARIANTS, ...LT1_AM_VARIANTS.slice(0, 2)];
  return LT1_AM_VARIANTS;
}

export function vo2PoolForLevel(level: RunnerLevelHint): SessionVariant[] {
  if (level === 'advanced' || level === 'elite') return [...VO2_VARIANTS, ...ADVANCED_VO2_VARIANTS];
  return VO2_VARIANTS;
}

export function hillsPoolForLevel(level: RunnerLevelHint): SessionVariant[] {
  if (level === 'beginner') return HILL_VARIANTS.slice(0, 2);
  return [...HILL_VARIANTS, ...EXTRA_HILL_VARIANTS];
}

export function speedPoolForLevel(level: RunnerLevelHint): SessionVariant[] {
  if (level === 'beginner') return SPEED_VARIANTS.slice(0, 2);
  return [...SPEED_VARIANTS, ...EXTRA_SPEED_VARIANTS];
}
