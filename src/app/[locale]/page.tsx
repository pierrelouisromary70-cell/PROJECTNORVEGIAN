import { use } from "react";
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ArrowRight, Check, FlaskConical, HeartPulse, LineChart, Timer, X } from 'lucide-react';

export default function LandingPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = useTranslations('landing');
  const c = useTranslations('common');

  return (
    <main className="min-h-screen bg-white text-ink-950">
      <Nav locale={locale} c={c} />
      <Hero locale={locale} t={t} />
      <Stats t={t} />
      <Method t={t} />
      <Comparison t={t} />
      <Pricing locale={locale} t={t} />
      <Faq t={t} />
      <FinalCta locale={locale} t={t} />
      <Footer locale={locale} />
    </main>
  );
}

function Nav({ locale, c }: { locale: string; c: ReturnType<typeof useTranslations<'common'>> }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-ink-100">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href={`/${locale}`} className="flex items-center gap-2 font-display text-xl font-bold tracking-tightest">
          <span className="h-2.5 w-2.5 rounded-full bg-aurora-500" />
          Nordic Run
        </Link>
        <nav className="flex items-center gap-2">
          <Link className="btn-ghost text-sm" href="#method">La méthode</Link>
          <Link className="btn-ghost text-sm hidden md:inline-flex" href={`/${locale}/zones`}>Zones d&apos;allure</Link>
          <Link className="btn-ghost text-sm hidden md:inline-flex" href="#pricing">Tarifs</Link>
          <Link className="btn-ghost text-sm" href={`/${locale}/login`}>{c('signIn')}</Link>
          <Link className="btn-primary text-sm" href={`/${locale}/signup`}>{c('signUp')}</Link>
        </nav>
      </div>
    </header>
  );
}

function Hero({ locale, t }: { locale: string; t: ReturnType<typeof useTranslations<'landing'>> }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,theme(colors.aurora.100)_0%,transparent_70%),radial-gradient(40%_40%_at_10%_80%,theme(colors.aurora.50)_0%,transparent_70%)]"
      />
      <div className="relative max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-16 grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
        <div>
          <span className="chip-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-aurora-600" />
            {t('eyebrow')}
          </span>
          <h1 className="display text-5xl md:text-7xl mt-6 max-w-4xl">
            {t('heroL1')}
            <br />
            <span className="italic font-display text-aurora-700">{t('heroL2')}</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-ink-700 max-w-2xl leading-relaxed">{t('sub')}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={`/${locale}/signup`} className="btn-primary text-base px-7 py-3.5">
              {t('cta')} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#method" className="btn-secondary text-base px-7 py-3.5">
              {t('ctaSecondary')}
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-aurora-600" /> Sans carte de crédit</li>
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-aurora-600" /> Annulation en 1 clic</li>
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-aurora-600" /> Données RGPD (UE)</li>
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-aurora-600" /> Strava lecture seule</li>
          </ul>
          <p className="mt-4 text-sm text-ink-500">{t('ctaNote')}</p>
        </div>
        <SessionPreview />
      </div>
    </section>
  );
}

function SessionPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden className="absolute -inset-6 bg-gradient-to-br from-aurora-300/40 via-aurora-100/30 to-transparent rounded-3xl blur-2xl" />
      <div className="relative rounded-2xl bg-white ring-1 ring-ink-100 shadow-2xl shadow-aurora-900/10 overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-aurora-700 font-semibold">Aujourd&apos;hui · Mardi</p>
            <h3 className="font-display text-xl text-ink-950 mt-1">Seuil bas (LT1) — 5×1 000 m</h3>
          </div>
          <span className="chip bg-aurora-100 text-aurora-800 text-xs font-semibold shrink-0">RPE 6/10</span>
        </div>
        <div className="px-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-ink-50 py-2">
            <p className="text-[11px] text-ink-600">Distance</p>
            <p className="font-semibold text-ink-950 text-sm">10,2 km</p>
          </div>
          <div className="rounded-xl bg-ink-50 py-2">
            <p className="text-[11px] text-ink-600">Durée</p>
            <p className="font-semibold text-ink-950 text-sm">~60 min</p>
          </div>
          <div className="rounded-xl bg-ink-50 py-2">
            <p className="text-[11px] text-ink-600">Phase</p>
            <p className="font-semibold text-ink-950 text-sm">Base</p>
          </div>
        </div>
        <ol className="mt-4 px-5 pb-4 space-y-2 text-sm">
          <li className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-full bg-ink-100 text-ink-700 text-xs grid place-items-center font-semibold">1</span>
            <span className="flex-1"><span className="text-ink-900 font-medium">Échauffement</span> · 4 km easy</span>
            <span className="text-ink-500 text-xs tabular-nums">4&apos;40/km</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-full bg-aurora-100 text-aurora-800 text-xs grid place-items-center font-semibold">2</span>
            <span className="flex-1"><span className="text-ink-900 font-medium">5 × 1 000 m</span> · récup 60 s</span>
            <span className="text-aurora-700 text-xs font-semibold tabular-nums">3&apos;40/km</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-full bg-ink-100 text-ink-700 text-xs grid place-items-center font-semibold">3</span>
            <span className="flex-1"><span className="text-ink-900 font-medium">Retour au calme</span> · 2 km easy</span>
            <span className="text-ink-500 text-xs tabular-nums">4&apos;40/km</span>
          </li>
        </ol>
        <div className="px-5 py-3 bg-ink-50/70 border-t border-ink-100 text-xs text-ink-700">
          <span className="font-semibold text-ink-900">Pourquoi : </span>accumuler du temps sous le seuil sans creuser de fatigue (sous-seuil norvégien).
        </div>
      </div>
    </div>
  );
}

function Stats({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const items = [
    { k: t('stat1k'), v: t('stat1v') },
    { k: t('stat2k'), v: t('stat2v') },
    { k: t('stat3k'), v: t('stat3v') },
  ];
  return (
    <section className="border-y border-aurora-100 bg-gradient-to-br from-aurora-50 via-white to-aurora-50">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
        {items.map((it, i) => (
          <div key={it.k} className="relative">
            {i > 0 && <span aria-hidden className="hidden md:block absolute -left-5 top-2 bottom-2 w-px bg-aurora-200" />}
            <div className="font-display text-4xl md:text-5xl font-bold text-aurora-800 tracking-tightest">{it.k}</div>
            <div className="text-sm text-ink-700 mt-3 leading-relaxed max-w-xs">{it.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Method({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  return (
    <section id="method" className="max-w-6xl mx-auto px-6 py-24">
      <span className="eyebrow">{t('methodEyebrow')}</span>
      <h2 className="display text-4xl md:text-5xl mt-3 max-w-3xl">{t('methodTitle')}</h2>
      <p className="mt-6 text-lg text-ink-700 max-w-2xl">{t('methodIntro')}</p>

      <div className="mt-14 grid md:grid-cols-3 gap-5">
        <MethodCard icon={<FlaskConical className="h-5 w-5" />} eyebrow="01" title={t('m1Title')} body={t('m1Body')} />
        <MethodCard icon={<LineChart className="h-5 w-5" />} eyebrow="02" title={t('m2Title')} body={t('m2Body')} />
        <MethodCard icon={<HeartPulse className="h-5 w-5" />} eyebrow="03" title={t('m3Title')} body={t('m3Body')} />
      </div>
    </section>
  );
}

function MethodCard({ icon, eyebrow, title, body }: { icon: React.ReactNode; eyebrow: string; title: string; body: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-aurora-100 text-aurora-700 grid place-items-center">{icon}</div>
        <span className="font-display text-2xl text-ink-300">{eyebrow}</span>
      </div>
      <h3 className="font-display text-2xl mt-6 leading-tight">{title}</h3>
      <p className="mt-3 text-ink-700 leading-relaxed">{body}</p>
    </div>
  );
}

function Comparison({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const rows = [t('cmpRow1'), t('cmpRow2'), t('cmpRow3'), t('cmpRow4'), t('cmpRow5')];
  return (
    <section className="bg-ink-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <span className="eyebrow text-aurora-400">{t('cmpEyebrow')}</span>
        <h2 className="display text-4xl md:text-5xl mt-3 max-w-3xl">{t('cmpTitle')}</h2>

        <div className="mt-12 grid md:grid-cols-2 gap-px bg-ink-800 rounded-3xl overflow-hidden ring-1 ring-ink-800">
          <div className="bg-ink-900 p-8">
            <h3 className="font-display text-2xl text-ink-300">{t('cmpA')}</h3>
            <ul className="mt-6 space-y-3">
              {rows.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-ink-400">
                  <X className="h-5 w-5 mt-0.5 text-ink-500 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-aurora-900 to-ink-900 p-8 ring-1 ring-aurora-700/30">
            <h3 className="font-display text-2xl text-white">{t('cmpB')}</h3>
            <ul className="mt-6 space-y-3">
              {rows.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-white">
                  <Check className="h-5 w-5 mt-0.5 text-aurora-400 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ locale, t }: { locale: string; t: ReturnType<typeof useTranslations<'landing'>> }) {
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto">
        <span className="eyebrow">{t('pricingEyebrow')}</span>
        <h2 className="display text-4xl md:text-5xl mt-3">{t('pricingTitle')}</h2>
        <p className="mt-6 text-lg text-ink-700">{t('pricingSub')}</p>
      </div>

      <div className="mt-14 grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        <div className="card">
          <div className="text-sm font-semibold text-ink-600 uppercase tracking-wider">{t('priceMonthly')}</div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-display text-5xl font-bold">15 €</span>
            <span className="text-ink-600">/ {t('month')}</span>
          </div>
          <p className="mt-3 text-ink-600 text-sm">{t('priceMonthlyNote')}</p>
          <ul className="mt-6 space-y-2">
            {[t('feat1'), t('feat2'), t('feat3'), t('feat4'), t('feat5')].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ink-800">
                <Check className="h-4 w-4 mt-0.5 text-aurora-600 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <Link href={`/${locale}/signup`} className="btn-secondary w-full mt-8 justify-center">
            {t('cta')}
          </Link>
        </div>

        <div className="card-dark relative overflow-hidden ring-2 ring-aurora-500/40 shadow-[0_0_60px_-12px_rgba(16,185,129,0.4)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-block rounded-full bg-aurora-500 text-ink-950 text-[11px] font-bold uppercase tracking-wider px-3 py-1 shadow-md">
              Le plus choisi
            </span>
          </div>
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-aurora-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-aurora-700/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-aurora-400 uppercase tracking-wider">{t('priceAnnual')}</div>
              <span className="chip bg-aurora-500 text-ink-950 text-xs font-bold">{t('save')} 60 € / an</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold">10 €</span>
              <span className="text-ink-300">/ {t('month')}</span>
            </div>
            <p className="mt-2 text-ink-300 text-sm">120 € {t('billedYearly')}</p>
            <p className="mt-3 text-ink-400 text-sm">{t('priceAnnualNote')}</p>
            <ul className="mt-6 space-y-2">
              {[t('feat1'), t('feat2'), t('feat3'), t('feat4'), t('feat5'), t('featAnnualBonus')].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-100">
                  <Check className="h-4 w-4 mt-0.5 text-aurora-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/signup?plan=annual`} className="btn-accent w-full mt-8 justify-center">
              {t('cta')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-ink-500 mt-6">{t('pricingFootnote')}</p>
    </section>
  );
}

function Faq({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const items = [
    { q: t('faq1q'), a: t('faq1a') },
    { q: t('faq2q'), a: t('faq2a') },
    { q: t('faq3q'), a: t('faq3a') },
    { q: t('faq4q'), a: t('faq4a') },
    { q: t('faq5q'), a: t('faq5a') },
  ];
  return (
    <section className="bg-ink-50 border-y border-ink-100">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <span className="eyebrow">{t('faqEyebrow')}</span>
        <h2 className="display text-4xl md:text-5xl mt-3">{t('faqTitle')}</h2>
        <div className="mt-10 space-y-3">
          {items.map((it, i) => (
            <details key={i} className="group rounded-2xl bg-white ring-1 ring-ink-100 px-5 py-4">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-ink-950">{it.q}</span>
                <span className="text-ink-400 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-3 text-ink-700 leading-relaxed">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ locale, t }: { locale: string; t: ReturnType<typeof useTranslations<'landing'>> }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 text-center">
      <Timer className="h-10 w-10 mx-auto text-aurora-600" />
      <h2 className="display text-4xl md:text-5xl mt-6 max-w-2xl mx-auto">{t('finalTitle')}</h2>
      <p className="mt-6 text-lg text-ink-700 max-w-xl mx-auto">{t('finalSub')}</p>
      <Link href={`/${locale}/signup`} className="btn-primary mt-10 text-base px-7 py-3.5">
        {t('cta')} <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function Footer({ locale }: { locale: string }) {
  return (
    <footer className="border-t border-ink-100">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm text-ink-600">
        <div className="flex items-center gap-2 font-display font-bold tracking-tightest">
          <span className="h-2 w-2 rounded-full bg-aurora-500" />
          Nordic Run
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href={`/${locale === 'fr' ? 'en' : 'fr'}`} className="hover:text-ink-900">
            {locale === 'fr' ? 'English' : 'Français'}
          </Link>
          <Link href={`/${locale}/zones`} className="hover:text-ink-900">Zones d&apos;allure</Link>
          <Link href={`/${locale}/legal/terms`} className="hover:text-ink-900">CGU</Link>
          <Link href={`/${locale}/legal/privacy`} className="hover:text-ink-900">Confidentialité</Link>
          <a href="mailto:contact@nordicrun.app" className="hover:text-ink-900">Contact</a>
        </div>
        <div>© {new Date().getFullYear()} Nordic Run</div>
      </div>
    </footer>
  );
}
