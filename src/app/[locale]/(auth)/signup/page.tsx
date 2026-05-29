'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);

  const {
    locale
  } = params;

  const c = useTranslations('common');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/${locale}/onboarding` },
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(`/${locale}/onboarding`);
  };

  return (
    <main className="min-h-screen grid place-items-center px-6 py-10 bg-[radial-gradient(50%_50%_at_50%_0%,theme(colors.aurora.50)_0%,transparent_70%)]">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <Link href={`/${locale}`} className="flex items-center gap-2 font-display font-bold text-lg text-ink-950">
          <span className="h-2 w-2 rounded-full bg-aurora-500" />
          Nordic Run
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink-950">{c('signUp')}</h1>
          <p className="text-sm text-ink-700 mt-1">14 jours d&apos;essai gratuits — sans carte de crédit.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe (8+ caractères)</label>
          <input id="password" className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? c('loading') : c('signUp')}</button>
        <ul className="space-y-1.5 pt-2 text-xs text-ink-600">
          <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-aurora-600 shrink-0" /> Sans carte de crédit · annulation en 1 clic</li>
          <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-aurora-600 shrink-0" /> Vos données restent en UE (RGPD)</li>
          <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-aurora-600 shrink-0" /> Strava optionnel, lecture seule</li>
        </ul>
        <p className="text-sm text-ink-700 text-center pt-1">
          Déjà inscrit ? <Link href={`/${locale}/login`} className="underline">{c('signIn')}</Link>
        </p>
      </form>
    </main>
  );
}
