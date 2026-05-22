'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  connected: boolean;
  connectedAt: string | null;
  autoSync: boolean;
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

export function StravaSection({ connected, connectedAt, autoSync, statusFlash }: Props) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; matched: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSyncBusy, setAutoSyncBusy] = useState(false);

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
    setResult({
      imported: body.imported ?? 0,
      matched: body.matched ?? 0,
      total: body.total ?? body.imported ?? 0,
    });
    router.refresh();
  }

  async function disconnect() {
    if (!confirm('Déconnecter Strava ? Les séances déjà importées restent.')) return;
    const res = await fetch('/api/strava/disconnect', { method: 'POST' });
    if (res.ok) router.refresh();
  }

  async function toggleAutoSync(next: boolean) {
    setAutoSyncBusy(true);
    const res = await fetch('/api/strava/auto-sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    });
    setAutoSyncBusy(false);
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
              ? `Connecté${connectedAt ? ` depuis le ${new Date(connectedAt).toLocaleDateString()}` : ''}. Vos courses Strava sont importées${autoSync ? ' automatiquement à chaque nouvelle activité' : ' uniquement quand vous cliquez sur le bouton'}. Les courses qui correspondent à une séance de votre plan sont validées automatiquement.`
              : 'Connectez votre compte Strava pour que vos courses récentes soient importées. Lecture seule — Nordic Run ne publie rien sur Strava.'}
          </p>
        </div>
      </div>

      {flash && (
        <p className={`mt-3 text-sm rounded-lg px-3 py-2 ${flash.tone === 'ok' ? 'bg-aurora-50 text-aurora-800' : 'bg-red-50 text-red-800'}`}>
          {flash.text}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
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
              {importing ? 'Import en cours…' : 'Resynchroniser les 30 dernières courses'}
            </button>
            <button type="button" onClick={disconnect} className="btn-ghost">
              Déconnecter
            </button>
          </>
        )}
      </div>

      {connected && (
        <label className="mt-4 flex items-center gap-3 cursor-pointer select-none">
          <span className="relative inline-flex">
            <input
              type="checkbox"
              checked={autoSync}
              disabled={autoSyncBusy}
              onChange={(e) => toggleAutoSync(e.target.checked)}
              className="sr-only peer"
            />
            <span className="h-6 w-11 rounded-full bg-ink-200 peer-checked:bg-orange-500 transition-colors" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
          <span className="text-sm text-ink-800">
            <span className="font-medium">Synchronisation automatique</span>
            <span className="block text-xs text-ink-600">
              Importer chaque nouvelle course Strava sans cliquer (webhook).
            </span>
          </span>
        </label>
      )}

      {result && (
        <p className="mt-3 text-sm text-aurora-800 bg-aurora-50 rounded-lg px-3 py-2">
          {result.total} course{result.total > 1 ? 's' : ''} synchronisée{result.total > 1 ? 's' : ''}
          {result.matched > 0 && ` — ${result.matched} associée${result.matched > 1 ? 's' : ''} à une séance prévue.`}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <p className="mt-4 text-xs text-ink-500">
        Permissions demandées : <code>read,activity:read</code> uniquement.
      </p>
    </div>
  );
}
