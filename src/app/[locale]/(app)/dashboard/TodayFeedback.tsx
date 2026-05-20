'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FeelingForm, type FeelingFormValue } from '@/components/FeelingForm';
import { createClient } from '@/lib/supabase/client';

export function TodayFeedback({
  locale,
  userId,
  todayDate,
  trackCycle,
}: {
  locale: string;
  userId: string;
  todayDate: string;
  trackCycle: boolean;
}) {
  const t = useTranslations('workout');
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
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-fjord-900">{t('howDoYouFeel')}</h2>
          {saved && <p className="text-sm text-glacier-700 mt-1">Merci, le plan tient compte de votre ressenti.</p>}
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
      {trackCycle && (
        <p className="text-xs text-fjord-600 mt-3">Le suivi du cycle est activé — les phases lutéales et menstruelles allegent automatiquement les séances dures si vous êtes fatiguée.</p>
      )}
    </div>
  );
}
