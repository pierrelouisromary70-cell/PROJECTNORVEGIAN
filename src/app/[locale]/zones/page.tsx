import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Activity, AlertCircle, CheckCircle2, Flame, HeartPulse, MessageCircle, Wind, Zap } from 'lucide-react';

export const metadata = {
  title: 'Comprendre les zones d\'allure',
  description: 'LT1, LT2, VO2max, allure facile — comment reconnaître chaque zone à la sensation, sans cardio ni lactate.',
};

export default async function ZonesPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  return (
    <main className="min-h-screen bg-white text-ink-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href={`/${locale}`} className="text-sm text-ink-600 hover:text-ink-900">← Nordic Run</Link>
        <h1 className="display text-4xl md:text-5xl mt-6">Comprendre les zones d&apos;allure</h1>
        <p className="text-lg text-ink-700 mt-4">
          Vous n&apos;avez ni cardio, ni lactate-mètre ? Pas grave. La méthode norvégienne se pilote
          d&apos;abord à la sensation. Voici comment reconnaître chaque zone <strong>par ressenti</strong>.
        </p>

        <ZoneCard
          icon={<Wind className="h-6 w-6" />}
          color="green"
          name="Easy / Facile"
          lactateRange="< 1.5 mmol/L"
          rpe="3 / 10"
          feel="Vous pouvez tenir une conversation complète."
          tells={[
            'Respiration nasale possible la plupart du temps',
            'Si quelqu\'un vous parle, vous répondez par phrases entières sans interruption',
            'Vous pourriez courir 1 h supplémentaire',
            'Vous n\'avez aucune envie d\'accélérer',
          ]}
          purpose="C'est le pilier de votre kilométrage. ~70-80 % de vos km doivent être à cette allure."
          common_mistake="L'erreur la plus fréquente du coureur amateur : aller trop vite en footing. Si vous doutez, c'est trop rapide."
        />

        <ZoneCard
          icon={<Activity className="h-6 w-6" />}
          color="emerald"
          name="LT1 — Sous-seuil (SV1)"
          lactateRange="2.0 – 2.5 mmol/L"
          rpe="6 / 10"
          feel="Vous parlez par phrases courtes. Vous respirez fort mais c'est contrôlé."
          tells={[
            'Une phrase courte de 5-6 mots, puis pause respiration, puis une autre',
            'Vous transpirez franchement mais pas en cascade',
            'Vous devez finir la séance en pensant que vous pourriez en faire une autre dans 6 h',
            'Pas de fatigue résiduelle le lendemain',
          ]}
          purpose="LE pilier de la méthode norvégienne. C'est ici que vous progressez le plus, semaine après semaine, sans creuser de fatigue."
          common_mistake="Tout le monde court trop vite en LT1. L'allure cible est 10-15 sec/km plus lente que votre allure semi-marathon."
        />

        <ZoneCard
          icon={<Zap className="h-6 w-6" />}
          color="amber"
          name="LT2 — Seuil (SV2)"
          lactateRange="3.5 – 4.0 mmol/L"
          rpe="7-8 / 10"
          feel="Vous parlez par mots isolés. Inconfortable mais soutenable."
          tells={[
            'Si quelqu\'un vous parle, vous répondez par 2-3 mots maximum',
            'Vous respirez par la bouche, presque haletant',
            'Vous ressentez les jambes',
            'Vous savez précisément combien il vous reste à faire',
            'L\'allure que vous tiendriez sur un semi-marathon (1 h pour les élites, plus pour les amateurs)',
          ]}
          purpose="L'allure de course du semi-marathon. Améliore l'élimination du lactate à intensité haute."
          common_mistake="Souvent confondu avec l'allure 10K (trop rapide). Si vous craquez à mi-séance, vous étiez trop rapide depuis le début."
        />

        <ZoneCard
          icon={<Flame className="h-6 w-6" />}
          color="red"
          name="VO2max (I)"
          lactateRange="> 4.5 mmol/L"
          rpe="8.5-9 / 10"
          feel="Vous ne pouvez plus parler. La respiration est intense, presque haletante."
          tells={[
            'Vous tenez seulement 3-5 min à cette allure en continu',
            'Allure proche de votre 3 km ou 5 km de compétition',
            'Vos jambes brûlent',
            'Vous comptez les répétitions pour ne pas craquer',
          ]}
          purpose="Améliore la consommation maximale d'oxygène. Apparaît en phase Build pour développer la puissance aérobie."
          common_mistake="Ne pas placer une séance VO2max le lendemain d'un seuil — trop de stress métabolique cumulé."
        />

        <ZoneCard
          icon={<Zap className="h-6 w-6" />}
          color="purple"
          name="R — Repetition (Vitesse)"
          lactateRange="N/A (court, anaérobie alactique)"
          rpe="9 / 10 sur 20-30s"
          feel="Très rapide mais court. Vous récupérez complètement entre chaque rep."
          tells={[
            'Reps de 100-400 m, durée 20-90 s',
            'Récupération complète (vous marchez/trottinez 2-3 min entre)',
            'Pas de fatigue lactique cumulée',
            'Travail neuromusculaire et de cadence',
          ]}
          purpose="Maintien de la vitesse pure, technique de foulée, économie de course. À placer 1 fois par semaine."
          common_mistake="Trop court = trop intense. Si vous êtes essoufflé entre 2 reps, c'est que vous récupérez mal."
        />

        <div className="mt-12 card-dark">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-aurora-400" />
            Le test parole — votre meilleur outil
          </h2>
          <p className="text-ink-300 mt-4 leading-relaxed">
            Pas de montre cardio ? Pas de lactate-mètre ? Pas grave.
            Le <strong className="text-aurora-300">test parole</strong> est l&apos;outil le plus
            fiable pour calibrer votre allure :
          </p>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-aurora-400 mt-0.5 shrink-0" /> <span><strong>Phrases entières</strong> = Easy / facile (zone 1-2)</span></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-aurora-400 mt-0.5 shrink-0" /> <span><strong>Phrases courtes (5-6 mots)</strong> = LT1 / sous-seuil (zone 3)</span></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-aurora-400 mt-0.5 shrink-0" /> <span><strong>Mots isolés (2-3 mots)</strong> = LT2 / seuil (zone 4)</span></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-aurora-400 mt-0.5 shrink-0" /> <span><strong>Plus rien</strong> = VO2max / interval (zone 5)</span></div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-aurora-50 border border-aurora-200 p-6">
          <h2 className="font-semibold text-aurora-900 flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            Et avec un cardiofréquencemètre ?
          </h2>
          <p className="text-sm text-aurora-900 mt-2">
            Si vous avez une montre cardio, voici les correspondances approximatives (basées sur la FC max,
            attention : la précision varie d&apos;une personne à l&apos;autre, le test parole reste plus
            fiable) :
          </p>
          <ul className="text-sm text-aurora-900 mt-3 space-y-1 list-disc pl-5">
            <li>Easy : <strong>65-75 % FCmax</strong></li>
            <li>LT1 (sous-seuil) : <strong>78-85 % FCmax</strong></li>
            <li>LT2 (seuil) : <strong>85-91 % FCmax</strong></li>
            <li>VO2max : <strong>92-97 % FCmax</strong></li>
          </ul>
        </div>

        <div className="mt-10 text-center">
          <Link href={`/${locale}/signup`} className="btn-primary">Commencer mon plan norvégien</Link>
        </div>
      </div>
    </main>
  );
}

function ZoneCard({
  icon, color, name, lactateRange, rpe, feel, tells, purpose, common_mistake,
}: {
  icon: React.ReactNode; color: string; name: string; lactateRange: string;
  rpe: string; feel: string; tells: string[]; purpose: string; common_mistake: string;
}) {
  return (
    <section className="card mt-10">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-10 w-10 rounded-xl bg-${color}-100 text-${color}-700 grid place-items-center`}>{icon}</div>
        <h2 className="font-display text-2xl">{name}</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm text-ink-700 mb-3">
        <div><span className="text-ink-500">Lactate :</span> <strong>{lactateRange}</strong></div>
        <div><span className="text-ink-500">RPE :</span> <strong>{rpe}</strong></div>
      </div>
      <p className="text-ink-900 font-medium">{feel}</p>
      <div className="mt-4">
        <h3 className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">Comment le reconnaître</h3>
        <ul className="space-y-1.5 text-ink-800">
          {tells.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-aurora-600 shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 text-sm text-ink-700"><strong className="text-ink-950">Pourquoi : </strong>{purpose}</div>
      <div className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span><strong>Erreur fréquente : </strong>{common_mistake}</span>
      </div>
    </section>
  );
}
