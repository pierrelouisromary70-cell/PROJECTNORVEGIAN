'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FeelingForm, type FeelingFormValue } from '@/components/FeelingForm';
import { createClient } from '@/lib/supabase/client';
import type { CyclePhase } from '@/lib/training/adaptation';

const PHASE_LABEL: Record<Exclude<CyclePhase, 'unknown'>, string> = {
  menstruation: 'menstruelle',
  follicular: 'folliculaire',
  ovulation: 'ovulatoire',
  luteal_early: 'lutéale précoce',
  luteal_late: 'lutéale tardive',
};

export function TodayFeedback({
  locale,
  userId,
  todayDate,
  trackCycle,
  cyclePhase,
}: {
  locale: string;
  userId: string;
  todayDate: string;
  trackCycle: boolean;
  cyclePhase?: CyclePhase;
}) {
  const t = useTranslations('workout');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(v: FeelingFormValue) {
    const supabase = createClient();
    await supabase.from('daily_logs').upsert(
      {
        user_id: userId,
        log_date: todayDate,
        fatigue: v.fatigue,
        pain: v.pain,
        available_minutes: v.availableMinutes,
        notes: v.notes,
      },
      { onConflict: 'user_id,log_date' },
    );
    setSaved(true);
    setOpen(false);
    // Refresh the server component so today's session is re-rendered with
    // the freshly applied adaptation.
    router.refresh();
  }

  const phaseLabel = cyclePhase && cyclePhase !== 'unknown' ? PHASE_LABEL[cyclePhase] : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-fjord-900">{t('howDoYouFeel')}</h2>
          {saved && <p className="text-sm text-glacier-700 mt-1">Merci, la séance du jour vient d&apos;être recalculée.</p>}
        </div>
        <button className="btn-secondary" onClick={() => setOpen((v) => !v)}>
          {open ? 'Fermer' : saved ? 'Modifier' : 'Renseigner'}
        </button>
      </div>
      {open && (
        <div className="mt-4">
          <FeelingForm onSubmit={save} />
        </div>
      )}
      {trackCycle && phaseLabel && (
        <p className="text-xs text-fjord-600 mt-3">
          Phase {phaseLabel} en cours. Si vous indiquez une fatigue ≥ 3 sur une séance dure, l&apos;intensité
          sera réduite de 20 %. Vous gardez la main : modifiez votre ressenti à tout moment.
        </p>
      )}
      {trackCycle && !phaseLabel && (
        <p className="text-xs text-fjord-600 mt-3">
          Suivi du cycle activé — déclarez votre dernière période dans <span className="font-medium">Profil → Cycle</span> pour
          que la phase soit prise en compte.
        </p>
      )}
    </div>
  );
}
