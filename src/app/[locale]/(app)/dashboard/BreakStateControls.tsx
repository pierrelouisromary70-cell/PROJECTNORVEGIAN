'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function callBreakApi(action: 'start' | 'end') {
  const res = await fetch('/api/profile/break', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Échec' }));
    throw new Error(error);
  }
}

export function StartBreakButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink-700">Mettre le plan en pause volontaire ?</span>
      <button
        className="btn bg-sky-600 text-white hover:bg-sky-700"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await callBreakApi('start');
            router.refresh();
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? '…' : 'Oui, je prends une coupure'}
      </button>
      <button className="btn-ghost" onClick={() => setConfirming(false)}>Annuler</button>
    </div>
  ) : (
    <button className="btn bg-sky-50 text-sky-800 hover:bg-sky-100" onClick={() => setConfirming(true)}>
      Démarrer une coupure (post-course, vacances…)
    </button>
  );
}

export function EndBreakButton({ label = 'Reprendre l\'entraînement (ramp-up progressif sur 4 sem.)' }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="btn-accent"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await callBreakApi('end');
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? '…' : label}
    </button>
  );
}
