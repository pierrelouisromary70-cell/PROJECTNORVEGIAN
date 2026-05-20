'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Race {
  id: string;
  name: string;
  distance_meters: number;
  race_date: string;
  goal_time_seconds: number | null;
  is_primary: boolean;
}

export function RacesClient({ userId, initial }: { userId: string; initial: Race[] }) {
  const router = useRouter();
  const [races, setRaces] = useState<Race[]>(initial);
  const [name, setName] = useState('');
  const [dist, setDist] = useState(10000);
  const [date, setDate] = useState('');
  const [primary, setPrimary] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (primary) {
      await supabase.from('target_races').update({ is_primary: false }).eq('user_id', userId);
    }
    const { data } = await supabase.from('target_races').insert({
      user_id: userId,
      name,
      distance_meters: dist,
      race_date: date,
      is_primary: primary,
    }).select().single();
    if (data) setRaces([...races, data].sort((a, b) => a.race_date.localeCompare(b.race_date)));
    setName(''); setDate('');
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from('target_races').delete().eq('id', id);
    setRaces(races.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-fjord-950">Mes courses</h1>
      <form onSubmit={add} className="card space-y-3">
        <h2 className="font-semibold text-fjord-900">Ajouter une course</h2>
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
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={21097}>Semi-marathon</option>
              <option value={42195}>Marathon</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
            <span className="text-sm">Course principale (oriente le plan)</span>
          </label>
        </div>
        <button className="btn-primary">Ajouter</button>
      </form>

      <div className="space-y-3">
        {races.map((r) => (
          <div key={r.id} className="card flex items-center justify-between">
            <div>
              <div className="font-semibold text-fjord-900">{r.name} {r.is_primary && <span className="chip">Principale</span>}</div>
              <div className="text-sm text-fjord-700">{(r.distance_meters / 1000).toFixed(1)} km · {r.race_date}</div>
            </div>
            <button className="btn-ghost text-red-600" onClick={() => remove(r.id)}>Supprimer</button>
          </div>
        ))}
        {races.length === 0 && <p className="text-sm text-fjord-600">Pas encore de course planifiée.</p>}
      </div>
    </div>
  );
}
