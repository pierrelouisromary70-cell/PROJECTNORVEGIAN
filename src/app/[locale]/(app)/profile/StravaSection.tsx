'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  connected: boolean;
  connectedAt: string | null;
  statusFlash?: string;
}

const FLASH_MESSAGES: Record<string, { text: string; tone: 'ok' | 'err' }> = {
  connected: { text: 'Compte Strava connecté.', tone: 'ok' },
  denied: { text: 'Autorisation Strava refusée.', tone: 'err' },
  invalid: { text: 'Retour Strava invalide.', tone: 'err' },
  state_mismatch: { text: 'Sécurité OAuth : état différent. Réessayez.', tone: 'err' },
  state_invalid: { text: 'Sécurité OAuth : état expiré ou falsifié. Réessayez.', tone: 'err' },
  token_failed: { text: 'Échange de jeton Strava échoué.', tone: 'err' },
  db_failed: { text: 'Enregistrement de la connexion en base échoué.', tone: 'err' },
  server_misconfig: { text: 'Strava non configuré côté serveur — contactez le support.', tone: 'err' },
  no_athlete: { text: 'Strava n\'a pas retourné d\'identifiant athlète.', tone: 'err' },
};

export function StravaSection({ connected, connectedAt, statusFlash }: Props) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; activities: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runImport() {
    setImporting(true);
    setError(null);
    setResult(null);
    const res = await fetch('/api/strava/import', { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    setImporting(false);
    if (!res.ok) {
      setError(body?.error === 'not_connected' ? 'Vous n\'êtes pas connecté à Strava.' : 'Import impossible. Réessayez dans quelques minutes.');
      return;
    }
    setResult({ imported: body.imported ?? 0, activities: body.activities ?? 0 });
    router.refresh();
  }

  async function disconnect() {
    if (!confirm('Déconnecter Strava ? Les séances déjà importées restent.')) return;
    const res = await fetch('/api/strava/disconnect', { method: 'POST' });
    if (res.ok) router.refresh();
  }

  const flash = statusFlash ? FLASH_MESSAGES[statusFlash] : null;

  return (
    <div className="card border-orange-200 ring-orange-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Synchronisation Strava
          </h2>
          <p className="text-sm text-ink-700 mt-1">
            {connected
              ? `Connecté${connectedAt ? ` depuis le ${new Date(connectedAt).toLocaleDateString()}` : ''}. Importez vos 30 dernières courses pour qu'elles apparaissent dans votre historique.`
              : 'Connectez votre compte Strava pour importer vos courses récentes. Lecture seule — Nordic Run ne publie rien sur Strava.'}
          </p>
        </div>
      </div>

      {flash && (
        <p className={`mt-3 text-sm rounded-lg px-3 py-2 ${flash.tone === 'ok' ? 'bg-aurora-50 text-aurora-800' : 'bg-red-50 text-red-800'}`}>
          {flash.text}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!connected ? (
          <a
            href="/api/strava/connect"
            className="btn bg-orange-500 text-white hover:bg-orange-600 font-semibold"
          >
            Connecter Strava
          </a>
        ) : (
          <>
            <button
              type="button"
              onClick={runImport}
              disabled={importing}
              className="btn bg-orange-500 text-white hover:bg-orange-600 font-semibold disabled:opacity-50"
            >
              {importing ? 'Import en cours…' : 'Importer mes 30 dernières courses'}
            </button>
            <button type="button" onClick={disconnect} className="btn-ghost">
              Déconnecter
            </button>
          </>
        )}
      </div>

      {result && (
        <p className="mt-3 text-sm text-aurora-800 bg-aurora-50 rounded-lg px-3 py-2">
          {result.activities} course{result.activities > 1 ? 's' : ''} trouvée{result.activities > 1 ? 's' : ''} sur Strava — {result.imported} ajoutée{result.imported > 1 ? 's' : ''} ou mise{result.imported > 1 ? 's' : ''} à jour.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <p className="mt-4 text-xs text-ink-500">
        Permissions demandées : <code>read,activity:read</code> uniquement.
        L&apos;import est manuel — pas de synchronisation automatique en V1.
      </p>
    </div>
  );
}
