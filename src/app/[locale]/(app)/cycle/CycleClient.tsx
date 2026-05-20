'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { inferCyclePhase } from '@/lib/training/adaptation';

interface CycleLog {
  id: string;
  period_start: string;
  period_end: string | null;
  cycle_length_days: number | null;
  symptoms: string[] | null;
  notes: string | null;
}

export function CycleClient({ userId, initial, enabled, sex }: { userId: string; initial: CycleLog[]; enabled: boolean; sex?: string }) {
  const t = useTranslations('cycle');
  const router = useRouter();
  const [logs, setLogs] = useState<CycleLog[]>(initial);
  const [start, setStart] = useState('');
  const [length, setLength] = useState(28);

  if (sex !== 'female') {
    return <div className="card">Section réservée aux utilisatrices ayant un cycle menstruel.</div>;
  }

  async function toggle() {
    const supabase = createClient();
    await supabase.from('profiles').update({ track_cycle: !enabled }).eq('id', userId);
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data } = await supabase.from('cycle_logs').insert({
      user_id: userId,
      period_start: start,
      cycle_length_days: length,
    }).select().single();
    if (data) setLogs([data, ...logs]);
    setStart('');
  }

  const currentPhase = logs[0]?.period_start ? inferCyclePhase(new Date(logs[0].period_start), new Date(), logs[0].cycle_length_days ?? 28) : 'unknown';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-fjord-950">{t('title')}</h1>
      <p className="text-sm text-fjord-700">{t('intro')}</p>

      <div className="card flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-fjord-900">Suivi {enabled ? 'activé' : 'désactivé'}</h2>
          {enabled && currentPhase !== 'unknown' && (
            <p className="text-sm text-fjord-700 mt-1">Phase actuelle estimée : <strong>{t(`phase${capitalize(currentPhase.split('_')[0])}`)}</strong></p>
          )}
        </div>
        <button className="btn-secondary" onClick={toggle}>{enabled ? 'Désactiver' : 'Activer'}</button>
      </div>

      {enabled && (
        <>
          <form onSubmit={add} className="card space-y-3">
            <h2 className="font-semibold text-fjord-900">Nouveau cycle</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">{t('lastPeriod')}</label>
                <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div>
                <label className="label">{t('length')}</label>
                <input className="input" type="number" value={length} onChange={(e) => setLength(Number(e.target.value))} min={21} max={45} />
              </div>
            </div>
            <button className="btn-primary">Enregistrer</button>
          </form>

          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="card">
                <div className="font-medium text-fjord-900">Début : {l.period_start}</div>
                <div className="text-sm text-fjord-700">Cycle : {l.cycle_length_days ?? 28} jours</div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm text-fjord-600">Aucun cycle enregistré.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
