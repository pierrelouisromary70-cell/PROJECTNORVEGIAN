import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Activity, Compass, HeartPulse } from 'lucide-react';

export default function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations('landing');
  const c = useTranslations('common');
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link href={`/${locale}`} className="text-xl font-semibold text-fjord-900">
          Nordic Run
        </Link>
        <nav className="flex items-center gap-2">
          <Link className="btn-ghost" href={`/${locale}/login`}>{c('signIn')}</Link>
          <Link className="btn-primary" href={`/${locale}/signup`}>{c('signUp')}</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20">
        <h1 className="text-5xl md:text-6xl font-bold text-fjord-950 leading-tight max-w-3xl">
          {t('hero')}
        </h1>
        <p className="mt-6 text-lg text-fjord-700 max-w-2xl">{t('sub')}</p>
        <Link href={`/${locale}/signup`} className="btn-primary mt-8 text-lg px-6 py-3">
          {t('cta')}
        </Link>

        <div className="mt-20 grid md:grid-cols-3 gap-5">
          <Feature icon={<Activity className="h-6 w-6" />} title={t('feature1Title')} body={t('feature1Body')} />
          <Feature icon={<Compass className="h-6 w-6" />} title={t('feature2Title')} body={t('feature2Body')} />
          <Feature icon={<HeartPulse className="h-6 w-6" />} title={t('feature3Title')} body={t('feature3Body')} />
        </div>

        <div className="mt-20 card max-w-2xl">
          <h2 className="text-2xl font-bold text-fjord-900">{t('pricingTitle')}</h2>
          <p className="text-fjord-700 mt-2">{t('pricingBody')}</p>
          <Link href={`/${locale}/signup`} className="btn-primary mt-5">{t('cta')}</Link>
        </div>
      </section>

      <footer className="border-t border-fjord-100 py-6 text-center text-sm text-fjord-700">
        © Nordic Run · <Link href={`/${locale === 'fr' ? 'en' : 'fr'}`} className="underline">{locale === 'fr' ? 'English' : 'Français'}</Link>
      </footer>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card">
      <div className="h-10 w-10 rounded-xl bg-fjord-100 text-fjord-700 grid place-items-center">{icon}</div>
      <h3 className="mt-4 font-semibold text-fjord-900">{title}</h3>
      <p className="mt-2 text-fjord-700 text-sm">{body}</p>
    </div>
  );
}
