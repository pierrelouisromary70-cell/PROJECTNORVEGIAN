'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FatigueLevel, PainLevel } from '@/lib/training/adaptation';

export interface FeelingFormValue {
  fatigue: FatigueLevel;
  pain: PainLevel;
  availableMinutes?: number;
  notes?: string;
}

export function FeelingForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<FeelingFormValue>;
  onSubmit: (v: FeelingFormValue) => void | Promise<void>;
}) {
  const t = useTranslations('feel');
  const tw = useTranslations('workout');
  const [fatigue, setFatigue] = useState<FatigueLevel>((initial?.fatigue ?? 2) as FatigueLevel);
  const [pain, setPain] = useState<PainLevel>((initial?.pain ?? 0) as PainLevel);
  const [minutes, setMinutes] = useState<string>(initial?.availableMinutes ? String(initial.availableMinutes) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const fatigueOptions: { v: FatigueLevel; label: string }[] = [
    { v: 1, label: t('fresh') },
    { v: 2, label: t('good') },
    { v: 3, label: t('average') },
    { v: 4, label: t('tired') },
    { v: 5, label: t('exhausted') },
  ];
  const painOptions: { v: PainLevel; label: string }[] = [
    { v: 0, label: t('noPain') },
    { v: 1, label: t('niggle') },
    { v: 2, label: t('moderate') },
    { v: 3, label: t('severe') },
  ];

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ fatigue, pain, availableMinutes: minutes ? Number(minutes) : undefined, notes });
      }}
    >
      <div>
        <label className="label">{t('fatigue')}</label>
        <div className="flex flex-wrap gap-2">
          {fatigueOptions.map((o) => (
            <button
              type="button"
              key={o.v}
              onClick={() => setFatigue(o.v)}
              className={`btn ${fatigue === o.v ? 'bg-fjord-600 text-white' : 'bg-fjord-100 text-fjord-800'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">{t('pain')}</label>
        <div className="flex flex-wrap gap-2">
          {painOptions.map((o) => (
            <button
              type="button"
              key={o.v}
              onClick={() => setPain(o.v)}
              className={`btn ${pain === o.v ? 'bg-fjord-600 text-white' : 'bg-fjord-100 text-fjord-800'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="minutes">Temps disponible (min, optionnel)</label>
        <input id="minutes" className="input" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="60" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary">{tw('complete')}</button>
    </form>
  );
}
