'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  currentPermission,
} from '@/lib/push/client';

type State = 'idle' | 'working' | 'subscribed' | 'denied' | 'unsupported';

export function NotificationOptIn({
  userId,
  vapidPublicKey,
  initialEnabled,
  initialHour,
}: {
  userId: string;
  vapidPublicKey: string;
  initialEnabled: boolean;
  initialHour: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [hour, setHour] = useState(initialHour);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (!pushSupported() || !vapidPublicKey) {
      setState('unsupported');
      return;
    }
    (async () => {
      const perm = await currentPermission();
      if (perm === 'denied') return setState('denied');
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub && perm === 'granted') setState('subscribed');
    })();
  }, [vapidPublicKey]);

  async function enable() {
    setError(null);
    setState('working');
    try {
      const sub = await subscribeToPush(vapidPublicKey);
      if (!sub) {
        setState('denied');
        return;
      }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error('save failed');
      await savePrefs(true, hour);
      setEnabled(true);
      setState('subscribed');
    } catch (e) {
      setError("Impossible d'activer les notifications. Réessayez.");
      setState('idle');
    }
  }

  async function disable() {
    setError(null);
    setState('working');
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      await savePrefs(false, hour);
      setEnabled(false);
      setState('idle');
    } catch (e) {
      setError('Impossible de désactiver. Réessayez.');
      setState('subscribed');
    }
  }

  async function savePrefs(notify: boolean, h: number) {
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ notify_evening_feedback: notify, notify_hour: h })
      .eq('id', userId);
    router.refresh();
  }

  async function onHourChange(h: number) {
    setHour(h);
    if (enabled) await savePrefs(true, h);
  }

  async function sendTest() {
    setTestSent(false);
    const res = await fetch('/api/push/test', { method: 'POST' });
    if (res.ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } else {
      setError("Le test n'a pas pu être envoyé.");
    }
  }

  if (state === 'unsupported') {
    return (
      <div className="card">
        <div className="flex items-start gap-3">
          <BellOff className="h-6 w-6 text-ink-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h2 className="font-semibold text-ink-900">Rappel du soir</h2>
            <p className="text-ink-600 mt-1">
              Votre navigateur ne supporte pas les notifications push. Sur iPhone, ajoutez d&apos;abord
              Nordic Run à l&apos;écran d&apos;accueil (Partager → Sur l&apos;écran d&apos;accueil), puis rouvrez cette page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Bell className="h-6 w-6 text-aurora-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-ink-900">Rappel du soir</h2>
            <p className="text-sm text-ink-600 mt-1 max-w-md">
              Un rappel quotidien pour valider votre séance et noter votre ressenti. C&apos;est ce qui
              permet au plan de s&apos;adapter et à vos allures de se calibrer.
            </p>
          </div>
        </div>
        {state === 'subscribed' && enabled && (
          <span className="chip-accent shrink-0"><Check className="h-3 w-3" /> Activé</span>
        )}
      </div>

      {state === 'denied' && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-4">
          Les notifications sont bloquées dans votre navigateur. Autorisez-les dans les réglages du site
          (icône cadenas dans la barre d&apos;adresse) puis réessayez.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {state === 'subscribed' && enabled ? (
          <>
            <button className="btn-secondary" onClick={disable} disabled={state !== 'subscribed'}>
              <BellOff className="h-4 w-4" /> Désactiver
            </button>
            <button className="btn-ghost text-sm" onClick={sendTest}>
              Envoyer un test
            </button>
            {testSent && <span className="text-sm text-glacier-700">Test envoyé ✅</span>}
          </>
        ) : (
          <button className="btn-primary" onClick={enable} disabled={state === 'working' || state === 'denied'}>
            {state === 'working' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Activer les notifications
          </button>
        )}

        <label className="flex items-center gap-2 text-sm text-ink-700">
          Heure du rappel
          <select
            className="input py-1.5 w-auto"
            value={hour}
            onChange={(e) => onHourChange(Number(e.target.value))}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
