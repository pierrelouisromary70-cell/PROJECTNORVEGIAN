'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('App error:', error);
    }
  }, [error]);

  return (
    <main className="min-h-screen grid place-items-center bg-white px-6 text-center">
      <div className="max-w-md">
        <p className="font-display text-7xl font-bold text-ink-200">!</p>
        <h1 className="font-display text-3xl text-ink-950 mt-4">Quelque chose s&apos;est mal passé</h1>
        <p className="text-ink-700 mt-3">
          Une erreur inattendue est survenue. Si elle persiste, contactez-nous à{' '}
          <a href="mailto:contact@nordicrun.app" className="underline">contact@nordicrun.app</a>.
        </p>
        {error.digest && <p className="text-xs text-ink-500 mt-3 font-mono">Réf : {error.digest}</p>}
        <div className="mt-8 flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary">Réessayer</button>
          <Link href="/fr" className="btn-secondary">Accueil</Link>
        </div>
      </div>
    </main>
  );
}
