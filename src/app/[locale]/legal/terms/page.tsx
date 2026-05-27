import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export default async function TermsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  return (
    <main className="min-h-screen bg-white text-ink-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href={`/${locale}`} className="text-sm text-ink-600 hover:text-ink-900">← Nordic Run</Link>
        <h1 className="display text-4xl md:text-5xl mt-6">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-sm text-ink-500 mt-2">Dernière mise à jour : 20 mai 2026</p>

        <div className="prose prose-ink mt-10 space-y-6 text-ink-800">
          <Section title="1. Éditeur">
            <p>
              Nordic Run, [forme juridique], immatriculée au RCS de [ville] sous le numéro [SIREN],
              siège social : [adresse]. Directeur de la publication : [nom]. Contact :
              contact@nordicrun.app.
            </p>
          </Section>

          <Section title="2. Objet du service">
            <p>
              Nordic Run est un service de coaching sportif numérique qui génère et adapte des plans
              d&apos;entraînement à la course à pied inspirés de la méthode dite norvégienne. Le
              service ne constitue pas un avis médical, un diagnostic, ni un traitement.
            </p>
            <p className="rounded-xl bg-aurora-50 border border-aurora-200 p-4 text-sm">
              <strong>Important :</strong> Nordic Run n&apos;est pas un dispositif médical au sens
              du règlement (UE) 2017/745. Avant de commencer un programme d&apos;entraînement,
              demandez l&apos;avis de votre médecin, en particulier en cas d&apos;antécédent
              cardiovasculaire, de blessure, de grossesse ou de maladie chronique.
            </p>
          </Section>

          <Section title="3. Inscription et accès">
            <p>
              L&apos;inscription se fait par email + mot de passe. L&apos;utilisateur garantit que
              les informations fournies sont exactes. L&apos;accès au service est réservé aux
              personnes majeures (16 ans minimum, sous responsabilité parentale).
            </p>
          </Section>

          <Section title="4. Essai gratuit et abonnement">
            <p>
              Nordic Run propose un essai gratuit de 14 jours, sans collecte de carte bancaire.
              À l&apos;issue de l&apos;essai, l&apos;accès est suspendu jusqu&apos;à activation
              d&apos;un abonnement payant (mensuel 14,99 € ou annuel 119 €, prix TTC).
            </p>
            <p>
              L&apos;abonnement se renouvelle automatiquement. Il peut être résilié à tout moment
              depuis le portail Stripe accessible dans le profil. La résiliation prend effet à la
              fin de la période en cours, sans remboursement au prorata.
            </p>
          </Section>

          <Section title="5. Droit de rétractation">
            <p>
              L&apos;utilisateur reconnaît que le service constitue un contenu numérique fourni
              immédiatement après souscription et renonce expressément à son droit de rétractation
              prévu à l&apos;article L221-28 du Code de la consommation, conformément à l&apos;article
              L221-13.
            </p>
          </Section>

          <Section title="6. Propriété intellectuelle">
            <p>
              L&apos;ensemble des contenus, algorithmes, plans d&apos;entraînement générés,
              illustrations, code source et marques figurant sur Nordic Run sont protégés par le
              droit de la propriété intellectuelle et restent la propriété exclusive de Nordic Run.
              Toute reproduction, représentation, modification ou exploitation non autorisée est
              interdite.
            </p>
          </Section>

          <Section title="7. Responsabilité">
            <p>
              L&apos;utilisateur reste responsable de l&apos;exécution de son entraînement et de
              l&apos;écoute de son corps. Nordic Run ne saurait être tenu responsable d&apos;une
              blessure, d&apos;une pathologie ou d&apos;un préjudice résultant de la pratique
              sportive. En cas de douleur ou symptôme anormal, suspendre immédiatement
              l&apos;entraînement et consulter un professionnel de santé.
            </p>
          </Section>

          <Section title="8. Données personnelles">
            <p>
              Les modalités de traitement des données personnelles, y compris les données de santé
              optionnelles (cycle menstruel, fatigue, douleur), sont décrites dans la
              {' '}<Link href={`/${locale}/legal/privacy`} className="underline">Politique de
              Confidentialité</Link>.
            </p>
          </Section>

          <Section title="9. Modification des CGU">
            <p>
              Nordic Run se réserve le droit de modifier les présentes CGU à tout moment.
              L&apos;utilisateur sera informé par email au moins 15 jours avant l&apos;entrée en
              vigueur des modifications substantielles.
            </p>
          </Section>

          <Section title="10. Loi applicable">
            <p>
              Les présentes CGU sont régies par le droit français. Tout litige relatif à leur
              interprétation ou exécution relève de la compétence des tribunaux français. Avant
              tout recours contentieux, les parties s&apos;efforceront de trouver une solution
              amiable, le cas échéant via le médiateur de la consommation [à désigner].
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-ink-950 mb-3">{title}</h2>
      <div className="space-y-3 text-ink-800 leading-relaxed">{children}</div>
    </section>
  );
}
