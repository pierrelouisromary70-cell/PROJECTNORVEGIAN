import type { Workout, WorkoutType } from './types';
import type { Locale } from '@/i18n/config';

interface BuildArgs {
  date: string;
  weeklyKm: number;
  daysPerWeek: number;
  index: number;
  doubleDay?: 'AM' | 'PM';
  locale?: Locale;
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
    feel: 'Effort soutenu mais contrôlé. Vous pourriez parler par phrases courtes. Lactate ≈ 2.0–2.5 mmol/L.',
    guidance: ['Ne jamais dépasser l\'allure prescrite — c\'est le piège classique', 'Vous devez finir la séance en pensant pouvoir en faire une autre dans 6h', 'Récupérations courtes en trot léger'],
  },
  lt2_threshold: {
    title: 'Seuil haut (LT2)',
    purpose: "Repousser le seuil lactique haut. Travail classique au seuil ~1h d'allure de compétition.",
    feel: 'Inconfort contrôlé. 7/10 sur l\'échelle d\'effort. Vous parlez par mots isolés.',
    guidance: ['Échauffement complet impératif (20 min)', 'Le dernier interval ne doit pas être plus rapide que le premier', 'Lactate ≈ 3.5–4.0 mmol/L'],
  },
  vo2max: {
    title: 'VO2max',
    purpose: 'Améliorer la consommation maximale d\'oxygène et la puissance aérobie.',
    feel: 'Dur. 8.5/10. Respiration intense, vous ne pouvez plus parler.',
    guidance: ['Allure constante: ne partez pas trop vite', 'Récupérations actives en trot', 'À placer prudemment dans la semaine norvégienne — pas le jour d\'un seuil'],
  },
  hills: {
    title: 'Côtes courtes',
    purpose: 'Force, économie de course, puissance neuromusculaire sans le stress métabolique des intervalles plats.',
    feel: 'Effort énergique mais court. Vous récupérez à la descente.',
    guidance: ['Pente 5–8%, durée 30–60s', 'Posture droite, cadence rapide', 'Marchez/trottinez à la descente'],
  },
  strides: {
    title: 'Lignes droites (strides)',
    purpose: 'Travail technique et neuromusculaire, sans fatigue.',
    feel: 'Vif, fluide, contrôlé. ~95% de votre vitesse max sur ~20s.',
    guidance: ['À la fin d\'un footing facile', 'Récupération complète entre chaque (~1 min marche)', '4 à 8 répétitions'],
  },
  recovery: { title: 'Récupération active', purpose: 'Favoriser la circulation sans ajouter de fatigue.', feel: 'Très facile. Plus lent que votre allure facile habituelle.', guidance: ['Court (20–40 min)', 'Terrain plat', 'Optionnel si très fatigué'] },
  rest: { title: 'Repos', purpose: "L'adaptation se fait au repos, pas à l'entraînement. C'est ici que vous progressez.", feel: 'Reposé.', guidance: ['Sommeil 8h+', 'Hydratation', 'Mobilité douce facultative'] },
  race_pace: { title: 'Allure spécifique', purpose: 'Habituer l\'organisme à l\'allure exacte de votre objectif.', feel: "Comme le jour J, mais plus court.", guidance: ['Tenue/chaussures de course recommandées', 'Nutrition de course à tester'] },
  cross_training: { title: 'Cross-training', purpose: 'Volume aérobie sans impact (vélo, natation, elliptique).', feel: 'Conversationnel.', guidance: ['45–75 min', 'Utile pendant les semaines de pic ou en cas de douleur naissante'] },
  double_threshold: { title: 'Journée double seuil', purpose: '', feel: '', guidance: [] },
} as const;

const EN = {
  easy: { title: 'Easy run', purpose: 'Aerobic volume. Most of your weekly distance must be easy so you can recover between hard sessions.', feel: 'You must be able to hold a full conversation. If you are out of breath, slow down.', guidance: ['Nasal breathing possible most of the time', 'HR < 75% HRmax', 'When in doubt, you\'re too fast'] },
  long: { title: 'Long run', purpose: 'Aerobic base, running economy, musculo-tendinous robustness.', feel: 'Comfortable throughout. The last 20% may bite but never hard.', guidance: ['Practice race-day fueling', 'Steady cadence', 'Hilly terrain welcome'] },
  lt1_threshold: { title: 'Sub-threshold (LT1)', purpose: 'Improve lactate clearance at moderate intensity — the cornerstone of the Norwegian method. Accumulate threshold time without depletion.', feel: 'Sustained but controlled. Short sentences only. Lactate ≈ 2.0–2.5 mmol/L.', guidance: ['Never exceed the prescribed pace — the classic trap', 'You should finish thinking you could do it again in 6h', 'Short jog recoveries'] },
  lt2_threshold: { title: 'Threshold (LT2)', purpose: 'Push the upper lactate threshold. Classical ~1h race-pace effort work.', feel: 'Controlled discomfort. 7/10 RPE. Single-word answers only.', guidance: ['Full 20-min warm-up required', 'Last rep no faster than the first', 'Lactate ≈ 3.5–4.0 mmol/L'] },
  vo2max: { title: 'VO2max', purpose: 'Improve maximal oxygen uptake and aerobic power.', feel: 'Hard. 8.5/10. Heavy breathing, no talking.', guidance: ['Even-paced — don\'t start too fast', 'Active jog recovery', 'Place carefully in a Norwegian week'] },
  hills: { title: 'Short hills', purpose: 'Strength, running economy, neuromuscular power without flat-interval metabolic stress.', feel: 'Strong but short. Recover on the way down.', guidance: ['5–8% grade, 30–60s', 'Upright posture, fast cadence', 'Walk/jog down'] },
  strides: { title: 'Strides', purpose: 'Technique and neuromuscular work, no fatigue cost.', feel: 'Snappy, smooth, controlled. ~95% max speed for ~20s.', guidance: ['At the end of an easy run', 'Full recovery between reps (~1 min walk)', '4 to 8 reps'] },
  recovery: { title: 'Recovery jog', purpose: 'Circulation without added fatigue.', feel: 'Very easy.', guidance: ['Short (20–40 min)', 'Flat terrain', 'Skip if very tired'] },
  rest: { title: 'Rest', purpose: 'Adaptation happens at rest, not in training. This is where you grow.', feel: 'Rested.', guidance: ['8h+ sleep', 'Hydration', 'Optional gentle mobility'] },
  race_pace: { title: 'Race-pace work', purpose: 'Get your body used to your exact goal pace.', feel: 'Like race day, shorter.', guidance: ['Race shoes recommended', 'Test race-day fueling'] },
  cross_training: { title: 'Cross-training', purpose: 'Aerobic volume without impact (bike, swim, elliptical).', feel: 'Conversational.', guidance: ['45–75 min', 'Useful in peak weeks or with a niggle'] },
  double_threshold: { title: 'Double-threshold day', purpose: '', feel: '', guidance: [] },
} as const;

function copy(locale: Locale | undefined) { return locale === 'en' ? EN : FR; }

let idCounter = 0;
function nextId(date: string, suffix = '') { idCounter++; return `${date}-${idCounter}${suffix}`; }

export function buildEasy({ date, weeklyKm, daysPerWeek, locale }: BuildArgs): Workout {
  const km = Math.max(5, Math.round((weeklyKm / Math.max(daysPerWeek, 3)) * 0.9));
  const c = copy(locale).easy;
  return { id: nextId(date), date, type: 'easy', title: c.title, totalDistanceMeters: km * 1000, totalDurationSeconds: km * 330, rpe: 3, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: km * 1000, pace: 'easy' }] };
}

export function buildLong({ date, weeklyKm, locale }: BuildArgs): Workout {
  const km = Math.max(10, Math.round(weeklyKm * 0.28));
  const c = copy(locale).long;
  return { id: nextId(date), date, type: 'long', title: c.title, totalDistanceMeters: km * 1000, totalDurationSeconds: km * 320, rpe: 4, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: km * 1000, pace: 'long' }] };
}

export function buildLt1AM({ date, weeklyKm, locale }: BuildArgs): Workout {
  const c = copy(locale).lt1_threshold;
  const reps = weeklyKm >= 80 ? 6 : 5;
  return { id: nextId(date, '-am'), date, type: 'lt1_threshold', title: `${c.title} — AM`, totalDistanceMeters: reps * 1000 + 4000, totalDurationSeconds: 60 * 60, rpe: 6, isDouble: true, amPm: 'AM', purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: 2000, pace: 'easy', note: 'WU' }, { reps, distanceMeters: 1000, pace: 'lt1', recoverySeconds: 60 }, { distanceMeters: 2000, pace: 'easy', note: 'CD' }] };
}

export function buildLt1PM({ date, weeklyKm, locale }: BuildArgs): Workout {
  const c = copy(locale).lt1_threshold;
  const reps = weeklyKm >= 80 ? 10 : 8;
  return { id: nextId(date, '-pm'), date, type: 'lt1_threshold', title: `${c.title} — PM`, totalDistanceMeters: reps * 400 + 4000, totalDurationSeconds: 50 * 60, rpe: 7, isDouble: true, amPm: 'PM', purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: 2000, pace: 'easy', note: 'WU' }, { reps, distanceMeters: 400, pace: 'lt1', recoverySeconds: 30 }, { distanceMeters: 2000, pace: 'easy', note: 'CD' }] };
}

export function buildSingleThreshold({ date, locale }: BuildArgs): Workout {
  const c = copy(locale).lt2_threshold;
  return { id: nextId(date), date, type: 'lt2_threshold', title: c.title, totalDistanceMeters: 12000, totalDurationSeconds: 60 * 60, rpe: 7, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: 2500, pace: 'easy', note: 'WU' }, { reps: 5, distanceMeters: 1000, pace: 'lt2', recoverySeconds: 60 }, { distanceMeters: 2500, pace: 'easy', note: 'CD' }] };
}

export function buildVo2Max({ date, locale }: BuildArgs): Workout {
  const c = copy(locale).vo2max;
  return { id: nextId(date), date, type: 'vo2max', title: c.title, totalDistanceMeters: 10000, totalDurationSeconds: 55 * 60, rpe: 8.5, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: 2500, pace: 'easy', note: 'WU' }, { reps: 5, distanceMeters: 1000, pace: 'interval', recoverySeconds: 120 }, { distanceMeters: 2000, pace: 'easy', note: 'CD' }] };
}

export function buildHills({ date, locale }: BuildArgs): Workout {
  const c = copy(locale).hills;
  return { id: nextId(date), date, type: 'hills', title: c.title, totalDistanceMeters: 8000, totalDurationSeconds: 45 * 60, rpe: 7, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: 2000, pace: 'easy', note: 'WU' }, { reps: 10, durationSeconds: 45, pace: 'repetition', recoverySeconds: 90, note: 'uphill' }, { distanceMeters: 2000, pace: 'easy', note: 'CD' }] };
}

/**
 * Race-pace workout, calibrated to the target race distance.
 * Used in the specific phase (4 weeks out → race week).
 */
export function buildRacePace({ date, locale }: BuildArgs, raceDistanceMeters: number): Workout {
  const c = copy(locale).race_pace;
  let reps: number, repDist: number, recovery: number, extraNote = '';
  if (raceDistanceMeters <= 5000) { reps = 5; repDist = 1000; recovery = 90; extraNote = 'Allure 5K cible'; }
  else if (raceDistanceMeters <= 10000) { reps = 4; repDist = 2000; recovery = 120; extraNote = 'Allure 10K cible'; }
  else if (raceDistanceMeters <= 21097.5) { reps = 3; repDist = 3000; recovery = 180; extraNote = 'Allure semi cible'; }
  else { reps = 2; repDist = 6000; recovery = 240; extraNote = 'Allure marathon cible — insérée dans la sortie longue'; }
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

/**
 * Long run with a race-pace block at the end (marathon prep, last 6 weeks).
 */
export function buildProgressionLong({ date, weeklyKm, locale }: BuildArgs): Workout {
  const c = copy(locale).long;
  const totalKm = Math.max(16, Math.round(weeklyKm * 0.32));
  const racePaceKm = Math.min(8, Math.round(totalKm * 0.35));
  const easyKm = totalKm - racePaceKm;
  return {
    id: nextId(date), date, type: 'long',
    title: `${c.title} avec finish allure marathon`,
    totalDistanceMeters: totalKm * 1000, totalDurationSeconds: totalKm * 320, rpe: 6,
    purpose: "Long en aérobie qui termine à allure marathon. Apprend à votre corps à courir vite quand il est fatigué — exactement ce qui se passe après le 30e km.",
    feel: 'Confortable les 65 premiers %. Les derniers km tirent comme le jour J, mais sous contrôle.',
    guidance: [`${easyKm} km faciles puis ${racePaceKm} km à allure marathon`, 'Nutrition de course pendant la partie facile', 'À placer 4 à 6 semaines avant un marathon'],
    steps: [{ distanceMeters: easyKm * 1000, pace: 'long', note: 'Partie facile' }, { distanceMeters: racePaceKm * 1000, pace: 'marathon', note: 'Bloc allure marathon' }],
  };
}

export function buildRest({ date, locale }: BuildArgs): Workout {
  const c = copy(locale).rest;
  return { id: nextId(date), date, type: 'rest', title: c.title, totalDistanceMeters: 0, totalDurationSeconds: 0, rpe: 0, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [] };
}

export function buildStrides({ date, weeklyKm, locale }: BuildArgs): Workout {
  const c = copy(locale).strides;
  const km = Math.max(6, Math.round((weeklyKm * 0.12)));
  return { id: nextId(date), date, type: 'strides', title: `Easy + ${c.title.toLowerCase()}`, totalDistanceMeters: km * 1000 + 800, totalDurationSeconds: km * 330 + 300, rpe: 4, purpose: c.purpose, feel: c.feel, guidance: [...c.guidance], steps: [{ distanceMeters: km * 1000, pace: 'easy' }, { reps: 6, distanceMeters: 100, pace: 'repetition', recoverySeconds: 60 }] };
}
