'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ProfileForm({ profile, locale }: { profile: any; locale: string }) {
  const router = useRouter();
  const [weeklyKm, setWeeklyKm] = useState(Number(profile.current_weekly_km));
  const [daysPerWeek, setDaysPerWeek] = useState(profile.days_per_week);
  const [goal, setGoal] = useState(profile.goal);
  const [timeConstraint, setTimeConstraint] = useState<number | ''>(profile.time_constraints_min ?? '');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from('profiles').update({
      current_weekly_km: weeklyKm,
      days_per_week: daysPerWeek,
      goal,
      time_constraints_min: timeConstraint === '' ? null : timeConstraint,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    setSaving(false);
    router.refresh();
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      <h2 className="font-semibold text-fjord-900">Données de profil</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Volume hebdo (km)</label>
          <input className="input" type="number" value={weeklyKm} onChange={(e) => setWeeklyKm(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Jours / semaine</label>
          <input className="input" type="number" min={2} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Objectif</label>
          <select className="input" value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="progress">Progresser</option>
            <option value="perform">Performer</option>
          </select>
        </div>
        <div>
          <label className="label">Temps max / séance (min)</label>
          <input className="input" type="number" value={timeConstraint} onChange={(e) => setTimeConstraint(e.target.value ? Number(e.target.value) : '')} />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="btn-primary" disabled={saving}>{saving ? '…' : 'Enregistrer'}</button>
        <button type="button" className="btn-ghost" onClick={logout}>Déconnexion</button>
      </div>
    </form>
  );
}
