import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center bg-white px-6 text-center">
      <div>
        <p className="font-display text-9xl font-bold text-ink-200">404</p>
        <h1 className="font-display text-3xl text-ink-950 mt-4">Page introuvable</h1>
        <p className="text-ink-700 mt-3 max-w-md mx-auto">
          La séance que vous cherchez n&apos;existe pas — ou plus. Vérifiez l&apos;URL,
          ou revenez à votre tableau de bord.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/fr" className="btn-primary">Retour à l&apos;accueil</Link>
          <Link href="/fr/dashboard" className="btn-secondary">Tableau de bord</Link>
        </div>
      </div>
    </main>
  );
}
