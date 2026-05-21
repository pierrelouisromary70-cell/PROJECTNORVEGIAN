'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { computeVdot, RACE_PRESETS } from '@/lib/vdot/calculator';
import { predictRaceTimes, formatRaceTime } from '@/lib/vdot/predictor';
import { createClient } from '@/lib/supabase/client';
import { inferExperience } from '@/lib/training/norwegian';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function OnboardingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('onboarding');
  const tCycle = useTranslations('cycle');
  const c = useTranslations('common');
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('male');
  const [years, setYears] = useState(2);
  const [weeklyKm, setWeeklyKm] = useState(30);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [hasIntervals, setHasIntervals] = useState(false);
  const [goal, setGoal] = useState<'progress' | 'perform'>('progress');
  const [raceDist, setRaceDist] = useState<keyof typeof RACE_PRESETS>('10k');
  const [raceTime, setRaceTime] = useState('00:50:00');
  const [maxMinutes, setMaxMinutes] = useState<number | ''>('');
  const [trackCycle, setTrackCycle] = useState(false);
  const [saving, setSaving] = useState(false);

  const vdot = useMemo(() => {
    try {
      const seconds = parseHms(raceTime);
      if (!seconds) return 0;
      return computeVdot({ distanceMeters: RACE_PRESETS[raceDist], timeSeconds: seconds });
    } catch { return 0; }
  }, [raceDist, raceTime]);

  const level = inferExperience({ experienceYears: years, currentWeeklyKm: weeklyKm, hasDoneIntervals: hasIntervals });

  async function finish() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); router.push(`/${locale}/login`); return; }
    await supabase.from('profiles').upsert({
      id: user.id, sex, experience_years: years, current_weekly_km: weeklyKm,
      days_per_week: daysPerWeek, has_done_intervals: hasIntervals, goal,
      vdot: vdot || 40, track_cycle: trackCycle,
      time_constraints_min: maxMinutes === '' ? null : maxMinutes,
      onboarded: true, locale, updated_at: new Date().toISOString(),
    });
    await supabase.from('race_results').insert({
      user_id: user.id, distance_meters: RACE_PRESETS[raceDist],
      time_seconds: parseHms(raceTime) || 3000,
      raced_on: new Date().toISOString().slice(0, 10), computed_vdot: vdot,
    });
    setSaving(false);
    router.push(`/${locale}/dashboard`);
  }

  return (
    <main className="min-h-screen grid place-items-center px-6 py-10">
      <div className="card w-full max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-ink-950">{t('title')}</h1>
          <span className="chip">{step} / 6</span>
        </div>

        {step === 1 && (
          <section className="space-y-4">
            <h2 className="font-semibold">{t('step1')}</h2>
            <div>
              <label className="label">Sexe</label>
              <div className="flex gap-2">
                {(['male', 'female', 'other'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setSex(s)} className={`btn ${sex === s ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-800'}`}>
                    {s === 'male' ? 'Homme' : s === 'female' ? 'Femme' : 'Autre'}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <h2 className="font-semibold">{t('step2')}</h2>
            <NumberField label={t('experienceYears')} value={years} onChange={setYears} step={0.5} />
            <NumberField label={t('weeklyKm')} value={weeklyKm} onChange={setWeeklyKm} step={5} />
            <NumberField label={t('daysPerWeek')} value={daysPerWeek} onChange={setDaysPerWeek} step={1} min={2} max={7} />
            <div>
              <label className="label">{t('hasIntervals')}</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setHasIntervals(true)} className={`btn ${hasIntervals ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-800'}`}>Oui</button>
                <button type="button" onClick={() => setHasIntervals(false)} className={`btn ${!hasIntervals ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-800'}`}>Non</button>
              </div>
            </div>
            <p className="text-sm text-ink-600">Niveau détecté : <strong>{level}</strong></p>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <h2 className="font-semibold">{t('step3')}</h2>
            <button type="button" onClick={() => setGoal('progress')} className={`w-full text-left p-4 rounded-xl border ${goal === 'progress' ? 'border-ink-950 bg-ink-50' : 'border-ink-200'}`}>
              <div className="font-medium text-ink-900">{t('goalProgress')}</div>
              <div className="text-sm text-ink-700">Plus de plaisir, moins de pression. Volume modéré, intensité contrôlée.</div>
            </button>
            <button type="button" onClick={() => setGoal('perform')} className={`w-full text-left p-4 rounded-xl border ${goal === 'perform' ? 'border-ink-950 bg-ink-50' : 'border-ink-200'}`}>
              <div className="font-medium text-ink-900">{t('goalPerform')}</div>
              <div className="text-sm text-ink-700">Performance maximale. Méthode norvégienne pleine puissance.</div>
            </button>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-4">
            <h2 className="font-semibold">{t('step4')}</h2>
            <p className="text-sm text-ink-700">Renseignez une performance récente. On en déduit votre VDOT et toutes vos allures.</p>
            <div>
              <label className="label">{t('raceDistance')}</label>
              <select className="input" value={raceDist} onChange={(e) => setRaceDist(e.target.value as keyof typeof RACE_PRESETS)}>
                <option value="1500m">1500 m</option>
                <option value="3k">3 km</option>
                <option value="5k">5 km</option>
                <option value="10k">10 km</option>
                <option value="hm">Semi-marathon</option>
                <option value="marathon">Marathon</option>
              </select>
            </div>
            <div>
              <label className="label">{t('raceTime')}</label>
              <input className="input" value={raceTime} onChange={(e) => setRaceTime(e.target.value)} placeholder="00:50:00" />
            </div>
            <div className="rounded-xl bg-ink-50 p-4">
              <div className="text-xs uppercase text-ink-600">{t('computedVdot')}</div>
              <div className="text-3xl font-bold text-ink-900">{vdot || '—'}</div>
            </div>
            {vdot > 0 && (
              <div>
                <p className="text-sm font-medium text-ink-800 mb-2">Vos temps prédits sur les autres distances :</p>
                <div className="grid grid-cols-2 gap-2">
                  {predictRaceTimes(vdot).map((p) => (
                    <div key={p.distanceLabel} className="rounded-lg bg-white border border-ink-100 p-2">
                      <div className="text-xs text-ink-600">{p.distanceLabel}</div>
                      <div className="font-bold text-ink-900">{formatRaceTime(p.timeSeconds)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 5 && (
          <section className="space-y-4">
            <h2 className="font-semibold">{t('step5')}</h2>
            <div>
              <label className="label">{t('timeConstraint')}</label>
              <input className="input" type="number" value={maxMinutes} onChange={(e) => setMaxMinutes(e.target.value ? Number(e.target.value) : '')} placeholder="90" />
              <p className="text-xs text-ink-600 mt-1">Laissez vide si pas de contrainte particulière.</p>
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="space-y-4">
            <h2 className="font-semibold">Suivi du cycle</h2>
            {sex === 'female' ? (
              <div>
                <p className="text-sm text-ink-700 mb-3">{tCycle('intro')}</p>
                <p className="text-xs text-aurora-700 bg-aurora-50 rounded-lg p-3 mb-3">
                  En activant ce suivi, vous donnez votre <strong>consentement explicite</strong> au
                  traitement de données de santé (article 9.2.a RGPD), révocable à tout moment.
                </p>
                <div>
                  <label className="label">{t('trackCycle')}</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTrackCycle(true)} className={`btn ${trackCycle ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-800'}`}>Activer</button>
                    <button type="button" onClick={() => setTrackCycle(false)} className={`btn ${!trackCycle ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-800'}`}>Plus tard</button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-700">Vous êtes prêt. Cliquez sur Continuer pour générer votre premier plan.</p>
            )}
          </section>
        )}

        <div className="flex justify-between mt-8">
          <button type="button" className="btn-ghost" onClick={() => setStep((s) => (Math.max(1, s - 1) as Step))} disabled={step === 1}>{c('back')}</button>
          {step < 6 ? (
            <button type="button" className="btn-primary" onClick={() => setStep((s) => (s + 1) as Step)}>{c('continue')}</button>
          ) : (
            <button type="button" className="btn-primary" disabled={saving} onClick={finish}>{saving ? c('loading') : c('continue')}</button>
          )}
        </div>
      </div>
    </main>
  );
}

function NumberField({ label, value, onChange, step = 1, min = 0, max = 1000 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" step={step} min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function parseHms(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
