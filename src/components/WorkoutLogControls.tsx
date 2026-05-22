'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, MinusCircle } from 'lucide-react';

export type WorkoutLogStatus = 'done' | 'skipped' | 'partial' | 'replaced';

export interface WorkoutLogControlsProps {
  workoutId: string;
  workoutDate: string;
  /** Existing log status, if the runner already validated this session. */
  initialStatus?: WorkoutLogStatus;
}

async function callLogApi(payload: {
  workoutId: string;
  workoutDate: string;
  status: WorkoutLogStatus;
  actualRpe?: number;
  notes?: string;
}) {
  const res = await fetch('/api/workouts/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Échec' }));
    throw new Error(error);
  }
}

async function deleteLogApi(workoutId: string) {
  await fetch('/api/workouts/log', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workoutId }),
  });
}

export function WorkoutLogControls({ workoutId, workoutDate, initialStatus }: WorkoutLogControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<WorkoutLogStatus | undefined>(initialStatus);
  const [showDetail, setShowDetail] = useState(false);
  const [actualRpe, setActualRpe] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(s: WorkoutLogStatus, withDetail = false) {
    setSaving(true);
    try {
      await callLogApi({
        workoutId,
        workoutDate,
        status: s,
        actualRpe: withDetail && actualRpe !== '' ? Number(actualRpe) : undefined,
        notes: withDetail && notes ? notes : undefined,
      });
      setStatus(s);
      setShowDetail(false);
      router.refresh();
    } catch {
      // best-effort; status stays unchanged
    } finally {
      setSaving(false);
    }
  }

  async function clearLog() {
    setSaving(true);
    try {
      await deleteLogApi(workoutId);
      setStatus(undefined);
      setActualRpe('');
      setNotes('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (status === 'done') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="chip bg-emerald-50 text-emerald-800"><Check className="h-3 w-3" /> Séance validée</span>
        <button type="button" onClick={clearLog} disabled={saving} className="text-ink-600 hover:text-ink-900 underline text-xs">
          annuler
        </button>
      </div>
    );
  }
  if (status === 'skipped') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="chip bg-amber-50 text-amber-800"><X className="h-3 w-3" /> Manquée</span>
        <button type="button" onClick={clearLog} disabled={saving} className="text-ink-600 hover:text-ink-900 underline text-xs">
          annuler
        </button>
      </div>
    );
  }
  if (status === 'partial') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="chip bg-sky-50 text-sky-800"><MinusCircle className="h-3 w-3" /> Partielle</span>
        <button type="button" onClick={clearLog} disabled={saving} className="text-ink-600 hover:text-ink-900 underline text-xs">
          annuler
        </button>
      </div>
    );
  }
  if (status === 'replaced') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="chip bg-violet-50 text-violet-800">Remplacée</span>
        <button type="button" onClick={clearLog} disabled={saving} className="text-ink-600 hover:text-ink-900 underline text-xs">
          annuler
        </button>
      </div>
    );
  }

  if (showDetail) {
    return (
      <div className="space-y-3 border-t border-ink-100 pt-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">RPE ressenti (0-10)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={10}
              value={actualRpe}
              onChange={(e) => setActualRpe(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Note rapide</label>
            <input
              className="input"
              type="text"
              maxLength={200}
              placeholder="Jambes lourdes / parfait / interrompue par la pluie…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving} onClick={() => submit('done', true)} className="btn-accent">
            <Check className="h-4 w-4" /> Valider (faite)
          </button>
          <button type="button" disabled={saving} onClick={() => submit('partial', true)} className="btn bg-sky-50 text-sky-800 hover:bg-sky-100">
            Partielle
          </button>
          <button type="button" disabled={saving} onClick={() => submit('replaced', true)} className="btn bg-violet-50 text-violet-800 hover:bg-violet-100">
            Remplacée
          </button>
          <button type="button" onClick={() => setShowDetail(false)} className="btn-ghost">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" disabled={saving} onClick={() => submit('done')} className="btn-accent">
        <Check className="h-4 w-4" /> Faite
      </button>
      <button type="button" disabled={saving} onClick={() => submit('skipped')} className="btn bg-amber-50 text-amber-800 hover:bg-amber-100">
        <X className="h-4 w-4" /> Manquée
      </button>
      <button type="button" onClick={() => setShowDetail(true)} className="text-ink-600 hover:text-ink-900 underline text-xs">
        avec détail (RPE, note)
      </button>
    </div>
  );
}
