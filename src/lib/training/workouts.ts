import type { Workout, WorkoutType } from './types';
import type { Locale } from '@/i18n/config';
import {
  LT1_PM_VARIANTS,
  MIXED_VARIANTS,
  PROGRESSIVE_VARIANT,
  VOLUME_THRESHOLD_VARIANTS,
  hillsPoolForLevel,
  lt1AmPoolForLevel,
  lt2PoolForLevel,
  speedPoolForLevel,
  vo2PoolForLevel,
  type RunnerLevelHint,
  type SessionVariant,
} from './variants';

interface BuildArgs {
  date: string;
  weeklyKm: number;
  daysPerWeek: number;
  index: number;
  weekIndex?: number;
  doubleDay?: 'AM' | 'PM';
  locale?: Locale;
  level?: RunnerLevelHint;
}

function pickVariant<T extends SessionVariant>(variants: T[], weekIndex: number | undefined): T {
  const i = (weekIndex ?? 0) % variants.length;
  return variants[i];
}

const FR = {
  easy: {
    title: 'Footing facile',
    purpose: "Volume aérobie. La majorité de votre kilométrage doit être facile pour permettre la récupération entre les séances de qualité.",
    feel: 'Vous devez pouvoir tenir une conversation complète. Si vous êtes essoufflé, ralentissez.',
    guidance: ['Respiration nasale possible la plupart du temps', 'Fréquence cardiaque < 75% FCmax', "Si vous doutez, c'est trop rapide"],
  },
  long: {
    title: 'Sortie longue',
    purpose: "Endurance fondamentale, économie de course, robustesse musculaire et tendineuse.",
    feel: 'Confortable du début à la fin. Les 20 derniers % peuvent piquer mais sans forcer.',
    guidance: ['Hydratation et nutrition: simulez votre course objectif', 'Cadence régulière, pas de pic d\'intensité', 'Terrain vallonné bienvenu'],
  },
  lt1_threshold: {
    title: 'Seuil bas (LT1 — sous-seuil)',
    purpose: "Augmenter la capacité à oxyder le lactate à intensité modérée. Pierre angulaire de la méthode norvégienne — on accumule du temps au seuil sans s'épuiser.",
    feel: 'Effort soutenu mais contrôlé.',
    guidance: ['Ne jamais dépasser l\'allure prescrite', 'Récupérations courtes en trot léger'],
  },
  lt2_threshold: {
    title: 'Seuil haut (LT2)',
    purpose: "Repousser le seuil lactique haut.",
    feel: 'Inconfort contrôlé. 7/10 sur l\'échelle d\'effort.',
    guidance: ['Échauffement complet impératif (20 min)', 'Lactate ≈ 3.5–4.0 mmol/L'],
  },
  vo2max: {
    title: 'VO2max',
    purpose: 'Améliorer la consommation maximale d\'oxygène et la puissance aérobie.',
    feel: 'Dur. 8.5/10.',
    guidance: ['Allure constante: ne partez pas trop vite', 'Récupérations actives en trot'],
  },
  hills: {
    title: 'Côtes',
    purpose: 'Force, économie de course, puissance neuromusculaire.',
    feel: 'Effort énergétique.',
    guidance: ['Posture droite, cadence rapide'],
  },
  strides: {
    title: 'Lignes droites (strides)',
    purpose: 'Travail technique et neuromusculaire, sans fatigue.',
    feel: 'Vif, fluide, contrôlé.',
    guidance: ['À la fin d\'un footing facile', 'Récupération complète entre chaque', '4 à 8 répétitions'],
  },
  recovery: { title: 'Récupération active', purpose: 'Favoriser la circulation.', feel: 'Très facile.', guidance: ['Court (20–40 min)'] },
  rest: { title: 'Repos', purpose: "L'adaptation se fait au repos.", feel: 'Reposé.', guidance: ['Sommeil 8h+', 'Hydratation'] },
  race_pace: { title: 'Allure spécifique', purpose: 'Habituer l\'organisme à l\'allure exacte de votre objectif.', feel: "Comme le jour J, mais plus court.", guidance: ['Chaussures de course recommandées', 'Nutrition de course à tester'] },
  race_day: {
    title: 'JOUR DE COURSE',
    purpose: "C'est le jour J. Tout le bloc a été construit pour aujourd'hui.",
    feel: "Premier tiers : retenue ('trop facile'). Deuxième tiers : votre allure. Dernier tiers : tout donner.",
    guidance: ['Échauffement 15-20 min easy + 3-4 strides', 'Ne partez PAS plus vite que votre allure cible — la banque de temps n\'existe pas', 'Nutrition et hydratation testées à l\'entraînement uniquement', 'Après l\'arrivée : 10 min de marche, pas d\'arrêt brutal'],
  },
  pre_race: {
    title: 'Activation pré-course',
    purpose: 'Réveiller le système neuromusculaire sans créer de fatigue. Demain, vous courez.',
    feel: 'Très facile, jambes légères. Les strides doivent donner envie d\'en faire plus.',
    guidance: ['20-30 min très facile maximum', '4 strides de 80-100 m à allure course, récupération complète', 'Préparez votre matériel et votre nutrition ce soir', 'Couchez-vous tôt — le sommeil d\'avant-veille compte plus que celui de la veille'],
  },
  cross_training: { title: 'Cross-training', purpose: 'Volume aérobie sans impact.', feel: 'Conversationnel.', guidance: ['45–75 min'] },
  double_threshold: { title: 'Journée double seuil', purpose: '', feel: '', guidance: [] },
} as const;

const EN = {
  easy: {
    title: 'Easy run',
    purpose: 'Aerobic volume. Most of your mileage must stay easy so you can absorb the quality sessions.',
    feel: 'You can hold a full conversation. If you are out of breath, slow down.',
    guidance: ['Nasal breathing possible most of the time', 'HR < 75% HRmax', "If in doubt, you're going too fast"],
  },
  long: {
    title: 'Long run',
    purpose: 'Aerobic base, running economy, muscular and tendon robustness.',
    feel: 'Comfortable start to finish. The last 20% can sting, but never force.',
    guidance: ['Practice race-day fueling and hydration', 'Steady cadence, no intensity spikes', 'Rolling terrain welcome'],
  },
  lt1_threshold: {
    title: 'Sub-threshold (LT1)',
    purpose: 'Improve lactate clearance at moderate intensity — the cornerstone of the Norwegian method: accumulate threshold time without digging a hole.',
    feel: 'Sustained but controlled effort.',
    guidance: ['Never exceed the prescribed pace', 'Short recoveries at a light jog'],
  },
  lt2_threshold: {
    title: 'Threshold (LT2)',
    purpose: 'Push the upper lactate threshold.',
    feel: 'Controlled discomfort. 7/10 effort.',
    guidance: ['Full 20-min warm-up required', 'Lactate ≈ 3.5–4.0 mmol/L'],
  },
  vo2max: {
    title: 'VO2max',
    purpose: 'Improve maximal oxygen uptake and aerobic power.',
    feel: 'Hard. 8.5/10.',
    guidance: ["Even-paced: don't start too fast", 'Active jog recoveries'],
  },
  hills: {
    title: 'Hills',
    purpose: 'Strength, running economy, neuromuscular power.',
    feel: 'Strong but short.',
    guidance: ['Upright posture, quick cadence'],
  },
  strides: {
    title: 'Strides',
    purpose: 'Technique and neuromuscular work, without fatigue.',
    feel: 'Snappy, smooth, controlled.',
    guidance: ['At the end of an easy run', 'Full recovery between reps', '4 to 8 repetitions'],
  },
  recovery: { title: 'Recovery jog', purpose: 'Promote circulation.', feel: 'Very easy.', guidance: ['Short (20–40 min)'] },
  rest: { title: 'Rest', purpose: 'Adaptation happens at rest.', feel: 'Rested.', guidance: ['8h+ sleep', 'Hydration'] },
  race_pace: {
    title: 'Race-pace work',
    purpose: 'Get your body used to the exact pace of your goal race.',
    feel: 'Like race day, but shorter.',
    guidance: ['Race shoes recommended', 'Test your race fueling'],
  },
  race_day: {
    title: 'RACE DAY',
    purpose: 'This is the day the whole block was built for.',
    feel: "First third: hold back ('too easy'). Second third: your pace. Last third: empty the tank.",
    guidance: ['Warm up 15-20 min easy + 3-4 strides', 'Do NOT start faster than your goal pace — there is no time bank', 'Only use fueling you tested in training', 'After the finish: 10 min walking, no sudden stop'],
  },
  pre_race: {
    title: 'Pre-race activation',
    purpose: 'Wake up the neuromuscular system without creating fatigue. Tomorrow you race.',
    feel: 'Very easy, light legs. The strides should leave you wanting more.',
    guidance: ['20-30 min very easy maximum', '4 strides of 80-100 m at race pace, full recovery', 'Lay out your gear and fueling tonight', 'Sleep early — the night before the night before matters most'],
  },
  cross_training: { title: 'Cross-training', purpose: 'Aerobic volume without impact.', feel: 'Conversational.', guidance: ['45–75 min'] },
  double_threshold: { title: 'Double-threshold day', purpose: '', feel: '', guidance: [] },
} as const;

function copy(locale: Locale | undefined) { return locale === 'en' ? EN : FR; }

let idCounter = 0;
function nextId(date: string, suffix = '') { idCounter++; return `${date}-${idCounter}${suffix}`; }

/**
 * Easy run with day-dependent duration so they don't all look the same.
 * Monday  → "recovery footing" ~0.65× the average
 * Tue/Wed → short-medium       ~0.85×
 * Friday  → true recovery      ~0.55× (Friday is pre-long-run day)
 * Sunday  → longest of the easy days ~1.15×
 */
const EASY_DAY_FACTORS: Record<number, number> = {
  0: 0.65,
  1: 0.85,
  2: 0.85,
  3: 0.85,
  4: 0.55,
  5: 1.0,
  6: 1.15,
};

export function buildEasy({ date, weeklyKm, daysPerWeek, locale, index }: BuildArgs): Workout {
  const factor = EASY_DAY_FACTORS[index ?? 0] ?? 1.0;
  const baseKm = (weeklyKm / Math.max(daysPerWeek, 3)) * 0.9;
  const km = Math.max(4, Math.round(baseKm * factor));
  const c = copy(locale).easy;
  return { id: nextId(date), date, type: 'easy', title: c.title, totalDistanceMeters: km * 1000, totalDurationSeconds: km * 330, rpe: 3, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: km * 1000, pace: 'easy' }] };
}

export function buildLong({ date, weeklyKm, locale }: BuildArgs): Workout {
  const km = Math.max(6, Math.round(weeklyKm * 0.28));
  const c = copy(locale).long;
  return { id: nextId(date), date, type: 'long', title: c.title, totalDistanceMeters: km * 1000, totalDurationSeconds: km * 320, rpe: 4, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: km * 1000, pace: 'long' }] };
}

export function buildLt1AM({ date, weeklyKm, weekIndex, locale, level }: BuildArgs): Workout {
  const c = copy(locale).lt1_threshold;
  const variant = pickVariant(lt1AmPoolForLevel(level ?? 'intermediate'), weekIndex);
  const work = variant.build(weeklyKm);
  return {
    id: nextId(date, '-am'), date, type: 'lt1_threshold',
    title: `${c.title} — AM — ${variant.label}`,
    totalDistanceMeters: Math.round((variant.workKm(weeklyKm) + 4) * 1000),
    totalDurationSeconds: 60 * 60, rpe: 6, isDouble: true, amPm: 'AM',
    purpose: c.purpose + ' Structure : ' + variant.structure + '.',
    feel: variant.feelHint,
    guidance: [...c.guidance, ...variant.approachTips],
    steps: [{ distanceMeters: 2000, pace: 'easy', note: 'WU' }, ...work, { distanceMeters: 2000, pace: 'easy', note: 'CD' }],
  };
}

export function buildLt1PM({ date, weeklyKm, weekIndex, locale }: BuildArgs): Workout {
  const c = copy(locale).lt1_threshold;
  const variant = pickVariant(LT1_PM_VARIANTS, weekIndex);
  const work = variant.build(weeklyKm);
  return {
    id: nextId(date, '-pm'), date, type: 'lt1_threshold',
    title: `${c.title} — PM — ${variant.label}`,
    totalDistanceMeters: Math.round((variant.workKm(weeklyKm) + 4) * 1000),
    totalDurationSeconds: 50 * 60, rpe: 7, isDouble: true, amPm: 'PM',
    purpose: c.purpose + ' Structure : ' + variant.structure + '.',
    feel: variant.feelHint,
    guidance: [...c.guidance, ...variant.approachTips],
    steps: [{ distanceMeters: 2000, pace: 'easy', note: 'WU' }, ...work, { distanceMeters: 2000, pace: 'easy', note: 'CD' }],
  };
}

export function buildSingleThreshold({ date, weeklyKm, weekIndex, locale, level }: BuildArgs): Workout {
  const c = copy(locale).lt2_threshold;
  const variant = pickVariant(lt2PoolForLevel(level ?? 'intermediate'), weekIndex);
  const work = variant.build(weeklyKm);
  return {
    id: nextId(date), date, type: 'lt2_threshold',
    title: `${c.title} — ${variant.label}`,
    totalDistanceMeters: Math.round((variant.workKm(weeklyKm) + 5) * 1000),
    totalDurationSeconds: 60 * 60, rpe: 7,
    purpose: c.purpose + ' Structure : ' + variant.structure + '.',
    feel: variant.feelHint,
    guidance: [...c.guidance, ...variant.approachTips],
    steps: [{ distanceMeters: 2500, pace: 'easy', note: 'WU' }, ...work, { distanceMeters: 2500, pace: 'easy', note: 'CD' }],
  };
}

export function buildVo2Max({ date, weeklyKm, weekIndex, locale, level }: BuildArgs): Workout {
  const c = copy(locale).vo2max;
  const variant = pickVariant(vo2PoolForLevel(level ?? 'intermediate'), weekIndex);
  const work = variant.build(weeklyKm);
  return {
    id: nextId(date), date, type: 'vo2max',
    title: `${c.title} — ${variant.label}`,
    totalDistanceMeters: Math.round((variant.workKm(weeklyKm) + 4.5) * 1000),
    totalDurationSeconds: 55 * 60, rpe: 8.5,
    purpose: c.purpose + ' Structure : ' + variant.structure + '.',
    feel: variant.feelHint,
    guidance: [...c.guidance, ...variant.approachTips],
    steps: [{ distanceMeters: 2500, pace: 'easy', note: 'WU' }, ...work, { distanceMeters: 2000, pace: 'easy', note: 'CD' }],
  };
}

export function buildHills({ date, weeklyKm, weekIndex, locale, level }: BuildArgs): Workout {
  const c = copy(locale).hills;
  const variant = pickVariant(hillsPoolForLevel(level ?? 'intermediate'), weekIndex);
  const work = variant.build(weeklyKm);
  return {
    id: nextId(date), date, type: 'hills',
    title: `${c.title} — ${variant.label}`,
    totalDistanceMeters: Math.round((variant.workKm(weeklyKm) + 4) * 1000),
    totalDurationSeconds: 45 * 60, rpe: 7,
    purpose: c.purpose + ' Structure : ' + variant.structure + '.',
    feel: variant.feelHint,
    guidance: [...c.guidance, ...variant.approachTips],
    steps: [{ distanceMeters: 2000, pace: 'easy', note: 'WU' }, ...work, { distanceMeters: 2000, pace: 'easy', note: 'CD' }],
  };
}

export function buildSpeed({ date, weeklyKm, weekIndex, locale, level }: BuildArgs): Workout {
  const variant = pickVariant(speedPoolForLevel(level ?? 'intermediate'), weekIndex);
  const work = variant.build(weeklyKm);
  return {
    id: nextId(date), date, type: 'vo2max',
    title: `Vitesse — ${variant.label}`,
    totalDistanceMeters: Math.round((variant.workKm(weeklyKm) + 4) * 1000),
    totalDurationSeconds: 45 * 60, rpe: 8,
    purpose: 'Vitesse pure et tolérance lactique. Structure : ' + variant.structure + '.',
    feel: variant.feelHint,
    guidance: variant.approachTips,
    steps: [{ distanceMeters: 2000, pace: 'easy', note: 'WU' }, ...work, { distanceMeters: 2000, pace: 'easy', note: 'CD' }],
  };
}

/**
 * Volume + threshold session: long run with embedded sub-threshold or
 * marathon-pace blocks. Rotates through 3 structures.
 */
export function buildVolumeThreshold({ date, weeklyKm, weekIndex, locale }: BuildArgs): Workout {
  const variant = pickVariant(VOLUME_THRESHOLD_VARIANTS, weekIndex);
  const work = variant.build(weeklyKm);
  const totalKm = variant.workKm(weeklyKm);
  return {
    id: nextId(date), date, type: 'long',
    title: `${variant.label} (${totalKm} km)`,
    totalDistanceMeters: totalKm * 1000, totalDurationSeconds: totalKm * 320, rpe: 6,
    purpose: "Volume aérobie + qualité sous fatigue. La séance signature pour développer simultanément l'endurance et le seuil. " + variant.structure + '.',
    feel: variant.feelHint,
    guidance: variant.approachTips,
    steps: work,
  };
}

export function buildProgressive({ date, locale }: BuildArgs): Workout {
  const v = PROGRESSIVE_VARIANT;
  return {
    id: nextId(date), date, type: 'long',
    title: `${v.label} — ${v.structure}`,
    totalDistanceMeters: 12000, totalDurationSeconds: 60 * 60, rpe: 5,
    purpose: "Apprend à votre corps à accélérer en état de fatigue. L'une des séances clés du marathon.",
    feel: v.feelHint, guidance: v.approachTips,
    steps: v.build(0),
  };
}

export function buildRacePace({ date, locale }: BuildArgs, raceDistanceMeters: number): Workout {
  const c = copy(locale).race_pace;
  let reps: number, repDist: number, recovery: number, extraNote = '';
  if (raceDistanceMeters <= 5000) { reps = 5; repDist = 1000; recovery = 90; extraNote = 'Allure 5K cible'; }
  else if (raceDistanceMeters <= 10000) { reps = 4; repDist = 2000; recovery = 120; extraNote = 'Allure 10K cible'; }
  else if (raceDistanceMeters <= 21097.5) { reps = 3; repDist = 3000; recovery = 180; extraNote = 'Allure semi cible'; }
  else { reps = 2; repDist = 6000; recovery = 240; extraNote = 'Allure marathon cible'; }
  let pace: 'marathon' | 'lt2' | 'interval';
  if (raceDistanceMeters <= 10000) pace = 'interval';
  else if (raceDistanceMeters <= 21097.5) pace = 'lt2';
  else pace = 'marathon';
  return {
    id: nextId(date), date, type: 'race_pace', title: c.title,
    totalDistanceMeters: reps * repDist + 4000, totalDurationSeconds: 65 * 60,
    rpe: raceDistanceMeters <= 10000 ? 8 : 7,
    purpose: c.purpose + ' Préparation finale ciblée sur votre course objectif.',
    feel: c.feel,
    guidance: [...c.guidance, extraNote, 'Hydratation et nutrition de course'],
    steps: [{ distanceMeters: 2000, pace: 'easy', note: 'WU' }, { reps, distanceMeters: repDist, pace, recoverySeconds: recovery }, { distanceMeters: 2000, pace: 'easy', note: 'CD' }],
  };
}

/** The goal race itself, placed on the actual race date inside the block. */
export function buildRaceDay({ date, locale }: BuildArgs, raceDistanceMeters: number): Workout {
  const c = copy(locale).race_day;
  let pace: 'interval' | 'lt2' | 'marathon';
  if (raceDistanceMeters <= 10000) pace = 'interval';
  else if (raceDistanceMeters <= 21097.5) pace = 'lt2';
  else pace = 'marathon';
  const km = Math.round(raceDistanceMeters / 100) / 10;
  return {
    id: nextId(date, '-race'), date, type: 'race_pace',
    title: `${c.title} — ${km} km`,
    totalDistanceMeters: raceDistanceMeters + 3000,
    totalDurationSeconds: Math.round(raceDistanceMeters * 0.36),
    rpe: 10,
    purpose: c.purpose, feel: c.feel, guidance: [...c.guidance],
    steps: [
      { distanceMeters: 3000, pace: 'easy', note: 'WU + strides' },
      { distanceMeters: raceDistanceMeters, pace, note: locale === 'en' ? 'RACE' : 'COURSE' },
    ],
  };
}

/** Day-before-race openers: short easy jog + a few strides, zero fatigue. */
export function buildPreRace({ date, locale }: BuildArgs): Workout {
  const c = copy(locale).pre_race;
  return {
    id: nextId(date, '-prerace'), date, type: 'strides',
    title: c.title,
    totalDistanceMeters: 4400,
    totalDurationSeconds: 30 * 60,
    rpe: 2,
    purpose: c.purpose, feel: c.feel, guidance: [...c.guidance],
    steps: [
      { distanceMeters: 4000, pace: 'easy' },
      { reps: 4, distanceMeters: 100, pace: 'repetition', recoverySeconds: 90 },
    ],
  };
}

export function buildProgressionLong({ date, weeklyKm, locale }: BuildArgs): Workout {
  const c = copy(locale).long;
  const totalKm = Math.max(16, Math.round(weeklyKm * 0.32));
  const racePaceKm = Math.min(8, Math.round(totalKm * 0.35));
  const easyKm = totalKm - racePaceKm;
  return {
    id: nextId(date), date, type: 'long',
    title: `${c.title} avec finish allure marathon`,
    totalDistanceMeters: totalKm * 1000, totalDurationSeconds: totalKm * 320, rpe: 6,
    purpose: "Long en aérobie qui termine à allure marathon.",
    feel: 'Confortable les 65 premiers %.',
    guidance: [`${easyKm} km faciles puis ${racePaceKm} km à allure marathon`, 'À placer 4 à 6 semaines avant un marathon'],
    steps: [{ distanceMeters: easyKm * 1000, pace: 'long', note: 'Partie facile' }, { distanceMeters: racePaceKm * 1000, pace: 'marathon', note: 'Bloc allure marathon' }],
  };
}

export function buildShortReps({ date, locale }: BuildArgs): Workout {
  return {
    id: nextId(date), date, type: 'vo2max',
    title: 'Rappels vitesse',
    totalDistanceMeters: 8000, totalDurationSeconds: 45 * 60, rpe: 8,
    purpose: 'Vitesse pure et tolérance lactique. Spécifique 1500-3000m.',
    feel: 'Court, vif, propre.',
    guidance: ['10×200m récup 1 min, ou 8×400m récup 90 s', 'Sur piste si possible'],
    steps: [{ distanceMeters: 2500, pace: 'easy', note: 'WU' }, { reps: 10, distanceMeters: 200, pace: 'repetition', recoverySeconds: 60 }, { distanceMeters: 2000, pace: 'easy', note: 'CD' }],
  };
}

export function buildTrackSpecific({ date, locale }: BuildArgs): Workout {
  return {
    id: nextId(date), date, type: 'vo2max',
    title: 'Piste — spécifique 1500/3K',
    totalDistanceMeters: 11000, totalDurationSeconds: 60 * 60, rpe: 9,
    purpose: "Combine puissance aérobie et vitesse pure.",
    feel: "Très exigeant.",
    guidance: ['4×800m @ allure 3K récup 2 min', 'puis 4×200m @ allure 1500m récup 1 min'],
    steps: [
      { distanceMeters: 2500, pace: 'easy', note: 'WU' },
      { reps: 4, distanceMeters: 800, pace: 'interval', recoverySeconds: 120, note: 'Allure 3K' },
      { reps: 4, distanceMeters: 200, pace: 'repetition', recoverySeconds: 60, note: 'Allure 1500m' },
      { distanceMeters: 2000, pace: 'easy', note: 'CD' },
    ],
  };
}

export function buildMarathonLongRun({ date, weeklyKm, locale }: BuildArgs, lengthKm: number, includeRacePace: boolean): Workout {
  const c = copy(locale).long;
  if (!includeRacePace) {
    return {
      id: nextId(date), date, type: 'long',
      title: `${c.title} progressive (${lengthKm} km)`,
      totalDistanceMeters: lengthKm * 1000, totalDurationSeconds: lengthKm * 330, rpe: 5,
      purpose: "Endurance fondamentale.",
      feel: "Confortable du début à la fin.",
      guidance: [`${lengthKm} km à allure facile-longue`, "Nutrition de course à tester"],
      steps: [{ distanceMeters: lengthKm * 1000, pace: 'long' }],
    };
  }
  const racePaceKm = Math.min(10, Math.max(6, Math.round(lengthKm * 0.35)));
  const easyKm = lengthKm - racePaceKm;
  return {
    id: nextId(date), date, type: 'long',
    title: `Long progressif ${lengthKm} km avec finish allure marathon`,
    totalDistanceMeters: lengthKm * 1000, totalDurationSeconds: lengthKm * 320, rpe: 6,
    purpose: "Apprend à courir vite en état de fatigue.",
    feel: "Confortable les 65 premiers %.",
    guidance: [`${easyKm} km faciles puis ${racePaceKm} km à allure marathon`, "Idéale 4 à 6 semaines avant le marathon"],
    steps: [{ distanceMeters: easyKm * 1000, pace: 'long', note: 'Partie facile' }, { distanceMeters: racePaceKm * 1000, pace: 'marathon', note: 'Bloc allure marathon' }],
  };
}

export function buildMixed({ date, weeklyKm, weekIndex, locale }: BuildArgs): Workout {
  const variant = pickVariant(MIXED_VARIANTS, weekIndex);
  const work = variant.build(weeklyKm);
  return {
    id: nextId(date), date, type: 'lt2_threshold',
    title: `Séance combo — ${variant.label}`,
    totalDistanceMeters: Math.round((variant.workKm(weeklyKm) + 4.5) * 1000),
    totalDurationSeconds: 70 * 60, rpe: 7.5,
    purpose: "Séance mixte — combine deux stimuli physiologiques pour casser la routine et travailler plusieurs systèmes. " + variant.structure + '.',
    feel: variant.feelHint,
    guidance: variant.approachTips,
    steps: [{ distanceMeters: 2500, pace: 'easy', note: 'WU' }, ...work, { distanceMeters: 2000, pace: 'easy', note: 'CD' }],
  };
}

export function buildRest({ date, locale }: BuildArgs): Workout {
  const c = copy(locale).rest;
  return { id: nextId(date), date, type: 'rest', title: c.title, totalDistanceMeters: 0, totalDurationSeconds: 0, rpe: 0, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [] };
}

export function buildStrides({ date, weeklyKm, locale }: BuildArgs): Workout {
  const c = copy(locale).strides;
  const km = Math.max(4, Math.round((weeklyKm * 0.12)));
  return { id: nextId(date), date, type: 'strides', title: `Easy + ${c.title.toLowerCase()}`, totalDistanceMeters: km * 1000 + 800, totalDurationSeconds: km * 330 + 300, rpe: 4, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: km * 1000, pace: 'easy' }, { reps: 6, distanceMeters: 100, pace: 'repetition', recoverySeconds: 60 }] };
}
