'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage({ params: { locale } }: { params: { locale: string } }) {
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
    <main className="min-h-screen grid place-items-center px-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-fjord-950">{c('signUp')}</h1>
        <p className="text-sm text-fjord-700">30 jours gratuits, sans carte requise.</p>
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
        <p className="text-sm text-fjord-700 text-center">
          <Link href={`/${locale}/login`} className="underline">{c('signIn')}</Link>
        </p>
      </form>
    </main>
  );
}
