'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function callInjuryApi(action: 'declare' | 'start_comeback' | 'resume_normal') {
  const res = await fetch('/api/profile/injury', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Échec' }));
    throw new Error(error);
  }
}

export function DeclareInjuryButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink-700">Confirmer la mise en pause ?</span>
      <button
        className="btn bg-amber-600 text-white hover:bg-amber-700"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try { await callInjuryApi('declare'); router.refresh(); } finally { setLoading(false); }
        }}
      >
        {loading ? '…' : 'Oui, je suis blessé(e)'}
      </button>
      <button className="btn-ghost" onClick={() => setConfirming(false)}>Annuler</button>
    </div>
  ) : (
    <button className="btn bg-amber-50 text-amber-800 hover:bg-amber-100" onClick={() => setConfirming(true)}>
      Déclarer une blessure / mettre en pause
    </button>
  );
}

export function ComebackStartButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="btn-accent"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try { await callInjuryApi('start_comeback'); router.refresh(); } finally { setLoading(false); }
      }}
    >
      {loading ? '…' : 'Démarrer le protocole de reprise (14 jours)'}
    </button>
  );
}

export function ResumeNormalButton({ label = 'Reprendre le plan normal' }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="btn-secondary text-sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try { await callInjuryApi('resume_normal'); router.refresh(); } finally { setLoading(false); }
      }}
    >
      {loading ? '…' : label}
    </button>
  );
}
