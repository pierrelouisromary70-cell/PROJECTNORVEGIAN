'use client';
import { useState } from 'react';

export function TrialBanner({ days, locale }: { days: number; locale: string }) {
  const [loading, setLoading] = useState<null | 'monthly' | 'annual'>(null);

  async function upgrade(plan: 'monthly' | 'annual') {
    setLoading(plan);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale, plan }),
    });
    const { url } = await res.json();
    if (url) location.href = url;
    setLoading(null);
  }

  const urgent = days <= 3;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-aurora-700 via-aurora-800 to-ink-950 text-white p-5 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-aurora-400/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-aurora-600/20 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center justify-center min-w-[3.5rem] h-12 px-3 rounded-xl text-sm font-bold ${urgent ? 'bg-amber-300 text-ink-950' : 'bg-aurora-500 text-ink-950'}`}>
            J−{days}
          </div>
          <div>
            <p className="font-semibold text-base leading-tight">
              {urgent ? `Plus que ${days} jour${days > 1 ? 's' : ''} d'essai` : `Essai gratuit · ${days} jours restants`}
            </p>
            <p className="text-xs text-aurora-100 mt-0.5">Annulable en 1 clic · 60 € d&apos;économie sur l&apos;annuel</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => upgrade('monthly')}
            disabled={loading !== null}
            className="btn bg-white/10 text-white hover:bg-white/20 backdrop-blur text-sm font-semibold disabled:opacity-50"
          >
            {loading === 'monthly' ? '…' : 'Mensuel · 15 €/mois'}
          </button>
          <button
            type="button"
            onClick={() => upgrade('annual')}
            disabled={loading !== null}
            className="btn bg-aurora-400 text-ink-950 hover:bg-aurora-300 text-sm font-bold disabled:opacity-50"
          >
            {loading === 'annual' ? '…' : 'Annuel · 10 €/mois →'}
          </button>
        </div>
      </div>
    </div>
  );
}
