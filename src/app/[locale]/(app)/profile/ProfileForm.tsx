'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DeclareInjuryButton, ComebackStartButton, ResumeNormalButton } from '../dashboard/InjuryStateControls';

function InjuryControlsWidget() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DeclareInjuryButton />
      <span className="text-sm text-ink-600">ou</span>
      <ComebackStartButton />
      <span className="text-sm text-ink-600">ou</span>
      <ResumeNormalButton label="Revenir au plan normal" />
    </div>
  );
}

export function ProfileForm({ profile, locale }: { profile: any; locale: string }) {
  const router = useRouter();
  const [weeklyKm, setWeeklyKm] = useState(Number(profile.current_weekly_km));
  const [daysPerWeek, setDaysPerWeek] = useState(profile.days_per_week);
  const [goal, setGoal] = useState(profile.goal);
  const [timeConstraint, setTimeConstraint] = useState<number | ''>(profile.time_constraints_min ?? '');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch('/api/account/delete', { method: 'POST' });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Échec de la suppression' }));
      setDeleteError(error);
      setDeleting(false);
      return;
    }
    router.push(`/${locale}`);
  }

  return (
    <>
      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-semibold text-ink-900">Données de profil</h2>
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

      <div className="card border-amber-200 ring-amber-100">
        <h2 className="font-semibold text-amber-700">Blessure / arrêt prolongé</h2>
        <p className="text-sm text-ink-700 mt-2">
          Si vous êtes blessé(e) ou devez vous arrêter (maladie, voyage, vie pro intense), mettez votre
          plan en pause depuis ici. Quand vous serez prêt(e), un protocole de reprise progressif sur 14
          jours vous accompagnera.
        </p>
        <div className="mt-4">
          <InjuryControlsWidget />
        </div>
      </div>

      <div className="card border-red-200 ring-red-100">
        <h2 className="font-semibold text-red-700">Zone dangereuse</h2>
        <p className="text-sm text-ink-700 mt-2">
          Supprimer votre compte efface définitivement votre profil, vos performances, votre plan
          d&apos;entraînement et vos données de cycle. Aucune récupération possible.
        </p>
        {!showDelete ? (
          <button
            type="button"
            className="btn mt-4 bg-red-50 text-red-700 hover:bg-red-100"
            onClick={() => setShowDelete(true)}
          >
            Supprimer mon compte
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="label text-red-700">
              Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous
            </label>
            <input
              className="input border-red-300"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoFocus
            />
            {deleteError && <p className="text-red-600 text-sm">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleteConfirm !== 'SUPPRIMER' || deleting}
                onClick={deleteAccount}
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? 'Suppression…' : 'Confirmer la suppression définitive'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirm('');
                  setDeleteError(null);
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
