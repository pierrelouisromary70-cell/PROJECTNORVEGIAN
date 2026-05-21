'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { computeVdot } from '@/lib/vdot/calculator';

interface Race {
  id: string;
  name: string;
  distance_meters: number;
  race_date: string;
  goal_time_seconds: number | null;
  is_primary: boolean;
  priority: 'A' | 'B' | 'C';
}

const PRIORITY_LABELS: Record<'A' | 'B' | 'C', { title: string; sub: string }> = {
  A: { title: 'A — Course principale', sub: "Affûtage complet, plan entièrement orienté vers cette course" },
  B: { title: 'B — Course importante', sub: "Allègement de 5 jours, on continue à entraîner" },
  C: { title: 'C — Course-entraînement', sub: "Pas d'affûtage, la course remplace une séance" },
};

export function RacesClient({ userId, currentVdot, initial }: { userId: string; currentVdot: number; initial: Race[] }) {
  const router = useRouter();
  const [races, setRaces] = useState<Race[]>(initial);
  const [name, setName] = useState('');
  const [dist, setDist] = useState(10000);
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<'A' | 'B' | 'C'>('A');

  const [resultRaceId, setResultRaceId] = useState<string | null>(null);
  const [chrono, setChrono] = useState('');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [savingResult, setSavingResult] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (priority === 'A') {
      await supabase.from('target_races').update({ priority: 'B', is_primary: false }).eq('user_id', userId).eq('priority', 'A');
    }
    const { data } = await supabase.from('target_races').insert({
      user_id: userId, name, distance_meters: dist, race_date: date,
      priority, is_primary: priority === 'A',
    }).select().single();
    if (data) setRaces([...races, data].sort((a, b) => a.race_date.localeCompare(b.race_date)));
    setName(''); setDate('');
    if (priority === 'A') await supabase.from('training_blocks').delete().eq('user_id', userId);
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from('target_races').delete().eq('id', id);
    setRaces(races.filter((r) => r.id !== id));
    router.refresh();
  }

  async function submitResult(e: React.FormEvent) {
    e.preventDefault();
    if (!resultRaceId) return;
    const race = races.find((r) => r.id === resultRaceId);
    if (!race) return;
    setSavingResult(true);
    setResultMessage(null);
    const supabase = createClient();
    const seconds = parseHms(chrono);
    if (!seconds || seconds <= 0) {
      setResultMessage('Temps invalide. Format hh:mm:ss attendu.');
      setSavingResult(false);
      return;
    }
    const newVdot = computeVdot({ distanceMeters: race.distance_meters, timeSeconds: seconds });
    const improved = newVdot > currentVdot;
    await supabase.from('race_results').insert({
      user_id: userId,
      distance_meters: race.distance_meters,
      time_seconds: seconds,
      raced_on: race.race_date,
      computed_vdot: newVdot,
      improved_vdot: improved,
    });
    if (improved) {
      await supabase.from('profiles').update({ vdot: newVdot, updated_at: new Date().toISOString() }).eq('id', userId);
      await supabase.from('training_blocks').delete().eq('user_id', userId);
      setResultMessage(`Bravo ! VDOT mis à jour : ${currentVdot} → ${newVdot}. Votre plan se régénère.`);
    } else {
      setResultMessage(`Résultat enregistré. VDOT actuel (${currentVdot}) conservé — votre niveau de référence reste votre meilleure performance.`);
    }
    setResultRaceId(null);
    setChrono('');
    setSavingResult(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="display text-4xl md:text-5xl text-ink-950">Mes courses</h1>

      <form onSubmit={add} className="card space-y-3">
        <h2 className="font-semibold text-ink-900">Ajouter une course</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nom</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Distance</label>
            <select className="input" value={dist} onChange={(e) => setDist(Number(e.target.value))}>
              <option value={1500}>1500 m</option>
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={21097}>Semi-marathon</option>
              <option value={42195}>Marathon</option>
            </select>
          </div>
          <div>
            <label className="label">Priorité</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as 'A' | 'B' | 'C')}>
              <option value="A">A — Course principale</option>
              <option value="B">B — Course importante</option>
              <option value="C">C — Course-entraînement</option>
            </select>
            <p className="text-xs text-ink-600 mt-1">{PRIORITY_LABELS[priority].sub}</p>
          </div>
        </div>
        <button className="btn-primary">Ajouter</button>
      </form>

      <div className="space-y-3">
        {races.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold text-ink-900 flex items-center gap-2 flex-wrap">
                  {r.name}
                  <span className={r.priority === 'A' ? 'chip-accent' : 'chip'}>Priorité {r.priority}</span>
                </div>
                <div className="text-sm text-ink-700 mt-1">{(r.distance_meters / 1000).toFixed(1)} km · {r.race_date}</div>
                <div className="text-xs text-ink-600 mt-1">{PRIORITY_LABELS[r.priority].sub}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => { setResultRaceId(resultRaceId === r.id ? null : r.id); setResultMessage(null); }}
                >
                  {resultRaceId === r.id ? 'Annuler' : 'Renseigner mon temps'}
                </button>
                <button className="btn-ghost text-red-600 text-sm" onClick={() => remove(r.id)}>Supprimer</button>
              </div>
            </div>

            {resultRaceId === r.id && (
              <form onSubmit={submitResult} className="mt-4 pt-4 border-t border-ink-100 space-y-3">
                <div>
                  <label className="label">Votre temps (hh:mm:ss)</label>
                  <input
                    className="input"
                    placeholder="00:42:30"
                    value={chrono}
                    onChange={(e) => setChrono(e.target.value)}
                    required
                    autoFocus
                  />
                  <p className="text-xs text-ink-600 mt-1">
                    Votre VDOT n&apos;est mis à jour que si cette performance équivaut à un VDOT <strong>supérieur</strong> au VDOT actuel ({currentVdot}). Un mauvais jour ne dégradera pas votre plan.
                  </p>
                </div>
                <button className="btn-primary" disabled={savingResult}>
                  {savingResult ? 'Calcul…' : 'Valider'}
                </button>
              </form>
            )}
          </div>
        ))}
        {races.length === 0 && <p className="text-sm text-ink-600">Pas encore de course planifiée.</p>}
      </div>

      {resultMessage && (
        <div className="rounded-xl bg-aurora-50 border border-aurora-200 p-4 text-aurora-900 text-sm">
          {resultMessage}
        </div>
      )}
    </div>
  );
}

function parseHms(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
