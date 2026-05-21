'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage({ params: { locale } }: { params: { locale: string } }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/${locale}/reset-password`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-ink-950">Mot de passe oublié</h1>
        {sent ? (
          <>
            <p className="text-sm text-ink-700">
              Si un compte existe avec cette adresse, un email vient de partir avec un lien pour
              redéfinir votre mot de passe.
            </p>
            <Link href={`/${locale}/login`} className="btn-secondary w-full justify-center">
              Retour à la connexion
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-ink-700">
              Entrez l&apos;adresse email associée à votre compte. Nous vous enverrons un lien pour
              en définir un nouveau.
            </p>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <p className="text-sm text-ink-700 text-center">
              <Link href={`/${locale}/login`} className="underline">Retour</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
