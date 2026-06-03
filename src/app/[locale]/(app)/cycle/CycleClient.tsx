'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { inferCyclePhase, type CyclePhase } from '@/lib/training/adaptation';

const PHASES: { key: CyclePhase; label: string; short: string; color: string }[] = [
  { key: 'menstruation', label: 'Menstruation', short: 'Mens.', color: '#fb7185' },
  { key: 'follicular', label: 'Folliculaire', short: 'Folli.', color: '#fcd34d' },
  { key: 'ovulation', label: 'Ovulation', short: 'Ovul.', color: '#34d399' },
  { key: 'luteal_early', label: 'Lutéale précoce', short: 'Lut. P', color: '#60a5fa' },
  { key: 'luteal_late', label: 'Lutéale tardive', short: 'Lut. T', color: '#a78bfa' },
];

function PhaseWheel({ currentPhase }: { currentPhase: CyclePhase }) {
  const cx = 60, cy = 60, r = 42, w = 14;
  const segs = PHASES.map((p, i) => {
    const startA = (i / 5) * 2 * Math.PI - Math.PI / 2;
    const endA = ((i + 1) / 5) * 2 * Math.PI - Math.PI / 2 - 0.06; // small gap
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    return { ...p, path: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`, isActive: p.key === currentPhase };
  });
  const current = PHASES.find((p) => p.key === currentPhase);
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <svg viewBox="0 0 120 120" className="h-32 w-32" aria-hidden>
        {segs.map((s) => (
          <path
            key={s.key}
            d={s.path}
            fill="none"
            stroke={s.color}
            strokeWidth={s.isActive ? w + 4 : w}
            strokeOpacity={current ? (s.isActive ? 1 : 0.3) : 0.5}
            strokeLinecap="butt"
          />
        ))}
        <text x={60} y={56} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">PHASE</text>
        <text x={60} y={74} textAnchor="middle" fontSize="14" fill="#0f172a" fontWeight="700">{current?.short ?? '?'}</text>
      </svg>
      <p className="text-sm text-ink-700 text-center">{current ? <>Phase actuelle : <strong className="text-ink-950">{current.label}</strong></> : 'Phase non déterminée — déclarez votre dernière période.'}</p>
    </div>
  );
}

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

      <div className="card flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <h2 className="font-semibold text-ink-900">Suivi {enabled ? 'activé' : 'désactivé'}</h2>
          {enabled && currentPhase !== 'unknown' && (
            <PhaseWheel currentPhase={currentPhase} />
          )}
          {enabled && currentPhase === 'unknown' && (
            <p className="text-sm text-ink-600 mt-2">Déclarez votre dernière période pour estimer la phase courante.</p>
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
