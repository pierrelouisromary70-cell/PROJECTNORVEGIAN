'use client';
// Last-resort fallback for errors thrown in the root layout itself — at that
// level the locale [locale]/error.tsx can't render because the layout chain
// is broken. Next requires this file to include its own <html>/<body>.

import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { console.error('root_error', error); }, [error]);
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fff', color: '#0f172a' }}>
        <div style={{ maxWidth: 480, padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 72, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>!</p>
          <h1 style={{ fontSize: 28, margin: '16px 0 0' }}>Nordic Run est temporairement indisponible</h1>
          <p style={{ marginTop: 16, lineHeight: 1.6, color: '#475569' }}>
            Une erreur inattendue est survenue au chargement de l&apos;application. Rechargez la page dans un instant ; si le problème persiste, écrivez-nous à{' '}
            <a href="mailto:contact@nordicrun.app" style={{ color: '#0f172a' }}>contact@nordicrun.app</a>.
          </p>
          {error.digest && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16, fontFamily: 'ui-monospace, monospace' }}>Réf : {error.digest}</p>}
          <a href="/" style={{ display: 'inline-block', marginTop: 32, padding: '10px 20px', background: '#0f172a', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>Retour à l&apos;accueil</a>
        </div>
      </body>
    </html>
  );
}
