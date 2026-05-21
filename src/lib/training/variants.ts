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
  /** Short structure label (shown in the title). */
  label: string;
  /** One-line description of the structure. */
  structure: string;
  /** Sensation-focused guidance specific to this variant. */
  feelHint: string;
  /** Approach tips ("how to attack the session"). */
  approachTips: string[];
  /** Build the work block (excluding warm-up / cool-down). */
  build(weeklyKm: number): SessionStep[];
  /** Approximate total work-block distance in km (for volume scaling). */
  workKm(weeklyKm: number): number;
}

// ---------- helpers ----------------------------------------------------------

function scaleReps(weeklyKm: number, min: number, max: number): number {
  // Linear scaling: 40 km → min reps, 120 km → max reps.
  if (weeklyKm <= 40) return min;
  if (weeklyKm >= 120) return max;
  return Math.round(min + ((weeklyKm - 40) / 80) * (max - min));
}

// ---------- LT2 (threshold) variants ----------------------------------------

export const LT2_VARIANTS: SessionVariant[] = [
  {
    label: '5×1000 m',
    structure: 'Cinq répétitions de 1 km à allure seuil haut, 60 s de récup',
    feelHint: "Effort soutenu mais contrôlé. Vous parlez par mots isolés sur les 2 dernières.",
    approachTips: [
      'Échauffement complet : 20 min easy + 4 strides',
      "Première rep volontairement contrôlée, pas plus rapide que la dernière",
      'Si vous craquez sur la 4e, vous étiez trop rapide depuis la 1ère',
    ],
    build: (km) => [{ reps: scaleReps(km, 4, 7), distanceMeters: 1000, pace: 'lt2', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 4, 7),
  },
  {
    label: '4×1500 m',
    structure: 'Quatre répétitions longues à allure seuil, 90 s de récup',
    feelHint: "Reps longues — la concentration mentale est aussi importante que l'allure.",
    approachTips: [
      'Allure cible : seuil haut, mais sentez-vous à 95 % maximum',
      'Pas de fractionné mental sur 1500 m, restez sur la respiration',
      'Récupération active en trot doux, pas marche',
    ],
    build: (km) => [{ reps: scaleReps(km, 3, 5), distanceMeters: 1500, pace: 'lt2', recoverySeconds: 90 }],
    workKm: (km) => scaleReps(km, 3, 5) * 1.5,
  },
  {
    label: '6×800 m',
    structure: 'Six répétitions courtes à allure seuil, 45 s de récup',
    feelHint: "Plus piquant que le 1000 — mais récup très courte, ce qui maintient le stress lactique.",
    approachTips: [
      "Allure légèrement plus rapide que le 1000 (5 sec/km plus vite)",
      "Récupération volontairement courte — ne traînez pas",
      'Excellent pour casser la routine du 1000',
    ],
    build: (km) => [{ reps: scaleReps(km, 5, 8), distanceMeters: 800, pace: 'lt2', recoverySeconds: 45 }],
    workKm: (km) => scaleReps(km, 5, 8) * 0.8,
  },
  {
    label: '3×2000 m',
    structure: 'Trois longues à allure seuil, 2 min de récup',
    feelHint: "Reps très longues, mentalement exigeantes — c'est la séance qui prépare le semi.",
    approachTips: [
      "Allure cible : seuil bas (un cran sous le seuil haut)",
      "Diviser mentalement chaque 2000 en 2 × 1000",
      'Récupération longue : prenez le temps de respirer',
    ],
    build: (km) => [{ reps: scaleReps(km, 2, 4), distanceMeters: 2000, pace: 'lt2', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 2, 4) * 2,
  },
  {
    label: 'Pyramide 1-1.5-2-1.5-1',
    structure: '1000 + 1500 + 2000 + 1500 + 1000 m à allure seuil, 90 s de récup',
    feelHint: "La 2000 du milieu est l'épreuve mentale — si vous tenez, le reste roule.",
    approachTips: [
      'Première moitié : montez progressivement en intensité',
      'Pic mental sur la 2000 — gérez-la comme un mini-tempo',
      "Deuxième moitié : la 1500 redescendante doit sembler 'facile' relativement",
    ],
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
    approachTips: [
      'Idéal sur route ou chemin plat',
      "Commencez doucement les 2 premières min, montez en allure progressivement",
      "Le mental est le facteur limitant — pas l'allure",
    ],
    build: () => [{ durationSeconds: 20 * 60, pace: 'lt2' }],
    workKm: () => 5.5,
  },
  {
    label: 'Tempo + reps (combo)',
    structure: '10 min tempo + 4×800 m seuil',
    feelHint: "Le combo qui simule la fin d'un 10 km : on est déjà cuit puis on accélère.",
    approachTips: [
      '10 min en continu à allure seuil bas — gérée comme un échauffement long',
      "Récupération 3 min easy entre les 2 blocs",
      'Les 800 doivent être plus rapides que le tempo — visez allure 10 km',
    ],
    build: (km) => [
      { durationSeconds: 10 * 60, pace: 'lt2', note: 'Bloc tempo' },
      { distanceMeters: 0, pace: 'easy', durationSeconds: 180, note: 'Récup 3 min' },
      { reps: scaleReps(km, 3, 5), distanceMeters: 800, pace: 'lt2', recoverySeconds: 60, note: 'Bloc reps' },
    ],
    workKm: (km) => 2.8 + scaleReps(km, 3, 5) * 0.8,
  },
];

// ---------- LT1 (sub-threshold) AM variants ---------------------------------

export const LT1_AM_VARIANTS: SessionVariant[] = [
  {
    label: '6×1000 m',
    structure: 'Six répétitions à allure sous-seuil (LT1, ~2 mmol/L), 60 s récup',
    feelHint: "Conversation par phrases courtes possible. Vous DEVEZ pouvoir refaire la séance dans 6h.",
    approachTips: [
      'Allure cible : 6-14 sec/km plus lente que votre allure seuil haut',
      "Le piège : aller trop vite — c'est l'erreur classique du sous-seuil",
      'Pas de fatigue résiduelle à la fin',
    ],
    build: (km) => [{ reps: scaleReps(km, 5, 8), distanceMeters: 1000, pace: 'lt1', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 5, 8),
  },
  {
    label: '8×800 m',
    structure: 'Huit répétitions plus courtes à allure sous-seuil, 60 s récup',
    feelHint: "Variante 'tour de piste' du sous-seuil norvégien. Plus rythmé que le 1000.",
    approachTips: [
      'Reps légèrement plus courtes = on peut tenir une allure très stable',
      'Récupération en trot, pas marche',
      'Visez 3:08 par 800 m si votre allure LT1 est 3:55/km par exemple',
    ],
    build: (km) => [{ reps: scaleReps(km, 6, 10), distanceMeters: 800, pace: 'lt1', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 6, 10) * 0.8,
  },
  {
    label: '4×1500 m',
    structure: 'Quatre longues à allure sous-seuil, 90 s récup',
    feelHint: "Reps longues qui ressemblent presque à du tempo. Patience mentale.",
    approachTips: [
      "Idéal pour préparer un semi — long temps soutenu sous-seuil",
      'Allure : sous-seuil bas',
      'Récupération un peu plus longue car les reps sont longues',
    ],
    build: (km) => [{ reps: scaleReps(km, 3, 6), distanceMeters: 1500, pace: 'lt1', recoverySeconds: 90 }],
    workKm: (km) => scaleReps(km, 3, 6) * 1.5,
  },
];

// ---------- LT1 PM variants -------------------------------------------------

export const LT1_PM_VARIANTS: SessionVariant[] = [
  {
    label: '10×400 m',
    structure: 'Dix répétitions courtes à allure sous-seuil haut, 30 s récup',
    feelHint: "Plus piquant que la séance du matin — récup ultra-courte.",
    approachTips: [
      "Allure un cran plus rapide que la séance AM (presque allure seuil bas)",
      "30 secondes de trot — pas marche",
      "Si vous craquez à mi-séance, la séance AM était trop dure",
    ],
    build: (km) => [{ reps: scaleReps(km, 8, 14), distanceMeters: 400, pace: 'lt1', recoverySeconds: 30 }],
    workKm: (km) => scaleReps(km, 8, 14) * 0.4,
  },
  {
    label: '12×300 m',
    structure: 'Douze courtes très rythmées, 30 s récup',
    feelHint: "Sensation de course de relais. Court, rapide, propre.",
    approachTips: [
      'Allure : sous-seuil haut, à la limite du seuil bas',
      'Récup très courte mais en trot, pas marche',
      "Si vous comptez les reps après la 6e, c'est mauvais signe — restez concentré",
    ],
    build: (km) => [{ reps: scaleReps(km, 10, 16), distanceMeters: 300, pace: 'lt1', recoverySeconds: 30 }],
    workKm: (km) => scaleReps(km, 10, 16) * 0.3,
  },
  {
    label: 'Échelle 200-400-600-400-200 × 2',
    structure: 'Deux blocs en échelle ascendante-descendante, 45 s récup',
    feelHint: "Casse la monotonie du fractionné classique. Mentalement engageant.",
    approachTips: [
      'Allure : sous-seuil haut',
      "Le 600 monte mentalement — c'est le sommet de l'échelle",
      'Récupération 2 min entre les 2 blocs',
    ],
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
];

// ---------- VO2max variants -------------------------------------------------

export const VO2_VARIANTS: SessionVariant[] = [
  {
    label: '5×1000 m',
    structure: 'Cinq répétitions de 1 km à allure VO2max, 2 min récup',
    feelHint: "Dur. 8.5/10. Respiration intense, vous ne pouvez plus parler.",
    approachTips: [
      'Échauffement très complet — 20 min easy + 4-6 strides',
      'Partez prudent : 3 sec/km plus lent que la cible sur la 1ère rep',
      "Si vous ralentissez à la 4e, l'allure était trop ambitieuse",
    ],
    build: (km) => [{ reps: scaleReps(km, 4, 6), distanceMeters: 1000, pace: 'interval', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 4, 6),
  },
  {
    label: '6×800 m',
    structure: 'Six répétitions à allure VO2max, 2 min récup',
    feelHint: "Plus court mais plus rapide. Souvent ressenti comme 'plus dur' que le 1000.",
    approachTips: [
      'Allure : 3-5 sec/km plus rapide que la cible du 1000',
      "C'est la séance qui prépare un 5 km",
      "Récup 2 min ferme — pas 2'30 'parce que je suis fatigué'",
    ],
    build: (km) => [{ reps: scaleReps(km, 5, 8), distanceMeters: 800, pace: 'interval', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 5, 8) * 0.8,
  },
  {
    label: '4×1200 m',
    structure: 'Quatre longues VO2max, 3 min récup',
    feelHint: "Reps longues à intensité élevée — c'est là que l'on construit la puissance aérobie.",
    approachTips: [
      'Les 1200 sont la durée optimale pour stimuler VO2max',
      'Visez allure 3 km',
      'Récup longue car le stress métabolique est important',
    ],
    build: (km) => [{ reps: scaleReps(km, 3, 5), distanceMeters: 1200, pace: 'interval', recoverySeconds: 180 }],
    workKm: (km) => scaleReps(km, 3, 5) * 1.2,
  },
  {
    label: 'Pyramide 400-800-1200-800-400',
    structure: 'Pyramide VO2max ascendante puis descendante',
    feelHint: "Le 1200 du milieu est LA difficulté. Une fois passée, le reste se fait par habitude.",
    approachTips: [
      'Allure : 400 = allure 1500m, 800 = allure 3K, 1200 = allure 5K',
      'La descente est psychologiquement plus facile',
      'Excellente séance pour les coureurs de demi-fond',
    ],
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
    approachTips: [
      'Allure : 3 sec/km plus rapide que VO2max classique',
      'Récupération active en trot',
      'Idéal pour réveiller la puissance après une période trop axée seuil',
    ],
    build: (km) => [{ reps: scaleReps(km, 8, 12), distanceMeters: 400, pace: 'interval', recoverySeconds: 90 }],
    workKm: (km) => scaleReps(km, 8, 12) * 0.4,
  },
];

// ---------- Hills variants --------------------------------------------------

export const HILL_VARIANTS: SessionVariant[] = [
  {
    label: 'Côtes courtes 10×45 s',
    structure: 'Dix montées de 45 s sur pente 5-8 %, retour en trottinant',
    feelHint: "Effort énergique mais court. Vous récupérez à la descente.",
    approachTips: [
      'Posture droite, regard à 5 m devant',
      'Cadence élevée — pas de grandes foulées',
      'Marchez/trottez à la descente, ne forcez pas',
    ],
    build: (km) => [{ reps: scaleReps(km, 8, 14), durationSeconds: 45, pace: 'repetition', recoverySeconds: 90, note: 'En montée' }],
    workKm: (km) => scaleReps(km, 8, 14) * 0.15,
  },
  {
    label: 'Côtes longues 6×2 min',
    structure: 'Six montées de 2 min sur pente modérée 4-6 %',
    feelHint: "Plus aérobique que les courtes. C'est dur, mais c'est de la puissance pure.",
    approachTips: [
      "Allure : effort soutenu (RPE 7-8), pas tout-out",
      "Idéal pour les coureurs de marathon/semi : développe la force-endurance",
      'Pente modérée privilégiée — pas un mur',
    ],
    build: (km) => [{ reps: scaleReps(km, 5, 7), durationSeconds: 120, pace: 'lt2', recoverySeconds: 180, note: 'En montée modérée' }],
    workKm: (km) => scaleReps(km, 5, 7) * 0.5,
  },
  {
    label: 'Fartlek côtes (jeu de courses)',
    structure: 'Boucle vallonnée : on accélère en montée, on récupère en descente',
    feelHint: "Free-form, joueur. La pente impose le rythme — pas l'allure cible.",
    approachTips: [
      "Boucle de 45-60 min sur terrain vallonné",
      "À chaque côte rencontrée : accélération, effort 7-8/10",
      "Descentes en récupération active, foulée souple",
      'Excellent pour casser la routine et préparer un trail',
    ],
    build: () => [{ durationSeconds: 45 * 60, pace: 'long', note: 'Fartlek vallonné' }],
    workKm: () => 10,
  },
  {
    label: 'Échelle de côtes 30-60-90-60-30 s × 2',
    structure: 'Échelle de durée en montée, deux blocs',
    feelHint: "Engageant mentalement, varie le stimulus neuromusculaire.",
    approachTips: [
      'Allure : effort intense sur les 30 et 60, plus contrôlé sur le 90',
      "Récup en redescendant tranquillement",
      '3 min entre les deux blocs',
    ],
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
    approachTips: [
      'Allure : ~95 % de votre vitesse max sur 20-25 s',
      'Posture haute, cadence rapide',
      'Sur piste si possible — sur chemin plat sinon',
    ],
    build: (km) => [{ reps: scaleReps(km, 8, 12), distanceMeters: 200, pace: 'repetition', recoverySeconds: 60 }],
    workKm: (km) => scaleReps(km, 8, 12) * 0.2,
  },
  {
    label: '6×400 m vite',
    structure: 'Six tours de piste rapides, 2 min récup',
    feelHint: "Plus soutenu que le 200. Stress lactique léger, vitesse haute.",
    approachTips: [
      'Allure : entre 1500m et 800m de course',
      'Récup en marche puis trot léger',
      'Idéal en phase spécifique 1500/3K',
    ],
    build: (km) => [{ reps: scaleReps(km, 5, 8), distanceMeters: 400, pace: 'repetition', recoverySeconds: 120 }],
    workKm: (km) => scaleReps(km, 5, 8) * 0.4,
  },
  {
    label: 'Échelle 400-300-200-100 × 2',
    structure: 'Échelle descendante en vitesse pure, deux blocs',
    feelHint: "Sensation de course d'athlétisme. Le 100 final est presque un sprint.",
    approachTips: [
      'Allure progressive : 400 = allure 1500, 100 = sprint contrôlé',
      "Plus la rep est courte, plus c'est rapide",
      '3 min entre les blocs',
    ],
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
    approachTips: [
      "Allure 'vif' = à l'aise mais rapide, pas tout-out",
      "Récupération en footing pas en marche",
      "Excellente pour relancer le plaisir après une période monotone",
    ],
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

// ---------- Progressive run variant -----------------------------------------

export const PROGRESSIVE_VARIANT: SessionVariant = {
  label: 'Footing progressif',
  structure: 'Trois blocs de 20 min : easy → marathon → seuil bas',
  feelHint: "Sensation d'accélération douce. Le dernier bloc tire mais reste gérable.",
  approachTips: [
    'Démarrage volontairement très facile',
    "Transitions douces — pas d'à-coup",
    "Le mental est testé sur le 3e bloc, pas l'allure",
    'À la fin, vous devez vous sentir bien — pas explosé',
  ],
  build: () => [
    { durationSeconds: 20 * 60, pace: 'easy', note: 'Bloc easy' },
    { durationSeconds: 20 * 60, pace: 'marathon', note: 'Bloc marathon' },
    { durationSeconds: 20 * 60, pace: 'lt1', note: 'Bloc sous-seuil' },
  ],
  workKm: () => 12,
};
